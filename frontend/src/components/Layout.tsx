"use client";

import { memo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div data-grantpilot-shell className="relative flex h-dvh min-h-dvh overflow-hidden bg-bgApp text-textPrimary transition-colors duration-200">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[80px] mix-blend-screen md:h-[38%] md:w-[38%]" />
        <div className="absolute right-[-12rem] top-[18%] h-[22rem] w-[22rem] rounded-full bg-secondary/10 blur-[70px] mix-blend-screen md:right-[-8%] md:h-[28%] md:w-[28%]" />
        <div className="absolute bottom-[-18%] left-[18%] h-[26rem] w-[26rem] rounded-full bg-navy/15 blur-[80px] mix-blend-screen md:h-[38%] md:w-[38%]" />
      </div>

      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 pb-8 md:p-7 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
});

export default Layout;
