"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Archive, CheckCircle2, Database, Menu, RefreshCw, WifiOff } from "lucide-react";
import {
  GrantPilotApi,
  asNumber,
  asRecord,
  formatRelativeTime,
  getOfflineMode,
  getSavedProjects,
  getStringField,
  type RefreshStatus
} from "../lib/grantpilotApi";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = memo(function Header({ onMenuClick }: HeaderProps) {
  const [offlineMode, setOfflineModeState] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);

  useEffect(() => {
    const refreshLocalState = () => {
      setOfflineModeState(getOfflineMode());
      setSavedCount(getSavedProjects().length);
    };

    refreshLocalState();
    window.addEventListener("storage", refreshLocalState);
    const interval = window.setInterval(refreshLocalState, 1500);

    return () => {
      window.removeEventListener("storage", refreshLocalState);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRefreshStatus = async () => {
      try {
        const output = await GrantPilotApi.refreshStatus();
        if (!cancelled) setRefreshStatus(output);
      } catch {
        if (!cancelled) setRefreshStatus(null);
      }
    };

    void loadRefreshStatus();
    const interval = window.setInterval(loadRefreshStatus, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const sourceHealth = asRecord(refreshStatus?.source_health);
  const totalGrants = asNumber(refreshStatus?.normalized_grant_count, 0);
  const lastRefreshed = getStringField(refreshStatus, "last_refreshed");
  const healthStatus = getStringField(refreshStatus, "status", refreshStatus?.ok ? "ready" : "checking");

  return (
    <header className="shrink-0 px-4 pt-4 md:px-7 md:pt-5 lg:px-8 safe-top">
      <div className="rounded-2xl border border-borderColor bg-bgPanel/75 backdrop-blur-xl px-3 py-3 shadow-sm md:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-borderColor bg-bgPanelLight text-textPrimary shadow-sm transition hover:bg-primary/10 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex min-w-0 items-center gap-3 lg:hidden" aria-label="GrantPilot home">
              <img src="/logo-mark.svg" alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white p-1.5 shadow-sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-textPrimary">GrantPilot</div>
                <div className="truncate text-xs text-textSecondary">Grant readiness workspace</div>
              </div>
            </Link>

            <div className="hidden min-w-0 lg:block">
              <div className="flex items-center gap-2 text-sm font-black text-textPrimary">
                GrantPilot
                <span className="hidden h-2 w-2 rounded-full bg-secondary shadow-[0_0_14px_rgba(16,185,129,0.85)] sm:inline-flex" />
              </div>
              <div className="mt-0.5 truncate text-xs text-textSecondary">
                {totalGrants > 0
                  ? `${totalGrants.toLocaleString()} public grant records • source cache refreshed ${formatRelativeTime(lastRefreshed)}`
                  : "Guided workflow, saved project, and exportable packet are ready."}
              </div>
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 text-xs font-bold lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
            <StatusPill
              href="/explorer"
              icon={Database}
              label={totalGrants > 0 ? `${totalGrants.toLocaleString()} grants` : "Grant DB"}
              tone="neutral"
            />
            <StatusPill
              href="/explorer"
              icon={refreshStatus?.ok === false ? RefreshCw : CheckCircle2}
              label={prettifyStatus(healthStatus, Object.keys(sourceHealth).length > 0)}
              tone={refreshStatus?.ok === false ? "warning" : "success"}
            />
            <StatusPill href="/projects" icon={Archive} label={`${savedCount} saved`} tone="neutral" />
            {offlineMode && <StatusPill href="/intake" icon={WifiOff} label="Offline" tone="secondary" />}
          </div>

          <div className="truncate text-xs text-textSecondary lg:hidden">
            {totalGrants > 0
              ? `${totalGrants.toLocaleString()} public grant records • refreshed ${formatRelativeTime(lastRefreshed)}`
              : "Guided workflow, saved project, and exportable packet are ready."}
          </div>
        </div>
      </div>
    </header>
  );
});

function StatusPill({
  href,
  icon: Icon,
  label,
  tone
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone: "neutral" | "primary" | "secondary" | "success" | "warning";
}) {
  const classes = {
    neutral: "bg-bgPanelLight text-textSecondary hover:text-textPrimary border-transparent",
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    success: "bg-secondary/10 text-secondary border-secondary/20",
    warning: "bg-amber-400/10 text-amber-500 border-amber-400/20"
  }[tone];

  return (
    <Link href={href} className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 ${classes}`}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

function prettifyStatus(status: string, hasSourceHealth: boolean) {
  if (status === "portfolio_demo" || status === "guided_preview") return "Sources ready";
  if (status === "cached") return "Cached sources";
  if (!hasSourceHealth && status === "checking") return "Checking sources";
  if (status === "ready") return "Sources ready";
  return status
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default Header;
