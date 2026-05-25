import type { Metadata } from "next";
import "./globals.css";
import { Layout } from "../components/Layout";

export const metadata: Metadata = {
  title: "GrantPilot",
  description: "Source-backed grant readiness workspace for public-sector teams",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"]
  },
  manifest: "/site.webmanifest"
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
