import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RiskBadge }      from '../shared/AlertBadge';
import { RISK_COLORS, cn } from '../../lib/utils';
import type { GridRegion } from '../../types';

interface Props {
  regions:        GridRegion[];
  selectedRegion: string | null;
  onSelect:       (id: string) => void;
}

function Delta({ v }: { v: number }) {
  if (v > 5)  return <TrendingUp  size={12} className="text-red-400" />;
  if (v < -5) return <TrendingDown size={12} className="text-emerald-400" />;
  return <Minus size={12} className="text-slate-500" />;
}

function scoreToLevel(score: number): GridRegion['riskLevel'] {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export function RegionScorecard({ regions, selectedRegion, onSelect }: Props) {
  // Normalize regions so riskLevel is always derived from riskScore
  const sorted = [...regions]
    .map(r => ({ ...r, riskLevel: r.riskLevel ?? scoreToLevel(r.riskScore) }))
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <p className="panel-header shrink-0">Regional Risk Scorecard</p>
      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {sorted.map((r, idx) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              'w-full text-left p-3 rounded-xl border transition-all duration-200',
              selectedRegion === r.id
                ? 'border-cyan/60 bg-space-700 glow-cyan'
                : 'border-space-600 bg-space-800/60 hover:border-space-500 hover:bg-space-700/60',
            )}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-600 font-mono w-4 shrink-0">{idx + 1}</span>
                <span className="text-sm font-semibold text-slate-200 truncate">{r.name}</span>
                <span className="text-xs text-slate-500 shrink-0">{r.country}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Delta v={r.deltaFromBaseline} />
                <RiskBadge level={r.riskLevel} riskScore={r.riskScore} size="xs" />
              </div>
            </div>

            {/* Score bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-space-600 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${r.riskScore}%`, background: RISK_COLORS[r.riskLevel] ?? (r.riskScore >= 75 ? "#ef4444" : r.riskScore >= 50 ? "#f97316" : r.riskScore >= 25 ? "#f59e0b" : "#10b981") }} />
              </div>
              <span className="text-xs font-bold font-mono w-7 text-right shrink-0"
                    style={{ color: RISK_COLORS[r.riskLevel] ?? (r.riskScore >= 75 ? "#ef4444" : r.riskScore >= 50 ? "#f97316" : r.riskScore >= 25 ? "#f59e0b" : "#10b981") }}>
                {r.riskScore}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] text-slate-500">
                📍 {Math.abs(r.lat).toFixed(1)}°{r.lat > 0 ? 'N' : 'S'}
              </span>
              <span className="text-[10px] text-slate-500">
                ⚡ {r.transmissionLineKm.toLocaleString()} km
              </span>
              <span className={cn(
                'text-[10px]',
                r.transformerAgeCategory === 'CRITICAL' ? 'text-red-400' :
                r.transformerAgeCategory === 'AGING'    ? 'text-amber-400' : 'text-slate-500',
              )}>
                🏭 {r.transformerAgeCategory}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
