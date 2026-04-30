import { useRef } from 'react';
import {
  MapPin, Building2, FileText, Activity, CloudRain,
  CheckCircle2, AlertCircle, Loader2, X, Database,
  Hash, Cpu, Globe, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

// ── Individual sub-panels ───────────────────────────────────────────────────
function LocationPanel({ uploadMeta }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
          <MapPin size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Exposure &amp; Geography</p>
          <p className="text-[10px] text-slate-400">Location file — auto-populated from SOV Agent output</p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">
          ✓ Ready
        </Badge>
      </div>
      <PanelStat icon={Database}  label="Total Rows"    value={uploadMeta?.row_count}                                color="text-emerald-500" />
      <PanelStat icon={Hash}      label="Columns"       value={uploadMeta?.total_cols ?? uploadMeta?.headers?.length} color="text-sky-500"     />
      <PanelStat icon={Globe}     label="Source"        value="SOV COPE Agent"                                        color="text-violet-500"  />
      <PanelStat icon={CheckCircle2} label="Status"     value="Geocoded &amp; Validated"                             color="text-emerald-500" />
    </div>
  );
}

function AccountPanel({ uploadMeta }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
          <Building2 size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Portfolio Roll-up</p>
          <p className="text-[10px] text-slate-400">Account file — auto-aggregated from SOV Agent output</p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">
          ✓ Ready
        </Badge>
      </div>
      <PanelStat icon={Database}  label="Locations"     value={uploadMeta?.row_count}  color="text-emerald-500" />
      <PanelStat icon={Building2} label="Accounts"      value="Auto-aggregated"         color="text-sky-500"    />
      <PanelStat icon={Globe}     label="Source"        value="SOV COPE Agent"           color="text-violet-500" />
      <PanelStat icon={CheckCircle2} label="Status"     value="Roll-up Ready"           color="text-emerald-500"/>
    </div>
  );
}

function PolicyPanel({ epPolicyFile, onUploadClick, isUploading }) {
  const ready = !!epPolicyFile?.row_count;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', ready ? 'bg-emerald-100' : 'bg-orange-100')}>
          <FileText size={14} className={ready ? 'text-emerald-600' : 'text-orange-500'} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Insurance Terms</p>
          <p className="text-[10px] text-slate-400">Policy file — Policy_ID, Limit, Deductible, Coverage_Type</p>
        </div>
        {ready
          ? <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">✓ Ready</Badge>
          : <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200 text-[9px]">Input Required</Badge>
        }
      </div>
      {ready ? (
        <>
          <PanelStat icon={Database}  label="Policy Rows"   value={epPolicyFile.row_count}                 color="text-emerald-500" />
          <PanelStat icon={Hash}      label="Columns"       value={epPolicyFile.headers?.length ?? '—'}     color="text-sky-500"    />
          <PanelStat icon={CheckCircle2} label="Status"     value="Uploaded"                                color="text-emerald-500"/>
        </>
      ) : (
        <div className="pt-2">
          <p className="text-[11px] text-orange-600 font-medium mb-3 flex items-center gap-1.5">
            <AlertCircle size={12} /> Upload a policy CSV/XLSX to proceed
          </p>
          <p className="text-[10px] text-slate-400 mb-3">
            Required columns: <span className="font-mono text-slate-600">Policy_ID, Account_ID, Policy_Limit, Policy_Deductible, Coverage_Type, Policy_Type</span>
          </p>
          <Button
            size="sm"
            onClick={onUploadClick}
            disabled={isUploading}
            className="h-7 text-[10px] font-semibold bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isUploading
              ? <><Loader2 size={10} className="mr-1.5 animate-spin" />Uploading…</>
              : 'Upload Policy File'
            }
          </Button>
        </div>
      )}
    </div>
  );
}

function FrequencyPanel({ epFrequencyConfig, freqForm, setFreqForm, onSave, isSaving }) {
  const ready = !!epFrequencyConfig?.num_simulations;
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
      {ready ? (
        <>
          <PanelStat icon={BarChart3} label="Simulations"    value={epFrequencyConfig.num_simulations?.toLocaleString()} color="text-emerald-500" />
          <PanelStat icon={Activity}  label="Model"          value={epFrequencyConfig.frequency_model}                    color="text-sky-500"    />
          <PanelStat icon={Database}  label="Time Horizon"   value={`${epFrequencyConfig.time_horizon_years} yr`}         color="text-violet-500" />
          <PanelStat icon={CheckCircle2} label="Status"      value="Configured"                                           color="text-emerald-500"/>
        </>
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

      {/* Stage 1 — Hazard running/pending */}
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

      {/* Stage 1 — Error */}
      {!ready && hazardStatus === 'error' && (
        <p className="text-[11px] text-red-500 font-medium py-2 flex items-center gap-1.5">
          <AlertCircle size={12} /> Hazard assessment failed. Please retry.
        </p>
      )}

      {/* Stage 2 — Done */}
      {ready && (
        <>
          <PanelStat icon={Cpu}          label="Perils"           value={epPerilConfig.peril_count ?? '—'}                                                        color="text-emerald-500" />
          <PanelStat icon={Globe}        label="Earthquake Regions" value={epPerilConfig.earthquake_regions?.length ?? 0}                                         color="text-sky-500"    />
          <PanelStat icon={CloudRain}    label="Wind Regions"     value={epPerilConfig.wind_regions?.length ?? 0}                                                  color="text-violet-500" />
          <PanelStat icon={CheckCircle2} label="Source"           value="EP Hazard Assessment"                                                                     color="text-emerald-500"/>
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
    <div className="animate-in slide-in-from-bottom-3 fade-in duration-300 mt-3 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
        {meta && (
          <>
            <meta.icon size={13} className={meta.color} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{meta.label}</span>
          </>
        )}
        <button
          onClick={onClose}
          className="ml-auto w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
        >
          <X size={11} className="text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {nodeId === 'epLocation' && (
          <LocationPanel uploadMeta={uploadMeta} />
        )}
        {nodeId === 'epAccount' && (
          <AccountPanel uploadMeta={uploadMeta} />
        )}
        {nodeId === 'epPolicy' && (
          <PolicyPanel
            epPolicyFile={epPolicyFile}
            onUploadClick={onPolicyUploadClick}
            isUploading={isPolicyUploading}
          />
        )}
        {nodeId === 'epFrequency' && (
          <FrequencyPanel
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
