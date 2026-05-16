import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  FileText, 
  Bot,
  Settings,
  Sparkles,
  BarChart3,
  Files,
  Workflow,
  ClipboardList
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Grant Explorer', path: '/explorer', icon: Search },
  { name: 'Documents', path: '/documents', icon: Files },
  { name: 'Translator', path: '/translator', icon: FileText },
  { name: 'AI Assistant', path: '/assistant', icon: Bot },
  { name: 'Readiness Packet', path: '/packet', icon: ClipboardList },
  { name: 'Agents Workflow', path: '/agents', icon: Workflow },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 glass-panel border-r border-borderColor flex flex-col z-20 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-borderColor shrink-0">
        <Sparkles className="w-6 h-6 text-primary mr-2" />
        <span className="text-xl font-bold tracking-tight text-textPrimary">Grant<span className="text-primary">Pilot</span></span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group ${
                isActive ? 'text-textPrimary' : 'text-textSecondary hover:text-textPrimary hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active" 
                  className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20" 
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={`w-5 h-5 mr-3 relative z-10 ${isActive ? 'text-primary' : 'group-hover:text-textPrimary'}`} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-borderColor shrink-0">
        <Link 
          to="/settings"
          className={`flex items-center px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/settings' ? 'text-textPrimary bg-black/10 dark:bg-white/10' : 'text-textSecondary hover:text-textPrimary hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5'
          }`}
        >
          <Settings className={`w-5 h-5 mr-3 ${location.pathname === '/settings' ? 'text-primary' : ''}`} />
          Settings
        </Link>
        
        <div className="mt-4 flex items-center px-3">
          <img 
            src="https://ui-avatars.com/api/?name=Acme+Corp&background=3B82F6&color=fff" 
            alt="User" 
            className="w-8 h-8 rounded-full border border-borderColor"
          />
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-medium text-textPrimary truncate">Acme Corp</p>
            <p className="text-xs text-textSecondary truncate">Pro Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
