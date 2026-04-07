import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload, Link2, FileSpreadsheet, Tag, BarChart3, Shield, Zap, Globe, Eye, TrendingUp, MapPin,
  CheckCircle2, Loader2, AlertCircle, ChevronRight, Play, Brain, X, Lock, ArrowRight,
} from 'lucide-react';
import { uploadFile, runNormalize, runGeocode, suggestColumns, confirmColumns, runMapCodes, runNormalizeValues, forgetMapping } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useAgentStream } from '@/hooks/useAgentStream';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AgentGraph from '@/components/AgentGraph';
import LiveProgressView from '@/components/LiveProgressView';
import { cn } from '@/lib/utils';

// ── Canonical field lists ──────────────────────────────────────────────────
const AIR_FIELDS = ['PolicyID','InsuredName','LocationID','LocationName','FullAddress','Street','City','Area','PostalCode','CountryISO','Latitude','Longitude','OccupancyCodeType','OccupancyCode','ConstructionCodeType','ConstructionCode','RiskCount','NumberOfStories','GrossArea','YearBuilt','YearRetrofitted','TIV','BuildingValue','ContentsValue','TimeElementValue','Currency','LineOfBusiness','SprinklerSystem','RoofGeometry','FoundationType','WallSiding','SoftStory','WallType'];
const RMS_FIELDS = ['ACCNTNUM','LOCNUM','LOCNAME','STREETNAME','CITY','STATECODE','POSTALCODE','CNTRYCODE','Latitude','Longitude','BLDGSCHEME','BLDGCLASS','OCCSCHEME','OCCTYPE','NUMBLDGS','NUMSTORIES','FLOORAREA','YEARBUILT','YEARUPGRAD','SPRINKLER','ROOFGEOM','FOUNDATION','CLADDING','SOFTSTORY','WALLTYPE','TIV','EQCV1VAL','EQCV2VAL','WSCV1VAL','WSCV2VAL','WSCV3VAL'];

const CONFIDENCE_BG    = (s) => s >= 0.8 ? 'bg-green-500' : s >= 0.5 ? 'bg-amber-500' : 'bg-rose-500';
const CONFIDENCE_COLOR = (s) => s >= 0.8 ? 'text-green-400' : s >= 0.5 ? 'text-amber-400' : 'text-rose-400';
const NONE_VALUE = '__none__';

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ step, current, title, icon: Icon, badge, headerAction, children }) {
  const active = step === current;
  if (!active) return null; // Only show the active section
  return (
    <div className={cn(
      'glass rounded-2xl border transition-all duration-500 overflow-hidden',
      active ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-border/30 opacity-80'
    )}>
      <div className={cn(
        'flex items-center gap-3 px-5 py-3.5 border-b border-border/20',
        active ? 'bg-primary/5' : 'bg-muted/20'
      )}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold bg-primary/15 text-primary">
          <Icon size={13} />
        </div>
        <h2 className="font-bold text-sm text-foreground">{title}</h2>
        {badge && <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">{badge}</Badge>}
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      {active && <div className="p-5">{children}</div>}
    </div>
  );
}

// ── Step 1: Acquire Data ──────────────────────────────────────────────────
function AcquireStep({ onDone }) {
  const [tab, setTab] = useState('upload');   // 'upload' | 'xtracctio'
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [xtUrl, setXtUrl] = useState('');
  const { setUploadId, setUploadMeta } = usePipelineStore();
  const inputRef = useRef();

  // Upload with default AIR; format is chosen at the agent-select step
  const uploadMutation = useMutation({
    mutationFn: () => uploadFile(file, 'AIR', {}),
    onSuccess: (data) => {
      setUploadId(data.upload_id);
      setUploadMeta({ row_count: data.row_count, headers: data.headers, sample: data.sample ?? [] });
      toast.success(`${data.row_count} rows uploaded`);
      onDone(data.upload_id);
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  });

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

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
              tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Upload tab */}
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
                       'border-border/40 hover:border-primary/40 hover:bg-primary/3'
          )}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
              <p className="font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
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

      {/* xtracctio.ai tab */}
      {tab === 'xtracctio' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Paste your xtracctio.ai export URL or session reference:</p>
          <input value={xtUrl} onChange={e => setXtUrl(e.target.value)}
            placeholder="https://app.xtracctio.ai/export/..."
            className="w-full h-10 px-3 rounded-xl border border-border/50 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <p className="text-[10px] text-muted-foreground/60">Integration is in beta — the exported file will be fetched automatically.</p>
        </div>
      )}

      <Button
        onClick={() => uploadMutation.mutate()}
        disabled={uploadMutation.isPending || (!file && tab === 'upload') || (!xtUrl && tab === 'xtracctio')}
        className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-11 hover:opacity-90 transition-all disabled:opacity-40"
      >
        {uploadMutation.isPending
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
          : <><Play className="w-4 h-4 mr-2" />Upload & Begin Pipeline</>}
      </Button>
    </div>
  );
}

function ResultTable({ title, data, headers }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 py-2">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        {title}
      </h3>
      <div className="rounded-lg border border-border/40 overflow-hidden bg-background">
        <div className="max-h-64 overflow-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <tr>
                {headers?.map(h => (
                  <th key={h} className="px-4 py-2.5 border-b border-border/40 font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-primary/5 transition-colors">
                  {headers?.map(h => (
                    <td key={h} className="px-4 py-2 truncate max-w-[200px] text-foreground/80">{row[h] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricBadge({ label, value, color = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-2.5 rounded-lg bg-muted/30 border border-border/50 shadow-sm min-w-[90px]', color)}>
      <span className="text-sm font-bold tabular-nums mb-0.5">{value ?? '—'}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Step 2: Address Normalization ──────────────────────────
function NormalizeStep({ isPreviewing, onDone }) {
  const { stepStatus, agentStates, uploadMeta, normalizeResult } = usePipelineStore();
  const isRunning = stepStatus.normalize === 'running';
  const isDone  = stepStatus.normalize === 'done';

  // Address-only columns
  const addrRegex = /address|street|city|state|postal|country|zip/i;
  const filteredHeaders = isDone && normalizeResult ? normalizeResult.headers.filter(h => addrRegex.test(h)) : [];

  return (
    <div className="space-y-6">
      {isPreviewing ? (
        <ResultTable title="Data Uploaded Successfully" data={uploadMeta?.sample?.slice(0, 10)} headers={uploadMeta?.headers} />
      ) : (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className={cn(
            'rounded-xl border p-3.5 flex items-center gap-3 transition-all duration-500',
            isRunning ? 'border-primary/40 bg-primary/5' : isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/30 opacity-50'
          )}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              isRunning ? 'bg-primary/15' : isDone ? 'bg-emerald-500/15' : 'bg-muted'
            )}>
              {isRunning ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
              : isDone   ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              :            <div className="w-2 h-2 rounded-full bg-border" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Address Normalization</p>
              <p className="text-[10px] text-muted-foreground">Standardizing address fields via LLM</p>
            </div>
          </div>
          
          {isRunning && (
            <LiveProgressView agentStates={agentStates} agents={['address_normalizer']} />
          )}

          {isDone && normalizeResult && (
             <ResultTable title="Normalized Addresses" data={normalizeResult.sample} headers={filteredHeaders} />
          )}

          {isDone && (
            <div className="flex flex-col gap-4 pt-2">
              <Button onClick={onDone} className="w-full gradient-primary glow-primary text-white font-bold h-11">
                Continue to Geocoding
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Geocode Addresses ──────────────────────────
function GeocodeStep({ isPending, onDone }) {
  const { stepStatus, agentStates, geocodeResult } = usePipelineStore();
  const isRunning = stepStatus.geocode === 'running';
  const isDone  = stepStatus.geocode === 'done';
  const isIdle = stepStatus.geocode === 'idle';

  return (
    <div className="space-y-6">
      {isPending ? (
         <div className="text-sm text-muted-foreground italic px-2">Complete Address Normalization first to unlock geocoding...</div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className={cn(
            'rounded-xl border p-3.5 flex items-center gap-3 transition-all duration-500',
            isRunning ? 'border-primary/40 bg-primary/5' : isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/30 opacity-50'
          )}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              isRunning ? 'bg-primary/15' : isDone ? 'bg-emerald-500/15' : 'bg-muted'
            )}>
              {isRunning ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
              : isDone   ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              :            <div className="w-2 h-2 rounded-full bg-border" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Geocode Addresses</p>
              <p className="text-[10px] text-muted-foreground">Resolving lat/lon attributes via Geoapify</p>
            </div>
          </div>
          
          {isRunning && (
            <LiveProgressView agentStates={agentStates} agents={['geocoder']} />
          )}

          {isDone && geocodeResult && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pt-2">
                <div className="flex items-center gap-2 mb-2">
                   <MetricBadge label="Geocoded" value={geocodeResult.geocoded} color="text-emerald-600 bg-emerald-50/50 border-emerald-100" />
                   <MetricBadge label="Provided" value={geocodeResult.provided} />
                   <MetricBadge label="Failed" value={geocodeResult.failed} color="text-rose-500 bg-rose-50/50 border-rose-100" />
                   <MetricBadge label="Flags" value={geocodeResult.flags_added} color="text-amber-600 bg-amber-50/50 border-amber-100" />
                </div>
                <ResultTable 
                  title="Geocoded Sample Data" 
                  data={geocodeResult.sample} 
                  headers={geocodeResult.headers?.filter(h => /lat|lon|address|city|street|zip/i.test(h))} 
                />
             </div>
          )}

          {isDone && (
            <div className="flex flex-col gap-4 pt-2">
              <Button onClick={onDone} className="w-full gradient-primary glow-primary text-white font-bold h-11">
                Continue to Agent Selection
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Agent select (with inline format picker for CAT) ───────────────
function AgentSelectStep({ onSelect }) {
  const { setTargetFormat } = usePipelineStore();
  const [catExpanded, setCatExpanded] = useState(false);
  const [format, setFormat] = useState('AIR');

  const CAT_STEPS = [
    { icon: Tag,      label: 'Column Mapping',        desc: 'AI source → canonical field matching' },
    { icon: Tag,      label: 'Map Occ & Const Codes',  desc: '4-stage LLM code classification' },
    { icon: BarChart3,label: 'Normalize Values',       desc: 'Year, area, value, currency' },
  ];
  const UW_STEPS = [
    { icon: Shield,     label: 'COPE Analysis' },
    { icon: Zap,        label: 'Hazards' },
    { icon: Globe,      label: 'Geospatial' },
    { icon: Eye,        label: 'Object Analysis' },
    { icon: TrendingUp, label: 'Risk Modeling' },
    { icon: TrendingUp, label: 'Quote Propensity' },
  ];

  const FORMAT_OPTIONS = [
    { id: 'AIR', label: 'AIR', sub: 'CEDE · Touchstone · Classis', desc: 'Standard for AIR catastrophe models. Supports CEDE, Touchstone RE, and Classis.' },
    { id: 'RMS', label: 'RMS', sub: 'EDM · RiskLink',              desc: 'Standard for Moody\'s RMS models. Outputs EDM-compatible exposure data.' },
  ];

  function handleProceed() {
    setTargetFormat(format);
    onSelect(format);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* ── CAT Agent card ─────────────────────────────────── */}
      <div className={cn(
        'glass-strong rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300',
        catExpanded ? 'border-primary/50 md:col-span-2 shadow-lg shadow-primary/5' : 'border-primary/30'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary glow-primary-sm flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">CAT Agent</h3>
              <p className="text-[10px] text-muted-foreground">Catastrophe Modeling Pipeline</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">Active</Badge>
        </div>

        {!catExpanded && (
          <>
            <div className="space-y-1.5">
              {CAT_STEPS.map(({ icon: Icon, label, desc }, i) => (
                <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                  <span className="w-5 h-5 rounded-full gradient-primary text-white text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    {desc && <p className="text-[9px] text-muted-foreground">{desc}</p>}
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => setCatExpanded(true)}
              className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-10 hover:opacity-90 transition-all">
              Select CAT Agent <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}

        {/* ── Inline format picker (expands after clicking CAT) ── */}
        {catExpanded && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Select Output Format</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FORMAT_OPTIONS.map(f => (
                  <button key={f.id} onClick={() => setFormat(f.id)}
                    className={cn(
                      'text-left rounded-xl border p-4 transition-all duration-200 group',
                      format === f.id
                        ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/40 hover:border-primary/30 hover:bg-primary/3'
                    )}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
                        format === f.id ? 'border-primary bg-primary' : 'border-border/60'
                      )}>
                        {format === f.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-sm text-foreground">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{f.sub}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCatExpanded(false)}
                className="rounded-xl h-10 px-5 border-border/40 text-muted-foreground hover:text-foreground">
                Back
              </Button>
              <Button onClick={handleProceed}
                className="flex-1 gradient-primary glow-primary text-white font-semibold rounded-xl h-10 hover:opacity-90 transition-all">
                Configure Column Mapping <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── UW Agent card — locked ─────────────────────────── */}
      {!catExpanded && (
        <div className="glass rounded-2xl border border-border/40 p-5 flex flex-col gap-4 opacity-70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted border flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Underwriting Agent</h3>
                <p className="text-[10px] text-muted-foreground">Risk Assessment Pipeline</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 bg-amber-50">Coming Soon</Badge>
          </div>
          <div className="space-y-1.5">
            {UW_STEPS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{label}</p>
                <Lock className="w-3 h-3 text-muted-foreground/40 ml-auto shrink-0" />
              </div>
            ))}
          </div>
          <Button disabled variant="outline" className="w-full rounded-xl h-10 opacity-50 cursor-not-allowed">
            <Lock className="w-4 h-4 mr-2" /> Coming Soon
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Column Mapping + auto-run CAT ──────────────────────────────────
function MappingStep({ uploadId, targetFormat, onDone }) {
  const { setColumnMap, setStepStatus, setCatResult, agentStates, stepStatus } = usePipelineStore();
  const [localMap, setLocalMap] = useState({});
  const canonicalOptions = targetFormat === 'RMS' ? RMS_FIELDS : AIR_FIELDS;
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['suggest-columns', uploadId],
    queryFn: () => suggestColumns(uploadId),
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
  const memoryCount = useMemo(() => !data?.suggestions ? 0 : Object.values(data.suggestions).filter(s => s?.[0]?.method === 'memory').length, [data]);

  const normalizeMutation = useMutation({
    mutationFn: () => runNormalizeValues(uploadId),
    onMutate:  () => setStepStatus('normalizeValues', 'running'),
    onSuccess: (data) => { setStepStatus('normalizeValues', 'done'); setCatResult(data); navigate(`/session/${uploadId}/done`); },
    onError:   (err) => { setStepStatus('normalizeValues', 'error'); toast.error(err.message); },
  });

  const mapCodesMutation = useMutation({
    mutationFn: () => runMapCodes(uploadId),
    onMutate:  () => setStepStatus('mapCodes', 'running'),
    onSuccess: () => { setStepStatus('mapCodes', 'done'); toast.success('Code mapping complete'); normalizeMutation.mutate(); },
    onError:   (err) => { setStepStatus('mapCodes', 'error'); toast.error(err.message); },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmColumns(uploadId, localMap),
    onSuccess: (result) => {
      setColumnMap(localMap);
      result.warnings?.forEach(w => toast.warning(w));
      toast.success(`${result.mapped_count} columns confirmed — running CAT…`);
      mapCodesMutation.mutate();
    },
    onError: (err) => toast.error(`Confirm failed: ${err.message}`),
  });

  const { mutate: forget } = useMutation({
    mutationFn: ({ sourceCol }) => forgetMapping(sourceCol, targetFormat),
    onSuccess: () => toast.success('Memory cleared'),
  });

  const isExecuting = confirmMutation.isPending || stepStatus.mapCodes === 'running' || stepStatus.normalizeValues === 'running';
  const catRunning  = stepStatus.mapCodes === 'running' || stepStatus.normalizeValues === 'running';

  if (catRunning) return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Running CAT pipeline…</p>
      <LiveProgressView agentStates={agentStates} agents={['cat_code_mapper', 'cat_normalizer']} />
    </div>
  );

  return (
    <div className="space-y-4">
      {memoryCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/25 w-fit">
          <Brain className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-700"><strong>{memoryCount}</strong> column{memoryCount > 1 ? 's' : ''} from learned memory</span>
        </div>
      )}
      {duplicateCanonicals.size > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          Duplicate mappings — resolve before confirming: {[...duplicateCanonicals].join(', ')}
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-2.5 border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
            const samples = [];
            const usedByOthers = new Set(Object.entries(localMap).filter(([c, v]) => c !== col && v).map(([, v]) => v));
            return (
              <div key={col} className={cn('grid grid-cols-12 gap-4 px-5 py-3 items-center transition-colors',
                isDuplicate ? 'bg-rose-500/8 border-l-2 border-rose-500/60' :
                !isMapped   ? 'bg-amber-500/5' : 'hover:bg-accent/20')}>
                <div className="col-span-3">
                  <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded-md break-all">{col}</code>
                </div>
                <div className="col-span-3">
                  <span className="text-[10px] text-muted-foreground/50 italic">—</span>
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
                      className="w-4 h-4 flex items-center justify-center rounded-full text-violet-400/60 hover:text-rose-400 hover:bg-rose-500/15 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-400" />{mappedCount} mapped · {sourceColumns.length - mappedCount} skipped
        </span>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{targetFormat}</Badge>
      </div>

      <Button
        onClick={() => confirmMutation.mutate()}
        disabled={isExecuting || isLoading || sourceColumns.length === 0 || duplicateCanonicals.size > 0}
        className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-11 hover:opacity-90 transition-all disabled:opacity-40"
      >
        {isExecuting
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running CAT pipeline…</>
          : <>Confirm Mapping & Run CAT <ArrowRight className="w-4 h-4 ml-2" /></>}
      </Button>
    </div>
  );
}

// ── Main PipelinePage ──────────────────────────────────────────────────────
export default function PipelinePage() {
  const navigate  = useNavigate();
  const { id: routeId } = useParams();  // optional session id from URL
  const { uploadId, setUploadId, stepStatus, setStepStatus, targetFormat, agentStates, setNormalizeResult, setGeocodeResult } = usePipelineStore();

  const activeId = routeId || uploadId;

  useAgentStream(activeId);

  // current wizard step: 1=acquire, 2=normalize, 3=geocode, 4=agents, 5=mapping
  const [step, setStep] = useState(routeId ? 4 : 1);
  const [agentChosen, setAgentChosen] = useState(false);
  const isPreviewing = stepStatus.preview !== 'done';
  const uploadMeta = usePipelineStore(s => s.uploadMeta);

  const handleNormalizationDone = useCallback(() => {
    setStep(3);
  }, []);

  const handleGeocodingDone = useCallback(() => {
    setStep(4);
  }, []);

  const geocodeMutation = useMutation({
    mutationFn: () => runGeocode(activeId),
    onMutate: () => setStepStatus('geocode', 'running'),
    onSuccess: (data) => {
      setStepStatus('geocode', 'done');
      setGeocodeResult(data);
      toast.success(`Geocoding complete — ${data.geocoded} geocoded`);
    },
    onError: (err) => { setStepStatus('geocode', 'error'); toast.error(`Geocoding failed: ${err.message}`); }
  });

  const normalizeMutation = useMutation({
    mutationFn: () => runNormalize(activeId),
    onMutate: () => setStepStatus('normalize', 'running'),
    onSuccess: (data) => {
      setStepStatus('normalize', 'done');
      setNormalizeResult(data);
      toast.success('Normalization complete');
    },
    onError: (err) => { setStepStatus('normalize', 'error'); toast.error(`Normalization failed: ${err.message}`); }
  });

  const handleStartNormalization = useCallback(() => {
    setStepStatus('preview', 'done');
    normalizeMutation.mutate();
  }, [setStepStatus, normalizeMutation]);

  const handleStartGeocoding = useCallback(() => {
    geocodeMutation.mutate();
  }, [geocodeMutation]);

  const handleUploaded = useCallback((id) => {
    setUploadId(id);
    setStep(2);
  }, [setUploadId]);

  const handleAgentSelected = useCallback(() => {
    setAgentChosen(true);
    setStep(5);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 w-full max-w-[1400px] mx-auto flex flex-col gap-5">

      {/* Header removed as requested */}

      {/* ── Agent Network (always visible) ───────────────────── */}
      <div className="bg-white rounded-2xl border border-border/30 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('w-1.5 h-1.5 rounded-full', step > 1 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40')} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Agent Network</span>
          {activeId && <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">{activeId.slice(0, 12)}…</span>}
        </div>
        <AgentGraph agentStates={agentStates} stepStatus={stepStatus} />
      </div>

      {/* ── Wizard sections ───────────────────────────────────── */}
      <Section step={1} current={step} title="Acquire Data" icon={Upload}>
        <AcquireStep onDone={handleUploaded} />
      </Section>

      <Section step={2} current={step} title="Address Normalization" icon={Globe}
        headerAction={
          isPreviewing && step === 2 ? (
            <Button onClick={handleStartNormalization} size="sm" className="h-8 gap-1.5 gradient-primary glow-primary-sm text-white rounded-lg">
              <Zap size={14} className="fill-white" /> Start Agent
            </Button>
          ) : undefined
        }
      >
        <NormalizeStep isPreviewing={isPreviewing} onDone={handleNormalizationDone} />
      </Section>

      <Section step={3} current={step} title="Geocode Addresses" icon={MapPin}
        headerAction={
          step === 3 && stepStatus.geocode === 'idle' ? (
            <Button onClick={handleStartGeocoding} size="sm" className="h-8 gap-1.5 gradient-primary glow-primary-sm text-white rounded-lg">
              <Zap size={14} className="fill-white" /> Start Geocoding
            </Button>
          ) : undefined
        }
      >
        <GeocodeStep isPending={stepStatus.normalize !== 'done'} onDone={handleGeocodingDone} />
      </Section>

      <Section step={4} current={step} title="Select Agent" icon={Tag}
        badge={step === 4 ? 'Choose processing mode' : undefined}>
        <AgentSelectStep onSelect={handleAgentSelected} />
      </Section>

      <Section step={5} current={step} title="Column Mapping" icon={Tag}
        badge={targetFormat}>
        <MappingStep uploadId={activeId} targetFormat={targetFormat} onDone={() => navigate(`/session/${activeId}/done`)} />
      </Section>
    </div>
  );
}
