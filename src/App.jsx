import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useThemeStore } from '@/store/useThemeStore';
import TopBar from '@/components/TopBar';
import HomePage from '@/pages/HomePage';
import AgentConfigPage from '@/pages/AgentConfigPage';
import PipelinePage from '@/pages/PipelinePage';
import OntologyPage from '@/pages/OntologyPage';
import SimulationDashboardPage from '@/pages/SimulationDashboardPage';
import PreEpOutputDashboardPage from '@/pages/PreEpOutputDashboardPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ThemeSync() {
  useEffect(() => {
    useThemeStore.getState().syncTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (useThemeStore.getState().theme === 'system') {
        useThemeStore.getState().syncTheme();
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeSync />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <TopBar />
            <main className="flex-1 pt-14">
              <Routes>
                <Route path="/"                    element={<HomePage />} />
                <Route path="/configure"           element={<AgentConfigPage />} />
                <Route path="/ontology"            element={<OntologyPage />} />
                <Route path="/pipeline"            element={<PipelinePage />} />
                <Route path="/pipeline/:id"        element={<PipelinePage />} />
                <Route path="/simulation/:id/dashboard" element={<SimulationDashboardPage />} />
                <Route path="/simulation/:id/pre-ep-output" element={<PreEpOutputDashboardPage />} />
                <Route path="/session/:id/done"    element={<Navigate to="/pipeline" replace />} />
                {/* Legacy redirects in case any old links are used */}
                <Route path="/upload"                   element={<Navigate to="/pipeline" replace />} />
                <Route path="/session/:id/processing"   element={<Navigate to="/pipeline" replace />} />
                <Route path="/session/:id/agents"       element={<Navigate to="/pipeline" replace />} />
                <Route path="/session/:id/mapping"      element={<Navigate to="/pipeline" replace />} />
                <Route path="/session/:id/running"      element={<Navigate to="/pipeline" replace />} />
                <Route path="*"                         element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
