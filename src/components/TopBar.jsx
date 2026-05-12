import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Monitor, ArrowRight } from 'lucide-react';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Button } from '@/components/ui/button';

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const reset = usePipelineStore((s) => s.reset);
  const theme = useThemeStore((s) => s.theme);
  const resolved = useThemeStore((s) => s.resolved);
  const setTheme = useThemeStore((s) => s.setTheme);

  const showOntology = location.pathname !== '/' && location.pathname !== '/configure';

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeLabel =
    theme === 'system'
      ? `Match system (${resolved === 'dark' ? 'dark' : 'light'})`
      : theme === 'dark'
        ? 'Dark'
        : 'Light';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-6 shadow-sm">
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
          location.pathname === '/ontology' ? (
            <Button
              size="sm"
              onClick={() => navigate('/pipeline')}
              className="text-sm font-semibold gradient-primary glow-primary text-white shadow-sm hover:opacity-90"
            >
              Launch Pipeline
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/ontology')} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              C.O.P.E ontology
            </Button>
          )
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${themeLabel}. Click to cycle (light → dark → system).`}
          aria-label={`Theme: ${themeLabel}. Click to cycle.`}
        >
          <ThemeIcon className="size-4" />
        </Button>
      </div>
    </header>
  );
}
