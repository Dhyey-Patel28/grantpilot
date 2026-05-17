import type { Metadata } from "next";
import "./globals.css";
import { Layout } from "../components/Layout";

export const metadata: Metadata = {
  title: "GrantPilot MI",
  description: "AI-powered grant discovery and matching",
};

// Inline script to restore theme before first paint (prevents flash)
const themeScript = `(function(){try{var s=localStorage.getItem('grantpilot_settings');if(s){var t=JSON.parse(s).theme;if(t){var d=t==='light'||(t==='system'&&window.matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(d?'light':'dark');return;}}document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bgApp text-textPrimary">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
