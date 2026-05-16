import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Command, AlertTriangle, FileWarning, Calendar, FileCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const initialAlerts = [
  { id: 1, title: '8 grants closing within 30 days', message: 'Requires immediate review', icon: Calendar, severity: 'High', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  { id: 2, title: '12 water grants need verification', message: 'Eligibility check pending', icon: FileCheck, severity: 'Medium', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  { id: 3, title: '3 high-fit grants missing costs', message: 'Cost estimate required', icon: FileWarning, severity: 'Medium', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { id: 4, title: 'Cache refresh completed', message: '2 hours ago', icon: CheckCircle2, severity: 'Low', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('grantpilot_header_alerts');
    if (saved) {
      try {
        setAlerts(JSON.parse(saved));
      } catch (e) {}
    }
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

  const handleMarkAllRead = () => {
    setAlerts([]);
    localStorage.setItem('grantpilot_header_alerts', JSON.stringify([]));
    setIsOpen(false);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <header className="h-16 glass-panel border-b border-borderColor flex items-center justify-between px-6 z-50 sticky top-0 bg-bgPanelLight/40">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-textSecondary group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
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
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 transition-all rounded-full ${
            isOpen ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'
          }`}
        >
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-secondary ring-2 ring-bgPanel"></span>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 right-0 w-96 glass-panel bg-bgPanel/95 backdrop-blur-xl border border-borderColor rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-borderColor flex justify-between items-center bg-bgPanelLight/50">
                <h3 className="font-bold text-textPrimary text-sm flex items-center">
                  Priority Alerts
                  {alerts.length > 0 && (
                    <span className="ml-2 bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-semibold">{alerts.length}</span>
                  )}
                </h3>
                <button 
                  onClick={handleMarkAllRead}
                  className="text-xs text-textSecondary hover:text-primary transition-colors font-medium"
                >
                  Mark all as read
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-textSecondary text-sm">
                    No new priority alerts
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="p-3 hover:bg-bgPanelLight/40 rounded-xl transition-colors group flex flex-col gap-2">
                        <div className="flex items-start">
                          <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${alert.bg} ${alert.color} ${alert.border}`}>
                            <alert.icon className="w-4 h-4" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-semibold text-textPrimary">{alert.title}</p>
                              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${alert.color} ${alert.bg}`}>{alert.severity}</span>
                            </div>
                            <p className="text-xs text-textSecondary mt-0.5">{alert.message}</p>
                          </div>
                        </div>
                        <div className="ml-11 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => showToast(`Opening details for: ${alert.title}`)} className="text-[10px] font-medium bg-bgPanel border border-borderColor hover:bg-bgPanelLight px-2 py-1 rounded transition-colors text-textSecondary hover:text-textPrimary">
                            View
                          </button>
                          <button onClick={() => showToast(`Reviewing item...`)} className="text-[10px] font-medium bg-primary/10 border border-primary/20 hover:bg-primary/20 px-2 py-1 rounded transition-colors text-primary">
                            Review
                          </button>
                          <button onClick={() => showToast(`Fetching logs...`)} className="text-[10px] font-medium bg-bgPanel border border-borderColor hover:bg-bgPanelLight px-2 py-1 rounded transition-colors text-textSecondary hover:text-textPrimary">
                            View Logs
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-borderColor bg-bgPanelLight/30 text-center">
                <button 
                  onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center justify-center w-full"
                >
                  View all alerts <ChevronRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Toast for Alerts actions */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[60] bg-bgPanel border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-textPrimary px-4 py-2.5 rounded-lg flex items-center text-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-primary mr-2" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
