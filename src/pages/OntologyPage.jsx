import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, BookOpen, Gauge, Globe2, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 mt-1 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/configure')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Brain className="w-3.5 h-3.5" />
                Knowledge Base
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="gradient-text">Knowledge & Rules Hub</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Browse the AI's classification dictionaries, configure normalization rules, and understand how addresses are geocoded.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 rounded-xl bg-muted/50 border border-border/40">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-background shadow-sm border border-border/50 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Icon className="w-4 h-4" style={isActive ? { color: tab.color } : undefined} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="glass-strong rounded-2xl border border-border/30 p-6 shadow-sm">
          {activeTab === 'cope' && <OntologyPanel />}
          {activeTab === 'rules' && <NormalizationRulesPanel />}
          {activeTab === 'geo' && <GeocodingSettingsPanel />}
        </div>

      </div>
    </div>
  );
}
