import { useState, useMemo }  from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { StormBadge }          from '../shared/AlertBadge';
import { Skeleton }            from '../shared/LoadingSkeleton';
import { STORM_COLORS, cn } from '../../lib/utils';
import type { HistoricalStorm, StormForecast } from '../../types';

interface Props {
  storms:          HistoricalStorm[];
  currentForecast: StormForecast | null;
  loading:         boolean;
}

export function StormArchive({ storms, currentForecast, loading }: Props) {
  const [query,    setQuery]    = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy,   setSortBy]   = useState<'date' | 'kp'>('date');

  const analogue = useMemo(() => {
    if (!currentForecast || !storms.length) return null;
    return storms.reduce((best, s) =>
      Math.abs(s.peakKp - currentForecast.predictedKp) <
      Math.abs(best.peakKp - currentForecast.predictedKp) ? s : best,
    );
  }, [storms, currentForecast]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return storms
      .filter(s =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.affectedRegions.some(r => r.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sortBy === 'date'
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : b.peakKp - a.peakKp,
      );
  }, [storms, query, sortBy]);

  return (
    <div className="panel space-y-5">
      <p className="panel-header">Historical Storm Archive & Comparator</p>

      {/* Analogue comparator */}
      {analogue && currentForecast && (
        <div className="flex items-start gap-4 p-4 rounded-xl
                        bg-space-700 border border-cyan/25">
          <span className="text-2xl shrink-0">🔍</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-cyan mb-1">
              Closest Analogue: {analogue.name} ({analogue.date.substring(0, 7)})
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Historical peak Kp {analogue.peakKp.toFixed(1)} ({analogue.category}) vs current
              forecast Kp {currentForecast.predictedKp.toFixed(1)} ({currentForecast.stormCategory}).
              That event lasted {analogue.durationHours}h with economic impact: {analogue.economicImpact}.
            </p>
          </div>
          <StormBadge category={analogue.category} size="sm" />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search events, categories, regions…"
            className="input-field pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'date' | 'kp')}
          className="input-field w-auto"
        >
          <option value="date">Sort: Date</option>
          <option value="kp">Sort: Intensity</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-space-600">
                {['Date', 'Event', 'Category', 'Peak Kp', 'Duration', 'Affected Regions', 'Impact', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] text-slate-500
                                         uppercase tracking-widest font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(storm => (
                <>
                  <tr
                    key={storm.id}
                    className="border-b border-space-700/50 hover:bg-space-700/30
                               cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === storm.id ? null : storm.id)}
                  >
                    <td className="py-3 px-3 font-mono text-slate-400 text-xs whitespace-nowrap">
                      {storm.date}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                      {storm.name}
                    </td>
                    <td className="py-3 px-3">
                      <StormBadge category={storm.category} size="xs" />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold tabular-nums"
                        style={{ color: STORM_COLORS[storm.category] }}>
                      {storm.peakKp.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{storm.durationHours}h</td>
                    <td className="py-3 px-3 text-slate-400 text-xs">
                      {storm.affectedRegions.slice(0, 2).join(', ')}
                      {storm.affectedRegions.length > 2 &&
                        <span className="text-slate-500"> +{storm.affectedRegions.length - 2}</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-xs whitespace-nowrap">
                      {storm.economicImpact}
                    </td>
                    <td className="py-3 px-3">
                      <ChevronDown
                        size={13}
                        className={cn(
                          'text-slate-500 transition-transform',
                          expanded === storm.id && 'rotate-180',
                        )}
                      />
                    </td>
                  </tr>
                  {expanded === storm.id && (
                    <tr key={`${storm.id}-exp`} className="bg-space-700/30">
                      <td colSpan={8} className="px-6 py-4 text-sm text-slate-400 leading-relaxed
                                                  border-b border-space-600">
                        {storm.description}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-10">
              No storms match your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
