import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Home, FileSpreadsheet, FileText, CheckCircle2, MapPin, DollarSign, Building2, TrendingUp } from 'lucide-react';
import { getSlipSummary } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const fmt  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = new Intl.NumberFormat('en-US');
const pct    = (val, total) => (!total || !val) ? '0%' : `${Math.round((val / total) * 100)}%`;
const pctNum = (val, total) => (!total || !val) ? 0 : Math.round((val / total) * 100);

const HEADER_CLASS = 'px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60 bg-muted/20 border-b-2 border-border/40 whitespace-nowrap select-none';
const CELL_CLASS   = 'px-5 py-3.5 border-b border-border/10 text-[13px] text-foreground/80 align-middle group-hover:text-foreground transition-colors';
const ROW_CLASS    = 'group hover:bg-card hover:shadow-sm transition-all duration-200 cursor-default';
const BADGE_CLASS  = 'inline-block px-2.5 py-1 rounded-md font-semibold tabular-nums text-foreground bg-muted/30 border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/[0.05] group-hover:text-primary transition-colors';

function PctBar({ value, total, colorClass = 'bg-primary/60' }) {
  const w = pctNum(value, total);
  const solidColor = colorClass.replace('/60', '').replace('/50', '');
  return (
    <div className="flex items-center gap-3 min-w-[100px] group-hover:opacity-100 opacity-90 transition-opacity">
      <div className="flex-1 h-2 bg-muted/80 rounded-full overflow-hidden shadow-inner">
        <div className={cn('h-full rounded-full transition-all duration-1000 ease-out shadow-sm', solidColor)} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[12px] font-medium tabular-nums text-foreground/70 w-9 text-right group-hover:text-foreground transition-colors">{w}%</span>
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
    <tr className="bg-primary/[0.03] border-t-2 border-primary/20">
      {cells.map(({ content, align = 'left', colSpan = 1, isLabel = false }, i) => (
        <td key={i} colSpan={colSpan} className={cn('px-5 py-4 text-[13px] font-bold border-t border-primary/10', isLabel ? 'text-primary uppercase tracking-wider text-[11px]' : 'text-foreground', align === 'right' && 'text-right tabular-nums')}>
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

function DownloadAction({ format, label, icon: Icon, uploadId, apiPath = 'download' }) {
  const href = `/api/${apiPath}/${uploadId}?format=${format}`;
  const filename = `${apiPath === 'download' ? 'cat_output' : 'account_output'}_${uploadId?.slice(0, 8)}.${format}`;
  return (
    <a
      id={`btn-${apiPath}-${format}`}
      href={href}
      download={filename}
      onClick={() => toast.success(`${label} download started`)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary glow-primary-sm text-white text-[12px] font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all no-underline shrink-0 whitespace-nowrap"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}

function PreviewTable({ preview, isLoading }) {
  if (isLoading) return <TableSkeleton rows={4} cols={5} />;
  if (!preview || !preview.headers) return null;
  
  return (
    <div className="rounded-xl overflow-hidden border border-border/30 mt-2 max-w-full overflow-x-auto bg-background/50 custom-scrollbar">
      <table className="w-full text-left text-[11px] whitespace-nowrap">
        <thead>
          <tr className="bg-muted/40 border-b border-border/30">
            {preview.headers.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.sample.map((row, i) => (
            <tr key={i} className="border-b border-border/10 hover:bg-muted/20">
              {preview.headers.map((h, j) => (
                <td key={j} className="px-3 py-1.5 text-foreground/80">{row[h] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardView({ uploadId }) {
  const { targetFormat } = usePipelineStore();


  const { data, isLoading } = useQuery({
    queryKey: ['slip-summary', uploadId],
    queryFn: () => getSlipSummary(uploadId),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  const { data: locPreview, isLoading: locLoading } = useQuery({
    queryKey: ['preview-location', uploadId],
    queryFn: () => fetch(`/api/preview-location/${uploadId}`).then(res => res.json()),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  const { data: accPreview, isLoading: accLoading } = useQuery({
    queryKey: ['preview-account', uploadId],
    queryFn: () => fetch(`/api/preview-account/${uploadId}`).then(res => res.json()),
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
    <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Export bar */}
      <div className="glass rounded-2xl p-4 mb-8 flex flex-col gap-4 border border-border/40">

        {/* Group 1 — Processed Location Output */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 pr-4">
              <p className="font-semibold text-sm text-foreground">Export {targetFormat} ready location file</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Download the normalized data with all pipeline enrichments applied.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DownloadAction format="xlsx" label="Export Excel" icon={FileSpreadsheet} uploadId={uploadId} />
              <DownloadAction format="txt"  label="Export TXT"   icon={FileText}        uploadId={uploadId} />
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full mt-1">
            <AccordionItem value="preview" className="border-none">
              <AccordionTrigger className="py-1.5 text-[11px] text-primary hover:no-underline justify-start gap-2">
                View Columns and Data Preview
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <PreviewTable preview={locPreview} isLoading={locLoading} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="h-px bg-border/40 w-full" />

        {/* Group 2 — Account File */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 pr-4">
              <p className="font-semibold text-sm text-foreground">Export {targetFormat} ready account file</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Download structured account-level summary required for {targetFormat} modeling.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DownloadAction apiPath="download-account" format="xlsx" label="Account Excel" icon={FileSpreadsheet} uploadId={uploadId} />
              <DownloadAction apiPath="download-account" format="txt"  label="Account TXT"   icon={FileText}        uploadId={uploadId} />
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full mt-1">
            <AccordionItem value="preview" className="border-none">
              <AccordionTrigger className="py-1.5 text-[11px] text-primary hover:no-underline justify-start gap-2">
                View Columns and Data Preview
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <PreviewTable preview={accPreview} isLoading={accLoading} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

      </div>

      {/* BI Insights Dashboard - Collapsible */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="bi-insights" className="border-border/30 glass rounded-2xl px-6 py-2 shadow-sm">
          <AccordionTrigger className="text-lg font-bold hover:no-underline gradient-text tracking-tight pb-4 pt-2">
            Pipeline Dashboard & BI Insights
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            
            {/* Location Values */}
            <div className="mb-8">
        <SectionTitle num="1" title="Location Values" />
        {isLoading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <colgroup><col /><col style={{ width: 160 }} /><col style={{ width: 90 }} /></colgroup>
              <thead><tr>
                <th className={cn(HEADER_CLASS, 'text-left')}>Category</th>
                <th className={cn(HEADER_CLASS, 'text-right')}>Total</th>
                <th className={cn(HEADER_CLASS, 'text-right')}>% Total</th>
              </tr></thead>
              <tbody>
                {[{ label: 'Building', val: lv.building }, { label: 'Contents', val: lv.contents }, { label: 'Business Interruption', val: lv.bi }].map((r, i) => (
                  <tr key={r.label} className={ROW_CLASS}>
                    <td className={cn(CELL_CLASS, 'font-medium')}>{r.label}</td>
                    <td className={cn(CELL_CLASS, 'text-right')}><span className={BADGE_CLASS}>{fmt.format(r.val ?? 0)}</span></td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground/80 font-medium')}>{pct(r.val, grand)}</td>
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
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
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
                  <tr key={i} className={ROW_CLASS}>
                    <td className={cn(CELL_CLASS, 'font-semibold')}>{r.country}</td>
                    <td className={cn(CELL_CLASS, 'text-muted-foreground')}>{r.state}</td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums font-medium')}>{fmtN.format(r.count)}</td>
                    <td className={cn(CELL_CLASS, 'text-right')}><span className={BADGE_CLASS}>{fmt.format(r.tiv)}</span></td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground/80 font-medium')}>{pct(r.tiv, csTiv)}</td>
                  </tr>
                ))}
                <TotalRow cells={[{ content: 'Total', isLabel: true }, { content: '' }, { content: fmtN.format(csTotal), align: 'right' }, { content: fmt.format(csTiv), align: 'right' }, { content: '100%', align: 'right' }]} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Locations by TIV */}
      <div className="mb-8">
        <SectionTitle num="3" title="Top Locations by TIV" />
        {isLoading ? <TableSkeleton rows={10} cols={7} /> : (
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <colgroup>
                <col style={{ width: 70  }} />
                <col />
                <col style={{ width: 130 }} />
                <col style={{ width: 70  }} />
                <col style={{ width: 80  }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 80  }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(HEADER_CLASS, 'text-left')}>Loc ID</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>Address</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>City</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>State</th>
                  <th className={cn(HEADER_CLASS, 'text-left')}>ZIP</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>TIV</th>
                  <th className={cn(HEADER_CLASS, 'text-right')}>% Total</th>
                </tr>
              </thead>
              <tbody>
                {topLocs.map((r, i) => (
                  <tr key={i} className={ROW_CLASS}>
                    <td className={cn(CELL_CLASS, 'text-muted-foreground/70 font-mono text-[11px]')}>
                      <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">{r.loc_id || '—'}</span>
                    </td>
                    <td className={cn(CELL_CLASS, 'truncate max-w-0 font-medium group-hover:text-primary transition-colors')} title={r.address}>{r.address || '—'}</td>
                    <td className={cn(CELL_CLASS)}>{r.city || '—'}</td>
                    <td className={cn(CELL_CLASS)}>{r.state || '—'}</td>
                    <td className={cn(CELL_CLASS, 'font-mono text-[12px] text-muted-foreground')}>{r.zip || '—'}</td>
                    <td className={cn(CELL_CLASS, 'text-right')}><span className={BADGE_CLASS}>{fmt.format(r.tiv)}</span></td>
                    <td className={cn(CELL_CLASS, 'text-right tabular-nums text-muted-foreground/80 font-medium')}>{pct(r.tiv, grand)}</td>
                  </tr>
                ))}
                <tr className="bg-primary/[0.03] border-t-2 border-primary/20">
                  <td colSpan={5} className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-primary border-t border-primary/10">
                    Top {topLocs.length} Total
                  </td>
                  <td className="px-5 py-4 text-right text-[13px] font-bold tabular-nums text-primary border-t border-primary/10">
                    {fmt.format(topTiv)}
                  </td>
                  <td className="px-5 py-4 text-right text-[13px] font-bold tabular-nums text-foreground border-t border-primary/10">
                    {pct(topTiv, grand)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Occupancy + Construction side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[
          { num: '4', title: 'Occupancy Distribution', data: occ, colorClass: 'bg-primary/60' },
          { num: '5', title: 'Construction Distribution', data: cst, colorClass: 'bg-violet-500/60' }
        ].map(({ num, title, data: dist, colorClass }) => (
          <div key={num}>
            <SectionTitle num={num} title={title} />
            {isLoading ? <TableSkeleton rows={6} cols={3} /> : (
              <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
                <table className="w-full text-[12px] border-collapse table-fixed">
                  <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 120 }} /></colgroup>
                  <thead><tr>
                    <th className={cn(HEADER_CLASS, 'text-left')}>Type</th>
                    <th className={cn(HEADER_CLASS, 'text-center')}>Share</th>
                    <th className={cn(HEADER_CLASS, 'text-right')}>Total TIV</th>
                  </tr></thead>
                  <tbody>
                    {dist.map((r, i) => (
                      <tr key={i} className={ROW_CLASS}>
                        <td className={cn(CELL_CLASS, 'font-medium')}>{r.label}</td>
                        <td className={CELL_CLASS}><PctBar value={r.tiv} total={grand} colorClass={colorClass} /></td>
                        <td className={cn(CELL_CLASS, 'text-right')}><span className={BADGE_CLASS}>{fmt.format(r.tiv)}</span></td>
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

      {/* Year Built + Stories side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[
          { num: '6', title: 'Year Built', data: yb, colorClass: 'bg-emerald-500/60' },
          { num: '7', title: 'Number of Stories', data: st, colorClass: 'bg-amber-500/60' }
        ].map(({ num, title, data: dist, colorClass }) => (
          <div key={num}>
            <SectionTitle num={num} title={title} />
            {isLoading ? <TableSkeleton rows={6} cols={3} /> : (
              <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
                <table className="w-full text-[12px] border-collapse table-fixed">
                  <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 120 }} /></colgroup>
                  <thead><tr>
                    <th className={cn(HEADER_CLASS, 'text-left')}>Type</th>
                    <th className={cn(HEADER_CLASS, 'text-center')}>Share</th>
                    <th className={cn(HEADER_CLASS, 'text-right')}>Total TIV</th>
                  </tr></thead>
                  <tbody>
                    {dist.map((r, i) => (
                      <tr key={i} className={ROW_CLASS}>
                        <td className={cn(CELL_CLASS, 'font-medium')}>{r.label}</td>
                        <td className={CELL_CLASS}><PctBar value={r.tiv} total={grand} colorClass={colorClass} /></td>
                        <td className={cn(CELL_CLASS, 'text-right')}><span className={BADGE_CLASS}>{fmt.format(r.tiv)}</span></td>
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

          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </div>
  );
}
