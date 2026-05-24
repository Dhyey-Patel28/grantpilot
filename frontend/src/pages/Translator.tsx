"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  getErrorMessage,
  getRecordField,
  getSelectedGrant,
  getStringField,
  saveJson,
  STORAGE_KEYS,
  stripHtml
} from "../lib/grantpilotApi";

type TranslatorMode = "selected" | "id" | "text";
type InputTone = "primary" | "secondary" | "warning";

type RequirementsPayload =
  | { grant_id: string }
  | { grant_text: string };

const exampleGrantText =
  "Eligible applicants include county governments, city or township governments, and public agencies. Applicants must submit a project narrative, budget, timeline, evidence of local support, and documentation of public benefit. A local match may be required. Applications must be submitted before the posted deadline. Awards may fund planning, design, engineering, construction, or implementation activities depending on program rules.";

export const Translator = memo(function Translator() {
  const [mode, setMode] = useState<TranslatorMode>("id");
  const [grantText, setGrantText] = useState("");
  const [grantId, setGrantId] = useState("");
  const [selectedGrantFromExplorer, setSelectedGrantFromExplorer] = useState<GrantRecord | null>(null);
  const [requirements, setRequirements] = useState<AnyRecord | null>(null);
  const [translatedGrant, setTranslatedGrant] = useState<AnyRecord | null>(null);
  const [traceId, setTraceId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const selectedGrantId = selectedGrantFromExplorer?.id ? String(selectedGrantFromExplorer.id) : "";

  useEffect(() => {
    const savedGrant = getSelectedGrant();
    setSelectedGrantFromExplorer(savedGrant);

    if (savedGrant?.id) {
      setMode("selected");
      setGrantId(String(savedGrant.id));
    }
  }, []);

  const grantTextWordCount = useMemo(() => {
    return grantText.trim().split(/\s+/).filter(Boolean).length;
  }, [grantText]);

  const canTranslate = useMemo(() => {
    if (mode === "selected") return Boolean(selectedGrantId);
    if (mode === "id") return Boolean(grantId.trim());
    return Boolean(grantText.trim());
  }, [grantId, grantText, mode, selectedGrantId]);

  const inputQuality = useMemo<{ label: string; detail: string; tone: InputTone }>(() => {
    if (mode !== "text") {
      return {
        label: "Database lookup",
        detail: "GrantPilot will use the grant record from the backend database.",
        tone: "primary"
      };
    }

    if (grantTextWordCount >= 80) {
      return {
        label: "Strong text sample",
        detail: "Enough language to extract meaningful requirements.",
        tone: "secondary"
      };
    }

    if (grantTextWordCount >= 25) {
      return {
        label: "Good start",
        detail: "Add eligibility, deadline, match, or document language if available.",
        tone: "primary"
      };
    }

    return {
      label: "Needs more text",
      detail: "Paste more NOFO language for a better translation.",
      tone: "warning"
    };
  }, [grantTextWordCount, mode]);

  const handleProcess = useCallback(async () => {
    if (!canTranslate) {
      setError("Choose a selected grant, enter a grant ID, or paste grant requirements text.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setCopied(false);

    try {
      const payload: RequirementsPayload =
        mode === "text"
          ? { grant_text: grantText.trim() }
          : { grant_id: mode === "selected" ? selectedGrantId : grantId.trim() };

      const output = await GrantPilotApi.requirements(payload);
      const result = getRecordField(output, "result");

      const translated = Object.keys(getRecordField(result, "requirements")).length
        ? getRecordField(result, "requirements")
        : getRecordField(output, "requirements");

      const grant = getRecordField(result, "selected_grant");

      setRequirements(Object.keys(translated).length ? translated : null);
      setTranslatedGrant(Object.keys(grant).length ? grant : null);
      setTraceId(getStringField(output, "trace_id"));

      if (Object.keys(translated).length) {
        saveJson(STORAGE_KEYS.latestRequirements, translated);
      }

      if (getStringField(output, "trace_id")) {
        saveJson(STORAGE_KEYS.latestTraceId, getStringField(output, "trace_id"));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not translate requirements."));
    } finally {
      setIsProcessing(false);
    }
  }, [canTranslate, grantId, grantText, mode, selectedGrantId]);

  const handleClear = useCallback(() => {
    setGrantText("");
    setGrantId(selectedGrantId);
    setRequirements(null);
    setTranslatedGrant(null);
    setTraceId("");
    setCopied(false);
    setError("");
  }, [selectedGrantId]);

  const useExample = useCallback(() => {
    setMode("text");
    setGrantText(exampleGrantText);
    setRequirements(null);
    setTranslatedGrant(null);
    setTraceId("");
    setCopied(false);
    setError("");
  }, []);

  const copyPlainEnglish = useCallback(async () => {
    if (!requirements) return;

    await navigator.clipboard.writeText(buildReadableRequirementsText(requirements, translatedGrant, traceId));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [requirements, traceId, translatedGrant]);

  const handleExport = useCallback(() => {
    if (!requirements) return;

    const blob = new Blob(
      [
        JSON.stringify(
          {
            selectedGrant: translatedGrant,
            requirements,
            traceId
          },
          null,
          2
        )
      ],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "grantpilot-requirements.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [requirements, traceId, translatedGrant]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="rounded-[2rem] border border-primary/10 bg-bgPanel/75 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-end">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-5">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Requirements Translator agent
              </div>

              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight">
                Translate grant rules into next steps.
              </h1>

              <p className="text-textSecondary mt-3 max-w-3xl leading-relaxed">
                Use a selected grant, a database grant ID, or pasted NOFO text. GrantPilot turns dense
                language into eligibility, required documents, deadlines, match rules, risks, and application steps.
              </p>
            </div>

            <div className="rounded-2xl border border-borderColor bg-bgPanelLight/50 p-4">
              <div className="text-sm font-black text-textPrimary mb-3">
                Recommended workflow
              </div>
              <div className="space-y-2 text-sm text-textSecondary">
                <MiniStep done={Boolean(selectedGrantId)} label="Select grant in Explorer" />
                <MiniStep done={Boolean(requirements)} label="Translate requirements" />
                <MiniStep done={Boolean(requirements)} label="Use in readiness packet" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <ErrorBox message={error} />}

      <section className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-black text-textPrimary">
                  Choose input
                </h2>
                <p className="text-sm text-textSecondary mt-1">
                  Most users should start from a selected grant or grant ID.
                </p>
              </div>

              <InputQualityBadge
                label={inputQuality.label}
                detail={inputQuality.detail}
                tone={inputQuality.tone}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-borderColor bg-bgPanelLight/50 p-1.5 mb-5">
              <ModeButton
                active={mode === "selected"}
                disabled={!selectedGrantId}
                label="Selected"
                onClick={() => {
                  setMode("selected");
                  if (selectedGrantId) {
                    setGrantId(selectedGrantId);
                  }
                }}
              />
              <ModeButton
                active={mode === "id"}
                label="Grant ID"
                onClick={() => setMode("id")}
              />
              <ModeButton
                active={mode === "text"}
                label="Paste text"
                onClick={() => setMode("text")}
              />
            </div>

            {mode === "selected" && (
              <SelectedGrantInput grant={selectedGrantFromExplorer} />
            )}

            {mode === "id" && (
              <div>
                <label className="block text-sm font-black text-textPrimary mb-2">
                  Grant ID
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-textSecondary" />
                  <input
                    value={grantId}
                    onChange={(event) => setGrantId(event.target.value)}
                    placeholder="Example: grantsgov_351567"
                    className="w-full bg-bgPanel/60 border border-borderColor rounded-xl pl-10 pr-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
                  />
                </div>
                <p className="text-xs text-textSecondary mt-2">
                  Find this from Grant Explorer or use a selected grant.
                </p>
              </div>
            )}

            {mode === "text" && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="block text-sm font-black text-textPrimary">
                    Grant requirements text
                  </label>
                  <button
                    onClick={useExample}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Use example
                  </button>
                </div>

                <textarea
                  value={grantText}
                  onChange={(event) => setGrantText(event.target.value)}
                  placeholder="Paste NOFO eligibility, application instructions, deadline, match, and required document text..."
                  className="w-full min-h-[280px] bg-bgPanel/60 border border-borderColor rounded-2xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary resize-y"
                />

                <div className="flex items-center justify-between text-xs text-textSecondary mt-2">
                  <span>{grantTextWordCount} words</span>
                  <span>Longer text usually produces better extraction.</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] gap-3 mt-6">
              <button
                onClick={handleProcess}
                disabled={isProcessing || !canTranslate}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-black transition-colors flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Translate
                  </>
                )}
              </button>

              <button
                onClick={handleClear}
                className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black flex items-center justify-center"
              >
                <X className="w-5 h-5 mr-2" />
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5">
            <h3 className="font-black text-textPrimary flex items-center">
              <Info className="w-5 h-5 mr-2 text-secondary" />
              What to verify manually
            </h3>
            <div className="mt-4 space-y-3 text-sm text-textSecondary">
              <CheckRow text="Official deadline and current status" />
              <CheckRow text="Applicant eligibility for your organization" />
              <CheckRow text="Match or cost-share requirements" />
              <CheckRow text="Required forms and attachments" />
              <CheckRow text="Whether old NOFO text is still valid" />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          {isProcessing ? (
            <LoadingPanel />
          ) : requirements ? (
            <RequirementsResult
              requirements={requirements}
              selectedGrant={translatedGrant}
              traceId={traceId}
              copied={copied}
              onCopy={copyPlainEnglish}
              onExport={handleExport}
            />
          ) : (
            <EmptyResultState />
          )}
        </div>
      </section>
    </div>
  );
});

function RequirementsResult({
  requirements,
  selectedGrant,
  traceId,
  copied,
  onCopy,
  onExport
}: {
  requirements: AnyRecord;
  selectedGrant: AnyRecord | null;
  traceId: string;
  copied: boolean;
  onCopy: () => void;
  onExport: () => void;
}) {
  const summary = getStringField(
    requirements,
    "plain_english_summary",
    "GrantPilot translated the available grant requirements."
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center text-secondary font-black text-sm mb-3">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Requirements translated
            </div>

            <h2 className="text-2xl lg:text-3xl font-black text-textPrimary">
              {getStringField(selectedGrant, "title", "Translated grant requirements")}
            </h2>

            <p className="text-textSecondary mt-3 leading-relaxed max-w-4xl">
              {summary}
            </p>

            {traceId && (
              <div className="text-xs text-textSecondary mt-4">
                Trace: {traceId}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={onCopy}
              className="px-4 py-2.5 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black inline-flex items-center justify-center"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? "Copied" : "Copy summary"}
            </button>

            <button
              onClick={onExport}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black inline-flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ListCard
          title="Eligibility"
          description="Who can apply and what must be true."
          items={requirements.eligibility_requirements}
          icon={<ClipboardCheck className="w-5 h-5 text-primary" />}
        />
        <ListCard
          title="Required documents"
          description="What staff should gather before applying."
          items={requirements.required_documents}
          icon={<FileText className="w-5 h-5 text-primary" />}
        />
        <ListCard
          title="Deadlines"
          description="Date-related requirements to verify."
          items={requirements.deadlines}
          icon={<ClipboardCheck className="w-5 h-5 text-primary" />}
        />
        <ListCard
          title="Match and funding"
          description="Cost-share, award size, and funding limits."
          items={[...asArray(requirements.match_requirements), ...asArray(requirements.funding_limits)]}
          icon={<ClipboardCheck className="w-5 h-5 text-primary" />}
        />
        <ListCard
          title="Application steps"
          description="Likely sequence of work."
          items={requirements.application_steps}
          icon={<ArrowRight className="w-5 h-5 text-primary" />}
        />
        <ListCard
          title="Risk warnings"
          description="Items that need human verification."
          items={requirements.risk_warnings}
          icon={<ShieldAlert className="w-5 h-5 text-amber-500" />}
          warning
        />
      </div>
    </div>
  );
}

function SelectedGrantInput({
  grant
}: {
  grant: GrantRecord | null;
}) {
  if (!grant) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
        <h3 className="font-black text-textPrimary">
          No selected grant found
        </h3>
        <p className="text-sm text-textSecondary mt-2">
          Open Grant Explorer, select a grant, then return here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-borderColor bg-bgPanel/50 p-5">
      <div className="text-xs font-bold text-primary mb-2">
        SELECTED GRANT
      </div>
      <h3 className="font-black text-textPrimary leading-snug">
        {grant.title || "Untitled grant"}
      </h3>
      <p className="text-sm text-textSecondary mt-2">
        {grant.source || "Unknown source"} • {grant.agency || "Agency not listed"}
      </p>
      <p className="text-xs text-textSecondary mt-3">
        ID: {grant.id || "Not available"}
      </p>
    </div>
  );
}

function EmptyResultState() {
  return (
    <div className="glass-panel rounded-2xl p-8 lg:p-10 min-h-[520px] flex items-center justify-center text-center">
      <div className="max-w-xl">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <FileText className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-textPrimary">
          Plain-English requirements will appear here
        </h2>
        <p className="text-textSecondary mt-3 leading-relaxed">
          Translate a grant to get a structured brief that local staff can review:
          eligibility, documents, deadlines, match rules, risks, and application steps.
        </p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="glass-panel rounded-2xl p-8 lg:p-10">
      <h2 className="text-xl font-black text-textPrimary flex items-center mb-5">
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
        Translating grant requirements
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {["Extract rules", "Simplify language", "Flag risks"].map((label) => (
          <div key={label} className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="font-bold text-textPrimary text-sm">
              {label}
            </div>
            <div className="text-xs text-textSecondary mt-1">
              Running...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListCard({
  title,
  description,
  items,
  icon,
  warning = false
}: {
  title: string;
  description: string;
  items: unknown;
  icon: ReactNode;
  warning?: boolean;
}) {
  const list = asArray(items)
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => stripHtml(item))
    .filter(Boolean);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${warning ? "bg-amber-400/10" : "bg-primary/10"}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-black text-textPrimary">
            {title}
          </h3>
          <p className="text-xs text-textSecondary mt-1">
            {description}
          </p>
        </div>
      </div>

      {list.length ? (
        <ul className="space-y-2">
          {list.map((item, index) => (
            <li
              key={`${title}-${index}-${item.slice(0, 24)}`}
              className={`text-sm leading-relaxed flex ${warning ? "text-amber-500" : "text-textSecondary"}`}
            >
              <span className={warning ? "text-amber-500 mr-2" : "text-primary mr-2"}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-textSecondary">
          Not listed in the translated text.
        </p>
      )}
    </div>
  );
}

function ModeButton({
  active,
  disabled = false,
  label,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2.5 text-sm font-black transition-colors ${
        active
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "text-textSecondary hover:text-textPrimary hover:bg-bgPanel disabled:opacity-40 disabled:hover:bg-transparent"
      }`}
    >
      {label}
    </button>
  );
}

function InputQualityBadge({
  label,
  detail,
  tone
}: {
  label: string;
  detail: string;
  tone: InputTone;
}) {
  const className =
    tone === "secondary"
      ? "border-secondary/20 bg-secondary/10 text-secondary"
      : tone === "primary"
        ? "border-primary/20 bg-primary/10 text-primary"
        : "border-amber-400/20 bg-amber-400/10 text-amber-500";

  return (
    <div className={`hidden sm:block rounded-2xl border px-4 py-3 max-w-[190px] ${className}`}>
      <div className="text-sm font-black">
        {label}
      </div>
      <div className="text-xs opacity-90 mt-1 leading-snug">
        {detail}
      </div>
    </div>
  );
}

function MiniStep({
  done,
  label
}: {
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center">
      <span
        className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
          done ? "bg-secondary/15 text-secondary" : "bg-bgPanel border border-borderColor text-textSecondary"
        }`}
      >
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      </span>
      <span className={done ? "text-textPrimary font-bold" : ""}>
        {label}
      </span>
    </div>
  );
}

function CheckRow({
  text
}: {
  text: string;
}) {
  return (
    <div className="flex items-start">
      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-secondary shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function ErrorBox({
  message
}: {
  message: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start">
      <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
      {message}
    </div>
  );
}

function buildReadableRequirementsText(
  requirements: AnyRecord,
  selectedGrant: AnyRecord | null,
  traceId: string
) {
  const lines: string[] = [];

  lines.push(`# ${getStringField(selectedGrant, "title", "Translated grant requirements")}`);
  lines.push("");

  const summary = getStringField(requirements, "plain_english_summary");
  if (summary) {
    lines.push("## Summary");
    lines.push(summary);
    lines.push("");
  }

  addList(lines, "Eligibility", requirements.eligibility_requirements);
  addList(lines, "Required documents", requirements.required_documents);
  addList(lines, "Deadlines", requirements.deadlines);
  addList(lines, "Match requirements", requirements.match_requirements);
  addList(lines, "Funding limits", requirements.funding_limits);
  addList(lines, "Application steps", requirements.application_steps);
  addList(lines, "Risk warnings", requirements.risk_warnings);

  if (traceId) {
    lines.push(`Trace: ${traceId}`);
  }

  return lines.join("\n");
}

function addList(lines: string[], title: string, items: unknown) {
  const list = asArray(items)
    .map((item) => stripHtml(item))
    .filter(Boolean);

  if (!list.length) return;

  lines.push(`## ${title}`);
  list.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
}

export default Translator;