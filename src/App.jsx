import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import TopBar from '@/components/TopBar';
import HomePage from '@/pages/HomePage';
import PipelinePage from '@/pages/PipelinePage';
import DonePage from '@/pages/DonePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <TopBar />
            <main className="flex-1 pt-14">
              <Routes>
                <Route path="/"                    element={<HomePage />} />
                <Route path="/pipeline"            element={<PipelinePage />} />
                <Route path="/pipeline/:id"        element={<PipelinePage />} />
                <Route path="/session/:id/done"    element={<DonePage />} />
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
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e5e7eb',
                color: '#0f1117',
              },
            }}
          />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
