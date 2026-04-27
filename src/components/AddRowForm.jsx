import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DuplicateResolverModal from './DuplicateResolverModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * AddRowForm — Inline form to add a single entry to a COPE dictionary.
 *
 * Props:
 *   tab       — COPE tab object ({ key, label, short, icon, color })
 *   format    — 'AIR' | 'RMS'
 *   onSave    — callback after successful save (triggers table refresh)
 *   onCancel  — callback to hide the form
 */
export default function AddRowForm({ tab, format, onSave, onCancel }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [section, setSection] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDupeModal, setShowDupeModal] = useState(false);
  const [dupeData, setDupeData] = useState({});
  const formRef = useRef(null);
  const codeInputRef = useRef(null);

  // Auto-scroll form into view and focus code input when form mounts
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => codeInputRef.current?.focus(), 300);
  }, []);

  const isExposure = tab.key === 'exposure';

  const VALID_SECTIONS = [
    'roof_cover', 'wall_type', 'foundation_type', 'soft_story',
    'rms_roofsys', 'rms_cladsys',
  ];

  const handleSubmit = useCallback(async (force = false) => {
    const trimCode = code.trim();
    const trimDesc = description.trim();

    if (!trimCode) return toast.error('Code is required.');
    if (!trimDesc) return toast.error('Description is required.');
    if (isExposure && !section) return toast.error('Section is required for exposure entries.');

    setSaving(true);
    try {
      const body = {
        code: trimCode,
        description: trimDesc,
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        force,
      };
      if (isExposure) body.section = section;

      const res = await fetch(
        `${API}/api/ontology/entry/${tab.key}?format=${format}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.detail || 'Failed to add entry.');
        return;
      }

      if (json.status === 'duplicates_found') {
        // Build dupe data for modal
        setDupeData({
          [trimCode]: {
            new_entry: {
              description: trimDesc,
              keywords: body.keywords,
            },
            matches: json.duplicates,
          },
        });
        setShowDupeModal(true);
        return;
      }

      toast.success(`Entry "${trimCode}" added successfully.`);
      setCode('');
      setDescription('');
      setKeywords('');
      setSection('');
      onSave?.();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [code, description, keywords, section, isExposure, tab.key, format, onSave]);

  const handleDupeResolve = useCallback(async (resolvedEntries) => {
    setShowDupeModal(false);
    if (Object.keys(resolvedEntries).length === 0) {
      toast.info('No entries saved — kept existing.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/ontology/commit/${tab.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: resolvedEntries,
            format,
            source: 'manual',
          }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        toast.success(`${json.entries_committed} entry saved.`);
        setCode('');
        setDescription('');
        setKeywords('');
        setSection('');
        onSave?.();
      } else {
        toast.error(json.detail || 'Commit failed.');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [tab.key, format, onSave]);

  return (
    <>
      <div ref={formRef} className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.02] p-3 mt-2 animate-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
            Add New {tab.label} Entry
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {/* Section dropdown — exposure only */}
          {isExposure && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="h-8 px-2 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="">Select...</option>
                {VALID_SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Code */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Code</label>
            <input
              ref={codeInputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 201"
              className="h-8 w-[90px] px-2.5 text-xs font-mono rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Reinforced Concrete"
              className="h-8 px-2.5 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Keywords */}
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. rc, concrete, rcc"
              className="h-8 px-2.5 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 pb-[1px]">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 px-3"
              disabled={saving}
              onClick={() => handleSubmit(false)}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={onCancel}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <DuplicateResolverModal
        open={showDupeModal}
        onClose={() => setShowDupeModal(false)}
        duplicates={dupeData}
        onResolve={handleDupeResolve}
        copeType={tab.key}
        tabColor={tab.color}
      />
    </>
  );
}
