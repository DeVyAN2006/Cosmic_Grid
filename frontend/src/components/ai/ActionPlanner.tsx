import { useState }    from 'react';
import { Sparkles, RefreshCw, ChevronDown } from 'lucide-react';
import { api }         from '../../api/cosmicgrid';
import { StormBadge }  from '../shared/AlertBadge';
import { STEP_ICONS, cn } from '../../lib/utils';
import type { GridRegion, ActionPlan, ActionStep, Urgency, StepCategory, StormCategory } from '../../types';

const URGENCY_STYLES: Record<Urgency, string> = {
  ROUTINE:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  ELEVATED:  'bg-amber-500/10 text-amber-400 border-amber-500/25',
  IMMEDIATE: 'bg-red-500/10 text-red-400 border-red-500/25',
};

// ─── Parse raw Groq text into structured ActionPlan ───────────────────────────
function parsePlanText(
  raw: string,
  regionId: string,
  region: GridRegion | undefined,
): ActionPlan {
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // Each bullet/numbered line becomes a step
  const stepLines = lines.filter(l =>
    /^[-•*]/.test(l) || /^\d+[.)]\s/.test(l)
  );

  const steps: ActionStep[] = (stepLines.length ? stepLines : lines).map((l, i) => {
    const text = l.replace(/^[-•*\d.)]+\s*/, '').trim();
    const isImmediate = /immediate|now|right away|urgent/i.test(text);
    const isShortTerm = /2.{0,4}24|hour|short.term/i.test(text);
    return {
      order:       i + 1,
      title:       text.length > 60 ? text.slice(0, 57) + '…' : text,
      description: text,
      timeframe:   isImmediate ? '0–2 hours' : isShortTerm ? '2–24 hours' : 'Ongoing',
      category:    (isImmediate ? 'ALERT' : isShortTerm ? 'PROTECTION' : 'MONITORING') as StepCategory,
    };
  });

  const riskScore  = region?.riskScore ?? 0;
  const urgency: Urgency =
    riskScore >= 75 ? 'IMMEDIATE' : riskScore >= 50 ? 'ELEVATED' : 'ROUTINE';

  return {
    regionId,
    regionName:    region?.name ?? regionId,
    stormCategory: (region?.riskLevel === 'CRITICAL' ? 'G5' : region?.riskLevel === 'HIGH' ? 'G3' : 'None') as StormCategory,
    urgency,
    generatedAt:   new Date().toISOString(),
    steps,
    alertDraft:    raw,   // show full raw text as the alert draft
  };
}

function StepCard({ step }: { step: ActionStep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-space-600 rounded-xl overflow-hidden transition-colors
                    hover:border-space-500">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-space-700/50 transition-colors"
      >
        <span className="text-base shrink-0">{STEP_ICONS[step.category] ?? '⚡'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{step.title}</p>
          <p className="text-xs text-slate-500 font-mono">{step.timeframe}</p>
        </div>
        <span className="text-[10px] text-slate-600 font-mono shrink-0 mr-1">#{step.order}</span>
        <ChevronDown
          size={14}
          className={cn('text-slate-500 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-space-700 text-sm text-slate-400 leading-relaxed">
          {step.description}
        </div>
      )}
    </div>
  );
}

interface ActionPlannerProps {
  regions:          GridRegion[];
  selectedRegionId: string | null;
  onRegionChange:   (id: string) => void;
}

export function ActionPlanner({ regions, selectedRegionId, onRegionChange }: ActionPlannerProps) {
  const [plan,    setPlan]    = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const generate = async () => {
    if (!selectedRegionId) return;
    setLoading(true);
    setError(null);
    try {
      const region = regions.find(r => r.id === selectedRegionId);
      const raw = await api.getActionPlan(selectedRegionId);

      // Cast through unknown to safely inspect the actual runtime shape
      const rawUnknown = raw as unknown;
      const planText: string =
        typeof rawUnknown === 'string' ? rawUnknown :
        typeof (rawUnknown as Record<string, unknown>).plan === 'string'
          ? (rawUnknown as Record<string, string>).plan
          : JSON.stringify(rawUnknown);

      setPlan(parsePlanText(planText, selectedRegionId, region));
    } catch {
      setError('Failed to generate plan. Verify Groq API key and backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel flex flex-col gap-4 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <p className="panel-header flex items-center gap-2 mb-0">
          <Sparkles size={13} className="text-cyan" />
          AI Action Planner
        </p>
        {plan && !loading && (
          <button onClick={generate} className="btn-ghost text-xs py-1.5 px-3">
            <RefreshCw size={12} /> Regenerate
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 shrink-0">
        <select
          value={selectedRegionId ?? ''}
          onChange={e => onRegionChange(e.target.value)}
          className="input-field flex-1"
        >
          <option value="" disabled>Select a grid region…</option>
          {[...regions]
            .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
            .map(r => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.country}) — Risk {r.riskScore ?? '—'}
              </option>
            ))}
        </select>

        <button
          onClick={generate}
          disabled={!selectedRegionId || loading}
          className="btn-primary shrink-0"
        >
          {loading
            ? <RefreshCw size={14} className="animate-spin" />
            : <Sparkles size={14} />}
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-cyan/15 animate-ping" />
            <div className="absolute inset-1 rounded-full border-2 border-t-cyan border-space-600 animate-spin" />
            <Sparkles size={16} className="absolute inset-0 m-auto text-cyan" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-300 font-medium">Generating plan…</p>
            <p className="text-xs text-slate-500 mt-1">Groq is analyzing the grid region</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/25 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Plan output */}
      {plan && !loading && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Plan meta */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-space-700 border border-space-600">
            <div>
              <p className="font-semibold text-slate-200 text-sm">{plan.regionName}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {new Date(plan.generatedAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StormBadge category={plan.stormCategory} size="sm" />
              <span className={cn(
                'text-xs font-semibold px-2.5 py-0.5 rounded-full border',
                URGENCY_STYLES[plan.urgency] ?? URGENCY_STYLES.ROUTINE,
              )}>
                {plan.urgency}
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {(plan.steps ?? []).map(step => <StepCard key={step.order} step={step} />)}
          </div>

          {/* Alert draft */}
          <div className="p-4 rounded-xl bg-space-700 border border-space-600">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
              📢 Full Plan
            </p>
            <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
              {plan.alertDraft}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && !error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-space-700 border border-space-600
                          flex items-center justify-center text-2xl">
            ⚡
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">No plan generated</p>
            <p className="text-xs text-slate-500 mt-1">
              Select a region above and click Generate<br />to get a Groq-powered action playbook
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
