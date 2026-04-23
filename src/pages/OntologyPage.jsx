import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, BookOpen, Gauge, Globe2, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePipelineStore } from '@/store/usePipelineStore';
import OntologyPanel from '@/components/OntologyPanel';
import NormalizationRulesPanel from '@/components/NormalizationRulesPanel';
import GeocodingSettingsPanel from '@/components/GeocodingSettingsPanel';

const TABS = [
  { id: 'cope',   label: 'COPE Dictionary',       icon: BookOpen, color: '#8b5cf6' },
  { id: 'rules',  label: 'Normalization Rules',    icon: Gauge,    color: '#0ea5e9' },
  { id: 'geo',    label: 'Geocoding Info',         icon: Globe2,   color: '#10b981' },
];

export default function OntologyPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cope');
  const { targetFormat, setTargetFormat } = usePipelineStore();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-6 flex flex-col gap-5">

        {/* Header - Compact */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => navigate('/configure')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Setup
          </Button>

          {/* Format Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Schema</span>
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
              <button
                onClick={() => setTargetFormat('AIR')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  targetFormat === 'AIR' ? 'bg-white shadow-sm text-primary border border-border/40' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                AIR
              </button>
              <button
                onClick={() => setTargetFormat('RMS')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  targetFormat === 'RMS' ? 'bg-white shadow-sm text-primary border border-border/40' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                RMS
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 shadow-inner">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg text-sm transition-all duration-300',
                  isActive
                    ? 'bg-white shadow-md text-primary font-bold border border-slate-200/50 scale-[1.01]'
                    : 'bg-white/40 border border-slate-200/40 text-slate-500 font-semibold hover:text-slate-800 hover:bg-white/80 hover:shadow-sm'
                )}
              >
                <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-primary" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === 'cope' && <OntologyPanel />}
          {activeTab === 'rules' && <NormalizationRulesPanel />}
          {activeTab === 'geo' && <GeocodingSettingsPanel />}
        </div>

      </div>
    </div>
  );
}
