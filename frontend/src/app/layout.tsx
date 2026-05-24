import type { Metadata } from "next";
import "./globals.css";
import { Layout } from "../components/Layout";

export const metadata: Metadata = {
  title: "GrantPilot MI",
  description: "AI-powered grant discovery and matching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="bg-bgApp text-textPrimary">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
