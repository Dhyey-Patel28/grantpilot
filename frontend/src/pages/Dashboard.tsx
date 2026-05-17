"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  AlertTriangle, Clock, RefreshCw, FileText, CheckCircle2, 
  XCircle, Zap, Bookmark, ShieldAlert, ArrowRight, Bot, 
  Search, FileSignature, Database, TrendingUp, DollarSign, Activity, PlayCircle, MapPin 
} from 'lucide-react';

const initialGrantsData = [
  { id: 1, title: 'EPA Clean Water State Revolving Fund', agency: 'Environmental Protection Agency', amount: '$1.2M - $5M', deadline: 'Aug 15, 2026', match: 92, saved: false, rejected: false },
  { id: 2, title: 'DOE Grid Resilience State Formula Grants', agency: 'Department of Energy', amount: '$500K - $2M', deadline: 'Sep 01, 2026', match: 85, saved: false, rejected: false },
  { id: 3, title: 'USDA ReConnect Loan and Grant', agency: 'US Dept of Agriculture', amount: '$100K - $25M', deadline: 'Sep 12, 2026', match: 78, saved: false, rejected: false },
  { id: 4, title: 'DOT RAISE Discretionary Grants', agency: 'Department of Transportation', amount: '$1M - $25M', deadline: 'Oct 05, 2026', match: 95, saved: false, rejected: false },
];

const defaultCacheStats = { totalCached: 613, grantsGov: 552, miFundingHub: 114, lastFast: '2 hours ago', lastFull: 'Yesterday, 10:00 PM' };

export const Dashboard = memo(function Dashboard() {
  const navigate = useRouter();

  // Initialize with defaults (SSR-safe), then hydrate from localStorage
  const [cacheStats, setCacheStats] = useState(defaultCacheStats);
  const [grants, setGrants] = useState(initialGrantsData);
  const [isRefreshingFast, setIsRefreshingFast] = useState(false);
  const [isRefreshingFull, setIsRefreshingFull] = useState(false);

  // Hydrate from localStorage once on client
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem('grantpilot_cache_stats');
      if (savedCache) setCacheStats(JSON.parse(savedCache));
      const savedGrants = localStorage.getItem('grantpilot_dashboard_grants');
      if (savedGrants) setGrants(JSON.parse(savedGrants));
    } catch {}
  }, []);

  const [demoMode, setDemoMode] = useState(false);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleFastRefresh = useCallback(() => {
    setIsRefreshingFast(true);
    setTimeout(() => {
      setCacheStats(prev => {
        const newStats = {
          ...prev,
          totalCached: prev.totalCached + Math.floor(Math.random() * 5),
          lastFast: 'Just now'
        };
        localStorage.setItem('grantpilot_cache_stats', JSON.stringify(newStats));
        return newStats;
      });
      setIsRefreshingFast(false);
      setToastMessage('Fast cache refresh completed!');
      setTimeout(() => setToastMessage(null), 3000);
    }, 1500);
  }, []);

  const handleFullRefresh = useCallback(() => {
    setIsRefreshingFull(true);
    setTimeout(() => {
      setCacheStats(prev => {
        const newStats = {
          totalCached: prev.totalCached + 12,
          grantsGov: prev.grantsGov + 8,
          miFundingHub: prev.miFundingHub + 4,
          lastFast: 'Just now',
          lastFull: 'Just now'
        };
        localStorage.setItem('grantpilot_cache_stats', JSON.stringify(newStats));
        return newStats;
      });
      setIsRefreshingFull(false);
      setToastMessage('Full data cache synchronized!');
      setTimeout(() => setToastMessage(null), 3000);
    }, 3000);
  }, []);

  const handleGrantAction = useCallback((id: number, action: 'save' | 'reject') => {
    setGrants((prev: typeof initialGrantsData) => {
      const updated = prev.map(g => {
        if (g.id === id) {
          if (action === 'save') return { ...g, saved: !g.saved };
          if (action === 'reject') return { ...g, rejected: true };
        }
        return g;
      });
      localStorage.setItem('grantpilot_dashboard_grants', JSON.stringify(updated));
      return updated;
    });
    setToastMessage(action === 'save' ? 'Grant saved to portfolio' : 'Grant rejected and hidden');
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

 

  // Memoize filtered grants list
  const visibleGrants = useMemo(() => grants.filter((g: typeof initialGrantsData[0]) => !g.rejected), [grants]);

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-bgPanel border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-textPrimary px-6 py-3 rounded-full flex items-center animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-primary mr-2" />
          {toastMessage}
        </div>
      )}

      {/* HERO STATISTICS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Potential Funding Identified', value: '$84.2M' },
          { label: 'Active Grants Cached', value: '1,240' },
          { label: 'AI Agents Coordinated', value: '10' },
          { label: 'Match Accuracy', value: '94%' },
          { label: 'Readiness Packets Generated', value: '18' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-bold text-primary mb-1">{stat.value}</p>
            <p className="text-xs text-textSecondary">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* TOP ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
        
        {/* Demo Mode Toggle */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center border-l-4 border-l-secondary">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-textPrimary flex items-center mb-1">
                <PlayCircle className="w-5 h-5 text-secondary mr-2" /> Demo Scenario Mode
              </h2>
              <p className="text-sm text-textSecondary">Preload Clare County infrastructure crisis, sample grants, and AI workflow.</p>
            </div>
            <button
              onClick={() => { setDemoMode(!demoMode); showToast(!demoMode ? 'Clare County scenario loaded' : 'Demo mode disabled'); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${demoMode ? 'bg-secondary' : 'bg-bgPanelLight'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${demoMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs & TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col: Overview KPIs + Agent Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Grant Readiness Score */}
            <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full border-4 border-bgPanelLight flex items-center justify-center mb-2 relative">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="40%" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" strokeDasharray="100" strokeDashoffset="18" />
                </svg>
                <span className="text-lg font-bold text-textPrimary">82%</span>
              </div>
              <p className="text-xs text-textSecondary font-semibold">READY</p>
            </div>
            {/* Trust & Verification */}
            <div className="glass-panel p-4 rounded-xl flex flex-col items-start justify-center">
              <h3 className="text-[11px] font-bold text-textPrimary mb-2 flex items-center"><ShieldAlert className="w-3 h-3 mr-1 text-primary"/> Trust & Verify</h3>
              <div className="space-y-1 w-full">
                <div className="flex justify-between items-center w-full"><span className="text-[10px] text-textSecondary">Confidence</span><span className="text-[10px] text-secondary">High</span></div>
                <div className="flex justify-between items-center w-full"><span className="text-[10px] text-textSecondary">Human Review</span><span className="text-[10px] text-amber-400">Needed</span></div>
                <div className="flex justify-between items-center w-full"><span className="text-[10px] text-textSecondary">Risk</span><span className="text-[10px] text-secondary">Low</span></div>
              </div>
            </div>
          </div>

 
        </div>

        {/* Right Col: Top Matching Grants Table */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          <div className="glass-panel rounded-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-borderColor flex justify-between items-center bg-bgPanelLight/30">
            <h2 className="text-lg font-bold text-textPrimary">Top Matching Grants</h2>
            <Link href="/explorer" className="text-sm text-primary hover:underline">View All in Explorer</Link>
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
                {visibleGrants.map((grant: typeof initialGrantsData[0]) => (
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
                      <button onClick={() => navigate.push(`/explorer/${grant.id}`)} className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 rounded-md transition-colors">
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
            {visibleGrants.length === 0 && (
              <div className="p-8 text-center text-textSecondary text-sm">
                No matching grants remaining. Try resetting your filters.
              </div>
            )}
          </div>
          </div>

          {/* Michigan Infrastructure Insights */}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-bold text-textPrimary flex items-center mb-4">
              <MapPin className="w-5 h-5 text-primary mr-2" /> Michigan Infrastructure Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-bgPanel border border-borderColor p-4 rounded-xl flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-textSecondary mb-1">Active Counties</p>
                  <p className="text-xl font-bold text-textPrimary">83 <span className="text-sm font-normal text-textSecondary">/ 83</span></p>
                </div>
                <MapPin className="w-8 h-8 text-white/5" />
              </div>
              <div className="bg-bgPanel border border-borderColor p-4 rounded-xl flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-textSecondary mb-1">Funding Opportunities</p>
                  <p className="text-xl font-bold text-secondary">214 <span className="text-sm font-normal text-textSecondary">Active</span></p>
                </div>
                <DollarSign className="w-8 h-8 text-white/5" />
              </div>
              <div className="bg-bgPanel border border-borderColor p-4 rounded-xl flex flex-col justify-center">
                <p className="text-xs text-textSecondary mb-2">Top Infrastructure Needs</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] rounded border border-primary/20">Water Mains</span>
                  <span className="px-2 py-1 bg-secondary/10 text-secondary text-[10px] rounded border border-secondary/20">Bridge Repair</span>
                  <span className="px-2 py-1 bg-amber-400/10 text-amber-400 text-[10px] rounded border border-amber-400/20">Broadband</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});
