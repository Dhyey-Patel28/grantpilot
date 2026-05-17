"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Bell, Search, Command, AlertTriangle, FileWarning, Calendar, FileCheck, CheckCircle2, ChevronRight, Eye, ClipboardCheck, ScrollText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const initialAlerts = [
  { id: 1, title: '8 grants closing within 30 days', message: 'Requires immediate review', icon: Calendar, severity: 'High', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-400', glow: 'hover:shadow-[0_0_12px_rgba(239,68,68,0.12)]' },
  { id: 2, title: '12 water grants need verification', message: 'Eligibility check pending', icon: FileCheck, severity: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400', glow: 'hover:shadow-[0_0_12px_rgba(245,158,11,0.12)]' },
  { id: 3, title: '3 high-fit grants missing costs', message: 'Cost estimate required', icon: FileWarning, severity: 'Medium', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', dot: 'bg-primary', glow: 'hover:shadow-[0_0_12px_rgba(59,130,246,0.12)]' },
  { id: 4, title: 'Cache refresh completed', message: '2 hours ago', icon: CheckCircle2, severity: 'Low', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20', dot: 'bg-secondary', glow: 'hover:shadow-[0_0_12px_rgba(16,185,129,0.12)]' },
];

export const Header = memo(function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useRouter();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Hydrate alerts from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('grantpilot_header_alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
        const rehydrated = parsed.map((a: any) => {
          const match = initialAlerts.find(ia => ia.id === a.id);
          return match || a;
        });
        setAlerts(rehydrated);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setAlerts([]);
    localStorage.setItem('grantpilot_header_alerts', JSON.stringify([]));
    setIsOpen(false);
  }, []);

  const handleDismissAlert = useCallback((id: number) => {
    setDismissedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setAlerts((prev: typeof initialAlerts) => {
        const updated = prev.filter(a => a.id !== id);
        localStorage.setItem('grantpilot_header_alerts', JSON.stringify(updated));
        return updated;
      });
      setDismissedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, []);

  // Debounced search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      // Future: trigger actual search
    }, 300);
  }, []);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-red-400 bg-red-500/15 border-red-500/25';
      case 'Medium': return 'text-amber-400 bg-amber-500/15 border-amber-500/25';
      case 'Low': return 'text-secondary bg-secondary/15 border-secondary/25';
      default: return 'text-textSecondary bg-bgPanelLight border-borderColor';
    }
  };

  const unreadCount = alerts.length;

  return (
    <header className="h-16 glass-panel border-b border-borderColor flex items-center justify-between px-6 z-50 sticky top-0 bg-bgPanelLight/40">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-textSecondary group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-3 py-2 border border-borderColor rounded-lg leading-5 bg-bgPanelLight/50 text-textPrimary placeholder-textSecondary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-bgPanelLight transition-all sm:text-sm"
            placeholder="Search grants, documents, or ask AI..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="inline-flex items-center border border-borderColor rounded px-2 text-xs font-sans font-medium text-textSecondary bg-bgPanel/50">
              <Command className="w-3 h-3 mr-1" /> K
            </kbd>
          </div>
        </div>
      </div>
      
      <div className="ml-4 flex items-center space-x-4 relative" ref={dropdownRef}>
        {/* ── Bell Icon ── */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2.5 transition-all duration-200 rounded-xl ${
            isOpen 
              ? 'bg-primary/15 text-primary shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-primary/30' 
              : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'
          }`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-bgApp shadow-[0_0_8px_rgba(239,68,68,0.4)]">
              {unreadCount}
            </span>
          )}
        </button>

        {/* ── Notification Dropdown ── */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Scrim overlay to prevent click-through */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70]"
                onClick={() => setIsOpen(false)}
              />

              <motion.div 
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute top-[calc(100%+8px)] right-0 w-[520px] z-[80] rounded-2xl overflow-hidden theme-dropdown"
                style={{ backdropFilter: 'blur(24px)' }}
              >
                {/* ── Header ── */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-borderColor"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-textPrimary tracking-tight">Priority Alerts</h3>
                      <p className="text-[11px] text-textSecondary mt-0.5">
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-textSecondary hover:text-primary transition-colors font-medium px-2.5 py-1.5 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/10"
                      >
                        Mark all read
                      </button>
                    )}
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-bgPanelLight/50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Alert Cards ── */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {alerts.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-bgPanelLight/50 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6 text-secondary" />
                      </div>
                      <p className="text-sm font-medium text-textPrimary">All caught up!</p>
                      <p className="text-xs text-textSecondary mt-1">No priority alerts at this time.</p>
                    </div>
                  ) : (
                    <div className="p-2.5 space-y-1">
                      {alerts.map((alert) => (
                        <div 
                          key={alert.id}
                          className={`relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group cursor-default border border-borderColor theme-card-hover ${alert.glow} ${
                            dismissedIds.has(alert.id) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                          }`}
                        >
                          {/* Unread dot */}
                          <div className={`absolute top-3.5 left-1 w-1.5 h-1.5 rounded-full ${alert.dot} shadow-[0_0_6px_currentColor]`} />

                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${alert.bg} ${alert.color} ${alert.border}`}>
                            <alert.icon className="w-4 h-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-textPrimary leading-snug truncate pr-2">{alert.title}</p>
                            <p className="text-[11px] text-textSecondary mt-0.5 leading-tight">{alert.message}</p>
                          </div>

                          {/* Right section: severity + actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Severity badge */}
                            <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${getSeverityStyles(alert.severity)}`}>
                              {alert.severity}
                            </span>

                            {/* Action buttons — visible on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <button 
                                onClick={() => showToast(`Opening: ${alert.title}`)}
                                className="p-1.5 rounded-lg text-textSecondary hover:text-primary hover:bg-primary/10 transition-all duration-150"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => showToast(`Reviewing: ${alert.title}`)}
                                className="p-1.5 rounded-lg text-textSecondary hover:text-primary hover:bg-primary/10 transition-all duration-150"
                                title="Review"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDismissAlert(alert.id)}
                                className="p-1.5 rounded-lg text-textSecondary hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
                                title="Dismiss"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-3 text-center border-t border-borderColor"
                >
                  <button 
                    onClick={() => { setIsOpen(false); navigate.push('/notifications'); }}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-all duration-200 flex items-center justify-center w-full gap-1.5 py-1 rounded-lg hover:bg-primary/5"
                  >
                    View all alerts <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-20 right-6 z-[100] px-4 py-3 rounded-xl flex items-center text-sm font-medium theme-toast"
            style={{ backdropFilter: 'blur(16px)' }}
          >
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mr-2.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            </div>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
});
