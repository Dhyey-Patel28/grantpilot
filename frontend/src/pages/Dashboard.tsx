"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Gauge,
  Loader2,
  MapPin,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  WifiOff
} from "lucide-react";
import type { AnyRecord, RefreshStatus } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  asNumber,
  asRecord,
  asString,
  formatRelativeTime,
  formatTimestamp,
  getStringField,
  saveJson,
  STORAGE_KEYS
} from "../lib/grantpilotApi";

const fallbackScenarios: AnyRecord[] = [
  {
    id: "stormwater-resilience",
    title: "Stormwater resilience",
    strength: "Portfolio sample",
    expected_story:
      "Shows a realistic local government project with infrastructure, resilience, and document gaps.",
    project_description:
      "A small Michigan township needs funding to reduce flooding along a residential road corridor. The work includes stormwater drainage improvements, culvert replacement, ditch grading, and green infrastructure where feasible. The township needs support for design, engineering, and construction. Repeated heavy rain events have caused road closures and safety concerns. Estimated cost is $750,000 and the township can provide a modest local match."
  },
  {
    id: "bridge-repair",
    title: "County bridge repair",
    strength: "Transportation fit",
    expected_story:
      "Routes a county bridge project to transportation grants and surfaces match/document gaps.",
    project_description:
      "Clare County has a broken bridge causing flooding and commute delays. The county wants funding to repair the bridge. Estimated cost is $100,000 and no match is available."
  },
  {
    id: "private-retreat",
    title: "Private retreat mismatch",
    strength: "Guardrail test",
    expected_story:
      "Shows how GrantPilot avoids overclaiming when a project is a weak fit for infrastructure grants.",
    project_description:
      "The Bayview Tribal Arts Collective in Michigan is seeking $4.5 million to renovate a luxury lakefront cultural retreat center featuring artist cabins, meditation gardens, private event spaces, and wellness facilities. The organization wants to apply for federal flood mitigation and transportation infrastructure grants because heavy rainfall occasionally affects nearby walking trails. The project primarily supports tourism, retreats, and private events. Applicant type: nonprofit organization."
  }
];

const outcomeCards = [
  {
    icon: Search,
    title: "Ranked opportunities",
    body: "GrantPilot searches the normalized grant database and returns a short list worth reviewing."
  },
  {
    icon: ShieldCheck,
    title: "Trust-first review",
    body: "Every match is labeled with source, status, freshness, and human verification reminders."
  },
  {
    icon: ClipboardCheck,
    title: "Readiness packet",
    body: "The final output turns discovery into documents, gaps, risk notes, and next actions."
  }
];

const workflowSteps = [
  "Project intake",
  "Source-backed search",
  "Fit scoring",
  "Requirements translation",
  "Readiness packet"
];

export const Dashboard = memo(function Dashboard() {
  const [health, setHealth] = useState<AnyRecord | null>(null);
  const [stats, setStats] = useState<AnyRecord | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [scenarios, setScenarios] = useState<AnyRecord[]>(fallbackScenarios);
  const [recentTraces, setRecentTraces] = useState<AnyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      const [healthOutput, statsOutput, refreshOutput, scenariosOutput, tracesOutput] =
        await Promise.all([
          GrantPilotApi.health().catch(() => null),
          GrantPilotApi.stats().catch(() => null),
          GrantPilotApi.refreshStatus().catch(() => null),
          GrantPilotApi.demoScenarios().catch(() => null),
          GrantPilotApi.traces().catch(() => null)
        ]);

      setHealth(asRecord(healthOutput));
      setStats(asRecord(statsOutput));
      setRefreshStatus(refreshOutput);

      const apiScenarios = asArray<AnyRecord>(asRecord(scenariosOutput).scenarios);
      setScenarios(apiScenarios.length ? apiScenarios : fallbackScenarios);
      setRecentTraces(asArray<AnyRecord>(asRecord(tracesOutput).traces).slice(0, 4));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const selectScenario = useCallback((scenario: AnyRecord) => {
    saveJson(STORAGE_KEYS.demoScenario, scenario);
  }, []);

  const statusCounts = asRecord(stats?.by_status);
  const sourceHealth = asRecord(refreshStatus?.source_health);
  const sourceEntries = useMemo(() => Object.entries(sourceHealth).slice(0, 4), [sourceHealth]);

  const totalGrants = asNumber(refreshStatus?.normalized_grant_count, asNumber(stats?.total_grants, 0));
  const openCount = asNumber(statusCounts.open, 0);
  const closingSoonCount = asNumber(statusCounts.closing_soon, 0);
  const backendMode = asString(health?.mode, "live");
  const isBackendOnline = health?.ok === true;
  const lastRefreshed = refreshStatus?.last_refreshed;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-bgPanel/80 shadow-2xl shadow-black/10">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.18),transparent_32rem),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.14),transparent_28rem)]" />
        <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8 p-7 lg:p-10">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Production-ready grant intelligence workspace
            </div>

            <h1 className="text-4xl lg:text-6xl font-black text-textPrimary tracking-tight leading-[0.98] max-w-5xl">
              Turn a local project into a source-backed grant plan.
            </h1>

            <p className="text-textSecondary mt-5 text-base lg:text-lg leading-relaxed max-w-3xl">
              GrantPilot combines a refreshed public grant database, AI-assisted fit review, plain-English requirements, and packet exports so a team can move from idea to next action without a spreadsheet maze.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/intake"
                className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold inline-flex items-center justify-center shadow-lg shadow-primary/20"
              >
                Run project intake <PlayCircle className="w-5 h-5 ml-2" />
              </Link>

              <Link
                href="/explorer"
                className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-bold inline-flex items-center justify-center"
              >
                Review grant database <Search className="w-5 h-5 ml-2" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
              <HeroMetric label="Grant records" value={totalGrants ? totalGrants.toLocaleString() : "—"} icon={Database} />
              <HeroMetric label="Open" value={openCount ? openCount.toLocaleString() : "—"} icon={CheckCircle2} />
              <HeroMetric label="Closing soon" value={closingSoonCount ? closingSoonCount.toLocaleString() : "—"} icon={Gauge} />
              <HeroMetric label="Backend" value={isBackendOnline ? backendMode : "check"} icon={Bot} />
            </div>
          </div>

          <div className="rounded-2xl border border-borderColor bg-bgPanel/75 p-5 lg:p-6 self-stretch flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <div className="text-sm font-black text-secondary">Source freshness</div>
                  <div className="text-xs text-textSecondary mt-1">
                    Last refresh: {formatTimestamp(lastRefreshed)}
                  </div>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-secondary" />
                </div>
              </div>

              <div className="space-y-3">
                {sourceEntries.length ? (
                  sourceEntries.map(([source, value]) => (
                    <SourceHealthRow key={source} source={source} value={asRecord(value)} />
                  ))
                ) : (
                  <div className="rounded-xl border border-borderColor bg-bgPanel/50 p-4 text-sm text-textSecondary">
                    Refresh status will appear after the backend status endpoint is available.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="text-sm font-black text-primary mb-2">Recommended workflow</div>
              <p className="text-sm text-textSecondary leading-relaxed">
                Start from a saved project, review ranked matches, inspect one grant, translate requirements, then export the readiness packet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="glass-panel rounded-2xl p-8 flex items-center justify-center text-textSecondary">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading GrantPilot workspace status...
        </div>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 lg:p-7">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-textPrimary">The production workflow</h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Each step creates artifacts that can be inspected, restored, or exported.
                  </p>
                </div>
                <Link href="/packet" className="text-sm text-primary font-bold hover:underline">
                  View packet output
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {workflowSteps.map((step, index) => (
                  <div key={step} className="rounded-2xl border border-borderColor bg-bgPanel/55 p-4">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm mb-4">
                      {index + 1}
                    </div>
                    <h3 className="font-black text-textPrimary leading-snug">{step}</h3>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 lg:p-7">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-2xl font-black text-textPrimary flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Start from a strong scenario
                  </h2>
                  <p className="text-sm text-textSecondary mt-1">
                    These are tuned to show fit, trust, and risk handling clearly for reviewers.
                  </p>
                </div>

                <Link href="/intake" className="text-sm text-primary font-bold hover:underline">
                  Write custom project
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {scenarios.slice(0, 3).map((scenario, index) => (
                  <ScenarioCard
                    key={getStringField(scenario, "id", `scenario-${index}`)}
                    scenario={scenario}
                    fallbackId={`scenario-${index}`}
                    onSelect={selectScenario}
                  />
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 lg:p-7">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-2xl font-black text-textPrimary">Recent workflow traces</h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Use a saved workflow when you want predictable portfolio review.
                  </p>
                </div>

                <Link href="/intake" className="hidden sm:inline-flex text-sm text-primary font-bold hover:underline">
                  Run workflow
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {recentTraces.length ? (
                  recentTraces.map((trace, index) => {
                    const traceId = getStringField(trace, "trace_id", `trace-${index}`);
                    const status = getStringField(trace, "status", "unknown");

                    return (
                      <Link
                        key={traceId}
                        href="/intake"
                        className="block rounded-xl border border-borderColor bg-bgPanel/50 p-4 hover:border-primary/40 transition-colors"
                      >
                        <div className="text-sm font-bold text-textPrimary">Workflow run</div>
                        <div className="text-xs text-textSecondary mt-1 truncate">{traceId}</div>
                        <div className="text-xs font-bold text-secondary mt-3">{status}</div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="md:col-span-4 rounded-xl border border-borderColor bg-bgPanel/50 p-4 text-sm text-textSecondary">
                    No workflow runs yet. Start with project intake.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="xl:sticky xl:top-0 self-start space-y-6">
            <div className="rounded-2xl border border-borderColor bg-bgPanel/75 p-6 lg:p-7 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-black text-textPrimary mb-2">What the app now proves</h2>
              <p className="text-sm text-textSecondary mb-5 leading-relaxed">
                A reliable grant workflow needs source, freshness, and verification signals, not just AI output.
              </p>

              <div className="space-y-4">
                {outcomeCards.map((item) => (
                  <ProofPoint key={item.title} icon={item.icon} title={item.title} body={item.body} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-borderColor bg-bgPanel/75 p-6">
              <h3 className="text-lg font-black text-textPrimary flex items-center">
                <WifiOff className="w-5 h-5 mr-2 text-secondary" />
                Works after trial limits
              </h3>
              <p className="text-sm text-textSecondary mt-3 leading-relaxed">
                Saved traces, offline mode, and project snapshots let GrantPilot keep showing the same polished workflow even without live calls.
              </p>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
});

function HeroMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-borderColor bg-bgPanel/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-textSecondary font-bold uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-2xl font-black text-textPrimary mt-3">{value}</div>
    </div>
  );
}

function SourceHealthRow({ source, value }: { source: string; value: AnyRecord }) {
  const status = getStringField(value, "status", getStringField(value, "health", "ready"));
  const lastSuccess = getStringField(value, "last_success_at", getStringField(value, "last_refreshed"));
  const count = asNumber(value.records, asNumber(value.count, 0));

  return (
    <div className="rounded-xl border border-borderColor bg-bgPanel/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-textPrimary truncate">{prettify(source)}</div>
          <div className="text-xs text-textSecondary mt-1">
            {lastSuccess ? `Updated ${formatRelativeTime(lastSuccess)}` : "Refresh metadata available"}
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-black">
          {prettify(status)}
        </span>
      </div>
      {count > 0 && <div className="text-xs text-textSecondary mt-3">{count.toLocaleString()} records seen</div>}
    </div>
  );
}

function ScenarioCard({
  scenario,
  fallbackId,
  onSelect
}: {
  scenario: AnyRecord;
  fallbackId: string;
  onSelect: (scenario: AnyRecord) => void;
}) {
  const title = getStringField(scenario, "title", "Demo scenario");
  const strength = getStringField(scenario, "strength", "sample path");
  const story = getStringField(scenario, "expected_story", "Run this scenario through the GrantPilot workflow.");

  return (
    <Link
      href="/intake"
      onClick={() => onSelect(scenario)}
      className="rounded-2xl border border-borderColor bg-bgPanel/50 p-5 hover:border-primary/50 hover:bg-bgPanelLight transition-colors group"
      aria-label={`Run ${title}`}
    >
      <div className="text-[11px] text-primary font-black uppercase tracking-wide mb-3">{strength || fallbackId}</div>
      <h3 className="text-lg font-black text-textPrimary group-hover:text-primary transition-colors leading-snug">{title}</h3>
      <p className="text-sm text-textSecondary mt-3 leading-relaxed">{story}</p>
      <div className="mt-5 text-sm text-secondary font-black inline-flex items-center">
        Use scenario <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </Link>
  );
}

function ProofPoint({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-secondary" />
      </div>
      <div>
        <div className="font-black text-textPrimary">{title}</div>
        <p className="text-sm text-textSecondary leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function prettify(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default Dashboard;
