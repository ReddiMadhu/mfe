import { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, Upload, ChevronDown, ChevronRight,
  Hammer, Building2, ShieldCheck, Layers, Trash2, FileUp,
  CheckCircle2, AlertCircle, Plus, FileSpreadsheet,
  Pencil, Check, X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePipelineStore } from '@/store/usePipelineStore';
import AddRowForm from './AddRowForm';
import ExcelUploadModal from './ExcelUploadModal';

const API = import.meta.env.VITE_API_URL || '';

const COPE_TABS = [
  { key: 'construction', label: 'Construction', short: 'C', icon: Hammer, color: '#8b5cf6', desc: 'Structural materials & methods' },
  { key: 'occupancy',    label: 'Occupancy',    short: 'O', icon: Building2, color: '#0ea5e9', desc: 'Building usage categories' },
  { key: 'protection',   label: 'Protection',   short: 'P', icon: ShieldCheck, color: '#f59e0b', desc: 'ISO Fire Class mapping' },
  { key: 'exposure',     label: 'Exposure',     short: 'E', icon: Layers, color: '#10b981', desc: 'Secondary modifiers (roof, wall, foundation)' },
];

/** Inline editable table row — only Keywords/Aliases are editable; Description is read-only */
function EditableRow({ row, tab, saving, onSave, onCancel }) {
  const [kw, setKw] = useState(row.keywords.join(', '));

  return (
    <tr className="border-t border-primary/20 bg-primary/[0.03]">
      {tab.key === 'exposure' && (
        <td className="px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">{row.section}</td>
      )}
      <td className="px-3 py-1.5 font-mono font-bold" style={{ color: tab.color }}>{row.code}</td>
      {/* Description is read-only — only Keywords can be edited */}
      <td className="px-3 py-1.5 text-xs text-muted-foreground italic select-none">{row.description}</td>
      <td className="px-3 py-1.5">
        <input
          autoFocus
          type="text"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="comma-separated keywords"
          className="w-full h-7 px-2 text-xs rounded-md border border-primary/30 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              const keywords = kw.split(',').map((k) => k.trim()).filter(Boolean);
              onSave(row.description, keywords);
            }}
            disabled={saving}
            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-40"
            title="Save"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CopeSection({ tab, format }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fmtParam = tab.key === 'protection' ? '' : `?format=${format}`;
      const url = tab.key === 'exposure'
        ? `${API}/api/ontology/exposure?format=${format}`
        : `${API}/api/ontology/${tab.key}${fmtParam}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab.key, format]);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/ontology/versions/${tab.key}?format=${format}`);
      const json = await res.json();
      setVersions(json.versions || []);
    } catch (e) { console.error(e); }
  }, [tab.key, format]);

  useEffect(() => {
    if (expanded && !data) fetchData();
  }, [expanded, data, fetchData]);

  useEffect(() => {
    if (expanded) {
      setData(null);
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  const handleDownload = async () => {
    const fmtParam = tab.key === 'protection' ? 'AIR' : format;
    window.open(`${API}/api/ontology/template/${tab.key}?format=${fmtParam}`, '_blank');
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const fmtParam = tab.key === 'protection' ? 'AIR' : format;
      const res = await fetch(`${API}/api/ontology/upload/${tab.key}?format=${fmtParam}`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Uploaded ${json.entries_uploaded} entries. ${json.entries_merged_live} merged live.`);
        fetchData();
        fetchVersions();
      } else {
        toast.error(json.detail || 'Upload failed');
      }
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    }
    e.target.value = '';
  };

  const handleDeleteVersion = async (versionId) => {
    try {
      const res = await fetch(`${API}/api/ontology/versions/${tab.key}/${versionId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Version deleted');
        fetchVersions();
        fetchData();
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleDeleteEntry = async (entryCode) => {
    if (!window.confirm(`Delete code "${entryCode}" from ${tab.label}?`)) return;
    try {
      const fmtParam = tab.key === 'protection' ? 'AIR' : format;
      const res = await fetch(
        `${API}/api/ontology/entry/${tab.key}/${encodeURIComponent(entryCode)}?format=${fmtParam}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        toast.success(`Code "${entryCode}" deleted.`);
        fetchData();
      } else {
        const json = await res.json();
        toast.error(json.detail || 'Delete failed.');
      }
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const [editingCode, setEditingCode] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const handleEditEntry = async (entryCode, newDesc, newKeywords) => {
    setEditSaving(true);
    try {
      const fmtParam = tab.key === 'protection' ? 'AIR' : format;
      const res = await fetch(
        `${API}/api/ontology/entry/${tab.key}/${encodeURIComponent(entryCode)}?format=${fmtParam}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: newDesc,
            keywords: newKeywords,
          }),
        }
      );
      if (res.ok) {
        toast.success(`Code "${entryCode}" updated.`);
        setEditingCode(null);
        fetchData();
      } else {
        const json = await res.json();
        toast.error(json.detail || 'Update failed.');
      }
    } catch (err) {
      toast.error('Update failed: ' + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Build flat rows from data
  const rows = [];
  if (data) {
    if (tab.key === 'exposure') {
      const sections = data.data || {};
      for (const [secKey, secData] of Object.entries(sections)) {
        const codes = secData?.codes || {};
        const aliases = secData?.aliases || {};
        for (const [code, desc] of Object.entries(codes)) {
          const matchingAliases = Object.entries(aliases)
            .filter(([, c]) => String(c) === String(code))
            .map(([a]) => a);
          rows.push({ section: secKey, code, description: desc, keywords: matchingAliases });
        }
      }
    } else {
      const codes = data.codes || {};
      for (const [code, meta] of Object.entries(codes)) {
        if (code.startsWith('_')) continue;
        const desc = meta?.description || meta?.iso_label || '';
        const kw = meta?.keywords || meta?.aliases || [];
        rows.push({ code, description: desc, keywords: Array.isArray(kw) ? kw : Object.keys(kw) });
      }
    }
  }

  const q = search.toLowerCase();
  const filtered = q
    ? rows.filter(r =>
        r.code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.keywords.some(k => k.toLowerCase().includes(q))
      )
    : rows;

  const Icon = tab.icon;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 overflow-hidden">
      <button
        onClick={() => { setExpanded(!expanded); if (!expanded) fetchVersions(); }}
        className="w-full flex items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors text-left"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)` }}
        >
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{tab.label}</span>
            <Badge variant="outline" className="text-[9px]">{tab.short}</Badge>
            {data && (
              <Badge variant="secondary" className="text-[9px] bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10">
                {tab.key === 'exposure' ? `${Object.keys(data.data || {}).length} sections` : `${data.code_count || rows.length} codes`}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{tab.desc}</p>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-slate-400 stroke-[2.5px]" /> : <ChevronRight className="w-5 h-5 text-slate-400 stroke-[2.5px]" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40 p-4 space-y-3 bg-muted/10">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search codes, descriptions, keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <Button
              size="sm"
              className="text-xs gap-1.5 h-8"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-3.5 h-3.5" /> Add Entry
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" /> Template
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 pointer-events-none" tabIndex={-1}>
                <Upload className="w-3.5 h-3.5" /> Upload
              </Button>
              <input type="file" accept=".csv,.json" className="hidden" onChange={handleUpload} />
            </label>
            <Button
              variant="outline" size="sm"
              className="text-xs gap-1.5 h-8"
              onClick={() => setShowExcelModal(true)}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel Upload
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-xs gap-1 h-8 text-muted-foreground"
              onClick={() => setShowVersions(!showVersions)}
            >
              <FileUp className="w-3.5 h-3.5" />
              {versions.length > 0 ? `${versions.length} override${versions.length > 1 ? 's' : ''}` : 'No overrides'}
            </Button>
          </div>

          {/* Version list */}
          {showVersions && versions.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-background p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Override Versions</p>
              {versions.map((v) => (
                <div key={v.version_id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                  <div>
                    <span className="font-medium">{v.filename}</span>
                    <span className="text-muted-foreground ml-2">{new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                    onClick={() => handleDeleteVersion(v.version_id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Data table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="rounded-lg border border-border/40 overflow-hidden max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {tab.key === 'exposure' && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Section</th>}
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[70px]">Code</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Description</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Keywords / Aliases</th>
                    <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const isEditing = editingCode === row.code;

                    if (isEditing) {
                      return (
                        <EditableRow
                          key={`${row.section || ''}-${row.code}-${i}`}
                          row={row}
                          tab={tab}
                          saving={editSaving}
                          onSave={(desc, kw) => handleEditEntry(row.code, desc, kw)}
                          onCancel={() => setEditingCode(null)}
                        />
                      );
                    }

                    return (
                      <tr key={`${row.section || ''}-${row.code}-${i}`} className={cn('border-t border-border/20 group', i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                        {tab.key === 'exposure' && (
                          <td className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{row.section}</td>
                        )}
                        <td className="px-3 py-2 font-mono font-bold" style={{ color: tab.color }}>{row.code}</td>
                        <td className="px-3 py-2 font-medium">{row.description}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <div className="flex flex-wrap gap-1">
                            {row.keywords.slice(0, 8).map((kw, j) => (
                              <span key={j} className="inline-block px-1.5 py-0.5 rounded bg-muted/50 text-[10px]">{kw}</span>
                            ))}
                            {row.keywords.length > 8 && (
                              <span className="text-[10px] text-muted-foreground">+{row.keywords.length - 8} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingCode(row.code)}
                              className="p-1 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                              title={`Edit ${row.code}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(row.code)}
                              className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title={`Delete ${row.code}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={tab.key === 'exposure' ? 5 : 4} className="px-3 py-8 text-center text-muted-foreground">
                        {search ? 'No matches found.' : 'No data loaded.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Row Form */}
          {showAddForm && (
            <AddRowForm
              tab={tab}
              format={format}
              onSave={() => { fetchData(); fetchVersions(); setShowAddForm(false); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          <p className="text-[10px] text-muted-foreground text-right">
            Showing {filtered.length} of {rows.length} entries
          </p>
        </div>
      )}

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        open={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        tab={tab}
        format={format}
        onComplete={() => { fetchData(); fetchVersions(); }}
      />
    </div>
  );
}

export default function OntologyPanel() {
  const targetFormat = usePipelineStore((s) => s.targetFormat);

  return (
    <div className="space-y-5">
      {COPE_TABS.map((tab) => (
        <CopeSection key={tab.key} tab={tab} format={targetFormat} />
      ))}
    </div>
  );
}
