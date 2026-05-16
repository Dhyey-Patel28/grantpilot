"use client";
import { useState } from 'react';
import { Upload, FileText, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function Documents() {
  const [files, setFiles] = useState([
    { id: 1, name: 'Q3_Financial_Report.pdf', size: '2.4 MB', status: 'ready' },
    { id: 2, name: 'Clare_County_Master_Plan.pdf', size: '15.1 MB', status: 'ready' }
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFile = {
        id: Date.now(),
        name: e.dataTransfer.files[0].name,
        size: (e.dataTransfer.files[0].size / (1024 * 1024)).toFixed(1) + ' MB',
        status: 'ready'
      };
      setFiles([...files, newFile]);
    }
  };

  const removeFile = (id: number) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const analyzeFile = (id: number) => {
    setAnalyzing(id);
    setTimeout(() => {
      setAnalyzing(null);
      setFiles(files.map(f => f.id === id ? { ...f, status: 'analyzed' } : f));
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Document Center</h1>
        <p className="text-textSecondary mt-1">Upload and manage project documents and grant packets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div 
          className={`lg:col-span-1 glass-panel rounded-2xl border-dashed border-2 p-8 flex flex-col items-center justify-center text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-borderColor'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-textPrimary mb-2">Drag & Drop Files</h3>
          <p className="text-sm text-textSecondary mb-6">Support for PDF, DOCX, XLSX up to 50MB</p>
          <button className="bg-bgPanelLight hover:bg-bgPanel border border-borderColor text-textPrimary px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Browse Files
          </button>
        </div>

        <div className="lg:col-span-2 glass-panel rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-borderColor flex items-center justify-between bg-bgPanelLight/30">
            <h2 className="font-semibold text-textPrimary">Your Documents</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search..." className="bg-bgPanel border border-borderColor rounded-lg pl-9 pr-3 py-1.5 text-sm text-textPrimary focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {files.map(file => (
              <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center p-3 hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 rounded-xl group transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-4 shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-textPrimary truncate">{file.name}</p>
                  <p className="text-xs text-textSecondary">{file.size}</p>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.status === 'analyzed' ? (
                    <span className="text-xs flex items-center text-secondary bg-secondary/10 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Extracted
                    </span>
                  ) : (
                    <button 
                      onClick={() => analyzeFile(file.id)}
                      disabled={analyzing === file.id}
                      className="text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center"
                    >
                      {analyzing === file.id ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" /> : 'Analyze'}
                    </button>
                  )}
                  <button onClick={() => removeFile(file.id)} className="p-1.5 text-textSecondary hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
