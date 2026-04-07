import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, X, ChevronRight, Settings2, Loader2 } from 'lucide-react';
import { uploadFile } from '@/lib/api';
import { usePipelineStore } from '@/store/usePipelineStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataPreview from '@/components/DataPreview';
import { cn } from '@/lib/utils';

const FORMAT_INFO = {
  AIR: 'AIR CEDE â€” Touchstone / Classis compatible',
  RMS: 'RMS EDM â€” RiskLink compatible',
};

export default function UploadPage() {
  const navigate = useNavigate();
  const { setUploadId, setUploadMeta, targetFormat, setTargetFormat, rawPreview, reset } = usePipelineStore();

  const [file, setFile] = useState(null);
  const [localRules, setLocalRules] = useState({
    fuzzy_llm_fallback_threshold: 72,
    fuzzy_score_cutoff: 50,
    occ_confidence_threshold: 0.5,
    const_confidence_threshold: 0.5,
    line_of_business: '',
    policy_id: '',
    insured_name: '',
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, format, rules }) => uploadFile(file, format, rules),
    onSuccess: (data) => {
      setUploadId(data.upload_id);
      setUploadMeta(data);
      toast.success(`Uploaded ${data.row_count} rows`);
      navigate(`/session/${data.upload_id}/processing`);
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  });

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) { toast.error('Only CSV and XLSX files are accepted'); return; }
    setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1"><span className="gradient-text">Upload &amp; Configure</span></h1>
        <p className="text-muted-foreground text-sm">Upload your exposure data and select the target format</p>
      </div>
      <div className="mb-8 flex justify-center"><StepIndicator currentStep="upload" /></div>

      {/* Format toggle */}
      <div className="glass rounded-2xl p-5 mb-5">
        <label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" /> Target Format
        </label>
        <div className="flex gap-3 mt-3">
          {['AIR', 'RMS'].map((fmt) => (
            <button key={fmt} id={`btn-format-${fmt}`} onClick={() => setTargetFormat(fmt)}
              className={cn('flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200',
                targetFormat === fmt ? 'border-primary/60 bg-primary/10 text-primary glow-primary-sm' : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground')}>
              <div className="font-bold text-base">{fmt}</div>
              <div className="text-[11px] mt-0.5 opacity-70">{FORMAT_INFO[fmt]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div className="glass rounded-2xl p-2 mb-5">
        <div {...getRootProps()} id="dropzone"
          className={cn('relative flex flex-col items-center justify-center min-h-52 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300',
            isDragActive ? 'border-primary bg-primary/10 scale-[1.01]' : file ? 'border-primary/40 bg-primary/5' : 'border-border/60 hover:border-primary/40 hover:bg-primary/5')}>
          <input {...getInputProps()} id="file-input" />
          {file ? (
            <div className="flex flex-col items-center gap-3 p-8">
              <div className="w-14 h-14 rounded-xl gradient-primary glow-primary-sm flex items-center justify-center">
                <FileSpreadsheet className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB â€” ready to upload</p>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-7 text-xs mt-1"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                <X className="w-3 h-3 mr-1" /> Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300',
                isDragActive ? 'gradient-primary glow-primary scale-110' : 'bg-muted border border-border')}>
                <Upload className={cn('w-8 h-8', isDragActive ? 'text-white' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{isDragActive ? 'Drop it here!' : 'Drag & drop your file'}</p>
                <p className="text-sm text-muted-foreground mt-1">or <span className="text-primary underline cursor-pointer">browse</span> to select</p>
                <div className="flex gap-2 justify-center mt-3">
                  {['CSV', 'XLSX', 'XLS'].map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced config */}
      <Accordion type="single" collapsible className="glass rounded-2xl mb-6">
        <AccordionItem value="config" className="border-0">
          <AccordionTrigger className="px-5 py-4 text-sm font-semibold hover:no-underline">
            <span className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" /> Advanced Configuration</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {[
                { key: 'policy_id', label: 'Policy ID', placeholder: 'e.g. POL-12345' },
                { key: 'insured_name', label: 'Insured Name (AIR)', placeholder: 'e.g. Acme Corp' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium block mb-1.5">{label}</label>
                  <input type="text" value={localRules[key]} placeholder={placeholder}
                    onChange={(e) => setLocalRules(r => ({ ...r, [key]: e.target.value }))}
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium block mb-1.5">Line of Business</label>
                <Select value={localRules.line_of_business || 'none'} onValueChange={(v) => setLocalRules(r => ({ ...r, line_of_business: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="w-full text-xs h-9"><SelectValue placeholder="Select LOB..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">â€” None â€”</SelectItem>
                    {['Commercial', 'Residential', 'Industrial', 'Agriculture'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'occ_confidence_threshold', label: 'Occupancy Confidence Min', min: 0, max: 1, step: 0.05 },
                { key: 'const_confidence_threshold', label: 'Construction Confidence Min', min: 0, max: 1, step: 0.05 },
              ].map(({ key, label, min, max, step }) => (
                <div key={key}>
                  <label className="text-xs font-medium block mb-1.5">{label} <span className="text-primary font-semibold">{localRules[key]}</span></label>
                  <input type="range" min={min} max={max} step={step} value={localRules[key]}
                    onChange={(e) => setLocalRules(r => ({ ...r, [key]: parseFloat(e.target.value) }))}
                    className="w-full accent-primary" />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button id="btn-upload-continue" size="lg" onClick={() => { reset(); uploadMutation.mutate({ file, format: targetFormat, rules: localRules }); }}
        disabled={!file || uploadMutation.isPending}
        className="w-full gradient-primary glow-primary text-white font-semibold rounded-xl h-12 text-base hover:opacity-90 transition-opacity disabled:opacity-40">
        {uploadMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploadingâ€¦</> : <>Continue to Pipeline <ChevronRight className="w-4 h-4 ml-2" /></>}
      </Button>

      {/* Data Preview */}
      {rawPreview.length > 0 && (
        <div className="mt-8"><DataPreview rows={rawPreview} /></div>
      )}
    </div>
  );
}

