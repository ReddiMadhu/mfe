import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, AlertCircle, CheckCircle2, Loader2, Brain, X } from 'lucide-react';
import { suggestColumns, confirmColumns, forgetMapping } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DataPreview from '@/components/DataPreview';
import { cn } from '@/lib/utils';

const CONFIDENCE_COLOR = (s) => s >= 0.8 ? 'text-green-400' : s >= 0.5 ? 'text-amber-400' : 'text-rose-400';
const CONFIDENCE_BG    = (s) => s >= 0.8 ? 'bg-green-500' : s >= 0.5 ? 'bg-amber-500' : 'bg-rose-500';
const NONE_VALUE = '__none__';

const AIR_FIELDS = ['PolicyID','InsuredName','LocationID','LocationName','FullAddress','Street','City','Area','PostalCode','CountryISO','Latitude','Longitude','OccupancyCodeType','OccupancyCode','ConstructionCodeType','ConstructionCode','RiskCount','NumberOfStories','GrossArea','YearBuilt','YearRetrofitted','TIV','BuildingValue','ContentsValue','TimeElementValue','Currency','LineOfBusiness','SprinklerSystem','RoofGeometry','FoundationType','WallSiding','SoftStory','WallType'];
const RMS_FIELDS = ['ACCNTNUM','LOCNUM','LOCNAME','STREETNAME','CITY','STATECODE','POSTALCODE','CNTRYCODE','Latitude','Longitude','BLDGSCHEME','BLDGCLASS','OCCSCHEME','OCCTYPE','NUMBLDGS','NUMSTORIES','FLOORAREA','YEARBUILT','YEARUPGRAD','SPRINKLER','ROOFGEOM','FOUNDATION','CLADDING','SOFTSTORY','WALLTYPE','TIV','EQCV1VAL','EQCV2VAL','EQCV3VAL','WSCV1VAL','WSCV2VAL','WSCV3VAL'];

export default function ColumnMappingPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setColumnMap, targetFormat, uploadMeta, rawPreview } = usePipelineStore();
  const [localMap, setLocalMap] = useState({});
  const canonicalOptions = targetFormat === 'RMS' ? RMS_FIELDS : AIR_FIELDS;

  const { data, isLoading, error } = useQuery({
    queryKey: ['suggest-columns', uploadId],
    queryFn: () => suggestColumns(uploadId),
    enabled: !!uploadId,
    staleTime: Infinity,
    retry: 1,
  });

  const sampleMap = useMemo(() => {
    if (!uploadMeta?.sample) return {};
    const map = {};
    for (const row of uploadMeta.sample) {
      for (const [col, val] of Object.entries(row)) {
        if (!map[col]) map[col] = [];
        if (val != null && map[col].length < 3 && !map[col].includes(String(val))) map[col].push(String(val));
      }
    }
    return map;
  }, [uploadMeta]);

  useEffect(() => {
    if (!data?.suggestions) return;
    const candidates = [];
    for (const [col, sugs] of Object.entries(data.suggestions)) {
      if (sugs?.length > 0) candidates.push({ col, canonical: sugs[0].canonical, score: sugs[0].score });
    }
    candidates.sort((a, b) => b.score - a.score);
    const claimed = new Set();
    const initial = {};
    for (const col of Object.keys(data.suggestions)) initial[col] = null;
    for (const { col, canonical, score } of candidates) {
      if (canonical && !claimed.has(canonical) && score >= 0.5) { initial[col] = canonical; claimed.add(canonical); }
    }
    setLocalMap(initial);
  }, [data]);

  const confirmMutation = useMutation({
    mutationFn: () => confirmColumns(uploadId, localMap),
    onSuccess: (result) => {
      setColumnMap(localMap);
      result.warnings?.forEach((w) => toast.warning(w));
      toast.success(`Confirmed â€” ${result.mapped_count} columns mapped`);
      navigate(`/session/${uploadId}/running`);
    },
    onError: (err) => toast.error(`Confirm failed: ${err.message}`),
  });

  const forgetMutation = useMutation({
    mutationFn: ({ sourceCol }) => forgetMapping(sourceCol, targetFormat),
    onSuccess: (_, { sourceCol }) => {
      toast.success(`Memory cleared for "${sourceCol}"`);
      queryClient.invalidateQueries({ queryKey: ['suggest-columns', uploadId] });
    },
    onError: (err) => toast.error(`Forget failed: ${err.message}`),
  });

  const sourceColumns = data?.suggestions ? Object.keys(data.suggestions) : [];
  const mappedCount = Object.values(localMap).filter(Boolean).length;
  const skippedCount = Object.values(localMap).filter((v) => !v).length;
  const canonicalUsedBy = {};
  for (const [col, canonical] of Object.entries(localMap)) {
    if (canonical) { if (!canonicalUsedBy[canonical]) canonicalUsedBy[canonical] = []; canonicalUsedBy[canonical].push(col); }
  }
  const duplicateCanonicals = new Set(Object.entries(canonicalUsedBy).filter(([, s]) => s.length > 1).map(([c]) => c));
  const memoryCount = useMemo(() => !data?.suggestions ? 0 : Object.values(data.suggestions).filter((s) => s?.[0]?.method === 'memory').length, [data]);

  if (error) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <p className="text-destructive font-semibold">{error.message}</p>
      <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1"><span className="gradient-text">Column Mapping</span></h1>
        <p className="text-muted-foreground text-sm">Review AI-suggested mappings and override any that look incorrect</p>
      </div>
      <div className="mb-8 flex justify-center"><StepIndicator currentStep="mapping" /></div>

      {!isLoading && memoryCount > 0 && (
        <div className="mb-5 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25 w-fit">
          <Brain className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-xs text-violet-700"><strong>{memoryCount}</strong> column{memoryCount > 1 ? 's' : ''} auto-mapped from learned memory</span>
        </div>
      )}
      {!isLoading && duplicateCanonicals.size > 0 && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-sm"><strong>Duplicate mapping â€” resolve before confirming:</strong>
            {[...duplicateCanonicals].map((c) => <span key={c} className="ml-2"><code>{c}</code> â† {canonicalUsedBy[c].join(', ')}</span>)}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden mb-5">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-3">Source Column</div>
          <div className="col-span-3">Sample Values</div>
          <div className="col-span-3">Map To</div>
          <div className="col-span-2">Confidence</div>
          <div className="col-span-1 text-center">Status</div>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? [...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 items-center">
              <div className="col-span-3"><Skeleton className="h-7 w-full rounded-lg" /></div>
              <div className="col-span-3"><Skeleton className="h-5 w-3/4 rounded-md" /></div>
              <div className="col-span-3"><Skeleton className="h-8 w-full rounded-lg" /></div>
              <div className="col-span-2"><Skeleton className="h-4 w-full rounded-full" /></div>
              <div className="col-span-1 flex justify-center"><Skeleton className="h-5 w-5 rounded-full" /></div>
            </div>
          )) : sourceColumns.map((col) => {
            const suggestions = data.suggestions[col] ?? [];
            const topSug = suggestions[0] ?? null;
            const currentValue = localMap[col] ?? null;
            const isMapped = !!currentValue;
            const isDuplicate = currentValue && duplicateCanonicals.has(currentValue);
            const score = topSug?.score ?? 0;
            const samples = sampleMap[col] ?? [];
            const usedByOthers = new Set(Object.entries(localMap).filter(([c, v]) => c !== col && v).map(([, v]) => v));
            return (
              <div key={col} className={cn('grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-colors',
                isDuplicate ? 'bg-rose-500/8 border-l-2 border-rose-500/60' : !isMapped ? 'bg-amber-500/5' : 'hover:bg-accent/20')}>
                <div className="col-span-3"><code className="text-xs font-mono text-foreground/90 bg-muted px-2 py-1 rounded-md break-all">{col}</code></div>
                <div className="col-span-3 flex gap-1 flex-wrap">
                  {samples.length > 0 ? samples.slice(0, 2).map((v, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono truncate max-w-[110px]" title={v}>{v}</span>
                  )) : <span className="text-[10px] text-muted-foreground/40 italic">no samples</span>}
                </div>
                <div className="col-span-3">
                  <Select value={currentValue ?? NONE_VALUE} onValueChange={(v) => setLocalMap((m) => ({ ...m, [col]: v === NONE_VALUE ? null : v }))}>
                    <SelectTrigger id={`select-${col}`} className={cn('h-8 text-xs rounded-lg', !isMapped && 'border-amber-500/50 text-amber-500')}>
                      <SelectValue placeholder="â€” skip column â€”" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value={NONE_VALUE}><span className="text-muted-foreground italic">â€” skip column â€”</span></SelectItem>
                      {canonicalOptions.map((opt) => {
                        const taken = usedByOthers.has(opt);
                        return <SelectItem key={opt} value={opt} disabled={taken} className={cn(taken && 'opacity-40 line-through')}>{taken ? `â›” ${opt}` : opt}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  {topSug && topSug.canonical !== currentValue && !isMapped && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 pl-0.5">Suggested: <span className="text-primary/80">{topSug.canonical}</span>{topSug.method === 'llm' && <span className="ml-1 text-violet-400">(AI)</span>}</p>
                  )}
                </div>
                <div className="col-span-2">
                  {topSug?.method === 'memory' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-700 text-[10px] font-semibold"><Brain className="w-2.5 h-2.5" /> Memory</span>
                    </div>
                  ) : topSug ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-default">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full transition-all', CONFIDENCE_BG(score))} style={{ width: `${(score * 100).toFixed(0)}%` }} />
                            </div>
                            <span className={cn('text-[10px] font-mono tabular-nums', CONFIDENCE_COLOR(score))}>{(score * 100).toFixed(0)}%</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p className="text-xs">Method: {topSug.method}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : <span className="text-[10px] text-muted-foreground/40">â€”</span>}
                </div>
                <div className="col-span-1 flex justify-center items-center gap-1">
                  {isDuplicate ? <AlertCircle className="w-4 h-4 text-rose-400" /> : isMapped ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                  {topSug?.method === 'memory' && (
                    <button onClick={() => forgetMutation.mutate({ sourceCol: col })} disabled={forgetMutation.isPending}
                      className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full text-violet-400/60 hover:text-rose-400 hover:bg-rose-500/15 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isLoading && (
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex gap-5 text-sm">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-foreground/80">{mappedCount} mapped</span></span>
            <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-amber-400" /><span className="text-foreground/80">{skippedCount} skipped</span></span>
            <span className="text-muted-foreground text-xs self-center">Total: {sourceColumns.length}</span>
          </div>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{targetFormat} format</Badge>
        </div>
      )}

      <Button id="btn-confirm-mapping" size="lg"
        onClick={() => confirmMutation.mutate()}
        disabled={isLoading || confirmMutation.isPending || sourceColumns.length === 0 || duplicateCanonicals.size > 0}
        className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-12 text-base hover:opacity-90 transition-opacity disabled:opacity-40">
        {confirmMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmingâ€¦</> : <>Confirm Mapping <ChevronRight className="w-4 h-4 ml-2" /></>}
      </Button>

      {rawPreview.length > 0 && <div className="mt-8"><DataPreview rows={rawPreview} headers={uploadMeta?.headers} /></div>}
    </div>
  );
}

