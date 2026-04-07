import { useRef, useEffect } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const AGENT_LABELS = {
  address_normalizer: 'Address Normalizer',
  geocoder:          'Geocoder',
  cat_code_mapper:   'Code Mapper',
  cat_normalizer:    'Normalizer',
  upload:            'Upload',
  preview:           'Preview',
  cope_triage:       'COPE',
  hazard_data:       'Hazards',
  geospatial_data:   'Geospatial',
  object_detection:  'Object Detection',
  risk_model:        'Risk Model',
  quote_propensity:  'Quote Propensity',
};

export default function LiveProgressView({ agentStates = {}, agents = [] }) {
  const logRef = useRef(null);

  // Collect all logs across watched agents
  const logs = [];
  let activeAgent = null;
  let completedCount = 0;

  agents.forEach(id => {
    const state = agentStates[id] || {};
    if (state.status === 'completed' || state.status === 'done') completedCount++;
    if (state.status === 'running') activeAgent = id;
    (state.thinkingLog || []).forEach(t => {
      logs.push({
        agent: id,
        message: typeof t === 'string' ? t : (t.message || ''),
        ts: t.timestamp || 0,
      });
    });
  });

  const latest = logs[logs.length - 1]?.message || 'Initialising pipeline…';

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs.length]);

  const pct = agents.length ? (completedCount / agents.length) * 100 : 0;

  return (
    <div className="space-y-4 w-full">
      {/* ── Progress header ─────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-1.5">
          <span className="font-semibold text-foreground">
            {completedCount} of {agents.length} agents completed
          </span>
          <span className="font-mono">
            {activeAgent ? (AGENT_LABELS[activeAgent] || activeAgent) : 'Starting…'}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Agent pills ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {agents.map(id => {
          const st = agentStates[id]?.status || 'pending';
          const label = AGENT_LABELS[id] || id;
          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-300',
                st === 'completed' || st === 'done' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' :
                st === 'running'                    ? 'bg-primary/10 border-primary/40 text-primary animate-pulse-glow' :
                st === 'error'                      ? 'bg-destructive/10 border-destructive/40 text-destructive' :
                                                     'bg-muted/50 border-border/40 text-muted-foreground'
              )}
            >
              {(st === 'running') && <Loader2 size={11} className="animate-spin" />}
              {(st === 'completed' || st === 'done') && <Check size={11} />}
              {(st === 'error') && <AlertCircle size={11} />}
              {label}
            </div>
          );
        })}
      </div>

      {/* ── Current operation pill ─────────────────────────── */}
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
        <Loader2 size={14} className="text-primary animate-spin flex-shrink-0" />
        <span className="text-sm text-foreground/80 truncate font-mono">{latest}</span>
      </div>

      {/* ── Log feed ────────────────────────────────────────── */}
      <div
        ref={logRef}
        className="bg-muted/30 border border-border/30 rounded-xl max-h-52 overflow-y-auto scrollbar-thin"
      >
        <div className="p-3 space-y-0.5">
          {logs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground font-mono py-2 text-center">
              Waiting for agent output…
            </p>
          ) : (
            logs.slice(-30).map((l, i) => {
              const isDone = /completed|complete|geocoded|valid coord|cache hit|success/i.test(l.message);
              const isSub  = /\[sub\d+\]|\[row/i.test(l.message);
              return (
                <div
                  key={i}
                  className={cn(
                    'text-[11px] font-mono py-0.5 flex items-start gap-2',
                    isDone ? 'text-emerald-400' :
                    isSub  ? 'text-primary/80' :
                             'text-muted-foreground'
                  )}
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {isDone
                      ? <Check size={10} className="text-emerald-400" />
                      : <span className="w-1.5 h-1.5 rounded-full bg-primary/50 inline-block mt-1" />}
                  </span>
                  <span className="leading-relaxed break-all">{l.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
