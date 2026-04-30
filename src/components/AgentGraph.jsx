import { useMemo, useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet, MapPin, Tag, BarChart3, FileOutput,
  ShieldCheck, CloudRain, Layers, Eye, TrendingUp, Award,
  Loader2, Check, Lock, AlertCircle, Play,
  ChevronRight, CheckCircle, XCircle, Percent, Hash,
  Cpu, Zap, Database, FileText, Building2, Activity,
} from 'lucide-react';
import { usePipelineStore } from '@/store/usePipelineStore';
import { cn } from '@/lib/utils';

// ─── Node dimensions ──────────────────────────────────────────────────────────
const NW  = 136;
const NH  = 34;
const NCY = NH / 2;

// Heights for container calculation
const EXP_DONE_H    = 112;
const EXP_RUNNING_H = 116;

// Layout logic is computed dynamically in the component.

const NODE_DEFS = [
  { id: 'upload',      label: 'Upload SOV',            icon: FileSpreadsheet, agentKey: 'upload',          color: '#3b82f6' },
  { id: 'geocode',     label: '1 - Data Agent',         icon: MapPin,          agentKey: 'geocoder',        color: '#0ea5e9' },
  { id: 'catMap',      label: 'Occupancy & Construction Mapping',   icon: Tag,             agentKey: 'cat_code_mapper', color: '#8b5cf6' },
  { id: 'cope',        label: '6 - Real time CAT Event Assessment',      icon: ShieldCheck,     agentKey: 'cope_triage',     color: '#f59e0b' },
  { id: 'hazards',     label: '3 - Hazard Assessment',      icon: CloudRain,       agentKey: 'hazard_data',     color: '#ef4444' },
  { id: 'geospatial',  label: '4 - Geospatial Data',        icon: Layers,          agentKey: 'geospatial_data', color: '#10b981' },
  { id: 'catNorm',     label: 'Value Normalization',    icon: BarChart3,       agentKey: 'cat_normalizer',  color: '#f97316' },
  { id: 'objAnalysis', label: '5 - Property Computer Vision',       icon: Eye,             agentKey: 'object_detection',color: '#ec4899' },
  { id: 'catOut',      label: 'Output Formatting',      icon: FileOutput,      agentKey: 'cat_output',      color: '#64748b' },
  { id: 'riskModel',   label: '7 - Property Vulnerability Risk', icon: TrendingUp, agentKey: 'risk_model',      color: '#4f46e5' },
  { id: 'propensity',  label: '8 - Quote Propensity',       icon: Award,           agentKey: 'quote_propensity',color: '#f43f5e' },
  // ── EP Curve Generation sub-agents ──
  { id: 'epLocation',  label: 'Exposure & Geography',   icon: MapPin,    agentKey: 'ep_location',  color: '#10b981', epSource: 'sov'    },
  { id: 'epPolicy',    label: 'Insurance Terms',        icon: FileText,  agentKey: 'ep_policy',    color: '#f97316', epSource: 'input'  },
  { id: 'epAccount',   label: 'Portfolio Roll-up',      icon: Building2, agentKey: 'ep_account',   color: '#10b981', epSource: 'sov'    },
  { id: 'epPeril',     label: 'Model Setup (Peril)',     icon: CloudRain, agentKey: 'ep_peril',     color: '#10b981', epSource: 'hazard' },
  { id: 'epFrequency', label: 'Annual Simulation',       icon: Activity,  agentKey: 'ep_frequency', color: '#f97316', epSource: 'input'  },
  { id: 'epCurve',     label: 'EP Curve Output',         icon: TrendingUp,agentKey: 'ep_curve_out', color: '#7c3aed' },
];

const NODE_STEP_MAP = { upload: 1, geocode: 2, catMap: 7, catNorm: 8, catOut: 9, epCurve: 10 };

// EP node IDs for filtering
const EP_NODE_IDS = new Set(['epLocation','epPolicy','epAccount','epPeril','epFrequency','epCurve']);

const EDGES = [
  { from: 'upload',     to: 'geocode'     },
  { from: 'geocode',    to: 'catMap'      },
  { from: 'geocode',    to: 'cope'        },
  { from: 'geocode',    to: 'hazards'     },
  { from: 'geocode',    to: 'geospatial'  },
  { from: 'geocode',    to: 'objAnalysis' }, // 4th branch directly from Data Agent
  { from: 'catMap',     to: 'catNorm'     },
  { from: 'catNorm',    to: 'catOut'      },
  { from: 'cope',       to: 'riskModel'   },
  { from: 'hazards',    to: 'riskModel'   },
  { from: 'geospatial', to: 'riskModel'   }, // was: geospatial → objAnalysis
  { from: 'objAnalysis',to: 'riskModel'   },
  { from: 'riskModel',  to: 'propensity'  },
  // EP Curve edges
  { from: 'catOut',     to: 'epLocation'  },
  { from: 'catOut',     to: 'epAccount'   },
  { from: 'catOut',     to: 'epPeril'     },
  { from: 'epLocation', to: 'epCurve'     },
  { from: 'epPolicy',   to: 'epCurve'     },
  { from: 'epAccount',  to: 'epCurve'     },
  { from: 'epPeril',    to: 'epCurve'     },
  { from: 'epFrequency',to: 'epCurve'     },
];

function makePath(fromDef, toDef, fromPos, toPos) {
  const isFromEp = EP_NODE_IDS.has(fromDef.id);
  const isToEp   = EP_NODE_IDS.has(toDef.id);

  const fw = isFromEp ? 120 : NW;
  const fh = isFromEp ? 28  : NH;
  const th = isToEp   ? 28  : NH;

  const x1 = fromPos.left + fw;
  const y1 = fromPos.top  + (fh / 2);
  const x2 = toPos.left;
  const y2 = toPos.top  + (th / 2);

  const dx = x2 - x1;
  const cxOffset = Math.max(16, Math.min(60, dx * 0.25));
  return `M ${x1} ${y1} C ${x1 + cxOffset} ${y1}, ${x2 - cxOffset} ${y2}, ${x2} ${y2}`;
}

// ─── Tiny stat row ────────────────────────────────────────────────────────────
function StatRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between py-[2px]">
      <div className={cn('flex items-center gap-1 min-w-0', color)}>
        <Icon size={8} className="shrink-0" />
        <span className="text-[8px] text-slate-500 truncate">{label}</span>
      </div>
      <span className={cn(
        'text-[9px] font-bold tabular-nums ml-1 shrink-0',
        value === '—' ? 'text-slate-300' : 'text-slate-700',
      )}>
        {value}
      </span>
    </div>
  );
}

// ─── Node Simulated Progress ──────────────────────────────────────────────────
function NodeSimulatedProgress({ isRunning, totalRows, label }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isRunning && totalRows > 0) {
      const msPerRow = 25000 / totalRows; // Slower polling (~2.5s)
      const interval = setInterval(() => {
        setCount(c => (c < totalRows - 1 ? c + 1 : c));
      }, Math.max(1200, msPerRow));
      return () => clearInterval(interval);
    }
  }, [isRunning, totalRows]);

  if (!isRunning) return null;

  return (
    <div className="text-[7.5px] font-extrabold text-orange-500 mb-0.5 px-0.5 pt-0.5 animate-pulse tracking-wide whitespace-normal leading-tight">
      {label}
      <div className="mt-0.5 text-[8.5px]">
        {count} / {totalRows || '?'} properties...
      </div>
    </div>
  );
}

// ─── Node summary builders ────────────────────────────────────────────────────
function safe(v) { return v != null && v !== '' ? String(v) : '—'; }
function pct(n, d) { return d && d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—'; }

const NODE_SUMMARY = {
  upload: (r) => ({
    headline: r?.row_count != null
      ? `${r.row_count} rows, ${r?.total_cols ?? r?.headers?.length ?? '?'} cols`
      : 'File uploaded — session ready.',
    stats: [
      { icon: Database,    label: 'Rows',   value: safe(r?.row_count ?? r?.total_rows),    color: 'text-blue-500'    },
      { icon: Hash,        label: 'Cols',   value: safe(r?.total_cols ?? r?.headers?.length), color: 'text-sky-500'  },
      { icon: CheckCircle, label: 'Status', value: 'Ready',                                  color: 'text-emerald-500' },
    ],
  }),

  geocode: (r) => {
    const total = r?.total_rows;
    const geo   = r?.geocoded;
    const prov  = r?.provided ?? 0;
    const fail  = r?.failed   ?? 0;
    return {
      headline: total != null
        ? `${geo} geocoded, ${fail} failed of ${total}`
        : 'Geocoding complete.',
      stats: [
        { icon: CheckCircle, label: 'Geocoded', value: safe(geo),             color: 'text-emerald-500' },
        { icon: MapPin,      label: 'Provided', value: safe(prov),             color: 'text-sky-500'    },
        { icon: XCircle,     label: 'Failed',   value: safe(fail),             color: 'text-rose-500'   },
        { icon: Percent,     label: 'Rate',     value: pct(geo, total - prov), color: 'text-violet-500' },
      ],
    };
  },

  catMap: (r) => {
    const occ = r?.unique_occ_pairs ?? r?.occ_mapped;
    const cst = r?.unique_const_pairs ?? r?.const_mapped;
    const byM = r?.occ_by_method ?? {};
    const top = Object.entries(byM).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return {
      headline: `${safe(occ)} occ, ${safe(cst)} const pairs`,
      stats: [
        { icon: Tag,         label: 'Occ',    value: safe(occ), color: 'text-violet-500' },
        { icon: Layers,      label: 'Const',  value: safe(cst), color: 'text-purple-500' },
        { icon: Zap,         label: 'Method', value: top,       color: 'text-amber-500'  },
        { icon: AlertCircle, label: 'Flags',  value: safe(r?.flags_added), color: 'text-rose-400' },
      ],
    };
  },

  cope: (r) => ({
    headline: 'COPE attributes evaluated.',
    stats: [
      { icon: Database, label: 'Records',     value: safe(r?.records),     color: 'text-amber-500'   },
      { icon: Percent,  label: 'Avg Quality', value: safe(r?.avg_quality), color: 'text-emerald-500' },
    ],
  }),

  hazards: (r) => ({
    headline: 'CAT hazard exposure scored.',
    stats: [
      { icon: CloudRain, label: 'Triggers',  value: safe(r?.triggers),  color: 'text-red-500'    },
      { icon: Percent,   label: 'Avg Score', value: safe(r?.avg_score), color: 'text-orange-500' },
    ],
  }),

  geospatial: (r) => ({
    headline: 'Geospatial index built.',
    stats: [
      { icon: MapPin,  label: 'Points',   value: safe(r?.points),   color: 'text-emerald-500' },
      { icon: Percent, label: 'Coverage', value: safe(r?.coverage), color: 'text-teal-500'    },
    ],
  }),

  catNorm: (r) => ({
    headline: r?.total_rows != null
      ? `${r.total_rows} rows, ${r?.flags_added ?? 0} flags`
      : 'Values normalised.',
    stats: [
      { icon: Database,    label: 'Rows',       value: safe(r?.total_rows),  color: 'text-orange-500' },
      { icon: AlertCircle, label: 'Flags',      value: safe(r?.flags_added), color: 'text-rose-500'   },
      { icon: Cpu,         label: 'Year Flags', value: safe(r?.normalization_summary?.year_flags), color: 'text-amber-500' },
      { icon: BarChart3,   label: 'Val Flags',  value: safe(r?.normalization_summary?.value_flags), color: 'text-violet-500' },
    ],
  }),

  objAnalysis: (r) => ({
    headline: 'Structural features detected.',
    stats: [
      { icon: Eye,     label: 'Detected',    value: safe(r?.detected),  color: 'text-pink-500' },
      { icon: Percent, label: 'Confidence',  value: safe(r?.avg_conf),  color: 'text-rose-400' },
    ],
  }),

  catOut: (r) => ({
    headline: 'Output ready for download.',
    stats: [
      { icon: FileOutput, label: 'Rows Out', value: safe(r?.output_rows), color: 'text-slate-500'   },
      { icon: Database,   label: 'Format',   value: safe(r?.format),      color: 'text-emerald-500' },
    ],
  }),

  riskModel: (r) => ({
    headline: 'Risk scores computed.',
    stats: [
      { icon: TrendingUp, label: 'Avg Risk',  value: safe(r?.avg_risk),  color: 'text-indigo-500' },
      { icon: Percent,    label: 'High Risk', value: safe(r?.high_risk), color: 'text-rose-500'   },
    ],
  }),

  propensity: (r) => ({
    headline: 'Propensity scores finalised.',
    stats: [
      { icon: Award,   label: 'High Tier', value: safe(r?.high_tier), color: 'text-rose-500'  },
      { icon: Percent, label: 'Avg Score', value: safe(r?.avg),       color: 'text-amber-500' },
    ],
  }),

  // ── EP Curve sub-agent summaries ──
  epLocation: (r) => ({
    headline: 'Location file from SOV.',
    stats: [
      { icon: MapPin,      label: 'Rows',   value: safe(r?.row_count), color: 'text-emerald-500' },
      { icon: CheckCircle, label: 'Source',  value: 'SOV Agent',        color: 'text-emerald-500' },
    ],
  }),
  epPolicy: (r) => ({
    headline: r?.row_count ? `${r.row_count} policy rows uploaded.` : 'Policy file required.',
    stats: [
      { icon: FileText,    label: 'Rows',   value: safe(r?.row_count), color: 'text-orange-500' },
      { icon: AlertCircle, label: 'Status',  value: r?.row_count ? 'Uploaded' : 'Required', color: r?.row_count ? 'text-emerald-500' : 'text-orange-500' },
    ],
  }),
  epAccount: (r) => ({
    headline: 'Account file from SOV.',
    stats: [
      { icon: Building2,   label: 'Accounts', value: safe(r?.count), color: 'text-emerald-500' },
      { icon: CheckCircle, label: 'Source',    value: 'SOV Agent',    color: 'text-emerald-500' },
    ],
  }),
  epPeril: (r) => ({
    headline: 'Peril config from Hazard Assessment.',
    stats: [
      { icon: CloudRain,   label: 'Perils',  value: safe(r?.peril_count), color: 'text-emerald-500' },
      { icon: CheckCircle, label: 'Source',   value: 'Hazard Agent',      color: 'text-emerald-500' },
    ],
  }),
  epFrequency: (r) => ({
    headline: r?.num_simulations ? `${r.num_simulations} sims configured.` : 'Configuration required.',
    stats: [
      { icon: Activity,    label: 'Sims',    value: safe(r?.num_simulations), color: 'text-orange-500' },
      { icon: AlertCircle, label: 'Status',   value: r?.num_simulations ? 'Set' : 'Required', color: r?.num_simulations ? 'text-emerald-500' : 'text-orange-500' },
    ],
  }),
  epCurve: (r) => ({
    headline: r?.status === 'complete' ? 'EP Curve generated.' : 'Waiting for all inputs.',
    stats: [
      { icon: TrendingUp,  label: 'OEP',  value: safe(r?.oep_count), color: 'text-violet-500' },
      { icon: TrendingUp,  label: 'AEP',  value: safe(r?.aep_count), color: 'text-purple-500' },
    ],
  }),
};

// ─── Unified node card — grows in-place ───────────────────────────────────────
function PipelineNode({ 
  nodeDef, 
  pos, 
  status, 
  agentState, 
  result, 
  onNavigate, 
  currentPipelineStep, 
  expanded, 
  totalRows,
  compact = false 
}) {
  const nodeWidth = compact ? 120 : NW;
  const nodeHeight = compact ? 28 : NH;
  const Icon = nodeDef.icon;
  const logsEndRef = useRef(null);
  const logs = agentState?.thinkingLog ?? [];

  useEffect(() => {
    if (status === 'running') logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length, status]);

  const summaryBuilder = NODE_SUMMARY[nodeDef.id];
  const { headline, stats } = summaryBuilder
    ? summaryBuilder(result)
    : { headline: `${nodeDef.label} complete.`, stats: [] };

  const nodeStep = NODE_STEP_MAP[nodeDef.id];
  const canNav   = nodeStep != null && nodeStep <= (currentPipelineStep ?? 0);

  const COLOR = {
    pending: { bg: '#e2e8fc', border: '0.5px solid #e2e8f0', text: '#64748b', iconC: nodeDef.color + '80', div: '#e2e8f0' },
    running: { bg: '#fff7ed', border: '1.5px solid #fb923c',  text: '#0f172a', iconC: '#ea580c',         div: '#fed7aa' },
    done:    { bg: '#ecfdf5', border: '1.5px solid #6ee7b7',  text: '#0f172a', iconC: '#059669',         div: '#d1fae5' },
    error:   { bg: '#fff1f2', border: '1px solid #fca5a5',    text: '#0f172a', iconC: '#e11d48',         div: '#fee2e2' },
    locked:  { bg: '#f8fafc', border: '0.5px solid #e2e8f0',  text: '#94a3b8', iconC: '#94a3b8',         div: '#e2e8f0' },
  };
  const c = COLOR[status] || COLOR.pending;

  return (
    <div
      onClick={() => { if (canNav) onNavigate(nodeStep); }}
      className={cn("absolute overflow-hidden flex flex-col group", canNav ? "cursor-pointer" : "cursor-default")}
      style={{
        left:         pos.left,
        top:          pos.top,
        width:        nodeWidth,
        borderRadius: expanded ? 10 : 9999,
        background:   c.bg,
        border:       c.border,
        boxShadow:    status === 'running'
          ? '0 4px 14px rgba(249,115,22,0.22)'
          : status === 'done'
            ? '0 2px 8px rgba(16,185,129,0.14)'
            : '0 1px 3px rgba(0,0,0,0.05)',
        zIndex:       10,
        transition:   'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── pill header row ── */}
      <div className={cn("flex items-center shrink-0", compact ? "gap-1 px-1.5" : "gap-1.5 px-2")} style={{ height: nodeHeight, minHeight: nodeHeight }}>
        <div
          className={cn("rounded-full flex items-center justify-center shrink-0 bg-white/60", compact ? "w-4 h-4" : "w-5 h-5")}
          style={{ color: c.iconC }}
        >
          {status === 'running' ? <Loader2 size={compact ? 8 : 10} className="animate-spin" /> :
           status === 'done'    ? <Check    size={compact ? 8 : 10} /> :
           status === 'error'   ? <AlertCircle size={compact ? 8 : 10} /> :
           status === 'locked'  ? <Lock     size={compact ? 8 : 10} /> :
           <Icon size={compact ? 8 : 10} />}
        </div>
        <div
          className={cn("whitespace-normal leading-tight font-semibold flex-1 line-clamp-2 pr-1", compact ? "text-[7.5px]" : "text-[8px]")}
          style={{ color: c.text }}
        >
          {nodeDef.label}
        </div>
        {status === 'running' && (
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0 mr-0.5" />
        )}
      </div>

      {/* ── expanded body ── */}
      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div style={{ height: 1, background: c.div, flexShrink: 0 }} />

          {status === 'running' ? (
            <div
              className="overflow-y-auto px-1.5 py-1 space-y-[1px]"
              style={{ maxHeight: EXP_RUNNING_H - NH - 1 }}
            >
              {nodeDef.id === 'geocode' && (
                <NodeSimulatedProgress isRunning={true} totalRows={totalRows} label="Geocoding & Normalizing address for" />
              )}
              {nodeDef.id === 'catMap' && (
                <NodeSimulatedProgress isRunning={true} totalRows={totalRows} label="Mapping CAT codes for" />
              )}
              {nodeDef.id === 'catNorm' && (
                <NodeSimulatedProgress isRunning={true} totalRows={totalRows} label="Normalizing values for" />
              )}
              
              {logs.length === 0 && !['geocode', 'catMap', 'catNorm'].includes(nodeDef.id) && (
                <div className="text-[8px] text-slate-400 italic animate-pulse px-0.5 pt-0.5">Starting agent…</div>
              )}
              
              {logs.length > 0 && (
                <>
                  {logs.slice(-12).map((log, i) => {
                    const msg = typeof log === 'string' ? log : (log.message ?? '');
                    const isOk  = /geocod|complet|done|mapped|valid|ok|cache/i.test(msg);
                    const isErr = /error|fail|skip/i.test(msg);
                    return (
                      <div key={i} className="flex items-start gap-1 min-w-0">
                        <span className={cn(
                          'shrink-0 mt-[1px]',
                          isOk ? 'text-emerald-400' : isErr ? 'text-rose-400' : 'text-slate-300',
                        )}>
                          {isOk
                            ? <Check size={7} />
                            : isErr
                              ? <AlertCircle size={7} />
                              : <span className="block w-1 h-1 rounded-full bg-slate-300 mt-1" />}
                        </span>
                        <span className="text-[7.5px] text-slate-500 leading-tight truncate">{msg}</span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </>
              )}
            </div>
          ) : (
            <div className="px-2 pt-1.5 pb-1 space-y-[3px]">
              {stats.slice(0, 4).map((s, i) => (
                <StatRow key={i} {...s} />
              ))}
              {canNav && (
                <div
                  className="w-full mt-1 pt-1 flex items-center justify-center gap-0.5 text-[7.5px] font-bold border-t transition-colors group-hover:opacity-70 group-hover:underline"
                  style={{ color: nodeDef.color, borderTopColor: c.div }}
                >
                  View output <ChevronRight size={7} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Edge path ────────────────────────────────────────────────────────────────
function EdgePath({ d, sourceStatus, targetStatus }) {
  const srcDone   = sourceStatus === 'done';
  const tgtDone   = targetStatus === 'done';
  const running   = srcDone && targetStatus === 'running';
  const fullyDone = srcDone && tgtDone;
  const stroke    = fullyDone ? '#10b981' : running ? '#fb923c' : '#94a3b8';

  return (
    <path
      d={d}
      stroke={stroke}
      strokeWidth={fullyDone || running ? 2 : 1.5}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={running ? '6 4' : undefined}
      className={running ? 'animate-flow-dash' : undefined}
      opacity={fullyDone ? 0.9 : running ? 0.75 : 0.55}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
const BASE_W = 1300;
const BASE_H = 205;

export default function AgentGraph({
  activeId, agentStates = {}, stepStatus = {}, onNodeClick,
  currentPipelineStep = 0, isGeocodeDone = false,
}) {
  const geocodeResult     = usePipelineStore(s => s.geocodeResult);
  const uploadMeta        = usePipelineStore(s => s.uploadMeta);
  const selectedAgents    = usePipelineStore(s => s.selectedAgents);
  const epPolicyFile      = usePipelineStore(s => s.epPolicyFile);
  const epFrequencyConfig = usePipelineStore(s => s.epFrequencyConfig);

  // Compute how many UW modules are selected
  const uwKeys = ['cope', 'hazards', 'geospatial', 'objAnalysis', 'riskModel', 'propensity'];
  const uwSelectedCount = uwKeys.filter(k => selectedAgents[k]).length;
  const uwSelected = uwSelectedCount > 0;

  const [isLiveMode, setIsLiveMode] = useState(false);

  // Map node IDs to selectedAgents keys
  const isNodeDeselected = (nodeId) => {
    // upload + geocode (Data Agent) are always active
    if (nodeId === 'upload' || nodeId === 'geocode') return false;
    // SOV COPE group
    if (['catMap', 'catNorm', 'catOut'].includes(nodeId)) return !selectedAgents.sovCope;
    // EP Curve nodes — always visible when sovCope is selected
    if (EP_NODE_IDS.has(nodeId)) return !selectedAgents.sovCope;
    // UW agents map directly
    if (selectedAgents[nodeId] !== undefined) return !selectedAgents[nodeId];
    return false;
  };

  const getStatus = (nodeDef) => {
    // 1. Core pipeline steps should prioritize the stepStatus (updated by HTTP response)
    if (nodeDef.id === 'upload')  return activeId ? 'done' : 'running';
    if (nodeDef.id === 'geocode') {
      if (stepStatus.geocode && stepStatus.geocode !== 'idle') return stepStatus.geocode;
    }
    if (nodeDef.id === 'catMap') {
      if (stepStatus.mapCodes && stepStatus.mapCodes !== 'idle') return stepStatus.mapCodes;
    }
    if (nodeDef.id === 'catNorm') {
      if (stepStatus.normalizeValues && stepStatus.normalizeValues !== 'idle') return stepStatus.normalizeValues;
    }
    if (nodeDef.id === 'catOut')  return currentPipelineStep >= 9 ? 'done' : 'pending';

    // EP Curve sub-agent statuses
    if (nodeDef.id === 'epLocation' || nodeDef.id === 'epAccount') {
      return currentPipelineStep >= 9 ? 'done' : 'pending';
    }
    if (nodeDef.id === 'epPeril') {
      if (stepStatus.epHazard && stepStatus.epHazard !== 'idle') return stepStatus.epHazard;
      return 'pending';
    }
    if (nodeDef.id === 'epPolicy') {
      return epPolicyFile?.row_count ? 'done' : 'pending';
    }
    if (nodeDef.id === 'epFrequency') {
      return epFrequencyConfig?.num_simulations ? 'done' : 'pending';
    }
    if (nodeDef.id === 'epCurve') {
      if (stepStatus.epCurve && stepStatus.epCurve !== 'idle') return stepStatus.epCurve;
      return 'pending';
    }

    // 2. Fallback to SSE status for asynchronous agents or when stepStatus isn't yet set
    const sse = agentStates[nodeDef.agentKey]?.status;
    if (sse === 'completed') return 'done';
    if (sse)                  return sse;
    
    return 'pending';
  };

  // Dynamic Layout Computation
  const layout = useMemo(() => {
    // Check which agent sections actively need stretching
    const isCatStretched = isLiveMode && NODE_DEFS.some(n => 
      ['catMap', 'catNorm', 'catOut'].includes(n.id) && 
      (getStatus(n) === 'running' || getStatus(n) === 'done')
    );

    const isUwStretched = isLiveMode && NODE_DEFS.some(n => 
      ['cope', 'hazards', 'geospatial', 'objAnalysis', 'riskModel', 'propensity'].includes(n.id) && 
      (getStatus(n) === 'running' || getStatus(n) === 'done')
    );

    const anyStretched = isCatStretched || isUwStretched;
    
    // Horizontal Geometry
    const WX = 320; // shifted left by 50px to reduce gap to data agent
    const NX = 360;
    const NX2 = 540; // 180px spacing instead of 160px
    const NX3 = 720; 
    const NX4 = anyStretched ? 950 : 1040;

    // CAT Geometry
    const catH = isCatStretched ? 180 : 55;
    const catTop = isCatStretched ? 0 : -3;
    const catNodeTop = isCatStretched ? 20 : 12;

    // Underwriting Geometry
    const uwTop = catTop + catH + 20; // halved gap between agent wrappers
    // 4 rows: cope / hazards / geospatial / objAnalysis (4th row below parallel trio)
    const uw_ry_cope    = isUwStretched ? 25  :  8;
    const uw_ry_hazards = isUwStretched ? 185 : 50;   // 42px gap (node NH=34 + 8px breathing room)
    const uw_ry_geo     = isUwStretched ? 345 : 92;   // 42px gap
    const uw_ry_obj     = isUwStretched ? 505 : 134;  // 42px gap
    const uwH = isUwStretched ? 660 : 175; // compact: 4 rows × 42px + 8 top/bottom padding

    // Risk/Propensity — vertically centred across all 4 rows
    const uw_ry_risk    = isUwStretched ? 220 : 62;  // midpoint of rows

    // Data Phase Geometry — vertically centre between CAT top and UW bottom
    const lowestY = uwTop + uw_ry_obj;
    const dataY = Math.round((catNodeTop + lowestY) / 2);

    // EP Curve Geometry — new column to the right
    const epNW = 120;
    const epNH = 28;
    const epWX  = NX3 + 250;   // wrapper left (pushed right to double gap to UW)
    const epNX  = epWX + 10;   // sub-agent nodes left
    const epNX2 = epNX + 144;  // convergence node left (reduced horizontal margin)
    const epTop = catTop + 20; // push down below header row
    const epRowGap = 32;       // tighter vertical gap for shorter nodes
    const epH   = epRowGap * 4 + epNH + 20; // 10px top/bottom padding

    return {
      BASE_H: Math.max(uwTop + uwH + 25, epTop + epH + 25),
      nodes: {
        upload:      { left: 0,    top: dataY },
        geocode:     { left: 170,  top: dataY },

        catMap:      { left: NX,   top: catNodeTop },
        catNorm:     { left: NX2,  top: catNodeTop },
        catOut:      { left: NX3,  top: catNodeTop },

        // 3 parallel UW agents (rows 1–3)
        cope:        { left: NX,   top: uwTop + uw_ry_cope },
        hazards:     { left: NX,   top: uwTop + uw_ry_hazards },
        geospatial:  { left: NX,   top: uwTop + uw_ry_geo },
        // Object Detection — 4th row, same X as cope/hazards/geospatial
        objAnalysis: { left: NX,   top: uwTop + uw_ry_obj },

        riskModel:   { left: NX2,  top: uwTop + uw_ry_risk },
        propensity:  { left: NX3,  top: uwTop + uw_ry_risk },

        // EP Curve sub-agents (vertical stack)
        epLocation:  { left: epNX, top: epTop + 10 },
        epPeril:     { left: epNX, top: epTop + 10 + epRowGap },
        epAccount:   { left: epNX, top: epTop + 10 + epRowGap * 2 },
        epPolicy:    { left: epNX, top: epTop + 10 + epRowGap * 3 },
        epFrequency: { left: epNX, top: epTop + 10 + epRowGap * 4 },
        epCurve:     { left: epNX2, top: epTop + 10 + epRowGap * 2 }, // vertically centred
      },
      wrappers: {
        cat:          { left: WX, width: 576, top: catTop, height: catH },
        underwriting: { left: WX, width: 576, top: uwTop, height: uwH },
        epCurve:      { left: epWX, width: 274, top: epTop, height: epH },
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentStates, stepStatus, activeId, currentPipelineStep, isLiveMode]);


  // Compute dynamic container height
  const containerH = useMemo(() => {
    let maxBottom = layout.BASE_H;
    if (isLiveMode) {
      for (const nodeDef of NODE_DEFS) {
        const st = getStatus(nodeDef);
        const pos = layout.nodes[nodeDef.id];
        if (st === 'done' || st === 'running') {
          const expH = st === 'running' ? EXP_RUNNING_H : EXP_DONE_H;
          const bottom = pos.top + expH + 8;
          if (bottom > maxBottom) maxBottom = bottom;
        }
      }
    }
    return Math.max(maxBottom, layout.BASE_H);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentStates, stepStatus, isLiveMode, activeId]);

  const handleToggle = () => setIsLiveMode(v => !v);

  const edgeData = useMemo(() =>
    EDGES.map(e => {
      const fromDef = NODE_DEFS.find(n => n.id === e.from);
      const toDef   = NODE_DEFS.find(n => n.id === e.to);
      return {
        ...e,
        path:         makePath(fromDef, toDef, layout.nodes[e.from], layout.nodes[e.to]),
        sourceStatus: getStatus(fromDef),
        targetStatus: getStatus(toDef),
      };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [agentStates, stepStatus, isLiveMode, activeId, layout]);

  const effectiveIsGeocodeDone = isGeocodeDone;

  return (
    <div className="w-full flex flex-col">

      {/* ── Internal header row: AGENT NETWORK label + Live Mode toggle ── */}
      <div className="flex items-center gap-2 mb-1.5 px-0.5">
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40')} />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Agent Network</span>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <div
            onClick={handleToggle}
            className={cn(
              'w-9 h-5 rounded-full border-2 relative flex items-center transition-all duration-300',
              isLiveMode ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-200 border-slate-300',
            )}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute transition-transform duration-300',
              isLiveMode ? 'translate-x-[18px]' : 'translate-x-[1px]',
            )} />
          </div>
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wide transition-colors',
            isLiveMode ? 'text-emerald-600' : 'text-slate-400',
          )}>
            Live Mode
          </span>
        </label>
      </div>

      {/* ── Graph ── */}
      <div
        className="relative overflow-visible shrink-0 self-center transition-[height] duration-500 ease-in-out"
        style={{ width: BASE_W, height: containerH }}
      >
        {/* CAT Agent wrapper */}
        <div
          className={cn('absolute border border-dashed rounded-2xl transition-all duration-500 ease-in-out',
            effectiveIsGeocodeDone ? 'border-violet-400/50 bg-violet-50/20' : 'border-slate-300 bg-slate-50/20 grayscale opacity-70')}
          style={{ left: layout.wrappers.cat.left, top: layout.wrappers.cat.top, width: layout.wrappers.cat.width, height: layout.wrappers.cat.height, zIndex: 0 }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
            <div className={cn('text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ring-4 ring-[#f9fafb]',
              effectiveIsGeocodeDone ? 'text-violet-700 border-violet-200 bg-white' : 'text-slate-500 border-slate-200 bg-slate-50')}>
              2.SOV COPE CI/CD MODELING
            </div>
          </div>
          <div className="absolute top-0 right-4 -translate-y-1/2 z-20 pointer-events-auto">
            {selectedAgents.sovCope ? (
              <div className={cn('flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full shadow-sm border ring-4 ring-[#f9fafb] transition-all',
                currentPipelineStep >= 5
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                  : effectiveIsGeocodeDone
                    ? 'bg-violet-50 text-violet-600 border-violet-300 animate-pulse'
                    : 'bg-slate-100 text-slate-500 border-slate-300')}>
                {currentPipelineStep >= 5 ? <Check size={10} /> : <Loader2 size={10} className={effectiveIsGeocodeDone ? 'animate-spin' : ''} />}
                <span>{currentPipelineStep >= 9 ? 'Complete' : currentPipelineStep >= 5 ? 'Running' : effectiveIsGeocodeDone ? 'Queued' : 'Selected'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full shadow-sm border bg-slate-100 text-slate-400 border-slate-300 ring-4 ring-[#f9fafb]">
                <span>Not Selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Underwriting Agent wrapper */}
        <div
          className={cn('absolute border border-dashed rounded-2xl transition-all duration-500 ease-in-out',
            effectiveIsGeocodeDone ? 'border-blue-400/50 bg-blue-50/10' : 'border-slate-300 bg-slate-50/20 grayscale opacity-70')}
          style={{ left: layout.wrappers.underwriting.left, top: layout.wrappers.underwriting.top, width: layout.wrappers.underwriting.width, height: layout.wrappers.underwriting.height, zIndex: 0 }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
            <div className={cn('text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ring-4 ring-[#f9fafb]',
              effectiveIsGeocodeDone ? 'text-blue-600 border-blue-200 bg-white' : 'text-slate-500 border-slate-200 bg-slate-50')}>
              UNDERWRITING AGENT
            </div>
          </div>
          <div className="absolute top-0 right-4 -translate-y-1/2 z-20 pointer-events-auto">
            {uwSelected ? (
              <div className={cn('flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full shadow-sm border ring-4 ring-[#f9fafb]',
                'bg-blue-50 text-blue-600 border-blue-300')}>
                <span>{uwSelectedCount} Module{uwSelectedCount !== 1 ? 's' : ''} Queued</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full shadow-sm border bg-slate-100 text-slate-400 border-slate-300 ring-4 ring-[#f9fafb]">
                <span>Not Selected</span>
              </div>
            )}
          </div>
        </div>

        {/* EP Curve Generation wrapper */}
        {selectedAgents.sovCope && (
          <div
            className={cn('absolute border border-dashed rounded-2xl transition-all duration-500 ease-in-out',
              currentPipelineStep >= 9 ? 'border-purple-400/50 bg-purple-50/15' : 'border-slate-300 bg-slate-50/20 grayscale opacity-70')}
            style={{ left: layout.wrappers.epCurve.left, top: layout.wrappers.epCurve.top, width: layout.wrappers.epCurve.width, height: layout.wrappers.epCurve.height, zIndex: 0 }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
              <div className={cn('text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ring-4 ring-[#f9fafb]',
                currentPipelineStep >= 9 ? 'text-purple-700 border-purple-200 bg-white' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                3. EP CURVE
              </div>
            </div>
            <div className="absolute top-0 right-4 -translate-y-1/2 z-20 pointer-events-auto">
              <div className={cn('flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full shadow-sm border ring-4 ring-[#f9fafb]',
                currentPipelineStep >= 9 ? 'bg-purple-50 text-purple-600 border-purple-300' : 'bg-slate-100 text-slate-400 border-slate-300')}>
                <span>{currentPipelineStep >= 9 ? 'Ready' : 'Waiting'}</span>
              </div>
            </div>
          </div>
        )}

        {/* SVG edges */}
        <svg width={BASE_W} height={containerH} className="absolute inset-0 pointer-events-none transition-all duration-500" style={{ zIndex: 1 }}>
          <defs>
            <linearGradient id="edge-flow" x1="0%" y1="0%" x2="100%" y2="0%">
               <stop offset="0%" stopColor="#34d399" />
               <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          {edgeData.map((e, i) => (
            <EdgePath key={i} d={e.path} sourceStatus={e.sourceStatus} targetStatus={e.targetStatus} />
          ))}
        </svg>

        {/* Node cards — automatically transition positions spacing based on layout */}
        {NODE_DEFS.map(nodeDef => {
          const st = getStatus(nodeDef);
          const isEpNode = ['epLocation', 'epPeril', 'epAccount', 'epPolicy', 'epFrequency', 'epCurve'].includes(nodeDef.id);
          const isExpanded = isLiveMode && !isEpNode && (st === 'done' || st === 'running');
          const pos = layout.nodes[nodeDef.id];
          const result =
            nodeDef.id === 'geocode' ? geocodeResult :
            nodeDef.id === 'upload'  ? uploadMeta :
            agentStates[nodeDef.agentKey]?.result ?? null;
          const isDeselected = isNodeDeselected(nodeDef.id);
          return (
            <PipelineNode
              key={nodeDef.id}
              nodeDef={nodeDef}
              pos={pos}
              status={st}
              expanded={isExpanded}
              agentState={agentStates[nodeDef.agentKey]}
              result={result}
              onNavigate={onNodeClick}
              currentPipelineStep={currentPipelineStep}
              totalRows={uploadMeta?.row_count}
              compact={isEpNode}
            />
          );
        })}
      </div>
    </div>
  );
}
