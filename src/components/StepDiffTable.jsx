import { useQuery } from '@tanstack/react-query';
import { getSessionDiff } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowRight, Unlink2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

// ── Group pairs into visual sections ─────────────────────────────────────────

function buildGroups(step, pairs, fullAddressMode) {
  if (step === 'geocode') {
    if (fullAddressMode) {
      // All address pairs share the same "before" (the raw full-address string).
      // Split into Address Components and Geocoding Info.
      const infoLabels = new Set(['GeocodingStatus', 'Geosource']);
      return [
        {
          title: 'Extracted Address Components',
          pairs: pairs.filter(p => !infoLabels.has(p.label)),
          fullAddressMode: true,
        },
        {
          title: 'Geocoding Info',
          pairs: pairs.filter(p => infoLabels.has(p.label)),
          fullAddressMode: false,
        },
      ].filter(g => g.pairs.length > 0);
    }

    // Normal: separate input fields → separate outputs
    const addrLabels  = new Set(['Street', 'City', 'Area', 'PostalCode', 'CountryISO',
      'STREETNAME', 'CITY', 'STATECODE', 'POSTALCODE', 'CNTRYCODE']);
    const coordLabels = new Set(['Latitude', 'Longitude']);
    const infoLabels  = new Set(['GeocodingStatus', 'Geosource']);

    return [
      { title: 'Address Fields',  pairs: pairs.filter(p => addrLabels.has(p.label)) },
      { title: 'Coordinates',      pairs: pairs.filter(p => coordLabels.has(p.label)) },
      { title: 'Geocoding Info',   pairs: pairs.filter(p => infoLabels.has(p.label)) },
    ].filter(g => g.pairs.length > 0);
  }

  if (step === 'normalize-address') {
    const groups = [
      { title: 'Street',       keywords: ['street', 'address'], exclude: ['_combined', 'fulladdress'] },
      { title: 'City',         keywords: ['city', 'town'] },
      { title: 'State / Area', keywords: ['state', 'area', 'province', 'region'], exclude: ['floor', 'sqft', 'roof'] },
      { title: 'Postal Code',  keywords: ['zip', 'postal', 'postcode'] },
      { title: 'Country',      keywords: ['country', 'nation', 'cntr', 'iso'] },
      { title: 'Coordinates',  keywords: ['lat', 'lon', 'lng'] },
      { title: 'Combined',     keywords: ['combined', '_combined', 'fulladdress'] },
    ];
    const used = new Set();
    const result = groups.map(g => {
      const matched = pairs.filter(p => {
        if (used.has(p.label)) return false;
        const key = p.label.toLowerCase();
        if (g.exclude && g.exclude.some(ex => key.includes(ex))) return false;
        return g.keywords.some(kw => key.includes(kw));
      });
      matched.forEach(p => used.add(p.label));
      return { title: g.title, pairs: matched };
    });
    const remaining = pairs.filter(p => !used.has(p.label));
    if (remaining.length > 0) result.push({ title: 'Other', pairs: remaining });
    return result.filter(g => g.pairs.length > 0);
  }

  if (step === 'map-codes') {
    return [
      { title: 'Occupancy',    pairs: pairs.filter(p => p.label.toLowerCase().startsWith('occ')) },
      { title: 'Construction', pairs: pairs.filter(p => p.label.toLowerCase().startsWith('const')) },
    ].filter(g => g.pairs.length > 0);
  }

  if (step === 'normalize') {
    const groups = [
      { title: 'Year',              keywords: ['year', 'upgrad'] },
      { title: 'Stories / Count',   keywords: ['stor', 'numbldgs', 'riskcount'] },
      { title: 'Area',              keywords: ['area', 'floor'] },
      { title: 'Values',            keywords: ['value', 'val', 'eqcv'] },
      { title: 'Currency / LOB',    keywords: ['cur', 'lcur', 'currency', 'line', 'lob'] },
      { title: 'Roof',              keywords: ['roof', 'roofgeom'] },
      { title: 'Wall / Cladding',   keywords: ['wall', 'clad', 'siding'] },
      { title: 'Foundation',        keywords: ['found'] },
      { title: 'Sprinkler / Soft',  keywords: ['sprink', 'softstory', 'soft'] },
    ];

    const used = new Set();
    const result = groups.map(g => {
      const matched = pairs.filter(p => {
        if (used.has(p.label)) return false;
        const key = p.label.toLowerCase();
        return g.keywords.some(kw => key.includes(kw));
      });
      matched.forEach(p => used.add(p.label));
      return { title: g.title, pairs: matched };
    });

    const remaining = pairs.filter(p => !used.has(p.label));
    if (remaining.length > 0) result.push({ title: 'Other', pairs: remaining });
    return result.filter(g => g.pairs.length > 0);
  }

  return [{ title: 'Changes', pairs }];
}

// ── Value cells ───────────────────────────────────────────────────────────────

function ValueCell({ val, isOutput, isChanged, isError }) {
  const empty = val === null || val === undefined || val === '';
  if (empty) return <span className="opacity-25 select-none">—</span>;

  if (isOutput) {
    if (isError) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 font-semibold text-[11px] truncate max-w-[160px]">
          {String(val)}
        </span>
      );
    }
    return (
      <span className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border font-medium text-[11px] truncate max-w-[160px]',
        isChanged
          ? 'bg-primary/10 border-primary/20 text-primary'
          : 'bg-muted/50 border-border/50 text-foreground'
      )}>
        {String(val)}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground text-[11px] truncate max-w-[200px] block">
      {String(val)}
    </span>
  );
}

// ── Full-address mode: one raw string → many extracted columns ────────────────
// Renders as: [Full Address raw text] → [Street] [City] [Area] [PostalCode] [CountryISO] [Lat] [Lon]

function FullAddressGroupHeader({ group, stepColor, stepBgColor }) {
  return (
    <th
      colSpan={1 + group.pairs.length} // 1 "before" col + N "after" cols
      className={cn(
        'px-4 py-1.5 border-b border-r-2 border-r-border/60 text-[10px] font-bold uppercase tracking-wider text-center',
        stepBgColor, stepColor
      )}
    >
      <span className="flex items-center justify-center gap-1.5">
        <Unlink2 className="w-3 h-3 opacity-70" />
        {group.title}
      </span>
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StepDiffTable({ uploadId, step, stepColor, stepBgColor, stepBorderColor }) {
  const [viewMode, setViewMode] = useState('cleaned');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['session-diff', uploadId, step],
    queryFn: () => getSessionDiff(uploadId, step),
    staleTime: Infinity,
  });

  const fullAddressMode = data?.full_address_mode ?? false;
  const fullAddressSrc  = data?.full_address_src ?? null;

  const groups = useMemo(() => {
    if (!data?.pairs) return [];
    return buildGroups(step, data.pairs, fullAddressMode);
  }, [data, step, fullAddressMode]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-4 p-6">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="flex-1 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 m-6 flex items-center gap-2 text-rose-500 bg-rose-500/10 rounded-xl">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>Failed to load diff: {error.message}</p>
      </div>
    );
  }

  if (!data?.rows?.length) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-muted-foreground bg-white/40">
        <div className="text-center">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3', stepBgColor)}>
            <ArrowRight className={cn('w-5 h-5', stepColor)} />
          </div>
          <p>No changes detected for this step.</p>
        </div>
      </div>
    );
  }

  // Flat ordered pairs for data rows (reused from all groups)
  const allPairs = groups.flatMap(g => g.pairs);

  const toolbar = (
    <div className="bg-muted/30 px-6 py-2.5 border-b border-border/60 flex items-center gap-4 shrink-0 transition-opacity duration-300">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">View Columns:</span>
      <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-medium transition-colors hover:text-foreground text-foreground">
        <input 
          type="radio" 
          name={`viewMode-${step || 'default'}`}
          value="cleaned" 
          checked={viewMode === 'cleaned'} 
          onChange={() => setViewMode('cleaned')} 
          className="text-primary focus:ring-primary h-3.5 w-3.5 accent-primary cursor-pointer"
        />
        Cleaned Columns Only
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-medium transition-colors hover:text-foreground text-muted-foreground hover:text-foreground/80">
        <input 
          type="radio" 
          name={`viewMode-${step || 'default'}`}
          value="combined" 
          checked={viewMode === 'combined'} 
          onChange={() => setViewMode('combined')}
          className="text-primary focus:ring-primary h-3.5 w-3.5 accent-primary cursor-pointer"
        />
        Original & Cleaned
      </label>
    </div>
  );

  // ── Full-address mode layout ──────────────────────────────────────────────
  // Layout: | Row# | FullAddress (raw) | Street | City | Area | PostalCode | CountryISO | Lat | Lon | Status | Geosource |
  // The "before" column is ONE column spanning all address-component groups.

  if (fullAddressMode && step === 'geocode') {
    // Split groups into address-extraction group and info group
    const addrGroup = groups.find(g => g.fullAddressMode);
    const otherGroups = groups.filter(g => !g.fullAddressMode);
    const addrPairs  = addrGroup?.pairs ?? [];
    const otherPairs = otherGroups.flatMap(g => g.pairs);
    const totalAfterCols = addrPairs.length + otherPairs.reduce((s, p) => s + (p.after ? 1 : 0), 0);

    return (
      <div className="flex flex-col h-full w-full min-w-0 bg-white">
        {toolbar}
        <div className="overflow-auto flex-1 w-full relative custom-scrollbar">
          <table className="w-max min-w-full text-left border-collapse isolate">
            <thead className="sticky top-0 z-20 shadow-sm">

              {/* Row 1: Group super-headers */}
              <tr>
                <th rowSpan={viewMode === 'combined' ? 3 : 2}
                  className="sticky left-0 z-30 bg-muted px-4 py-2 border-b border-r border-border/80 w-12 align-bottom shadow-[2px_0_5px_rgba(0,0,0,0.02)]" />

                {/* "Full Address Input" spanning 1 column */}
                {viewMode === 'combined' && (
                  <th
                    colSpan={1}
                    className="px-4 py-1.5 border-b border-r border-border/40 text-[10px] font-bold uppercase tracking-wider text-center bg-amber-50/80 text-amber-700"
                  >
                    Original Address Input
                  </th>
                )}

                {/* Arrow spacer */}
                {viewMode === 'combined' && (
                  <th rowSpan={3}
                    className="px-2 py-2 border-b border-border/30 text-muted-foreground/30 w-6 text-center align-middle bg-white/80">
                    <ArrowRight className="w-3.5 h-3.5 inline-block opacity-40" />
                  </th>
                )}

                {/* Extracted Address Components */}
                {addrGroup && (
                  <th
                    colSpan={addrPairs.length}
                    className={cn(
                      'px-4 py-1.5 border-b border-r-2 border-r-border/60 text-[10px] font-bold uppercase tracking-wider text-center',
                      stepBgColor, stepColor
                    )}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <Unlink2 className="w-3 h-3 opacity-70" />
                      {addrGroup.title}
                    </span>
                  </th>
                )}

                {/* Other groups (Geocoding Info) */}
                {otherGroups.map((g, gIdx) => (
                  <th key={gIdx}
                    colSpan={g.pairs.reduce((s, p) => s + (p.after ? 1 : 0), 0)}
                    className="px-4 py-1.5 border-b border-r-2 border-r-border/60 text-[10px] font-bold uppercase tracking-wider text-center bg-muted/60 text-muted-foreground"
                  >
                    {g.title}
                  </th>
                ))}
              </tr>

              {/* Row 2: Old / New labels */}
              {viewMode === 'combined' && (
                <tr>
                  {/* "Before" label under Full Address Input */}
                  <th className="bg-amber-50/80 px-3 py-1 border-b border-border/40 text-[9px] font-semibold uppercase tracking-wider text-amber-700 text-center whitespace-nowrap">
                    {fullAddressSrc ?? 'FullAddress'}
                  </th>

                {/* Extracted address After labels */}
                {addrPairs.map((pair, i) => (
                  <th key={`addr-new-lbl-${i}`}
                    className={cn(
                      'px-3 py-1 border-b border-border/40 text-[9px] font-semibold uppercase tracking-wider text-center whitespace-nowrap border-r border-border/30',
                      stepBgColor, stepColor
                    )}>
                    Extracted
                  </th>
                ))}

                {/* Other pairs labels */}
                {otherPairs.map((pair, i) => (
                  <th key={`other-lbl-${i}`}
                    className="px-3 py-1 border-b border-border/40 text-[9px] font-semibold uppercase tracking-wider text-center whitespace-nowrap bg-muted/30 text-muted-foreground border-r border-border/30">
                    API
                  </th>
                ))}
              </tr>
              )}

              {/* Row 3: Column names */}
              <tr>
                {/* Full Address source col name */}
                {viewMode === 'combined' && (
                  <th className="bg-white/95 px-3 py-2 border-b border-border/50 text-[10px] font-medium text-amber-600 max-w-[160px] truncate whitespace-nowrap border-r border-border/30"
                    title={fullAddressSrc ?? 'FullAddress'}>
                    {fullAddressSrc ?? 'FullAddress'}
                  </th>
                )}

                {/* Extracted address canonical names */}
                {addrPairs.map((pair, i) => (
                  <th key={`addr-col-${i}`}
                    className={cn(
                      'bg-white/95 px-3 py-2 border-b border-border/50 text-[10px] font-bold max-w-[120px] truncate whitespace-nowrap border-r border-border/30',
                      stepColor
                    )}
                    title={pair.after}>
                    {pair.after}
                  </th>
                ))}

                {/* Other col names */}
                {otherPairs.map((pair, i) => (
                  <th key={`other-col-${i}`}
                    className="bg-white/95 px-3 py-2 border-b border-border/50 text-[10px] font-bold text-muted-foreground max-w-[130px] truncate whitespace-nowrap border-r-2 border-r-border/40"
                    title={pair.after}>
                    {pair.after}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/40">
              {data.rows.map((row, rowIdx) => {
                const rawFull = fullAddressSrc ? row.before[fullAddressSrc] : null;
                const isFailedGeocode = String(row.after['GeocodingStatus'] || '').toUpperCase() === 'FAILED';

                return (
                  <tr key={rowIdx} className={cn(
                    'hover:bg-muted/30 transition-colors font-mono text-[11px]',
                    isFailedGeocode && 'bg-rose-500/5 hover:bg-rose-500/10'
                  )}>
                    {/* Sticky Row # */}
                    <td className="sticky left-0 z-10 bg-white/95 px-4 py-2 border-r border-border/80 text-muted-foreground/40 shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                      {rowIdx + 1}
                    </td>

                    {/* Raw full address */}
                    {viewMode === 'combined' && (
                      <td className="px-3 py-2 max-w-[220px] bg-amber-50/30 border-r border-border/30"
                        title={String(rawFull ?? '')}>
                        <ValueCell val={rawFull} isOutput={false} />
                      </td>
                    )}

                    {/* Arrow (visual separator, already in header) */}
                    {viewMode === 'combined' && (
                      <td className="px-1 py-2 text-muted-foreground/20 text-center bg-white/80">
                        <ArrowRight className="w-3 h-3 inline-block opacity-30" />
                      </td>
                    )}

                    {/* Extracted address component cells */}
                    {addrPairs.map((pair, i) => {
                      const val = row.after[pair.after];
                      return (
                        <td key={`addr-${i}`}
                          className="px-2 py-2 max-w-[160px] border-r border-border/20"
                          title={String(val ?? '')}>
                          <ValueCell
                            val={val}
                            isOutput={true}
                            isChanged={val != null && String(val).trim() !== ''}
                            isError={false}
                          />
                        </td>
                      );
                    })}

                    {/* Other cells (Status, Geosource) */}
                    {otherPairs.map((pair, i) => {
                      const val = pair.after ? row.after[pair.after] : null;
                      const isErrorCol = pair.after?.toLowerCase().includes('status') && isFailedGeocode;
                      return (
                        <td key={`other-${i}`}
                          className="px-2 py-2 max-w-[160px] border-r border-border/20"
                          title={String(val ?? '')}>
                          <ValueCell val={val} isOutput={true} isChanged={false} isError={isErrorCol} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-muted px-6 py-3 border-t border-border/80 text-[11px] text-muted-foreground flex items-center justify-between z-10 shrink-0">
          <span>
            Showing <strong className="text-foreground">{data.rows.length}</strong> of {data.total} row{data.total !== 1 ? 's' : ''} processed.
          </span>
          {data.total > data.rows.length && (
            <span className="opacity-80">Only the first {data.rows.length} rows are shown.</span>
          )}
        </div>
      </div>
    );
  }

  // ── Standard (field-by-field) layout ─────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white">
      {toolbar}
      <div className="overflow-auto flex-1 w-full relative custom-scrollbar">
        <table className="w-max min-w-full text-left border-collapse isolate">
          <thead className="sticky top-0 z-20 shadow-sm">

            {/* Row 1: Group headers */}
            <tr>
              <th
                rowSpan={viewMode === 'combined' ? 3 : 2}
                className="sticky left-0 z-30 bg-muted px-4 py-2 border-b border-r border-border/80 w-12 align-bottom shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
              />
              {groups.map((group, gIdx) => {
                const colSpan = group.pairs.reduce(
                  (acc, p) => acc + (p.before && viewMode === 'combined' ? 1 : 0) + (p.after ? 1 : 0),
                  0
                );
                if (colSpan === 0) return null;
                return (
                  <th key={gIdx} colSpan={colSpan}
                    className={cn(
                      'px-4 py-1.5 border-b border-r-2 border-r-border/60 text-[10px] font-bold uppercase tracking-wider text-center',
                      gIdx % 2 === 0 ? 'bg-muted/60 text-muted-foreground' : `${stepBgColor} ${stepColor}`
                    )}>
                    {group.title}
                  </th>
                );
              })}
            </tr>

            {/* Row 2: Old / New labels per pair */}
            {viewMode === 'combined' && (
              <tr>
                {allPairs.map((pair, pIdx) => {
                  const cols = [];
                  if (pair.before) {
                    cols.push(
                      <th key={`${pIdx}-old-lbl`}
                        className="bg-amber-50/80 px-3 py-1 border-b border-border/40 text-[9px] font-semibold uppercase tracking-wider text-amber-700 text-center whitespace-nowrap">
                        Original
                      </th>
                    );
                  }
                  if (pair.after) {
                    cols.push(
                      <th key={`${pIdx}-new-lbl`}
                        className={cn(
                          'px-3 py-1 border-b border-border/40 text-[9px] font-semibold uppercase tracking-wider text-center whitespace-nowrap border-r border-border/30',
                          stepBgColor, stepColor
                        )}>
                        Cleaned
                      </th>
                    );
                  }
                  return cols;
                })}
              </tr>
            )}

            {/* Row 3: Actual column names */}
            <tr>
              {allPairs.map((pair, pIdx) => {
                const cols = [];
                if (pair.before && viewMode === 'combined') {
                  cols.push(
                    <th key={`${pIdx}-old-col`}
                      className="bg-white/95 backdrop-blur-md px-3 py-2 border-b border-border/50 text-[10px] font-medium text-muted-foreground/70 max-w-[130px] truncate whitespace-nowrap"
                      title={pair.before}>
                      {pair.before}
                    </th>
                  );
                }
                if (pair.after) {
                  cols.push(
                    <th key={`${pIdx}-new-col`}
                      className={cn(
                        'bg-white/95 backdrop-blur-md px-3 py-2 border-b border-border/50 text-[10px] font-bold max-w-[140px] truncate whitespace-nowrap border-r-2 border-r-border/40',
                        stepColor
                      )}
                      title={pair.after}>
                      {pair.after}
                    </th>
                  );
                }
                return cols;
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40">
            {data.rows.map((row, rowIdx) => {
              const isFailedGeocode = step === 'geocode' &&
                String(row.after['GeocodingStatus'] || '').toUpperCase() === 'FAILED';

              return (
                <tr key={rowIdx} className={cn(
                  'hover:bg-muted/30 transition-colors font-mono text-[11px]',
                  isFailedGeocode && 'bg-rose-500/5 hover:bg-rose-500/10'
                )}>
                  <td className="sticky left-0 z-10 bg-white/95 px-4 py-2 border-r border-border/80 text-muted-foreground/40 shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                    {rowIdx + 1}
                  </td>

                  {allPairs.map((pair, pIdx) => {
                    const cells = [];

                    if (pair.before && viewMode === 'combined') {
                      const val = row.before[pair.before];
                      cells.push(
                        <td key={`${pIdx}-old`}
                          className="px-3 py-2 max-w-[180px] bg-amber-50/30"
                          title={String(val ?? '')}>
                          <ValueCell val={val} isOutput={false} />
                        </td>
                      );
                    }

                    if (pair.after) {
                      const val = row.after[pair.after];
                      const oldVal = pair.before ? row.before[pair.before] : undefined;
                      const isChanged = oldVal !== undefined && oldVal !== val && val != null;
                      const isNew = pair.before == null && val != null && String(val).trim() !== '';
                      const isErrorCol = pair.after.toLowerCase().includes('status') && isFailedGeocode;

                      cells.push(
                        <td key={`${pIdx}-new`}
                          className="px-2 py-2 max-w-[200px] border-r border-border/20"
                          title={String(val ?? '')}>
                          <ValueCell
                            val={val}
                            isOutput={true}
                            isChanged={isChanged || isNew}
                            isError={isErrorCol}
                          />
                        </td>
                      );
                    }

                    return cells;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-muted px-6 py-3 border-t border-border/80 text-[11px] text-muted-foreground flex items-center justify-between z-10 shrink-0">
        <span>
          Showing <strong className="text-foreground">{data.rows.length}</strong> of {data.total} row{data.total !== 1 ? 's' : ''} processed.
        </span>
        {data.total > data.rows.length && (
          <span className="opacity-80">Only the first {data.rows.length} rows are shown for performance.</span>
        )}
      </div>
    </div>
  );
}
