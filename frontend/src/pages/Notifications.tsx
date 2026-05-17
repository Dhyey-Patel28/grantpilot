"use client";
import { useState, useMemo, useCallback, memo } from 'react';
import { Bell, AlertTriangle, FileWarning, Calendar, FileCheck, CheckCircle2, Trash2, Eye, Filter, Clock, ShieldCheck, X, ClipboardCheck } from 'lucide-react';

type Severity = 'High' | 'Medium' | 'Low';
type Status = 'unread' | 'read' | 'resolved';
type FilterKey = 'all' | 'High' | 'Medium' | 'Low' | 'unread' | 'resolved';

interface Alert {
  id: number;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  project: string;
  createdAt: string;
  status: Status;
  icon: typeof Bell;
}

const defaultAlerts: Alert[] = [
  { id: 1, title: '8 grants closing within 30 days', description: 'Requires immediate review before deadlines pass. Multiple high-fit opportunities at risk.', severity: 'High', category: 'Deadline', project: 'Clare County Infrastructure', createdAt: '2 hours ago', status: 'unread', icon: Calendar },
  { id: 2, title: '12 water grants need verification', description: 'Eligibility check pending for water infrastructure grants from EPA and USDA sources.', severity: 'Medium', category: 'Eligibility', project: 'Water Rehabilitation', createdAt: '5 hours ago', status: 'unread', icon: FileCheck },
  { id: 3, title: '3 high-fit grants missing costs', description: 'Cost estimate required to complete application packets. Engineering review needed.', severity: 'Medium', category: 'Requirements', project: 'Bridge Repair Initiative', createdAt: '1 day ago', status: 'unread', icon: FileWarning },
  { id: 4, title: 'Cache refresh completed', description: 'Grant database synchronized. 12 new grants added from Grants.gov and MI Funding Hub.', severity: 'Low', category: 'System', project: 'All Projects', createdAt: '2 hours ago', status: 'unread', icon: CheckCircle2 },
  { id: 5, title: '2 packets sent for human review', description: 'Readiness packets for EPA CWSRF and USDA ReConnect have been submitted for council review.', severity: 'Medium', category: 'Review', project: 'Clare County Infrastructure', createdAt: '3 hours ago', status: 'unread', icon: ClipboardCheck },
];

function loadAlerts(): Alert[] {
  if (typeof window === 'undefined') return defaultAlerts;
  try {
    const saved = localStorage.getItem('grantpilot_notifications_full');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((a: any) => {
        const match = defaultAlerts.find(d => d.id === a.id);
        return { ...a, icon: match?.icon || Bell };
      });
    }
  } catch {}
  return defaultAlerts;
}

function persistAlerts(alerts: Alert[]) {
  const serializable = alerts.map(({ icon, ...rest }) => rest);
  localStorage.setItem('grantpilot_notifications_full', JSON.stringify(serializable));
  // Sync the header bell badge count
  const headerAlerts = alerts.filter(a => a.status === 'unread').map(a => {
    const match = defaultAlerts.find(d => d.id === a.id);
    return match ? { id: a.id, title: a.title, message: a.description.slice(0, 40), severity: a.severity } : null;
  }).filter(Boolean);
  localStorage.setItem('grantpilot_header_alerts', JSON.stringify(headerAlerts));
}

const severityConfig: Record<Severity, { color: string; bg: string; border: string; dot: string }> = {
  High:   { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    dot: 'bg-red-400' },
  Medium: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  dot: 'bg-amber-400' },
  Low:    { color: 'text-secondary',  bg: 'bg-secondary/10',  border: 'border-secondary/20',  dot: 'bg-secondary' },
};

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'High', label: 'High' }, { key: 'Medium', label: 'Medium' },
  { key: 'Low', label: 'Low' }, { key: 'unread', label: 'Unread' }, { key: 'resolved', label: 'Resolved' },
];

export const Notifications = memo(function Notifications() {
  const [alerts, setAlerts] = useState<Alert[]>(loadAlerts);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const updateAlerts = useCallback((updater: (prev: Alert[]) => Alert[]) => {
    setAlerts(prev => {
      const next = updater(prev);
      persistAlerts(next);
      return next;
    });
  }, []);

  const markRead = useCallback((id: number) => {
    updateAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'read' as Status } : a));
    showToast('Marked as read');
  }, [updateAlerts, showToast]);

  const markResolved = useCallback((id: number) => {
    updateAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as Status } : a));
    showToast('Marked as resolved');
  }, [updateAlerts, showToast]);

  const dismissAlert = useCallback((id: number) => {
    updateAlerts(prev => prev.filter(a => a.id !== id));
    showToast('Alert dismissed');
  }, [updateAlerts, showToast]);

  const markAllRead = useCallback(() => {
    updateAlerts(prev => prev.map(a => ({ ...a, status: 'read' as Status })));
    showToast('All alerts marked as read');
  }, [updateAlerts, showToast]);

  // KPI summaries
  const summary = useMemo(() => ({
    total: alerts.length,
    high: alerts.filter(a => a.severity === 'High').length,
    medium: alerts.filter(a => a.severity === 'Medium').length,
    low: alerts.filter(a => a.severity === 'Low').length,
    unread: alerts.filter(a => a.status === 'unread').length,
  }), [alerts]);

  // Filtered list
  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'High': case 'Medium': case 'Low': return alerts.filter(a => a.severity === activeFilter);
      case 'unread': return alerts.filter(a => a.status === 'unread');
      case 'resolved': return alerts.filter(a => a.status === 'resolved');
      default: return alerts;
    }
  }, [alerts, activeFilter]);

  const kpiCards = useMemo(() => [
    { label: 'Total Alerts', value: summary.total, icon: Bell, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/15' },
    { label: 'High Priority', value: summary.high, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/15' },
    { label: 'Medium Priority', value: summary.medium, icon: FileWarning, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15' },
    { label: 'Low Priority', value: summary.low, icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/15' },
    { label: 'Unread', value: summary.unread, icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/15' },
  ], [summary]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl flex items-center text-sm font-medium animate-fade-in theme-toast">
          <CheckCircle2 className="w-4 h-4 text-primary mr-2" />{toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Notifications & Priority Alerts</h1>
          <p className="text-textSecondary mt-1.5 text-sm">Review grant deadlines, missing requirements, cache updates, and human review items.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={markAllRead}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-borderColor bg-bgPanel hover:bg-bgPanelLight text-textPrimary transition-colors flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Mark All Read
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer theme-card"
            onClick={() => setActiveFilter(idx === 0 ? 'all' : idx === 1 ? 'High' : idx === 2 ? 'Medium' : idx === 3 ? 'Low' : 'unread')}>
            <div className={`p-2 rounded-lg ${kpi.bg} border ${kpi.border} ${kpi.color} w-fit mb-3`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-textSecondary uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-textPrimary mt-0.5">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl w-fit theme-card">
        {filterTabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeFilter === tab.key
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-textSecondary hover:text-textPrimary hover:bg-bgPanelLight/50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center theme-card">
            <div className="w-14 h-14 rounded-full bg-bgPanelLight/50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-secondary" />
            </div>
            <p className="text-base font-medium text-textPrimary">No alerts match this filter</p>
            <p className="text-sm text-textSecondary mt-1">Try a different filter or check back later.</p>
          </div>
        ) : (
          filtered.map(alert => {
            const sev = severityConfig[alert.severity];
            const isUnread = alert.status === 'unread';
            const isResolved = alert.status === 'resolved';
            return (
              <div key={alert.id}
                className={`rounded-xl p-5 flex items-start gap-4 group transition-all duration-200 theme-card-hover ${
                  isUnread ? 'bg-primary/[0.03] border border-primary/10' : 'border border-borderColor'
                }`}
              >
                {/* Unread dot */}
                <div className="pt-2 w-3 shrink-0 flex justify-center">
                  {isUnread && <div className={`w-2 h-2 rounded-full ${sev.dot} shadow-[0_0_6px_currentColor]`} />}
                </div>

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${sev.bg} ${sev.color} ${sev.border}`}>
                  <alert.icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className={`text-sm font-semibold leading-snug ${isResolved ? 'text-textSecondary line-through' : 'text-textPrimary'}`}>
                      {alert.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${sev.color} ${sev.bg} ${sev.border}`}>
                        {alert.severity}
                      </span>
                      {isResolved && (
                        <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border text-secondary bg-secondary/10 border-secondary/20">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-textSecondary leading-relaxed mb-2">{alert.description}</p>
                  <div className="flex items-center gap-4 text-[11px] text-textSecondary">
                    <span className="flex items-center gap-1"><Filter className="w-3 h-3" />{alert.category}</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" />{alert.project}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{alert.createdAt}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {isUnread && (
                    <button onClick={() => markRead(alert.id)} title="Mark as read"
                      className="p-2 rounded-lg text-textSecondary hover:text-primary hover:bg-primary/10 transition-all"><Eye className="w-4 h-4" /></button>
                  )}
                  {!isResolved && (
                    <button onClick={() => markResolved(alert.id)} title="Mark resolved"
                      className="p-2 rounded-lg text-textSecondary hover:text-secondary hover:bg-secondary/10 transition-all"><CheckCircle2 className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => dismissAlert(alert.id)} title="Dismiss"
                    className="p-2 rounded-lg text-textSecondary hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
