import { useMemo, useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet, MapPin, Tag, BarChart3, FileOutput,
  ShieldCheck, CloudRain, Layers, Eye, TrendingUp, Award,
  Loader2, Check, Lock, AlertCircle, Play,
  ChevronRight, CheckCircle, XCircle, Percent, Hash,
  Cpu, Zap, Database,
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
  { id: 'geocode',     label: 'Data Agent',             icon: MapPin,          agentKey: 'geocoder',        color: '#0ea5e9' },
  { id: 'catMap',      label: 'Occ & Const Mapping',   icon: Tag,             agentKey: 'cat_code_mapper', color: '#8b5cf6' },
  { id: 'cope',        label: 'CAT Event Trigger',      icon: ShieldCheck,     agentKey: 'cope_triage',     color: '#f59e0b' },
  { id: 'hazards',     label: 'Hazard Assessment',      icon: CloudRain,       agentKey: 'hazard_data',     color: '#ef4444' },
  { id: 'geospatial',  label: 'Geospatial Data',        icon: Layers,          agentKey: 'geospatial_data', color: '#10b981' },
  { id: 'catNorm',     label: 'Value Normalization',    icon: BarChart3,       agentKey: 'cat_normalizer',  color: '#f97316' },
  { id: 'objAnalysis', label: 'Object Detection',       icon: Eye,             agentKey: 'object_detection',color: '#ec4899' },
  { id: 'catOut',      label: 'Output Formatting',      icon: FileOutput,      agentKey: 'cat_output',      color: '#64748b' },
  { id: 'riskModel',   label: 'Property Vulnerability Risk', icon: TrendingUp, agentKey: 'risk_model',      color: '#4f46e5' },
  { id: 'propensity',  label: 'Quote Propensity',       icon: Award,           agentKey: 'quote_propensity',color: '#f43f5e' },
];

const NODE_STEP_MAP = { upload: 1, geocode: 2, catMap: 7, catNorm: 8, catOut: 9 };

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
];

function makePath(fromNode, toNode) {
  const x1 = fromNode.left + NW;
  const y1 = fromNode.top  + NCY;
  const x2 = toNode.left;
  const y2 = toNode.top  + NCY;
  const dx = x2 - x1;
  // A smaller multiplier and clamp ensures the lines fan out quickly rather than forming a single fused "trunk".
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
};

// ─── Unified node card — grows in-place ───────────────────────────────────────
function PipelineNode({ nodeDef, pos, status, agentState, result, onNavigate, currentPipelineStep, expanded }) {
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
    running: { bg: '#ecfdf5', border: '1.5px solid #34d399',  text: '#0f172a', iconC: '#059669',         div: '#a7f3d0' },
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
        width:        NW,
        borderRadius: expanded ? 10 : 9999,
        background:   c.bg,
        border:       c.border,
        boxShadow:    status === 'running'
          ? '0 4px 14px rgba(16,185,129,0.22)'
          : status === 'done'
            ? '0 2px 8px rgba(16,185,129,0.14)'
            : '0 1px 3px rgba(0,0,0,0.05)',
        zIndex:       10,
        transition:   'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── pill header row ── */}
      <div className="flex items-center gap-1.5 px-2 shrink-0" style={{ height: NH, minHeight: NH }}>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/60"
          style={{ color: c.iconC }}
        >
          {status === 'running' ? <Loader2 size={10} className="animate-spin" /> :
           status === 'done'    ? <Check    size={10} /> :
           status === 'error'   ? <AlertCircle size={10} /> :
           status === 'locked'  ? <Lock     size={10} /> :
           <Icon size={10} />}
        </div>
        <div
          className="text-[8px] whitespace-normal leading-tight font-semibold flex-1 line-clamp-2 pr-1"
          style={{ color: c.text }}
        >
          {nodeDef.label}
        </div>
        {status === 'running' && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 mr-0.5" />
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
              {logs.length === 0 ? (
                <div className="text-[8px] text-slate-400 italic animate-pulse px-0.5 pt-0.5">Starting agent…</div>
              ) : (
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
  const stroke    = fullyDone ? '#10b981' : running ? '#34d399' : '#94a3b8';

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
const BASE_W = 1245;
const BASE_H = 205;

export default function AgentGraph({
  activeId, agentStates = {}, stepStatus = {}, onNodeClick,
  currentPipelineStep = 0, isGeocodeDone = false,
  onStartCat, onStartUnderwriting,
}) {
  const geocodeResult = usePipelineStore(s => s.geocodeResult);
  const uploadMeta    = usePipelineStore(s => s.uploadMeta);

  const [isLiveMode, setIsLiveMode] = useState(false);

  const getStatus = (nodeDef) => {
    const sse = agentStates[nodeDef.agentKey]?.status;
    if (sse === 'completed') return 'done';
    if (sse)                  return sse;
    if (nodeDef.id === 'upload')  return activeId ? 'done' : 'running';
    if (nodeDef.id === 'geocode') {
      if (stepStatus.geocode === 'idle') return 'pending';
      return stepStatus.geocode || 'pending';
    }
    if (nodeDef.id === 'catMap')  return stepStatus.mapCodes || 'pending';
    if (nodeDef.id === 'catNorm') return stepStatus.normalizeValues || 'pending';
    if (nodeDef.id === 'catOut')  return currentPipelineStep >= 9 ? 'done' : 'pending';
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
    const WX = anyStretched ? 370 : 540; // shifted left to give 40px padding to nodes
    const NX = anyStretched ? 410 : 560;
    const NX2 = anyStretched ? 590 : 720; // 180px spacing instead of 160px
    const NX3 = anyStretched ? 770 : 880; 
    const NX4 = anyStretched ? 950 : 1040;

    // CAT Geometry
    const catH = isCatStretched ? 180 : 65;
    const catTop = isCatStretched ? 0 : -5;
    const catNodeTop = isCatStretched ? 20 : 15;

    // Underwriting Geometry 
    const uwTop = catTop + catH + 40; // gap between agent wrappers
    // 4 rows: cope / hazards / geospatial / objAnalysis (4th row below parallel trio)
    const uw_ry_cope    = isUwStretched ? 25  : 10;
    const uw_ry_hazards = isUwStretched ? 155 : 40;
    const uw_ry_geo     = isUwStretched ? 285 : 70;
    const uw_ry_obj     = isUwStretched ? 415 : 100; // 4th row
    const uwH = isUwStretched ? 580 : 145; // taller to fit 4th row

    // Risk/Propensity sit beside the middle rows, vertically centred between rows 1–3
    const uw_ry_risk    = isUwStretched ? 195 : 40;

    // Data Phase Geometry — vertically centre between CAT top and UW bottom
    const lowestY = uwTop + uw_ry_obj;
    const dataY = Math.round((catNodeTop + lowestY) / 2);

    return {
      BASE_H: uwTop + uwH + 25,
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
      },
      wrappers: {
        cat:          { left: WX, width: anyStretched ? 576 : 496, top: catTop, height: catH },
        underwriting: { left: WX, width: anyStretched ? 576 : 576, top: uwTop, height: uwH },
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
    EDGES.map(e => ({
      ...e,
      path:         makePath(layout.nodes[e.from], layout.nodes[e.to]),
      sourceStatus: getStatus(NODE_DEFS.find(n => n.id === e.from)),
      targetStatus: getStatus(NODE_DEFS.find(n => n.id === e.to)),
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [agentStates, stepStatus, isLiveMode, activeId]);

  const effectiveIsGeocodeDone = isGeocodeDone;

  return (
    <div className="w-full flex flex-col">

      {/* ── Toggle ── */}
      <div className="flex items-center justify-end mb-2 px-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
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
            LIVE MODE
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
              CAT Agent
            </div>
          </div>
          <div className="absolute top-0 right-4 -translate-y-1/2 z-20 pointer-events-auto">
            <button onClick={onStartCat} disabled={!effectiveIsGeocodeDone}
              className={cn('flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full transition-all shadow-md border ring-4 ring-[#f9fafb]',
                effectiveIsGeocodeDone
                  ? 'bg-violet-600 text-white hover:bg-violet-500 border-violet-500 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed')}>
              <Play size={10} className="fill-current" /><span>Start</span>
            </button>
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
              Underwriting Agent
            </div>
          </div>
          <div className="absolute top-0 right-4 -translate-y-1/2 z-20 pointer-events-auto">
            <button disabled className="flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full shadow-sm border bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed ring-4 ring-[#f9fafb]">
              <Lock size={10} /><span>Coming Soon</span>
            </button>
          </div>
        </div>

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
          const isExpanded = isLiveMode && (st === 'done' || st === 'running');
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
              agentState={agentStates[nodeDef.agentKey]}
              result={result}
              onNavigate={onNodeClick}
              currentPipelineStep={currentPipelineStep}
            />
          );
        })}
      </div>
    </div>
  );
}
