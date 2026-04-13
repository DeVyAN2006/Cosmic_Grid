import { cn, STORM_BADGE_STYLES, RISK_BADGE_STYLES } from '../../lib/utils';
import type { StormCategory, RiskLevel } from '../../types';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2.5 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5 font-bold',
};

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}


export function StormBadge({
  category, size = 'sm',
}: { category: StormCategory; size?: Size }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full border',
      STORM_BADGE_STYLES[category],
      SIZE_CLASSES[size],
    )}>
      {category !== 'None' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {category === 'None' ? 'Quiet' : `${category} Storm`}
    </span>
  );
}

export function RiskBadge({
  level, riskScore, size = 'xs',
}: { level?: RiskLevel | null; riskScore?: number; size?: Size }) {
  // Derive level from score if level is missing or invalid
  const resolved: RiskLevel = (level && RISK_BADGE_STYLES[level])
    ? level
    : riskScore != null ? scoreToRiskLevel(riskScore) : 'LOW';

  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-full border tracking-wide',
      RISK_BADGE_STYLES[resolved],
      SIZE_CLASSES[size],
    )}>
      {resolved}
    </span>
  );
}
