import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Upload, FileSpreadsheet, Tag, BarChart3, Globe, MapPin,
  CheckCircle2, Loader2, AlertCircle, Play, Brain, X,
  ArrowRight, Sparkles, Building2, Lock, ChevronUp, ChevronDown,
  TrendingUp, FileText, Activity, Check,
} from 'lucide-react';
import {
  uploadFile, runGeocode,
  suggestColumns, confirmColumns, runMapCodes, runNormalizeValues, forgetMapping,
  uploadPolicyFile, configureFrequency, getEpCurveStatus, generateEpCurve, runEpHazardAssessment,
  applySlipToSession, extractSlipStandalone,
} from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AgentGraph from '@/components/AgentGraph';
import EpNodeInfoPanel from '@/components/EpNodeInfoPanel';
import { DashboardView } from './DonePage';
import StepDiffTable from '@/components/StepDiffTable';

// ── Canonical field lists ──────────────────────────────────────────────────
const AIR_FIELDS = ['PolicyID', 'InsuredName', 'LocationID', 'LocationName', 'FullAddress', 'Street', 'City', 'Area', 'PostalCode', 'CountryISO', 'Latitude', 'Longitude', 'OccupancyCodeType', 'OccupancyCode', 'ConstructionCodeType', 'ConstructionCode', 'RiskCount', 'NumberOfStories', 'GrossArea', 'YearBuilt', 'YearRetrofitted', 'TIV', 'BuildingValue', 'ContentsValue', 'TimeElementValue', 'Currency', 'LineOfBusiness', 'SprinklerSystem', 'RoofGeometry', 'FoundationType', 'WallSiding', 'SoftStory', 'WallType'];
const RMS_FIELDS = ['ACCNTNUM', 'LOCNUM', 'LOCNAME', 'STREETNAME', 'CITY', 'STATECODE', 'POSTALCODE', 'CNTRYCODE', 'Latitude', 'Longitude', 'BLDGSCHEME', 'BLDGCLASS', 'OCCSCHEME', 'OCCTYPE', 'NUMBLDGS', 'NUMSTORIES', 'FLOORAREA', 'YEARBUILT', 'YEARUPGRAD', 'SPRINKLER', 'ROOFGEOM', 'FOUNDATION', 'CLADDING', 'SOFTSTORY', 'WALLTYPE', 'TIV', 'EQCV1VAL', 'EQCV2VAL', 'WSCV1VAL', 'WSCV2VAL', 'WSCV3VAL'];

const CONFIDENCE_BG = (s) => s >= 0.8 ? 'bg-green-500' : s >= 0.5 ? 'bg-amber-500' : 'bg-rose-500';
const CONFIDENCE_COLOR = (s) => s >= 0.8 ? 'text-green-400' : s >= 0.5 ? 'text-amber-400' : 'text-rose-400';
const NONE_VALUE = '__none__';

// ── Collapsible GenAI Summary (bullet points) ──────────────────────────────
function CollapsibleSummary({ summaryText }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!summaryText) return null;

  // Parse: new format is JSON with { points: [...] }, legacy is plain text
  let points = [];
  try {
    const parsed = JSON.parse(summaryText);
    if (Array.isArray(parsed?.points)) {
      points = parsed.points;
    }
  } catch {
    // Legacy plain text — split by sentences
    points = summaryText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (points.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-left group w-full"
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-primary dark:text-orange-400">
          GenAI Summary
        </span>
        <Badge variant="outline" className="text-[9px] border-primary/25 dark:border-orange-500/35 text-primary/70 dark:text-orange-300/90 ml-1">
          {points.length} insights
        </Badge>
        <div className="flex-1" />
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </button>

      {!collapsed && (
        <ul className="space-y-2 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
          {points.map((pt, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] text-foreground/85 dark:text-zinc-200 leading-relaxed">
              <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-primary/50 dark:bg-orange-500/60 shrink-0" />
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// ── Section wrapper — one visible at a time, Agent Network is the nav ──────
function Section({ stepNum, activeViewStep, title, icon: Icon, badge, headerAction, subHeader, children }) {
  // Only render when this is the currently viewed step — invisible otherwise
  if (activeViewStep !== stepNum) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/20 bg-primary/5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-primary/15 text-primary">
          <Icon size={12} />
        </div>
        <h2 className="font-bold text-xs text-foreground">{title}</h2>
        {badge && (
          <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">{badge}</Badge>
        )}
        {!badge && <div className="flex-1" />}
        {headerAction && (
          <div className="ml-auto pl-3">
            {headerAction}
          </div>
        )}
      </div>
      {subHeader && (
        <div className="px-5 py-3 border-b border-border/15 bg-primary/[0.02]">
          {subHeader}
        </div>
      )}
      <div className="p-0 sm:p-5">{children}</div>
    </div>
  );
}


// ── Inline data preview table ──────────────────────────────────────────────
function DataPreviewTable({ headers, rows }) {
  if (!headers?.length || !rows?.length) return null;
  return (
    <div className="rounded-xl border border-border/40 overflow-hidden bg-background">
      <div className="max-h-52 overflow-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <tr>
              {headers.map(h => (
                <th key={h} className="px-3 py-2 border-b border-border/40 font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-primary/5 transition-colors">
                {headers.map(h => (
                  <td key={h} className="px-3 py-2 truncate max-w-[180px] text-foreground/80">{row[h] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Step 1: Acquire Data ───────────────────────────────────────────────────
function AcquireStep({ onStartPipeline }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const { setUploadId, setUploadMeta, setStepStatus, uploadMeta, uploadId, clearPipelineExecution } = usePipelineStore();
  const inputRef = useRef();

  const uploadMutation = useMutation({
    mutationFn: (f) => uploadFile(f instanceof File ? f : file, 'AIR', {}),
    onSuccess: (data) => {
      clearPipelineExecution();
      setUploadId(data.upload_id);
      setUploadMeta({ row_count: data.row_count, headers: data.headers, sample: data.sample ?? [] });
    },
    onError: (err) => console.error(`Upload failed: ${err.message}`),
  });

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      uploadMutation.mutate(f);
    }
  }, [uploadMutation]);

  // ── Post-upload: show preview + start button ──
  if (uploadMeta) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <DataPreviewTable headers={uploadMeta.headers} rows={uploadMeta.sample} />
      </div>
    );
  }

  // ── Pre-upload: file picker ──
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
        'bg-muted/15 dark:bg-muted/25',
        dragging ? 'border-primary bg-primary/10' :
          file ? 'border-primary/70 bg-primary/10' :
            'border-foreground/20 dark:border-zinc-500 hover:border-primary/60 hover:bg-primary/5',
      )}
    >
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) {
            setFile(f);
            uploadMutation.mutate(f);
          }
        }} />
      {file ? (
        <div className="flex flex-col items-center gap-2">
          {uploadMutation.isPending ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <FileSpreadsheet className="w-10 h-10 text-primary" />}
          <p className="font-semibold text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {uploadMutation.isPending ? 'Uploading...' : `${(file.size / 1024).toFixed(1)} KB`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-10 h-10 text-muted-foreground/70" />
          <p className="text-sm font-medium text-foreground">Drag & drop or <span className="text-primary underline">browse</span></p>
          <p className="text-xs text-muted-foreground">CSV, XLSX, XLS supported</p>
        </div>
      )}
    </div>
  );
}


// ── Simulated Progress Polling Component ─────────────────────────────────────
function SimulatedProgressText({ isRunning, isDone, totalRows, label }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isRunning && totalRows > 0) {
      // Slower polling to accurately reflect real-world API call timing per row
      const msPerRow = 25000 / totalRows; // approx ~2.5 seconds per row
      const interval = setInterval(() => {
        setCount(c => (c < totalRows - 1 ? c + 1 : c));
      }, Math.max(1200, msPerRow));
      return () => clearInterval(interval);
    }
  }, [isRunning, totalRows]);

  useEffect(() => {
    if (isDone) setCount(totalRows);
  }, [isDone, totalRows]);

  if (!isRunning && !isDone) return null;

  return (
    <div className="p-5 font-mono text-sm text-center text-muted-foreground bg-primary/5 border border-primary/20 rounded-2xl animate-pulse">
      {label} {count} / {totalRows || '?'} properties...
    </div>
  );
}

// ── Step 3: Geocode (auto-runs, shows StepDiffTable) ──────────────────────
function GeocodeStep({ activeId, viewMode }) {
  const { stepStatus, uploadMeta, geocodeDiff } = usePipelineStore();
  // isRunning from stepStatus (set by geocodeMutation.onMutate/onSuccess in main PipelinePage)
  const isRunning = stepStatus.geocode === 'running';
  // isDone only when the API response has populated geocodeDiff
  const isDone = !!geocodeDiff;
  const total = uploadMeta?.row_count || 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {isRunning && <SimulatedProgressText isRunning={isRunning} isDone={isDone} totalRows={total} label="Processing Data Agent for" />}
      {isDone && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 -mx-5 -mb-5 sm:mx-0 sm:mb-0 border-t sm:border-t-0 border-border/50">
          <div className="h-[450px] rounded-b-2xl sm:rounded-xl overflow-hidden border border-border/40">
            <StepDiffTable uploadId={activeId} step="geocode" stepColor="text-rose-500" stepBgColor="bg-rose-500/10" preloadedData={geocodeDiff} viewMode={viewMode} />
          </div>
        </div>
      )}
    </div>
  );
}


// ── Step 4b: Underwriting stub ────────────────────────────────────────────
function UnderwritingStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
        <Building2 className="w-8 h-8 text-blue-400" />
      </div>
      <div>
        <h3 className="font-bold text-foreground mb-1">UNDERWRITING AGENT</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          The automated underwriting pipeline is under development. Your geocoded data is ready for manual review.
        </p>
      </div>
      <Badge variant="outline" className="border-blue-300/50 text-blue-500 text-[11px]">Coming Soon</Badge>
    </div>
  );
}

// TargetFormatStep has been merged into MappingStep

// ── Step 5/6: Column Mapping (Merged with Format Selection) ────────────────
function MappingStep({ uploadId, targetFormat, onDone }) {
  const { setColumnMap, agentStates } = usePipelineStore();
  const [localMap, setLocalMap] = useState({});
  const canonicalOptions = targetFormat === 'RMS' ? RMS_FIELDS : AIR_FIELDS;

  const { data, isLoading } = useQuery({
    queryKey: ['suggest-columns', uploadId, targetFormat],
    queryFn: () => suggestColumns(uploadId, targetFormat),
    enabled: !!uploadId,
    staleTime: Infinity,
    retry: 1,
  });

  useEffect(() => {
    if (!data?.suggestions) return;
    const candidates = Object.entries(data.suggestions).map(([col, sugs]) =>
      sugs?.length > 0 ? { col, canonical: sugs[0].canonical, score: sugs[0].score } : null
    ).filter(Boolean).sort((a, b) => b.score - a.score);
    const claimed = new Set();
    const initial = {};
    for (const col of Object.keys(data.suggestions)) initial[col] = null;
    for (const { col, canonical, score } of candidates) {
      if (canonical && !claimed.has(canonical) && score >= 0.5) { initial[col] = canonical; claimed.add(canonical); }
    }
    setLocalMap(initial);
  }, [data]);

  const sourceColumns = data?.suggestions ? Object.keys(data.suggestions) : [];
  const canonicalUsedBy = {};
  for (const [col, canonical] of Object.entries(localMap)) {
    if (canonical) { if (!canonicalUsedBy[canonical]) canonicalUsedBy[canonical] = []; canonicalUsedBy[canonical].push(col); }
  }
  const duplicateCanonicals = new Set(Object.entries(canonicalUsedBy).filter(([, s]) => s.length > 1).map(([c]) => c));
  const mappedCount = Object.values(localMap).filter(Boolean).length;

  const confirmMutation = useMutation({
    mutationFn: () => confirmColumns(uploadId, localMap),
    onSuccess: (result) => {
      setColumnMap(localMap);
      onDone();
    },
    onError: (err) => console.error(`Confirm failed: ${err.message}`),
  });

  const { mutate: forget } = useMutation({
    mutationFn: ({ sourceCol }) => forgetMapping(sourceCol, targetFormat),
    onSuccess: () => {},
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-12 gap-4 px-5 py-2 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 rounded-t-xl">
        <div className="col-span-3">Source Column</div>
        <div className="col-span-3">Sample Values</div>
        <div className="col-span-3">Map To</div>
        <div className="col-span-2">Confidence</div>
        <div className="col-span-1 text-center">✓</div>
      </div>
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {isLoading ? [...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3 items-center">
            {[3, 3, 3, 2, 1].map((span, j) => (
              <div key={j} className={`col-span-${span}`}><Skeleton className="h-6 w-full rounded-lg" /></div>
            ))}
          </div>
        )) : sourceColumns.map(col => {
          const suggestions = data.suggestions[col] ?? [];
          const topSug = suggestions[0] ?? null;
          const currentValue = localMap[col] ?? null;
          const isMapped = !!currentValue;
          const isDuplicate = currentValue && duplicateCanonicals.has(currentValue);
          const score = topSug?.score ?? 0;
          const usedByOthers = new Set(Object.entries(localMap).filter(([c, v]) => c !== col && v).map(([, v]) => v));
          return (
            <div key={col} className={cn('grid grid-cols-12 gap-4 px-5 py-3 items-center transition-colors',
              isDuplicate ? 'bg-rose-500/8 border-l-2 border-rose-500/60' : !isMapped ? 'bg-amber-500/5' : 'hover:bg-accent/20')}>
              <div className="col-span-3">
                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded-md break-all">{col}</code>
              </div>
              <div className="col-span-3">
                {(() => {
                  const samples = data?.sample_values?.[col] ?? [];
                  if (samples.length === 0) return <span className="text-[10px] text-muted-foreground/50 italic">—</span>;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {samples.slice(0, 3).map((v, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-1 rounded-md bg-muted/70 dark:bg-muted/50 border border-border/40 text-[12px] leading-snug font-mono text-foreground/85 dark:text-foreground/90 max-w-[140px] truncate"
                        >
                          {String(v)}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="col-span-3">
                <Select value={currentValue ?? NONE_VALUE} onValueChange={v => setLocalMap(m => ({ ...m, [col]: v === NONE_VALUE ? null : v }))}>
                  <SelectTrigger className={cn('h-7 text-xs rounded-lg', !isMapped && 'border-amber-500/50 text-amber-500')}>
                    <SelectValue placeholder="— skip —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value={NONE_VALUE}><span className="text-muted-foreground italic">— skip —</span></SelectItem>
                    {canonicalOptions.map(opt => {
                      const taken = usedByOthers.has(opt);
                      return <SelectItem key={opt} value={opt} disabled={taken} className={cn(taken && 'opacity-40 line-through')}>{opt}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                {topSug?.method === 'memory' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-[10px] font-semibold">
                    <Brain className="w-2.5 h-2.5" /> Memory
                  </span>
                ) : topSug ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', CONFIDENCE_BG(score))} style={{ width: `${(score * 100).toFixed(0)}%` }} />
                    </div>
                    <span className={cn('text-[10px] font-mono', CONFIDENCE_COLOR(score))}>{(score * 100).toFixed(0)}%</span>
                  </div>
                ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
              </div>
              <div className="col-span-1 flex justify-center items-center gap-1">
                {isDuplicate ? <AlertCircle className="w-4 h-4 text-rose-400" /> :
                  isMapped ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                    <AlertCircle className="w-4 h-4 text-amber-400" />}
                {topSug?.method === 'memory' && (
                  <button onClick={() => forget({ sourceCol: col })}
                    className="w-4 h-4 flex items-center justify-center rounded-full text-violet-400/60 hover:text-rose-400 transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-1 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-400" />{mappedCount} mapped · {sourceColumns.length - mappedCount} skipped
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wide',
            targetFormat === 'AIR'
              ? 'border-amber-300/70 text-amber-950 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-100'
              : 'border-sky-300/70 text-sky-950 bg-sky-50/80 dark:border-sky-500/40 dark:bg-sky-950/50 dark:text-sky-100',
          )}
        >
          {targetFormat}
        </Badge>
      </div>
      <Button
        onClick={() => confirmMutation.mutate()}
        disabled={confirmMutation.isPending || isLoading || sourceColumns.length === 0 || duplicateCanonicals.size > 0}
        className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-11 hover:opacity-90 transition-all disabled:opacity-40"
      >
        {confirmMutation.isPending
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting CAT pipeline…</>
          : <>Start Cat Agent <Play className="w-4 h-4 ml-2 fill-current" /></>}
      </Button>
    </div>
  );
}

// ── Step 7: Map Codes ──────────────────────────────────────────────────────
function CodeMappingStep({ uploadId, onDone, viewMode }) {
  const { stepStatus, setStepStatus, uploadMeta, setMapCodesSummaryText, mapCodesDiff, setMapCodesDiff } = usePipelineStore();
  const total = uploadMeta?.row_count || 0;

  const mapCodesMutation = useMutation({
    mutationFn: () => runMapCodes(uploadId),
    onMutate: () => setStepStatus('mapCodes', 'running'),
    onSuccess: (data) => {
      setStepStatus('mapCodes', 'done');
      if (data?.summary_text) setMapCodesSummaryText(data.summary_text);
      if (data?.diff_data) setMapCodesDiff(data.diff_data);
      onDone();
    },
    onError: (err) => { setStepStatus('mapCodes', 'error'); console.error(err.message); },
  });

  // isRunning: spinner only when API is actively in-flight
  const isRunning = mapCodesMutation.isPending;
  // isDone: table only when API response returned diff data
  const isDone = !!mapCodesDiff;

  useEffect(() => {
    if (!stepStatus.mapCodes || stepStatus.mapCodes === 'idle') mapCodesMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {isRunning && <SimulatedProgressText isRunning={isRunning} isDone={isDone} totalRows={total} label="Mapping Occupancy & Construction for" />}
      {isDone && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 -mx-5 -mb-5 sm:mx-0 sm:mb-0 border-t sm:border-t-0 border-border/50">
          <div className="h-[450px] rounded-b-2xl sm:rounded-xl overflow-hidden border border-border/40">
            <StepDiffTable uploadId={uploadId} step="map-codes" stepColor="text-violet-500" stepBgColor="bg-violet-500/10" preloadedData={mapCodesDiff} viewMode={viewMode} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 8: Normalize Values ──────────────────────────────────────────────
function NormalizeValuesStep({ uploadId, onDone, viewMode }) {
  const { stepStatus, setStepStatus, setCatResult, uploadMeta, setNormalizeSummaryText, normalizeDiff, setNormalizeDiff } = usePipelineStore();
  const total = uploadMeta?.row_count || 0;

  const normalizeMutation = useMutation({
    mutationFn: () => runNormalizeValues(uploadId),
    onMutate: () => setStepStatus('normalizeValues', 'running'),
    onSuccess: (data) => {
      setStepStatus('normalizeValues', 'done');
      setCatResult(data);
      if (data?.summary_text) setNormalizeSummaryText(data.summary_text);
      if (data?.diff_data) setNormalizeDiff(data.diff_data);
      onDone();
    },
    onError: (err) => { setStepStatus('normalizeValues', 'error'); console.error(err.message); },
  });

  // isRunning: spinner only when API is actively in-flight
  const isRunning = normalizeMutation.isPending;
  // isDone: table only when API response returned diff data
  const isDone = !!normalizeDiff;

  useEffect(() => {
    if (!stepStatus.normalizeValues || stepStatus.normalizeValues === 'idle') normalizeMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {isRunning && <SimulatedProgressText isRunning={isRunning} isDone={isDone} totalRows={total} label="Normalizing values for" />}
      {isDone && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 -mx-5 -mb-5 sm:mx-0 sm:mb-0 border-t sm:border-t-0 border-border/50">
          <div className="h-[450px] rounded-b-2xl sm:rounded-xl overflow-hidden border border-border/40">
            <StepDiffTable uploadId={uploadId} step="normalize" stepColor="text-amber-500" stepBgColor="bg-amber-500/10" preloadedData={normalizeDiff} viewMode={viewMode} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Runs Annual Simulation (EP curve) as soon as SOV COPE + policy/slip inputs are ready.
 * Must NOT live inside Section(activeViewStep===10): after normalize the user stays on
 * step 9 (dashboard), so EpCurveStep would never mount and the effect would never fire.
 */
function EpCurveAutoRunner({ uploadId, onDone }) {
  const {
    epPolicyFile,
    slipCodingResult,
    epCurveResult,
    setEpCurveResult,
    setStepStatus,
    stepStatus,
  } = usePipelineStore();

  const sovDone = stepStatus.normalizeValues === 'done' || stepStatus.mapCodes === 'done';
  const policyReady = !!epPolicyFile?.row_count || !!slipCodingResult;
  const allReady = sovDone && policyReady;

  useEffect(() => {
    if (!uploadId) return;
    if (allReady && !epCurveResult && (stepStatus.epCurve === 'idle' || stepStatus.epCurve === 'error')) {
      setStepStatus('epCurve', 'running');

      const run = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const data = await generateEpCurve(uploadId);
          setStepStatus('epCurve', 'done');
          setEpCurveResult(data);
          onDone?.();
        } catch (err) {
          setStepStatus('epCurve', 'error');
          console.error(err.message);
        }
      };

      run();
    }
  }, [allReady, epCurveResult, stepStatus.epCurve, setStepStatus, uploadId, setEpCurveResult, onDone]);

  return null;
}

// ── Step 10: EP Curve Generation ──────────────────────────────────────────
function EpCurveStep({ uploadId }) {
  const {
    epPolicyFile, setEpPolicyFile,
    epCurveResult,
    stepStatus, uploadMeta,
    slipCodingResult,
  } = usePipelineStore();

  const [freqForm, setFreqForm] = useState({
    num_simulations: 10000,
    time_horizon_years: 1,
    frequency_model: 'poisson',
  });

  const inputRef = useRef();
  const sovDone = stepStatus.normalizeValues === 'done' || stepStatus.mapCodes === 'done';

  // Policy file upload
  const policyMutation = useMutation({
    mutationFn: (file) => uploadPolicyFile(uploadId, file),
    onSuccess: (data) => {
      setEpPolicyFile({ row_count: data.row_count, headers: data.headers, sample: data.sample, fileName: data.file_name });
    },
    onError: (err) => console.error(`Policy upload failed: ${err.message}`),
  });

  // (Frequency config removed as simulations are placeholders)

  // (Hazard Assessment removed per user request)

  // Auto-apply slip coding result (extracted on Configure page) to session
  // NOTE: This is intentionally a no-op at the EpCurveStep level.
  // The actual apply logic lives in the main PipelinePage component (see handleUploaded).

  const policyReady = !!epPolicyFile?.row_count || !!slipCodingResult;
  const readyCount = (sovDone ? 2 : 0) + (policyReady ? 1 : 0);
  const allReady = sovDone && policyReady;

  const SubCard = ({ title, desc, ready, color, children }) => (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      ready
        ? 'border-emerald-200 dark:border-emerald-700/45 bg-emerald-50/50 dark:bg-emerald-950/25'
        : color === 'orange'
          ? 'border-orange-200 dark:border-orange-700/40 bg-orange-50/30 dark:bg-orange-950/20'
          : 'border-border bg-muted/30 dark:bg-zinc-900/40'
    )}>
      <div className="flex items-center gap-2 mb-1">
        {ready
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          : color === 'orange'
            ? <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            : <Loader2 className="w-4 h-4 text-muted-foreground shrink-0" />
        }
        <span className="text-xs font-bold text-foreground">{title}</span>
        {ready && <Badge variant="outline" className="ml-auto text-[9px] border-emerald-300 text-emerald-600">Ready</Badge>}
        {!ready && color === 'orange' && <Badge variant="outline" className="ml-auto text-[9px] border-orange-300 text-orange-600">Required</Badge>}
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">{desc}</p>
      {children}
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Location File — green */}
        <SubCard title="Exposure & Geography (Location File)" desc="Auto-populated from SOV COPE output." ready={sovDone} color="green">
          {sovDone && <p className="text-[10px] text-emerald-600 font-medium">{uploadMeta?.row_count || '—'} rows from SOV Agent</p>}
        </SubCard>


        {/* Account File — green */}
        <SubCard title="Portfolio Roll-up (Account File)" desc="Auto-populated from SOV COPE output." ready={sovDone} color="green">
          {sovDone && <p className="text-[10px] text-emerald-600 font-medium">Account data from SOV Agent</p>}
        </SubCard>

        {/* Policy File — orange */}
        <SubCard title="Insurance Terms (Policy File)" desc="Upload: Policy_ID, Account_ID, Limit, Deductible, Coverage_Type, Policy_Type" ready={policyReady} color="orange">
          {policyReady ? (
            <p className="text-[10px] text-emerald-600 font-medium">
              {slipCodingResult ? `AI Slip Coded — ${slipCodingResult.rms_account_file?.length ?? 0} peril rows` : `${epPolicyFile?.row_count} rows uploaded`}
            </p>
          ) : (
            <div>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) policyMutation.mutate(f); }} />
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}
                disabled={policyMutation.isPending}
                className="h-7 text-[10px] font-semibold border-orange-300 text-orange-600 hover:bg-orange-50">
                {policyMutation.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploading…</> : <><Upload className="w-3 h-3 mr-1" />Upload Policy File</>}
              </Button>
            </div>
          )}
        </SubCard>

      </div>

      {/* Readiness + Auto Generate Status */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground font-medium">{readyCount}/3 inputs ready</span>
        {allReady && !epCurveResult && (
          <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Executing Annual Simulation…</span>
          </div>
        )}
      </div>

      {/* View Dashboard CTA — shown after successful generation */}
      {epCurveResult && (
        <div className="mt-2 rounded-xl border border-emerald-200/80 dark:border-emerald-600/35 bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/25 dark:bg-gradient-to-br p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-950 dark:text-emerald-100">Annual Simulation Completed</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/90 mt-0.5">
                Final output file, location file, and account file generated.
              </p>
            </div>
          </div>
          <Button asChild className="gradient-primary glow-primary text-white font-semibold rounded-xl h-9 px-5 hover:opacity-90 transition-all shrink-0">
            <Link to={`/simulation/${uploadId}/dashboard`}>
              View Simulation Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main PipelinePage ──────────────────────────────────────────────────────
export default function PipelinePage() {
  const { id: routeId } = useParams();
  const {
    uploadId, setUploadId, uploadMeta, stepStatus, setStepStatus,
    targetFormat, setTargetFormat, agentStates, setNormalizeResult, setGeocodeResult,
    activeViewStep, setActiveViewStep, agentType, setAgentType,
    executionStep: step, setExecutionStep: setStep,
    mapCodesSummaryText, normalizeSummaryText,
    setGeocodeDiff, selectedAgents,
  } = usePipelineStore();

  const activeId = routeId || uploadId;
  useAgentStream(activeId);

  const [viewModes, setViewModes] = useState({ geocode: 'cleaned', mapCodes: 'cleaned', normalize: 'cleaned' });
  const updateViewMode = (stepKey, mode) => setViewModes(prev => ({ ...prev, [stepKey]: mode }));

  // EP node info panel state
  const [activeEpNode, setActiveEpNode] = useState(null);
  // Track the activeViewStep that was in place before an EP panel was opened so we can restore it on close
  const prevViewStepRef = useRef(null);
  const {
    epPolicyFile, uploadMeta: epUploadMeta,
  } = usePipelineStore();
  const epPolicyInputRef = useRef(null);

  const { setEpPolicyFile } = usePipelineStore();
  const epPolicyMutation = useMutation({
    mutationFn: (file) => uploadPolicyFile(activeId, file),
    onSuccess: (data) => {
      setEpPolicyFile({ row_count: data.row_count, headers: data.headers, sample: data.sample, fileName: data.file_name });
    },
    onError: (err) => console.error(`Policy upload failed: ${err.message}`),
  });

  const ViewToggle = ({ stepKey }) => (
    <div className="flex items-center gap-3 bg-card/50 px-2 py-1 rounded-md border border-border/50">
      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-foreground">
        <input type="radio" checked={viewModes[stepKey] === 'cleaned'} onChange={() => updateViewMode(stepKey, 'cleaned')} className="h-3 w-3 accent-primary cursor-pointer" />
        Cleaned
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-muted-foreground">
        <input type="radio" checked={viewModes[stepKey] === 'combined'} onChange={() => updateViewMode(stepKey, 'combined')} className="h-3 w-3 accent-primary cursor-pointer" />
        Original & Cleaned
      </label>
    </div>
  );

  // Execution cursor: 1=acquire, 2=normalize, 3=geocode, 4=agentSelect, 5=format(CatAI)/underwriting,
  // Handle direct navigation to an existing session
  useEffect(() => {
    if (routeId && uploadId !== routeId) {
      setUploadId(routeId);
    }
  }, [routeId, uploadId, setUploadId]);

  // Advance both execution cursor and view together
  const advance = useCallback((n) => {
    setStep(n);
    setActiveViewStep(n);
  }, [setActiveViewStep, setStep]);

  const geocodeMutation = useMutation({
    mutationFn: (uploadIdForGeo) => runGeocode(uploadIdForGeo),
    onMutate: () => setStepStatus('geocode', 'running'),
    onSuccess: (data) => {
      setStepStatus('geocode', 'done');
      setGeocodeResult(data);
      if (data?.diff_data) setGeocodeDiff(data.diff_data);
    },
    onError: (err) => {
      setStepStatus('geocode', 'error');
      const msg = err?.message || 'unknown error';
      if (msg.includes('not found') || msg.includes('404')) {
        console.error(`Geocoding failed: session missing or expired — re-upload your SOV. (${msg})`);
      } else {
        console.error(`Geocoding failed: ${msg}`);
      }
    },
  });

  // Auto-run geocoding when step advances to 2 (pass id into mutate so we never use a stale activeId)
  useEffect(() => {
    if (step === 2 && (!stepStatus.geocode || stepStatus.geocode === 'idle') && activeId) {
      geocodeMutation.mutate(activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeId]);

  // Auto-advance to SOV COPE after geocode completes (based on Configure screen selection)
  const hasAutoAdvancedRef = useRef(false);

  // Reset auto-advance ref when starting a new pipeline
  useEffect(() => {
    if (step <= 1) hasAutoAdvancedRef.current = false;
  }, [step]);

  useEffect(() => {
    console.log('[PIPELINE DEBUG] geocode effect fired:', {
      geocodeStatus: stepStatus.geocode,
      step,
      hasAutoAdvanced: hasAutoAdvancedRef.current,
      sovCope: selectedAgents.sovCope,
      agentType,
    });
    // Relaxed step check: sometimes step might already be 3 (geocode) when this fires
    if (stepStatus.geocode === 'done' && step >= 2 && step <= 4 && !hasAutoAdvancedRef.current) {
      hasAutoAdvancedRef.current = true;
      console.log('[PIPELINE DEBUG] Auto-advancing → SOV COPE (catai)');
      if (selectedAgents.sovCope) {
        setAgentType('catai');
        advance(5);
      } else {
        console.warn('[PIPELINE DEBUG] sovCope is FALSE — not advancing! Go to Configure page and enable SOV COPE.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepStatus.geocode, step, selectedAgents.sovCope]);

  const handleUploaded = useCallback((id) => {
    setUploadId(id);
    advance(2);
  }, [setUploadId, advance]);

  // Auto-apply slip coding result (extracted on Configure page) to the new session.
  // Lives here (main PipelinePage) so it fires as soon as uploadId exists — not inside a conditional child component.
  const {
    slipCodingResult, slipCodingStatus, slipPdfName,
    setSlipCodingResult, setSlipCodingStatus, setSlipPdfName,
  } = usePipelineStore();
  useEffect(() => {
    if (activeId && slipCodingResult) {
      console.log('[SlipApply] Attempting to apply slip to session:', activeId, '| slip keys:', Object.keys(slipCodingResult));
      applySlipToSession(activeId, slipCodingResult)
        .then((res) => {
          console.log('[SlipApply] ✅ Applied:', res);
          if (res?.ok === false) {
            console.error(`Slip could not be saved: ${res?.reason || 'session not found'} — re-upload SOV or refresh.`);
            return;
          }
        })
        .catch((err) => {
          console.error('[SlipApply] ❌ Failed:', err?.message || err);
          console.error(`Slip apply failed: ${err?.message || 'unknown error'}`);
        });
    } else {
      console.log('[SlipApply] Skipped — activeId:', activeId, '| slipResult present:', !!slipCodingResult);
    }
  // Only re-run when the ID or the slip data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, slipCodingResult]);

  // ── Slip Coding UI state (PDF upload in Upload SOV section) ──────────────────────────
  const slipInputRef = useRef(null);
  const [slipDragging, setSlipDragging] = useState(false);

  const slipExtractMutation = useMutation({
    mutationFn: (file) => extractSlipStandalone(file),
    onMutate: () => { setSlipCodingStatus('running'); },
    onSuccess: (data) => {
      setSlipCodingResult(data);
      setSlipCodingStatus('done');
      setSlipPdfName(data.pdf_name || '');
    },
    onError: (err) => {
      setSlipCodingStatus('error');
      console.error(`Extraction failed: ${err.message}`);
    },
  });

  const handleSlipFile = useCallback((file) => {
    if (!file?.name?.toLowerCase().endsWith('.pdf')) {
      return;
    }
    setSlipPdfName(file.name);
    slipExtractMutation.mutate(file);
  }, [slipExtractMutation]);

  const handleSlipDrop = useCallback((e) => {
    e.preventDefault(); setSlipDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleSlipFile(f);
  }, [handleSlipFile]);

  const handleSlipClear = () => {
    setSlipCodingResult(null);
    setSlipCodingStatus('idle');
    setSlipPdfName(null);
    if (slipInputRef.current) slipInputRef.current.value = '';
  };

  const isSlipRunning = slipCodingStatus === 'running';
  const isSlipDone = slipCodingStatus === 'done' && !!slipCodingResult;
  const isSlipError = slipCodingStatus === 'error';

  const slipPreviewFields = isSlipDone ? [
    { label: 'BLANLIMAMT', value: slipCodingResult.rms_account_file?.[0]?.BLANLIMAMT },
    { label: 'PARTOF', value: slipCodingResult.rms_account_file?.[0]?.PARTOF },
    { label: 'INCEPTDATE', value: slipCodingResult.rms_account_file?.[0]?.INCEPTDATE },
    { label: 'EXPIREDATE', value: slipCodingResult.rms_account_file?.[0]?.EXPIREDATE },
  ].filter(f => f.value != null) : [];

  // AgentGraph node click → navigate to that step's output (if reached)
  const handleNodeClick = useCallback((nodeStep) => {
    if (nodeStep <= step) {
      // If an EP panel is open, close it first (don't restore prevViewStep — we're navigating away)
      if (activeEpNode) {
        setActiveEpNode(null);
        prevViewStepRef.current = null;
      }
      setActiveViewStep(nodeStep);
    }
  }, [step, activeEpNode, setActiveViewStep]);

  const sectionProps = { activeViewStep };

  return (
    <section className="min-h-[calc(100vh-4rem)] w-full dark:bg-card">
      {/* pt-3 = half of former p-6 top inset; aligns with REGION_VERTICAL_GAP in AgentGraph */}
      <div className="px-6 pb-6 pt-3 w-full max-w-[1470px] mx-auto flex flex-col gap-5">

      {/* ── Agent Network (dark: recessed canvas — swapped vs page shell) ── */}
      <div className="bg-card dark:bg-background rounded-2xl border border-border/30 dark:border-border/50 px-3 py-2 shadow-sm">
        <AgentGraph
          activeId={activeId}
          agentStates={agentStates}
          stepStatus={stepStatus}
          onNodeClick={handleNodeClick}
          currentPipelineStep={step}
          isGeocodeDone={stepStatus.geocode === 'done'}
          onEpNodeClick={(id) => {
            if (id === activeEpNode) return; // same node — do nothing; use ✕ button to close
            // Opening a new EP node — save current view step and hide wizard sections
            prevViewStepRef.current = activeViewStep;
            setActiveEpNode(id);
            setActiveViewStep(null);  // hides all Section cards
          }}
        />
        {/* Hidden policy upload input */}
        <input
          ref={epPolicyInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) epPolicyMutation.mutate(f); }}
        />
      </div>

      {/* ── EP Node Detail Panel — below Agent Network, all 5 nodes ── */}
      {activeEpNode && (
        <EpNodeInfoPanel
          nodeId={activeEpNode}
          onClose={() => {
            setActiveEpNode(null);
            if (prevViewStepRef.current !== null) {
              setActiveViewStep(prevViewStepRef.current);
              prevViewStepRef.current = null;
            }
          }}
          uploadId={activeId}
          uploadMeta={epUploadMeta}
          epPolicyFile={epPolicyFile}
          stepStatus={stepStatus}
          onPolicyUploadClick={() => epPolicyInputRef.current?.click()}
          isPolicyUploading={epPolicyMutation.isPending}
        />
      )}

      {/* ── Wizard sections ───────────────────────────────── */}

      <Section {...sectionProps} stepNum={1} title="Upload SOV" icon={Upload}
        headerAction={uploadMeta ? (
          <Button
            onClick={() => handleUploaded(uploadId)}
            size="sm"
            className="gradient-primary glow-primary text-white h-8 text-xs font-semibold px-4 rounded-lg shadow-sm"
          >
            Start Agent Pipeline <Play className="w-3 h-3 ml-1.5" />
          </Button>
        ) : null}
      >
        <AcquireStep onStartPipeline={handleUploaded} />

        {/* ── AI Policy Slip Coding (theme-aware; dashed zone visible in dark + light) ── */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/35">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none dark:bg-primary/10" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm border border-primary/25">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">AI Policy Slip Coding</h3>
              <span className="ml-auto text-[10px] border border-border text-muted-foreground bg-muted/60 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Optional</span>
            </div>
            <p className="relative z-10 text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
              Upload an insurance policy slip PDF. AI-Powered Policy File Generation for EP curve.
            </p>

            {/* Drop zone */}
            {!isSlipDone && !isSlipRunning && !isSlipError && (
              <div
                onDragOver={e => { e.preventDefault(); setSlipDragging(true); }}
                onDragLeave={() => setSlipDragging(false)}
                onDrop={handleSlipDrop}
                onClick={() => slipInputRef.current?.click()}
                className={cn(
                  'relative z-10 group overflow-hidden rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all duration-300',
                  slipDragging
                    ? 'border-primary bg-primary/12 scale-[1.02] shadow-inner'
                    : 'border-foreground/18 dark:border-zinc-500 bg-muted/25 dark:bg-muted/35 hover:border-primary/55 hover:bg-primary/5',
                )}
              >
                <input ref={slipInputRef} type="file" accept=".pdf,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleSlipFile(f); }} />
                <div className={cn(
                  'mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300',
                  slipDragging ? 'bg-primary/25 scale-110' : 'bg-primary/12 group-hover:scale-110 group-hover:bg-primary/20'
                )}>
                  <Upload className={cn('h-4 w-4 transition-colors duration-300 text-primary', slipDragging && 'opacity-90')} />
                </div>
                <p className="text-[12px] font-bold text-foreground mb-0.5">{slipDragging ? 'Drop to upload' : 'Click or drag PDF here'}</p>
                <p className="text-[10px] font-medium text-muted-foreground">Max 50MB · PDF only</p>
              </div>
            )}

            {/* Spinner */}
            {isSlipRunning && (
              <div className="relative z-10 flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 dark:bg-muted/20 shadow-sm">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full border-4 border-muted" />
                  <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <Sparkles size={14} className="absolute inset-0 m-auto text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">AI is reading document...</p>
                  <p className="text-[10px] text-primary font-medium">Extracting complex peril terms</p>
                </div>
              </div>
            )}

            {/* Error */}
            {isSlipError && (
              <div className="relative z-10 flex items-start gap-3 p-3.5 bg-rose-500/10 dark:bg-rose-950/30 border border-rose-300/60 dark:border-rose-800/80 rounded-xl">
                <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-rose-900 dark:text-rose-100">Extraction failed</p>
                  <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">Ensure the PDF has selectable text and try again.</p>
                </div>
                <button onClick={handleSlipClear} className="rounded-full p-1 text-rose-400 hover:bg-rose-500/15 transition-colors">
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* Success */}
            {isSlipDone && (
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-3 p-3 bg-card border border-primary/35 dark:border-primary/40 rounded-xl shadow-sm">
                  <CheckCircle2 size={16} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-foreground truncate">{slipPdfName}</p>
                    <p className="text-[10px] text-primary font-semibold">{slipCodingResult.rms_account_file?.length ?? 0} peril rows · {slipCodingResult.currency ?? 'USD'}</p>
                  </div>
                  <button onClick={handleSlipClear} className="rounded-full p-1.5 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-500 transition-colors">
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
                {slipPreviewFields.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {slipPreviewFields.map(f => (
                      <div key={f.label} className="flex flex-col bg-card border border-border/70 rounded-lg p-2 hover:border-primary/40 transition-all group">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 group-hover:text-primary">{f.label}</span>
                        <span className="text-[12px] font-bold text-foreground tabular-nums truncate">{String(f.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section {...sectionProps} stepNum={2} title="1 - Data Agent" icon={MapPin}
        headerAction={stepStatus.geocode === 'done' ? <ViewToggle stepKey="geocode" /> : null}
      >
        <GeocodeStep activeId={activeId} viewMode={viewModes.geocode} />
      </Section>

      {/* CatAI path */}
      {agentType === 'catai' && (
        <>
          {/* Annual simulation auto-run: mount whenever step≥9 so it still runs while user is on the step 9 dashboard */}
          {step >= 9 && !!activeId && (
            <EpCurveAutoRunner uploadId={activeId} onDone={() => setStep(11)} />
          )}
          <Section {...sectionProps} stepNum={5} title="2.SOV COPE CI/CD MODELING" icon={Tag}
            headerAction={
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 shrink-0',
                  targetFormat === 'AIR'
                    ? 'border-amber-300/70 bg-amber-50/90 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100'
                    : 'border-sky-300/70 bg-sky-50/90 text-sky-950 dark:border-sky-500/40 dark:bg-sky-950/60 dark:text-sky-100',
                )}
              >
                {targetFormat}
              </Badge>
            }
          >
            <MappingStep uploadId={activeId} targetFormat={targetFormat} onDone={() => advance(7)} />
          </Section>

          {step >= 7 && (
            <Section {...sectionProps} stepNum={7} title="Occupancy & Construction Mapping" icon={Tag}
              headerAction={stepStatus.mapCodes === 'done' ? <ViewToggle stepKey="mapCodes" /> : null}
              subHeader={mapCodesSummaryText ? (
                <CollapsibleSummary summaryText={mapCodesSummaryText} />
              ) : null}
            >
              <CodeMappingStep uploadId={activeId} onDone={() => advance(8)} viewMode={viewModes.mapCodes} />
            </Section>
          )}

          {step >= 8 && (
            <Section {...sectionProps} stepNum={8} title="Value Normalization" icon={BarChart3}
              headerAction={stepStatus.normalizeValues === 'done' ? <ViewToggle stepKey="normalize" /> : null}
              subHeader={normalizeSummaryText ? (
                <CollapsibleSummary summaryText={normalizeSummaryText} />
              ) : null}
            >
              <NormalizeValuesStep uploadId={activeId} onDone={() => advance(9)} viewMode={viewModes.normalize} />
            </Section>
          )}

          {step >= 9 && activeViewStep === 9 && <DashboardView uploadId={activeId} />}

          {step >= 9 && (
            <Section {...sectionProps} stepNum={10} title="3. Pre‑EP Curve Modeling" icon={TrendingUp}>
              <EpCurveStep uploadId={activeId} />
            </Section>
          )}
        </>
      )}

      {/* Underwriting stub path */}
      {agentType === 'underwriting' && (
        <Section {...sectionProps} stepNum={5} title="UNDERWRITING AGENT" icon={Building2}>
          <UnderwritingStep />
        </Section>
      )}
      </div>
    </section>
  );
}
