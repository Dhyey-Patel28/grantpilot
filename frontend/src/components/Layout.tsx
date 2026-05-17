"use client";
import { ReactNode, memo } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotSidebar } from './CopilotSidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-bgApp text-textPrimary overflow-hidden relative transition-colors duration-200">
      {/* Simplified background glow — static, no animation, reduced blur */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[80px] mix-blend-screen"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-secondary/10 rounded-full blur-[60px] mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-navy/15 rounded-full blur-[80px] mix-blend-screen"></div>
      </div>

      <Sidebar />
      <div className="flex-1 flex flex-col z-10 relative overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
      <CopilotSidebar />
    </div>
  );
});
