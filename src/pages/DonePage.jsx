import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Home, FileSpreadsheet, FileText, CheckCircle2, MapPin, DollarSign, Building2, TrendingUp } from 'lucide-react';
import { getSlipSummary } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const fmt  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = new Intl.NumberFormat('en-US');
const pct    = (val, total) => (!total || !val) ? '0%' : `${Math.round((val / total) * 100)}%`;
const pctNum = (val, total) => (!total || !val) ? 0 : Math.round((val / total) * 100);

const HEADER_CLASS = 'px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 bg-muted/40 border-b border-border/30 whitespace-nowrap select-none';
const CELL_CLASS   = 'px-4 py-[9px] border-b border-border/15 text-[12px] text-foreground/80 align-middle';

function PctBar({ value, total, colorClass = 'bg-primary/60' }) {
  const w = pctNum(value, total);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', colorClass)} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{w}%</span>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, iconBg }) {
  return (
    <div className="glass rounded-xl p-4 flex items-center gap-3 border border-border/30">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/50">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ num, title }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="w-7 h-7 rounded-full gradient-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm">{num}</span>
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-foreground/75">{title}</h2>
    </div>
  );
}

function TotalRow({ cells }) {
  return (
    <tr className="bg-primary/[0.04] border-t-2 border-primary/15">
      {cells.map(({ content, align = 'left', colSpan = 1, isLabel = false }, i) => (
        <td key={i} colSpan={colSpan} className={cn('px-4 py-3 text-[12px] font-bold border-t border-primary/10', isLabel ? 'text-primary' : 'text-foreground', align === 'right' && 'text-right tabular-nums')}>
          {content}
        </td>
      ))}
    </tr>
  );
}

function TableSkeleton({ rows = 5, cols = 3 }) {
  return (
    <div className="glass rounded-2xl overflow-hidden border border-border/30">
      <div className="bg-muted/40 px-4 py-2.5 border-b border-border/30 flex gap-4">
        {Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className="h-3 w-20 rounded" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-[9px] border-b border-border/10">
          {Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className={cn('h-4 rounded', j === 0 ? 'flex-1' : 'w-24')} />)}
        </div>
      ))}
    </div>
  );
}

function DownloadAction({ format, label, icon: Icon, uploadId }) {
  const href = `/api/download/${uploadId}?format=${format}`;
  return (
    <a id={`btn-download-${format}`} href={href} download={`cat_output_${uploadId?.slice(0,8)}.${format}`}
      onClick={() => toast.success(`${label} download started`)}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary glow-primary-sm text-white text-[13px] font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all no-underline">
      <Icon className="w-4 h-4" />{label}
    </a>
  );
}

export default function DonePage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['slip-summary', uploadId],
    queryFn: () => getSlipSummary(uploadId),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  const lv      = data?.location_values ?? {};
  const grand   = lv.total ?? 0;
  const cs      = data?.country_state   ?? [];
  const csTotal = cs.reduce((s, r) => s + r.count, 0);
  const csTiv   = cs.reduce((s, r) => s + r.tiv, 0);
  const topLocs = data?.top_locations   ?? [];
  const topTiv  = topLocs.reduce((s, r) => s + r.tiv, 0);
  const occ     = data?.occupancy_dist  ?? [];
  const cst     = data?.construction_dist ?? [];
  const yb      = data?.year_built_dist ?? [];
  const st      = data?.stories_dist    ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl gradient-primary glow-primary flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-1"><span className="gradient-text">Pipeline Complete!</span></h1>
        <p className="text-muted-foreground text-sm">Exposure data processed and ready for CAT modeling.</p>
        <code className="text-xs font-mono text-muted-foreground/40 mt-1 block">Session: {uploadId?.slice(0, 16)}…</code>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={MapPin}     label="Total Locations"    value={fmtN.format(data?.total_risks ?? 0)} iconBg="bg-cyan-500" />
        <KpiCard icon={DollarSign} label="Total TIV"          value={fmt.format(grand)}                   iconBg="gradient-primary" />
        <KpiCard icon={Building2}  label="Building Value"     value={fmt.format(lv.building ?? 0)}        iconBg="bg-violet-500" />
        <KpiCard icon={TrendingUp} label="Countries / States" value={`${new Set(cs.map(r => r.country)).size} / ${cs.length}`} iconBg="bg-emerald-500" />
      </div>

      {/* Export bar */}
      <div className="glass rounded-2xl p-4 mb-8 flex flex-wrap items-center justify-between gap-3 border border-border/40">
        <div>
          <p className="font-semibold text-sm text-foreground">Export Processed Output</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Download the normalized data with all pipeline enrichments applied.</p>
        </div>
        <div className="flex gap-3">
          <DownloadAction format="xlsx" label="Export to Excel" icon={FileSpreadsheet} uploadId={uploadId} />
          <DownloadAction format="csv"  label="Export CSV"      icon={FileText}        uploadId={uploadId} />
        </div>
      </div>

      <h2 className="text-lg font-bold mb-6 gradient-text tracking-tight">Pipeline Dashboard</h2>

      {/* Location Values */}
      <div className="mb-8">
        <SectionTitle num="1" title="Location Values" />
        {isLoading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="glass rounded-2xl overflow-hidden border border-border/30">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <colgroup><col /><col style={{ width: 160 }} /><col style={{ width: 90 }} /></colgroup>
              <thead><tr>
                <th className={cn(HEADER_CLASS, 'text-left')}>Category</th>
                <th className={cn(HEADER_CLASS, 'text-right')}>Total</th>
                <th className={cn(HEADER_CLASS, 'text-right')}>% Total</th>
              </tr></thead>
              <tbody>
                {[{ label: 'Building', val: lv.building }, { label: 'Contents', val: lv.contents }, { label: 'Business Interruption', val: lv.bi }].map((r, i) => (
                  <tr key={r.label} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                    <td className={CELL_CLASS}>{r.label}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.val ?? 0)}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground')}>{pct(r.val, grand)}</td>
                  </tr>
                ))}
                <TotalRow cells={[{ content: 'Total', isLabel: true }, { content: fmt.format(grand), align: 'right' }, { content: '100%', align: 'right' }]} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Country/State */}
      <div className="mb-8">
        <SectionTitle num="2" title="Country / State Breakdown" />
        {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
          <div className="glass rounded-2xl overflow-hidden border border-border/30">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <colgroup><col style={{ width: 100 }} /><col style={{ width: 80 }} /><col style={{ width: 90 }} /><col /><col style={{ width: 90 }} /></colgroup>
              <thead><tr>
                <th className={cn(HEADER_CLASS, 'text-left')}>Country</th>
                <th className={cn(HEADER_CLASS, 'text-left')}>State</th>
                <th className={cn(HEADER_CLASS, 'text-right')}># Risks</th>
                <th className={cn(HEADER_CLASS, 'text-right')}>Total</th>
                <th className={cn(HEADER_CLASS, 'text-right')}>% Total</th>
              </tr></thead>
              <tbody>
                {cs.map((r, i) => (
                  <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                    <td className={cn(CELL_CLASS, 'font-medium')}>{r.country}</td>
                    <td className={cn(CELL_CLASS, 'text-muted-foreground')}>{r.state}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums')}>{fmtN.format(r.count)}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.tiv)}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground')}>{pct(r.tiv, csTiv)}</td>
                  </tr>
                ))}
                <TotalRow cells={[{ content: 'Total', isLabel: true }, { content: '' }, { content: fmtN.format(csTotal), align: 'right' }, { content: fmt.format(csTiv), align: 'right' }, { content: '100%', align: 'right' }]} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Occupancy + Construction side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[{ num: '3', title: 'Occupancy Distribution', data: occ, colorClass: 'bg-primary/60' }, { num: '4', title: 'Construction Distribution', data: cst, colorClass: 'bg-violet-500/60' }].map(({ num, title, data: dist, colorClass }) => (
          <div key={num}>
            <SectionTitle num={num} title={title} />
            {isLoading ? <TableSkeleton rows={6} cols={3} /> : (
              <div className="glass rounded-2xl overflow-hidden border border-border/30">
                <table className="w-full text-[12px] border-collapse table-fixed">
                  <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 120 }} /></colgroup>
                  <thead><tr>
                    <th className={cn(HEADER_CLASS, 'text-left')}>Type</th>
                    <th className={cn(HEADER_CLASS, 'text-center')}>Share</th>
                    <th className={cn(HEADER_CLASS, 'text-right')}>Total TIV</th>
                  </tr></thead>
                  <tbody>
                    {dist.map((r, i) => (
                      <tr key={i} className={cn('hover:bg-muted/25 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                        <td className={CELL_CLASS}>{r.label}</td>
                        <td className={CELL_CLASS}><PctBar value={r.tiv} total={grand} colorClass={colorClass} /></td>
                        <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmt.format(r.tiv)}</td>
                      </tr>
                    ))}
                    <TotalRow cells={[{ content: 'Total', isLabel: true }, { content: '' }, { content: fmt.format(grand), align: 'right' }]} />
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Return */}
      <Button id="btn-return-home" variant="outline" size="lg" onClick={() => navigate('/')} className="w-full h-12 rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:border-border">
        <Home className="w-4 h-4 mr-2" /> Return to Home
      </Button>
    </div>
  );
}
