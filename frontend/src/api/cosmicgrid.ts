import axios from 'axios';
import type {
  SolarWindData, StormForecast, GridRegion,
  ActionPlan, HistoricalStorm, SystemStatus,
  RiskLevel, TransformerAge, StormCategory,
} from '../types';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  timeout: 12_000,
});

function mapAlertToRisk(level: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    // Backend alert_level → frontend RiskLevel
    // Legend: High(75-100)=CRITICAL, Moderate(50-74)=HIGH, Low-Mod(30-49)=MEDIUM, Safe(0-29)=LOW
    CALM:     'LOW',       // Safe
    MODERATE: 'HIGH',      // Moderate (50-74) → orange
    ELEVATED: 'CRITICAL',  // High (75-100) → red
    SEVERE:   'CRITICAL',  // High (75-100) → red
    // Backend risk_level values (pass through)
    LOW:      'LOW',
    MEDIUM:   'MEDIUM',
    HIGH:     'HIGH',
    CRITICAL: 'CRITICAL',
    // Legacy
    Low:      'LOW',
    Moderate: 'HIGH',
    High:     'CRITICAL',
    Extreme:  'CRITICAL',
  };
  return map[level] ?? 'LOW';
}

function mapAgeFactor(factor: number): TransformerAge {
  if (factor >= 0.8) return 'CRITICAL';
  if (factor >= 0.5) return 'AGING';
  return 'NEW';
}

function mapStormCategory(cat: string | number): StormCategory {
  if (typeof cat === 'number') {
    if (cat === 0) return 'None';
    if (cat === 1) return 'G1';
    if (cat === 2) return 'G2';
    if (cat === 3) return 'G3';
    if (cat === 4) return 'G4';
    return 'G5';
  }
  const map: Record<string, StormCategory> = {
    None: 'None', G1: 'G1', G2: 'G2', G3: 'G3', G4: 'G4', G5: 'G5',
  };
  return map[cat] ?? 'None';
}

export const api = {
  getStatus: (): Promise<SystemStatus> =>
    http.get('/status').then(r => r.data),

  getSolarWind: (hours = 24): Promise<SolarWindData[]> =>
    http.get('/solar-wind', { params: { hours } }).then(r =>
      r.data.map((d: Record<string, unknown>) => ({
        timestamp:   String(d.timestamp ?? ''),
        bz:          Number(d.bz_nT ?? 0),
        speed:       Number(d.sw_speed ?? 400),
        density:     Number(d.proton_density ?? 5),
        temperature: Number(d.proton_temp ?? 100000),
        xrayFlux:    Number(d.xray_flux ?? 2.3e-6),
        kpIndex:     Number(d.kp_index ?? (Math.abs(Number(d.bz_nT ?? 0)) / 3)),
      }))
    ),

  getForecast: (): Promise<StormForecast> =>
    http.get('/forecast').then(r => {
      const d = r.data;
      const f = d.forecast ?? d;
      return {
        predictedKp:        Math.abs(Number(f.symh_predicted ?? 0) / 10),
        stormCategory:      mapStormCategory(
          (f.storm_category as string | number | undefined) ??
          (f.storm_label as string | undefined) ?? 'None'
        ),
        arrivalHours:       Number(f.arrival_hours ?? 18),
        probability:        Number(f.confidence ?? 0.75),
        confidenceInterval: [0, 9] as [number, number],
        modelVersion:       String(f.model_version ?? '2.1.0'),
        forecastSeries:     Array.isArray(f.forecast_series)
          ? f.forecast_series.map((p: Record<string, unknown>) => ({
              timestamp:   String(p.timestamp ?? ''),
              predictedKp: Number(p.predicted_kp ?? p.predictedKp ?? 0),
              upperBound:  Number(p.upper_bound ?? p.upperBound ?? 0),
              lowerBound:  Number(p.lower_bound ?? p.lowerBound ?? 0),
            }))
          : [],
      };
    }),

  getRegions: (): Promise<GridRegion[]> =>
    http.get('/regions').then(r =>
      r.data.map((d: Record<string, unknown>) => ({
        id:                    String(d.region_id ?? d.id ?? ''),
        name:                  String(d.region_name ?? d.name ?? 'Unknown Region'),
        country:               String(d.country ?? 'Unknown'),
        lat:                   Number(d.lat ?? 0),
        lon:                   Number(d.lon ?? d.lng ?? 0),
        riskScore:             Number(d.risk_score ?? d.riskScore ?? 0),
        // Prefer risk_level (already correct), fall back to mapping alert_level
        riskLevel:             mapAlertToRisk(
          String(d.risk_level ?? d.riskLevel ?? d.alert_level ?? 'LOW')
        ),
        deltaFromBaseline:     Number(d.delta_from_baseline ?? 0),
        transmissionLineKm:    Number(d.line_km ?? d.transmissionLineKm ?? 0),
        transformerAgeCategory: mapAgeFactor(Number(d.age_factor ?? 0)),
        populationMillions:    Number(d.population_millions ?? 0),
      }))
    ),

  getActionPlan: (regionId: string): Promise<ActionPlan> =>
    http.post('/action-plan', { region_id: regionId }).then(r => r.data),

  getHistoricalStorms: (limit = 30): Promise<HistoricalStorm[]> =>
    http.get('/storms/historical', { params: { limit } }).then(r =>
      r.data.map((d: Record<string, unknown>) => ({
        id:              String(d.id ?? ''),
        date:            String(d.date ?? ''),
        name:            String(d.name ?? ''),
        peakKp:          Number(d.peakKp ?? d.peak_kp ?? 0),
        category:        mapStormCategory(String(d.category ?? 'None')),
        affectedRegions: Array.isArray(d.affectedRegions) ? d.affectedRegions as string[]
                         : Array.isArray(d.affected_regions) ? d.affected_regions as string[] : [],
        economicImpact:  String(d.economicImpact ?? d.economic_impact ?? 'Unknown'),
        durationHours:   Number(d.durationHours ?? d.duration_hours ?? 0),
        description:     String(d.description ?? ''),
      }))
    ),
};