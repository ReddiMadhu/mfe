import {
  MapPin, ArrowRight, CheckCircle2, Globe2,
  ShieldCheck, AlertTriangle, Navigation,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    title: 'Geocode via Geoapify',
    desc: 'Send normalized address to the Geoapify API (3 retries, 8s timeout). Extract lat/lon, street, city, state, postcode.',
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
  return (
    <div className="space-y-4">
      {/* Provider Badge */}
      <div className="rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Geocoding Provider</span>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[9px]">Geoapify</Badge>
              <Badge variant="outline" className="text-[9px] border-green-300 text-green-600">Active</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Server-side configuration. API key and provider settings are managed in the backend environment.
            </p>
          </div>
        </div>
      </div>

      {/* Decision Tree */}
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

      {/* LRU Cache Info */}
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
