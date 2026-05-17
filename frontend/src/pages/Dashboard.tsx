"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  Loader2,
  MapPin,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { AnyRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  asRecord,
  asString,
  getStringField,
  saveJson,
  STORAGE_KEYS
} from "../lib/grantpilotApi";

const fallbackScenarios: AnyRecord[] = [
  {
    id: "bridge-repair",
    title: "County bridge repair",
    strength: "Strong match",
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
  },
  {
    id: "drainage-recreation",
    title: "Drainage with recreation",
    strength: "Mixed purpose",
    expected_story:
      "Treats drainage and water infrastructure as the core need, with recreation as a secondary benefit.",
    project_description:
      "Plainfield Township, Michigan reports that farmers have long waits for water due to limited capacity of the drain canal system. The township seeks funds to expand drain canal capacity. They also want to add recreation opportunities along the newly expanded system. They are rural and can commit about $500,000 from the general fund and $50,000 from the parks budget."
  }
];

const outputItems = [
  {
    icon: Search,
    title: "Ranked grant matches",
    body: "A short list of grants that fit the project better than a broad keyword search."
  },
  {
    icon: FileText,
    title: "Plain-English explanation",
    body: "Why a grant fits, what still needs verification, and what could make it risky."
  },
  {
    icon: ClipboardCheck,
    title: "Readiness checklist",
    body: "Missing documents, match concerns, eligibility checks, and next actions."
  },
  {
    icon: ShieldCheck,
    title: "Review-safe language",
    body: "Careful wording that avoids saying funding is guaranteed or eligibility is confirmed too strongly."
  }
];

const processSteps = [
  {
    step: "01",
    title: "Describe the project",
    body: "Enter rough notes, cost, match status, and available documents."
  },
  {
    step: "02",
    title: "Match against grants",
    body: "GrantPilot scores the real grant database before asking agents to review."
  },
  {
    step: "03",
    title: "Review fit and risk",
    body: "Specialist agents keep, downrank, or reject candidate grants."
  },
  {
    step: "04",
    title: "Prepare next steps",
    body: "Requirements, gaps, memo language, FAQ, and checklist can be generated."
  }
];

export const Dashboard = memo(function Dashboard() {
  const [health, setHealth] = useState<AnyRecord | null>(null);
  const [stats, setStats] = useState<AnyRecord | null>(null);
  const [scenarios, setScenarios] = useState<AnyRecord[]>(fallbackScenarios);
  const [recentTraces, setRecentTraces] = useState<AnyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      const [healthOutput, statsOutput, scenariosOutput, tracesOutput] =
        await Promise.all([
          GrantPilotApi.health().catch(() => null),
          GrantPilotApi.stats().catch(() => null),
          GrantPilotApi.demoScenarios().catch(() => null),
          GrantPilotApi.traces().catch(() => null)
        ]);

      setHealth(asRecord(healthOutput));
      setStats(asRecord(statsOutput));

      const apiScenarios = asArray<AnyRecord>(asRecord(scenariosOutput).scenarios);
      setScenarios(apiScenarios.length ? apiScenarios : fallbackScenarios);

      setRecentTraces(asArray<AnyRecord>(asRecord(tracesOutput).traces).slice(0, 3));
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

  const totalGrants = asString(stats?.total_grants, "613");
  const openCount = asString(statusCounts.open, "151");
  const closingSoonCount = asString(statusCounts.closing_soon, "88");
  const backendMode = asString(health?.mode, "live");
  const isBackendOnline = health?.ok === true;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="rounded-[2rem] border border-primary/10 bg-bgPanel/75 shadow-2xl shadow-black/10 overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="p-7 lg:p-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Grant readiness for Michigan communities
            </div>

            <h1 className="text-4xl lg:text-6xl font-black text-textPrimary tracking-tight leading-[0.98] max-w-4xl">
              Start with a project. Leave with grant-ready next steps.
            </h1>

            <p className="text-textSecondary mt-5 text-base lg:text-lg leading-relaxed max-w-3xl">
              GrantPilot helps local teams turn rough project notes into ranked grant matches,
              plain-English fit explanations, readiness gaps, and safe starter packet language.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/intake"
                className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold inline-flex items-center justify-center"
              >
                Start project intake <PlayCircle className="w-5 h-5 ml-2" />
              </Link>

              <Link
                href="/explorer"
                className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-bold inline-flex items-center justify-center"
              >
                Browse grants <Search className="w-5 h-5 ml-2" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 mt-7">
              <SmallProof
                icon={CheckCircle2}
                text={isBackendOnline ? `${backendMode} API` : "API check needed"}
              />
              <SmallProof icon={Database} text={`${totalGrants} grant records`} />
              <SmallProof icon={Bot} text="IBM agent workflow" />
              <SmallProof icon={ShieldCheck} text="Human review built in" />
            </div>
          </div>

          <div className="border-t xl:border-t-0 xl:border-l border-borderColor bg-bgPanelLight/20 p-6 lg:p-7 flex items-center">
            <div className="rounded-2xl border border-borderColor bg-bgPanel/70 p-5 w-full">
              <div className="text-sm font-black text-secondary mb-2">
                Best first step
              </div>
              <h2 className="text-2xl font-black text-textPrimary leading-tight">
                Run the project intake.
              </h2>
              <p className="text-sm text-textSecondary mt-3 leading-relaxed">
                Intake creates the project profile, searches the grant database, asks review agents
                to check fit, and gives staff a readable summary.
              </p>

              <Link
                href="/intake"
                className="mt-5 w-full px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold inline-flex items-center justify-center"
              >
                Go to intake <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="glass-panel rounded-2xl p-8 flex items-center justify-center text-textSecondary">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading live GrantPilot status...
        </div>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-6 items-start">
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 lg:p-7">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-textPrimary">
                  How GrantPilot works
                </h2>
                <p className="text-sm text-textSecondary mt-1">
                  The workflow is designed for a clerk or local staff member who starts with rough notes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {processSteps.map((item) => (
                  <ProcessStep
                    key={item.step}
                    step={item.step}
                    title={item.title}
                    body={item.body}
                  />
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 lg:p-7">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-2xl font-black text-textPrimary flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Try a sample project
                  </h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Use one of these to quickly see matching, mismatch protection, or mixed-purpose review.
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
                  <h2 className="text-2xl font-black text-textPrimary">
                    Recent work
                  </h2>
                  <p className="text-sm text-textSecondary mt-1">
                    Recent workflows from this demo environment.
                  </p>
                </div>

                <span className="hidden sm:inline-flex text-xs text-textSecondary">
                  {openCount} open • {closingSoonCount} closing soon
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                        <div className="text-sm font-bold text-textPrimary">
                          Workflow run
                        </div>
                        <div className="text-xs text-textSecondary mt-1 truncate">
                          {traceId}
                        </div>
                        <div className="text-xs font-bold text-secondary mt-3">
                          {status}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="md:col-span-3 rounded-xl border border-borderColor bg-bgPanel/50 p-4 text-sm text-textSecondary">
                    No workflow runs yet. Start with project intake.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="xl:sticky xl:top-0 self-start">
            <div className="rounded-2xl border border-borderColor bg-bgPanel/75 p-6 lg:p-7 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-black text-textPrimary mb-2">
                What staff get back
              </h2>
              <p className="text-sm text-textSecondary mb-5 leading-relaxed">
                GrantPilot is useful only if a local team gets something they can review and act on.
              </p>

              <div className="space-y-4">
                {outputItems.map((item) => (
                  <ProofPoint
                    key={item.title}
                    icon={item.icon}
                    title={item.title}
                    body={item.body}
                  />
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="text-sm font-black text-primary mb-2">
                  Michigan value
                </div>
                <p className="text-sm text-textSecondary leading-relaxed">
                  GrantPilot helps small teams compete for funding without needing a dedicated
                  grant writer for every early-stage opportunity review.
                </p>
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
});

function SmallProof({
  icon: Icon,
  text
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-borderColor bg-bgPanelLight/60 px-3 py-1.5 text-xs font-bold text-textSecondary">
      <Icon className="w-3.5 h-3.5 mr-1.5 text-primary" />
      {text}
    </span>
  );
}

function ProcessStep({
  step,
  title,
  body
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-borderColor bg-bgPanel/50 p-5">
      <div className="text-xs font-black text-primary tracking-wide mb-4">
        STEP {step}
      </div>
      <h3 className="font-black text-textPrimary">
        {title}
      </h3>
      <p className="text-sm text-textSecondary mt-2 leading-relaxed">
        {body}
      </p>
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
  const strength = getStringField(scenario, "strength", "demo path");
  const story = getStringField(
    scenario,
    "expected_story",
    "Run this scenario through the GrantPilot workflow."
  );

  return (
    <Link
      href="/intake"
      onClick={() => onSelect(scenario)}
      className="rounded-2xl border border-borderColor bg-bgPanel/50 p-5 hover:border-primary/50 hover:bg-bgPanelLight transition-colors group"
      aria-label={`Run ${title}`}
    >
      <div className="text-[11px] text-primary font-black uppercase tracking-wide mb-3">
        {strength || fallbackId}
      </div>
      <h3 className="text-lg font-black text-textPrimary group-hover:text-primary transition-colors leading-snug">
        {title}
      </h3>
      <p className="text-sm text-textSecondary mt-3 leading-relaxed">
        {story}
      </p>
      <div className="mt-5 text-sm text-secondary font-black inline-flex items-center">
        Run scenario <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </Link>
  );
}

function ProofPoint({
  icon: Icon,
  title,
  body
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-secondary" />
      </div>
      <div>
        <div className="font-black text-textPrimary">
          {title}
        </div>
        <p className="text-sm text-textSecondary leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;