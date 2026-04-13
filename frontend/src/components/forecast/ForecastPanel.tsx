import { Clock, TrendingUp, Activity } from 'lucide-react';
import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { StormBadge } from '../shared/AlertBadge';
import { Skeleton }   from '../shared/LoadingSkeleton';
import { STORM_COLORS } from '../../lib/utils';
import type { StormForecast } from '../../types';

// ─── Custom tooltip types ─────────────────────────────────────────────────────
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

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const TooltipContent = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-space-800 border border-space-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1 font-mono">{String(label ?? '')}</p>
      <p className="text-cyan font-mono font-bold">Kp {payload[0]?.value?.toString()}</p>
    </div>
  );
};

export function ForecastPanel({ forecast, loading }: { forecast: StormForecast | null; loading: boolean }) {
  // Hooks must come before any early returns
  const chartData = useMemo(() =>
    (forecast?.forecastSeries ?? []).map((p, i) => ({
      t:  i === 0 ? 'Now' : `+${i * 2}h`,
      Kp: +p.predictedKp.toFixed(2),
    })),
  [forecast?.forecastSeries]);

  if (loading || !forecast) {
    return (
      <div className="panel h-full space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const color = STORM_COLORS[forecast.stormCategory] ?? '#10b981';

  return (
    <div className="panel flex flex-col gap-5 h-full">
      <p className="panel-header">48-Hour Storm Forecast</p>

      {/* Hero metric */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">Predicted Peak Kp</p>
          <div className="flex items-end gap-2">
            <span className="text-6xl font-bold font-mono leading-none tabular-nums"
                  style={{ color }}>
              {forecast.predictedKp.toFixed(1)}
            </span>
            <span className="text-xl text-slate-500 mb-1 font-mono">/9</span>
          </div>
        </div>
        <div className="text-right space-y-2.5">
          <StormBadge category={forecast.stormCategory} size="lg" />
          <p className="text-xs text-slate-500">
            {(forecast.probability * 100).toFixed(0)}% confidence
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { icon: <Clock size={13} />,      label: 'Arrival ETA',  value: `${forecast.arrivalHours}h` },
          { icon: <TrendingUp size={13} />, label: 'Kp Range',
            value: `${forecast.confidenceInterval[0].toFixed(1)}–${forecast.confidenceInterval[1].toFixed(1)}` },
          { icon: <Activity size={13} />,   label: 'Confidence',   value: `${(forecast.probability * 100).toFixed(0)}%` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-space-700 rounded-xl p-3 text-center border border-space-600">
            <span className="text-slate-400 mx-auto flex justify-center mb-1.5">{icon}</span>
            <p className="text-base font-bold font-mono text-slate-100 tabular-nums">{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Model confidence</span>
          <span className="font-mono">{(forecast.probability * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-space-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
               style={{ width: `${forecast.probability * 100}%`, background: color }} />
        </div>
      </div>

      {/* Forecast chart */}
      <div className="flex-1 min-h-0">
        <p className="text-xs text-slate-500 mb-2">Kp Forecast Curve</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#1a2d4a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} interval={4} />
            <YAxis domain={[0, 9]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} width={22} />
            <Tooltip content={<TooltipContent />} />
            <ReferenceArea y1={5} y2={6} fill="#84cc16" fillOpacity={0.04} />
            <ReferenceArea y1={6} y2={7} fill="#f59e0b" fillOpacity={0.04} />
            <ReferenceArea y1={7} y2={9} fill="#ef4444" fillOpacity={0.06} />
            <ReferenceLine y={5} stroke="#84cc16" strokeDasharray="2 2" strokeOpacity={0.35} />
            <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.35} />
            <Line type="monotone" dataKey="Kp" stroke={color}
              strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-slate-600 font-mono">
        LSTM v{forecast.modelVersion} + XGBoost ensemble
      </p>
    </div>
  );
}
