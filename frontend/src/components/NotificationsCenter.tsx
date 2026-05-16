"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, FileWarning, Calendar, X, Trash2, FileCheck } from 'lucide-react';

const initialNotifications = [
  { id: 1, title: 'Grants Closing Soon', message: '8 grants are closing within 30 days', icon: Calendar, color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 2, title: 'Missing Documents', message: 'Cost estimates missing from 3 high-fit grants', icon: FileWarning, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { id: 3, title: 'Cache Refreshed', message: 'Fast refresh completed 2 hours ago', icon: AlertCircle, color: 'text-secondary', bg: 'bg-secondary/10' },
  { id: 4, title: 'Human Review Needed', message: 'Please review 12 water infrastructure grants for eligibility', icon: FileCheck, color: 'text-primary', bg: 'bg-primary/10' },
];

export function NotificationsCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const dismissNotification = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllRead = () => {
    setNotifications([]);
    setTimeout(() => setIsOpen(false), 300);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 glass-panel rounded-xl overflow-hidden border border-borderColor shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-borderColor bg-bgPanelLight/50">
              <h3 className="font-semibold text-textPrimary flex items-center">
                Notifications
                {notifications.length > 0 && (
                  <span className="ml-2 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">{notifications.length}</span>
                )}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-textSecondary hover:text-textPrimary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {notifications.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 text-center text-textSecondary text-sm">
                    No new notifications
                  </motion.div>
                ) : (
                  notifications.map(n => (
                    <motion.div 
                      key={n.id} 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex p-3 hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 rounded-lg transition-colors group mb-1 relative"
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.bg} ${n.color}`}>
                        <n.icon className="w-4 h-4" />
                      </div>
                      <div className="ml-3 pr-6">
                        <p className="text-sm font-medium text-textPrimary">{n.title}</p>
                        <p className="text-xs text-textSecondary mt-1">{n.message}</p>
                      </div>
                      <button 
                        onClick={(e) => dismissNotification(e, n.id)}
                        className="absolute right-3 top-3 p-1.5 opacity-0 group-hover:opacity-100 text-textSecondary hover:text-textPrimary hover:bg-black/10 dark:bg-white/10 rounded-md transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            {notifications.length > 0 && (
              <div className="p-3 border-t border-borderColor bg-bgPanelLight/30 text-center">
                <button onClick={markAllRead} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-textPrimary shadow-lg shadow-primary/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 relative"
      >
        <AlertCircle className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-secondary border-2 border-surface flex items-center justify-center text-[8px] font-bold">
              {notifications.length}
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
