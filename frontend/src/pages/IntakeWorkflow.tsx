"use client";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Search, Bot, CheckCircle2, ArrowRight, XCircle, Upload, FileText, File, Trash2, Sparkles, AlertTriangle, X, Paperclip, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  size: number;
}

const ACCEPTED = '.pdf,.docx,.xlsx,.txt';

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
  const [profile, setProfile] = useState<any>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
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
    try {
      const res = await fetch('/api/profile-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, documents: docs.map(d => d.name) })
      });
      const data = await res.json();
      setProfile(data);
    } catch {
      const hasDocs = docs.length > 0;
      setProfile({
        community_name: 'Clare County, Michigan',
        county: 'Clare County',
        project_category: 'Transportation & Water Infrastructure',
        estimated_cost: hasDocs ? 4200000 : 3500000,
        population: 31400,
        project_stage: hasDocs ? 'Engineering & Design' : 'Conceptual Planning',
        infrastructure_issues: ['Structurally deficient bridge on M-61', 'Failing stormwater pipes causing localized flooding', 'Aging water mains serving downtown corridor'],
        recommended_next_steps: [
          'Complete Environmental Review (NEPA)',
          'Obtain updated engineering cost estimates',
          'Secure 20% local match commitment',
          'Submit SAM.gov registration update',
          hasDocs ? 'Finalize supporting documentation package' : 'Gather supporting documentation',
        ],
        impact_keywords: ['bridge repair', 'flood mitigation', 'water infrastructure', 'rural community', 'public safety'],
        documents_analyzed: docs.length,
      });
    }
    setIsGenerating(false);
  }, [description, docs]);

  const handleFindMatches = useCallback(() => {
    setIsScoring(true);
    setTimeout(() => {
      setMatches([
        { id: 101, title: 'Bridge Investment Program', agency: 'DOT', amount: '$5M', match: 96 },
        { id: 102, title: 'Safe Streets and Roads for All', agency: 'DOT', amount: '$2M', match: 91 },
        { id: 103, title: 'Clean Water State Revolving Fund', agency: 'EPA', amount: '$1.5M', match: 88 },
        { id: 104, title: 'Transportation Alternatives Program', agency: 'DOT', amount: '$1M', match: 85 },
      ]);
      setRejected([
        { id: 201, title: 'NIH Clinical Trial Grant', agency: 'NIH', reason: 'Health research not infrastructure' },
        { id: 202, title: 'Cancer Center Support Grant', agency: 'NIH', reason: 'Unrelated category' },
      ]);
      setIsScoring(false);
    }, 1500);
  }, []);

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

      {/* ── Step 2: Generated Profile ── */}
      {profile && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-textPrimary flex items-center mb-4">
            <Search className="w-5 h-5 text-secondary mr-2" /> 2. Generated Project Profile
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Community', value: profile.community_name },
              { label: 'Category', value: profile.project_category },
              { label: 'Est. Cost', value: `$${profile.estimated_cost?.toLocaleString()}` },
              { label: 'Population', value: profile.population?.toLocaleString() },
            ].map(f => (
              <div key={f.label} className="bg-bgPanel p-3 rounded-lg border border-borderColor">
                <p className="text-xs text-textSecondary">{f.label}</p>
                <p className="font-semibold text-textPrimary capitalize">{f.value}</p>
              </div>
            ))}
          </div>

          {profile.county && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-bgPanel p-3 rounded-lg border border-borderColor">
                <p className="text-xs text-textSecondary">County</p>
                <p className="font-semibold text-textPrimary">{profile.county}</p>
              </div>
              <div className="bg-bgPanel p-3 rounded-lg border border-borderColor">
                <p className="text-xs text-textSecondary">Project Stage</p>
                <p className="font-semibold text-textPrimary">{profile.project_stage}</p>
              </div>
              <div className="bg-bgPanel p-3 rounded-lg border border-borderColor">
                <p className="text-xs text-textSecondary">Documents Analyzed</p>
                <p className="font-semibold text-textPrimary">{profile.documents_analyzed ?? 0}</p>
              </div>
            </div>
          )}

          {profile.infrastructure_issues && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-2 text-textPrimary">Key Infrastructure Issues</p>
              <div className="space-y-2">
                {profile.infrastructure_issues.map((issue: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-textSecondary">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />{issue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.recommended_next_steps && (
            <div className="mb-6">
              <p className="text-sm font-semibold mb-2 text-textPrimary">Recommended Next Steps</p>
              <div className="space-y-2">
                {profile.recommended_next_steps.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-textSecondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" />{step}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm font-semibold mb-2 text-textPrimary">Keywords</p>
            <div className="flex flex-wrap gap-2">
              {profile.impact_keywords?.map((kw: string) => (
                <span key={kw} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded border border-primary/20">{kw}</span>
              ))}
            </div>
          </div>

          <button onClick={handleFindMatches} disabled={isScoring}
            className="bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center">
            {isScoring
              ? <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />Scoring Database...</>
              : <><Search className="w-4 h-4 mr-2" /> Find Matching Grants</>}
          </button>
        </motion.div>
      )}

      {/* ── Step 3: Match Engine Results ── */}
      {matches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <h2 className="text-lg font-bold text-textPrimary flex items-center">
            <CheckCircle2 className="w-5 h-5 text-secondary mr-2" /> 3. Match Engine Results
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-secondary">
              <h3 className="font-bold text-textPrimary mb-4">Top Ranked Matches</h3>
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="bg-bgPanel border border-borderColor p-3 rounded-xl flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-bold text-textPrimary group-hover:text-secondary transition-colors">{m.title}</p>
                      <p className="text-xs text-textSecondary">{m.agency} • {m.amount}</p>
                    </div>
                    <div className="text-lg font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-lg">{m.match}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-red-500">
              <h3 className="font-bold text-textPrimary mb-4">Rejected (Poor Fit)</h3>
              <div className="space-y-3">
                {rejected.map(r => (
                  <div key={r.id} className="bg-bgPanel border border-red-500/20 p-3 rounded-xl">
                    <p className="text-sm font-bold text-textPrimary line-through opacity-70">{r.title}</p>
                    <p className="text-xs text-red-400 mt-1 flex items-center"><XCircle className="w-3 h-3 mr-1" /> {r.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => router.push('/packet')}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 flex items-center">
              Build Readiness Packet <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
});
