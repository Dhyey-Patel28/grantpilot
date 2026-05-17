"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-bgApp text-textPrimary overflow-hidden relative transition-colors duration-200">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-12%] left-[-8%] w-[38%] h-[38%] bg-primary/10 rounded-full blur-[80px] mix-blend-screen" />
        <div className="absolute top-[18%] right-[-8%] w-[28%] h-[28%] bg-secondary/10 rounded-full blur-[70px] mix-blend-screen" />
        <div className="absolute bottom-[-18%] left-[18%] w-[38%] h-[38%] bg-navy/15 rounded-full blur-[80px] mix-blend-screen" />
      </div>

      <Sidebar />

      <div className="flex-1 flex flex-col z-10 relative overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-5 md:p-7 lg:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
});

export default Layout;
