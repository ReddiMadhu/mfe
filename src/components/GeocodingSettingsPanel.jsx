import { useState } from 'react';
import {
  MapPin, ArrowRight, CheckCircle2, Globe2,
  ShieldCheck, AlertTriangle, Navigation, Map, Wifi,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ── API Provider definitions ──────────────────────────────────────── */
const API_PROVIDERS = [
  {
    id: 'geoapify',
    name: 'Geoapify',
    desc: 'Free-tier geocoding with generous limits. Ideal for batch processing.',
    icon: Globe2,
    gradient: 'from-blue-500 to-blue-600',
    ring: 'ring-blue-400/50',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  {
    id: 'google',
    name: 'Google Maps',
    desc: 'Industry-standard precision. Best for production-grade accuracy.',
    icon: Map,
    gradient: 'from-red-500 to-orange-500',
    ring: 'ring-orange-400/50',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  {
    id: 'ipxo',
    name: 'IPXO',
    desc: 'IP-based geolocation. Lightweight fallback for approximate positioning.',
    icon: Wifi,
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-400/50',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
];

/* ── Decision-tree steps ───────────────────────────────────────────── */
const DECISION_STEPS = [
  {
    icon: Navigation,
    title: 'Check Provided Coordinates',
    desc: 'If valid Latitude (-90 to 90) and Longitude (-180 to 180) exist, trust them and skip geocoding.',
    result: 'Geosource → "Provided"',
    color: '#10b981',
  },
  {
    icon: MapPin,
    title: 'Assemble Address String',
    desc: 'Combine Street, City, County, State, PostalCode, CountryISO into a normalized query string.',
    result: 'Vendor-aware key mapping (AIR vs RMS field names)',
    color: '#0ea5e9',
  },
  {
    icon: Globe2,
    title: 'Geocode via Provider',
    desc: 'Send normalized address to the selected geocoding API (3 retries, 8 s timeout). Extract lat/lon, street, city, state, postcode.',
    result: 'Geosource → "Geocoded"',
    color: '#8b5cf6',
  },
  {
    icon: ShieldCheck,
    title: 'ISO-3166 State Validation',
    desc: 'Raw state names (e.g., "California", "Calif") are mapped to ISO-3166-2 codes (e.g., "CA"). Unrecognized formats are flagged.',
    result: 'StateCodeValidation → "VALID" / "UNRECOGNIZED" / "INVALID_FORMAT"',
    color: '#f59e0b',
  },
  {
    icon: AlertTriangle,
    title: 'Street Fallback Extraction',
    desc: 'If the geocoder returns city and postcode but no street, regex strips known components from the raw input to isolate the street address.',
    result: 'Ensures Street field is never empty when data is available',
    color: '#ef4444',
  },
];

export default function GeocodingSettingsPanel() {
  const [selectedApi, setSelectedApi] = useState('geoapify');

  return (
    <div className="space-y-4">

      {/* ── API Provider Selector ──────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Geocoding API Provider
            </span>
          </div>
          <Badge variant="outline" className="text-[9px] border-green-300 text-green-600">
            {API_PROVIDERS.find((p) => p.id === selectedApi)?.name} Active
          </Badge>
        </div>

      {/* ── US & Global subsection ─────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
            🌎 US &amp; Global
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {API_PROVIDERS.filter(p => p.id !== 'ipxo').map((api) => {
              const Icon = api.icon;
              const active = selectedApi === api.id;
              return (
                <button
                  key={api.id}
                  onClick={() => setSelectedApi(api.id)}
                  className={cn(
                    'relative group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 text-center',
                    active
                      ? `border-transparent ring-2 ${api.ring} bg-white shadow-md scale-[1.02]`
                      : 'border-border/50 bg-muted/10 hover:bg-white/70 hover:shadow-sm hover:border-border',
                  )}
                >
                  {active && (
                    <span className={cn('absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse', api.dot)} />
                  )}
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br transition-transform', api.gradient, active ? 'scale-110' : 'opacity-60 group-hover:opacity-90')}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={cn('text-xs font-bold', active ? 'text-foreground' : 'text-muted-foreground')}>{api.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{api.desc}</span>
                  {active && <Badge className={cn('mt-1 text-[8px] border', api.badge)}>Selected</Badge>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── APAC subsection ────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
            🌏 APAC
          </p>
          <div className="max-w-xs">
            {API_PROVIDERS.filter(p => p.id === 'ipxo').map((api) => {
              const Icon = api.icon;
              const active = selectedApi === api.id;
              return (
                <button
                  key={api.id}
                  onClick={() => setSelectedApi(api.id)}
                  className={cn(
                    'relative group w-full flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 text-center',
                    active
                      ? `border-transparent ring-2 ${api.ring} bg-white shadow-md scale-[1.02]`
                      : 'border-border/50 bg-muted/10 hover:bg-white/70 hover:shadow-sm hover:border-border',
                  )}
                >
                  {active && (
                    <span className={cn('absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse', api.dot)} />
                  )}
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br transition-transform', api.gradient, active ? 'scale-110' : 'opacity-60 group-hover:opacity-90')}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={cn('text-xs font-bold', active ? 'text-foreground' : 'text-muted-foreground')}>{api.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{api.desc}</span>
                  {active && <Badge className={cn('mt-1 text-[8px] border', api.badge)}>Selected</Badge>}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pt-1">
          API key and provider settings are managed in the backend environment.
          Switching providers here will take effect on the next pipeline run.
        </p>

      </div>

      {/* ── Decision Tree ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Address Resolution Decision Tree
        </p>
        <div className="space-y-0">
          {DECISION_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < DECISION_STEPS.length - 1 && (
                  <div className="absolute left-[19px] top-[44px] bottom-0 w-[2px] bg-border/50" />
                )}
                <div className="flex gap-3 pb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10"
                    style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)` }}
                  >
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1 rounded-xl border border-border/50 p-3 bg-muted/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold">{step.title}</span>
                      <Badge variant="outline" className="text-[9px]">Step {i + 1}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-1.5">{step.desc}</p>
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-medium text-primary">{step.result}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LRU Cache Info ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 p-4 bg-muted/10">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs font-bold">Performance Optimizations</span>
        </div>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• <strong>LRU Cache</strong>: 2,000 recent geocode results cached in memory to avoid duplicate API calls.</li>
          <li>• <strong>Batch Processing</strong>: Rows with identical addresses share a single cached result.</li>
          <li>• <strong>Alpha-3 → Alpha-2</strong>: Country codes are automatically converted (e.g., USA → US).</li>
        </ul>
      </div>
    </div>
  );
}
