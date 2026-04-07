import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Network, Shield, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePipelineStore } from '@/store/usePipelineStore';

const STEPS = [
  { icon: '📂', label: 'Upload & Preview', desc: 'CSV / XLSX file with property exposure data' },
  { icon: '📍', label: 'Address Normalization', desc: 'Auto-extract street, city, state, ZIP, country' },
  { icon: '🌐', label: 'Geocode Addresses', desc: 'Resolve precise lat/lon coordinates' },
  { icon: '🔷', label: 'CAT Agent', desc: 'AIR/RMS column mapping, occupancy & construction coding' },
  { icon: '⚖️', label: 'Underwriting Agent', desc: 'COPE, hazards, risk model, propensity (coming soon)' },
  { icon: '📊', label: 'Dashboard', desc: 'TIV summary, country/state breakdown, export' },
];

const FEATURES = [
  { icon: Zap, label: 'Auto-run Agents', desc: 'Normalization and geocoding fire automatically' },
  { icon: Network, label: 'Multi-Agent Pipeline', desc: 'CAT and Underwriting agents run in parallel' },
  { icon: Shield, label: 'AIR & RMS Formats', desc: 'Full occupancy & construction code mapping' },
  { icon: BarChart3, label: 'Rich Dashboard', desc: 'TIV, breakdown tables, XLSX/CSV export' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const reset = usePipelineStore((s) => s.reset);

  function handleStart() {
    reset();
    navigate('/pipeline');
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
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

        <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
          AI-powered multi-agent property data processing for CAT modeling.
          Upload your SOV, normalize addresses, geocode, and produce AIR/RMS-ready output automatically.
        </p>

        <Button
          size="lg"
          onClick={handleStart}
          className="gradient-primary glow-primary text-white font-semibold h-12 px-8 rounded-xl text-base hover:opacity-90 hover:-translate-y-0.5 transition-all"
        >
          Start New Pipeline
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {/* Pipeline steps strip */}
        <div className="mt-16 flex flex-wrap justify-center gap-3 max-w-3xl">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
                <span>{s.icon}</span>
                <span className="font-medium text-foreground">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="glass rounded-2xl p-4 border border-border/40 flex flex-col gap-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-primary-sm">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="font-semibold text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
