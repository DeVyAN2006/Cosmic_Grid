import { useRef, useEffect, useMemo } from 'react';
import type { MutableRefObject }      from 'react';
import Globe                                     from 'react-globe.gl';
import type { GlobeMethods }                     from 'react-globe.gl';
import type { GridRegion }                       from '../../types';

// ─── Risk helpers ─────────────────────────────────────────────────────────────
// Color by riskScore directly — works regardless of whether riskLevel is populated
const getRiskColor = (region: GridRegion): string => {
  const s = region.riskScore ?? 0;
  if (s >= 75) return '#ef4444';   // red    — High
  if (s >= 50) return '#f97316';   // orange — Moderate
  if (s >= 30) return '#facc15';   // yellow — Low-Mod
  return '#10b981';                // green  — Safe
};

const getRiskLabel = (region: GridRegion): string => {
  const s = region.riskScore ?? 0;
  if (s >= 75) return 'HIGH RISK';
  if (s >= 50) return 'MODERATE';
  if (s >= 30) return 'LOW-MOD';
  return 'SAFE';
};

// ─── Props (wired to Dashboard) ───────────────────────────────────────────────
interface GlobeViewProps {
  regions:        GridRegion[];
  selectedRegion: string | null;
  onRegionSelect: (id: string) => void;
}

export function GlobeView({ regions, selectedRegion, onRegionSelect }: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods>(null) as MutableRefObject<GlobeMethods>;
  

  // Auto-rotate
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate      = true;
      globeRef.current.controls().autoRotateSpeed = 0.4;
    }                                              // ✅ closing brace fixed
  }, []);

  // Sync selected with parent
  // ✅ Derive directly — no setState in useEffect
const selected = useMemo(
  () => regions.find(r => r.id === selectedRegion) ?? null,
  [regions, selectedRegion]
);

  // Points data
  const points = useMemo(() =>
    regions.map(r => ({
      ...r,
      size:  Math.max(0.3, r.riskScore / 35),
      color: r.id === selectedRegion ? '#ffffff' : getRiskColor(r),
    })),
  [regions, selectedRegion]);

  // Rings — only HIGH/CRITICAL
  const rings = useMemo(() =>
    regions
      .filter(r => r.riskScore >= 60)
      .map(r => ({
        lat:              r.lat,
        lng:              r.lon,
        maxR:             4,
        propagationSpeed: 2,
        repeatPeriod:     1200,
      })),
  [regions]);

  // Hex heatmap data
  const heatmapData = useMemo(() =>
    regions.map(r => ({
      lat:    r.lat,
      lng:    r.lon,
      weight: r.riskScore / 100,
    })),
  [regions]);

  const handlePointClick = (d: object) => {
  const region = d as GridRegion;
  onRegionSelect(region.id);  // parent updates selectedRegion → selected auto-updates
};

  return (
    <div className="panel overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
      <p className="panel-header shrink-0">Global Risk Heatmap — Live</p>

      <div className="-mx-5 -mb-5 flex-1 relative">
        <Globe
          ref={globeRef}
          width={600}
          height={400}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          atmosphereColor="#1a4a8a"
          atmosphereAltitude={0.18}

          // ── Hex heatmap ────────────────────────────────────────────────────
          hexBinPointsData={heatmapData}
          hexBinPointLat="lat"
          hexBinPointLng="lng"
          hexBinPointWeight="weight"
          hexBinResolution={3}
          hexTopColor={(d: object) => {
            const w = (d as { sumWeight: number }).sumWeight;
            if (w > 0.7) return '#ff3333';
            if (w > 0.4) return '#ff9900';
            if (w > 0.2) return '#ffff00';
            return '#00ff88';
          }}
          hexSideColor={(d: object) => {
            const w = (d as { sumWeight: number }).sumWeight;
            if (w > 0.7) return '#ff333366';
            if (w > 0.4) return '#ff990066';
            if (w > 0.2) return '#ffff0066';
            return '#00ff8866';
          }}
          hexAltitude={(d: object) => {
            const w = (d as { sumWeight: number }).sumWeight;
            return w * 0.06;
          }}

          // ── Points ─────────────────────────────────────────────────────────
          pointsData={points}
          pointLat="lat"
          pointLng="lon"
          pointColor="color"
          pointRadius="size"
          pointAltitude={0.02}
          pointLabel={(d: object) => {
            const r = d as GridRegion;
            return `<div style="background:#0d1524;border:1px solid #243d5e;
                    padding:8px 12px;border-radius:8px;font-size:12px">
              <b style="color:#00d4ff">${r.name}</b><br/>
              <span style="color:${getRiskColor(r)}">
                ${getRiskLabel(r)} — ${r.riskScore}/100
              </span>
            </div>`;
          }}
          onPointClick={handlePointClick}

          // ── Rings ──────────────────────────────────────────────────────────
          ringsData={rings}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringColor={() => (t: number) => `rgba(255,60,60,${1 - t})`}
        />

        {/* ── Legend ── */}
        <div className="absolute bottom-4 left-4 bg-space-900/90 border border-space-600
                        rounded-xl p-3 text-xs space-y-1.5 backdrop-blur-sm">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
            Risk Level
          </p>
          {[
            
            { color: '#ff9900', label: 'High (50–100)' },
            { color: '#ffff00', label: 'Medium (30–49)' },
            { color: '#00ff88', label: 'Low (0–29)' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: item.color }} />
              <span className="text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Selected region card ── */}
      {selected && (
        <div className="shrink-0 border-t border-space-600 p-4 flex items-start
                        justify-between gap-4 bg-space-800">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-200 text-sm">{selected.name}</p>
            <p style={{ color: getRiskColor(selected) }}
               className="text-xs font-bold mt-0.5">
              {getRiskLabel(selected)} — {selected.riskScore}/100
            </p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span>⚡ {(selected.transmissionLineKm ?? 0).toLocaleString()} km</span>
              <span>🏭 {selected.transformerAgeCategory ?? '—'}</span>
              {selected.populationMillions != null && (
                <span>👥 {selected.populationMillions.toFixed(1)}M people</span>
              )}
            </div>
          </div>
          <button
            onClick={() => onRegionSelect('')}
            className="text-slate-500 hover:text-slate-200 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}