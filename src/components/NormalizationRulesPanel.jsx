import { useState, useEffect } from 'react';
import {
  Save, RotateCcw, Sparkles, DollarSign, Ruler,
  Calendar, Target, Gauge, Zap, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePipelineStore } from '@/store/usePipelineStore';

const API = import.meta.env.VITE_API_URL || '';

const ACTION_OPTIONS = [
  { value: 'none', label: 'Ignore' },
  { value: 'flag_review', label: 'Flag for Review' },
  { value: 'reset_value', label: 'Reset to Blank' },
];

const STORIES_ACTION_OPTIONS = [
  { value: 'none', label: 'Ignore' },
  { value: 'reset_construction', label: 'Reset Construction to Unknown' },
  { value: 'reset_stories', label: 'Reset Stories to Blank' },
];

const YEAR_ACTION_OPTIONS = [
  { value: 'none', label: 'Ignore' },
  { value: 'flag_review', label: 'Flag for Review' },
  { value: 'reset_year', label: 'Reset Year' },
  { value: 'set_default', label: 'Set Default Year' },
];

function NumberField({ label, value, onChange, prefix, min, max, step = 1 }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className={cn(
            'w-full py-2 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30',
            prefix ? 'pl-7 pr-3' : 'px-3'
          )}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SliderField({ label, value, onChange, min = 0, max = 1, step = 0.05 }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
        <span className="text-[11px] font-mono font-bold text-primary">{(value ?? 0).toFixed(2)}</span>
      </div>
      <input
        type="range"
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-xs rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 font-mono"
      />
    </div>
  );
}

function RuleGroup({ title, icon: Icon, color, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="font-bold text-xs">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

export default function NormalizationRulesPanel() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const setRulesConfig = usePipelineStore((s) => s.setRulesConfig);

  useEffect(() => {
    fetch(`${API}/api/rules/config`)
      .then(r => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/rules/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (res.ok) {
        setRulesConfig(json.config);
        toast.success('Rules configuration saved');
      } else {
        toast.error(json.detail || 'Failed to save');
      }
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch(`${API}/api/rules/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setConfig(json.config);
        setRulesConfig({});
        toast.success('Reset to defaults');
      }
    } catch (err) {
      toast.error('Reset failed');
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Rule Groups */}
      <RuleGroup title="Year Validation" icon={Calendar} color="#8b5cf6">
        <NumberField label="Minimum Year" value={config.year_min} onChange={(v) => updateField('year_min', v)} min={1600} max={2100} />
        <NumberField label="Maximum Year" value={config.year_max} onChange={(v) => updateField('year_max', v)} min={1900} max={2100} />
        <NumberField label="Default Year" value={config.year_default} onChange={(v) => updateField('year_default', v)} min={1800} max={2100} />
        <SelectField label="Invalid Year Action" value={config.invalid_year_action} onChange={(v) => updateField('invalid_year_action', v)} options={YEAR_ACTION_OPTIONS} />
      </RuleGroup>

      <RuleGroup title="Physical Limits" icon={Ruler} color="#10b981">
        <NumberField label="Max Stories (Wood Frame)" value={config.max_stories_wood_frame} onChange={(v) => updateField('max_stories_wood_frame', v)} min={1} max={20} />
        <SelectField label="Stories Exceeded Action" value={config.stories_exceeded_action} onChange={(v) => updateField('stories_exceeded_action', v)} options={STORIES_ACTION_OPTIONS} />
        <NumberField label="Min Area (SqFt)" value={config.min_area_sqft} onChange={(v) => updateField('min_area_sqft', v)} min={0} step={10} />
        <SelectField label="Invalid Area Action" value={config.invalid_area_action} onChange={(v) => updateField('invalid_area_action', v)} options={ACTION_OPTIONS.filter(o => o.value !== 'reset_value')} />
      </RuleGroup>

      <RuleGroup title="Financial Limits" icon={DollarSign} color="#f59e0b">
        <NumberField label="Max Building Value" prefix="$" value={config.max_building_value} onChange={(v) => updateField('max_building_value', v)} min={0} step={1000000} />
        <NumberField label="Max Contents Value" prefix="$" value={config.max_contents_value} onChange={(v) => updateField('max_contents_value', v)} min={0} step={1000000} />
        <NumberField label="Max BI Value" prefix="$" value={config.max_bi_value} onChange={(v) => updateField('max_bi_value', v)} min={0} step={1000000} />
        <SelectField label="Value Exceeded Action" value={config.invalid_value_action} onChange={(v) => updateField('invalid_value_action', v)} options={ACTION_OPTIONS} />
      </RuleGroup>



      <RuleGroup title="Default Codes" icon={ShieldCheck} color="#ef4444">
        <TextField label="Default Occupancy (AIR)" value={config.default_occ_code_air} onChange={(v) => updateField('default_occ_code_air', v)} />
        <TextField label="Default Construction (AIR)" value={config.default_const_code_air} onChange={(v) => updateField('default_const_code_air', v)} />
        <TextField label="Default Occupancy (RMS)" value={config.default_occ_code_rms} onChange={(v) => updateField('default_occ_code_rms', v)} />
        <TextField label="Default Construction (RMS)" value={config.default_const_code_rms} onChange={(v) => updateField('default_const_code_rms', v)} />
      </RuleGroup>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gradient-primary glow-primary text-white font-semibold gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
