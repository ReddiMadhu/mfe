import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, MapPin, Tag, ShieldCheck, CloudRain, Layers, Eye,
  TrendingUp, Award, Lock, Check, Sparkles, Settings2, BarChart3,
  FileOutput, Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePipelineStore } from '@/store/usePipelineStore';
import { cn } from '@/lib/utils';

// ── Agent definitions ──────────────────────────────────────────────────────────

const DATA_AGENT = {
  id: 'dataAgent',
  label: 'Data Agent',
  desc: 'Address normalization, geocoding, and base data validation.',
  icon: MapPin,
};

const SOV_COPE_AGENT = {
  id: 'sovCope',
  label: 'SOV COPE CI/CD MODELING',
  desc: 'Produces AIR/RMS-ready output with AI-assisted column mapping, occupancy & construction coding, and value normalization.',
  icon: Tag,
  steps: [
    { label: 'Occupancy & Construction Mapping', icon: Tag },
    { label: 'Value Normalization', icon: BarChart3 },
    { label: 'Output Formatting', icon: FileOutput },
  ],
};

const UW_AGENTS = [
  { id: 'cope',        label: 'Real time CAT Event Assessment',  icon: ShieldCheck },
  { id: 'hazards',     label: 'Hazard Assessment',               icon: CloudRain },
  { id: 'geospatial',  label: 'Geospatial Data',                 icon: Layers },
  { id: 'objAnalysis', label: 'Property Computer Vision',        icon: Eye },
  { id: 'riskModel',   label: 'Property Vulnerability Risk',     icon: TrendingUp },
  { id: 'propensity',  label: 'Quote Propensity',                icon: Award },
];

// ── Pipeline Stage Component ───────────────────────────────────────────────────

function PipelineStage({ num, title, description, active, locked, onToggle, children, icon: Icon, isLast = false, disabled = false }) {
  return (
    <div className="flex gap-4 relative group">
      <div className="flex flex-col items-center mt-5">
        <button
          type="button"
          onClick={(locked || disabled) ? undefined : onToggle}
          disabled={locked || disabled}
          className={cn(
            'w-6 h-6 rounded-[4px] flex items-center justify-center border-2 shrink-0 transition-all duration-200 shadow-sm',
            active
              ? 'border-primary bg-gradient-to-br from-primary to-primary/80 text-white'
              : disabled
                ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                : 'border-slate-300 bg-white text-transparent hover:border-slate-400 cursor-pointer'
          )}
        >
          <Check size={14} strokeWidth={4} className={cn(!active && "opacity-0")} />
        </button>
      </div>

      <div className="flex-1 pb-6">
        <div className={cn(
          "rounded-2xl border p-5 transition-all duration-300",
          active ? 'glass-strong border-slate-300 shadow-sm' 
                 : 'glass border-border/40'
        )}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Icon size={16} className="text-muted-foreground" />
              {title}
            </h3>
            {locked ? (
              <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500 bg-slate-50">
                Required
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
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

  function handleLaunch() {
    navigate('/pipeline');
  }

  const uwIds = UW_AGENTS.map((a) => a.id);
  const uwCheckedCount = uwIds.filter((id) => selectedAgents[id]).length;
  const allUwChecked = uwCheckedCount === uwIds.length;
  const isAnyUwActive = uwCheckedCount > 0;

  function toggleAllUw() {
    const newVal = !allUwChecked;
    const updated = { ...selectedAgents };
    uwIds.forEach((id) => { updated[id] = newVal; });
    usePipelineStore.getState().setSelectedAgents(updated);
  }

  const selectedCount = 1 + (selectedAgents.sovCope ? 1 : 0) + uwCheckedCount;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 py-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

        {/* ── Left Column: Action Area ────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
          
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Review & Launch
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Select your required target output format and review the pipeline architecture before initiating the modeling process.
            </p>
          </div>

          {/* Target Format */}
          <div className="glass-strong rounded-2xl border border-primary/20 p-6 shadow-sm mt-2">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm uppercase tracking-wide text-foreground">
                Required: Target Format
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              This determines output column names, required code types, and post-processing validation rules.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { id: 'AIR', name: 'AIR Touchstone', desc: 'Occupancy / Construction' },
                { id: 'RMS', name: 'RMS RiskLink', desc: 'OCCTYPE / BLDGCLASS' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setTargetFormat(fmt.id)}
                  className={cn(
                    'flex-1 flex flex-col rounded-xl border-2 p-4 text-left transition-all duration-200',
                    targetFormat === fmt.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/50 bg-background hover:border-primary/30 hover:bg-primary/[0.02]',
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn(
                      'text-sm font-bold uppercase tracking-wide',
                      targetFormat === fmt.id ? 'text-primary' : 'text-foreground/80',
                    )}>
                      {fmt.id}
                    </span>
                    <div
                      className={cn(
                        'w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-all shadow-sm',
                        targetFormat === fmt.id
                          ? 'border-primary bg-gradient-to-br from-primary to-primary/80'
                          : 'border-slate-300',
                      )}
                    >
                      {targetFormat === fmt.id && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-1 font-medium">{fmt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Launch CTA */}
          <div className="mt-2">
            <Button
              onClick={handleLaunch}
              variant="outline"
              size="lg"
              className="w-full bg-white text-primary border-2 border-primary font-bold h-14 rounded-xl text-base shadow-sm hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
            >
              Launch Pipeline
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-3 font-medium">
              {selectedCount} active agent{selectedCount !== 1 ? 's' : ''}  ·  {targetFormat} schema
            </p>
          </div>
        </div>

        {/* ── Right Column: Pipeline Architecture ─────────── */}
        <div className="lg:col-span-7 flex flex-col pt-4 lg:pt-0">
          <div className="flex items-center gap-2 mb-6 px-2">
            <Network className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-sm uppercase tracking-wide text-primary">
              Select the Agents
            </h2>
          </div>

          <div className="pl-2">
            {/* Stage 1: Data Agent */}
            <PipelineStage
              num={1}
              title={DATA_AGENT.label}
              description={DATA_AGENT.desc}
              icon={DATA_AGENT.icon}
              active={true}
              locked={true}
            />

            {/* Stage 2: SOV COPE */}
            <PipelineStage
              num={2}
              title={SOV_COPE_AGENT.label}
              description={SOV_COPE_AGENT.desc}
              icon={SOV_COPE_AGENT.icon}
              active={selectedAgents.sovCope}
              onToggle={() => toggleAgent('sovCope')}
            >
              {/* Internal steps */}
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/40">
                {SOV_COPE_AGENT.steps.map((s) => (
                  <span
                    key={s.label}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors',
                      selectedAgents.sovCope
                        ? 'bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-muted/50 border-border/30 text-muted-foreground',
                    )}
                  >
                    <s.icon size={10} />
                    {s.label}
                  </span>
                ))}
              </div>
            </PipelineStage>

            {/* Stage 3: Underwriting Suite (Coming Soon) */}
            <PipelineStage
              num={3}
              title="Underwriting Suite"
              description="Advanced real-time risk assessment, hazard overlays, and propensity scoring models."
              icon={ShieldCheck}
              active={isAnyUwActive}
              locked={false}
              disabled={false}
              isLast={true}
            >
              <div className="mt-3 pt-3 border-t border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Select Modules</span>
                  <button
                    onClick={toggleAllUw}
                    className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {allUwChecked ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {UW_AGENTS.map((agent) => {
                    const isSelected = selectedAgents[agent.id];
                    return (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] font-medium transition-all duration-200",
                          isSelected
                            ? "border-primary bg-gradient-to-br from-primary to-primary/80 text-white shadow-sm"
                            : "bg-white border-slate-300 text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50"
                        )}
                      >
                        {isSelected ? <Check size={12} /> : <agent.icon size={12} className="text-slate-500" />}
                        {agent.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </PipelineStage>
          </div>

        </div>

      </div>
    </div>
  );
}
