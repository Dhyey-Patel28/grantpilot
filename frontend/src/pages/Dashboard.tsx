import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Clock, RefreshCw, FileText, CheckCircle2, 
  XCircle, Zap, Bookmark, ShieldAlert, ArrowRight, Bot, 
  Search, FileSignature, Database, TrendingUp, DollarSign, Activity 
} from 'lucide-react';

const initialGrantsData = [
  { id: 1, title: 'EPA Clean Water State Revolving Fund', agency: 'Environmental Protection Agency', amount: '$1.2M - $5M', deadline: 'Aug 15, 2026', match: 92, saved: false, rejected: false },
  { id: 2, title: 'DOE Grid Resilience State Formula Grants', agency: 'Department of Energy', amount: '$500K - $2M', deadline: 'Sep 01, 2026', match: 85, saved: false, rejected: false },
  { id: 3, title: 'USDA ReConnect Loan and Grant', agency: 'US Dept of Agriculture', amount: '$100K - $25M', deadline: 'Sep 12, 2026', match: 78, saved: false, rejected: false },
  { id: 4, title: 'DOT RAISE Discretionary Grants', agency: 'Department of Transportation', amount: '$1M - $25M', deadline: 'Oct 05, 2026', match: 95, saved: false, rejected: false },
];

const agentWorkflowSteps = [
  { id: 'profile', name: 'Profile Agent', icon: Search },
  { id: 'discovery', name: 'Discovery Agent', icon: Database },
  { id: 'fit', name: 'Fit Scorer Agent', icon: Activity },
  { id: 'translator', name: 'Requirements Translator', icon: FileText },
  { id: 'generator', name: 'Packet Generator Agent', icon: FileSignature },
  { id: 'trust', name: 'Trust Guard Agent', icon: ShieldAlert },
];

export function Dashboard() {
  const navigate = useNavigate();

  // Cache State
  const [cacheStats, setCacheStats] = useState({
    totalCached: 613,
    grantsGov: 552,
    miFundingHub: 114,
    lastFast: '2 hours ago',
    lastFull: 'Yesterday, 10:00 PM'
  });
  const [isRefreshingFast, setIsRefreshingFast] = useState(false);
  const [isRefreshingFull, setIsRefreshingFull] = useState(false);

  // Grants State
  const [grants, setGrants] = useState(initialGrantsData);

  // Workflow State
  const [workflowStatus, setWorkflowStatus] = useState<Record<string, 'waiting' | 'running' | 'complete'>>({});
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load local storage
    const savedCache = localStorage.getItem('grantpilot_cache_stats');
    if (savedCache) setCacheStats(JSON.parse(savedCache));

    const savedGrantsList = localStorage.getItem('grantpilot_dashboard_grants');
    if (savedGrantsList) setGrants(JSON.parse(savedGrantsList));

    // Init workflow
    const initStatus: Record<string, 'waiting' | 'running' | 'complete'> = {};
    agentWorkflowSteps.forEach(s => initStatus[s.id] = 'waiting');
    setWorkflowStatus(initStatus);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFastRefresh = () => {
    setIsRefreshingFast(true);
    setTimeout(() => {
      const newStats = {
        ...cacheStats,
        totalCached: cacheStats.totalCached + Math.floor(Math.random() * 5),
        lastFast: 'Just now'
      };
      setCacheStats(newStats);
      localStorage.setItem('grantpilot_cache_stats', JSON.stringify(newStats));
      setIsRefreshingFast(false);
      showToast('Fast cache refresh completed!');
    }, 1500);
  };

  const handleFullRefresh = () => {
    setIsRefreshingFull(true);
    setTimeout(() => {
      const newStats = {
        totalCached: cacheStats.totalCached + 12,
        grantsGov: cacheStats.grantsGov + 8,
        miFundingHub: cacheStats.miFundingHub + 4,
        lastFast: 'Just now',
        lastFull: 'Just now'
      };
      setCacheStats(newStats);
      localStorage.setItem('grantpilot_cache_stats', JSON.stringify(newStats));
      setIsRefreshingFull(false);
      showToast('Full data cache synchronized!');
    }, 3000);
  };

  const handleGrantAction = (id: number, action: 'save' | 'reject') => {
    const updated = grants.map(g => {
      if (g.id === id) {
        if (action === 'save') return { ...g, saved: !g.saved };
        if (action === 'reject') return { ...g, rejected: true };
      }
      return g;
    });
    setGrants(updated);
    localStorage.setItem('grantpilot_dashboard_grants', JSON.stringify(updated));
    showToast(action === 'save' ? 'Grant saved to portfolio' : 'Grant rejected and hidden');
  };

  const runWorkflow = async () => {
    setIsWorkflowRunning(true);
    const statuses = { ...workflowStatus };
    agentWorkflowSteps.forEach(s => statuses[s.id] = 'waiting');
    setWorkflowStatus({ ...statuses });

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (const step of agentWorkflowSteps) {
      setWorkflowStatus(prev => ({ ...prev, [step.id]: 'running' }));
      await delay(1200);
      setWorkflowStatus(prev => ({ ...prev, [step.id]: 'complete' }));
    }
    
    setIsWorkflowRunning(false);
    showToast('Agent workflow completed successfully!');
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-bgPanel border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-textPrimary px-6 py-3 rounded-full flex items-center"
        >
          <CheckCircle2 className="w-5 h-5 text-primary mr-2" />
          {toastMessage}
        </motion.div>
      )}

      {/* TOP ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">

        {/* Data Cache */}
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-primary flex flex-col">
          <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center">
            <Database className="w-5 h-5 text-primary mr-2" /> Data Cache
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4 flex-1">
            <div className="bg-bgPanelLight rounded-lg p-3">
              <p className="text-xs text-textSecondary">Grants Cached</p>
              <p className="text-2xl font-bold text-textPrimary">{cacheStats.totalCached}</p>
            </div>
            <div className="bg-bgPanelLight rounded-lg p-3">
              <p className="text-xs text-textSecondary">Grants.gov / MI Hub</p>
              <p className="text-sm font-semibold text-textPrimary">{cacheStats.grantsGov} / {cacheStats.miFundingHub}</p>
            </div>
            <div className="col-span-2 text-xs text-textSecondary space-y-1">
              <p className="flex items-center"><Clock className="w-3 h-3 mr-1" /> Fast Refresh: <span className="text-textPrimary ml-1">{cacheStats.lastFast}</span></p>
              <p className="flex items-center"><Clock className="w-3 h-3 mr-1" /> Full Sync: <span className="text-textPrimary ml-1">{cacheStats.lastFull}</span></p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleFastRefresh} disabled={isRefreshingFast}
              className="flex-1 bg-bgPanelLight hover:bg-borderColor text-textPrimary border border-borderColor py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isRefreshingFast ? <div className="animate-spin w-3 h-3 border-2 border-textPrimary border-t-transparent rounded-full mr-1"/> : <RefreshCw className="w-3 h-3 mr-1" />} Fast
            </button>
            <button 
              onClick={handleFullRefresh} disabled={isRefreshingFull}
              className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isRefreshingFull ? <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"/> : <Database className="w-3 h-3 mr-1" />} Full Sync
            </button>
          </div>
        </div>
      </div>

      {/* KPIs & TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col: Overview KPIs + Agent Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl">
              <TrendingUp className="w-5 h-5 text-secondary mb-2" />
              <p className="text-xs text-textSecondary">Win Rate</p>
              <p className="text-lg font-bold text-textPrimary">42%</p>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <DollarSign className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs text-textSecondary">Total Pool</p>
              <p className="text-lg font-bold text-textPrimary">$8.4M</p>
            </div>
          </div>

          {/* Agent Workflow Status */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-textPrimary flex items-center">
                <Bot className="w-5 h-5 text-primary mr-2" /> Agent Status
              </h2>
              <button 
                onClick={runWorkflow} disabled={isWorkflowRunning}
                className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isWorkflowRunning ? 'Running...' : 'Run Workflow'}
              </button>
            </div>
            <div className="space-y-4">
              {agentWorkflowSteps.map(step => {
                const status = workflowStatus[step.id] || 'waiting';
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                      status === 'complete' ? 'bg-secondary/20 text-secondary' :
                      status === 'running' ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse' :
                      'bg-bgPanelLight text-textSecondary'
                    }`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${status === 'running' ? 'text-primary' : 'text-textPrimary'}`}>{step.name}</p>
                      <p className="text-[10px] text-textSecondary uppercase tracking-wider">{status}</p>
                    </div>
                    {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-secondary" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Top Matching Grants Table */}
        <div className="lg:col-span-3 glass-panel rounded-2xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-borderColor flex justify-between items-center bg-bgPanelLight/30">
            <h2 className="text-lg font-bold text-textPrimary">Top Matching Grants</h2>
            <Link to="/explorer" className="text-sm text-primary hover:underline">View All in Explorer</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderColor bg-bgPanel/50">
                  <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider">Opportunity</th>
                  <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider text-center">Score</th>
                  <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider">Amount / Deadline</th>
                  <th className="p-4 text-xs font-semibold text-textSecondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.filter(g => !g.rejected).map(grant => (
                  <tr key={grant.id} className="border-b border-borderColor hover:bg-bgPanelLight/30 transition-colors group">
                    <td className="p-4">
                      <p className="text-sm font-bold text-textPrimary group-hover:text-primary transition-colors">{grant.title}</p>
                      <p className="text-xs text-textSecondary">{grant.agency}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-bgPanel border border-borderColor">
                        <span className={`text-lg font-bold leading-none ${grant.match >= 90 ? 'text-secondary' : 'text-primary'}`}>{grant.match}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-textPrimary font-medium">{grant.amount}</p>
                      <p className="text-xs text-amber-400">{grant.deadline}</p>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => showToast(`AI explains ${grant.match}% score...`)} className="text-xs bg-bgPanel hover:bg-borderColor border border-borderColor text-textSecondary hover:text-textPrimary px-2.5 py-1.5 rounded-md transition-colors">
                        Explain
                      </button>
                      <button onClick={() => navigate(`/explorer/${grant.id}`)} className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 rounded-md transition-colors">
                        View
                      </button>
                      <button onClick={() => handleGrantAction(grant.id, 'save')} className={`p-1.5 rounded-md border transition-colors ${grant.saved ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-bgPanel border-borderColor text-textSecondary hover:text-textPrimary'}`}>
                        <Bookmark className="w-4 h-4" fill={grant.saved ? "currentColor" : "none"} />
                      </button>
                      <button onClick={() => handleGrantAction(grant.id, 'reject')} className="p-1.5 rounded-md bg-bgPanel border border-borderColor text-textSecondary hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {grants.filter(g => !g.rejected).length === 0 && (
              <div className="p-8 text-center text-textSecondary text-sm">
                No matching grants remaining. Try resetting your filters.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
