"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
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
  getArrayField,
  getErrorMessage,
  getGrantScore,
  getRecordField,
  getStringField,
  saveJson,
  saveLatestRun,
  saveSelectedGrant,
  STORAGE_KEYS,
  truncate
} from "../lib/grantpilotApi";

const fallbackProject =
  "Clare County has a broken bridge causing flooding and commute delays. The county wants funding to repair the bridge. Estimated cost is $100,000 and no match is available.";

const stepLabels = [
  "Route request",
  "Profile project",
  "Score grants",
  "Review fit",
  "Explain matches"
];

const documentSuggestions = [
  "photos",
  "cost estimate",
  "meeting notes",
  "engineering memo",
  "map",
  "budget"
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

export const IntakeWorkflow = memo(function IntakeWorkflow() {
  const [projectDescription, setProjectDescription] = useState(getInitialDescription);
  const [documentsText, setDocumentsText] = useState("");
  const [demoScenarios, setDemoScenarios] = useState<AnyRecord[]>([]);
  const [validation, setValidation] = useState<AnyRecord | null>(null);
  const [response, setResponse] = useState<GrantPilotRunResponse | null>(null);
  const [traceSummary, setTraceSummary] = useState<AnyRecord | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const resultRef = useRef<HTMLDivElement | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const [rightRailMaxHeight, setRightRailMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    GrantPilotApi.demoScenarios()
      .then((data) => setDemoScenarios(getArrayField<AnyRecord>(data, "scenarios")))
      .catch(() => setDemoScenarios([]));
  }, []);

  useEffect(() => {
    const updateRightRailHeight = () => {
      if (typeof window === "undefined" || window.innerWidth < 1280) {
        setRightRailMaxHeight(null);
        return;
      }

      const formCard = formCardRef.current;
      if (!formCard) {
        return;
      }

      const measuredHeight = Math.ceil(formCard.getBoundingClientRect().height);
      setRightRailMaxHeight(Math.max(460, measuredHeight));
    };

    updateRightRailHeight();

    const observer =
      typeof ResizeObserver !== "undefined" && formCardRef.current
        ? new ResizeObserver(updateRightRailHeight)
        : null;

    if (observer && formCardRef.current) {
      observer.observe(formCardRef.current);
    }

    window.addEventListener("resize", updateRightRailHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateRightRailHeight);
    };
  }, []);

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
        detail: "Enough context for useful matching."
      };
    }

    if (descriptionWordCount >= 25) {
      return {
        label: "Good start",
        tone: "primary",
        detail: "Add documents or match details if available."
      };
    }

    return {
      label: "Needs detail",
      tone: "warning",
      detail: "Add location, cost, applicant type, and project need."
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

  const runWorkflow = useCallback(async () => {
    if (!projectDescription.trim()) {
      setError("Please describe the project before running GrantPilot.");
      return;
    }

    setIsRunning(true);
    setError("");
    setTraceSummary(null);
    setValidation(null);

    try {
      const output = await GrantPilotApi.run({
        project_description: projectDescription,
        documents_available: documentsAvailable
      });

      setResponse(output);
      saveLatestRun(output);

      if (output.trace_id) {
        const summary = await GrantPilotApi.traceSummary(output.trace_id).catch(() => null);
        setTraceSummary(asRecord(summary));
      }

      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "GrantPilot workflow failed."));
    } finally {
      setIsRunning(false);
    }
  }, [documentsAvailable, projectDescription]);

  const applyScenario = useCallback((scenario: AnyRecord) => {
    setProjectDescription(getStringField(scenario, "project_description"));
    saveJson(STORAGE_KEYS.demoScenario, scenario);
    setValidation(null);
    setResponse(null);
    setTraceSummary(null);
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="rounded-[2rem] border border-primary/10 bg-bgPanel/75 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-end">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-5">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Live IBM watsonx Orchestrate workflow
              </div>

              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight">
                Tell us about the project.
              </h1>

              <p className="text-textSecondary mt-3 max-w-3xl leading-relaxed">
                GrantPilot turns a rough Michigan community project into a project profile,
                ranked grant matches, fit explanations, and readiness next steps.
              </p>
            </div>

            <div className="rounded-2xl border border-borderColor bg-bgPanelLight/50 p-4">
              <div className="flex items-center text-sm text-textSecondary mb-2">
                <Database className="w-4 h-4 mr-2 text-primary" />
                Backend status
              </div>
              <div className="text-lg font-black text-textPrimary">
                Real API connected
              </div>
              <div className="text-xs text-textSecondary mt-1">
                POST /api/grantpilot/run
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div ref={formCardRef} className="glass-panel rounded-2xl p-6 lg:p-7">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-black text-textPrimary">
                  Project notes
                </h2>
                <p className="text-sm text-textSecondary mt-1">
                  Plain language is fine. Include the community, problem, cost, applicant, match, and documents if known.
                </p>
              </div>

              <IntakeStrengthBadge
                label={intakeStrength.label}
                detail={intakeStrength.detail}
                tone={intakeStrength.tone}
              />
            </div>

            <label className="block text-sm font-bold text-textPrimary mb-2">
              Describe the project
            </label>
            <textarea
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              className="w-full min-h-[170px] bg-bgPanel/60 border border-borderColor rounded-2xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary resize-y"
              placeholder="Example: Clare County has a broken bridge causing flooding and commute delays..."
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-3 text-xs text-textSecondary">
              <span>{descriptionWordCount} words</span>
              <span>Tip: “who needs funding + where + what changed + cost + match” gives the best results.</span>
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

            {error && (
              <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start">
                <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-3 mt-6">
              <button
                onClick={runWorkflow}
                disabled={isRunning || !projectDescription.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-black transition-colors flex items-center justify-center"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running live agents...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Find grant matches
                  </>
                )}
              </button>

              <button
                onClick={runValidation}
                disabled={isValidating || !projectDescription.trim()}
                className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black transition-colors flex items-center justify-center"
              >
                {isValidating ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <ClipboardList className="w-5 h-5 mr-2" />
                )}
                Check intake
              </button>
            </div>

            {validation && <ValidationPanel validation={validation} />}
          </div>

          {isRunning && <LiveWorkflowPanel />}

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

        <aside
          className="xl:sticky xl:top-6 space-y-4 xl:overflow-y-auto xl:overscroll-contain xl:pr-1 xl:[scrollbar-width:thin]"
          style={rightRailMaxHeight ? { maxHeight: `${rightRailMaxHeight}px` } : undefined}
        >
          <div className="glass-panel rounded-2xl p-5 lg:p-6">
            <h2 className="text-xl font-black text-textPrimary mb-2 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-primary" />
              Try a demo scenario
            </h2>
            <p className="text-sm text-textSecondary mb-4">
              These are tuned to show strong matches, mismatch protection, and readiness output.
            </p>

            <div className="space-y-3">
              {demoScenarios.map((scenario, index) => (
                <button
                  key={getStringField(scenario, "id", `scenario-${index}`)}
                  onClick={() => applyScenario(scenario)}
                  className="w-full text-left p-4 rounded-xl bg-bgPanel/50 border border-borderColor hover:border-primary/40 hover:bg-bgPanelLight transition-colors"
                >
                  <div className="font-black text-textPrimary text-sm">
                    {getStringField(scenario, "title", "Demo scenario")}
                  </div>
                  <div className="text-xs text-primary mt-1 font-bold">
                    {getStringField(scenario, "strength", "demo")}
                  </div>
                  <div className="text-xs text-textSecondary mt-2 leading-relaxed">
                    {truncate(getStringField(scenario, "expected_story"), 120)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5">
            <h3 className="font-black text-textPrimary flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-secondary" />
              What happens next
            </h3>
            <ol className="mt-4 space-y-3 text-sm text-textSecondary">
              <li><span className="font-black text-textPrimary">1.</span> Build a project profile.</li>
              <li><span className="font-black text-textPrimary">2.</span> Score the real grant database.</li>
              <li><span className="font-black text-textPrimary">3.</span> Ask IBM agents to review fit.</li>
              <li><span className="font-black text-textPrimary">4.</span> Produce next steps staff can review.</li>
            </ol>
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
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="flex items-center text-secondary text-sm font-black mb-2">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Workflow complete
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-textPrimary">
              {getStringField(displaySummary, "title", "GrantPilot match summary")}
            </h2>
            <p className="text-textSecondary mt-3 max-w-4xl leading-relaxed">
              {getStringField(displaySummary, "plain_english_summary")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <Link
              href="/explorer"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black inline-flex items-center justify-center"
            >
              View matches <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/packet"
              className="px-4 py-2.5 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black inline-flex items-center justify-center"
            >
              Create packet <FileText className="w-4 h-4 ml-2" />
            </Link>
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="glass-panel rounded-2xl p-6 lg:p-7">
          <h3 className="text-xl font-black text-textPrimary mb-4">
            Best grant directions
          </h3>

          <div className="space-y-3">
            {topGrants.length ? (
              topGrants.map((grant, index) => (
                <GrantMatchCard
                  key={getStableGrantKey(grant, index)}
                  grant={grant}
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

        <div className="glass-panel rounded-2xl p-6 lg:p-7 xl:sticky xl:top-6">
          <h3 className="text-xl font-black text-textPrimary mb-4 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-secondary" />
            Why these matches
          </h3>

          <div className="space-y-4">
            {explanationHighlights.length ? (
              explanationHighlights.slice(0, 3).map((item, index) => (
                <div
                  key={`${getStringField(item, "grant_title", "grant")}-${index}`}
                  className="p-4 rounded-xl bg-bgPanel/50 border border-borderColor"
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

      <div className="glass-panel rounded-2xl p-6 lg:p-7">
        <h3 className="text-xl font-black text-textPrimary mb-4">
          Workflow trace
        </h3>
        <TraceSummary traceSummary={traceSummary} traceSteps={traceSteps} traceId={traceId} />
      </div>
    </div>
  );
}

function ValidationPanel({ validation }: { validation: AnyRecord }) {
  return (
    <div className="mt-5 rounded-xl bg-bgPanel/50 border border-borderColor p-4">
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

function LiveWorkflowPanel() {
  return (
    <div className="glass-panel rounded-2xl p-6 lg:p-7">
      <h2 className="text-lg font-black text-textPrimary mb-4 flex items-center">
        <Bot className="w-5 h-5 mr-2 text-primary" />
        Running live workflow
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stepLabels.map((label, index) => (
          <div key={label} className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-textSecondary">Step {index + 1}</span>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
            <div className="text-sm font-bold text-textPrimary">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GrantMatchCard({
  grant,
  explanation
}: {
  grant: GrantRecord;
  explanation: AnyRecord | null;
}) {
  const score = getGrantScore(grant);
  const sourceUrl = getGrantSourceUrl(grant);
  const id = getStringField(asRecord(grant), "id");

  const handleSelect = () => {
    saveSelectedGrant(grant);
  };

  return (
    <div className="p-4 rounded-xl bg-bgPanel/50 border border-borderColor hover:border-primary/30 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {score !== null && (
              <span className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-black">
                {score}% fit
              </span>
            )}
            <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
              {grant.source || "Source unknown"}
            </span>
            {grant.status && (
              <span className="px-2 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs">
                {grant.status}
              </span>
            )}
          </div>

          <h4 className="font-black text-textPrimary leading-snug">
            {grant.title || "Untitled grant"}
          </h4>
          <p className="text-sm text-textSecondary mt-1">
            {grant.agency || "Agency not listed"}
          </p>

          <p className="text-sm text-textSecondary mt-3 leading-relaxed">
            {truncate(grant.summary || grant.overview, 180)}
          </p>

          {explanation && (
            <p className="text-sm text-textSecondary mt-3 rounded-xl bg-secondary/5 border border-secondary/10 p-3 leading-relaxed">
              {getStringField(explanation, "summary")}
            </p>
          )}
        </div>

        <div className="flex md:flex-col gap-2 shrink-0">
          {id && (
            <Link
              href={`/explorer/${id}`}
              onClick={handleSelect}
              className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold text-center"
            >
              Details
            </Link>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-lg border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary text-sm font-bold inline-flex items-center justify-center"
            >
              Source <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function IntakeStrengthBadge({
  label,
  detail,
  tone
}: {
  label: string;
  detail: string;
  tone: string;
}) {
  const className =
    tone === "secondary"
      ? "border-secondary/20 bg-secondary/10 text-secondary"
      : tone === "primary"
        ? "border-primary/20 bg-primary/10 text-primary"
        : "border-amber-400/20 bg-amber-400/10 text-amber-500";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${className}`}>
      <div className="text-sm font-black">{label}</div>
      <div className="text-xs opacity-90 mt-1">{detail}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="p-3 rounded-xl bg-bgPanel/50 border border-borderColor">
      <div className="text-xs text-textSecondary">{label}</div>
      <div className="font-black text-textPrimary mt-1">{String(value ?? "Unknown")}</div>
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
        {steps.map((step, index) => {
          const durationMs = Number(step.duration_ms ?? 0);
          return (
            <div
              key={`${getStringField(step, "agent_name", "agent")}-${getStringField(step, "action", "action")}-${index}`}
              className="p-4 rounded-xl bg-bgPanel/50 border border-borderColor"
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
        })}
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
