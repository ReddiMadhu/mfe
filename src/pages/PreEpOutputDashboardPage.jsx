import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, FileText, TrendingUp } from 'lucide-react';

import { getPreEpOutput } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const fmtN = new Intl.NumberFormat('en-US');

function SimpleLineChart({ title, points }) {
  const W = 520;
  const H = 220;
  const P = 28;
  const innerW = W - P * 2;
  const innerH = H - P * 2;

  const clean = Array.isArray(points) ? points.filter(p =>
    typeof p?.loss === 'number' && typeof p?.annual_probability === 'number'
  ) : [];

  const { minX, maxX, minY, maxY } = useMemo(() => {
    if (clean.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = clean.map(p => p.loss);
    const ys = clean.map(p => p.annual_probability);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [clean]);

  const pts = useMemo(() => {
    const dx = (maxX - minX) || 1;
    const dy = (maxY - minY) || 1;
    return clean.map(p => {
      const x = P + ((p.loss - minX) / dx) * innerW;
      // higher probability should be higher on chart => invert y
      const y = P + innerH - ((p.annual_probability - minY) / dy) * innerH;
      return { x, y };
    });
  }, [clean, innerW, innerH, maxX, maxY, minX, minY]);

  const poly = pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  return (
    <div className="rounded-2xl border border-border/35 bg-card shadow-sm overflow-hidden dark:ring-1 dark:ring-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/25 bg-muted/25 dark:bg-zinc-950/65 dark:border-zinc-800/70">
        <BarChart3 className="w-4 h-4 text-primary" />
        <div className="text-[12px] font-bold text-foreground">{title}</div>
        <div className="ml-auto text-[10px] text-muted-foreground">
          X: Losses · Y: Annual Probability
        </div>
      </div>
      <div className="p-3">
        {clean.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground italic">
            No numeric curve points available.
          </div>
        ) : (
          <svg width={W} height={H} className="block w-full max-w-full text-border [&_line]:stroke-current">
            {/* axes — theme-aware stroke */}
            <line x1={P} y1={P} x2={P} y2={H - P} stroke="currentColor" className="opacity-40 dark:opacity-55" />
            <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="currentColor" className="opacity-40 dark:opacity-55" />
            {/* line */}
            <polyline
              points={poly}
              fill="none"
              stroke="rgba(124,58,237,0.95)"
              strokeWidth="2"
            />
            {/* dots */}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.2" fill="rgba(124,58,237,0.95)" />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

function PreEpTable({ rows, isLoading }) {
  const headers = ['ID','ANLSID','Peril','EPTYPE','PERSPCODE','RP','EP','PERSPVALUE'];

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="overflow-auto" style={{ maxHeight: '520px' }}>
      <table className="w-full text-left text-[12px] border-collapse">
        <thead className="sticky top-0 z-20">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3.5 py-2.5 font-bold uppercase tracking-[0.07em] whitespace-nowrap select-none bg-gradient-to-r from-slate-800 to-slate-700 text-white dark:from-zinc-900 dark:to-zinc-800 dark:text-zinc-100"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
          {(rows ?? []).map((row, i) => (
            <tr key={i} className={cn('hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15', i % 2 === 0 ? 'bg-card' : 'bg-muted/60')}>
              {headers.map((h) => {
                const val = row?.[h];
                const isNum = typeof val === 'number';
                return (
                  <td
                    key={h}
                    className={cn(
                      'px-3.5 py-2.5 border-b border-border/10 align-middle max-w-[220px] truncate',
                      isNum && 'font-mono tabular-nums text-right',
                      val == null || val === '' ? 'text-muted-foreground/30 italic text-[11px]' : 'text-foreground/80',
                    )}
                    title={val != null ? String(val) : undefined}
                  >
                    {val == null || val === '' ? 'NULL' : (isNum ? fmtN.format(val) : String(val))}
                  </td>
                );
              })}
            </tr>
          ))}
          {(rows ?? []).length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-muted-foreground text-xs italic">
                No rows.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  { key: 'aep', label: 'AEP Table' },
  { key: 'oep', label: 'OEP Table' },
];

export default function PreEpOutputDashboardPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('aep');

  const { data, isLoading, error } = useQuery({
    queryKey: ['pre-ep-output', uploadId],
    queryFn: () => getPreEpOutput(uploadId),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  if (error) {
    // No toast notifications (intentionally silent here).
  }

  const aepRows = data?.aep_rows ?? [];
  const oepRows = data?.oep_rows ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 w-full max-w-[1470px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center shrink-0 shadow-sm">
            <TrendingUp className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">Pre‑EP Curve Modeling Output</h1>
            <p className="text-[11px] text-muted-foreground">Mock outputs in AIR/RMS-style schema (display scaffold)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border/50">
            {uploadId?.slice(0, 8)}
          </span>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div className="space-y-5">
          <div className="glass rounded-2xl border border-border/35 shadow-sm overflow-hidden dark:ring-1 dark:ring-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex border-b border-border/30 bg-muted/25 dark:bg-zinc-950/70 dark:border-zinc-800/70">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3.5 text-[12px] font-semibold transition-all relative',
                    activeTab === t.key
                      ? 'text-primary bg-card dark:bg-background/85 border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/35 dark:hover:bg-zinc-900/50',
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <PreEpTable
              rows={activeTab === 'aep' ? aepRows : oepRows}
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SimpleLineChart title="EQ Gross AEP" points={data?.charts?.eq_gross_aep ?? []} />
            <SimpleLineChart title="EQ Gross OEP" points={data?.charts?.eq_gross_oep ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}

