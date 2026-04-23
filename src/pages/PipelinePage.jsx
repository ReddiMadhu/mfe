import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload, Link2, FileSpreadsheet, Tag, BarChart3, Globe, MapPin,
  CheckCircle2, Loader2, AlertCircle, Play, Brain, X,
  ArrowRight, Sparkles, Building2, Lock,
} from 'lucide-react';
import {
  uploadFile, runGeocode,
  suggestColumns, confirmColumns, runMapCodes, runNormalizeValues, forgetMapping,
} from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AgentGraph from '@/components/AgentGraph';
import { DashboardView } from './DonePage';
import StepDiffTable from '@/components/StepDiffTable';
import { cn } from '@/lib/utils';

// ── Canonical field lists ──────────────────────────────────────────────────
const AIR_FIELDS = ['PolicyID','InsuredName','LocationID','LocationName','FullAddress','Street','City','Area','PostalCode','CountryISO','Latitude','Longitude','OccupancyCodeType','OccupancyCode','ConstructionCodeType','ConstructionCode','RiskCount','NumberOfStories','GrossArea','YearBuilt','YearRetrofitted','TIV','BuildingValue','ContentsValue','TimeElementValue','Currency','LineOfBusiness','SprinklerSystem','RoofGeometry','FoundationType','WallSiding','SoftStory','WallType'];
const RMS_FIELDS = ['ACCNTNUM','LOCNUM','LOCNAME','STREETNAME','CITY','STATECODE','POSTALCODE','CNTRYCODE','Latitude','Longitude','BLDGSCHEME','BLDGCLASS','OCCSCHEME','OCCTYPE','NUMBLDGS','NUMSTORIES','FLOORAREA','YEARBUILT','YEARUPGRAD','SPRINKLER','ROOFGEOM','FOUNDATION','CLADDING','SOFTSTORY','WALLTYPE','TIV','EQCV1VAL','EQCV2VAL','WSCV1VAL','WSCV2VAL','WSCV3VAL'];

const CONFIDENCE_BG    = (s) => s >= 0.8 ? 'bg-green-500' : s >= 0.5 ? 'bg-amber-500' : 'bg-rose-500';
const CONFIDENCE_COLOR = (s) => s >= 0.8 ? 'text-green-400' : s >= 0.5 ? 'text-amber-400' : 'text-rose-400';
const NONE_VALUE = '__none__';

// ── Section wrapper — one visible at a time, Agent Network is the nav ──────
function Section({ stepNum, activeViewStep, title, icon: Icon, badge, headerAction, subHeader, children }) {
  // Only render when this is the currently viewed step — invisible otherwise
  if (activeViewStep !== stepNum) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-in fade-in duration-300">
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
  const [tab, setTab]       = useState('upload');
  const [file, setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const { setUploadId, setUploadMeta, setStepStatus, uploadMeta, uploadId } = usePipelineStore();
  const inputRef = useRef();

  const uploadMutation = useMutation({
    mutationFn: (f) => uploadFile(f instanceof File ? f : file, 'AIR', {}),
    onSuccess: (data) => {
      setUploadId(data.upload_id);
      setUploadMeta({ row_count: data.row_count, headers: data.headers, sample: data.sample ?? [] });
      setStepStatus('upload', 'done');
      setStepStatus('preview', 'done');
      toast.success(`${data.row_count} rows uploaded — review preview below`);
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
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
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex rounded-xl border border-border/40 overflow-hidden">
        {[
          { id: 'upload',    label: 'Upload Excel / CSV',       icon: Upload },
          { id: 'xtracctio', label: 'Import from xtracctio.ai', icon: Link2 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-colors',
              tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
            dragging ? 'border-primary bg-primary/5' :
            file     ? 'border-emerald-500/50 bg-emerald-500/5' :
                       'border-border/40 hover:border-primary/40 hover:bg-primary/3',
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
              {uploadMutation.isPending ? <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" /> : <FileSpreadsheet className="w-10 h-10 text-emerald-400" />}
              <p className="font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {uploadMutation.isPending ? 'Uploading...' : `${(file.size / 1024).toFixed(1)} KB`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Drag & drop or <span className="text-primary underline">browse</span></p>
              <p className="text-xs text-muted-foreground">CSV, XLSX, XLS supported</p>
            </div>
          )}
        </div>
      )}

      {tab === 'xtracctio' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Paste your xtracctio.ai export URL or session reference:</p>
          <input placeholder="https://app.xtracctio.ai/export/..."
            className="w-full h-10 px-3 rounded-xl border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      )}

      {tab === 'xtracctio' && (
        <Button
          onClick={() => uploadMutation.mutate()}
          disabled={uploadMutation.isPending}
          className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-11 hover:opacity-90 transition-all disabled:opacity-40"
        >
          {uploadMutation.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
            : <><Play className="w-4 h-4 mr-2" />Import Data</>}
        </Button>
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
  const isDone    = !!geocodeDiff;
  const total     = uploadMeta?.row_count || 0;

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
      result.warnings?.forEach(w => toast.warning(w));
      toast.success(`${result.mapped_count} columns confirmed`);
      onDone();
    },
    onError: (err) => toast.error(`Confirm failed: ${err.message}`),
  });

  const { mutate: forget } = useMutation({
    mutationFn: ({ sourceCol }) => forgetMapping(sourceCol, targetFormat),
    onSuccess: () => toast.success('Memory cleared'),
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
                        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-mono text-foreground/70 max-w-[120px] truncate">
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
                 isMapped    ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
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
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{targetFormat}</Badge>
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
    onMutate:   () => setStepStatus('mapCodes', 'running'),
    onSuccess:  (data) => {
      setStepStatus('mapCodes', 'done');
      if (data?.summary_text) setMapCodesSummaryText(data.summary_text);
      if (data?.diff_data) setMapCodesDiff(data.diff_data);
      toast.success('Code mapping complete');
      setTimeout(() => onDone(), 2000);
    },
    onError:    (err) => { setStepStatus('mapCodes', 'error'); toast.error(err.message); },
  });

  // isRunning: spinner only when API is actively in-flight
  const isRunning = mapCodesMutation.isPending;
  // isDone: table only when API response returned diff data
  const isDone    = !!mapCodesDiff;

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
    onMutate:   () => setStepStatus('normalizeValues', 'running'),
    onSuccess:  (data) => {
      setStepStatus('normalizeValues', 'done');
      setCatResult(data);
      if (data?.summary_text) setNormalizeSummaryText(data.summary_text);
      if (data?.diff_data) setNormalizeDiff(data.diff_data);
      toast.success('Value normalization complete');
      setTimeout(() => onDone(), 2000);
    },
    onError:    (err) => { setStepStatus('normalizeValues', 'error'); toast.error(err.message); },
  });

  // isRunning: spinner only when API is actively in-flight
  const isRunning = normalizeMutation.isPending;
  // isDone: table only when API response returned diff data
  const isDone    = !!normalizeDiff;

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

  const ViewToggle = ({ stepKey }) => (
    <div className="flex items-center gap-3 bg-white/50 px-2 py-1 rounded-md border border-border/50">
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
    mutationFn: () => runGeocode(activeId),
    onMutate:   () => setStepStatus('geocode', 'running'),
    onSuccess:  (data) => {
      setStepStatus('geocode', 'done');
      setGeocodeResult(data);
      if (data?.diff_data) setGeocodeDiff(data.diff_data);
      toast.success(`Geocoding complete — ${data.geocoded} geocoded`);
    },
    onError: (err) => { setStepStatus('geocode', 'error'); toast.error(`Geocoding failed: ${err.message}`); },
  });

  // Auto-run geocoding when step advances to 2
  useEffect(() => {
    if (step === 2 && (!stepStatus.geocode || stepStatus.geocode === 'idle') && activeId) {
      geocodeMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeId]);

  // Auto-advance to SOV COPE after geocode completes (based on Configure screen selection)
  const hasAutoAdvancedRef = useRef(false);
  useEffect(() => {
    if (stepStatus.geocode === 'done' && step === 2 && !agentType && !hasAutoAdvancedRef.current) {
      hasAutoAdvancedRef.current = true;
      if (selectedAgents.sovCope) {
        // SOV COPE was selected on Configure screen → auto-start CatAI path
        setAgentType('catai');
        advance(5);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepStatus.geocode, step, agentType, selectedAgents.sovCope]);

  const handleUploaded = useCallback((id) => {
    setUploadId(id);
    advance(2);
  }, [setUploadId, advance]);

  // AgentGraph node click → navigate to that step's output (if reached)
  const handleNodeClick = useCallback((nodeStep) => {
    if (nodeStep <= step) setActiveViewStep(nodeStep);
  }, [step, setActiveViewStep]);

  const sectionProps = { activeViewStep };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 w-full max-w-[1400px] mx-auto flex flex-col gap-5">

      {/* ── Agent Network ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border/30 px-3 py-2 shadow-sm">
        <AgentGraph
          activeId={activeId}
          agentStates={agentStates}
          stepStatus={stepStatus}
          onNodeClick={handleNodeClick}
          currentPipelineStep={step}
          isGeocodeDone={stepStatus.geocode === 'done'}
        />
      </div>

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
      </Section>

      <Section {...sectionProps} stepNum={2} title="1 - Data Agent" icon={MapPin}
        headerAction={stepStatus.geocode === 'done' ? <ViewToggle stepKey="geocode" /> : null}
      >
        <GeocodeStep activeId={activeId} viewMode={viewModes.geocode} />
      </Section>

      {/* CatAI path */}
      {agentType === 'catai' && (
        <>
          <Section {...sectionProps} stepNum={5} title="2.SOV COPE CI/CD MODELING" icon={Tag}
            headerAction={
              <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wide border-emerald-500/30 text-emerald-600 bg-emerald-50/50 px-3 py-1">
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
                <div className="flex items-start gap-2">
                  <Sparkles className="lucide lucide-sparkles w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{mapCodesSummaryText}</p>
                </div>
              ) : null}
            >
              <CodeMappingStep uploadId={activeId} onDone={() => advance(8)} viewMode={viewModes.mapCodes} />
            </Section>
          )}

          {step >= 8 && (
            <Section {...sectionProps} stepNum={8} title="Value Normalization" icon={BarChart3}
              headerAction={stepStatus.normalizeValues === 'done' ? <ViewToggle stepKey="normalize" /> : null}
              subHeader={normalizeSummaryText ? (
                <div className="flex items-start gap-2">
                  <Sparkles className="lucide lucide-sparkles w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{normalizeSummaryText}</p>
                </div>
              ) : null}
            >
              <NormalizeValuesStep uploadId={activeId} onDone={() => advance(9)} viewMode={viewModes.normalize} />
            </Section>
          )}

          {step >= 9 && activeViewStep === 9 && <DashboardView uploadId={activeId} />}
        </>
      )}

      {/* Underwriting stub path */}
      {agentType === 'underwriting' && (
        <Section {...sectionProps} stepNum={5} title="UNDERWRITING AGENT" icon={Building2}>
          <UnderwritingStep />
        </Section>
      )}
    </div>
  );
}
