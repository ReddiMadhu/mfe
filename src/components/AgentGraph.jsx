import { useMemo, useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet, MapPin, Tag, BarChart3, FileOutput,
  ShieldCheck, CloudRain, Layers, Eye, TrendingUp, Award,
  Loader2, Check, Lock, AlertCircle, Play, Sparkles,
  ChevronRight, CheckCircle, XCircle, Percent, Hash,
  Cpu, Zap, Database, FileText, Building2, Activity,
} from 'lucide-react';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/lib/utils';

// ─── Node dimensions ──────────────────────────────────────────────────────────
const NW  = 136;
/** Same vertical rhythm as EP compact pills (`EP_COMPACT_H`) so all agent labels align */
const NH  = 36;
const NCY = NH / 2;

// Heights for container calculation
const EXP_DONE_H    = 112;
const EXP_RUNNING_H = 116;

// Layout logic is computed dynamically in the component.

const NODE_DEFS = [
  { id: 'upload',      label: 'Upload SOV',            icon: FileSpreadsheet, agentKey: 'upload',          color: '#3b82f6' },
  { id: 'geocode',     label: '1 - Data Agent',         icon: MapPin,          agentKey: 'geocoder',        color: '#0ea5e9' },
  { id: 'catMap',      label: 'Occupancy & Construction Mapping',   icon: Sparkles,             agentKey: 'cat_code_mapper', color: '#8b5cf6' },
  { id: 'cope',        label: '6 - Real time CAT Event Assessment',      icon: ShieldCheck,     agentKey: 'cope_triage',     color: '#f59e0b' },
  { id: 'hazards',     label: '3 - Hazard Assessment',      icon: CloudRain,       agentKey: 'hazard_data',     color: '#ef4444' },
  { id: 'geospatial',  label: '4 - Geospatial Data',        icon: Layers,          agentKey: 'geospatial_data', color: '#10b981' },
  { id: 'catNorm',     label: 'Value Normalization',    icon: Sparkles,       agentKey: 'cat_normalizer',  color: '#f97316' },
  { id: 'objAnalysis', label: '5 - Property Computer Vision',       icon: Eye,             agentKey: 'object_detection',color: '#ec4899' },
  { id: 'catOut',      label: 'Output Formatting',      icon: FileOutput,      agentKey: 'cat_output',      color: '#64748b' },
  { id: 'riskModel',   label: '7 - Property Vulnerability Risk', icon: TrendingUp, agentKey: 'risk_model',      color: '#4f46e5' },
  { id: 'propensity',  label: '8 - Quote Propensity',       icon: Award,           agentKey: 'quote_propensity',color: '#f43f5e' },
  // ── Pre-EP Curve Modeling sub-agents ──
  { id: 'epLocation',  label: 'Exposure & Geography',   icon: MapPin,    agentKey: 'ep_location',  color: '#10b981', epSource: 'sov'    },
  { id: 'epPolicy',    label: 'Insurance Terms',        icon: Sparkles,  agentKey: 'ep_policy',    color: '#f97316', epSource: 'input'  },
  { id: 'epAccount',   label: 'Portfolio Roll-up',      icon: Building2, agentKey: 'ep_account',   color: '#10b981', epSource: 'sov'    },
  { id: 'epCurve',     label: 'Annual Simulation',        icon: TrendingUp,agentKey: 'ep_curve_out', color: '#7c3aed' },
  { id: 'preEpOutput', label: 'Pre‑EP Modeling Output',   icon: FileOutput, agentKey: 'pre_ep_output', color: '#334155' },
];

const NODE_STEP_MAP = { upload: 1, geocode: 2, catMap: 7, catNorm: 8, catOut: 9, epCurve: 10 };

// EP node IDs for filtering
const EP_NODE_IDS = new Set(['epLocation','epPolicy','epAccount','epCurve','preEpOutput']);

/** Compact pills in Pre‑EP region — larger type + spacing between stacked agents */
const EP_COMPACT_W = 138;
const EP_COMPACT_H = 36;
const EP_ROW_GAP = 48;
const EP_H_GAP = 14;

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
  // Final Output convergence node
  { from: 'catOut',     to: 'epLocation'  },
  { from: 'catOut',     to: 'epAccount'   },
  { from: 'epLocation', to: 'epCurve'     },
  { from: 'epAccount',  to: 'epCurve'     },
  { from: 'epPolicy',   to: 'epCurve'     },
  { from: 'epCurve',    to: 'preEpOutput' },
];

function makePath(fromDef, toDef, fromPos, toPos) {
  const isFromEp = EP_NODE_IDS.has(fromDef.id);
  const isToEp   = EP_NODE_IDS.has(toDef.id);

  const fw = isFromEp ? EP_COMPACT_W : NW;
  const fh = isFromEp ? EP_COMPACT_H : NH;
  const th = isToEp ? EP_COMPACT_H : NH;

  // Exit midpoint on source right edge; enter midpoint on target left edge
  const x1 = fromPos.left + fw;
  const y1 = fromPos.top + fh / 2;
  const x2 = toPos.left;
  const y2 = toPos.top + th / 2;

  const dx = x2 - x1;
  const adx = Math.abs(dx);
  // Smoother bends when EP columns moved farther apart (wider nodes + gaps)
  const cxOffset = Math.max(20, Math.min(80, adx * 0.28));
  const sx = dx >= 0 ? 1 : -1;
  return `M ${x1} ${y1} C ${x1 + sx * cxOffset} ${y1}, ${x2 - sx * cxOffset} ${y2}, ${x2} ${y2}`;
}

// ─── Tiny stat row ────────────────────────────────────────────────────────────
function StatRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between py-[2px]">
      <div className={cn('flex items-center gap-1 min-w-0', color)}>
        <Icon size={8} className="shrink-0" />
        <span className="text-[8px] text-muted-foreground truncate">{label}</span>
      </div>
      <span className={cn(
        'text-[9px] font-bold tabular-nums ml-1 shrink-0',
        value === '—' ? 'text-muted-foreground/50' : 'text-foreground',
      )}>
        {value}
      </span>
    </div>
  );
}

// ─── Real row progress from SSE logs ────────────────────────────────────────
function extractRowProgress(logs = []) {
  // Scan from newest → oldest to find the most recent [current/total] entry
  const re = /^\[(\d+)\/(\d+)\]/;
  for (let i = logs.length - 1; i >= 0; i--) {
    const msg = typeof logs[i] === 'string' ? logs[i] : (logs[i]?.message ?? '');
    const m   = msg.match(re);
    if (m) return { current: parseInt(m[1], 10), total: parseInt(m[2], 10) };
  }
  return null;
}

function NodeLiveProgress({ isRunning, logs = [], totalRows, label }) {
  const progress = extractRowProgress(logs);
  const current  = progress?.current ?? 0;
  const total    = progress?.total   ?? totalRows ?? 0;
  const pct      = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  if (!isRunning) return null;

  return (
    <div className="px-0.5 pt-1 pb-0.5 space-y-1">
      <div className="text-[10px] font-semibold text-primary dark:text-orange-400 tracking-wide leading-snug">
        {label}
      </div>
      {total > 0 ? (
        <>
          <div className="flex justify-between items-center text-[9px] text-muted-foreground mb-0.5">
            <span>{current.toLocaleString()} rows</span>
            <span className="font-mono">{Math.round(pct)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary dark:bg-orange-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <div className="text-[9px] text-muted-foreground animate-pulse">Starting…</div>
      )}
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
      { icon: FileOutput, label: 'Rows Out', value: safe(r?.output_rows), color: 'text-muted-foreground'   },
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

  // ── Pre-EP Curve sub-agent summaries ──
  epLocation: (r) => ({
    headline: 'Location file from SOV.',
    stats: [
      { icon: MapPin,      label: 'Rows',   value: safe(r?.row_count), color: 'text-emerald-500' },
      { icon: CheckCircle, label: 'Source',  value: 'SOV Agent',        color: 'text-emerald-500' },
    ],
  }),
  epPolicy: (r, slipResult) => ({
    headline: slipResult
      ? `Slip coded — ${slipResult.rms_account_file?.length ?? 0} peril rows`
      : r?.row_count ? `${r.row_count} policy rows uploaded.` : 'Policy file required.',
    stats: [
      { icon: FileText,    label: 'Rows',   value: safe(slipResult ? slipResult.rms_account_file?.length : r?.row_count), color: slipResult ? 'text-violet-500' : 'text-orange-500' },
      { icon: AlertCircle, label: 'Status', value: slipResult ? 'Slip Coded' : r?.row_count ? 'Uploaded' : 'Required', color: (slipResult || r?.row_count) ? 'text-emerald-500' : 'text-orange-500' },
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
  epCurve: (r) => ({
    headline: r?.status === 'complete' ? 'Annual Simulation ready.' : 'Waiting for inputs.',
    stats: [
      { icon: TrendingUp,  label: 'OEP',  value: safe(r?.oep_count), color: 'text-violet-500' },
      { icon: TrendingUp,  label: 'AEP',  value: safe(r?.aep_count), color: 'text-purple-500' },
    ],
  }),
};

/** Inline node surfaces — light uses soft pastels; dark uses muted fills (no neon ring). */
const NODE_STATUS_STYLES = {
  light: {
    pending: { bg: '#e2e8fc', border: '0.5px solid #e2e8f0', text: '#64748b', div: '#e2e8f0' },
    running: { bg: '#ecfdf5', border: '1.5px solid #6ee7b7', text: '#0f172a', div: '#d1fae5' },
    done:    { bg: '#fff7ed', border: '1.5px solid #fb923c', text: '#0f172a', div: '#fed7aa' },
    error:   { bg: '#fff1f2', border: '1px solid #fca5a5', text: '#0f172a', div: '#fee2e2' },
    locked:  { bg: '#f8fafc', border: '0.5px solid #e2e8f0', text: '#94a3b8', div: '#e2e8f0' },
  },
  dark: {
    pending: { bg: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.22)', text: '#e2e8f0', div: 'rgba(148,163,184,0.22)' },
    running: { bg: 'rgba(6,78,59,0.45)', border: '1px solid rgba(45,212,191,0.35)', text: '#ecfdf5', div: 'rgba(45,212,191,0.18)' },
    done:    { bg: 'rgba(120,53,15,0.35)', border: '1px solid rgba(251,146,60,0.4)', text: '#ffedd5', div: 'rgba(251,146,60,0.2)' },
    error:   { bg: 'rgba(127,29,29,0.4)', border: '1px solid rgba(248,113,113,0.45)', text: '#fecaca', div: 'rgba(248,113,113,0.22)' },
    locked:  { bg: 'rgba(51,65,85,0.35)', border: '1px solid rgba(71,85,105,0.45)', text: '#94a3b8', div: 'rgba(71,85,105,0.28)' },
  },
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
  compact = false,
  isDeselected = false,
}) {
  const nodeWidth = compact ? EP_COMPACT_W : NW;
  const nodeHeight = compact ? EP_COMPACT_H : NH;
  const Icon = nodeDef.icon;
  const logsEndRef = useRef(null);
  const logs = agentState?.thinkingLog ?? [];
  const isDark = useThemeStore((s) => s.resolved === 'dark');

  useEffect(() => {
    if (status === 'running') logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length, status]);

  const { slipCodingResult } = usePipelineStore();
  const summaryBuilder = NODE_SUMMARY[nodeDef.id];
  const { headline, stats } = summaryBuilder
    ? summaryBuilder(result, slipCodingResult)
    : { headline: `${nodeDef.label} complete.`, stats: [] };

  const nodeStep = NODE_STEP_MAP[nodeDef.id];
  const canNav   = nodeStep != null && nodeStep <= (currentPipelineStep ?? 0);

  const palette = isDark ? NODE_STATUS_STYLES.dark : NODE_STATUS_STYLES.light;
  const base = palette[status] || palette.pending;
  const iconC =
    status === 'locked'
      ? base.text
      : isDark
        ? nodeDef.color
        : nodeDef.color + '80';
  const c0 = { ...base, iconC };
  /** Configure-disabled agents: neutral zinc / muted — no status tint */
  const c = isDeselected
    ? {
        bg: isDark ? 'rgba(39,39,42,0.5)' : '#f4f4f5',
        border: isDark ? '1px solid rgba(63,63,70,0.55)' : '1px solid #e4e4e7',
        text: isDark ? '#a1a1aa' : '#52525b',
        iconC: isDark ? '#a1a1aa' : '#71717a',
        div: isDark ? 'rgba(63,63,70,0.45)' : '#d4d4d8',
      }
    : c0;

  const showStatusChrome = !isDeselected;

  return (
    <div
      onClick={() => { if (compact) { onNavigate?.(nodeDef.id); } else if (canNav) { onNavigate(nodeStep); } }}
      className={cn("absolute overflow-hidden flex flex-col group", (canNav || compact) ? "cursor-pointer" : "cursor-default")}
      style={{
        left:         pos.left,
        top:          pos.top,
        width:        nodeWidth,
        borderRadius: expanded ? 10 : 9999,
        background:   c.bg,
        border:       c.border,
        boxShadow:    isDeselected
          ? isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)'
          : status === 'running'
            ? isDark
              ? '0 1px 10px rgba(45,212,191,0.22)'
              : '0 4px 14px rgba(16,185,129,0.22)'
            : status === 'done'
              ? isDark
                ? '0 1px 8px rgba(251,146,60,0.18)'
                : '0 2px 10px rgba(249,115,22,0.2)'
              : isDark
                ? '0 1px 4px rgba(0,0,0,0.4)'
                : '0 1px 3px rgba(0,0,0,0.05)',
        zIndex:       10,
        transition:   'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── pill header row ── */}
      <div className={cn("flex items-center shrink-0", compact ? "gap-1 px-1.5" : "gap-1.5 px-2")} style={{ height: nodeHeight, minHeight: nodeHeight }}>
        <div
          className={cn("rounded-full flex items-center justify-center shrink-0 bg-card/60", compact ? "w-5 h-5 min-w-5" : "w-6 h-6 min-w-6")}
          style={{ color: c.iconC }}
        >
          {isDeselected ? (
            <Icon size={compact ? 12 : 14} className="opacity-80" />
          ) : status === 'running' ? <Loader2 size={compact ? 12 : 14} className="animate-spin text-emerald-500" /> :
           status === 'done'    ? <Check    size={compact ? 12 : 14} className="text-amber-600" /> :
           status === 'error'   ? <AlertCircle size={compact ? 12 : 14} /> :
           status === 'locked'  ? <Lock     size={compact ? 12 : 14} /> :
           <Icon size={compact ? 12 : 14} />}
        </div>
        <div
          className={cn(
            'graph-node-label whitespace-normal leading-snug flex-1 line-clamp-2 pr-0.5 text-[10px]',
            // Dark: slightly lighter weight than region titles so headings read as structure, nodes as content
            isDark ? 'font-medium' : 'font-semibold',
          )}
          style={{ color: c.text }}
          title={nodeDef.label}
        >
          {nodeDef.label}
        </div>
        {status === 'running' && showStatusChrome && (
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shrink-0 mr-0.5 shadow-[0_0_5px_rgba(16,185,129,0.6)]" />
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
                <NodeLiveProgress
                  isRunning={true}
                  logs={logs}
                  totalRows={totalRows}
                  label="Geocoding & Normalizing addresses"
                />
              )}
              {nodeDef.id === 'catMap' && (
                <NodeLiveProgress
                  isRunning={true}
                  logs={logs}
                  totalRows={totalRows}
                  label="Mapping CAT codes"
                />
              )}
              {nodeDef.id === 'catNorm' && (
                <NodeLiveProgress
                  isRunning={true}
                  logs={logs}
                  totalRows={totalRows}
                  label="Normalizing values"
                />
              )}
              
              {logs.length === 0 && !['geocode', 'catMap', 'catNorm'].includes(nodeDef.id) && (
                <div className="text-[9px] text-muted-foreground italic animate-pulse px-0.5 pt-0.5">Starting agent…</div>
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
                          isOk ? 'text-emerald-400' : isErr ? 'text-rose-400' : 'text-muted-foreground/50',
                        )}>
                          {isOk
                            ? <Check size={7} />
                            : isErr
                              ? <AlertCircle size={7} />
                              : <span className="block w-1 h-1 rounded-full bg-muted-foreground/40 mt-1" />}
                        </span>
                        <span className="text-[9px] text-muted-foreground leading-snug truncate">{msg}</span>
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
                  className="w-full mt-1 pt-1 flex items-center justify-center gap-0.5 text-[9px] font-bold border-t transition-colors group-hover:opacity-70 group-hover:underline"
                  style={{ color: isDeselected ? c.text : nodeDef.color, borderTopColor: c.div }}
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
  const isDark = useThemeStore((s) => s.resolved === 'dark');
  const srcDone   = sourceStatus === 'done';
  const tgtDone   = targetStatus === 'done';
  const running   = srcDone && targetStatus === 'running';
  const fullyDone = srcDone && tgtDone;
  const strokeMuted = isDark ? 'rgba(148,163,184,0.35)' : '#94a3b8';
  const strokeActive = '#fb923c';
  const strokeRun = '#f97316';
  const stroke = fullyDone ? strokeActive : running ? strokeRun : strokeMuted;

  return (
    <path
      d={d}
      stroke={stroke}
      strokeWidth={fullyDone ? 2.25 : running ? 2 : 1.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={running ? '7 5' : undefined}
      className={running ? 'animate-flow-dash' : undefined}
      opacity={fullyDone ? 0.95 : running ? 0.88 : 0.62}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
const BASE_W = 1360;
const BASE_H = 205;

/** Vertical gap (px) between SOV COPE and Underwriting dashed shells — ~12px tighter top bar inset + original region spacing */
const REGION_VERTICAL_GAP = 24;

export default function AgentGraph({
  activeId, agentStates = {}, stepStatus = {}, onNodeClick,
  currentPipelineStep = 0, isGeocodeDone = false,
  onEpNodeClick,
}) {
  const geocodeResult     = usePipelineStore(s => s.geocodeResult);
  const uploadMeta        = usePipelineStore(s => s.uploadMeta);
  const selectedAgents    = usePipelineStore(s => s.selectedAgents);
  const epPolicyFile      = usePipelineStore(s => s.epPolicyFile);
  const slipCodingResult  = usePipelineStore(s => s.slipCodingResult);
  const slipCodingStatus  = usePipelineStore(s => s.slipCodingStatus);

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
    // Pre-EP Curve nodes — always visible when sovCope is selected
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

    if (nodeDef.id === 'epPolicy') {
      if (slipCodingResult) return 'done';
      if (slipCodingStatus === 'running') return 'running';
      if (epPolicyFile?.row_count) return 'done';
      return 'pending';
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

    // CAT Geometry — compact wrapper must clear NH (36) + breathing room above bottom dashed edge
    const CAT_WRAPPER_H_COMPACT = 74;
    const catH = isCatStretched ? 180 : CAT_WRAPPER_H_COMPACT;
    const catTop = isCatStretched ? 0 : -3;
    const catNodeTop = isCatStretched ? 20 : 12;

    // Underwriting Geometry — spacing below SOV COPE wrapper matches page top bar → Agent Network gap
    const uwTop = catTop + catH + REGION_VERTICAL_GAP;
    // 4 rows: cope / hazards / geospatial / objAnalysis (4th row below parallel trio)
    const uw_ry_cope    = isUwStretched ? 25  :  8;
    const uw_ry_hazards = isUwStretched ? 185 : 50;   // ~42px gap between stacked UW rows
    const uw_ry_geo     = isUwStretched ? 345 : 92;   // 42px gap
    const uw_ry_obj     = isUwStretched ? 505 : 134;  // 42px gap
    const uwH = isUwStretched ? 660 : 175; // compact: 4 rows × 42px + 8 top/bottom padding

    // Risk/Propensity — vertically centred across all 4 rows
    const uw_ry_risk    = isUwStretched ? 220 : 62;  // midpoint of rows

    // Data Phase Geometry — vertically centre between CAT top and UW bottom
    const lowestY = uwTop + uw_ry_obj;
    const dataY = Math.round((catNodeTop + lowestY) / 2);

    // Pre-EP Curve Geometry — keep within BASE_W
    const epWX  = NX3 + 180;   // wrapper left
    const epNX  = epWX + 10;   // sub-agent nodes left
    const epNX2 = epNX + EP_COMPACT_W + EP_H_GAP;   // convergence node (Annual Simulation)
    const epNX3 = epNX2 + EP_COMPACT_W + EP_H_GAP; // Pre‑EP output
    const epTop = catTop + 20; // push down below header row
    const epRowGap = EP_ROW_GAP; // vertical gap between Exposure / Portfolio / Insurance Terms stack
    const epH   = 10 + epRowGap * 2 + EP_COMPACT_H + 18; // fits 3 stacked compact nodes + padding

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

        epLocation:  { left: epNX, top: epTop + 10 },
        epAccount:   { left: epNX, top: epTop + 10 + epRowGap },
        epPolicy:    { left: epNX, top: epTop + 10 + epRowGap * 2 },
        epCurve:     { left: epNX2, top: epTop + 10 + epRowGap }, // final output convergence
        preEpOutput: { left: epNX3, top: epTop + 10 + epRowGap }, // post-simulation output
      },
      wrappers: {
        cat:          { left: WX, width: 576, top: catTop, height: catH },
        underwriting: { left: WX, width: 576, top: uwTop, height: uwH },
        epCurve:      { left: epWX, width: Math.round(epNX3 + EP_COMPACT_W + 14 - epWX), top: epTop, height: epH },
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

  /** Region badge — neutral (module off / default, no accent scheme) */
  const rtNeutral =
    'tracking-[0.16em] ring-1 ring-border/60 text-muted-foreground border-border bg-muted/90 dark:bg-muted/35 dark:border-border dark:text-muted-foreground';
  const rtBase =
    'graph-region-title text-[11px] leading-tight font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-sm';

  /** Matches Pipeline agent-network canvas — paints over dashed border where headings cross */
  const dashedBorderNotchBg = 'bg-card dark:bg-background';

  return (
    <div className="w-full flex flex-col">

      {/* ── Internal header row: AGENT NETWORK label + Live Mode toggle ── */}
      <div className="flex items-center gap-2 mb-1.5 px-0.5">
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40')} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-zinc-400">
          Agent Network
        </span>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <div
            onClick={handleToggle}
            className={cn(
              'w-9 h-5 rounded-full border-2 relative flex items-center transition-all duration-300',
              isLiveMode
                ? 'bg-emerald-600 border-emerald-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]'
                : 'bg-zinc-500/45 dark:bg-zinc-600 border-zinc-400/55 dark:border-zinc-500/80 shadow-inner',
            )}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded-full bg-card border border-white/30 shadow-sm absolute transition-transform duration-300',
              isLiveMode ? 'translate-x-[18px]' : 'translate-x-[1px]',
            )} />
          </div>
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wide transition-colors',
            isLiveMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground/70',
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
        {/* CAT Agent wrapper — dashed frame must read in light + dark */}
        <div
          className={cn(
            'absolute rounded-2xl border border-dashed transition-all duration-500 ease-in-out',
            effectiveIsGeocodeDone
              ? 'border-violet-400/40 dark:border-violet-500/30 bg-violet-500/[0.05] dark:bg-violet-950/20'
              : 'border-foreground/12 dark:border-zinc-600/40 bg-muted/10 dark:bg-zinc-900/25',
          )}
          style={{ left: layout.wrappers.cat.left, top: layout.wrappers.cat.top, width: layout.wrappers.cat.width, height: layout.wrappers.cat.height, zIndex: 0 }}
        >
          <div
            className={cn(
              'pointer-events-none absolute left-1/2 top-0 z-[5] -translate-x-1/2 -translate-y-px h-[4px] w-[min(420px,88%)]',
              dashedBorderNotchBg,
            )}
            aria-hidden
          />
          <div
            className={cn(
              'pointer-events-none absolute right-2 top-0 z-[5] h-[4px] w-[120px] -translate-y-px sm:right-3 sm:w-[140px]',
              dashedBorderNotchBg,
            )}
            aria-hidden
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
            <div
              className={cn(
                rtBase,
                selectedAgents.sovCope
                  ? cn(
                      'tracking-[0.16em] ring-1 ring-background/80',
                      effectiveIsGeocodeDone
                        ? 'text-primary border-primary/45 bg-primary/10 dark:bg-primary/20 dark:border-primary/55 dark:text-primary dark:shadow-[0_0_0_1px_rgba(251,78,11,0.18)]'
                        : 'text-primary border-primary/35 bg-primary/8 dark:bg-primary/18 dark:border-primary/45 dark:text-primary',
                    )
                  : rtNeutral,
              )}
            >
              2.SOV COPE CI/CD MULTI AGENT
            </div>
          </div>
          <div className="absolute top-0 right-4 -translate-y-1/2 z-30 pointer-events-auto">
            {selectedAgents.sovCope ? (
              <div className={cn('flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full shadow-sm border ring-1 ring-background/80 transition-all',
                currentPipelineStep >= 5
                  ? 'bg-emerald-500/15 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600/50'
                  : effectiveIsGeocodeDone
                    ? 'bg-violet-500/15 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-600/50 animate-pulse'
                    : 'bg-secondary text-secondary-foreground border-border shadow-sm')}>
                {currentPipelineStep >= 5 ? <Check size={8} strokeWidth={2.5} /> : <Loader2 size={8} strokeWidth={2.5} className={effectiveIsGeocodeDone ? 'animate-spin' : ''} />}
                <span>{currentPipelineStep >= 9 ? 'Complete' : currentPipelineStep >= 5 ? 'Running' : effectiveIsGeocodeDone ? 'Queued' : 'Selected'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full shadow-sm border bg-secondary text-secondary-foreground border-border ring-1 ring-background/90">
                <span>Not Selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Underwriting Agent wrapper */}
        <div
          className={cn(
            'absolute rounded-2xl border border-dashed transition-all duration-500 ease-in-out',
            effectiveIsGeocodeDone
              ? 'border-sky-400/40 dark:border-sky-500/30 bg-sky-500/[0.05] dark:bg-sky-950/22'
              : 'border-foreground/12 dark:border-zinc-600/40 bg-muted/10 dark:bg-zinc-900/25',
          )}
          style={{ left: layout.wrappers.underwriting.left, top: layout.wrappers.underwriting.top, width: layout.wrappers.underwriting.width, height: layout.wrappers.underwriting.height, zIndex: 0 }}
        >
          <div
            className={cn(
              'pointer-events-none absolute left-1/2 top-0 z-[5] -translate-x-1/2 -translate-y-px h-[4px] w-[min(320px,82%)]',
              dashedBorderNotchBg,
            )}
            aria-hidden
          />
          <div
            className={cn(
              'pointer-events-none absolute right-2 top-0 z-[5] h-[4px] w-[120px] -translate-y-px sm:right-3 sm:w-[140px]',
              dashedBorderNotchBg,
            )}
            aria-hidden
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
            <div
              className={cn(
                rtBase,
                uwSelected
                  ? cn(
                      'tracking-[0.16em] ring-1 ring-background/80',
                      effectiveIsGeocodeDone
                        ? 'text-sky-900 dark:text-sky-50 border-sky-300/90 dark:border-sky-400/45 bg-card dark:bg-sky-950/55 dark:shadow-[0_0_0_1px_rgba(56,189,248,0.12)]'
                        : 'text-foreground/90 border-border/80 bg-secondary/90 shadow-sm dark:text-sky-50 dark:border-sky-500/40 dark:bg-sky-950/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
                    )
                  : rtNeutral,
              )}
            >
              UNDERWRITING AGENT
            </div>
          </div>
          <div className="absolute top-0 right-4 -translate-y-1/2 z-30 pointer-events-auto">
            {uwSelected ? (
              <div className={cn('flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full shadow-sm border ring-1 ring-background/80',
                'bg-sky-500/15 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-400/70 dark:border-sky-500/50')}>
                <span>{uwSelectedCount} Module{uwSelectedCount !== 1 ? 's' : ''} Queued</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full shadow-sm border bg-secondary text-secondary-foreground border-border ring-1 ring-background/90">
                <span>Not Selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Pre-EP Curve Generation wrapper */}
        {selectedAgents.sovCope && (
          <div
            className={cn(
              'absolute rounded-2xl border border-dashed transition-all duration-500 ease-in-out',
              currentPipelineStep >= 9
                ? 'border-purple-400/40 dark:border-purple-500/30 bg-purple-500/[0.05] dark:bg-purple-950/20'
                : 'border-foreground/12 dark:border-zinc-600/40 bg-muted/10 dark:bg-zinc-900/25',
            )}
            style={{ left: layout.wrappers.epCurve.left, top: layout.wrappers.epCurve.top, width: layout.wrappers.epCurve.width, height: layout.wrappers.epCurve.height, zIndex: 0 }}
          >
            <div
              className={cn(
                'pointer-events-none absolute left-1/2 top-0 z-[5] -translate-x-1/2 -translate-y-px h-[4px] w-[min(380px,92%)]',
                dashedBorderNotchBg,
              )}
              aria-hidden
            />
            <div
              className={cn(
                'pointer-events-none absolute right-2 top-0 z-[5] h-[4px] w-[120px] -translate-y-px sm:right-3 sm:w-[140px]',
                dashedBorderNotchBg,
              )}
              aria-hidden
            />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto max-w-[min(100%,calc(100%-16px))]">
              <div
                className={cn(
                  rtBase,
                  'max-w-[min(100%,320px)] truncate',
                  // Region only renders when SOV COPE is selected — always use primary (idle vs active like SOV COPE heading)
                  currentPipelineStep >= 9
                    ? cn(
                        'tracking-[0.14em] ring-1 ring-background/80',
                        'text-primary border-primary/45 bg-primary/10 dark:bg-primary/20 dark:border-primary/55 dark:text-primary dark:shadow-[0_0_0_1px_rgba(251,78,11,0.18)]',
                      )
                    : cn(
                        'tracking-[0.14em] ring-1 ring-background/80',
                        'text-primary border-primary/35 bg-primary/8 dark:bg-primary/18 dark:border-primary/45 dark:text-primary',
                      ),
                )}
                title="PRE-EP CURVE MODELING"
              >
                PRE-EP CURVE MODELING
              </div>
            </div>
            <div className="absolute top-0 right-4 -translate-y-1/2 z-30 pointer-events-auto">
              <div className={cn('flex items-center justify-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full shadow-sm border ring-1 ring-background/80',
                currentPipelineStep >= 9
                  ? 'bg-primary/12 dark:bg-primary/20 text-primary border-primary/40 dark:border-primary/50'
                  : 'bg-secondary text-secondary-foreground border-border shadow-sm dark:bg-muted dark:border-border')}>
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
          const isEpNode = ['epLocation', 'epAccount', 'epPolicy', 'epCurve', 'preEpOutput'].includes(nodeDef.id);
          const isDeselected = isNodeDeselected(nodeDef.id);
          const isExpanded = isLiveMode && !isEpNode && (st === 'done' || st === 'running') && !isDeselected;
          const pos = layout.nodes[nodeDef.id];
          const result =
            nodeDef.id === 'geocode' ? geocodeResult :
            nodeDef.id === 'upload'  ? uploadMeta :
            agentStates[nodeDef.agentKey]?.result ?? null;
          return (
            <PipelineNode
              key={nodeDef.id}
              nodeDef={nodeDef}
              pos={pos}
              status={st}
              expanded={isExpanded}
              isDeselected={isDeselected}
              agentState={agentStates[nodeDef.agentKey]}
              result={result}
              onNavigate={isEpNode ? () => onEpNodeClick?.(nodeDef.id) : onNodeClick}
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
