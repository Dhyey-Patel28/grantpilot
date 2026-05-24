"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Search, 
  FileText, 
  Settings,
  Sparkles,
  BarChart3,
  ClipboardList,
  Bell,
  Archive,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Project Intake', path: '/intake', icon: ClipboardList },
  { name: 'Grant Explorer', path: '/explorer', icon: Search },
  { name: 'Readiness Packet', path: '/packet', icon: ClipboardList },
  { name: 'Translator', path: '/translator', icon: FileText },
  { name: 'Agents', path: '/agents', icon: Bot },
  { name: 'Saved Projects', path: '/projects', icon: Archive },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Notifications', path: '/notifications', icon: Bell },
];

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 glass-panel border-r border-borderColor flex flex-col z-20 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-borderColor shrink-0">
        <Sparkles className="w-6 h-6 text-primary mr-2" />
        <span className="text-xl font-bold tracking-tight text-textPrimary">Grant<span className="text-primary">Pilot</span></span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.path || 
                           (item.path !== '/' && pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group ${
                isActive ? 'text-textPrimary' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'
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
          href="/settings"
          className={`flex items-center px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-colors ${
            pathname === '/settings' ? 'text-textPrimary bg-white/10' : 'text-textSecondary hover:text-textPrimary hover:bg-white/5'
          }`}
        >
          <Settings className={`w-5 h-5 mr-3 ${pathname === '/settings' ? 'text-primary' : ''}`} />
          Settings
        </Link>
        
        <div className="mt-4 rounded-xl border border-borderColor bg-bgPanel/50 p-3">
          <p className="text-sm font-bold text-textPrimary truncate">GrantPilot Local</p>
          <p className="text-xs text-textSecondary mt-1">Portfolio-safe sample data, saved projects, and exportable packets.</p>
        </div>
      </div>
    </div>
  );
});
