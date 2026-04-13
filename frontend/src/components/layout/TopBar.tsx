import { RefreshCw, Bell, Wifi, WifiOff, AlertTriangle, Satellite } from 'lucide-react';
import { cn, formatTime } from '../../lib/utils';
import type { SystemStatus } from '../../types';

interface TopBarProps {
  status:    SystemStatus | null;
  connected: boolean;
  error:     string | null;
  alerts:    number;
  onRefresh: () => void;
}

export function TopBar({ status, connected, error, alerts, onRefresh }: TopBarProps) {
  return (
    <header className="h-14 border-b border-space-600 bg-space-900/90 backdrop-blur-md
                       flex items-center justify-between px-6 sticky top-0 z-50 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan to-blue-500
                        flex items-center justify-center shadow-lg shadow-cyan/30">
          <Satellite size={15} className="text-space-950" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-bold text-slate-100 text-sm tracking-tight">CosmicGrid</span>
          <span className="text-[10px] text-slate-500 tracking-wider">SPACE WEATHER INTELLIGENCE</span>
        </div>
      </div>

      {/* Center — status banners */}
      <div className="flex items-center gap-3">
        {error && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
                          bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <AlertTriangle size={11} />
            {error}
          </div>
        )}
        {status?.replayMode && !error && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
                          bg-blue-500/10 text-blue-400 border border-blue-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Replay Mode
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Live/offline pill */}
        <div className={cn(
          'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
          connected
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
            : 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
        )}>
          {connected
            ? <><Wifi size={11} /> Live</>
            : <><WifiOff size={11} /> Offline</>}
        </div>

        {status && (
          <span className="text-xs text-slate-600 font-mono hidden md:block">
            {formatTime(status.lastUpdated)}
          </span>
        )}

        <button
          onClick={onRefresh}
          title="Refresh"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200
                     hover:bg-space-700 transition-colors"
        >
          <RefreshCw size={15} />
        </button>

        <button className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-200
                           hover:bg-space-700 transition-colors">
          <Bell size={15} />
          {alerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500
                             text-white text-[9px] font-bold flex items-center justify-center">
              {alerts}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
