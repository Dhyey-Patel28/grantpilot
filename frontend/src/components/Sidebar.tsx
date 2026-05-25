"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  Bell,
  Bot,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { memo } from "react";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Project Intake", path: "/intake", icon: ClipboardList },
  { name: "Grant Explorer", path: "/explorer", icon: Search },
  { name: "Readiness Packet", path: "/packet", icon: ClipboardList },
  { name: "Translator", path: "/translator", icon: FileText },
  { name: "Agents", path: "/agents", icon: Bot },
  { name: "Saved Projects", path: "/projects", icon: Archive },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "Notifications", path: "/notifications", icon: Bell }
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`glass-panel fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[86vw] shrink-0 flex-col border-r border-borderColor transition-transform duration-200 ease-out lg:static lg:z-20 lg:w-64 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-borderColor px-4 md:px-5 lg:px-6">
          <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3" aria-label="GrantPilot home">
            <img src="/logo-mark.svg" alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white p-1.5 shadow-sm" />
            <span className="truncate text-xl font-bold tracking-tight text-textPrimary">GrantPilot</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-borderColor bg-bgPanelLight text-textSecondary transition hover:text-textPrimary lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-5 md:py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));

            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={onClose}
                className={`group relative flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive ? "text-textPrimary" : "text-textSecondary hover:bg-white/5 hover:text-textPrimary"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl border border-primary/20 bg-primary/10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`relative z-10 mr-3 h-5 w-5 ${isActive ? "text-primary" : "group-hover:text-textPrimary"}`} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-borderColor p-4">
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
              pathname === "/settings" ? "bg-white/10 text-textPrimary" : "text-textSecondary hover:bg-white/5 hover:text-textPrimary"
            }`}
          >
            <Settings className={`mr-3 h-5 w-5 ${pathname === "/settings" ? "text-primary" : ""}`} />
            Settings
          </Link>

          <div className="mt-4 rounded-xl border border-borderColor bg-bgPanel/50 p-3">
            <p className="truncate text-sm font-bold text-textPrimary">GrantPilot</p>
            <p className="mt-1 text-xs text-textSecondary">Public-sector grant readiness workspace.</p>
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;
