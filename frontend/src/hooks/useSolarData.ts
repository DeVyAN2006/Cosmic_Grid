import { useState, useEffect, useCallback, useRef } from 'react';
import { api }          from '../api/cosmicgrid';
import { useWebSocket } from './useWebSocket';
import {
  MOCK_SOLAR, MOCK_FORECAST, MOCK_REGIONS, MOCK_STATUS,
} from '../data/mockFallback';
import type { SolarWindData, StormForecast, GridRegion, SystemStatus } from '../types';

const WS_URL = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000') + '/ws/live';

// ── Field normalizers (WS payload → typed objects) ────────────────────────────
function normalizeSolar(s: Record<string, unknown>): SolarWindData {
  return {
    timestamp:   String(s.timestamp ?? ''),
    bz:          Number(s.bz_nT         ?? s.bz       ?? 0),
    speed:       Number(s.sw_speed      ?? s.speed    ?? 0),
    density:     Number(s.proton_density ?? s.density  ?? 0),
    temperature: Number(s.proton_temp   ?? s.temperature ?? 0),
    xrayFlux:    Number(s.xray_flux     ?? s.xrayFlux ?? 1e-8),
    kpIndex:     Number(s.kp_index      ?? s.kpIndex  ?? 0),
  };
}

const STORM_CAT_MAP: Record<number, StormForecast['stormCategory']> = {
  0: 'None', 1: 'G1', 2: 'G2', 3: 'G3', 4: 'G4', 5: 'G5',
};

function normalizeForecast(f: Record<string, unknown>): Partial<StormForecast> {
  const rawCat = f.storm_category ?? f.stormCategory;
  const stormCategory: StormForecast['stormCategory'] =
    typeof rawCat === 'number' ? (STORM_CAT_MAP[rawCat] ?? 'None') :
    typeof rawCat === 'string' && rawCat in STORM_CAT_MAP ? rawCat as StormForecast['stormCategory'] :
    'None';
  return {
    stormCategory,
    predictedKp:   Math.abs(Number(f.symh_predicted ?? f.predicted_kp ?? f.predictedKp ?? 0) / 10),
    arrivalHours:  Number(f.arrival_hours ?? f.arrivalHours ?? 18),
    probability:   Number(f.confidence ?? f.probability ?? 0.75),
  };
}

function normalizeRegion(r: Record<string, unknown>) {
  const score = Number(r.risk_score ?? r.riskScore ?? 0);
  return {
    id:                    String(r.region_id    ?? r.id   ?? ''),
    name:                  String(r.region_name  ?? r.name ?? ''),
    country:               String(r.country      ?? ''),
    lat:                   Number(r.lat          ?? 0),
    lon:                   Number(r.lon          ?? r.lng  ?? 0),
    riskScore:             score,
    riskLevel:             scoreToRiskLevel(score),
    deltaFromBaseline:     Number(r.delta_from_baseline ?? 0),
    transmissionLineKm:    Number(r.line_km ?? r.transmissionLineKm ?? 0),
    transformerAgeCategory: ageFactor(Number(r.age_factor ?? 0)),
    populationMillions:    Number(r.population_millions ?? 0),
  };
}

function scoreToRiskLevel(s: number): GridRegion['riskLevel'] {
  if (s >= 75) return 'CRITICAL';
  if (s >= 50) return 'HIGH';
  if (s >= 30) return 'MEDIUM';
  return 'LOW';
}

function ageFactor(f: number): GridRegion['transformerAgeCategory'] {
  if (f >= 1.4) return 'CRITICAL';
  if (f >= 1.0) return 'AGING';
  return 'NEW';
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSolarData() {
  const [solarWind, setSolarWind] = useState<SolarWindData[]>([]);
  const [forecast,  setForecast]  = useState<StormForecast | null>(null);
  const [regions,   setRegions]   = useState<GridRegion[]>([]);
  const [status,    setStatus]    = useState<SystemStatus | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const { lastMessage, connected } = useWebSocket(WS_URL);
  const pollTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchAll = useCallback(async () => {
    try {
      const [sw, fc, reg, st] = await Promise.all([
        api.getSolarWind(24),
        api.getForecast(),
        api.getRegions(),
        api.getStatus(),
      ]);
      setSolarWind(sw);
      setForecast(fc);
      setRegions(reg);
      setStatus(st);
      setError(null);
    } catch {
      setSolarWind(MOCK_SOLAR);
      setForecast(MOCK_FORECAST);
      setRegions(MOCK_REGIONS);
      setStatus(MOCK_STATUS);
      setError('Backend offline — displaying cached demo data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 5-min REST poll as safety net
  useEffect(() => {
    fetchAll();
    pollTimer.current = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(pollTimer.current);
  }, [fetchAll]);

  // Apply WebSocket updates
  useEffect(() => {
    if (!lastMessage) return;
    const { type, payload } = lastMessage as {
      type: string;
      payload: Record<string, unknown>;
    };

    // Both 'init' and 'solar_update' carry {solar, forecast, regions}
    if (type === 'init' || type === 'solar_update') {
      // ── Solar reading ──
      if (payload?.solar && typeof payload.solar === 'object') {
        const s = normalizeSolar(payload.solar as Record<string, unknown>);
        // Guard: skip if key fields are NaN/zero (bad reading)
        if (!isNaN(s.speed) && s.speed > 0) {
          setSolarWind(prev => [...prev.slice(-287), s]);
        }
      }

      // ── Forecast ──
      if (payload?.forecast && typeof payload.forecast === 'object') {
        const f = payload.forecast as Record<string, unknown>;
        setForecast(prev => prev
          ? { ...prev, ...normalizeForecast(f) }
          : null
        );
      }

      // ── Regions ──
      if (Array.isArray(payload?.regions) && payload.regions.length > 0) {
        const normalized = (payload.regions as Record<string, unknown>[])
          .map(normalizeRegion)
          .filter(r => r.id);          // drop any malformed rows
        if (normalized.length > 0) {
          setRegions(normalized as GridRegion[]);
        }
      }
    }

    // Status updates
    if (type === 'status_update' && payload) {
      setStatus(prev => prev ? { ...prev, ...(payload as Partial<SystemStatus>) } : null);
    }

  }, [lastMessage]);

  return {
    solarWind, forecast, regions, status,
    loading, error, connected,
    refresh: fetchAll,
  };
}