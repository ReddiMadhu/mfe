import { useMemo } from 'react';
import {
  FileSpreadsheet, Table2, MapPin, Globe, Tag, BarChart3, FileOutput,
  ShieldCheck, CloudRain, Layers, Eye, TrendingUp, Award,
  Loader2, Check, Lock, AlertCircle, Play,
} from 'lucide-react';
import { usePipelineStore } from '@/store/usePipelineStore';
import { cn } from '@/lib/utils';

// ─── Node dimensions ─────────────────────────────────────────────────────────
const NW  = 136;   // card width
const NH  = 34;    // card height
const NCX = NW / 2;
const NCY = NH / 2;

// cx(node) = node.left + NCX   cy(node) = node.top + NCY
// right-edge x = node.left + NW
// left-edge  x = node.left
const NODES = [
  { id: 'upload',      label: 'Upload SOV',                icon: FileSpreadsheet, agentKey: 'upload',            left: 0,    top: 85,  locked: false, color: '#3b82f6' },
  { id: 'geocode',     label: 'Data Agent',                icon: MapPin,           agentKey: 'geocoder',          left: 170,  top: 85,  locked: false, color: '#0ea5e9' },

  // ── Parallel col 1 ───────────────────────────────────────────────
  // UPPER SECTION: Cat AI path (separated vertically)
  { id: 'catMap',      label: 'Occupancy and Construction Mapping', icon: Tag,             agentKey: 'cat_code_mapper',   left: 560, top: 15,   locked: false, color: '#8b5cf6' },
  
  // LOWER SECTION: Underwriting agents
  { id: 'cope',        label: 'COPE Triage',               icon: ShieldCheck,     agentKey: 'cope_triage',       left: 560, top: 85, locked: false, color: '#f59e0b' },
  { id: 'hazards',     label: 'Hazard Assessment',         icon: CloudRain,       agentKey: 'hazard_data',       left: 560, top: 120, locked: false, color: '#ef4444' },
  { id: 'geospatial',  label: 'Spatial Indexing',          icon: Layers,          agentKey: 'geospatial_data',   left: 560, top: 155, locked: false, color: '#10b981' },

  // ── Parallel col 2 ───────────────────────────────────────────────
  { id: 'catNorm',     label: 'Value Normalization',       icon: BarChart3,       agentKey: 'cat_normalizer',    left: 720, top: 15,   locked: false, color: '#f97316' },
  { id: 'objAnalysis', label: 'Object Detection',          icon: Eye,             agentKey: 'object_detection',  left: 720, top: 155, locked: false, color: '#ec4899' },

  // ── Parallel col 3 ──────────────────────────────────────────────
  { id: 'catOut',      label: 'Output Formatting',         icon: FileOutput,      agentKey: 'cat_output',        left: 880, top: 15,   locked: false, color: '#64748b' },
  { id: 'riskModel',   label: 'Risk Modeling',             icon: TrendingUp,      agentKey: 'risk_model',        left: 880, top: 120, locked: false, color: '#4f46e5' },

  // ── Final col ───────────────────────────────────────────────────
  { id: 'propensity',  label: 'Quote Propensity',          icon: Award,           agentKey: 'quote_propensity',  left: 1040, top: 120, locked: false, color: '#f43f5e' },
];

// Maps node id → wizard step number (for non-blocking navigation)
const NODE_STEP_MAP = {
  upload:    1,
  geocode:   2,
  catMap:    7,
  catNorm:   8,
  catOut:    9,
};

// ─── Edge definitions ────────────────────────────────────────────────────────
const EDGES = [
  { from: 'upload',      to: 'geocode'   },
  { from: 'geocode',     to: 'catMap'      },
  { from: 'geocode',     to: 'cope'        },
  { from: 'geocode',     to: 'hazards'     },
  { from: 'geocode',     to: 'geospatial'  },
  { from: 'catMap',      to: 'catNorm'     },
  { from: 'catNorm',     to: 'catOut'      },
  { from: 'cope',        to: 'riskModel'   },  // COPE → Risk Model
  { from: 'hazards',     to: 'riskModel'   },
  { from: 'geospatial',  to: 'objAnalysis' },
  { from: 'objAnalysis', to: 'riskModel'   },
  { from: 'riskModel',   to: 'propensity'  },
];

// ─── SVG path computation ────────────────────────────────────────────────────
function makePath(fromNode, toNode) {
  const x1 = fromNode.left + NW;
  const y1 = fromNode.top  + NCY;
  const x2 = toNode.left;
  const y2 = toNode.top  + NCY;
  
  // Calculate dynamic tension based on horizontal gap (use Bezier for all paths to ensure smooth rendering and consistency)
  const dx = x2 - x1;
  const cxOffset = Math.max(12, dx * 0.4); 
  return `M ${x1} ${y1} C ${x1 + cxOffset} ${y1}, ${x2 - cxOffset} ${y2}, ${x2} ${y2}`;
}

// ─── Stats per node ───────────────────────────────────────────────────────────
const NODE_STATS = {
  upload:      (r) => [{ l: 'Rows',    v: r?.total_rows   }, { l: 'Cols',   v: r?.total_cols   }],
  geocode:     (r) => [{ l: 'OK',      v: r?.geocoded     }, { l: 'Failed', v: r?.failed       }],
  catMap:      (r) => [{ l: 'Occ',     v: r?.occ_mapped   }, { l: 'Const',  v: r?.const_mapped }],
  cope:        (r) => [{ l: 'Records', v: r?.records      }, { l: 'Qual',   v: r?.avg_quality  }],
  hazards:     (r) => [{ l: 'Triggers',v: r?.triggers     }, { l: 'Score',  v: r?.avg_score    }],
  geospatial:  (r) => [{ l: 'Points',  v: r?.points       }, { l: 'Cov%',   v: r?.coverage     }],
  catNorm:     (r) => [{ l: "Norm'd",  v: r?.normalized   }, { l: 'Format', v: r?.format       }],
  objAnalysis: (r) => [{ l: 'Objects', v: r?.detected     }, { l: 'Conf',   v: r?.avg_conf     }],
  catOut:      (r) => [{ l: 'Rows',    v: r?.output_rows  }, { l: 'Format', v: r?.format       }],
  riskModel:   (r) => [{ l: 'AvgRisk', v: r?.avg_risk     }, { l: 'High%',  v: r?.high_risk    }],
  propensity:  (r) => [{ l: 'High%',   v: r?.high_tier    }, { l: 'Avg',    v: r?.avg          }],
};

function PipelineNode({ node, status, agentState, extra, onNodeClick, currentPipelineStep }) {
  const Icon = node.icon;
  const rawStatus = status;

  const result = extra ?? agentState?.result;
  const statsBuilder = NODE_STATS[node.id];
  const stats = statsBuilder ? statsBuilder(result) : [];

  const nodeStep = NODE_STEP_MAP[node.id];
  const isClickable = rawStatus === 'done' && onNodeClick && nodeStep && nodeStep <= (currentPipelineStep ?? 0);

  const CFG = {
    pending: { border: 'border-slate-200', icon: 'bg-slate-100 text-slate-400', label: 'text-slate-500', glow: 'none' },
    running: { border: 'border-emerald-500/80', icon: 'bg-emerald-50 text-emerald-500', label: 'text-slate-900', glow: '0 4px 12px rgba(16,185,129,0.25)' },
    done:    { border: 'border-emerald-400', icon: 'bg-emerald-50 text-emerald-600', label: 'text-slate-900', glow: '0 2px 8px rgba(16,185,129,0.15)' },
    error:   { border: 'border-rose-300', icon: 'bg-rose-50 text-rose-600', label: 'text-slate-900', glow: 'none' },
    locked:  { border: 'border-slate-200', icon: 'bg-slate-50 text-slate-400', label: 'text-slate-400', glow: 'none' },
  };
  const c = CFG[rawStatus] || CFG.pending;

  return (
    <div
      onClick={isClickable ? () => onNodeClick(nodeStep) : undefined}
      className={`absolute rounded-full border group flex items-center gap-1.5 px-2 transition-all duration-300 ${c.border} ${node.locked ? 'opacity-50' : ''} ${isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-default'}`}
      style={{
        left: node.left, top: node.top, width: NW, height: NH,
        background: rawStatus === 'done' ? '#ecfdf5' : '#e2e8fc',
        border: rawStatus === 'done' ? '1.5px solid #6ee7b7' : '0.5px solid #e2e8f0',
        boxShadow: c.glow !== 'none' ? c.glow : '0 1px 3px rgba(0,0,0,0.05)',
        zIndex: 10,
      }}
    >
      {/* Icon */}
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/50`} style={{ color: rawStatus === 'done' ? '#059669' : node.color }}>
        {rawStatus === 'running' ? <Loader2 size={10} className="animate-spin" /> :
         rawStatus === 'done'    ? <Check size={10} /> :
         rawStatus === 'error'   ? <AlertCircle size={10} /> :
         <Icon size={10} />}
      </div>

      {/* Label */}
      <div className={`text-[8px] whitespace-normal leading-tight font-semibold flex-1 line-clamp-2 pr-1 ${c.label}`}>
        {node.label}
      </div>

      {/* Hover Dropdown for Stats */}
      {rawStatus === 'done' && stats.length > 0 && (
        <div className="absolute top-[110%] left-1/2 -translate-x-1/2 pt-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-3 min-w-[120px]">
            <div className="text-[10px] font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{node.label} Metrics</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wide text-slate-500">{s.l}</span>
                  <span className={`text-[11px] font-bold tabular-nums leading-tight ${s.v != null ? 'text-slate-800' : 'text-slate-400'}`}>
                    {s.v != null ? s.v : '–'}
                  </span>
                </div>
              ))}
            </div>
            {isClickable && (
              <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-emerald-600 font-semibold text-center">
                Click to view output →
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SVG edge ─────────────────────────────────────────────────────────────────
function EdgePath({ d, sourceStatus, targetStatus }) {
  const isSourceDone = sourceStatus === 'done' || sourceStatus === 'completed';
  const isTargetDone = targetStatus === 'done' || targetStatus === 'completed';
  const isTargetRunning = targetStatus === 'running';
  
  const isFullyDone = isSourceDone && isTargetDone;
  const isCurrentlyRunning = isSourceDone && isTargetRunning;

  // #10b981 is green, #34d399 is light green, #94a3b8 is slate-400 (visible grey)
  const stroke = isFullyDone ? '#10b981' : isCurrentlyRunning ? '#34d399' : '#94a3b8';

  return (
    <path
      d={d}
      stroke={stroke}
      strokeWidth={isFullyDone || isCurrentlyRunning ? 2 : 1.5}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={isCurrentlyRunning ? '6 4' : undefined}
      className={isCurrentlyRunning ? 'animate-flow-dash' : undefined}
      opacity={isFullyDone ? 0.9 : isCurrentlyRunning ? 0.75 : 0.6}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
const CONTAINER_W = 1245;
const CONTAINER_H = 205;

export default function AgentGraph({ activeId, agentStates = {}, stepStatus = {}, onNodeClick, currentPipelineStep = 0, isGeocodeDone = false, onStartCat, onStartUnderwriting }) {
  const geocodeResult = usePipelineStore(s => s.geocodeResult);
  const uploadMeta    = usePipelineStore(s => s.uploadMeta);

  const nodeMap = useMemo(() => Object.fromEntries(NODES.map(n => [n.id, n])), []);

  const getStatus = (node) => {
    if (node.locked) return 'locked';
    const sse = agentStates[node.agentKey]?.status;
    if (sse === 'completed') return 'done';
    if (sse) return sse;

    // Fallback to stepStatus and global state
    if (node.id === 'upload') {
      return activeId ? 'done' : 'running'; // Upload is done if we have an ID, otherwise it's the first step
    }
    if (node.id === 'normalize') {
      if (stepStatus.normalize === 'idle') return 'pending';
      return stepStatus.normalize;
    }
    if (node.id === 'geocode') {
      if (stepStatus.geocode === 'idle') return 'pending';
      return stepStatus.geocode;
    }
    if (node.id === 'catMap') {
      if (stepStatus.mapCodes === 'idle') return 'pending';
      return stepStatus.mapCodes || 'pending';
    }
    if (node.id === 'catNorm') {
      if (stepStatus.normalizeValues === 'idle') return 'pending';
      return stepStatus.normalizeValues || 'pending';
    }
    if (node.id === 'catOut') {
      if (currentPipelineStep >= 9) return 'done';
      return 'pending';
    }
    return 'pending';
  };

  const edgeData = useMemo(() =>
    EDGES.map(e => ({
      ...e,
      path: makePath(nodeMap[e.from], nodeMap[e.to]),
      sourceStatus: getStatus(nodeMap[e.from]),
      targetStatus: getStatus(nodeMap[e.to]),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentStates, stepStatus]
  );

  return (
    <div className="w-full py-4 flex justify-center overflow-visible">
      <div className="relative shrink-0" style={{ width: CONTAINER_W, height: CONTAINER_H }}>

        {/* ── Group Wrappers Layer ── */}
        
        {/* Data Agent Wrapper (Removed) */}

        {/* CAT Agent Wrapper */}
        <div className={cn("absolute border border-dashed rounded-2xl transition-all", isGeocodeDone ? 'border-violet-400/50 bg-violet-50/20' : 'border-slate-300 bg-slate-50/20 grayscale opacity-70')}
          style={{ left: 540, top: -5, width: 496, height: 65, zIndex: 0 }}>
          
          {/* Centered Top Label */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
            <div className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ring-4 ring-[#f9fafb]", isGeocodeDone ? "text-violet-700 border-violet-200 bg-white" : "text-slate-500 border-slate-200 bg-slate-50")}>
              CAT Agent
            </div>
          </div>

          {/* Top-Right Play Button */}
          <div className="absolute top-0 right-4 -translate-y-1/2 z-20 pointer-events-auto">
            <button
              onClick={onStartCat}
              disabled={!isGeocodeDone}
              className={cn("flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full transition-all shadow-md border ring-4 ring-[#f9fafb]", isGeocodeDone ? 'bg-violet-600 text-white hover:bg-violet-500 border-violet-500 hover:shadow-violet-500/25 cursor-pointer' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed')}
            >
              <Play size={10} className={cn("fill-current", !isGeocodeDone && "opacity-50")} />
              <span>Start</span>
            </button>
          </div>
        </div>

        {/* Underwriting Agent Wrapper */}
        <div className={cn("absolute border border-dashed rounded-2xl transition-all", isGeocodeDone ? 'border-blue-400/50 bg-blue-50/10' : 'border-slate-300 bg-slate-50/20 grayscale opacity-70')}
          style={{ left: 540, top: 75, width: 656, height: 125, zIndex: 0 }}>
          
          {/* Centered Top Label */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
            <div className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ring-4 ring-[#f9fafb]", isGeocodeDone ? "text-blue-600 border-blue-200 bg-white" : "text-slate-500 border-slate-200 bg-slate-50")}>
              Underwriting Agent
            </div>
          </div>

          {/* Top-Right Coming Soon Button */}
          <div className="absolute top-0 right-4 -translate-y-1/2 z-20 pointer-events-auto">
            <button
              onClick={onStartUnderwriting}
              disabled={true} /* Keeping this disabled as per existing "Coming Soon" stub */
              className="flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full transition-all shadow-sm border bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed ring-4 ring-[#f9fafb]"
            >
              <Lock size={10} />
              <span>Coming Soon</span>
            </button>
          </div>
        </div>

        {/* SVG edge layer */}
        <svg
          width={CONTAINER_W}
          height={CONTAINER_H}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {edgeData.map((e, i) => (
            <EdgePath key={i} d={e.path} sourceStatus={e.sourceStatus} targetStatus={e.targetStatus} />
          ))}
        </svg>

        {/* Node cards */}
        {NODES.map(node => (
          <PipelineNode
            key={node.id}
            node={node}
            status={getStatus(node)}
            agentState={agentStates[node.agentKey]}
            extra={node.id === 'geocode' ? geocodeResult : node.id === 'upload' ? uploadMeta : undefined}
            onNodeClick={onNodeClick}
            currentPipelineStep={currentPipelineStep}
          />
        ))}
      </div>
    </div>
  );
}
