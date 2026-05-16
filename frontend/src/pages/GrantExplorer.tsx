"use client";
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Search, ChevronDown, CheckCircle2, Bookmark, XCircle } from 'lucide-react';

const initialGrants = [
  { id: 1, title: 'EPA Clean Water State Revolving Fund', amount: '$1.2M - $5M', deadline: 'Aug 15, 2026', match: 92, status: 'Open', eligible: true, agency: 'Environmental Protection Agency', saved: false },
  { id: 2, title: 'DOE Grid Resilience State and Indian Tribe Formula Grants', amount: '$500K - $2M', deadline: 'Sep 01, 2026', match: 85, status: 'Open', eligible: true, agency: 'Department of Energy', saved: false },
  { id: 3, title: 'USDA ReConnect Loan and Grant Program', amount: '$100K - $25M', deadline: 'Sep 12, 2026', match: 78, status: 'Open', eligible: false, agency: 'US Dept of Agriculture', saved: true },
  { id: 4, title: 'DOT RAISE Discretionary Grants', amount: '$1M - $25M', deadline: 'Oct 05, 2026', match: 95, status: 'Forecasted', eligible: true, agency: 'Department of Transportation', saved: false },
  { id: 5, title: 'EDA Public Works and Economic Adjustment Assistance', amount: '$100K - $3M', deadline: 'Rolling', match: 60, status: 'Open', eligible: true, agency: 'Economic Development Admin', saved: false },
  { id: 6, title: 'FEMA Building Resilient Infrastructure', amount: 'Varies', deadline: 'Nov 15, 2026', match: 88, status: 'Open', eligible: true, agency: 'FEMA', saved: false },
];

export function GrantExplorer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [grants, setGrants] = useState(initialGrants);

  const toggleSave = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    setGrants(grants.map(g => g.id === id ? { ...g, saved: !g.saved } : g));
  };

  const rejectGrant = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    setGrants(grants.filter(g => g.id !== id));
  };

  const filteredGrants = grants.filter(g => g.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar Filters */}
      <div className="w-64 shrink-0 mr-6 hidden lg:block">
        <div className="glass-panel p-5 rounded-2xl h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-textPrimary flex items-center">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </h2>
            <button className="text-xs text-primary hover:text-primary/80 transition-colors">Reset</button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Industry</h3>
              <div className="space-y-2">
                {['Infrastructure', 'Energy', 'Technology', 'Agriculture', 'Healthcare'].map(item => (
                  <label key={item} className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-4 w-4 text-primary bg-bgPanel/50 border-borderColor rounded focus:ring-primary focus:ring-offset-surface" />
                    <span className="ml-2 text-sm text-textPrimary">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Applicant Type</h3>
              <div className="space-y-2">
                {['Nonprofit', 'Small Business', 'Local Government', 'Tribal Entity'].map(item => (
                  <label key={item} className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-4 w-4 text-primary bg-bgPanel/50 border-borderColor rounded focus:ring-primary focus:ring-offset-surface" />
                    <span className="ml-2 text-sm text-textPrimary">{item}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Match Score</h3>
              <input type="range" className="w-full accent-primary" min="0" max="100" defaultValue="70" />
              <div className="flex justify-between text-xs text-textSecondary mt-1">
                <span>0%</span>
                <span>&gt; 70%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-textSecondary" />
            </div>
            <input
              type="text"
              placeholder="Search grants..."
              className="block w-full pl-10 pr-3 py-2 border border-borderColor rounded-lg leading-5 bg-bgPanelLight/50 text-textPrimary placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-borderColor rounded-lg text-sm font-medium text-textPrimary bg-bgPanelLight/50 hover:bg-bgPanelLight transition-colors">
              Sort by: Match Score <ChevronDown className="ml-2 w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-6">
            <AnimatePresence>
              {filteredGrants.map((grant) => (
                <motion.div
                  key={grant.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="glass-panel rounded-xl overflow-hidden flex flex-col group relative"
                >
                  <div className="absolute top-4 right-4 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => toggleSave(e, grant.id)}
                      className={`p-1.5 rounded-md backdrop-blur-md transition-colors ${grant.saved ? 'bg-primary/20 text-primary' : 'bg-bgPanel/80 text-textSecondary hover:text-textPrimary'}`}
                      title={grant.saved ? "Unsave" : "Save Grant"}
                    >
                      <Bookmark className="w-4 h-4" fill={grant.saved ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={(e) => rejectGrant(e, grant.id)}
                      className="p-1.5 rounded-md bg-bgPanel/80 backdrop-blur-md text-textSecondary hover:text-red-400 hover:bg-red-400/20 transition-colors"
                      title="Reject / Hide"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <Link href={`/explorer/${grant.id}`} className="p-5 flex-1 flex flex-col hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        {grant.status}
                      </span>
                      <div className="flex items-center space-x-2 mr-16">
                        {grant.eligible ? (
                          <span className="flex items-center text-xs text-secondary font-medium">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible
                          </span>
                        ) : (
                          <span className="flex items-center text-xs text-red-400 font-medium">
                            Ineligible
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-textPrimary mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {grant.title}
                    </h3>
                    <p className="text-sm text-textSecondary mb-4">{grant.agency}</p>
                    
                    <div className="mt-auto space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-textSecondary">Amount</span>
                        <span className="text-textPrimary font-medium">{grant.amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-textSecondary">Deadline</span>
                        <span className="text-textPrimary font-medium">{grant.deadline}</span>
                      </div>
                      
                      {searchTerm.trim() !== '' && (
                        <div className="pt-3 border-t border-borderColor">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-xs text-textSecondary font-medium">AI Match Score</span>
                            <span className={`text-lg font-bold ${grant.match >= 90 ? 'text-secondary' : 'text-primary'}`}>
                              {grant.match}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-bgPanel/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${grant.match >= 90 ? 'bg-secondary' : 'bg-primary'}`} 
                              style={{ width: `${grant.match}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
