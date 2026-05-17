"use client";
import { useState, useCallback, memo } from 'react';
import { Workflow, Bot, Search, FileText, CheckCircle2, Play, FileSignature } from 'lucide-react';

const agentNodes = [
  { id: 'discovery', name: 'Discovery Agent', icon: Search, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'translator', name: 'Translator Agent', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'eligibility', name: 'Eligibility Agent', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'proposal', name: 'Proposal Agent', icon: FileSignature, color: 'text-amber-400', bg: 'bg-amber-400/10' }
];

export const Agents = memo(function Agents() {
  const [statuses, setStatuses] = useState<Record<string, 'waiting' | 'processing' | 'complete'>>({
    discovery: 'waiting', translator: 'waiting', eligibility: 'waiting', proposal: 'waiting'
  });
  const [activeOutput, setActiveOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    setStatuses({ discovery: 'waiting', translator: 'waiting', eligibility: 'waiting', proposal: 'waiting' });
    setActiveOutput(null);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const node of agentNodes) {
      setStatuses(prev => ({ ...prev, [node.id]: 'processing' }));
      setActiveOutput(node.id);
      await delay(2000);
      setStatuses(prev => ({ ...prev, [node.id]: 'complete' }));
    }
    setIsRunning(false);
  }, []);

  const getOutputContent = (id: string) => {
    switch (id) {
      case 'discovery': return "Searched 2,400+ grants. Found 5 matching opportunities. Top match: USDA ReConnect (88%).";
      case 'translator': return "Extracted 4 key requirements from NOFO: 25% Match, Build America Buy America, Environmental Review, Rural Designation.";
      case 'eligibility': return "Cross-referenced organization profile. Passed all checks except Match Commitment (Action Required).";
      case 'proposal': return "Drafted Problem Statement, Project Narrative, and Budget Justification sections based on previous successful submissions.";
      default: return "Select an agent to view output.";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight flex items-center">
            <Workflow className="w-8 h-8 text-primary mr-3" /> Agent Orchestration
          </h1>
          <p className="text-textSecondary mt-2">Visualize the AI agent workflow powering GrantPilot.</p>
        </div>
        <button 
          onClick={runWorkflow}
          disabled={isRunning}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-textPrimary px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center"
        >
          {isRunning ? <div className="w-4 h-4 border-2 border-borderColor border-t-white rounded-full animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          Run Workflow
        </button>
      </div>

      <div className="glass-panel p-12 rounded-2xl flex flex-col items-center relative overflow-hidden">
        {/* Connection Lines (Background) */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-bgPanelLight -translate-y-1/2 z-0"></div>

        <div className="flex justify-between w-full relative z-10 px-8">
          {agentNodes.map((node) => {
            const status = statuses[node.id];
            return (
              <div key={node.id} className="flex flex-col items-center">
                {/* Keep pulse only for the actively-processing node */}
                <div 
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 mb-4 relative cursor-pointer transition-all duration-300 ${
                    status === 'complete' ? 'bg-bgPanel border-secondary text-secondary shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
                    status === 'processing' ? `bg-bgPanel border-primary text-primary shadow-[0_0_20px_rgba(59,130,246,0.4)] animate-pulse` :
                    'bg-bgPanelLight border-borderColor text-textSecondary'
                  }`}
                  onClick={() => setActiveOutput(node.id)}
                >
                  <node.icon className="w-8 h-8" />
                  {status === 'complete' && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-secondary text-surface rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-textPrimary">{node.name}</span>
                <span className="text-xs text-textSecondary capitalize mt-1">{status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {activeOutput && (
        <div className="glass-panel p-6 rounded-2xl animate-fade-in">
          <h3 className="text-lg font-semibold text-textPrimary mb-2 flex items-center">
            <Bot className="w-5 h-5 text-primary mr-2" /> Agent Output Logs
          </h3>
          <div className="bg-bgPanel/80 border border-borderColor rounded-xl p-4 font-mono text-sm text-textPrimary">
            <span className="text-primary mr-2">[{activeOutput}]</span>
            {getOutputContent(activeOutput)}
          </div>
        </div>
      )}
    </div>
  );
});

export default Agents;
