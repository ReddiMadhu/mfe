import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, Tag, MapPin, Globe, Eye, Shield, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePipelineStore } from '@/store/usePipelineStore';
import DataPreview from '@/components/DataPreview';
import AgentGraph from '@/components/AgentGraph';
import { cn } from '@/lib/utils';

const CAT_STEPS = [
  { icon: Tag,    label: 'Occupancy & Construction Mapping',  desc: '4-stage LLM occupancy & construction coding' },
  { icon: BarChart3, label: 'Value Normalization',   desc: 'Standardize year, area, values, currency' },
  { icon: BarChart3, label: 'Output Formatting',   desc: 'Generate AIR/RMS formatted output' },
];

const UW_STEPS = [
  { icon: Shield,    label: '6 - Real time CAT Event Assessment',    desc: 'Real-time monitoring and trigger assessment' },
  { icon: Zap,       label: '3 - Hazard Assessment', desc: 'Flood, wind, fire, earthquake risk layers' },
  { icon: Globe,     label: '4 - Geospatial Data', desc: 'High-resolution geospatial imagery' },
  { icon: Eye,       label: '5 - Property Computer Vision',  desc: 'Computer vision detection from satellite' },
  { icon: BarChart3, label: '7 - Property Vulnerability Risk',    desc: 'Aggregate risk scoring from all signals' },
  { icon: TrendingUp,label: '8 - Quote Propensity', desc: 'Final underwriting appetite score' },
];

export default function AgentSelectPage() {
  const { id: uploadId } = useParams();
  const navigate = useNavigate();
  const { rawPreview, uploadMeta } = usePipelineStore();

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1"><span className="gradient-text">Select Agent</span></h1>
        <p className="text-sm text-muted-foreground">Choose a downstream processing agent for your geocoded data</p>
      </div>

      {/* â”€â”€ Agent Network Diagram â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="glass rounded-2xl border border-border/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Full Pipeline Architecture</span>
          <span className="ml-auto text-[10px] text-indigo-400 font-medium">CAT â–  Active &nbsp;&nbsp; UW â–  Coming Soon</span>
        </div>
        <AgentGraph stepStatus={{ normalize: 'done', geocode: 'done' }} agentStates={{}} />
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* CAT Agent â€” active */}
        <div className="glass-strong rounded-2xl border border-primary/30 p-6 flex flex-col gap-5 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl gradient-primary glow-primary-sm flex items-center justify-center">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">2.SOV COPE CI/CD MODELING</h2>
                <p className="text-xs text-muted-foreground">Catastrophe Modeling Pipeline</p>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">Active</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Produces AIR/RMS-ready output with AI-assisted column mapping, occupancy &amp; construction code classification, and full value normalization.
          </p>

          {/* Sub-steps */}
          <div className="space-y-2">
            {CAT_STEPS.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <span className="w-5 h-5 rounded-full gradient-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                <div>
                  <p className="text-xs font-medium text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={() => navigate(`/session/${uploadId}/mapping`)}
            className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-11 hover:opacity-90 transition-all">
            Configure CAT Agent <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Underwriting Agent â€” coming soon */}
        <div className="glass rounded-2xl border border-border/40 p-6 flex flex-col gap-5 opacity-75">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">UNDERWRITING AGENT</h2>
                <p className="text-xs text-muted-foreground">Risk Assessment Pipeline</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 bg-amber-50">Coming Soon</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Full underwriting intelligence â€” COPE analysis, hazard layers, geospatial imagery, object detection, risk modeling, and quote propensity scoring.
          </p>

          {/* Sub-steps */}
          <div className="space-y-2">
            {UW_STEPS.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
                <span className="w-5 h-5 rounded-full bg-muted border text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                <div>
                  <p className="text-xs font-medium text-foreground/60">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                <Lock className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
              </div>
            ))}
          </div>

          <Button disabled variant="outline"
            className="w-full rounded-xl h-11 text-muted-foreground opacity-50 cursor-not-allowed">
            <Lock className="w-4 h-4 mr-2" /> Coming Soon
          </Button>
        </div>
      </div>

      {/* Data Preview */}
      {rawPreview.length > 0 && <DataPreview rows={rawPreview} headers={uploadMeta?.headers} />}
    </div>
  );
}

