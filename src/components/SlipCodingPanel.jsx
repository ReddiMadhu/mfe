/**
 * SlipCodingPanel — Read-only result viewer for the Insurance Terms (epPolicy) node.
 * The PDF is uploaded and extracted on the Configure page.
 * This panel reads slipCodingResult from Zustand and displays it.
 */
import { useState } from 'react';
import {
  FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  FileSearch, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { usePipelineStore } from '@/store/usePipelineStore';

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfBadge({ level }) {
  const map = {
    high:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium:    'bg-amber-50 text-amber-700 border-amber-200',
    low:       'bg-rose-50 text-rose-700 border-rose-200',
    not_found: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', map[level] ?? map.not_found)}>
      {level ?? 'not_found'}
    </span>
  );
}

// ── Account file table ────────────────────────────────────────────────────────
function AccountTable({ rows, columns }) {
  if (!rows?.length) return <p className="text-[11px] text-slate-400 italic">No rows extracted.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100 mt-2">
      <table className="w-full text-[10px] border-collapse min-w-max">
        <thead className="bg-slate-50">
          <tr>
            {columns.map(c => (
              <th key={c} className="px-2 py-1.5 text-left font-bold text-slate-500 border-b border-slate-100 whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/60' : ''}>
              {columns.map(c => (
                <td key={c} className="px-2 py-1.5 text-slate-700 border-b border-slate-50 whitespace-nowrap font-mono">
                  {row[c] != null ? String(row[c]) : <span className="text-slate-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Extraction summary accordion ──────────────────────────────────────────────
function ExtractionSummary({ summary }) {
  const [open, setOpen] = useState(false);
  if (!summary?.length) return null;
  const flags = summary.filter(e => e.flag);

  return (
    <div className="mt-3 border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <FileSearch size={12} className="text-slate-500 shrink-0" />
        <span className="text-[11px] font-bold text-slate-600">Extraction Summary</span>
        <Badge variant="outline" className="ml-1 text-[9px] border-slate-200 text-slate-500">{summary.length} fields</Badge>
        {flags.length > 0 && (
          <Badge variant="outline" className="text-[9px] border-rose-200 text-rose-600 bg-rose-50">{flags.length} flags</Badge>
        )}
        <div className="flex-1" />
        {open ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
          {summary.map((entry, i) => (
            <div key={i} className="px-3 py-2 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <code className="text-[10px] font-mono font-bold text-slate-700">{entry.field}</code>
                  <ConfBadge level={entry.confidence} />
                </div>
                {entry.source_text && (
                  <p className="text-[10px] text-slate-500 italic truncate" title={entry.source_text}>"{entry.source_text}"</p>
                )}
                {entry.flag && (
                  <p className="text-[10px] text-rose-600 flex items-center gap-1 mt-0.5">
                    <AlertCircle size={9} /> {entry.flag}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-600 shrink-0 ml-2">
                {entry.value != null ? String(entry.value) : <span className="text-slate-300">null</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Location file updates ─────────────────────────────────────────────────────
function LocationUpdates({ updates }) {
  const nonNull = updates ? Object.entries(updates).filter(([k, v]) => v != null && k !== 'ACCNTNUM') : [];
  if (!nonNull.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Location File Updates</p>
      <div className="grid grid-cols-2 gap-1">
        {nonNull.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between bg-sky-50 border border-sky-100 rounded-md px-2 py-1">
            <code className="text-[9px] font-mono text-sky-700">{k}</code>
            <span className="text-[9px] font-bold text-sky-800">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
const RMS_COLS = ['POLICYNUM','POLICYTYPE','BLANLIMAMT','PARTOF','UNDCOVAMT','BLANDEDAMT','INCEPTDATE','EXPIREDATE'];
const AIR_COLS = ['LayerID','LayerPerils','LimitType','Limit1','AttachmentAmt','DedType','DedAmt1','InceptionDate'];

// ── Main export ───────────────────────────────────────────────────────────────
export default function SlipCodingPanel({ epPolicyFile, onCsvUploadClick, isCsvUploading }) {
  const [formatView, setFormatView] = useState('RMS');

  const {
    slipCodingResult, slipCodingStatus, slipPdfName, targetFormat,
  } = usePipelineStore();

  const isDone    = slipCodingStatus === 'done' && !!slipCodingResult;
  const isRunning = slipCodingStatus === 'running';

  const rows    = formatView === 'RMS' ? slipCodingResult?.rms_account_file : slipCodingResult?.air_contract_file;
  const cols    = formatView === 'RMS' ? RMS_COLS : AIR_COLS;
  const locUpd  = slipCodingResult?.location_file_updates;
  const summary = slipCodingResult?.extraction_summary;

  return (
    <div className="space-y-3">

      {/* Not yet extracted — point user to configure page */}
      {!isDone && !isRunning && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
            <FileText size={20} className="text-violet-400" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-600">No policy slip uploaded yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Upload a PDF slip on the Configure page to extract policy terms.</p>
          </div>
        </div>
      )}

      {/* Extracting in progress */}
      {isRunning && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Loader2 size={24} className="text-violet-500 animate-spin" />
          <p className="text-xs font-semibold text-violet-600">Extracting policy terms via AI…</p>
        </div>
      )}

      {/* Result view */}
      {isDone && (
        <div className="space-y-3 animate-in fade-in duration-300">

          {/* Format toggle + column mapping label — side by side */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Column Mappings</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-medium">View as:</span>
              {['RMS', 'AIR'].map(f => (
                <button key={f} onClick={() => setFormatView(f)}
                  className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all',
                    formatView === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-slate-200 text-slate-500 hover:border-primary/40'
                  )}>
                  {f}
                </button>
              ))}
              <span className="ml-1 text-[9px] text-slate-400">{formatView === 'RMS' ? 'Account File' : 'Contract File'}</span>
            </div>
          </div>

          {/* Account/Contract table */}
          <AccountTable rows={rows} columns={cols} />

          {/* Location updates */}
          <LocationUpdates updates={locUpd} />

          {/* Extraction summary */}
          <ExtractionSummary summary={summary} />
        </div>
      )}
    </div>
  );
}
