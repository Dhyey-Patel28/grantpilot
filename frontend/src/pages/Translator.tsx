import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Zap, AlertTriangle, CheckCircle2, ArrowRight, X, Download } from 'lucide-react';

export function Translator() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const handleProcess = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setIsProcessed(true);
    }, 2000);
  };

  const handleClear = () => {
    setIsProcessed(false);
    setPastedText('');
  };

  const handleExport = () => {
    alert("Translated requirements downloaded as PDF/TXT!");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight mb-2">Requirements Translator</h1>
          <p className="text-textSecondary max-w-2xl">Upload complicated grant documents or NOFOs and let AI break them down into plain English and actionable steps.</p>
        </div>
        {isProcessed && (
          <div className="flex space-x-3">
            <button onClick={handleClear} className="px-4 py-2 bg-bgPanelLight hover:bg-bgPanelLight/80 text-textPrimary rounded-lg text-sm font-medium transition-colors border border-borderColor flex items-center">
              <X className="w-4 h-4 mr-2" /> Clear
            </button>
            <button onClick={handleExport} className="px-4 py-2 bg-primary hover:bg-primary/90 text-textPrimary shadow-lg shadow-primary/20 rounded-lg text-sm font-medium transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" /> Export
            </button>
          </div>
        )}
      </div>

      {!isProcessed ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-10 rounded-2xl border-dashed border-2 border-primary/30 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-textPrimary mb-2">Upload Document</h2>
            <p className="text-textSecondary mb-6 text-sm">PDF, DOCX up to 50MB</p>
            <button 
              onClick={handleProcess}
              disabled={isUploading}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-textPrimary px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/20 flex items-center"
            >
              {isUploading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Analyzing...</> : 'Browse Files'}
            </button>
          </div>

          <div className="glass-panel p-8 rounded-2xl flex flex-col">
            <h2 className="text-lg font-bold text-textPrimary mb-4">Or Paste Text</h2>
            <textarea 
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste NOFO or grant requirements text here..."
              className="flex-1 w-full bg-bgPanel/50 border border-borderColor rounded-xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none mb-4 min-h-[200px]"
            />
            <button 
              onClick={handleProcess}
              disabled={isUploading || !pastedText.trim()}
              className="w-full bg-bgPanelLight hover:bg-bgPanel disabled:opacity-50 text-textPrimary border border-borderColor px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center"
            >
              {isUploading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" /> Translating...</> : <><Zap className="w-4 h-4 mr-2" /> Translate Text</>}
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* File Info */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1">
            <div className="flex items-center p-4 bg-bgPanel rounded-xl border border-borderColor mb-6">
              <FileText className="w-8 h-8 text-primary mr-4" />
              <div>
                <p className="text-textPrimary font-medium text-sm">{pastedText ? 'Pasted_Text_Analysis' : 'NOFO_Broadband_2026.pdf'}</p>
                <p className="text-textSecondary text-xs mt-1">Extracted today</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Plain English Summary</h3>
                <p className="text-sm text-textPrimary leading-relaxed bg-bgPanel/50 p-4 rounded-xl border border-borderColor">
                  This grant provides funding to expand high-speed internet access in rural, unserved areas. You must provide a 25% cost match and complete the project within 3 years. Preference is given to projects that partner with local co-ops or non-profits.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3 flex items-center text-amber-400">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Risk Warnings
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start text-sm text-textPrimary p-3 bg-amber-400/5 rounded-lg border border-amber-400/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2 shrink-0"></span>
                    Strict "Build America, Buy America" compliance required for all fiber optics.
                  </li>
                  <li className="flex items-start text-sm text-textPrimary p-3 bg-amber-400/5 rounded-lg border border-amber-400/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2 shrink-0"></span>
                    Requires historical preservation clearance before breaking ground.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actionable Checklist */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-textPrimary flex items-center">
                <Zap className="w-5 h-5 text-primary mr-2" /> Generated Action Plan
              </h2>
              <button className="text-sm text-primary hover:text-primary/80 flex items-center font-medium">
                Export to Task Manager <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { phase: 'Phase 1: Registration', tasks: ['Active SAM.gov Registration', 'Obtain UEI Number'] },
                { phase: 'Phase 2: Technical Design', tasks: ['Network Architecture Plan', 'Environmental Impact Study', 'Coverage Map (Shapefile format)'] },
                { phase: 'Phase 3: Financials', tasks: ['Pro Forma Financial Statements (5 years)', 'Letter of Credit from Bank', '25% Match Commitment Letter'] }
              ].map((section, sIdx) => (
                <div key={sIdx} className="bg-bgPanel/50 rounded-xl border border-borderColor overflow-hidden">
                  <div className="px-4 py-3 bg-bgPanel border-b border-borderColor">
                    <h3 className="font-semibold text-textPrimary text-sm">{section.phase}</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {section.tasks.map((task, tIdx) => (
                      <div key={tIdx} className="flex items-center group">
                        <button className="w-5 h-5 rounded border border-gray-600 group-hover:border-primary flex items-center justify-center shrink-0 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5 text-transparent group-hover:text-primary/30" />
                        </button>
                        <span className="ml-3 text-sm text-textPrimary group-hover:text-textPrimary transition-colors">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
