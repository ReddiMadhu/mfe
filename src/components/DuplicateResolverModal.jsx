import { useState } from 'react';
import {
  X, AlertTriangle, ArrowRight, Merge, CheckCircle2, Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * DuplicateResolverModal — shared modal for resolving duplicate dictionary entries.
 *
 * Props:
 *   open          — boolean to show/hide modal
 *   onClose       — callback to close modal
 *   duplicates    — object: { code: { new_entry, matches: [DuplicateMatch] } }
 *   onResolve     — callback(resolvedEntries: { code: meta }) — final entries to save
 *   copeType      — 'construction' | 'occupancy' | 'protection' | 'exposure'
 *   tabColor      — accent color from the COPE tab
 */
export default function DuplicateResolverModal({
  open,
  onClose,
  duplicates = {},
  onResolve,
  copeType,
  tabColor = '#8b5cf6',
}) {
  const codes = Object.keys(duplicates);
  const [decisions, setDecisions] = useState({});
  // decisions: { code: 'keep_existing' | 'use_new' | 'merge' }

  if (!open || codes.length === 0) return null;

  const setDecision = (code, action) => {
    setDecisions((prev) => ({ ...prev, [code]: action }));
  };

  const allResolved = codes.every((c) => decisions[c]);

  const handleConfirm = () => {
    const resolved = {};
    for (const code of codes) {
      const action = decisions[code];
      const entry = duplicates[code];
      const newEntry = entry.new_entry;
      const existingMatch = entry.matches?.[0];

      if (action === 'keep_existing') {
        // Skip — don't include in resolved
        continue;
      } else if (action === 'use_new') {
        resolved[code] = newEntry;
      } else if (action === 'merge') {
        // Merge keywords from both
        const existingKw = existingMatch?.existing_keywords || [];
        const newKw = newEntry.keywords || [];
        const mergedKw = [...new Set([...existingKw, ...newKw])];
        resolved[code] = {
          description: newEntry.description,
          keywords: mergedKw,
        };
      }
    }
    onResolve(resolved);
  };

  const handleBulkAction = (action) => {
    const bulk = {};
    codes.forEach((c) => { bulk[c] = action; });
    setDecisions(bulk);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, #f59e0b, #f59e0bcc)` }}
            >
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Duplicate Entries Detected</h3>
              <p className="text-[11px] text-muted-foreground">
                {codes.length} duplicate{codes.length > 1 ? 's' : ''} found — choose how to resolve each
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/40">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-2">
            Bulk Actions:
          </span>
          <Button
            variant="outline" size="sm" className="text-[10px] h-6 px-2.5 gap-1"
            onClick={() => handleBulkAction('keep_existing')}
          >
            Keep All Existing
          </Button>
          <Button
            variant="outline" size="sm" className="text-[10px] h-6 px-2.5 gap-1"
            onClick={() => handleBulkAction('use_new')}
          >
            Use All New
          </Button>
          <Button
            variant="outline" size="sm" className="text-[10px] h-6 px-2.5 gap-1"
            onClick={() => handleBulkAction('merge')}
          >
            <Merge className="w-3 h-3" /> Merge All
          </Button>
        </div>

        {/* Conflict List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
          {codes.map((code) => {
            const entry = duplicates[code];
            const newEntry = entry.new_entry;
            const match = entry.matches?.[0];
            const decision = decisions[code];

            return (
              <div
                key={code}
                className={cn(
                  'rounded-xl border p-4 transition-all duration-200',
                  decision
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-amber-200 bg-amber-50/20'
                )}
              >
                {/* Code header */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="font-mono font-bold text-sm px-2 py-0.5 rounded"
                    style={{ color: tabColor, background: `${tabColor}15` }}
                  >
                    {code}
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                    {match?.match_type === 'exact_code' ? 'Exact Code Match' : 'Similar'}
                  </Badge>
                  {decision && (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 ml-auto">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                      {decision === 'keep_existing' ? 'Keeping Existing' :
                       decision === 'use_new' ? 'Using New' : 'Merging'}
                    </Badge>
                  )}
                </div>

                {/* Side-by-side comparison */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* New entry */}
                  <div className="rounded-lg border border-blue-200/60 bg-blue-50/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1.5">
                      Your Entry
                    </p>
                    <p className="text-xs font-medium mb-1">{newEntry.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {(newEntry.keywords || []).slice(0, 6).map((kw, i) => (
                        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-blue-100/60 text-[9px] text-blue-700">
                          {kw}
                        </span>
                      ))}
                      {(newEntry.keywords || []).length > 6 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{newEntry.keywords.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Existing entry */}
                  <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                      Existing Entry
                    </p>
                    <p className="text-xs font-medium mb-1">{match?.existing_description}</p>
                    <div className="flex flex-wrap gap-1">
                      {(match?.existing_keywords || []).slice(0, 6).map((kw, i) => (
                        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-600">
                          {kw}
                        </span>
                      ))}
                      {(match?.existing_keywords || []).length > 6 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{match.existing_keywords.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={decision === 'keep_existing' ? 'default' : 'outline'}
                    size="sm"
                    className={cn('text-[10px] h-7 px-3 gap-1', decision === 'keep_existing' && 'bg-slate-700')}
                    onClick={() => setDecision(code, 'keep_existing')}
                  >
                    Keep Existing
                  </Button>
                  <Button
                    variant={decision === 'use_new' ? 'default' : 'outline'}
                    size="sm"
                    className={cn('text-[10px] h-7 px-3 gap-1', decision === 'use_new' && 'bg-blue-600')}
                    onClick={() => setDecision(code, 'use_new')}
                  >
                    <ArrowRight className="w-3 h-3" /> Use Mine
                  </Button>
                  <Button
                    variant={decision === 'merge' ? 'default' : 'outline'}
                    size="sm"
                    className={cn('text-[10px] h-7 px-3 gap-1', decision === 'merge' && 'bg-violet-600')}
                    onClick={() => setDecision(code, 'merge')}
                  >
                    <Merge className="w-3 h-3" /> Merge Keywords
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200/60 bg-slate-50/50">
          <p className="text-[11px] text-muted-foreground">
            {Object.keys(decisions).length} of {codes.length} resolved
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 gap-1.5"
              disabled={!allResolved}
              onClick={handleConfirm}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm & Save ({codes.filter((c) => decisions[c] && decisions[c] !== 'keep_existing').length} entries)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
