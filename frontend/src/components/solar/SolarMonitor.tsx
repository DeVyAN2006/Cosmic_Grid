import { Wind, Compass, Droplets, Sun } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import { MetricCard }     from '../shared/MetricCard';
import { MetricSkeleton } from '../shared/LoadingSkeleton';
import { formatTime, bzSeverity } from '../../lib/utils';
import type { SolarWindData } from '../../types';

// ─── Color helpers ────────────────────────────────────────────────────────────
const bzColor = (bz: number): string =>
  bz > 0 ? '#10b981' : bz > -10 ? '#f59e0b' : bz > -20 ? '#f97316' : '#ef4444';

const speedColor = (v: number): string =>
  v < 400 ? '#10b981' : v < 600 ? '#f59e0b' : v < 800 ? '#f97316' : '#ef4444';

// ─── Custom tooltip ───────────────────────────────────────────────────────────
interface PayloadEntry {
  dataKey: string;
  name:    string;
  value:   number | string;
  color:   string;
}

interface CustomTooltipProps {
  active?:  boolean;
  payload?: PayloadEntry[];
  label?:   string | number;
}

const TooltipContent = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-space-800 border border-space-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1.5 font-mono">{String(label ?? '')}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface SolarMonitorProps {
  data:    SolarWindData[];
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SolarMonitor({ data, loading }: SolarMonitorProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  if (!latest) return null;

  const chartData = data.slice(-48).map(d => ({
    t:     formatTime(d.timestamp),
    Bz:    +(d.bz ?? 0).toFixed(2),
    Speed: +(d.speed ?? 0).toFixed(0),
    Kp:    +(d.kpIndex ?? 0).toFixed(2),
  }));

  return (
    <section className="space-y-4">
      {/* Metric cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Solar Wind Speed"
          value={Math.round(latest.speed)}
          unit="km/s"
          sub={(latest.speed ?? 0) > 600 ? '⚠ Fast stream — elevated risk' : 'Normal solar wind'}
          color={speedColor(latest.speed)}
          alert={latest.speed > 700}
          icon={<Wind size={14} />}
        />
        <MetricCard
          label="Bz Component"
          value={(latest.bz ?? 0).toFixed(1)}
          unit="nT"
          sub={bzSeverity(latest.bz)}
          color={bzColor(latest.bz)}
          alert={latest.bz < -15}
          icon={<Compass size={14} />}
        />
        <MetricCard
          label="Proton Density"
          value={(latest.density ?? 0).toFixed(1)}
          unit="p/cm³"
          sub={(latest.density ?? 0) > 15 ? '⚠ Dense plasma ahead' : 'Background density'}
          color={latest.density > 15 ? '#f97316' : '#00d4ff'}
          icon={<Droplets size={14} />}
        />
        <MetricCard
          label="X-Ray Flux"
          value={(latest.xrayFlux ?? 1e-8).toExponential(1)}
          unit="W/m²"
          sub={latest.xrayFlux > 1e-5 ? '⚠ Elevated flare activity' : 'Background X-ray level'}
          color={latest.xrayFlux > 1e-5 ? '#f59e0b' : '#10b981'}
          alert={latest.xrayFlux > 1e-4}
          icon={<Sun size={14} />}
        />
      </div>

      {/* Charts */}
      <div className="panel">
        <p className="panel-header">Solar Wind — Last 4 Hours</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Bz */}
          <div>
            <p className="text-xs text-slate-500 mb-3">Bz Component (nT)</p>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="bzFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1a2d4a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} interval={11} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} width={28} />
                <Tooltip content={<TooltipContent />} />
                <ReferenceLine y={0}   stroke="#334155" strokeDasharray="3 3" />
                <ReferenceLine y={-10} stroke="#f97316" strokeDasharray="2 2" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="Bz" name="Bz" stroke="#ef4444"
                  fill="url(#bzFill)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Speed */}
          <div>
            <p className="text-xs text-slate-500 mb-3">Solar Wind Speed (km/s)</p>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1a2d4a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} interval={11} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} width={36} />
                <Tooltip content={<TooltipContent />} />
                <ReferenceLine y={600} stroke="#f59e0b" strokeDasharray="2 2" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="Speed" name="Speed" stroke="#00d4ff"
                  fill="url(#speedFill)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Kp */}
          <div>
            <p className="text-xs text-slate-500 mb-3">Kp Index (0–9)</p>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="kpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1a2d4a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} interval={11} />
                <YAxis domain={[0, 9]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} width={20} />
                <Tooltip content={<TooltipContent />} />
                <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="Kp" name="Kp" stroke="#a855f7"
                  fill="url(#kpFill)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </section>
  );
}