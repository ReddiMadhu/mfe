import { useMemo } from 'react';
import {
  FileSpreadsheet, Table2, MapPin, Globe, Tag, BarChart3, FileOutput,
  ShieldCheck, CloudRain, Layers, Eye, TrendingUp, Award,
  Loader2, Check, Lock, AlertCircle,
} from 'lucide-react';
import { usePipelineStore } from '@/store/usePipelineStore';

// ─── Node dimensions ─────────────────────────────────────────────────────────
const NW  = 110;   // card width
const NH  = 36;    // card height
const NCX = NW / 2;
const NCY = NH / 2;

// cx(node) = node.left + NCX   cy(node) = node.top + NCY
// right-edge x = node.left + NW
// left-edge  x = node.left
const NODES = [
  // ── Sequential ─────────────────────────────────────────────────────────────
  { id: 'upload',      label: 'Upload',          icon: FileSpreadsheet, agentKey: 'upload',            left: 0,   top: 110, locked: false, color: '#3b82f6' },
  { id: 'preview',     label: 'Preview',         icon: Table2,          agentKey: 'preview',           left: 140, top: 110, locked: false, color: '#6366f1' },
  { id: 'normalize',   label: 'Norm Addr',       icon: MapPin,          agentKey: 'address_normalizer',left: 280, top: 110, locked: false, color: '#06b6d4' },
  { id: 'geocode',     label: 'Geocode',         icon: Globe,           agentKey: 'geocoder',          left: 420, top: 110, locked: false, color: '#0ea5e9' },

  // ── Parallel col 1 ───────────────────────────────────────────────
  { id: 'catMap',      label: 'Occ & Const',     icon: Tag,             agentKey: 'cat_code_mapper',   left: 560, top: 10,  locked: false, color: '#8b5cf6' },
  { id: 'cope',        label: 'COPE',            icon: ShieldCheck,     agentKey: 'cope_triage',       left: 560, top: 60,  locked: false, color: '#f59e0b' },
  { id: 'hazards',     label: 'Hazards',         icon: CloudRain,       agentKey: 'hazard_data',       left: 560, top: 110, locked: false, color: '#ef4444' },
  { id: 'geospatial',  label: 'Geospatial',      icon: Layers,          agentKey: 'geospatial_data',   left: 560, top: 160, locked: false, color: '#10b981' },

  // ── Parallel col 2 ───────────────────────────────────────────────
  { id: 'catNorm',     label: 'Norm Vals',       icon: BarChart3,       agentKey: 'cat_normalizer',    left: 700, top: 10,  locked: false, color: '#f97316' },
  { id: 'objAnalysis', label: 'Object',          icon: Eye,             agentKey: 'object_detection',  left: 700, top: 160, locked: false, color: '#ec4899' },

  // ── Parallel col 3 ──────────────────────────────────────────────
  { id: 'catOut',      label: 'Final CAT',       icon: FileOutput,      agentKey: 'cat_output',        left: 840, top: 10,  locked: false, color: '#64748b' },
  { id: 'riskModel',   label: 'Risk Model',      icon: TrendingUp,      agentKey: 'risk_model',        left: 840, top: 110, locked: false, color: '#4f46e5' },

  // ── Final col ───────────────────────────────────────────────────
  { id: 'propensity',  label: 'Propensity',      icon: Award,           agentKey: 'quote_propensity',  left: 980, top: 110, locked: false, color: '#f43f5e' },
];

// ─── Edge definitions ────────────────────────────────────────────────────────
const EDGES = [
  { from: 'upload',      to: 'preview'     },
  { from: 'preview',     to: 'normalize'   },
  { from: 'normalize',   to: 'geocode'     },
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
  if (Math.abs(y1 - y2) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const cxOffset = 45; // reduced offset for condensed layout
  return `M ${x1} ${y1} C ${x1 + cxOffset} ${y1}, ${x2 - cxOffset} ${y2}, ${x2} ${y2}`;
}

// ─── Stats per node ───────────────────────────────────────────────────────────
const NODE_STATS = {
  upload:      (r) => [{ l: 'Rows',    v: r?.total_rows   }, { l: 'Cols',   v: r?.total_cols   }],
  preview:     (r) => [{ l: 'Mapped',  v: r?.mapped_cols  }, { l: 'Quality',v: r?.quality      }],
  normalize:   (r) => [{ l: 'Cleaned', v: r?.normalized   }, { l: 'Flags',  v: r?.flags_added  }],
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

// ─── Single node card ─────────────────────────────────────────────────────────
function PipelineNode({ node, agentState, extra }) {
  const Icon = node.icon;

  const rawStatus = node.locked ? 'locked'
    : agentState?.status === 'completed' ? 'done'
    : agentState?.status || 'pending';

  const result = extra ?? agentState?.result;
  const statsBuilder = NODE_STATS[node.id];
  const stats = statsBuilder ? statsBuilder(result) : [];

  const CFG = {
    pending: { border: 'border-slate-200', icon: 'bg-slate-100 text-slate-400', label: 'text-slate-500', glow: 'none' },
    running: { border: 'border-primary/50', icon: 'bg-primary/10 text-primary', label: 'text-slate-900', glow: '0 4px 12px rgba(251,78,11,0.15)' },
    done:    { border: 'border-emerald-300', icon: 'bg-emerald-50 text-emerald-600', label: 'text-slate-900', glow: '0 2px 8px rgba(16,185,129,0.1)' },
    error:   { border: 'border-rose-300', icon: 'bg-rose-50 text-rose-600', label: 'text-slate-900', glow: 'none' },
    locked:  { border: 'border-slate-200', icon: 'bg-slate-50 text-slate-400', label: 'text-slate-400', glow: 'none' },
  };
  const c = CFG[rawStatus] || CFG.pending;

  return (
    <div
      className={`absolute rounded-full border group flex items-center gap-1.5 px-2 transition-all duration-300 cursor-default ${c.border} ${node.locked ? 'opacity-50' : ''}`}
      style={{
        left: node.left, top: node.top, width: NW, height: NH,
        background: '#e2e8fc',
        border: '0.5px solid #e2e8f0',
        boxShadow: c.glow !== 'none' ? c.glow : '0 1px 3px rgba(0,0,0,0.05)',
        zIndex: 10,
      }}
    >
      {/* Icon */}
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/50`} style={{ color: node.color }}>
        {rawStatus === 'running' ? <Loader2 size={10} className="animate-spin" /> :
         rawStatus === 'error'   ? <AlertCircle size={10} /> :
         <Icon size={10} />}
      </div>

      {/* Label */}
      <div className={`text-[10px] font-semibold truncate ${c.label}`}>
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
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SVG edge ─────────────────────────────────────────────────────────────────
function EdgePath({ d, sourceStatus }) {
  const isDone    = sourceStatus === 'done' || sourceStatus === 'completed';
  const isRunning = sourceStatus === 'running';
  const stroke    = isDone ? '#fb4e0b' : isRunning ? '#fdba74' : '#cbd5e1';
  return (
    <path
      d={d}
      stroke={stroke}
      strokeWidth={isDone ? 2 : 1.5}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={isRunning ? '6 4' : undefined}
      className={isRunning ? 'animate-flow-dash' : undefined}
      opacity={isDone ? 0.85 : isRunning ? 0.75 : 0.4}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
const CONTAINER_W = 1090;
const CONTAINER_H = 206;

export default function AgentGraph({ agentStates = {}, stepStatus = {} }) {
  const uploadId      = usePipelineStore(s => s.uploadId);
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
      return uploadId ? 'done' : 'running'; // Upload is done if we have an ID, otherwise it's the first step
    }
    if (node.id === 'preview') {
      if (stepStatus.preview === 'done') return 'done';
      if (uploadId) return 'running'; // Active after upload
      return 'pending';
    }
    if (node.id === 'normalize') {
      if (stepStatus.normalize === 'idle') return 'pending';
      return stepStatus.normalize;
    }
    if (node.id === 'geocode') {
      if (stepStatus.geocode === 'idle') return 'pending';
      return stepStatus.geocode;
    }
    return 'pending';
  };

  const edgeData = useMemo(() =>
    EDGES.map(e => ({
      ...e,
      path: makePath(nodeMap[e.from], nodeMap[e.to]),
      sourceStatus: getStatus(nodeMap[e.from]),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentStates, stepStatus]
  );

  return (
    <div className="w-full overflow-x-auto py-2 px-1">
      <div className="relative" style={{ width: CONTAINER_W, height: CONTAINER_H }}>

        {/* SVG edge layer */}
        <svg
          width={CONTAINER_W}
          height={CONTAINER_H}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <linearGradient id="eg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#fb4e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {edgeData.map((e, i) => (
            <EdgePath key={i} d={e.path} sourceStatus={e.sourceStatus} />
          ))}
        </svg>

        {/* Node cards */}
        {NODES.map(node => (
          <PipelineNode
            key={node.id}
            node={node}
            agentState={agentStates[node.agentKey]}
            extra={node.id === 'geocode' ? geocodeResult : node.id === 'upload' ? uploadMeta : undefined}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 text-[9px] text-slate-600 px-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Complete</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Running</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />Pending</span>
      </div>
    </div>
  );
}
