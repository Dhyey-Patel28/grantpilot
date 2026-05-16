import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, Award, DollarSign, Activity, Download, Filter } from 'lucide-react';

const categoryData = [
  { name: 'Infrastructure', value: 45 },
  { name: 'Energy', value: 25 },
  { name: 'Research', value: 15 },
  { name: 'Education', value: 10 },
  { name: 'Healthcare', value: 5 },
];

const getSuccessData = (period: string) => {
  if (period === '1y') return [
    { month: 'Jan', applied: 4, won: 1 }, { month: 'Feb', applied: 3, won: 2 },
    { month: 'Mar', applied: 6, won: 2 }, { month: 'Apr', applied: 8, won: 4 },
    { month: 'May', applied: 5, won: 3 }, { month: 'Jun', applied: 7, won: 5 },
  ];
  return [
    { month: 'Week 1', applied: 2, won: 0 }, { month: 'Week 2', applied: 3, won: 1 },
    { month: 'Week 3', applied: 1, won: 1 }, { month: 'Week 4', applied: 4, won: 2 },
  ];
};

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export function Analytics() {
  const [period, setPeriod] = useState('1y');
  const [isExporting, setIsExporting] = useState(false);

  const data = getSuccessData(period);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('Mock PDF Report Downloaded!');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Analytics & ROI</h1>
          <p className="text-textSecondary mt-2">Track your grant application pipeline and success metrics.</p>
        </div>
        <div className="flex space-x-3">
          <select 
            value={period} onChange={(e) => setPeriod(e.target.value)}
            className="bg-bgPanel border border-borderColor text-textPrimary text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="1m">Last 30 Days</option>
            <option value="1y">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={handleExport} disabled={isExporting} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-textPrimary px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center">
            {isExporting ? <div className="animate-spin w-4 h-4 border-2 border-borderColor border-t-white rounded-full mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Win Rate', value: period === '1y' ? '42%' : '35%', icon: Award, trend: '+5.2%', color: 'text-secondary' },
          { label: 'Total Awarded', value: period === '1y' ? '$8.4M' : '$1.2M', icon: DollarSign, trend: '+$1.2M', color: 'text-primary' },
          { label: 'Avg ROI', value: '14.5x', icon: TrendingUp, trend: '+2.1x', color: 'text-secondary' },
          { label: 'Active Pipeline', value: '$12.1M', icon: Activity, trend: '12 Apps', color: 'text-primary' }
        ].map((kpi, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-bgPanel/80 border border-borderColor ${kpi.color}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-secondary/10 text-secondary">
                {kpi.trend}
              </span>
            </div>
            <p className="text-sm font-medium text-textSecondary">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-textPrimary">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-textPrimary">Application Success Trend</h2>
            <button className="p-1.5 hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 rounded-md text-textSecondary hover:text-textPrimary transition-colors"><Filter className="w-4 h-4" /></button>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorApplied" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" stroke="#9CA3AF" axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }} itemStyle={{ color: '#fff' }} />
                <Area type="monotone" dataKey="applied" stroke="#3B82F6" fillOpacity={1} fill="url(#colorApplied)" name="Applied" />
                <Area type="monotone" dataKey="won" stroke="#10B981" fillOpacity={1} fill="url(#colorWon)" name="Won" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h2 className="text-lg font-semibold text-textPrimary mb-6">Funding by Category</h2>
          <div className="flex-1 flex items-center justify-center relative">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-3">
              {categoryData.map((entry, index) => (
                <div key={index} className="flex items-center text-sm">
                  <div className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-textPrimary w-24">{entry.name}</span>
                  <span className="text-textPrimary font-medium">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
