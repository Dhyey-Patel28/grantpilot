"use client";
import { useState, useMemo, useCallback, memo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { TrendingUp, Award, DollarSign, Activity, Download, Filter, Calendar, CheckCircle2, ArrowUpRight } from 'lucide-react';

// ── Static data sets per period ──
const chartDataByPeriod: Record<string, { month: string; applied: number; won: number }[]> = {
  '1m': [
    { month: 'Week 1', applied: 2, won: 0 }, { month: 'Week 2', applied: 3, won: 1 },
    { month: 'Week 3', applied: 1, won: 1 }, { month: 'Week 4', applied: 4, won: 2 },
  ],
  '6m': [
    { month: 'Jan', applied: 4, won: 1 }, { month: 'Feb', applied: 3, won: 2 },
    { month: 'Mar', applied: 6, won: 2 }, { month: 'Apr', applied: 8, won: 4 },
    { month: 'May', applied: 5, won: 3 }, { month: 'Jun', applied: 7, won: 5 },
  ],
  '1y': [
    { month: 'Jan', applied: 4, won: 1 }, { month: 'Feb', applied: 3, won: 2 },
    { month: 'Mar', applied: 6, won: 2 }, { month: 'Apr', applied: 8, won: 4 },
    { month: 'May', applied: 5, won: 3 }, { month: 'Jun', applied: 7, won: 5 },
    { month: 'Jul', applied: 9, won: 6 }, { month: 'Aug', applied: 6, won: 4 },
    { month: 'Sep', applied: 10, won: 5 }, { month: 'Oct', applied: 7, won: 4 },
    { month: 'Nov', applied: 8, won: 6 }, { month: 'Dec', applied: 11, won: 7 },
  ],
  'all': [
    { month: '2023', applied: 18, won: 6 }, { month: '2024', applied: 34, won: 14 },
    { month: '2025', applied: 52, won: 22 }, { month: '2026', applied: 87, won: 44 },
  ],
};

const kpisByPeriod: Record<string, { label: string; value: string; trend: string; trendUp: boolean }[]> = {
  '1m':  [{ label: 'Win Rate', value: '35%', trend: '+2.1%', trendUp: true }, { label: 'Total Awarded', value: '$1.2M', trend: '+$340K', trendUp: true }, { label: 'Avg ROI', value: '11.2x', trend: '+0.8x', trendUp: true }, { label: 'Active Pipeline', value: '$3.4M', trend: '4 Apps', trendUp: true }],
  '6m':  [{ label: 'Win Rate', value: '39%', trend: '+4.1%', trendUp: true }, { label: 'Total Awarded', value: '$5.6M', trend: '+$2.1M', trendUp: true }, { label: 'Avg ROI', value: '13.1x', trend: '+1.6x', trendUp: true }, { label: 'Active Pipeline', value: '$8.9M', trend: '9 Apps', trendUp: true }],
  '1y':  [{ label: 'Win Rate', value: '42%', trend: '+5.2%', trendUp: true }, { label: 'Total Awarded', value: '$8.4M', trend: '+$1.2M', trendUp: true }, { label: 'Avg ROI', value: '14.5x', trend: '+2.1x', trendUp: true }, { label: 'Active Pipeline', value: '$12.1M', trend: '12 Apps', trendUp: true }],
  'all': [{ label: 'Win Rate', value: '45%', trend: '+8.3%', trendUp: true }, { label: 'Total Awarded', value: '$14.2M', trend: '+$3.8M', trendUp: true }, { label: 'Avg ROI', value: '15.8x', trend: '+3.2x', trendUp: true }, { label: 'Active Pipeline', value: '$18.5M', trend: '21 Apps', trendUp: true }],
};

const categoryData = [
  { name: 'Infrastructure', value: 45 }, { name: 'Energy', value: 25 },
  { name: 'Research', value: 15 }, { name: 'Education', value: 10 }, { name: 'Healthcare', value: 5 },
];

const deadlineData = [
  { name: 'On Time', value: 18, fill: '#10B981' }, { name: 'Close', value: 8, fill: '#F59E0B' },
  { name: 'Missed', value: 3, fill: '#EF4444' },
];

const sourceData = [
  { source: 'Grants.gov', grants: 42 }, { source: 'MI Funding Hub', grants: 28 },
  { source: 'SAM.gov', grants: 15 }, { source: 'Direct Agency', grants: 9 }, { source: 'Other', grants: 6 },
];

const funnelData = [
  { name: 'Identified', value: 87, fill: '#3B82F6' }, { name: 'Eligible', value: 52, fill: '#8B5CF6' },
  { name: 'Applied', value: 34, fill: '#F59E0B' }, { name: 'Awarded', value: 14, fill: '#10B981' },
];

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
const KPI_ICONS = [Award, DollarSign, TrendingUp, Activity];
const KPI_COLORS = ['text-secondary', 'text-primary', 'text-secondary', 'text-primary'];

const tooltipStyle = { backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(55, 65, 81, 0.6)', borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '10px 14px' };
const tooltipItemStyle = { color: '#f1f5f9', fontSize: '13px' };
const tooltipLabelStyle = { color: '#94a3b8', fontSize: '11px', marginBottom: '4px' };

const periodLabels: Record<string, string> = { '1m': 'Last 30 Days', '6m': 'Last 6 Months', '1y': 'Last 12 Months', 'all': 'All Time' };

export const Analytics = memo(function Analytics() {
  const [period, setPeriod] = useState('1y');
  const [isExporting, setIsExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const chartData = useMemo(() => chartDataByPeriod[period] || chartDataByPeriod['1y'], [period]);
  const kpis = useMemo(() => kpisByPeriod[period] || kpisByPeriod['1y'], [period]);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    setTimeout(() => {
      const rows = ['Period,Applied,Won', ...chartData.map(d => `${d.month},${d.applied},${d.won}`)];
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `analytics-report-${period}.csv`; a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setToastMsg('Preview report exported successfully!');
      setTimeout(() => setToastMsg(null), 3000);
    }, 1200);
  }, [chartData, period]);

  const handlePeriodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value), []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl flex items-center text-sm font-medium animate-fade-in theme-toast">
          <CheckCircle2 className="w-4 h-4 text-primary mr-2" />{toastMsg}
        </div>
      )}

      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Pipeline analytics preview</h1>
          <p className="text-textSecondary mt-1.5 text-sm">Preview the kinds of pipeline and readiness metrics GrantPilot can surface as teams save projects and prepare packets.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select value={period} onChange={handlePeriodChange}
            className="bg-bgPanel border border-borderColor text-textPrimary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer hover:border-white/20">
            <option value="1m">Last 30 Days</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={handleExport} disabled={isExporting}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2 hover:shadow-primary/30">
            {isExporting ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Download className="w-4 h-4" />}
            Export Report
          </button>
        </div>
      </div>

      {/* ── 2. KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = KPI_ICONS[idx];
          return (
            <div key={idx} className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 theme-card">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl border ${KPI_COLORS[idx]} ${idx % 2 === 0 ? 'bg-secondary/8 border-secondary/15' : 'bg-primary/8 border-primary/15'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary/10 text-secondary">
                  <ArrowUpRight className="w-3 h-3" />{kpi.trend}
                </span>
              </div>
              <p className="text-xs font-medium text-textSecondary uppercase tracking-wider">{kpi.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── 3. Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart */}
        <div className="rounded-2xl p-6 theme-card">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-base font-semibold text-textPrimary">Application Success Trend</h2>
              <p className="text-xs text-textSecondary mt-0.5">{periodLabels[period]}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs text-textSecondary">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Applied</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary" />Won</span>
              </div>
              <button className="p-2 rounded-lg bg-bgPanelLight/30 hover:bg-bgPanelLight/50 text-textSecondary hover:text-textPrimary transition-colors border border-transparent hover:border-borderColor">
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="h-[320px] w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="gradApplied" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--chart-text)" axisLine={false} tickLine={false} fontSize={12} dy={8} />
                <YAxis stroke="var(--chart-text)" axisLine={false} tickLine={false} fontSize={12} dx={-4} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={{ stroke: 'rgba(148,163,184,0.15)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="applied" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#gradApplied)" name="Applied" isAnimationActive={false} />
                <Area type="monotone" dataKey="won" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#gradWon)" name="Won" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-2xl p-6 theme-card">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-textPrimary">Funding by Category</h2>
            <p className="text-xs text-textSecondary mt-0.5">Distribution of awarded grants</p>
          </div>
          <div className="flex items-center h-[320px]">
            <div className="w-[55%] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive={false}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} formatter={(value: unknown) => `${Number(value ?? 0)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-[45%] pl-4 space-y-3.5">
              {categoryData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-sm text-textSecondary group-hover:text-textPrimary transition-colors">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-textPrimary tabular-nums">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Lower Analytics Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Deadline Performance */}
        <div className="rounded-2xl p-6 theme-card">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/15"><Calendar className="w-4 h-4 text-amber-400" /></div>
            <div>
              <h3 className="text-sm font-semibold text-textPrimary">Deadline Performance</h3>
              <p className="text-[11px] text-textSecondary">Submission timing accuracy</p>
            </div>
          </div>
          <div className="space-y-3">
            {deadlineData.map((d, i) => {
              const total = deadlineData.reduce((s, x) => s + x.value, 0);
              const pct = Math.round((d.value / total) * 100);
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-textSecondary">{d.name}</span>
                    <span className="text-xs font-semibold text-textPrimary tabular-nums">{d.value} <span className="text-textSecondary font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-bgPanelLight/30 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: d.fill }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 flex items-center justify-between text-xs border-t border-borderColor">
            <span className="text-textSecondary">On-time rate</span>
            <span className="font-semibold text-secondary">62%</span>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="rounded-2xl p-6 theme-card">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/15"><TrendingUp className="w-4 h-4 text-primary" /></div>
            <div>
              <h3 className="text-sm font-semibold text-textPrimary">Grant Source Breakdown</h3>
              <p className="text-[11px] text-textSecondary">Where your grants come from</p>
            </div>
          </div>
          <div className="h-[200px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" stroke="var(--chart-text)" axisLine={false} tickLine={false} fontSize={11} />
                <YAxis type="category" dataKey="source" stroke="var(--chart-text)" axisLine={false} tickLine={false} fontSize={11} width={90} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                <Bar dataKey="grants" fill="#3B82F6" radius={[0, 6, 6, 0]} barSize={14} isAnimationActive={false} name="Grants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application Funnel */}
        <div className="rounded-2xl p-6 theme-card">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/15"><Activity className="w-4 h-4 text-purple-400" /></div>
            <div>
              <h3 className="text-sm font-semibold text-textPrimary">Application Status Funnel</h3>
              <p className="text-[11px] text-textSecondary">Pipeline conversion stages</p>
            </div>
          </div>
          <div className="space-y-3">
            {funnelData.map((stage, i) => {
              const maxVal = funnelData[0].value;
              const pct = Math.round((stage.value / maxVal) * 100);
              return (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.fill }} />
                      <span className="text-xs font-medium text-textSecondary group-hover:text-textPrimary transition-colors">{stage.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-textPrimary tabular-nums">{stage.value}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-bgPanelLight/30 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stage.fill, opacity: 0.85 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 flex items-center justify-between text-xs border-t border-borderColor">
            <span className="text-textSecondary">Conversion rate</span>
            <span className="font-semibold text-secondary">16.1%</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Analytics;
