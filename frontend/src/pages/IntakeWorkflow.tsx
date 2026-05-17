"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import type { AnyRecord, GrantRecord, GrantPilotRunResponse } from "../lib/grantpilotApi";
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
  "Coordinator routes request",
  "Project Profiler builds profile",
  "Backend scores 613 grants",
  "Relevance Judge reviews candidates",
  "Match Explainer creates clerk summary"
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

  useEffect(() => {
    GrantPilotApi.demoScenarios()
      .then((data) => setDemoScenarios(getArrayField<AnyRecord>(data, "scenarios")))
      .catch(() => setDemoScenarios([]));
  }, []);

  const documentsAvailable = useMemo(() => {
    return documentsText
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [documentsText]);

  const runValidation = useCallback(async () => {
    if (!projectDescription.trim()) return;

    setIsValidating(true);
    setError("");

    try {
      const output = await GrantPilotApi.validateIntake({
        project_description: projectDescription,
        documents_available: documentsAvailable
      });
      setValidation(output);
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

    try {
      const output = await GrantPilotApi.run({
        project_description: projectDescription,
        documents_available: documentsAvailable
      });

      setResponse(output);
      saveLatestRun(output);

      if (output.trace_id) {
        const summary = await GrantPilotApi.traceSummary(output.trace_id).catch(() => null);
        setTraceSummary(summary);
      }
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
  }, []);

  const displaySummary = getRecordField(response?.result, "display_summary");
  const projectProfile = getRecordField(response?.result, "project_profile");
  const candidateGrants = getArrayField<GrantRecord>(response?.result, "candidate_grants");
  const explanationHighlights = getArrayField<AnyRecord>(displaySummary, "explanation_highlights");
  const traceSteps = getArrayField<AnyRecord>(response?.trace, "steps");
  const hasDisplaySummary = Object.keys(displaySummary).length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Live IBM watsonx Orchestrate workflow
          </div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight mb-2">Project Intake</h1>
          <p className="text-textSecondary max-w-3xl">
            Describe a Michigan community project. GrantPilot profiles it, scores the master grant database,
            asks specialist agents to review the matches, and returns clerk-friendly next steps.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-4 min-w-[260px]">
          <div className="flex items-center text-sm text-textSecondary mb-2">
            <Database className="w-4 h-4 mr-2 text-primary" />
            Backend status
          </div>
          <div className="text-lg font-bold text-textPrimary">Real API connected</div>
          <div className="text-xs text-textSecondary mt-1">POST /api/grantpilot/run</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-panel rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-textPrimary mb-2">Project description</label>
            <textarea
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              className="w-full min-h-[220px] bg-bgPanel/60 border border-borderColor rounded-xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary resize-y"
              placeholder="Example: Clare County has a broken bridge causing flooding and commute delays..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textPrimary mb-2">
              Documents already available <span className="text-textSecondary font-normal">(optional)</span>
            </label>
            <input
              value={documentsText}
              onChange={(event) => setDocumentsText(event.target.value)}
              className="w-full bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
              placeholder="photos, meeting notes, cost estimate, engineering memo"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start">
              <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={runWorkflow}
              disabled={isRunning || !projectDescription.trim()}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center"
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
              className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-semibold transition-colors flex items-center justify-center"
            >
              {isValidating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ClipboardList className="w-5 h-5 mr-2" />}
              Check intake
            </button>
          </div>

          {validation && (
            <div className="rounded-xl bg-bgPanel/50 border border-borderColor p-4">
              <div className="flex items-center mb-3">
                {asBoolean(validation.valid) ? (
                  <CheckCircle2 className="w-5 h-5 text-secondary mr-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 mr-2" />
                )}
                <h3 className="font-bold text-textPrimary">Intake check: {asBoolean(validation.valid) ? "Ready to run" : "Needs more detail"}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <ListBlock title="Suggestions" items={validation.suggestions} />
                <ListBlock title="Warnings" items={Object.values(asRecord(validation.warnings))} />
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-primary" />
            Demo scenarios
          </h2>
          <div className="space-y-3">
            {demoScenarios.map((scenario, index) => (
              <button
                key={getStringField(scenario, "id", `scenario-${index}`)}
                onClick={() => applyScenario(scenario)}
                className="w-full text-left p-4 rounded-xl bg-bgPanel/50 border border-borderColor hover:border-primary/40 hover:bg-bgPanelLight transition-colors"
              >
                <div className="font-semibold text-textPrimary text-sm">{getStringField(scenario, "title", "Demo scenario")}</div>
                <div className="text-xs text-primary mt-1">{getStringField(scenario, "strength", "demo")}</div>
                <div className="text-xs text-textSecondary mt-2">{truncate(getStringField(scenario, "expected_story"), 130)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {isRunning && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center">
            <Bot className="w-5 h-5 mr-2 text-primary" />
            Live workflow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stepLabels.map((label, index) => (
              <div key={label} className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-textSecondary">Step {index + 1}</span>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
                <div className="text-sm font-medium text-textPrimary">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDisplaySummary && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-secondary/20">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <div className="flex items-center text-secondary text-sm font-semibold mb-2">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Workflow complete
                </div>
                <h2 className="text-2xl font-bold text-textPrimary">{getStringField(displaySummary, "title", "GrantPilot match summary")}</h2>
                <p className="text-textSecondary mt-3 max-w-4xl">{getStringField(displaySummary, "plain_english_summary")}</p>
              </div>

              <div className="flex gap-3">
                <Link href="/explorer" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold inline-flex items-center">
                  View matches <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link href="/packet" className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-semibold inline-flex items-center">
                  Packet <FileText className="w-4 h-4 ml-2" />
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 glass-panel rounded-2xl p-6">
              <h3 className="text-xl font-bold text-textPrimary mb-4">Top grant directions</h3>
              <div className="space-y-3">
                {(getArrayField<GrantRecord>(displaySummary, "best_fit_grant_directions").length
                  ? getArrayField<GrantRecord>(displaySummary, "best_fit_grant_directions")
                  : candidateGrants.slice(0, 5)).map((grant, index) => (
                  <GrantMatchCard key={grant.id || grant.title || `grant-${index}`} grant={grant} />
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-xl font-bold text-textPrimary mb-4 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-secondary" />
                AI explanation
              </h3>
              <div className="space-y-4">
                {explanationHighlights.length ? (
                  explanationHighlights.map((item, index) => (
                    <div key={`${getStringField(item, "grant_title", "grant")}-${index}`} className="p-4 rounded-xl bg-bgPanel/50 border border-borderColor">
                      <div className="text-sm font-semibold text-textPrimary">{getStringField(item, "grant_title", "Grant")}</div>
                      <div className="text-xs text-primary mt-1">{getStringField(item, "decision", "review")}</div>
                      <p className="text-sm text-textSecondary mt-3">{getStringField(item, "summary")}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-textSecondary">No explanation highlights returned yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xl font-bold text-textPrimary mb-4">Workflow trace</h3>
            <TraceSummary traceSummary={traceSummary} traceSteps={traceSteps} traceId={response?.trace_id} />
          </div>
        </div>
      )}
    </div>
  );
});

function GrantMatchCard({ grant }: { grant: GrantRecord }) {
  const score = getGrantScore(grant);

  const handleSelect = () => {
    saveSelectedGrant(grant);
  };

  return (
    <div className="p-4 rounded-xl bg-bgPanel/50 border border-borderColor hover:border-primary/30 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {score !== null && <span className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-bold">{score}% fit</span>}
            <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">{grant.source || "Source unknown"}</span>
            {grant.status && <span className="px-2 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs">{grant.status}</span>}
          </div>
          <h4 className="font-bold text-textPrimary">{grant.title}</h4>
          <p className="text-sm text-textSecondary mt-1">{grant.agency}</p>
          <p className="text-sm text-textSecondary mt-3">{truncate(grant.summary || grant.overview, 180)}</p>
        </div>

        <div className="flex md:flex-col gap-2 shrink-0">
          {grant.id && (
            <Link href={`/explorer/${grant.id}`} onClick={handleSelect} className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold text-center">
              Details
            </Link>
          )}
          {grant.source_url && (
            <a href={grant.source_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary text-sm font-semibold inline-flex items-center justify-center">
              Source <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="p-3 rounded-xl bg-bgPanel/50 border border-borderColor">
      <div className="text-xs text-textSecondary">{label}</div>
      <div className="font-bold text-textPrimary mt-1">{String(value ?? "Unknown")}</div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: unknown }) {
  const list = asArray(items).filter(Boolean);

  return (
    <div>
      <div className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">{title}</div>
      {list.length ? (
        <ul className="space-y-1">
          {list.map((item, index) => (
            <li key={index} className="text-sm text-textSecondary flex">
              <span className="text-primary mr-2">•</span>
              {String(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-textSecondary">None.</p>
      )}
    </div>
  );
}

function TraceSummary({ traceSummary, traceSteps, traceId }: { traceSummary: AnyRecord | null; traceSteps: AnyRecord[]; traceId?: string }) {
  const steps = getArrayField<AnyRecord>(traceSummary, "steps").length ? getArrayField<AnyRecord>(traceSummary, "steps") : traceSteps;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <span className="px-3 py-1 rounded-full bg-bgPanelLight text-xs text-textSecondary">Trace: {traceId || "Not available"}</span>
        {Boolean(traceSummary?.status) && <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">{asString(traceSummary?.status)}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.map((step, index) => {
          const durationMs = Number(step.duration_ms ?? 0);
          return (
            <div key={`${getStringField(step, "agent_name", "agent")}-${index}`} className="p-4 rounded-xl bg-bgPanel/50 border border-borderColor">
              <div className="text-xs text-textSecondary mb-2">Step {asString(step.step_number, String(index + 1))}</div>
              <div className="font-semibold text-textPrimary text-sm">{getStringField(step, "agent_name", "Agent")}</div>
              <div className="text-xs text-secondary mt-2">{getStringField(step, "status", "unknown")}</div>
              {durationMs > 0 && <div className="text-xs text-textSecondary mt-1">{Math.round(durationMs / 1000)}s</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IntakeWorkflow;
