import { usePipelineStore } from '@/store/usePipelineStore';

const STEPS = [
  { id: 'upload',    label: 'Upload' },
  { id: 'process',  label: 'Normalize & Geocode' },
  { id: 'agents',   label: 'Agent Select' },
  { id: 'mapping',  label: 'Column Mapping' },
  { id: 'running',  label: 'CAT Processing' },
  { id: 'done',     label: 'Dashboard' },
];

export default function StepIndicator({ currentStep }) {
  const idx = STEPS.findIndex((s) => s.id === currentStep);
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
              ${active ? 'bg-primary text-white shadow-sm' : done ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold
                ${active ? 'bg-white/20' : done ? 'bg-primary text-white' : 'bg-muted-foreground/20'}`}>
                {done ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 ${done ? 'bg-primary/40' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
