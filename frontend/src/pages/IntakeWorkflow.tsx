"use client";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Search, Bot, CheckCircle2, ArrowRight, XCircle, Upload, FileText, File, Trash2, Sparkles, AlertTriangle, X, Paperclip, Plus, Image as ImageIcon, Database, Activity, FileSignature, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  size: number;
}

const ACCEPTED = '.pdf,.docx,.xlsx,.txt,.jpg,.jpeg,.png';

const agentWorkflowSteps = [
  { id: 'intake', name: 'Project Intake', icon: FileText },
  { id: 'doc', name: 'Document Processor', icon: Database },
  { id: 'infra', name: 'Infrastructure Analyzer', icon: Activity },
  { id: 'profile', name: 'Project Profiler', icon: Search },
  { id: 'relevance', name: 'Grant Relevance', icon: Zap },
  { id: 'explainer', name: 'Match Explainer', icon: Bot },
  { id: 'translator', name: 'Requirements Translator', icon: FileSignature },
  { id: 'gap', name: 'Readiness Gap', icon: AlertTriangle },
  { id: 'writer', name: 'Packet Writer', icon: FileText },
  { id: 'trust', name: 'Trust Guard', icon: ShieldAlert },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function chipColor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'text-red-400 bg-red-400/10 border-red-400/20';
  if (ext === 'docx' || ext === 'doc') return 'text-primary bg-primary/10 border-primary/20';
  if (ext === 'xlsx' || ext === 'xls') return 'text-secondary bg-secondary/10 border-secondary/20';
  return 'text-textSecondary bg-white/5 border-borderColor';
}

export const IntakeWorkflow = memo(function IntakeWorkflow() {
  const [description, setDescription] = useState('Clare County has about 31,400 residents and faces a broken bridge and broken pipes that are causing flooding...');
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<Record<string, 'waiting' | 'running' | 'complete'>>({});
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Hydrate docs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('grantpilot_intake_docs');
      if (saved) setDocs(JSON.parse(saved));
    } catch {}
  }, []);

  const persistDocs = useCallback((updated: UploadedDoc[]) => {
    localStorage.setItem('grantpilot_intake_docs', JSON.stringify(updated));
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newDocs: UploadedDoc[] = Array.from(files)
      .filter(f => f.size <= 50 * 1024 * 1024)
      .map(f => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
        size: f.size,
      }));
    if (!newDocs.length) return;
    setDocs(prev => { const u = [...prev, ...newDocs]; persistDocs(u); return u; });
    setShowUpload(false);
  }, [persistDocs]);

  const removeDoc = useCallback((id: string) => {
    setDocs(prev => { const u = prev.filter(d => d.id !== id); persistDocs(u); return u; });
  }, [persistDocs]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }, [addFiles]);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }, [addFiles]);

  const handleGenerateProfile = useCallback(async () => {
    setIsGenerating(true);
    setWorkflowStarted(true);
    setWorkflowComplete(false);
    
    const initStatus: Record<string, 'waiting' | 'running' | 'complete'> = {};
    agentWorkflowSteps.forEach(s => initStatus[s.id] = 'waiting');
    setWorkflowStatus(initStatus);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (const step of agentWorkflowSteps) {
      setWorkflowStatus(prev => ({ ...prev, [step.id]: 'running' }));
      await delay(800);
      setWorkflowStatus(prev => ({ ...prev, [step.id]: 'complete' }));
    }
    
    setIsGenerating(false);
    setWorkflowComplete(true);
  }, [description, docs]);

 

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-textPrimary tracking-tight mb-2">Project Intake & Match Engine</h1>
        <p className="text-textSecondary text-sm">Describe your community problem, attach supporting documents, and let Watsonx Orchestrate generate a profile and match grants.</p>
      </div>

      {/* ── Single Intake Card ── */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-textPrimary flex items-center mb-4">
          <Bot className="w-5 h-5 text-primary mr-2" /> 1. Project Intake
        </h2>

        {/* Textarea */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-bgPanel/50 border border-borderColor rounded-xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[120px] mb-4 resize-y"
          placeholder="Describe your community project..."
        />

        {/* Inline upload zone (expandable) */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4"
            >
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-borderColor hover:border-white/20'
                }`}
              >
                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} onChange={handleFileChange} className="hidden" />
                <Upload className={`w-5 h-5 mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-textSecondary'}`} />
                <p className="text-xs text-textSecondary">Drop files here or click to browse • PDF, DOCX, XLSX, TXT • Max 50MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document chips + Add button row */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showUpload
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-white/[0.03] text-textSecondary border-borderColor hover:text-textPrimary hover:border-white/20'
            }`}
          >
            {showUpload ? <X className="w-3.5 h-3.5" /> : <><Plus className="w-3.5 h-3.5" /><Paperclip className="w-3.5 h-3.5" /></>}
            {showUpload ? 'Close' : 'Add Documents'}
          </button>

          {docs.map(doc => (
            <div key={doc.id} className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-xs font-medium border ${chipColor(doc.name)}`}>
              <File className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[140px]">{doc.name}</span>
              <span className="text-[10px] opacity-60">{formatSize(doc.size)}</span>
              <button onClick={() => removeDoc(doc.id)} className="p-0.5 rounded hover:bg-white/10 transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* AI Infrastructure Findings (If Images Present) */}
        {docs.some(d => ['JPG','JPEG','PNG'].includes(d.type)) && (
          <div className="mb-5 p-4 rounded-xl border border-borderColor bg-bgPanelLight/30 animate-fade-in">
            <h3 className="text-xs font-bold text-textPrimary flex items-center mb-3">
              <Sparkles className="w-4 h-4 text-primary mr-1.5" /> AI Infrastructure Findings
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Bridge Corrosion', conf: '92%' },
                { label: 'Flood Risk', conf: '88%' },
                { label: 'Pipe Damage', conf: '85%' },
                { label: 'Road Deterioration', conf: '96%' }
              ].map(finding => (
                <div key={finding.label} className="bg-bgPanel rounded-lg p-2 border border-borderColor flex flex-col items-center justify-center text-center group cursor-default hover:border-primary/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1.5 group-hover:bg-primary/20 transition-colors">
                    <ImageIcon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] font-semibold text-textPrimary">{finding.label}</p>
                  <p className="text-[9px] text-primary">{finding.conf} Match</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Profile */}
        <button
          onClick={handleGenerateProfile}
          disabled={isGenerating || !description.trim()}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center"
        >
          {isGenerating
            ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />Generating...</>
            : <><Zap className="w-4 h-4 mr-2" /> Generate Profile</>}
        </button>
      </div>

      {/* ── AI Workflow Live Panel ── */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <h2 className="text-lg font-bold text-textPrimary flex items-center mb-6">
          <Bot className="w-5 h-5 text-primary mr-2" /> AI Workflow Live
        </h2>
        
        {!workflowStarted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-textSecondary">
            <Bot className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Generate a profile to start the AI workflow.</p>
          </div>
        ) : (
          <div className="space-y-4 relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-borderColor z-0" />
            {agentWorkflowSteps.map(step => {
              const status = workflowStatus[step.id] || 'waiting';
              return (
                <div key={step.id} className="flex items-center relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-all duration-300 ${
                    status === 'complete' ? 'bg-secondary text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                    status === 'running' ? 'bg-primary text-white animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                    'bg-bgPanelLight text-textSecondary border border-borderColor'
                  }`}>
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium transition-colors ${status === 'running' ? 'text-primary' : 'text-textPrimary'}`}>{step.name}</p>
                    <div className="flex items-center text-[10px] text-textSecondary uppercase tracking-wider mt-0.5">
                      {status === 'running' && <span className="text-primary mr-2">Processing...</span>}
                      {status === 'complete' && <span className="text-secondary mr-2">Complete</span>}
                      {status === 'complete' && <span className="mr-2">98% Conf</span>}
                      {status === 'waiting' && <span>Waiting</span>}
                      
                      {status === 'complete' && step.id === 'doc' && docs.length > 0 && <span className="normal-case text-primary/80 truncate max-w-[200px] border-l border-borderColor pl-2 ml-1">Processed {docs.length} docs</span>}
                      {status === 'complete' && step.id === 'doc' && docs.length === 0 && <span className="normal-case text-textSecondary border-l border-borderColor pl-2 ml-1">No supporting documents provided</span>}
                      {status === 'complete' && step.id === 'infra' && docs.some(d => ['JPG','JPEG','PNG'].includes(d.type)) && <span className="normal-case text-primary/80 border-l border-borderColor pl-2 ml-1">Visual hazards detected</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Workflow Complete Summary ── */}
      {workflowComplete && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-t-4 border-t-secondary">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mr-4">
              <CheckCircle2 className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-textPrimary">Workflow Complete</h2>
              <p className="text-sm text-textSecondary">Your project profile and readiness packet are ready.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor text-center">
              <p className="text-xs text-textSecondary mb-1">Project Profile</p>
              <p className="text-sm font-semibold text-secondary">Generated</p>
            </div>
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor text-center">
              <p className="text-xs text-textSecondary mb-1">Grants Matched</p>
              <p className="text-sm font-semibold text-secondary">4 High Fit</p>
            </div>
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor text-center">
              <p className="text-xs text-textSecondary mb-1">Readiness Packet</p>
              <p className="text-sm font-semibold text-secondary">Created</p>
            </div>
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor text-center">
              <p className="text-xs text-textSecondary mb-1">Trust Guard Review</p>
              <p className="text-sm font-semibold text-secondary">Completed</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push('/explorer')} className="flex-1 bg-bgPanelLight hover:bg-borderColor text-textPrimary border border-borderColor px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center">
              <Search className="w-4 h-4 mr-2" /> View Grant Matches
            </button>
            <button onClick={() => router.push('/packet')} className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 flex items-center justify-center">
              <FileText className="w-4 h-4 mr-2" /> Open Readiness Packet
            </button>
            <button onClick={() => router.push('/assistant')} className="flex-1 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center">
              <Bot className="w-4 h-4 mr-2" /> Ask Grant Copilot
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
});
