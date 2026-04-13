import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label:   string;
  value:   string | number;
  unit?:   string;
  sub?:    string;
  color?:  string;
  alert?:  boolean;
  icon?:   ReactNode;
  className?: string;
}

export function MetricCard({
  label, value, unit, sub, color, alert, icon, className,
}: MetricCardProps) {
  return (
    <div className={cn(
      'panel transition-all duration-300',
      alert && 'border-red-500/40 glow-red',
      className,
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </span>
        {icon && <span className="text-slate-500 mt-0.5">{icon}</span>}
      </div>

      <div className="flex items-end gap-1.5 mb-1">
        <span
          className="text-3xl font-bold font-mono leading-none tabular-nums"
          style={{ color: color ?? '#e2e8f0' }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm text-slate-500 mb-0.5 font-mono">{unit}</span>
        )}
      </div>

      {sub && <p className="text-xs text-slate-500 leading-relaxed">{sub}</p>}

      {alert && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs text-red-400 font-medium">Elevated Activity</span>
        </div>
      )}
    </div>
  );
}
