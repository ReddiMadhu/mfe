import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, MapPin, FileText, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, BarChart3, TrendingUp,
  FileSpreadsheet, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getSimulationSummary, getPolicyData } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const API_BASE = import.meta.env.VITE_API_URL || '';
const fmt  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = new Intl.NumberFormat('en-US');
const fmtPct = (v) => `${v?.toFixed(1) ?? 0}%`;

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useMemo(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Metric card ────────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, title, primary, primaryLabel, stats, colorClass, delay = 0 }) {
  return (
    <div
      className="glass rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', colorClass)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
      </div>
      <div className="mb-3">
        <p className="text-3xl font-bold tabular-nums text-foreground leading-none">{primary}</p>
        <p className="text-xs text-muted-foreground mt-1">{primaryLabel}</p>
      </div>
      <div className="space-y-1.5 pt-3 border-t border-border/20">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PolicyExtractPanel({ slip }) {
  if (!slip) return null;

  const title = slip.pdf_name ? `Policy Extract — ${slip.pdf_name}` : 'Policy Extract (Slip Coding)';
  const perils = Array.isArray(slip.perils_covered) ? slip.perils_covered.join(', ') : '—';

  const kv = [
    { label: 'Extraction Status', value: slip.extraction_status || '—' },
    { label: 'Currency', value: slip.currency || '—' },
    { label: 'Insured Name', value: slip.insured_name || '—' },
    { label: 'Account #', value: slip.account_num || '—' },
    { label: 'Perils', value: perils || '—' },
    { label: 'Participation', value: slip.participation ?? '—' },
    { label: 'Policy Limit', value: slip.policy_limit ?? '—' },
    { label: 'Attachment', value: slip.attachment_point ?? '—' },
    { label: 'Deductible', value: slip.blanket_deductible ?? '—' },
    { label: 'Inception', value: slip.inception_date || '—' },
    { label: 'Expiry', value: slip.expiry_date || '—' },
  ];

  const summary = Array.isArray(slip.extraction_summary) ? slip.extraction_summary : [];

  return (
    <div className="p-4 border-b border-border/20 bg-gradient-to-r from-indigo-50/40 to-white">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-[12px] font-bold text-indigo-950">{title}</h3>
        </div>
        <span className="text-[10px] font-bold bg-indigo-600/10 text-indigo-700 border border-indigo-600/15 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Slip_Coded
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        {kv.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border/30 bg-white/80 px-3 py-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-[12px] font-semibold text-foreground truncate" title={String(value)}>
              {String(value)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/30 bg-white/70 overflow-hidden">
        <div className="px-3 py-2 bg-muted/30 border-b border-border/20 flex items-center justify-between">
          <div className="text-[11px] font-bold text-foreground">Extraction Summary</div>
          <div className="text-[10px] text-muted-foreground">{summary.length} fields</div>
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-border/20">
                <th className="px-3 py-2 font-bold text-muted-foreground uppercase tracking-wider">Field</th>
                <th className="px-3 py-2 font-bold text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="px-3 py-2 font-bold text-muted-foreground uppercase tracking-wider">Confidence</th>
                <th className="px-3 py-2 font-bold text-muted-foreground uppercase tracking-wider">Source Text</th>
                <th className="px-3 py-2 font-bold text-muted-foreground uppercase tracking-wider">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {summary.map((r, i) => (
                <tr key={i} className="hover:bg-indigo-50/30">
                  <td className="px-3 py-2 font-mono text-foreground/80 whitespace-nowrap">{r.field ?? '—'}</td>
                  <td className="px-3 py-2 text-foreground/80">{r.value == null ? '—' : String(r.value)}</td>
                  <td className="px-3 py-2 text-foreground/70 whitespace-nowrap">{r.confidence ?? '—'}</td>
                  <td className="px-3 py-2 text-foreground/70 max-w-[520px] truncate" title={r.source_text || ''}>{r.source_text || '—'}</td>
                  <td className="px-3 py-2 text-rose-700/80 max-w-[320px] truncate" title={r.flag || ''}>{r.flag || '—'}</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground italic">
                    No extraction summary available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Highlight matched text ────────────────────────────────────────────────────
function Highlight({ text, search }) {
  if (!search || !text) return <>{text ?? '—'}</>;
  const str = String(text);
  const idx = str.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return <>{str}</>;
  return (
    <>
      {str.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5 font-semibold not-italic">
        {str.slice(idx, idx + search.length)}
      </mark>
      {str.slice(idx + search.length)}
    </>
  );
}

// ── Premium data table ────────────────────────────────────────────────────────
const PAGE_SIZE = 100;

function SimDataTable({ headers = [], rows = [], isLoading, uploadId, fileKey }) {
  const [sort, setSort] = useState({ col: null, dir: 'asc' });
  const [searchRaw, setSearchRaw] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounce(searchRaw, 200);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const term = search.toLowerCase();
    return rows.filter(row =>
      Object.values(row).some(v => v != null && String(v).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sort.col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sort.col] ?? '';
      const bv = b[sort.col] ?? '';
      const n = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? n : -n;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((col) => {
    setSort(prev => {
      if (prev.col !== col) return { col, dir: 'asc' };
      if (prev.dir === 'asc') return { col, dir: 'desc' };
      return { col: null, dir: 'asc' };
    });
    setPage(1);
  }, []);

  const handleSearch = useCallback((e) => {
    setSearchRaw(e.target.value);
    setPage(1);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!headers.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-border/20 bg-muted/20">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search across all columns…"
            value={searchRaw}
            onChange={handleSearch}
            className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <DownloadBtn uploadId={uploadId} fileKey={fileKey} format="xlsx" label="Excel" icon={FileSpreadsheet} />
          <DownloadBtn uploadId={uploadId} fileKey={fileKey} format="txt" label="TSV" icon={FileText} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(100vh - 520px)', minHeight: '380px' }}>
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              {headers.map((h, i) => {
                const isActive = sort.col === h;
                return (
                  <th
                    key={h}
                    onClick={() => handleSort(h)}
                    className={cn(
                      'px-3.5 py-2.5 font-bold uppercase tracking-[0.07em] whitespace-nowrap select-none cursor-pointer transition-colors',
                      'bg-gradient-to-r from-slate-800 to-slate-700 text-white',
                      i === 0 && 'sticky left-0 z-30',
                      isActive ? 'text-primary bg-slate-900' : 'hover:bg-slate-600',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {h}
                      {isActive ? (
                        sort.dir === 'asc'
                          ? <ChevronUp className="w-3 h-3 text-primary shrink-0" />
                          : <ChevronDown className="w-3 h-3 text-primary shrink-0" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30 shrink-0" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {paged.map((row, ri) => (
              <tr
                key={ri}
                className={cn(
                  'transition-colors duration-100 hover:bg-indigo-50/40',
                  ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                )}
              >
                {headers.map((h, ci) => {
                  const val = row[h];
                  const isNum = val != null && !isNaN(Number(val)) && String(val).trim() !== '';
                  return (
                    <td
                      key={h}
                      title={val != null ? String(val) : undefined}
                      className={cn(
                        'px-3.5 py-2.5 border-b border-border/10 align-middle max-w-[200px] truncate',
                        ci === 0 && 'sticky left-0 z-10 bg-inherit border-r border-border/20 shadow-[2px_0_6px_rgba(0,0,0,0.06)] font-medium',
                        isNum && 'font-mono tabular-nums text-right',
                        val == null || val === '' ? 'text-muted-foreground/30 italic text-[11px]' : 'text-foreground/80',
                      )}
                    >
                      {val == null || val === '' ? '—' : (
                        <Highlight text={String(val)} search={search} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-muted-foreground text-xs">
                  No rows match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/20 bg-muted/20 text-[11px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-primary/50" />
          <strong className="text-foreground">{fmtN.format(filtered.length)}</strong> rows
          {search && <span className="text-muted-foreground/60"> (filtered from {fmtN.format(rows.length)})</span>}
          &nbsp;·&nbsp;
          <strong className="text-foreground">{headers.length}</strong> columns
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Download button ───────────────────────────────────────────────────────────
function DownloadBtn({ uploadId, fileKey, format, label, icon: Icon }) {
  const getHref = () => {
    if (fileKey === 'location') return `${API_BASE}/api/download/${uploadId}?format=${format}`;
    if (fileKey === 'account')  return `${API_BASE}/api/download-account/${uploadId}?format=${format}`;
    return `${API_BASE}/api/ep-curve/download-policy/${uploadId}?format=${format}`;
  };
  const ext = format === 'xlsx' ? 'xlsx' : 'txt';
  const prefix = fileKey === 'policy' ? 'policy_output' : fileKey === 'account' ? 'account_output' : 'cat_output';
  return (
    <a
      href={getHref()}
      download={`${prefix}_${uploadId?.slice(0, 8)}.${ext}`}
      onClick={() => toast.success(`${label} download started`)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-white text-[11px] font-semibold hover:opacity-90 transition-all no-underline"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'account',  label: 'Account File',  icon: Building2 },
  { key: 'location', label: 'Location File', icon: MapPin },
  { key: 'policy',   label: 'Policy File',   icon: FileText },
];

export default function SimulationDashboardPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { targetFormat } = usePipelineStore();
  const [activeTab, setActiveTab] = useState('account');

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['simulation-summary', uploadId],
    queryFn: () => getSimulationSummary(uploadId),
    enabled: !!uploadId,
    staleTime: 60_000,
  });

  const { data: policyData, isLoading: policyLoading } = useQuery({
    queryKey: ['policy-data', uploadId],
    queryFn: () => getPolicyData(uploadId),
    enabled: !!uploadId && activeTab === 'policy',
    staleTime: 60_000,
  });

  // Use final-* endpoints so slip coding (location updates + RMS/AIR account rows) appears in tables.
  // base-location / base-account are intentionally pre-slip SOV only (EP node panels).
  const { data: locData, isLoading: locLoading } = useQuery({
    queryKey: ['sim-location', uploadId],
    queryFn: () => fetch(`${API_BASE}/api/final-location/${uploadId}`).then(r => r.json()),
    enabled: !!uploadId && activeTab === 'location',
    staleTime: 60_000,
  });

  const { data: accData, isLoading: accLoading } = useQuery({
    queryKey: ['sim-account', uploadId],
    queryFn: () => fetch(`${API_BASE}/api/final-account/${uploadId}`).then(r => r.json()),
    enabled: !!uploadId && activeTab === 'account',
    staleTime: 60_000,
  });

  // ── Table data by tab ──────────────────────────────────────────────────────
  const tableProps = {
    account:  { headers: accData?.headers    ?? [], rows: accData?.sample    ?? [], isLoading: accLoading    },
    location: { headers: locData?.headers    ?? [], rows: locData?.sample    ?? [], isLoading: locLoading    },
    policy:   { headers: policyData?.headers ?? [], rows: policyData?.rows   ?? [], isLoading: policyLoading },
  };

  // ── Row counts for tab badges ──────────────────────────────────────────────
  const counts = {
    account:  summary?.account?.row_count ?? '—',
    location: summary?.location?.row_count ?? '—',
    policy:   summary?.policy?.row_count ?? '—',
  };

  const acc = summary?.account  ?? {};
  const loc = summary?.location ?? {};
  const pol = summary?.policy   ?? {};

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 w-full max-w-[1470px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm">
            <TrendingUp className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">Annual Simulation Results</h1>
            <p className="text-[11px] text-muted-foreground">EP Curve Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {targetFormat || acc.target_format || 'AIR'}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border/50">
            {uploadId?.slice(0, 8)}
          </span>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Pipeline
          </button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {summaryLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)
        ) : (
          <>
            <MetricCard
              icon={Building2}
              title="Account File"
              primary={fmtN.format(acc.row_count ?? 0)}
              primaryLabel="Unique Accounts"
              colorClass="bg-gradient-to-br from-violet-500 to-violet-700"
              delay={0}
              stats={[
                { label: 'Policy Entries', value: fmtN.format(acc.policy_count ?? 0) },
                { label: 'Target Format', value: acc.target_format ?? '—' },
              ]}
            />
            <MetricCard
              icon={MapPin}
              title="Location File"
              primary={fmtN.format(loc.row_count ?? 0)}
              primaryLabel="Total Locations"
              colorClass="bg-gradient-to-br from-emerald-500 to-emerald-700"
              delay={100}
              stats={[
                { label: 'Total TIV', value: fmt.format(loc.total_tiv ?? 0) },
                { label: 'Geocode Rate', value: fmtPct(loc.geocode_rate_pct) },
              ]}
            />
            <MetricCard
              icon={FileText}
              title="Policy File"
              primary={fmtN.format(pol.row_count ?? 0)}
              primaryLabel="Policy Rows"
              colorClass="bg-gradient-to-br from-amber-500 to-amber-700"
              delay={200}
              stats={[
                { label: 'Total Limit',      value: fmt.format(pol.total_limit ?? 0) },
                { label: 'Total Deductible', value: fmt.format(pol.total_deductible ?? 0) },
              ]}
            />
          </>
        )}
      </div>

      {/* ── Tabbed Tables ───────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-border/30 shadow-sm overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-border/30 bg-muted/20">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-[12px] font-semibold transition-all relative',
                activeTab === key
                  ? 'text-primary bg-white border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 tabular-nums',
                activeTab === key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}>
                {typeof counts[key] === 'number' ? fmtN.format(counts[key]) : counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Policy Extract (Slip Coding) */}
        {activeTab === 'policy' && (
          <PolicyExtractPanel slip={policyData?.slip_extract} />
        )}

        {/* Active table */}
        <SimDataTable
          {...tableProps[activeTab]}
          uploadId={uploadId}
          fileKey={activeTab}
        />
      </div>

    </div>
  );
}
