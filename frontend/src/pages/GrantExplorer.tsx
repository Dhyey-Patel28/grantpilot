"use client";
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Filter, Search, ChevronDown, CheckCircle2, Bookmark, XCircle, ChevronLeft, ChevronRight, X, SlidersHorizontal, Eye, Sparkles, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type SortKey = 'match' | 'deadline' | 'amount' | 'title' | 'eligible';
type Industry = 'Infrastructure' | 'Energy' | 'Technology' | 'Agriculture' | 'Healthcare';
type ApplicantType = 'Nonprofit' | 'Small Business' | 'Local Government' | 'Tribal Entity';

interface Grant {
  id: number; title: string; amount: string; amountNum: number; deadline: string; deadlineDate: string;
  match: number; status: string; eligible: boolean; agency: string; saved: boolean;
  industry: Industry; applicantType: ApplicantType;
}

const allGrants: Grant[] = [
  { id: 1, title: 'EPA Clean Water State Revolving Fund', amount: '$1.2M - $5M', amountNum: 5000000, deadline: 'Aug 15, 2026', deadlineDate: '2026-08-15', match: 92, status: 'Open', eligible: true, agency: 'Environmental Protection Agency', saved: false, industry: 'Infrastructure', applicantType: 'Local Government' },
  { id: 2, title: 'DOE Grid Resilience State Formula Grants', amount: '$500K - $2M', amountNum: 2000000, deadline: 'Sep 01, 2026', deadlineDate: '2026-09-01', match: 85, status: 'Open', eligible: true, agency: 'Department of Energy', saved: false, industry: 'Energy', applicantType: 'Local Government' },
  { id: 3, title: 'USDA ReConnect Loan and Grant Program', amount: '$100K - $25M', amountNum: 25000000, deadline: 'Sep 12, 2026', deadlineDate: '2026-09-12', match: 78, status: 'Open', eligible: false, agency: 'US Dept of Agriculture', saved: true, industry: 'Technology', applicantType: 'Tribal Entity' },
  { id: 4, title: 'DOT RAISE Discretionary Grants', amount: '$1M - $25M', amountNum: 25000000, deadline: 'Oct 05, 2026', deadlineDate: '2026-10-05', match: 95, status: 'Forecasted', eligible: true, agency: 'Department of Transportation', saved: false, industry: 'Infrastructure', applicantType: 'Local Government' },
  { id: 5, title: 'EDA Public Works Assistance', amount: '$100K - $3M', amountNum: 3000000, deadline: 'Rolling', deadlineDate: '2099-12-31', match: 60, status: 'Open', eligible: true, agency: 'Economic Development Admin', saved: false, industry: 'Infrastructure', applicantType: 'Nonprofit' },
  { id: 6, title: 'FEMA Building Resilient Infrastructure', amount: 'Up to $10M', amountNum: 10000000, deadline: 'Nov 15, 2026', deadlineDate: '2026-11-15', match: 88, status: 'Open', eligible: true, agency: 'FEMA', saved: false, industry: 'Infrastructure', applicantType: 'Local Government' },
  { id: 7, title: 'HHS Community Health Center Grants', amount: '$250K - $1M', amountNum: 1000000, deadline: 'Dec 01, 2026', deadlineDate: '2026-12-01', match: 42, status: 'Open', eligible: true, agency: 'Health and Human Services', saved: false, industry: 'Healthcare', applicantType: 'Nonprofit' },
  { id: 8, title: 'USDA Rural Energy for America', amount: '$20K - $1M', amountNum: 1000000, deadline: 'Oct 31, 2026', deadlineDate: '2026-10-31', match: 71, status: 'Open', eligible: true, agency: 'US Dept of Agriculture', saved: false, industry: 'Agriculture', applicantType: 'Small Business' },
  { id: 9, title: 'NSF Small Business Innovation Research', amount: '$275K - $1M', amountNum: 1000000, deadline: 'Nov 20, 2026', deadlineDate: '2026-11-20', match: 55, status: 'Open', eligible: false, agency: 'National Science Foundation', saved: false, industry: 'Technology', applicantType: 'Small Business' },
];

const INDUSTRIES: Industry[] = ['Infrastructure', 'Energy', 'Technology', 'Agriculture', 'Healthcare'];
const APPLICANT_TYPES: ApplicantType[] = ['Nonprofit', 'Small Business', 'Local Government', 'Tribal Entity'];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'match', label: 'Match Score' },
  { key: 'deadline', label: 'Deadline Soonest' },
  { key: 'amount', label: 'Funding Amount' },
  { key: 'title', label: 'Grant Title A-Z' },
  { key: 'eligible', label: 'Eligibility' },
];

const PAGE_SIZE = 9;

// ── Filter Panel (shared between desktop sidebar & mobile drawer) ──
const FilterPanel = memo(function FilterPanel({
  industries, applicantTypes, minScore, onToggleIndustry, onToggleApplicant, onScoreChange, onReset,
}: {
  industries: Set<Industry>; applicantTypes: Set<ApplicantType>; minScore: number;
  onToggleIndustry: (v: Industry) => void; onToggleApplicant: (v: ApplicantType) => void;
  onScoreChange: (v: number) => void; onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-textPrimary flex items-center text-sm"><Filter className="w-4 h-4 mr-2" /> Filters</h2>
        <button onClick={onReset} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset</button>
      </div>
      {/* Industry */}
      <div>
        <h3 className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-3">Industry</h3>
        <div className="space-y-2">
          {INDUSTRIES.map(item => (
            <label key={item} className="flex items-center cursor-pointer group">
              <input type="checkbox" checked={industries.has(item)} onChange={() => onToggleIndustry(item)}
                className="form-checkbox h-4 w-4 text-primary bg-bgPanel/50 border-borderColor rounded focus:ring-primary focus:ring-offset-0 cursor-pointer" />
              <span className="ml-2.5 text-sm text-textSecondary group-hover:text-textPrimary transition-colors">{item}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Applicant Type */}
      <div>
        <h3 className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-3">Applicant Type</h3>
        <div className="space-y-2">
          {APPLICANT_TYPES.map(item => (
            <label key={item} className="flex items-center cursor-pointer group">
              <input type="checkbox" checked={applicantTypes.has(item)} onChange={() => onToggleApplicant(item)}
                className="form-checkbox h-4 w-4 text-primary bg-bgPanel/50 border-borderColor rounded focus:ring-primary focus:ring-offset-0 cursor-pointer" />
              <span className="ml-2.5 text-sm text-textSecondary group-hover:text-textPrimary transition-colors">{item}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Match Score */}
      <div>
        <h3 className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-3">Min Match Score</h3>
        <input type="range" className="w-full accent-primary h-1.5 rounded-full cursor-pointer" min="0" max="100" value={minScore} onChange={e => onScoreChange(Number(e.target.value))} />
        <div className="flex justify-between text-xs text-textSecondary mt-1.5">
          <span>0%</span>
          <span className="text-primary font-medium">≥ {minScore}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
});

export const GrantExplorer = memo(function GrantExplorer() {
  // Filter state
  const [industries, setIndustries] = useState<Set<Industry>>(new Set());
  const [applicantTypes, setApplicantTypes] = useState<Set<ApplicantType>>(new Set());
  const [minScore, setMinScore] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('match');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [grants, setGrants] = useState(allGrants);
  const [page, setPage] = useState(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sortRef = useRef<HTMLDivElement>(null);

  // Hydrate saved grants from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('grantpilot_saved_grants');
      if (saved) {
        const ids: number[] = JSON.parse(saved);
        setGrants(prev => prev.map(g => ({ ...g, saved: ids.includes(g.id) })));
      }
    } catch {}
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 250);
  }, []);

  const toggleIndustry = useCallback((v: Industry) => {
    setIndustries(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
    setPage(1);
  }, []);

  const toggleApplicant = useCallback((v: ApplicantType) => {
    setApplicantTypes(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
    setPage(1);
  }, []);

  const handleScoreChange = useCallback((v: number) => { setMinScore(v); setPage(1); }, []);

  const handleReset = useCallback(() => {
    setIndustries(new Set());
    setApplicantTypes(new Set());
    setMinScore(0);
    setSearchTerm('');
    setDebouncedSearch('');
    setSortKey('match');
    setPage(1);
    showToast('Filters reset');
  }, [showToast]);

  const toggleSave = useCallback((id: number) => {
    setGrants(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, saved: !g.saved } : g);
      localStorage.setItem('grantpilot_saved_grants', JSON.stringify(updated.filter(g => g.saved).map(g => g.id)));
      return updated;
    });
  }, []);

  const handleSort = useCallback((key: SortKey) => { setSortKey(key); setShowSortMenu(false); }, []);

  // Filter + sort with useMemo
  const filteredSorted = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    let result = grants.filter(g => {
      if (q && !(g.title.toLowerCase().includes(q) || g.agency.toLowerCase().includes(q) || g.industry.toLowerCase().includes(q) || g.applicantType.toLowerCase().includes(q) || g.status.toLowerCase().includes(q) || (g.eligible ? 'eligible' : 'ineligible').includes(q))) return false;
      if (industries.size > 0 && !industries.has(g.industry)) return false;
      if (applicantTypes.size > 0 && !applicantTypes.has(g.applicantType)) return false;
      if (g.match < minScore) return false;
      return true;
    });
    result.sort((a, b) => {
      switch (sortKey) {
        case 'match': return b.match - a.match;
        case 'deadline': return a.deadlineDate.localeCompare(b.deadlineDate);
        case 'amount': return b.amountNum - a.amountNum;
        case 'title': return a.title.localeCompare(b.title);
        case 'eligible': return (b.eligible ? 1 : 0) - (a.eligible ? 1 : 0);
        default: return 0;
      }
    });
    return result;
  }, [grants, debouncedSearch, industries, applicantTypes, minScore, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const paginated = useMemo(() => filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredSorted, page]);

  const activeFilterCount = industries.size + applicantTypes.size + (minScore > 0 ? 1 : 0);
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label || 'Match Score';

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6 relative">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl flex items-center text-sm font-medium animate-fade-in theme-toast">
          <CheckCircle2 className="w-4 h-4 text-primary mr-2" />{toastMsg}
        </div>
      )}

      {/* ── Mobile Filter Button ── */}
      <div className="lg:hidden flex items-center gap-3">
        <button onClick={() => setShowMobileFilters(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-borderColor bg-bgPanel hover:bg-bgPanelLight text-textPrimary transition-colors">
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {activeFilterCount > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
        </button>
      </div>

      {/* ── Mobile Filter Drawer ── */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileFilters(false)} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 h-full w-80 z-50 bg-bgApp border-r border-borderColor p-6 overflow-y-auto custom-scrollbar lg:hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-textPrimary">Filters</h2>
                <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-lg hover:bg-white/5 text-textSecondary"><X className="w-5 h-5" /></button>
              </div>
              <FilterPanel industries={industries} applicantTypes={applicantTypes} minScore={minScore}
                onToggleIndustry={toggleIndustry} onToggleApplicant={toggleApplicant} onScoreChange={handleScoreChange} onReset={() => { handleReset(); setShowMobileFilters(false); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Filter Sidebar ── */}
      <div className="w-60 shrink-0 hidden lg:block">
        <div className="glass-panel p-5 rounded-2xl h-full overflow-y-auto custom-scrollbar">
          <FilterPanel industries={industries} applicantTypes={applicantTypes} minScore={minScore}
            onToggleIndustry={toggleIndustry} onToggleApplicant={toggleApplicant} onScoreChange={handleScoreChange} onReset={handleReset} />
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search + Sort row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-textSecondary" /></div>
            <input type="text" placeholder="Search grants, agencies, industries..."
              className="block w-full pl-10 pr-3 py-2.5 border border-borderColor rounded-xl leading-5 bg-bgPanelLight/50 text-textPrimary placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all"
              value={searchTerm} onChange={handleSearchChange} />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Sort dropdown */}
            <div ref={sortRef} className="relative flex-1 sm:flex-none">
              <button onClick={() => setShowSortMenu(!showSortMenu)}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-center px-4 py-2.5 border border-borderColor rounded-xl text-sm font-medium text-textPrimary bg-bgPanelLight/50 hover:bg-bgPanelLight transition-colors gap-2">
                <span className="truncate">Sort: {currentSortLabel}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-30 theme-dropdown">
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => handleSort(opt.key)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortKey === opt.key ? 'bg-primary/10 text-primary font-medium' : 'text-textSecondary hover:text-textPrimary hover:bg-bgPanelLight/50'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-xs text-textSecondary whitespace-nowrap hidden sm:inline">{filteredSorted.length} results</span>
          </div>
        </div>

        {/* Grant Grid / Empty State */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {paginated.length === 0 ? (
            <div className="rounded-2xl p-16 text-center theme-card">
              <div className="w-14 h-14 rounded-full bg-bgPanelLight/50 flex items-center justify-center mx-auto mb-4"><Search className="w-7 h-7 text-textSecondary" /></div>
              <p className="text-base font-medium text-textPrimary mb-1">No grants match your filters</p>
              <p className="text-sm text-textSecondary mb-4">Try adjusting your search or filter criteria.</p>
              <button onClick={handleReset} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors">Clear Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
              {paginated.map(grant => (
                <div key={grant.id} className="rounded-xl overflow-hidden flex flex-col group transition-all duration-200 hover:-translate-y-0.5 theme-card theme-card-hover"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Top row: status + eligible + save */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">{grant.status}</span>
                        {grant.eligible
                          ? <span className="flex items-center text-[10px] font-semibold text-secondary"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Eligible</span>
                          : <span className="text-[10px] font-semibold text-red-400">Ineligible</span>}
                      </div>
                      <button onClick={() => toggleSave(grant.id)}
                        className={`p-1.5 rounded-lg transition-all ${grant.saved ? 'bg-primary/15 text-primary' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'}`}
                        title={grant.saved ? 'Unsave' : 'Save'}>
                        <Bookmark className="w-4 h-4" fill={grant.saved ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* Title + agency */}
                    <h3 className="text-sm font-bold text-textPrimary mb-1 group-hover:text-primary transition-colors line-clamp-2 leading-snug">{grant.title}</h3>
                    <p className="text-xs text-textSecondary mb-3">{grant.agency}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/8 text-primary/80 border border-primary/10">{grant.industry}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary/8 text-secondary/80 border border-secondary/10">{grant.applicantType}</span>
                    </div>

                    {/* Details */}
                    <div className="mt-auto space-y-2">
                      <div className="flex justify-between text-xs"><span className="text-textSecondary">Amount</span><span className="text-textPrimary font-medium">{grant.amount}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-textSecondary">Deadline</span><span className="text-textPrimary font-medium">{grant.deadline}</span></div>

                      {/* Match Score bar */}
                      <div className="pt-3 border-t border-borderColor">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] text-textSecondary font-medium uppercase tracking-wider">AI Match</span>
                          <span className={`text-base font-bold ${grant.match >= 90 ? 'text-secondary' : grant.match >= 70 ? 'text-primary' : 'text-amber-400'}`}>{grant.match}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-bgPanel/50 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${grant.match >= 90 ? 'bg-secondary' : grant.match >= 70 ? 'bg-primary' : 'bg-amber-400'}`} style={{ width: `${grant.match}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-borderColor">
                      <button onClick={() => showToast(`Viewing: ${grant.title}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-white/5 border border-borderColor transition-all">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button onClick={() => showToast(`Match score explained for: ${grant.title}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-textSecondary hover:text-primary hover:bg-primary/5 border border-borderColor transition-all">
                        <Sparkles className="w-3.5 h-3.5" /> Explain
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 pb-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg bg-bgPanel border border-borderColor text-textSecondary hover:text-textPrimary disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-textSecondary">Page <span className="text-textPrimary font-medium">{page}</span> of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg bg-bgPanel border border-borderColor text-textSecondary hover:text-textPrimary disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
