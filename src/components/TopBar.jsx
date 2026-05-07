import { useNavigate, useLocation } from 'react-router-dom';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Button } from '@/components/ui/button';

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const reset = usePipelineStore((s) => s.reset);

  const showOntology = location.pathname !== '/' && location.pathname !== '/configure';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-6 shadow-sm">
      {/* Logo + Brand */}
      <button
        onClick={() => { reset(); navigate('/'); }}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        {/* --- ORG LOGO PLACEHOLDER --- */}
        {/* Replace the SVG below with your company logo (<img src="..." /> or <svg>) */}
        <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
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

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {showOntology && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/ontology')} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Ontology
          </Button>
        )}
      </div>
    </header>
  );
}
