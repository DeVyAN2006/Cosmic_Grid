import { useState } from 'react';
import { NavLink }  from 'react-router-dom';
import {
  LayoutDashboard, Globe, MapPin, Zap, Archive,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn, STORM_COLORS } from '../../lib/utils';
import type { StormForecast } from '../../types';

const NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/globe',   icon: Globe,           label: 'Globe View' },
  { to: '/regions', icon: MapPin,          label: 'Regions'    },
  { to: '/planner', icon: Zap,             label: 'AI Planner' },
  { to: '/archive', icon: Archive,         label: 'Archive'    },
];

export function Sidebar({ forecast }: { forecast: StormForecast | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const catColor = forecast ? STORM_COLORS[forecast.stormCategory] : '#10b981';

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-space-900 border-r border-space-600 shrink-0 transition-all duration-300',
      collapsed ? 'w-[60px]' : 'w-[200px]',
    )}>
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-hidden">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-space-700 text-cyan border border-space-500/80 glow-cyan'
                : 'text-slate-400 hover:text-slate-200 hover:bg-space-800',
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Mini forecast widget */}
      {!collapsed && forecast && (
        <div className="mx-2 mb-3 p-3 rounded-xl bg-space-800 border border-space-600">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Next Event</p>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse_slow"
              style={{ background: catColor }}
            />
            <span className="text-sm font-bold" style={{ color: catColor }}>
              {forecast.stormCategory === 'None' ? 'Quiet Sun' : `${forecast.stormCategory} Storm`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-mono">
            Kp {forecast.predictedKp?.toFixed(1) ?? '—'}
            {forecast.arrivalHours != null ? ` · in ${forecast.arrivalHours}h` : ''}
          </p>
          <div className="mt-2 h-1 bg-space-600 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((forecast.predictedKp ?? 0) / 9) * 100}%`, background: catColor }}
            />
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="h-10 border-t border-space-600 flex items-center justify-center
                   text-slate-600 hover:text-slate-300 transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
