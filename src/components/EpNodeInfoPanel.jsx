import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Building2, FileText, Activity, CloudRain,
  CheckCircle2, AlertCircle, Loader2, Database,
  Hash, Cpu, Globe, BarChart3, ShieldCheck, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SlipCodingPanel from '@/components/SlipCodingPanel';
import { usePipelineStore } from '@/store/usePipelineStore';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Shared table styles (matching DonePage) ─────────────────────────────────
const HEADER_CLASS = 'px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60 bg-muted/30 border-b border-border/40 whitespace-nowrap select-none text-left sticky top-0 z-10';
const CELL_CLASS   = 'px-3 py-2.5 border-b border-border/10 text-[11px] text-foreground/80 font-mono whitespace-nowrap';
const ROW_CLASS    = 'hover:bg-primary/5 transition-colors';

// ── Live preview table (reused for location + account) ──────────────────────
function LivePreviewTable({ uploadId, apiPath, color }) {
  const { data, isLoading } = useQuery({
    queryKey: [apiPath, uploadId],
    queryFn: () => fetch(`${API_BASE}/api/${apiPath}/${uploadId}`).then(r => r.json()),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-1.5">
        <div className="h-8 bg-muted/50 rounded-lg" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-7 bg-muted/30 rounded" />)}
      </div>
    );
  }

  if (!data?.headers?.length) {
    return (
      <p className={cn('text-[11px] italic py-4 text-center', color ?? 'text-muted-foreground')}>
        No data available yet. Complete the pipeline first.
      </p>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border/30 max-h-[420px] overflow-y-auto custom-scrollbar">
      <table className="w-full text-left border-collapse min-w-max">
        <thead>
          <tr>
            {data.headers.map(h => (
              <th key={h} className={HEADER_CLASS}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data.sample ?? []).map((row, i) => (
            <tr key={i} className={ROW_CLASS}>
              {data.headers.map(h => (
                <td key={h} className={cn(CELL_CLASS, i % 2 === 1 && 'bg-muted/20')}>
                  {row[h] != null ? String(row[h]) : <span className="text-muted-foreground/40">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stat row inside panel ───────────────────────────────────────────────────
function PanelStat({ icon: Icon, label, value, color = 'text-slate-500' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <div className={cn('flex items-center gap-1.5', color)}>
        <Icon size={12} className="shrink-0" />
        <span className="text-[11px] text-slate-500">{label}</span>
      </div>
      <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{value ?? '—'}</span>
    </div>
  );
}

// ── Location panel — live table ─────────────────────────────────────────────
function LocationPanel({ uploadId, uploadMeta }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
          <MapPin size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Exposure &amp; Geography</p>
          <p className="text-[10px] text-slate-400">Location file — auto-populated from SOV Agent output</p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">✓ Ready</Badge>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="font-medium">{uploadMeta?.row_count ?? '—'} rows</span>
        <span>·</span>
        <span>{uploadMeta?.headers?.length ?? '—'} columns</span>
        <span>·</span>
        <span className="text-emerald-600 font-medium">Geocoded &amp; Validated</span>
      </div>
      <LivePreviewTable uploadId={uploadId} apiPath="preview-location" color="text-emerald-600" />
    </div>
  );
}

// ── Account panel — live table ──────────────────────────────────────────────
function AccountPanel({ uploadId, uploadMeta }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
          <Building2 size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Portfolio Roll-up</p>
          <p className="text-[10px] text-slate-400">Account file — auto-aggregated from SOV Agent output</p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">✓ Ready</Badge>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="font-medium">{uploadMeta?.row_count ?? '—'} locations</span>
        <span>·</span>
        <span className="text-emerald-600 font-medium">Roll-up Ready</span>
      </div>
      <LivePreviewTable uploadId={uploadId} apiPath="preview-account" color="text-emerald-600" />
    </div>
  );
}

function PolicyPanel({ uploadId, epPolicyFile, onUploadClick, isUploading }) {
  const { slipCodingResult, slipCodingStatus, slipPdfName } = usePipelineStore();
  const isDone  = slipCodingStatus === 'done' && !!slipCodingResult;
  const csvReady = !!epPolicyFile?.row_count;
  const ready = isDone || csvReady;

  return (
    <div className="space-y-4">
      {/* Header row — matches DonePage export card style */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', ready ? 'bg-emerald-100' : 'bg-orange-100')}>
              <FileText size={14} className={ready ? 'text-emerald-600' : 'text-orange-500'} />
            </div>
            <p className="text-sm font-semibold text-foreground">Insurance Terms</p>
            {ready
              ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] ml-1">✓ Ready</Badge>
              : <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[9px] ml-1">Input Required</Badge>
            }
          </div>
          <p className="text-[11px] text-muted-foreground pl-9">
            {isDone
              ? <>Policy slip extracted from <span className="font-medium text-violet-600">{slipPdfName}</span> — {slipCodingResult?.pdf_page_count} pages · {slipCodingResult?.currency ?? 'USD'}</>
              : csvReady
                ? <>{epPolicyFile.row_count} rows uploaded · {epPolicyFile.headers?.length ?? '—'} columns</>
                : 'Upload a PDF slip on the Configure page or a policy CSV to proceed.'
            }
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/40 w-full" />

      {/* Full slip panel — tabs, tables, extraction summary */}
      <SlipCodingPanel
        uploadId={uploadId}
        epPolicyFile={epPolicyFile}
        onCsvUploadClick={onUploadClick}
        isCsvUploading={isUploading}
      />
    </div>
  );
}

function FrequencyPanel({ uploadId, epFrequencyConfig, freqForm, setFreqForm, onSave, isSaving }) {
  const ready = !!epFrequencyConfig?.num_simulations;
  const { slipCodingResult, targetFormat } = usePipelineStore();
  const slipRows = slipCodingResult
    ? (targetFormat === 'RMS' ? slipCodingResult.rms_account_file : slipCodingResult.air_contract_file)
    : null;
  const slipCols = targetFormat === 'RMS'
    ? ['POLICYNUM','BLANLIMAMT','PARTOF','UNDCOVAMT','BLANDEDAMT']
    : ['LayerID','LayerPerils','Limit1','AttachmentAmt','DedAmt1'];
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', ready ? 'bg-emerald-100' : 'bg-orange-100')}>
          <Activity size={14} className={ready ? 'text-emerald-600' : 'text-orange-500'} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Annual Simulation</p>
          <p className="text-[10px] text-slate-400">Frequency configuration — simulation parameters</p>
        </div>
        {ready
          ? <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">✓ Ready</Badge>
          : <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200 text-[9px]">Input Required</Badge>
        }
      </div>
      {/* Account & Location File Previews (Collapsible) */}
      {ready && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <FilePreviewAccordion
            title="Account File (Slip-derived terms)"
            icon={Building2}
            color="text-violet-600"
            bg="bg-violet-50"
            border="border-violet-100"
          >
            <LivePreviewTable uploadId={uploadId} apiPath="preview-account" color="text-violet-600" />
          </FilePreviewAccordion>

          <FilePreviewAccordion
            title="Location File (with Slip limits)"
            icon={MapPin}
            color="text-emerald-600"
            bg="bg-emerald-50"
            border="border-emerald-100"
          >
            <LivePreviewTable uploadId={uploadId} apiPath="preview-location" color="text-emerald-600" />
          </FilePreviewAccordion>
        </div>
      )}

      {/* Configuration Form */}
      <div className="mt-4 pt-3 border-t border-slate-100">
      {ready ? (
        <div className="space-y-1">
          <PanelStat icon={BarChart3} label="Simulations"    value={epFrequencyConfig.num_simulations?.toLocaleString()} color="text-emerald-500" />
          <PanelStat icon={Activity}  label="Model"          value={epFrequencyConfig.frequency_model}                    color="text-sky-500"    />
          <PanelStat icon={Database}  label="Time Horizon"   value={`${epFrequencyConfig.time_horizon_years} yr`}         color="text-violet-500" />
          <PanelStat icon={CheckCircle2} label="Status"      value="Configured"                                           color="text-emerald-500"/>
        </div>
      ) : (
        <div className="pt-2 space-y-3">
          <p className="text-[11px] text-orange-600 font-medium flex items-center gap-1.5">
            <AlertCircle size={12} /> Configure simulation parameters to proceed
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Simulations</label>
              <input
                type="number"
                value={freqForm?.num_simulations ?? 10000}
                onChange={e => setFreqForm(f => ({ ...f, num_simulations: Number(e.target.value) }))}
                className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Time Horizon (yrs)</label>
              <input
                type="number"
                value={freqForm?.time_horizon_years ?? 1}
                onChange={e => setFreqForm(f => ({ ...f, time_horizon_years: Number(e.target.value) }))}
                className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-medium block mb-1">Frequency Model</label>
            <select
              value={freqForm?.frequency_model ?? 'poisson'}
              onChange={e => setFreqForm(f => ({ ...f, frequency_model: e.target.value }))}
              className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="poisson">Poisson</option>
              <option value="negative_binomial">Negative Binomial</option>
              <option value="empirical">Empirical</option>
            </select>
          </div>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-7 text-[10px] font-semibold bg-orange-500 hover:bg-orange-600 text-white w-full"
          >
            {isSaving
              ? <><Loader2 size={10} className="mr-1.5 animate-spin" />Saving…</>
              : 'Save Configuration'
            }
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}

// Helper accordion for Frequency panel tables
function FilePreviewAccordion({ title, icon: Icon, color, bg, border, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-lg border overflow-hidden transition-all", border, bg)}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={12} className={color} />
          <span className={cn("text-[11px] font-bold tracking-wide uppercase", color)}>{title}</span>
        </div>
        {open ? <ChevronDown size={14} className={color} /> : <ChevronRight size={14} className={color} />}
      </button>
      {open && (
        <div className="border-t border-black/5 bg-white p-2">
          {children}
        </div>
      )}
    </div>
  );
}

function PerilPanel({ epPerilConfig, stepStatus }) {
  const hazardStatus = stepStatus?.epHazard ?? 'idle';
  const ready = !!epPerilConfig;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', ready ? 'bg-emerald-100' : hazardStatus === 'error' ? 'bg-red-100' : 'bg-slate-100')}>
          <CloudRain size={14} className={ready ? 'text-emerald-600' : hazardStatus === 'error' ? 'text-red-500' : 'text-slate-400'} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Model Setup (Peril)</p>
          <p className="text-[10px] text-slate-400">Peril + Region — from EP Hazard Assessment</p>
        </div>
        {ready
          ? <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">✓ Ready</Badge>
          : hazardStatus === 'running'
            ? <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200 text-[9px]">Running</Badge>
            : hazardStatus === 'error'
              ? <Badge className="ml-auto bg-red-100 text-red-700 border-red-200 text-[9px]">Error</Badge>
              : <Badge className="ml-auto bg-slate-100 text-slate-500 border-slate-200 text-[9px]">Pending</Badge>
        }
      </div>

      {!ready && hazardStatus !== 'error' && (
        <div className="py-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {hazardStatus === 'running'
              ? <><Loader2 size={12} className="animate-spin text-blue-500" /><span>Running Hazard Assessment… please wait</span></>
              : <><Loader2 size={12} className="text-slate-300" /><span>Waiting for SOV COPE completion to trigger assessment</span></>
            }
          </div>
        </div>
      )}

      {!ready && hazardStatus === 'error' && (
        <p className="text-[11px] text-red-500 font-medium py-2 flex items-center gap-1.5">
          <AlertCircle size={12} /> Hazard assessment failed. Please retry.
        </p>
      )}

      {ready && (
        <>
          <PanelStat icon={Cpu}          label="Perils"             value={epPerilConfig.peril_count ?? '—'}                    color="text-emerald-500" />
          <PanelStat icon={Globe}        label="Earthquake Regions" value={epPerilConfig.earthquake_regions?.length ?? 0}         color="text-sky-500"    />
          <PanelStat icon={CloudRain}    label="Wind Regions"       value={epPerilConfig.wind_regions?.length ?? 0}               color="text-violet-500" />
          <PanelStat icon={CheckCircle2} label="Source"             value="EP Hazard Assessment"                                  color="text-emerald-500"/>
          {epPerilConfig.earthquake_regions?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-semibold text-slate-500 mb-1">Earthquake Regions</p>
              <div className="flex flex-wrap gap-1">
                {epPerilConfig.earthquake_regions.map(r => (
                  <span key={r} className="text-[9px] bg-sky-50 text-sky-600 border border-sky-200 rounded px-1.5 py-0.5">{r}</span>
                ))}
              </div>
            </div>
          )}
          {epPerilConfig.wind_regions?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-semibold text-slate-500 mb-1">Wind Regions</p>
              <div className="flex flex-wrap gap-1">
                {epPerilConfig.wind_regions.map(r => (
                  <span key={r} className="text-[9px] bg-violet-50 text-violet-600 border border-violet-200 rounded px-1.5 py-0.5">{r}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main exported panel ─────────────────────────────────────────────────────
export default function EpNodeInfoPanel({
  nodeId,
  onClose,
  uploadMeta,
  uploadId,
  epPolicyFile,
  epFrequencyConfig,
  epPerilConfig,
  stepStatus,
  freqForm,
  setFreqForm,
  onPolicyUploadClick,
  onFreqSave,
  isPolicyUploading,
  isFreqSaving,
}) {
  if (!nodeId) return null;

  const PANEL_META = {
    epLocation:  { icon: MapPin,    label: 'Exposure & Geography',   color: 'text-emerald-600', ring: 'ring-emerald-200' },
    epAccount:   { icon: Building2, label: 'Portfolio Roll-up',       color: 'text-emerald-600', ring: 'ring-emerald-200' },
    epPolicy:    { icon: FileText,  label: 'Insurance Terms',          color: 'text-orange-500',  ring: 'ring-orange-200'  },
    epFrequency: { icon: Activity,  label: 'Annual Simulation',        color: 'text-orange-500',  ring: 'ring-orange-200'  },
    epPeril:     { icon: CloudRain, label: 'Model Setup (Peril)',      color: 'text-sky-600',     ring: 'ring-sky-200'     },
    epCurve:     { icon: BarChart3, label: 'EP Curve Output',          color: 'text-violet-600',  ring: 'ring-violet-200'  },
  };

  const meta = PANEL_META[nodeId];

  return (
    <div className="animate-in slide-in-from-top-3 fade-in duration-300 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
      {/* Header bar — click the same node in AgentGraph to close */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
        {meta && (
          <>
            <meta.icon size={13} className={meta.color} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{meta.label}</span>
          </>
        )}
        <span className="ml-auto text-[9px] text-slate-400 italic">Click node again to close</span>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {nodeId === 'epLocation' && (
          <LocationPanel uploadId={uploadId} uploadMeta={uploadMeta} />
        )}
        {nodeId === 'epAccount' && (
          <AccountPanel uploadId={uploadId} uploadMeta={uploadMeta} />
        )}
        {nodeId === 'epPolicy' && (
          <PolicyPanel
            uploadId={uploadId}
            epPolicyFile={epPolicyFile}
            onUploadClick={onPolicyUploadClick}
            isUploading={isPolicyUploading}
          />
        )}
        {nodeId === 'epFrequency' && (
          <FrequencyPanel
            uploadId={uploadId}
            epFrequencyConfig={epFrequencyConfig}
            freqForm={freqForm}
            setFreqForm={setFreqForm}
            onSave={onFreqSave}
            isSaving={isFreqSaving}
          />
        )}
        {nodeId === 'epPeril' && (
          <PerilPanel epPerilConfig={epPerilConfig} stepStatus={stepStatus} />
        )}
        {nodeId === 'epCurve' && (
          <div className="text-[11px] text-slate-400 italic py-2">
            Final EP Curve output will appear here once all inputs are ready and the simulation runs.
          </div>
        )}
      </div>
    </div>
  );
}
