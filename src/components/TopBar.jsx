import { useNavigate } from 'react-router-dom';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Button } from '@/components/ui/button';

export default function TopBar() {
  const navigate = useNavigate();
  const reset = usePipelineStore((s) => s.reset);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/80 backdrop-blur-md border-b border-border/60 flex items-center px-6 gap-4 shadow-sm">
      {/* Logo + Brand */}
      <button
        onClick={() => { reset(); navigate('/'); }}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        {/* Logo icon */}
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-primary-sm">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 14L9 4L15 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.5 10.5H12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Text */}
        <div className="text-left">
          <p className="text-sm font-bold text-foreground leading-none tracking-tight">
            Exposure Modeling
          </p>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            Multiagent Process
          </p>
        </div>
      </button>

      {/* Divider + subtle tagline */}
      <div className="h-5 w-px bg-border ml-2 hidden sm:block" />
      <span className="text-xs text-muted-foreground hidden sm:block">
        CAT &amp; Underwriting Pipeline
      </span>

      <div className="ml-auto">
        <Button
          variant="outline"
          onClick={() => navigate('/ontology')}
          className="border-2 border-primary text-primary hover:bg-primary/5 shadow-sm font-bold h-8 px-4"
        >
          Ontology
        </Button>
      </div>
    </header>
  );
}
