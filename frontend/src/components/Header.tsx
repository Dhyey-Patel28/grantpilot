"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Archive, CheckCircle2, Database, RefreshCw, WifiOff } from "lucide-react";
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

export const Header = memo(function Header() {
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
    <header className="shrink-0 px-5 md:px-7 lg:px-8 pt-5">
      <div className="rounded-2xl border border-borderColor bg-bgPanel/70 backdrop-blur-xl px-4 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 shadow-sm">
        <div className="min-w-0">
          <div className="text-sm font-black text-textPrimary flex items-center gap-2">
            GrantPilot workspace
            <span className="hidden sm:inline-flex h-2 w-2 rounded-full bg-secondary shadow-[0_0_14px_rgba(16,185,129,0.85)]" />
          </div>
          <div className="text-xs text-textSecondary mt-0.5 truncate">
            {totalGrants > 0
              ? `${totalGrants.toLocaleString()} normalized grants • refreshed ${formatRelativeTime(lastRefreshed)}`
              : "Saved projects and portfolio-safe fallbacks are available."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
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
    <Link href={href} className={`px-3 py-1.5 rounded-full border inline-flex items-center ${classes}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Link>
  );
}

function prettifyStatus(status: string, hasSourceHealth: boolean) {
  if (!hasSourceHealth && status === "checking") return "Checking sources";
  if (status === "ready") return "Sources ready";
  return status
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default Header;
