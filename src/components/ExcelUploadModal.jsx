import { useState, useCallback, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  AlertTriangle, Loader2, ArrowRight, FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DuplicateResolverModal from './DuplicateResolverModal';

const API = import.meta.env.VITE_API_URL || '';

/**
 * ExcelUploadModal — Multi-step wizard for uploading Excel/CSV files
 * with validation and duplicate resolution.
 *
 * Props:
 *   open       — boolean
 *   onClose    — callback
 *   tab        — COPE tab object
 *   format     — 'AIR' | 'RMS'
 *   onComplete — callback after successful commit
 */
export default function ExcelUploadModal({ open, onClose, tab, format, onComplete }) {
  const [step, setStep] = useState(1); // 1: upload, 2: validation, 3: dupes, 4: done
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [showDupeModal, setShowDupeModal] = useState(false);
  const [resolvedEntries, setResolvedEntries] = useState({});
  const fileInputRef = useRef(null);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setUploading(false);
    setCommitting(false);
    setResult(null);
    setCommitResult(null);
    setShowDupeModal(false);
    setResolvedEntries({});
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `${API}/api/ontology/upload-excel/${tab.key}?format=${format}`,
        { method: 'POST', body: formData }
      );
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.detail || 'Upload failed.');
        setUploading(false);
        return;
      }

      setResult(json);
      setStep(2);
    } catch (err) {
      toast.error('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [file, tab.key, format]);

  const handleCommitClean = useCallback(async (entries) => {
    if (!entries || Object.keys(entries).length === 0) {
      toast.info('No entries to commit.');
      return;
    }
    setCommitting(true);
    try {
      const res = await fetch(
        `${API}/api/ontology/commit/${tab.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries,
            format,
            source: 'excel_upload',
          }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setCommitResult(json);
        setStep(4);
        onComplete?.();
      } else {
        toast.error(json.detail || 'Commit failed.');
      }
    } catch (err) {
      toast.error('Commit error: ' + err.message);
    } finally {
      setCommitting(false);
    }
  }, [tab.key, format, onComplete]);

  const handleDupeResolve = useCallback((resolved) => {
    setShowDupeModal(false);
    setResolvedEntries(resolved);

    // Merge clean + resolved and commit
    const allEntries = { ...(result?.clean_entries || {}), ...resolved };
    handleCommitClean(allEntries);
  }, [result, handleCommitClean]);

  if (!open) return null;

  const hasDupes = result && Object.keys(result.duplicates || {}).length > 0;
  const hasErrors = result && (result.validation_errors || []).length > 0;
  const cleanCount = Object.keys(result?.clean_entries || {}).length;
  const dupeCount = Object.keys(result?.duplicates || {}).length;
  const errorCount = (result?.validation_errors || []).length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)` }}
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Upload {tab.label} Dictionary</h3>
                <p className="text-[11px] text-muted-foreground">
                  Step {step} of 4 — {
                    step === 1 ? 'Select File' :
                    step === 2 ? 'Review Validation' :
                    step === 3 ? 'Resolve Duplicates' :
                    'Complete'
                  }
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 px-6 py-2 bg-slate-50/50">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  s <= step ? 'bg-primary' : 'bg-slate-200'
                )} />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Step 1: File Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div
                  className={cn(
                    'rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
                    file
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-300 bg-slate-50/30 hover:border-primary/40 hover:bg-primary/[0.02]'
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileCheck className="w-8 h-8 text-emerald-500" />
                      <p className="text-sm font-semibold">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB • Click to change
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Supports .xlsx, .xls, .csv, .json
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-blue-50/50 border border-blue-200/40 p-3">
                  <p className="text-[11px] text-blue-700 font-medium mb-1">Expected Columns</p>
                  <p className="text-[10px] text-blue-600">
                    <strong>Code</strong> (required) • <strong>Description</strong> (required) • <strong>Keywords</strong> (optional, semicolon-separated)
                    {tab.key === 'exposure' && <> • <strong>Section</strong> (required for exposure)</>}
                  </p>
                  <p className="text-[10px] text-blue-500 mt-1">
                    Tip: Download the CSV template first for the correct format.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Validation Results */}
            {step === 2 && result && (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg border bg-slate-50/50 p-3 text-center">
                    <p className="text-lg font-bold">{result.total_entries}</p>
                    <p className="text-[10px] text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="rounded-lg border bg-emerald-50/50 border-emerald-200/50 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{cleanCount}</p>
                    <p className="text-[10px] text-emerald-600">Clean</p>
                  </div>
                  <div className="rounded-lg border bg-amber-50/50 border-amber-200/50 p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{dupeCount}</p>
                    <p className="text-[10px] text-amber-600">Duplicates</p>
                  </div>
                  <div className="rounded-lg border bg-red-50/50 border-red-200/50 p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{errorCount}</p>
                    <p className="text-[10px] text-red-600">Errors</p>
                  </div>
                </div>

                {/* Validation errors */}
                {hasErrors && (
                  <div className="rounded-lg border border-red-200/50 bg-red-50/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50/60 border-b border-red-200/30">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[11px] font-semibold text-red-700">Validation Errors</span>
                    </div>
                    <div className="max-h-[150px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-red-50/40 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-1.5 font-semibold text-red-600 w-[60px]">Row</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-red-600 w-[80px]">Field</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-red-600">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.validation_errors.map((err, i) => (
                            <tr key={i} className="border-t border-red-100/50">
                              <td className="px-3 py-1.5 font-mono">{err.row}</td>
                              <td className="px-3 py-1.5 font-medium">{err.field}</td>
                              <td className="px-3 py-1.5 text-red-600">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Duplicate preview */}
                {hasDupes && (
                  <div className="rounded-lg border border-amber-200/50 bg-amber-50/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-semibold text-amber-700">
                        {dupeCount} duplicate code{dupeCount > 1 ? 's' : ''} detected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(result.duplicates).map((code) => (
                        <Badge key={code} variant="outline" className="text-[10px] bg-amber-100/50 text-amber-700 border-amber-300/50 font-mono">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h4 className="text-base font-bold">Upload Complete!</h4>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  {commitResult?.entries_committed || 0} entries have been committed to the {tab.label} dictionary.
                </p>
                {commitResult?.version_id && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Version: {commitResult.version_id}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200/60 bg-slate-50/50">
            <div>
              {step === 2 && result && (
                <p className="text-[11px] text-muted-foreground">
                  {result.valid_entries} valid of {result.total_entries} total entries
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {step < 4 && (
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleClose}>
                  Cancel
                </Button>
              )}

              {/* Step 1 → Upload */}
              {step === 1 && (
                <Button
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  disabled={!file || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Upload & Validate
                </Button>
              )}

              {/* Step 2 → Commit or Resolve */}
              {step === 2 && result && (
                <>
                  {hasDupes ? (
                    <Button
                      size="sm"
                      className="text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700"
                      onClick={() => setShowDupeModal(true)}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Resolve {dupeCount} Duplicate{dupeCount > 1 ? 's' : ''}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      disabled={committing || cleanCount === 0}
                      onClick={() => handleCommitClean(result.clean_entries)}
                    >
                      {committing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Commit {cleanCount} Entries
                    </Button>
                  )}
                </>
              )}

              {/* Step 4 → Done */}
              {step === 4 && (
                <Button size="sm" className="text-xs h-8 gap-1.5" onClick={handleClose}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate resolver modal */}
      <DuplicateResolverModal
        open={showDupeModal}
        onClose={() => setShowDupeModal(false)}
        duplicates={result?.duplicates || {}}
        onResolve={handleDupeResolve}
        copeType={tab.key}
        tabColor={tab.color}
      />
    </>
  );
}
