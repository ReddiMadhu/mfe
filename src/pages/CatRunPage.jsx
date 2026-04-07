import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tag, BarChart3, CheckCircle2, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { runMapCodes, runNormalizeValues } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { Button } from '@/components/ui/button';
import LiveProgressView from '@/components/LiveProgressView';
import DataPreview from '@/components/DataPreview';
import AgentGraph from '@/components/AgentGraph';
import { cn } from '@/lib/utils';

const CAT_STEPS = [
  { key: 'mapCodes',        label: 'Map Occupancy & Const', runningLabel: 'Mapping codesâ€¦',      desc: '4-stage: exact â†’ LLM â†’ fuzzy â†’ default', icon: Tag,      color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30' },
  { key: 'normalizeValues', label: 'Normalize Values',      runningLabel: 'Normalizing valuesâ€¦', desc: 'Standardize year, area, value, currency',  icon: BarChart3, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
];

function MetricBadge({ label, value, color }) {
  return (
    <div className={cn('flex flex-col items-center px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 shadow-sm', color)}>
      <span className="text-[11px] font-bold tabular-nums">{value ?? 'â€”'}</span>
      <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[60px] truncate text-center">{label}</span>
    </div>
  );
}

export default function CatRunPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { stepStatus, setStepStatus, setCatResult, agentStates, rawPreview, uploadMeta } = usePipelineStore();

  useAgentStream(uploadId);

  const mapCodesMutation = useMutation({
    mutationFn: () => runMapCodes(uploadId),
    onMutate:  () => setStepStatus('mapCodes', 'running'),
    onSuccess: (data) => {
      setStepStatus('mapCodes', 'done');
      toast.success(`Code mapping complete â€” ${data.unique_occ_pairs} occ, ${data.unique_const_pairs} const pairs`);
      normalizeMutation.mutate();
    },
    onError: (err) => { setStepStatus('mapCodes', 'error'); toast.error(`Code mapping failed: ${err.message}`); },
  });

  const normalizeMutation = useMutation({
    mutationFn: () => runNormalizeValues(uploadId),
    onMutate:  () => setStepStatus('normalizeValues', 'running'),
    onSuccess: (data) => {
      setStepStatus('normalizeValues', 'done');
      setCatResult(data);
      toast.success(`Normalization complete â€” ${data.flags_added ?? 0} flags`);
    },
    onError: (err) => { setStepStatus('normalizeValues', 'error'); toast.error(`Normalization failed: ${err.message}`); },
  });

  useEffect(() => {
    if (stepStatus.mapCodes === 'idle') mapCodesMutation.mutate();
  }, []);

  const allDone  = stepStatus.mapCodes === 'done' && stepStatus.normalizeValues === 'done';
  const isRunning = stepStatus.mapCodes === 'running' || stepStatus.normalizeValues === 'running';

  return (
    <div className="min-h-[calc(100vh-6rem)] p-6 w-full max-w-6xl mx-auto flex flex-col gap-6">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-2xl font-bold"><span className="gradient-text">CAT Agent Processing</span></h1>
      </div>

      {/* â”€â”€ Agent Network Diagram â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="glass rounded-2xl border border-border/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Agent Network</span>
          <span className="ml-auto text-[10px] text-muted-foreground">CAT Processing Active</span>
        </div>
        <AgentGraph agentStates={agentStates} stepStatus={stepStatus} />
      </div>

      {/* â”€â”€ Step cards + live view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-6">

        {/* Left: step cards */}
        <div className="space-y-4">
          {CAT_STEPS.map((step) => {
            const status = stepStatus[step.key];
            const Icon = step.icon;
            return (
              <div key={step.key} className={cn(
                'glass rounded-2xl p-4 transition-all duration-300',
                status === 'running' ? 'animate-pulse-glow border-primary/40' :
                status === 'done'    ? 'border-emerald-500/30 bg-emerald-500/5' : ''
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn('p-2.5 rounded-xl border shrink-0', step.bgColor, step.borderColor)}>
                    <Icon className={cn('w-4 h-4', step.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">
                          {status === 'running' ? step.runningLabel : step.label}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {status === 'done'    && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {status === 'running' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                        {status === 'error'   && <AlertCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            onClick={() => navigate(`/session/${uploadId}/done`)}
            disabled={!allDone}
            className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-11 text-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            {allDone
              ? <><span>View Dashboard</span><ChevronRight className="w-4 h-4 ml-1" /></>
              : <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processingâ€¦</>}
          </Button>
        </div>

        {/* Right: live progress */}
        <div className="glass rounded-xl border border-border/30 p-5 min-h-64">
          {isRunning ? (
            <LiveProgressView
              agentStates={agentStates}
              agents={['cat_code_mapper', 'cat_normalizer']}
            />
          ) : allDone ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-semibold text-foreground">CAT Processing Complete</p>
              <p className="text-sm text-muted-foreground">All codes mapped and values normalized.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Starting CAT agentâ€¦</p>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Data Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {rawPreview.length > 0 && <DataPreview rows={rawPreview} headers={uploadMeta?.headers} />}
    </div>
  );
}

