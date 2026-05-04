import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MapPin, Globe, CheckCircle2, Loader2,
  ChevronRight, AlertCircle, Wifi, WifiOff, RefreshCw,
  Tag, BarChart3, FileOutput, Check,
} from 'lucide-react';
import { runNormalize, runGeocode } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { Button } from '@/components/ui/button';
import LiveProgressView from '@/components/LiveProgressView';
import DataPreview from '@/components/DataPreview';
import AgentGraph from '@/components/AgentGraph';
import { cn } from '@/lib/utils';

// ─── Metric badge ──────────────────────────────────────────────────────────────
function MetricBadge({ label, value, color }) {
  return (
    <div className={cn('flex flex-col items-center px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 shadow-sm', color)}>
      <span className="text-[11px] font-bold tabular-nums">{value ?? '–'}</span>
      <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[60px] truncate text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Pipeline stages shown in the step-cards and bottom strip ──────────────────
const PROCESSING_STEPS = [
  { key: 'normalize',      label: 'Address Normalization',  runningLabel: 'Normalizing addresses…',  desc: 'Extract street, city, state, ZIP, country', icon: MapPin,    color: 'text-cyan-400',   bgColor: 'bg-cyan-500/10',    borderColor: 'border-cyan-500/30',    agentId: 'address_normalizer' },
  { key: 'geocode',        label: 'Geocode Addresses',      runningLabel: 'Geocoding addresses…',    desc: 'Resolve lat/lon via Geoapify',              icon: Globe,    color: 'text-violet-400', bgColor: 'bg-violet-500/10',  borderColor: 'border-violet-500/30',  agentId: 'geocoder' },
  { key: 'mapping',        label: 'Column Mapping',         runningLabel: 'Mapping columns…',        desc: 'Map source columns to canonical schema',    icon: Tag,      color: 'text-amber-400',  bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/30',   agentId: 'cat_code_mapper' },
  { key: 'mapCodes',       label: 'Code Mapping',           runningLabel: 'Mapping CAT codes…',      desc: 'Occ & construction code classification',    icon: Tag,      color: 'text-purple-400', bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/30',  agentId: 'cat_code_mapper' },
  { key: 'normalizeValues',label: 'Value Normalization',    runningLabel: 'Normalizing values…',     desc: 'Flag and correct outlier values',           icon: BarChart3,color: 'text-orange-400', bgColor: 'bg-orange-500/10',  borderColor: 'border-orange-500/30',  agentId: 'cat_normalizer' },
];

// ─── Bottom pipeline progress strip ───────────────────────────────────────────
function PipelineStrip({ stepStatus, agentStates }) {
  // Extract latest log message from any running agent
  const latestMsg = (() => {
    for (const step of [...PROCESSING_STEPS].reverse()) {
      const logs = agentStates[step.agentId]?.thinkingLog ?? [];
      if (logs.length > 0) {
        const msg = typeof logs[logs.length - 1] === 'string'
          ? logs[logs.length - 1]
          : (logs[logs.length - 1]?.message ?? '');
        return msg;
      }
    }
    return null;
  })();

  // Calculate overall pipeline progress (each step = 20%)
  const doneCount  = PROCESSING_STEPS.filter(s => stepStatus[s.key] === 'done').length;
  const totalSteps = PROCESSING_STEPS.length;
  const overallPct = Math.round((doneCount / totalSteps) * 100);
  const allDone    = doneCount === totalSteps;

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-lg',
      'bg-white/90 border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]',
      'transition-all duration-500',
    )}>
      {/* Overall progress bar at very top of strip */}
      <div className="h-[3px] bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-700',
            allDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 via-primary to-cyan-400',
          )}
          style={{ width: `${overallPct}%` }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center gap-4">

        {/* Stage pills */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {PROCESSING_STEPS.map((step, idx) => {
            const st = stepStatus[step.key] ?? 'idle';
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap transition-all duration-300 shrink-0',
                  st === 'done'    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700' :
                  st === 'running' ? 'bg-primary/10 border-primary/30 text-primary animate-pulse' :
                  st === 'error'   ? 'bg-rose-500/10 border-rose-500/30 text-rose-600' :
                                     'bg-muted/50 border-border/30 text-muted-foreground opacity-60',
                )}
              >
                {st === 'done'    ? <Check size={10} className="text-emerald-500" /> :
                 st === 'running' ? <Loader2 size={10} className="animate-spin" /> :
                 st === 'error'   ? <AlertCircle size={10} /> :
                 <Icon size={10} />}
                {step.label}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border/40 shrink-0" />

        {/* Live message ticker */}
        <div className="flex items-center gap-2 min-w-0 max-w-xs">
          {latestMsg && (
            <>
              <Loader2 size={12} className="text-primary animate-spin shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate font-mono">{latestMsg}</span>
            </>
          )}
        </div>

        {/* Overall pct */}
        <div className="shrink-0 text-right">
          <div className={cn(
            'text-sm font-bold tabular-nums',
            allDone ? 'text-emerald-600' : 'text-foreground',
          )}>
            {overallPct}%
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight">
            {doneCount}/{totalSteps} stages
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ProcessingPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { stepStatus, setStepStatus, setGeocodeResult, agentStates, rawPreview, uploadMeta } = usePipelineStore();

  const streamStatus = useAgentStream(uploadId);
  const [connStatus, setConnStatus] = useState('connecting');

  // Poll statusRef every 500ms to drive the connection badge
  useEffect(() => {
    const t = setInterval(() => setConnStatus(streamStatus.current), 500);
    return () => clearInterval(t);
  }, [streamStatus]);

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
  const anyPipelineRunning = PROCESSING_STEPS.some(s => stepStatus[s.key] === 'running');
  const allStagesDone = PROCESSING_STEPS.every(s => stepStatus[s.key] === 'done');

  return (
    // pb-20 gives clearance so content doesn't hide behind the sticky strip
    <div className="min-h-[calc(100vh-6rem)] p-4 pb-20 w-full max-w-[1400px] mx-auto flex flex-col gap-4">

      {/* ── Pipeline DAG graph ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm p-4">
        {/* Header row: label + connection badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pipeline Graph</span>
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
            connStatus === 'open'       ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' :
            connStatus === 'connecting' ? 'bg-amber-500/10  border-amber-500/30  text-amber-600'   :
            connStatus === 'error'      ? 'bg-amber-500/10  border-amber-500/30  text-amber-600'   :
                                          'bg-rose-500/10   border-rose-500/30   text-rose-600',
          )}>
            {connStatus === 'open'
              ? <><Wifi size={11} /> Live Stream</>
              : connStatus === 'connecting' || connStatus === 'error'
              ? <><RefreshCw size={11} className="animate-spin" /> Reconnecting…</>
              : <><WifiOff size={11} /> Disconnected</>}
          </div>
        </div>
        <AgentGraph agentStates={agentStates} stepStatus={stepStatus} />
      </div>

      {/* ── Step cards + live log ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-4">

        {/* Left: step cards — only show the first two (normalize + geocode) */}
        <div className="space-y-3">
          {PROCESSING_STEPS.slice(0, 2).map((step) => {
            const status = stepStatus[step.key];
            const Icon   = step.icon;
            const result = step.key === 'geocode' ? usePipelineStore.getState().geocodeResult : null;
            return (
              <div key={step.key} className={cn(
                'glass rounded-2xl p-4 transition-all duration-300',
                status === 'running' ? 'animate-pulse-glow border-primary/40' :
                status === 'done'    ? 'border-emerald-500/30 bg-emerald-500/5' : '',
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
              agents={['address_normalizer', 'geocoder', 'code_mapper', 'normalizer']}
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

      {/* ── Data Preview ─────────────────────────────────────────────────── */}
      {rawPreview.length > 0 && <DataPreview rows={rawPreview} headers={uploadMeta?.headers} />}

      {/* ── Bottom pipeline progress strip (sticky, always visible) ──────── */}
      {(anyPipelineRunning || isRunning || allStagesDone) && (
        <PipelineStrip stepStatus={stepStatus} agentStates={agentStates} />
      )}
    </div>
  );
}
