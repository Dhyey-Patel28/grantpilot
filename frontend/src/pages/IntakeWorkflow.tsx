"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import type { AnyRecord, GrantPilotRunResponse, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  asBoolean,
  asRecord,
  asString,
  formatCurrencyLike,
  formatRelativeTime,
  getArrayField,
  getErrorMessage,
  getGrantScore,
  getRecordField,
  getStringField,
  getLatestRun,
  getOfflineMode,
  isPortfolioDemoMode,
  loadJson,
  saveJson,
  saveLatestRun,
  saveProjectSnapshotFromRun,
  saveSelectedGrant,
  setOfflineMode,
  STORAGE_KEYS,
  truncate
} from "../lib/grantpilotApi";

const fallbackProject =
  "A small Michigan township has repeated flooding along a residential road corridor. The project includes stormwater drainage improvements, culvert replacement, ditch grading, and green infrastructure where possible. The township needs funding for design, engineering, and construction, with limited local match available.";

const workflowSteps = [
  {
    key: "profile",
    label: "Project Profiler",
    description: "Normalize the rough description into location, applicant, cost, need, and project category.",
    agent: "Project Profiler"
  },
  {
    key: "score",
    label: "Grant Scoring",
    description: "Search the refreshed grant database and score opportunities against the project profile.",
    agent: "Backend scoring"
  },
  {
    key: "judge",
    label: "Relevance Judge",
    description: "Keep, downrank, or reject matches based on domain fit and eligibility risk.",
    agent: "Grant Relevance Judge"
  },
  {
    key: "explain",
    label: "Match Explainer",
    description: "Turn the best matches into reviewable plain-English reasons, risks, and next steps.",
    agent: "Match Explainer"
  },
  {
    key: "ready",
    label: "Packet Handoff",
    description: "Save the run so the packet, translator, and saved-project pages can continue the workflow.",
    agent: "GrantPilot Coordinator"
  }
];

const documentSuggestions = [
  "photos",
  "cost estimate",
  "meeting notes",
  "engineering memo",
  "map",
  "budget"
];

const scenarioPrompts = [
  "Michigan township stormwater corridor",
  "county bridge flooding repair",
  "rural drinking water upgrade",
  "public safety equipment replacement"
];

function getInitialDescription(): string {
  if (typeof window === "undefined") return fallbackProject;

  try {
    const savedScenario = localStorage.getItem(STORAGE_KEYS.demoScenario);
    const parsed = savedScenario ? asRecord(JSON.parse(savedScenario) as unknown) : {};
    return getStringField(parsed, "project_description", fallbackProject);
  } catch {
    return fallbackProject;
  }
}

function getInitialDemoMode(): boolean {
  return isPortfolioDemoMode() || loadJson<boolean>(STORAGE_KEYS.demoMode, false) === true;
}

function getInitialOfflineMode(): boolean {
  return getOfflineMode();
}

export const IntakeWorkflow = memo(function IntakeWorkflow() {
  const [projectDescription, setProjectDescription] = useState(getInitialDescription);
  const [documentsText, setDocumentsText] = useState("photos, cost estimate, meeting notes");
  const [demoScenarios, setDemoScenarios] = useState<AnyRecord[]>([]);
  const [validation, setValidation] = useState<AnyRecord | null>(null);
  const [response, setResponse] = useState<GrantPilotRunResponse | null>(null);
  const [traceSummary, setTraceSummary] = useState<AnyRecord | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [workflowNotice, setWorkflowNotice] = useState("");
  const [demoMode, setDemoMode] = useState(getInitialDemoMode);
  const [offlineMode, setOfflineModeState] = useState(getInitialOfflineMode);

  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    GrantPilotApi.demoScenarios()
      .then((data) => setDemoScenarios(getArrayField<AnyRecord>(data, "scenarios")))
      .catch(() => setDemoScenarios([]));
  }, []);

  useEffect(() => {
    saveJson(STORAGE_KEYS.demoMode, demoMode);
  }, [demoMode]);

  useEffect(() => {
    setOfflineMode(offlineMode);
  }, [offlineMode]);

  const documentsAvailable = useMemo(() => {
    return documentsText
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [documentsText]);

  const descriptionWordCount = useMemo(() => {
    return projectDescription.trim().split(/\s+/).filter(Boolean).length;
  }, [projectDescription]);

  const intakeStrength = useMemo(() => {
    if (descriptionWordCount >= 45 && documentsAvailable.length >= 2) {
      return {
        label: "Strong intake",
        tone: "secondary",
        progress: 92,
        detail: "Enough context for high-quality matching and packet generation."
      };
    }

    if (descriptionWordCount >= 25) {
      return {
        label: "Good start",
        tone: "primary",
        progress: 68,
        detail: "Add documents, match status, or deadline pressure if available."
      };
    }

    return {
      label: "Needs detail",
      tone: "warning",
      progress: 38,
      detail: "Add location, applicant type, need, cost, and documents."
    };
  }, [descriptionWordCount, documentsAvailable.length]);

  const runValidation = useCallback(async () => {
    if (!projectDescription.trim()) return;

    setIsValidating(true);
    setError("");

    try {
      const output = await GrantPilotApi.validateIntake({
        project_description: projectDescription,
        documents_available: documentsAvailable
      });
      setValidation(asRecord(output));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not validate project intake."));
    } finally {
      setIsValidating(false);
    }
  }, [documentsAvailable, projectDescription]);

  const hydrateTraceSummary = useCallback(async (run: GrantPilotRunResponse) => {
    if (!run.trace_id) return;
    const summary = await GrantPilotApi.traceSummary(run.trace_id).catch(() => null);
    setTraceSummary(asRecord(summary));
  }, []);

  const scrollToResults = useCallback(() => {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const runWorkflow = useCallback(async () => {
    if (!projectDescription.trim()) {
      setError("Please describe the project before running GrantPilot.");
      return;
    }

    setIsRunning(true);
    setError("");
    setWorkflowNotice("");
    setTraceSummary(null);
    setValidation(null);

    try {
      if (offlineMode) {
        const savedRun = getLatestRun();

        if (!savedRun) {
          throw new Error("Offline Mode needs one saved run first. Turn Offline Mode off, run GrantPilot once, then try again.");
        }

        setResponse(savedRun);
        setWorkflowNotice("Offline Mode loaded your latest successful run from this browser. No live API call was made.");
        await hydrateTraceSummary(savedRun);
        scrollToResults();
        return;
      }

      const output = demoMode
        ? await GrantPilotApi.demoLatestRun()
        : await GrantPilotApi.run({
            project_description: projectDescription,
            documents_available: documentsAvailable
          });

      setResponse(output);
      saveLatestRun(output);
      const snapshot = saveProjectSnapshotFromRun({
        description: projectDescription,
        documents_available: documentsAvailable,
        response: output
      });

      if (demoMode) {
        setWorkflowNotice(`Replayed the saved sample workflow and saved it as “${snapshot.title}”.`);
      } else {
        setWorkflowNotice(`Live workflow complete. Saved “${snapshot.title}” so the packet and saved-project pages can continue from this run.`);
      }

      await hydrateTraceSummary(output);
      scrollToResults();
    } catch (err: unknown) {
      if (!demoMode && !offlineMode) {
        const savedRun = loadJson<GrantPilotRunResponse>(STORAGE_KEYS.latestRun, null);

        if (savedRun) {
          setResponse(savedRun);
          const snapshot = saveProjectSnapshotFromRun({
            description: projectDescription,
            documents_available: documentsAvailable,
            response: savedRun
          });
          setWorkflowNotice(`Live run failed, so GrantPilot loaded your latest saved successful run and kept “${snapshot.title}” available in Saved Projects.`);
          await hydrateTraceSummary(savedRun);
          scrollToResults();
          return;
        }
      }

      setError(getErrorMessage(err, "GrantPilot workflow failed."));
    } finally {
      setIsRunning(false);
    }
  }, [demoMode, documentsAvailable, hydrateTraceSummary, offlineMode, projectDescription, scrollToResults]);

  const applyScenario = useCallback((scenario: AnyRecord) => {
    setProjectDescription(getStringField(scenario, "project_description"));
    saveJson(STORAGE_KEYS.demoScenario, scenario);
    setValidation(null);
    setResponse(null);
    setTraceSummary(null);
    setWorkflowNotice("");
    setError("");
  }, []);

  const addDocumentSuggestion = useCallback((documentName: string) => {
    setDocumentsText((current) => {
      const existing = current
        .split(/[,\n]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      if (existing.includes(documentName.toLowerCase())) {
        return current;
      }

      return current.trim() ? `${current.trim()}, ${documentName}` : documentName;
    });
  }, []);

  const displaySummary = getRecordField(response?.result, "display_summary");
  const projectProfile = getRecordField(response?.result, "project_profile");
  const candidateGrants = getArrayField<GrantRecord>(response?.result, "candidate_grants");
  const explanationHighlights = getArrayField<AnyRecord>(displaySummary, "explanation_highlights");
  const traceSteps = getArrayField<AnyRecord>(response?.trace, "steps");
  const topGrants = useMemo(
    () => getTopGrantDirections(displaySummary, candidateGrants),
    [candidateGrants, displaySummary]
  );
  const hasDisplaySummary = Object.keys(displaySummary).length > 0;
  const activeMode = offlineMode ? "Offline" : demoMode ? "Sample" : "Live";
  const activeModeDetail = offlineMode
    ? "Uses your latest browser-saved run"
    : demoMode
      ? "Replays the saved sample workflow"
      : "Runs live agents when a backend is configured";

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-16 intake-cinema">
      <section className="production-surface intake-hero rounded-[2rem] overflow-hidden">
        <div className="relative p-6 lg:p-9">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/10 via-secondary/5 to-transparent pointer-events-none" />
          <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black mb-5">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                {activeMode} workflow · grant readiness intake
              </div>

              <h1 className="text-4xl lg:text-6xl font-black text-textPrimary tracking-tight leading-[0.95] max-w-4xl">
                Turn rough project notes into a grant-ready workflow.
              </h1>

              <p className="text-textSecondary mt-5 max-w-3xl leading-relaxed text-base lg:text-lg">
                GrantPilot profiles the project, searches the refreshed grant database, asks specialist agents to review fit,
                and saves the run for the readiness packet reveal.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7 max-w-3xl">
                <HeroMetric icon={Database} label="Grant DB" value="1,177+" detail="normalized records" />
                <HeroMetric icon={Bot} label="Agents" value="8" detail="specialist reviewers" />
                <HeroMetric icon={ShieldCheck} label="Output" value="Review-safe" detail="human verification first" />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-bgPanel/80 shadow-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-textSecondary">Current run mode</div>
                  <div className="text-3xl font-black text-textPrimary mt-2">{activeMode}</div>
                  <p className="text-sm text-textSecondary mt-2 leading-relaxed">{activeModeDetail}</p>
                </div>
                <span className={`h-3 w-3 rounded-full mt-1 ${offlineMode ? "bg-amber-400" : demoMode ? "bg-primary" : "bg-secondary"}`} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <StatusPill label="Data path" value={offlineMode ? "Browser saved" : demoMode ? "Saved sample" : "Live backend"} />
                <StatusPill label="Review path" value={demoMode || offlineMode ? "Sample" : "Live"} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="glass-panel rounded-3xl p-6 lg:p-7 overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
              <div>
                <div className="flex items-center text-sm font-black text-primary mb-2">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Project intake
                </div>
                <h2 className="text-2xl lg:text-3xl font-black text-textPrimary">
                  Start with one clear scenario.
                </h2>
                <p className="text-sm text-textSecondary mt-2 max-w-2xl">
                  Keep the workflow focused: one applicant, one public problem, one funding need, one strong packet reveal.
                </p>
              </div>

              <IntakeStrengthBadge
                label={intakeStrength.label}
                detail={intakeStrength.detail}
                progress={intakeStrength.progress}
                tone={intakeStrength.tone}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-4 items-start">
              <div>
                <label className="block text-sm font-bold text-textPrimary mb-2">
                  Scenario description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  className="w-full min-h-[210px] bg-bgPanel/60 border border-borderColor rounded-2xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary resize-y leading-relaxed"
                  placeholder="Example: A Michigan township has repeated flooding along a residential road corridor..."
                />
              </div>

              <div className="rounded-2xl border border-borderColor bg-bgPanel/45 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-textSecondary mb-3">
                  Story cues
                </div>
                <div className="space-y-2">
                  {scenarioPrompts.map((item) => (
                    <div key={item} className="flex items-start text-sm text-textSecondary">
                      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-secondary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-3 text-xs text-textSecondary">
              <span>{descriptionWordCount} words · {documentsAvailable.length} document signals</span>
              <span>Best input pattern: community + problem + project + cost + match + documents.</span>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ModeToggle
                label="Sample Workflow"
                checked={demoMode}
                disabled={offlineMode}
                tone="primary"
                description="Replay a saved workflow for a consistent product walkthrough."
                onChange={setDemoMode}
              />
              <ModeToggle
                label="Offline Mode"
                checked={offlineMode}
                tone="secondary"
                description="Use only the latest browser-saved run. No live calls."
                onChange={setOfflineModeState}
              />
            </div>

            <div className="mt-5">
              <label className="block text-sm font-bold text-textPrimary mb-2">
                Documents already available <span className="text-textSecondary font-normal">(optional)</span>
              </label>
              <input
                value={documentsText}
                onChange={(event) => setDocumentsText(event.target.value)}
                className="w-full bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
                placeholder="photos, meeting notes, cost estimate, engineering memo"
              />

              <div className="flex flex-wrap gap-2 mt-3">
                {documentSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => addDocumentSuggestion(item)}
                    className="px-3 py-1.5 rounded-full border border-borderColor bg-bgPanel/50 text-xs font-bold text-textSecondary hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            {workflowNotice && (
              <div className="mt-5 p-4 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary text-sm flex items-start">
                <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
                {workflowNotice}
              </div>
            )}

            {error && (
              <div className="mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start">
                <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-3 mt-6">
              <button
                onClick={runWorkflow}
                disabled={isRunning || !projectDescription.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-4 rounded-2xl font-black transition-colors flex items-center justify-center shadow-lg shadow-primary/20"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {offlineMode ? "Loading saved run..." : demoMode ? "Loading sample workflow..." : "Running live agents..."}
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    {offlineMode ? "Open saved run" : demoMode ? "Replay sample workflow" : "Run GrantPilot"}
                  </>
                )}
              </button>

              <button
                onClick={runValidation}
                disabled={isValidating || !projectDescription.trim()}
                className="px-5 py-4 rounded-2xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black transition-colors flex items-center justify-center"
              >
                {isValidating ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <FileCheck2 className="w-5 h-5 mr-2" />
                )}
                Check intake
              </button>
            </div>

            {validation && <ValidationPanel validation={validation} />}
          </div>

          <WorkflowTimeline
            isRunning={isRunning}
            hasResult={hasDisplaySummary}
            demoMode={demoMode}
            offlineMode={offlineMode}
            traceSummary={traceSummary}
            traceSteps={traceSteps}
          />

          <div ref={resultRef}>
            {hasDisplaySummary && (
              <ResultsSection
                displaySummary={displaySummary}
                projectProfile={projectProfile}
                topGrants={topGrants}
                explanationHighlights={explanationHighlights}
                traceSummary={traceSummary}
                traceSteps={traceSteps}
                traceId={response?.trace_id}
              />
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 space-y-4">
          <div className="glass-panel rounded-3xl p-5 lg:p-6">
            <h2 className="text-xl font-black text-textPrimary mb-2 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-primary" />
              Scenario library
            </h2>
            <p className="text-sm text-textSecondary mb-4 leading-relaxed">
              Pick one scenario and keep it consistent across Explorer, Translator, and Packet.
            </p>

            <div className="space-y-3">
              {demoScenarios.map((scenario, index) => (
                <button
                  key={getStringField(scenario, "id", `scenario-${index}`)}
                  onClick={() => applyScenario(scenario)}
                  className="w-full text-left p-4 rounded-2xl bg-bgPanel/50 border border-borderColor hover:border-primary/40 hover:bg-bgPanelLight transition-colors"
                >
                  <div className="font-black text-textPrimary text-sm">
                    {getStringField(scenario, "title", "Sample scenario")}
                  </div>
                  <div className="text-xs text-primary mt-1 font-bold">
                    {getStringField(scenario, "strength", "sample")}
                  </div>
                  <div className="text-xs text-textSecondary mt-2 leading-relaxed">
                    {truncate(getStringField(scenario, "expected_story"), 120)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-secondary/20 bg-secondary/5 p-5">
            <h3 className="font-black text-textPrimary flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-secondary" />
              Staff-facing output
            </h3>
            <div className="mt-4 space-y-3 text-sm text-textSecondary">
              <RailStep label="Project profile" detail="Applicant, cost, location, category, match status." />
              <RailStep label="Ranked matches" detail="Grant cards with source, score, and review warnings." />
              <RailStep label="Readiness packet" detail="Memo, FAQ, 30-day plan, and human checklist." />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
});

function ResultsSection({
  displaySummary,
  projectProfile,
  topGrants,
  explanationHighlights,
  traceSummary,
  traceSteps,
  traceId
}: {
  displaySummary: AnyRecord;
  projectProfile: AnyRecord;
  topGrants: GrantRecord[];
  explanationHighlights: AnyRecord[];
  traceSummary: AnyRecord | null;
  traceSteps: AnyRecord[];
  traceId?: string;
}) {
  const primaryGrant = topGrants[0];
  const score = primaryGrant ? getGrantScore(primaryGrant) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-secondary/20 bg-gradient-to-br from-secondary/10 via-bgPanel/70 to-primary/5 p-6 lg:p-7 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="flex items-center text-secondary text-sm font-black mb-2">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Workflow complete
            </div>
            <h2 className="text-2xl lg:text-4xl font-black text-textPrimary tracking-tight">
              {getStringField(displaySummary, "title", "GrantPilot match summary")}
            </h2>
            <p className="text-textSecondary mt-3 max-w-4xl leading-relaxed">
              {getStringField(displaySummary, "plain_english_summary") || "GrantPilot created a project profile, ranked grant matches, and saved the workflow for packet preparation."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0 min-w-[220px]">
            <ResultKpi label="Top fit" value={score !== null ? `${score}%` : "Review"} />
            <ResultKpi label="Matches" value={String(topGrants.length)} />
          </div>
        </div>

        {Object.keys(projectProfile).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <Metric label="Applicant" value={getStringField(projectProfile, "applicant_type", "Unknown")} />
            <Metric label="County" value={getStringField(projectProfile, "county", "Unknown")} />
            <Metric label="Category" value={getStringField(projectProfile, "project_category", "Unknown")} />
            <Metric label="Cost" value={formatCurrencyLike(projectProfile.estimated_cost)} />
            <Metric label="Match" value={asBoolean(projectProfile.match_available) ? "Available" : "Not available"} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            href="/explorer"
            className="px-4 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black inline-flex items-center justify-center"
          >
            Review matches <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link
            href="/packet"
            className="px-4 py-3 rounded-2xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black inline-flex items-center justify-center"
          >
            Open readiness packet <FileText className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="glass-panel rounded-3xl p-6 lg:p-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-xl font-black text-textPrimary">Best grant directions</h3>
              <p className="text-sm text-textSecondary mt-1">Saved for Explorer, Translator, and Packet.</p>
            </div>
            <Target className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-3">
            {topGrants.length ? (
              topGrants.map((grant, index) => (
                <GrantMatchCard
                  key={getStableGrantKey(grant, index)}
                  grant={grant}
                  rank={index + 1}
                  explanation={findExplanationForGrant(explanationHighlights, grant)}
                />
              ))
            ) : (
              <p className="text-sm text-textSecondary">
                No grant matches returned yet.
              </p>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 lg:p-7 xl:sticky xl:top-6">
          <h3 className="text-xl font-black text-textPrimary mb-4 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-secondary" />
            Review rationale
          </h3>

          <div className="space-y-4">
            {explanationHighlights.length ? (
              explanationHighlights.slice(0, 3).map((item, index) => (
                <div
                  key={`${getStringField(item, "grant_title", "grant")}-${index}`}
                  className="p-4 rounded-2xl bg-bgPanel/50 border border-borderColor"
                >
                  <div className="text-sm font-black text-textPrimary">
                    {getStringField(item, "grant_title", "Grant")}
                  </div>
                  <div className="text-xs text-primary mt-1 font-bold">
                    {getStringField(item, "decision", "review")}
                  </div>
                  <p className="text-sm text-textSecondary mt-3 leading-relaxed">
                    {getStringField(item, "summary")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-textSecondary">
                No explanation highlights returned yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 lg:p-7">
        <h3 className="text-xl font-black text-textPrimary mb-4">
          Trace summary
        </h3>
        <TraceSummary traceSummary={traceSummary} traceSteps={traceSteps} traceId={traceId} />
      </div>
    </div>
  );
}

function WorkflowTimeline({
  isRunning,
  hasResult,
  demoMode,
  offlineMode,
  traceSummary,
  traceSteps
}: {
  isRunning: boolean;
  hasResult: boolean;
  demoMode: boolean;
  offlineMode: boolean;
  traceSummary: AnyRecord | null;
  traceSteps: AnyRecord[];
}) {
  const summarySteps = getArrayField<AnyRecord>(traceSummary, "steps");
  const realSteps = summarySteps.length ? summarySteps : traceSteps;

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-7">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-textPrimary flex items-center">
            <Bot className="w-6 h-6 mr-2 text-primary" />
            Agent timeline
          </h2>
          <p className="text-sm text-textSecondary mt-1">
            {offlineMode ? "Offline replay uses the latest saved result." : demoMode ? "Saved workflow shows the completed specialist review." : "Live mode runs the coordinated GrantPilot workflow."}
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-bgPanelLight border border-borderColor text-xs font-black text-textSecondary">
          {isRunning ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-primary" /> : hasResult ? <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-secondary" /> : <Clock3 className="w-3.5 h-3.5 mr-2" />}
          {isRunning ? "Running" : hasResult ? "Complete" : "Ready"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {workflowSteps.map((step, index) => {
          const trace = realSteps[index];
          const traceStatus = getStringField(trace, "status");
          const status = isRunning && index <= 2 ? "running" : hasResult ? traceStatus || "complete" : "waiting";
          return <TimelineCard key={step.key} step={step} index={index} status={status} trace={trace} />;
        })}
      </div>
    </div>
  );
}

function TimelineCard({
  step,
  index,
  status,
  trace
}: {
  step: typeof workflowSteps[number];
  index: number;
  status: string;
  trace?: AnyRecord;
}) {
  const isDone = ["complete", "completed", "success", "succeeded"].includes(status.toLowerCase());
  const isRunning = status.toLowerCase() === "running";
  const durationMs = Number(asRecord(trace).duration_ms ?? 0);

  return (
    <div className={`relative p-4 rounded-2xl border ${isDone ? "border-secondary/25 bg-secondary/10" : isRunning ? "border-primary/30 bg-primary/10" : "border-borderColor bg-bgPanel/45"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="h-8 w-8 rounded-full bg-bgPanelLight border border-borderColor flex items-center justify-center text-xs font-black text-textPrimary">
          {index + 1}
        </span>
        {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : isDone ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <Clock3 className="w-4 h-4 text-textSecondary" />}
      </div>
      <div className="text-sm font-black text-textPrimary leading-snug">{step.label}</div>
      <div className="text-[11px] text-primary font-bold mt-1">{getStringField(trace, "agent_name", step.agent)}</div>
      <p className="text-xs text-textSecondary mt-3 leading-relaxed">{step.description}</p>
      {durationMs > 0 && (
        <div className="text-[11px] text-textSecondary mt-3 flex items-center">
          <Clock3 className="w-3 h-3 mr-1" />
          {Math.round(durationMs / 1000)}s
        </div>
      )}
    </div>
  );
}

function ValidationPanel({ validation }: { validation: AnyRecord }) {
  return (
    <div className="mt-5 rounded-2xl bg-bgPanel/50 border border-borderColor p-4">
      <div className="flex items-center mb-3">
        {asBoolean(validation.valid) ? (
          <CheckCircle2 className="w-5 h-5 text-secondary mr-2" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 mr-2" />
        )}
        <h3 className="font-black text-textPrimary">
          Intake check: {asBoolean(validation.valid) ? "Ready to run" : "Needs more detail"}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <ListBlock title="Suggestions" items={validation.suggestions} />
        <ListBlock title="Warnings" items={Object.values(asRecord(validation.warnings))} />
      </div>
    </div>
  );
}

function GrantMatchCard({
  grant,
  rank,
  explanation
}: {
  grant: GrantRecord;
  rank: number;
  explanation: AnyRecord | null;
}) {
  const score = getGrantScore(grant);
  const sourceUrl = getGrantSourceUrl(grant);
  const id = getStringField(asRecord(grant), "id");
  const lastRefreshed = grant.last_refreshed ? formatRelativeTime(grant.last_refreshed) : "source date unknown";

  const handleSelect = () => {
    saveSelectedGrant(grant);
  };

  return (
    <div className="p-4 rounded-2xl bg-bgPanel/50 border border-borderColor hover:border-primary/30 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-lg bg-bgPanelLight text-textPrimary text-xs font-black">
              #{rank}
            </span>
            {score !== null && (
              <span className="px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-black">
                {score}% fit
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
              {grant.source || "Source unknown"}
            </span>
            {grant.status && (
              <span className="px-2.5 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs">
                {grant.status}
              </span>
            )}
          </div>

          <h4 className="font-black text-textPrimary leading-snug text-base">
            {grant.title || "Untitled grant"}
          </h4>
          <p className="text-sm text-textSecondary mt-1">
            {grant.agency || "Agency not listed"} · refreshed {lastRefreshed}
          </p>

          <p className="text-sm text-textSecondary mt-3 leading-relaxed">
            {truncate(grant.summary || grant.overview, 190)}
          </p>

          {explanation && (
            <p className="text-sm text-textSecondary mt-3 rounded-2xl bg-secondary/5 border border-secondary/10 p-3 leading-relaxed">
              {getStringField(explanation, "summary")}
            </p>
          )}
        </div>

        <div className="flex md:flex-col gap-2 shrink-0">
          {id && (
            <Link
              href={`/explorer/${id}`}
              onClick={handleSelect}
              className="px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold text-center"
            >
              Details
            </Link>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary text-sm font-bold inline-flex items-center justify-center"
            >
              Source <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bgPanel/55 p-4">
      <Icon className="w-5 h-5 text-primary mb-3" />
      <div className="text-xs font-black uppercase tracking-[0.16em] text-textSecondary">{label}</div>
      <div className="text-2xl font-black text-textPrimary mt-1">{value}</div>
      <div className="text-xs text-textSecondary mt-1">{detail}</div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-bgPanelLight/70 border border-borderColor p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-textSecondary font-black">{label}</div>
      <div className="text-sm font-black text-textPrimary mt-1 truncate">{value}</div>
    </div>
  );
}

function IntakeStrengthBadge({
  label,
  detail,
  progress,
  tone
}: {
  label: string;
  detail: string;
  progress: number;
  tone: string;
}) {
  const className =
    tone === "secondary"
      ? "border-secondary/20 bg-secondary/10 text-secondary"
      : tone === "primary"
        ? "border-primary/20 bg-primary/10 text-primary"
        : "border-amber-400/20 bg-amber-400/10 text-amber-500";

  return (
    <div className={`rounded-2xl border px-4 py-3 min-w-[240px] ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black">{label}</div>
        <div className="text-xs font-black">{progress}%</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
        <div className="h-full rounded-full bg-current" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-xs opacity-90 mt-2 leading-relaxed">{detail}</div>
    </div>
  );
}

function ModeToggle({
  label,
  description,
  checked,
  disabled = false,
  tone,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  tone: "primary" | "secondary";
  onChange: (value: boolean) => void;
}) {
  const activeClass = tone === "primary" ? "border-primary/30 bg-primary/10" : "border-secondary/30 bg-secondary/10";

  return (
    <label className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${checked ? activeClass : "border-borderColor bg-bgPanel/40"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={`mt-1 h-4 w-4 ${tone === "primary" ? "accent-primary" : "accent-secondary"}`}
      />
      <span>
        <span className="block text-sm font-black text-textPrimary">{label}</span>
        <span className="block text-xs text-textSecondary mt-1 leading-relaxed">{description}</span>
      </span>
    </label>
  );
}

function RailStep({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
      <div>
        <div className="font-black text-textPrimary">{label}</div>
        <div className="text-xs text-textSecondary mt-1 leading-relaxed">{detail}</div>
      </div>
    </div>
  );
}

function ResultKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-bgPanel/60 border border-borderColor p-4 text-center">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-textSecondary">{label}</div>
      <div className="text-2xl font-black text-textPrimary mt-1">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="p-3 rounded-2xl bg-bgPanel/50 border border-borderColor">
      <div className="text-xs text-textSecondary">{label}</div>
      <div className="font-black text-textPrimary mt-1 truncate">{String(value ?? "Unknown")}</div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: unknown }) {
  const list = flattenList(items);

  return (
    <div>
      <div className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
        {title}
      </div>
      {list.length ? (
        <ul className="space-y-1">
          {list.map((item, index) => (
            <li key={`${title}-${index}-${item}`} className="text-sm text-textSecondary flex">
              <span className="text-primary mr-2">•</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-textSecondary">None.</p>
      )}
    </div>
  );
}

function TraceSummary({
  traceSummary,
  traceSteps,
  traceId
}: {
  traceSummary: AnyRecord | null;
  traceSteps: AnyRecord[];
  traceId?: string;
}) {
  const summarySteps = getArrayField<AnyRecord>(traceSummary, "steps");
  const steps = summarySteps.length ? summarySteps : traceSteps;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <span className="px-3 py-1 rounded-full bg-bgPanelLight text-xs text-textSecondary">
          Trace: {traceId || "Not available"}
        </span>
        {Boolean(traceSummary?.status) && (
          <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
            {asString(traceSummary?.status)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.length ? steps.map((step, index) => {
          const durationMs = Number(step.duration_ms ?? 0);
          return (
            <div
              key={`${getStringField(step, "agent_name", "agent")}-${getStringField(step, "action", "action")}-${index}`}
              className="p-4 rounded-2xl bg-bgPanel/50 border border-borderColor"
            >
              <div className="text-xs text-textSecondary mb-2">
                Step {asString(step.step_number, String(index + 1))}
              </div>
              <div className="font-bold text-textPrimary text-sm">
                {getStringField(step, "agent_name", "Agent")}
              </div>
              <div className="text-xs text-secondary mt-2">
                {getStringField(step, "status", "unknown")}
              </div>
              {durationMs > 0 && (
                <div className="text-xs text-textSecondary mt-1">
                  {Math.round(durationMs / 1000)}s
                </div>
              )}
            </div>
          );
        }) : (
          <p className="text-sm text-textSecondary">Run GrantPilot to see the saved trace summary.</p>
        )}
      </div>
    </div>
  );
}

function getTopGrantDirections(displaySummary: AnyRecord, candidateGrants: GrantRecord[]) {
  const displayGrants = getArrayField<GrantRecord>(displaySummary, "best_fit_grant_directions");
  const source = displayGrants.length ? displayGrants : candidateGrants.slice(0, 5);
  const seen = new Set<string>();
  const output: GrantRecord[] = [];

  for (const grant of source) {
    const key = getStableGrantKey(grant, output.length).toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(grant);
  }

  return output.slice(0, 5);
}

function getStableGrantKey(grant: GrantRecord, index: number) {
  const record = asRecord(grant);
  const id = getStringField(record, "id");
  const title = getStringField(record, "title", "untitled");
  const source = getStringField(record, "source", "source");
  const agency = getStringField(record, "agency", "agency");
  const url = getStringField(record, "source_url", getStringField(record, "website"));

  return `${id || title}-${source}-${agency}-${url || index}`;
}

function findExplanationForGrant(explanations: AnyRecord[], grant: GrantRecord) {
  const title = getStringField(asRecord(grant), "title").toLowerCase();

  if (!title) {
    return null;
  }

  return (
    explanations.find((item) => {
      const explanationTitle = getStringField(item, "grant_title").toLowerCase();
      return explanationTitle === title || explanationTitle.includes(title) || title.includes(explanationTitle);
    }) || null
  );
}

function getGrantSourceUrl(grant: GrantRecord) {
  const record = asRecord(grant);
  const sourceUrl = getStringField(record, "source_url");
  const website = getStringField(record, "website");

  return sourceUrl || website;
}

function flattenList(items: unknown) {
  return asArray(items)
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

export default IntakeWorkflow;
