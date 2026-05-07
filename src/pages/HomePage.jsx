import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Network, Shield, BarChart3, MapPin, LayoutDashboard, Sparkles, ShieldCheck, TrendingUp, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePipelineStore } from '@/store/usePipelineStore';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: MapPin, label: 'Data Agent' },
  { icon: Tag, label: 'SOV COPE Modeling', isAI: true },
  { icon: TrendingUp, label: 'Pre-EP Curve Modeling Ready', isAI: true },
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: ShieldCheck, label: 'Underwriting Agent (Coming Soon)', disabled: true },
];

const FEATURES = [
  { icon: Zap, label: 'Autonomous Processing', desc: 'Data normalization, geocoding, and enrichment fire automatically upon upload.' },
  { icon: Sparkles, label: 'Generative AI Agents', desc: 'LLMs intelligently map complex COPE variables and extract deep insurance policy terms.' },
  { icon: TrendingUp, label: 'Pre-EP Curve Modeling', desc: 'Generate complete simulation-ready portfolios, account data, and policy structures instantly.' },
  { icon: BarChart3, label: 'Real-time Analytics', desc: 'Interactive breakdown tables, dynamic hazard charts, and instant AIR/RMS ready CSV exports.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const reset = usePipelineStore((s) => s.reset);

  function handleStart() {
    reset();
    navigate('/configure');
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-start text-center px-6 pt-10 pb-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Multi-Agent AI Pipeline
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 max-w-3xl leading-[1.1]">
          <span className="gradient-text">Exposure Modeling</span>
          <br />
          <span className="text-foreground">Pipeline</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-3xl mb-14 leading-relaxed mx-auto text-balance">
          Supercharge your exposure management with an autonomous multi-agent AI pipeline.
          Ingest SOV and policy data to geocode addresses and leverage GenAI for COPE mapping,
          instantly generating precise AIR/RMS outputs and Pre-EP Curve models.
        </p>

        {/* Premium Pipeline steps strip */}
        <div className="flex flex-wrap justify-center gap-4 max-w-5xl mb-14 relative z-10">
          {STEPS.map((s, i) => (
            <div 
              key={i} 
              className={cn(
                "relative group flex items-center gap-3 bg-white/60 backdrop-blur-md rounded-2xl px-5 py-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                s.disabled ? "opacity-50 grayscale" : "hover:bg-white shadow-sm border",
                s.isAI ? "border-primary/30 hover:border-primary/50 shadow-primary/5" : "border-slate-200/60 hover:border-slate-300"
              )}
            >
              {/* Icon Container */}
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
              )}>
                <s.icon className="w-4 h-4" />
              </div>

              {/* Text Area */}
              <div className="flex flex-col text-left justify-center">
                {s.isAI && (
                  <div className="mb-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI
                    </span>
                  </div>
                )}
                <span className={cn("font-bold text-sm leading-none whitespace-nowrap", !s.disabled ? "text-primary" : "text-foreground")}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          onClick={handleStart}
          className="gradient-primary glow-primary text-white font-semibold h-12 px-8 rounded-xl text-base hover:opacity-90 hover:-translate-y-0.5 transition-all"
        >
          Start Multi-Agent
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </section>

      {/* Features grid */}
      <section className="px-6 pb-24 max-w-6xl mx-auto w-full relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Enterprise-Grade Pipeline</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Built for scale, speed, and precision. Go from messy raw data to actionable exposure insights and modeling files in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="relative group bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-slate-200/60 hover:bg-white hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1.5 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-base text-foreground mb-1.5">{label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed text-balance">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
