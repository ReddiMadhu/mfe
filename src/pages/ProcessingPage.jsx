import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MapPin, Globe, CheckCircle2, Loader2,
  ChevronRight, AlertCircle, Activity,
} from 'lucide-react';
import { runNormalize, runGeocode } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { Button } from '@/components/ui/button';
import LiveProgressView from '@/components/LiveProgressView';
import DataPreview from '@/components/DataPreview';
import AgentGraph from '@/components/AgentGraph';
import { cn } from '@/lib/utils';

function MetricBadge({ label, value, color }) {
  return (
    <div className={cn('flex flex-col items-center px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 shadow-sm', color)}>
      <span className="text-[11px] font-bold tabular-nums">{value ?? '–'}</span>
      <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[60px] truncate text-center leading-tight">{label}</span>
    </div>
  );
}

const PROCESSING_STEPS = [
  { key: 'normalize', label: 'Address Normalization', runningLabel: 'Normalizing addresses…', desc: 'Extract street, city, state, ZIP, country', icon: MapPin,  color: 'text-cyan-400',   bgColor: 'bg-cyan-500/10',   borderColor: 'border-cyan-500/30',   agentId: 'address_normalizer' },
  { key: 'geocode',   label: 'Geocode Addresses',    runningLabel: 'Geocoding addresses…',   desc: 'Resolve lat/lon via Geoapify',           icon: Globe,  color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', agentId: 'geocoder' },
];

export default function ProcessingPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { stepStatus, setStepStatus, setGeocodeResult, agentStates, rawPreview, uploadMeta } = usePipelineStore();

  useAgentStream(uploadId);

  const normalizeMutation = useMutation({
    mutationFn: () => runNormalize(uploadId),
    onMutate:  () => setStepStatus('normalize', 'running'),
    onSuccess: (data) => {
      setStepStatus('normalize', 'done');
      toast.success(`Normalization complete — ${data.flags_added ?? 0} flags`);
      geocodeMutation.mutate();
    },
    onError: (err) => { setStepStatus('normalize', 'error'); toast.error(`Normalization failed: ${err.message}`); },
  });

  const geocodeMutation = useMutation({
    mutationFn: () => runGeocode(uploadId),
    onMutate:  () => setStepStatus('geocode', 'running'),
    onSuccess: (data) => {
      setStepStatus('geocode', 'done');
      setGeocodeResult(data);
      toast.success(`Geocoding complete — ${data.geocoded} geocoded, ${data.failed} failed`);
    },
    onError: (err) => { setStepStatus('geocode', 'error'); toast.error(`Geocoding failed: ${err.message}`); },
  });

  useEffect(() => {
    if (stepStatus.normalize === 'idle') normalizeMutation.mutate();
  }, []);

  const bothDone = stepStatus.normalize === 'done' && stepStatus.geocode === 'done';
  const isRunning = stepStatus.normalize === 'running' || stepStatus.geocode === 'running';

  return (
    <div className="min-h-[calc(100vh-6rem)] p-4 w-full max-w-[1400px] mx-auto flex flex-col gap-4">

      {/* ── Pipeline DAG graph ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm p-4">
        {/* Graph */}
        <AgentGraph agentStates={agentStates} stepStatus={stepStatus} />
      </div>

      {/* ── Step cards + live log ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-4">

        {/* Left: step cards */}
        <div className="space-y-3">
          {PROCESSING_STEPS.map((step) => {
            const status = stepStatus[step.key];
            const Icon = step.icon;
            const result = step.key === 'geocode' ? usePipelineStore.getState().geocodeResult : null;
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
                    {status === 'done' && step.key === 'geocode' && result && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <MetricBadge label="Geocoded"  value={result.geocoded}    />
                        <MetricBadge label="Provided"  value={result.provided}    />
                        <MetricBadge label="Failed"    value={result.failed}      color="text-rose-400" />
                        <MetricBadge label="Flags"     value={result.flags_added} color="text-amber-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            onClick={() => navigate(`/session/${uploadId}/agents`)}
            disabled={!bothDone}
            className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-11 text-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            {bothDone
              ? <><span>Continue to Agent Selection</span><ChevronRight className="w-4 h-4 ml-1" /></>
              : <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>}
          </Button>
        </div>

        {/* Right: live log */}
        <div className="glass rounded-xl border border-border/30 p-5 min-h-64">
          {isRunning ? (
            <LiveProgressView
              agentStates={agentStates}
              agents={['address_normalizer', 'geocoder']}
            />
          ) : bothDone ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-semibold text-foreground">Preprocessing Complete</p>
              <p className="text-sm text-muted-foreground">Addresses normalized and geocoded successfully.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Starting pipeline…</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Data Preview ───────────────────────────────────────────────────── */}
      {rawPreview.length > 0 && <DataPreview rows={rawPreview} headers={uploadMeta?.headers} />}
    </div>
  );
}
