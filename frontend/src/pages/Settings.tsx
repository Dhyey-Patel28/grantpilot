"use client";
import { useState, useEffect } from 'react';
import { Save, Moon, Sun, Monitor, RefreshCw } from 'lucide-react';

export function Settings() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [orgName, setOrgName] = useState('Acme Corp');
  const [industry, setIndustry] = useState('Local Government');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('grantpilot_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.orgName) setOrgName(parsed.orgName);
        if (parsed.industry) setIndustry(parsed.industry);
      } catch(e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('grantpilot_settings', JSON.stringify({ theme, orgName, industry }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handleReset = () => {
    setTheme('dark');
    setOrgName('Acme Corp');
    setIndustry('Local Government');
    localStorage.removeItem('grantpilot_settings');
    document.documentElement.classList.remove('light');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Settings</h1>
          <p className="text-textSecondary mt-1">Manage your organization profile and preferences.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleReset} className="px-4 py-2 bg-bgPanelLight hover:bg-bgPanelLight/80 text-textPrimary border border-borderColor rounded-lg text-sm font-medium transition-colors flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" /> Reset Defaults
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-primary hover:bg-primary/90 text-textPrimary shadow-lg shadow-primary/20 rounded-lg text-sm font-medium transition-colors flex items-center">
            <Save className="w-4 h-4 mr-2" /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-semibold text-textPrimary mb-6 border-b border-borderColor pb-4">Appearance</h2>
        <div className="flex gap-4">
          {[
            { id: 'light', icon: Sun, label: 'Light' },
            { id: 'dark', icon: Moon, label: 'Dark' },
            { id: 'system', icon: Monitor, label: 'System' }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border w-32 transition-all ${
                theme === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-borderColor bg-bgPanel/50 text-textSecondary hover:border-white/30 hover:text-textPrimary'
              }`}
            >
              <t.icon className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-semibold text-textPrimary mb-6 border-b border-borderColor pb-4">Organization Profile</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1">Organization Name</label>
            <input 
              type="text" 
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-bgPanel border border-borderColor rounded-lg py-2 px-3 text-textPrimary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1">Industry / Sector</label>
            <select 
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-bgPanel border border-borderColor rounded-lg py-2 px-3 text-textPrimary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option>Local Government</option>
              <option>Non-Profit</option>
              <option>Education</option>
              <option>Healthcare</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
