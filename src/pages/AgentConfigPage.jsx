import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, MapPin, Tag, ShieldCheck, CloudRain, Layers, Eye,
  TrendingUp, Award, Check, Sparkles, Settings2, FileOutput, BookOpen,
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
  label: '2.SOV COPE CI/CD MODELING',
  desc: 'Produces AIR/RMS-ready output with AI-assisted column mapping, occupancy & construction coding, and value normalization.',
  icon: Tag,
  steps: [
    { label: 'Occupancy & Construction Mapping', icon: Sparkles },
    { label: 'Value Normalization', icon: Sparkles },
    { label: 'Output Formatting', icon: FileOutput },
  ],
};

const UW_AGENTS = [
  { id: 'cope', label: 'Real time CAT Event Assessment', icon: ShieldCheck },
  { id: 'hazards', label: 'Hazard Assessment', icon: CloudRain },
  { id: 'geospatial', label: 'Geospatial Data', icon: Layers },
  { id: 'objAnalysis', label: 'Property Computer Vision', icon: Eye },
  { id: 'riskModel', label: 'Property Vulnerability Risk', icon: TrendingUp },
  { id: 'propensity', label: 'Quote Propensity', icon: Award },
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
            'w-5 h-5 rounded-[4px] flex items-center justify-center border-2 shrink-0 transition-all duration-200 shadow-sm',
            active
              ? 'border-primary bg-transparent text-primary'
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

        {/* ── Right Column: Pipeline Architecture ─────────── */}
        <div className="lg:col-span-7 flex flex-col pt-4 lg:pt-0">
          <div className="flex items-center gap-2 mb-6 px-2">
            <h2 className="font-bold text-sm uppercase tracking-wide text-primary">
              Configure Agent Network
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

            {/* Stage 3: Annual Simulation — auto-enabled with SOV COPE */}
            <div className={cn("flex gap-4 relative group")}>
              <div className="flex flex-col items-center mt-5">
                <div className={cn(
                  'w-5 h-5 rounded-[4px] flex items-center justify-center border-2 shrink-0 transition-all duration-200 shadow-sm',
                  selectedAgents.sovCope
                    ? 'border-primary bg-transparent text-primary'
                    : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                )}>
                  {selectedAgents.sovCope && <Check size={14} strokeWidth={4} />}
                </div>
              </div>
              <div className="flex-1 pb-6">
                <div className={cn(
                  "rounded-2xl border p-5 transition-all duration-300",
                  selectedAgents.sovCope ? 'glass-strong border-slate-300 shadow-sm' : 'glass border-border/40 opacity-50'
                )}>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <TrendingUp size={16} className="text-muted-foreground" />
                      3. Annual Simulation
                    </h3>
                    <Badge variant="outline" className={cn("text-[10px]",
                      selectedAgents.sovCope
                        ? "border-slate-300 text-slate-500 bg-slate-50"
                        : "border-slate-300 text-slate-400")}>
                      {selectedAgents.sovCope ? 'Auto-enabled' : 'Requires SOV COPE'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Aggregates SOV exposure data, AI slip-coded terms, and hazard assessment results into the final downloadable dataset.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/40">
                    {[
                      { label: 'Location File', badge: 'Auto-filled from SOV' },
                      { label: 'Policy File', badge: 'Upload required' },
                      { label: 'Account File', badge: 'Auto-filled from SOV' },
                    ].map((item) => (
                      <span key={item.label}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors',
                          selectedAgents.sovCope
                            ? 'bg-slate-100 border-slate-200 text-slate-800'
                            : 'bg-muted/50 border-border/30 text-muted-foreground'
                        )}
                      >
                        {item.label}
                        <span className="text-[8px] font-normal opacity-70 ml-0.5">— {item.badge}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage 4: Underwriting Agent (Coming Soon) */}
            <PipelineStage
              num={4}
              title="Underwriting Agent"
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
                            ? "bg-white border-primary text-primary shadow-sm"
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

        {/* ── Left Column: Action Area ────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">



          {/* View Ontology */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300">
            {/* Subtle background decoration */}
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-slate-100/60 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-slate-100/60 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 shadow-sm border border-slate-200">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-sm uppercase tracking-wider text-slate-700">Ontology & Rules</h2>
              <Badge variant="outline" className="ml-auto text-[10px] border-slate-200 text-slate-500 bg-slate-50 font-bold shadow-sm uppercase tracking-wide">
                Reference
              </Badge>
            </div>
            <p className="relative z-10 text-xs text-slate-400 mb-4 leading-relaxed pr-2 font-medium">
              Browse the COPE dictionary, normalization rules, and geocoding settings that drive the AI agent mapping logic.
            </p>

            <button
              onClick={() => navigate('/ontology')}
              className="relative z-10 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold border border-slate-200 hover:bg-slate-200 hover:border-slate-300 active:scale-[0.98] transition-all duration-200"
            >
              <BookOpen className="w-4 h-4 shrink-0 text-slate-500" />
              <span>View Ontology</span>
              <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-slate-400" />
            </button>

            <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'COPE Dictionary', color: 'bg-slate-50 border-slate-200 text-slate-500' },
                { label: 'Normalization Rules', color: 'bg-slate-50 border-slate-200 text-slate-500' },
                { label: 'Geocoding Info', color: 'bg-slate-50 border-slate-200 text-slate-500' },
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-center text-center px-2 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wide ${item.color}`}>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Target Format */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-slate-50 to-primary/5 p-6 shadow-md mt-2 transition-all duration-300">
            {/* Glow blobs */}
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                    <Settings2 className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                    Target Output Format
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 font-medium max-w-sm leading-relaxed">
                  Select the downstream catastrophe modeling schema. This drives mapping logic and final export generation.
                </p>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { 
                  id: 'AIR', 
                  name: 'AIR Touchstone', 
                  desc: 'Occupancy / Construction Codes',
                },
                { 
                  id: 'RMS', 
                  name: 'RMS RiskLink', 
                  desc: 'OCCTYPE / BLDGCLASS Codes',
                },
              ].map((fmt) => {
                const isActive = targetFormat === fmt.id;
                
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setTargetFormat(fmt.id)}
                    className={cn(
                      'group relative flex flex-col rounded-xl p-5 text-left transition-all duration-300 overflow-hidden',
                      isActive
                        ? 'border-2 border-primary bg-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1),0_4px_8px_-4px_rgba(0,0,0,0.06)] scale-[1.02]'
                        : 'border-2 border-slate-200/80 bg-slate-50/50 hover:border-slate-300 hover:bg-white hover:shadow-sm',
                    )}
                  >
                    {/* Active Background Glow */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
                    )}

                    <div className="relative z-10 flex justify-end items-start mb-4">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm',
                          isActive
                            ? 'border-primary bg-primary'
                            : 'border-slate-300 bg-white group-hover:border-slate-400',
                        )}
                      >
                        {isActive && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    
                    <div className="relative z-10">
                      <h3 className={cn(
                        'text-lg font-black tracking-tight mb-1',
                        isActive ? 'text-primary' : 'text-slate-700'
                      )}>
                        {fmt.id}
                      </h3>
                      <p className={cn(
                        'text-[13px] font-bold',
                        isActive ? 'text-slate-800' : 'text-slate-600'
                      )}>
                        {fmt.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Launch CTA */}
          <div className="mt-2">
            <Button
              onClick={handleLaunch}
              size="lg"
              className="w-full gradient-primary glow-primary text-white font-bold h-14 rounded-xl text-base shadow-sm hover:opacity-90 hover:-translate-y-0.5 transition-all"
            >
              Launch Pipeline
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-3 font-medium">
              {selectedCount} active agent{selectedCount !== 1 ? 's' : ''}  ·  {targetFormat} schema
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
