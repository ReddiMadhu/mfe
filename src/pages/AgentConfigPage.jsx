import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowRight, MapPin, Tag, ShieldCheck, CloudRain, Layers, Eye,
  TrendingUp, Award, Lock, Check, Sparkles, Settings2, BarChart3,
  FileOutput, CheckCircle2, Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePipelineStore } from '@/store/usePipelineStore';
import { cn } from '@/lib/utils';

// ── Agent definitions ──────────────────────────────────────────────────────────

const DATA_AGENT = {
  id: 'dataAgent',
  label: '1 - Data Agent',
  desc: 'Address normalization, geocoding, and data validation',
  icon: MapPin,
  color: '#0ea5e9',
  locked: true,
};

const SOV_COPE_AGENT = {
  id: 'sovCope',
  label: 'SOV COPE CI/CD MODELING',
  desc: 'Produces AIR/RMS-ready output with AI-assisted column mapping, occupancy & construction code classification, and full value normalization.',
  icon: Tag,
  color: '#8b5cf6',
  steps: [
    { label: 'Occupancy & Construction Mapping', icon: Tag },
    { label: 'Value Normalization', icon: BarChart3 },
    { label: 'Output Formatting', icon: FileOutput },
  ],
};

const UW_AGENTS = [
  { id: 'cope',        label: '6 - Real time CAT Event Assessment', desc: 'Real-time monitoring and trigger assessment',     icon: ShieldCheck, color: '#f59e0b' },
  { id: 'hazards',     label: '3 - Hazard Assessment',              desc: 'Flood, wind, fire, earthquake risk layers',       icon: CloudRain,   color: '#ef4444' },
  { id: 'geospatial',  label: '4 - Geospatial Data',                desc: 'High-resolution geospatial imagery & indexing',   icon: Layers,      color: '#10b981' },
  { id: 'objAnalysis', label: '5 - Property Computer Vision',       desc: 'Structural feature detection from satellite',     icon: Eye,         color: '#ec4899' },
  { id: 'riskModel',   label: '7 - Property Vulnerability Risk',    desc: 'Aggregate risk scoring from all signals',         icon: TrendingUp,  color: '#4f46e5' },
  { id: 'propensity',  label: '8 - Quote Propensity',               desc: 'Final underwriting appetite score',               icon: Award,       color: '#f43f5e' },
];

// ── Custom checkbox ────────────────────────────────────────────────────────────

function AgentCheckbox({ checked, locked, onChange, color }) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onChange}
      className={cn(
        'w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200',
        locked
          ? 'border-slate-300 bg-slate-100 cursor-not-allowed'
          : checked
            ? 'border-transparent shadow-sm cursor-pointer'
            : 'border-slate-300 bg-white hover:border-slate-400 cursor-pointer',
      )}
      style={
        checked && !locked
          ? { background: `linear-gradient(135deg, ${color}, ${color}dd)`, borderColor: color }
          : locked && checked
            ? { background: '#cbd5e1', borderColor: '#94a3b8' }
            : undefined
      }
    >
      {locked ? (
        <Lock size={11} className="text-slate-500" />
      ) : checked ? (
        <Check size={13} className="text-white" strokeWidth={3} />
      ) : null}
    </button>
  );
}

// ── Agent card ─────────────────────────────────────────────────────────────────

function AgentCard({ agent, checked, onToggle, locked = false, children }) {
  const Icon = agent.icon;
  return (
    <div
      onClick={locked ? undefined : onToggle}
      className={cn(
        'rounded-2xl border p-5 transition-all duration-300 group',
        locked
          ? 'bg-slate-50/80 border-slate-200/60 cursor-default'
          : checked
            ? 'glass-strong border-primary/30 shadow-md hover:shadow-lg cursor-pointer'
            : 'glass border-border/40 opacity-60 hover:opacity-80 cursor-pointer',
      )}
    >
      <div className="flex items-start gap-4">
        <AgentCheckbox
          checked={checked}
          locked={locked}
          onChange={onToggle}
          color={agent.color}
        />
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            checked ? 'shadow-sm' : 'bg-muted border border-border',
          )}
          style={
            checked
              ? { background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)` }
              : undefined
          }
        >
          <Icon className={cn('w-5 h-5', checked ? 'text-white' : 'text-muted-foreground')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-foreground">{agent.label}</h3>
            {locked && (
              <Badge variant="outline" className="text-[9px] border-slate-300 text-slate-500 bg-slate-50">
                Always Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{agent.desc}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AgentConfigPage() {
  const navigate = useNavigate();
  const {
    targetFormat, setTargetFormat,
    selectedAgents, toggleAgent,
  } = usePipelineStore();

  // UW "select all / deselect all" logic
  const uwIds = UW_AGENTS.map((a) => a.id);
  const uwCheckedCount = uwIds.filter((id) => selectedAgents[id]).length;
  const allUwChecked = uwCheckedCount === uwIds.length;

  function toggleAllUw() {
    const newVal = !allUwChecked;
    const updated = { ...selectedAgents };
    uwIds.forEach((id) => { updated[id] = newVal; });
    usePipelineStore.getState().setSelectedAgents(updated);
  }

  function handleLaunch() {
    navigate('/pipeline');
  }

  const selectedCount =
    (selectedAgents.dataAgent ? 1 : 0) +
    (selectedAgents.sovCope ? 1 : 0) +
    uwCheckedCount;

  const totalCount = 2 + uwIds.length; // Data Agent + SOV COPE + 6 UW agents

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Settings2 className="w-3.5 h-3.5" />
            Pipeline Configuration
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="gradient-text">Configure Your Pipeline</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Select the target format and choose which agents to activate before launching the pipeline.
          </p>
          <button
            onClick={() => navigate('/ontology')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-xs font-semibold hover:bg-violet-500/20 transition-colors mt-1 mx-auto"
          >
            <Brain className="w-3.5 h-3.5" />
            Knowledge Base & Ontology
          </button>
        </div>

        {/* ── Section 1: Target Format ────────────────────── */}
        <div className="glass-strong rounded-2xl border border-primary/20 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm uppercase tracking-wide text-foreground">
              Step 1 — Target Format
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Choose the output schema for catastrophe modeling. This determines column names, code types, and validation rules.
          </p>

          <div className="flex gap-3">
            {[
              { id: 'AIR', name: 'AIR Touchstone', desc: 'AIR field schema with OccupancyCode / ConstructionCode' },
              { id: 'RMS', name: 'RMS RiskLink', desc: 'RMS field schema with OCCTYPE / BLDGCLASS' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setTargetFormat(fmt.id)}
                className={cn(
                  'flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  targetFormat === fmt.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/50 bg-background hover:border-primary/30 hover:bg-primary/[0.02]',
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                      targetFormat === fmt.id
                        ? 'border-primary bg-primary'
                        : 'border-slate-300',
                    )}
                  >
                    {targetFormat === fmt.id && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={cn(
                    'text-sm font-bold uppercase tracking-wide',
                    targetFormat === fmt.id ? 'text-primary' : 'text-foreground/60',
                  )}>
                    {fmt.id}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">
                  {fmt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Section 2: Select Agents ────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm uppercase tracking-wide text-foreground">
              Step 2 — Select Agents
            </h2>
            <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">
              {selectedCount} / {totalCount} active
            </Badge>
          </div>

          {/* Data Agent — locked */}
          <AgentCard
            agent={DATA_AGENT}
            checked={true}
            locked={true}
          />

          {/* SOV COPE CI/CD MODELING — single checkbox */}
          <AgentCard
            agent={SOV_COPE_AGENT}
            checked={selectedAgents.sovCope}
            onToggle={() => toggleAgent('sovCope')}
          >
            {/* Internal steps as read-only pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {SOV_COPE_AGENT.steps.map((s) => (
                <span
                  key={s.label}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                    selectedAgents.sovCope
                      ? 'bg-violet-50 border-violet-200/60 text-violet-600'
                      : 'bg-muted/50 border-border/30 text-muted-foreground',
                  )}
                >
                  <s.icon size={10} />
                  {s.label}
                </span>
              ))}
            </div>
          </AgentCard>

          {/* UNDERWRITING AGENT group */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                UNDERWRITING AGENT
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] text-muted-foreground">
                Individual underwriting agents — select which modules to activate.
              </p>
              <button
                onClick={toggleAllUw}
                className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                {allUwChecked ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UW_AGENTS.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  checked={selectedAgents[agent.id]}
                  onToggle={() => toggleAgent(agent.id)}
                >
                  <Badge
                    variant="outline"
                    className="mt-2 text-[9px] border-amber-300/50 text-amber-600 bg-amber-50/80"
                  >
                    Coming Soon
                  </Badge>
                </AgentCard>
              ))}
            </div>
          </div>
        </div>

        {/* ── Launch CTA ──────────────────────────────────── */}
        <div className="sticky bottom-6 z-30 pt-2">
          <Button
            onClick={handleLaunch}
            size="lg"
            className="w-full gradient-primary glow-primary text-white font-semibold h-13 px-8 rounded-xl text-base hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg"
          >
            Launch Pipeline
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            {selectedCount} agent{selectedCount !== 1 ? 's' : ''} selected · {targetFormat} format
          </p>
        </div>

      </div>
    </div>
  );
}
