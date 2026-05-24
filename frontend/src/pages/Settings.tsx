"use client";
import { useState, useEffect, useCallback, memo } from 'react';
import { Save, Moon, Sun, Monitor, RefreshCw, CheckCircle2 } from 'lucide-react';

type Theme = 'dark' | 'light' | 'system';

const defaults = { theme: 'light' as Theme, orgName: 'Civic Works Team', industry: 'Local Government' };

const themeOptions: { id: Theme; icon: typeof Sun; label: string }[] = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'dark', icon: Moon, label: 'Dark' },
  { id: 'system', icon: Monitor, label: 'System' },
];

const industries = ['Non-Profit', 'Local Government', 'Education', 'Healthcare', 'Small Business', 'Tribal Organization', 'State Agency'];

function applyThemeClass(theme: Theme) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.remove('light', 'dark');
  root.classList.add(isDark ? 'dark' : 'light');
}

export const Settings = memo(function Settings() {
  const [theme, setTheme] = useState<Theme>(defaults.theme);
  const [orgName, setOrgName] = useState(defaults.orgName);
  const [industry, setIndustry] = useState(defaults.industry);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('grantpilot_settings');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.theme) { setTheme(p.theme); applyThemeClass(p.theme); }
        if (p.orgName) setOrgName(p.orgName);
        if (p.industry) setIndustry(p.industry);
      }
    } catch {
      // Ignore malformed saved settings.
    }
  }, []);

  // Listen for system theme changes when "system" is selected
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeClass('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyThemeClass(newTheme);
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem('grantpilot_settings', JSON.stringify({ theme, orgName, industry }));
    localStorage.setItem('grantpilot-theme', theme);
    showToast('Settings saved successfully');
  }, [theme, orgName, industry, showToast]);

  const handleReset = useCallback(() => {
    setTheme(defaults.theme);
    setOrgName(defaults.orgName);
    setIndustry(defaults.industry);
    applyThemeClass(defaults.theme);
    localStorage.removeItem('grantpilot_settings');
    localStorage.setItem('grantpilot-theme', defaults.theme);
    showToast('Settings restored to defaults');
  }, [showToast]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl flex items-center text-sm font-medium theme-toast">
          <CheckCircle2 className="w-4 h-4 text-primary mr-2" />{toastMsg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Settings</h1>
          <p className="text-textSecondary mt-1.5 text-sm">Manage your organization profile and preferences.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button onClick={handleReset}
            className="w-full sm:w-auto px-4 py-2.5 bg-bgPanel hover:bg-bgPanelLight text-textPrimary border border-borderColor rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reset Defaults
          </button>
          <button onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className="rounded-2xl p-6 bg-bgPanel border border-borderColor">
        <h2 className="text-lg font-semibold text-textPrimary mb-2">Appearance</h2>
        <p className="text-xs text-textSecondary mb-5">Choose your preferred color theme for the GrantPilot dashboard.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {themeOptions.map(t => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`flex flex-row sm:flex-col items-center sm:justify-center gap-3 sm:gap-2 p-4 rounded-xl border transition-all duration-200 ${
                theme === t.id
                  ? 'border-primary bg-primary/10 text-primary shadow-[0_0_16px_rgba(59,130,246,0.1)]'
                  : 'border-borderColor bg-bgPanelLight/50 text-textSecondary hover:border-primary/30 hover:text-textPrimary'
              }`}
            >
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shrink-0 ${
                theme === t.id ? 'bg-primary/15' : 'bg-bgPanel'
              }`}>
                <t.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Organization Profile ── */}
      <div className="rounded-2xl p-6 bg-bgPanel border border-borderColor">
        <h2 className="text-lg font-semibold text-textPrimary mb-2">Organization Profile</h2>
        <p className="text-xs text-textSecondary mb-5">This information helps GrantPilot match grants tailored to your organization type.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1.5">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Enter your organization name"
              className="w-full bg-bgPanelLight/50 border border-borderColor rounded-xl py-2.5 px-3.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1.5">Industry / Sector</label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full bg-bgPanelLight/50 border border-borderColor rounded-xl py-2.5 px-3.5 text-sm text-textPrimary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {industries.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Settings;
