"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  asRecord,
  formatCurrencyLike,
  formatDate,
  formatRelativeTime,
  getArrayField,
  getErrorMessage,
  getGrantScore,
  getLatestProjectProfile,
  getRecordField,
  getStringField,
  saveJson,
  savePreparedApplication,
  saveSelectedGrant,
  STORAGE_KEYS,
  stripHtml,
  truncate
} from "../lib/grantpilotApi";

export const GrantDetail = memo(function GrantDetail() {
  const params = useParams();
  const router = useRouter();
  const grantId = Array.isArray(params?.id) ? params.id[0] : String(params?.id || "");

  const [grant, setGrant] = useState<GrantRecord | null>(null);
  const [related, setRelated] = useState<GrantRecord[]>([]);
  const [requirements, setRequirements] = useState<AnyRecord | null>(null);
  const [readiness, setReadiness] = useState<AnyRecord | null>(null);
  const [documentsText] = useState("photos, meeting notes");
  const [isLoading, setIsLoading] = useState(true);
  const [isRequirementsLoading, setIsRequirementsLoading] = useState(false);
  const [isReadinessLoading, setIsReadinessLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!grantId) return;

    setIsLoading(true);
    setError("");

    Promise.all([GrantPilotApi.grantDetail(grantId), GrantPilotApi.relatedGrants(grantId, 5).catch(() => null)])
      .then(([grantOutput, relatedOutput]) => {
        setGrant(grantOutput);
        saveSelectedGrant(grantOutput);
        setRelated(getArrayField<GrantRecord>(relatedOutput, "related"));
      })
      .catch((err: unknown) => setError(getErrorMessage(err, "Could not load grant detail.")))
      .finally(() => setIsLoading(false));
  }, [grantId]);

  const projectProfile = useMemo(() => getLatestProjectProfile(), []);
  const documentsAvailable = useMemo(() => documentsText.split(/[,\n]/).map((item) => item.trim()).filter(Boolean), [documentsText]);

  const runRequirements = useCallback(async () => {
    if (!grantId) return;

    setIsRequirementsLoading(true);
    setError("");

    try {
      const output = await GrantPilotApi.requirements({ grant_id: grantId });
      const result = getRecordField(output, "result");
      const translated = Object.keys(getRecordField(result, "requirements")).length ? getRecordField(result, "requirements") : getRecordField(output, "requirements");
      const selectedGrant = getRecordField(result, "selected_grant");
      setRequirements(Object.keys(translated).length ? translated : null);
      if (Object.keys(translated).length) saveJson(STORAGE_KEYS.latestRequirements, translated);
      if (Object.keys(selectedGrant).length) saveSelectedGrant(selectedGrant as GrantRecord);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not translate requirements."));
    } finally {
      setIsRequirementsLoading(false);
    }
  }, [grantId]);

  const runReadiness = useCallback(async () => {
    if (!grantId) return;
    if (!projectProfile) {
      setError("Run project intake first so GrantPilot has a project profile to compare against this grant.");
      return;
    }

    setIsReadinessLoading(true);
    setError("");

    try {
      const output = await GrantPilotApi.readiness({
        grant_id: grantId,
        project_profile: projectProfile,
        translated_requirements: requirements || undefined,
        documents_available: documentsAvailable
      });
      const result = getRecordField(output, "result");
      const translated = getRecordField(result, "requirements");
      const gaps = Object.keys(getRecordField(result, "readiness_gaps")).length ? getRecordField(result, "readiness_gaps") : getRecordField(output, "readiness_gaps");
      if (Object.keys(translated).length) {
        setRequirements(translated);
        saveJson(STORAGE_KEYS.latestRequirements, translated);
      }
      setReadiness(Object.keys(gaps).length ? gaps : null);
      if (Object.keys(gaps).length) saveJson(STORAGE_KEYS.latestReadiness, gaps);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not analyze readiness."));
    } finally {
      setIsReadinessLoading(false);
    }
  }, [documentsAvailable, grantId, projectProfile, requirements]);

  const runPrepareApplication = useCallback(async () => {
    if (!grantId) return;
    if (!projectProfile) {
      setError("Run project intake first so GrantPilot can prepare an application packet.");
      return;
    }

    setIsPreparing(true);
    setError("");

    try {
      const output = await GrantPilotApi.prepareApplication({ grant_id: grantId, project_profile: projectProfile, documents_available: documentsAvailable });
      const result = getRecordField(output, "result");
      setRequirements(getRecordField(result, "requirements"));
      setReadiness(getRecordField(result, "readiness_gaps"));
      savePreparedApplication(output);
      router.push("/packet");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not prepare application packet."));
    } finally {
      setIsPreparing(false);
    }
  }, [documentsAvailable, grantId, projectProfile, router]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto glass-panel rounded-2xl p-10 flex items-center justify-center text-textSecondary">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading selected opportunity...
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="max-w-5xl mx-auto glass-panel rounded-2xl p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-textPrimary">Grant not found</h1>
        <Link href="/explorer" className="text-primary hover:underline mt-4 inline-block">Back to explorer</Link>
      </div>
    );
  }

  const sourceUrl = getSourceUrl(grant);
  const score = getGrantScore(grant);
  const fitReasons = buildFitReasons(grant, projectProfile);
  const reviewChecks = buildReviewChecks(grant, requirements, readiness);
  const overview = stripHtml(grant.overview || grant.summary);

  return (
    <div className="max-w-7xl mx-auto space-y-6 selected-grant-flow">
      <Link href="/explorer" className="inline-flex items-center text-sm text-textSecondary hover:text-textPrimary">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to ranked matches
      </Link>

      {error && <ErrorBox message={error} />}

      <section className="selected-grant-hero rounded-[2rem] border border-primary/10 bg-bgPanel/80 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
            <div>
              <div className="flex flex-wrap gap-2 mb-5">
                <Pill tone="primary">Selected opportunity</Pill>
                <Pill tone="secondary">{score !== null ? `${score}% fit` : "Fit review"}</Pill>
                <Pill>{grant.status || "Status unknown"}</Pill>
                {grant.last_refreshed && <Pill>Refreshed {formatRelativeTime(grant.last_refreshed)}</Pill>}
              </div>

              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight leading-tight max-w-5xl">
                {grant.title}
              </h1>
              <p className="text-textSecondary mt-3 text-lg">
                {grant.agency || "Agency not listed"} • {grant.source || "Unknown source"}
              </p>
              <p className="text-textSecondary mt-6 max-w-5xl leading-relaxed">
                {overview ? truncate(overview, 520) : "No public summary was included in the cached grant record. Open the official source before preparing an application."}
              </p>
            </div>

            <aside className="rounded-2xl border border-borderColor bg-bgPanel/70 p-5 shadow-sm">
              <div className="text-xs font-black text-textSecondary uppercase tracking-[0.2em] mb-4">
                Decision panel
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="Deadline" value={formatDate(grant.due_date || grant.deadline)} />
                <MiniMetric label="Funding" value={formatCurrencyLike(grant.funding_amount)} />
                <MiniMetric label="Match" value={grant.match_required || "Unknown"} />
                <MiniMetric label="Grant ID" value={grant.id || "Unknown"} />
              </div>

              <div className="flex flex-col gap-3 mt-5">
                {sourceUrl && (
                  <a href={sourceUrl} target="_blank" rel="noreferrer" className="px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black inline-flex items-center justify-center">
                    Open official source <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                )}
                <button onClick={runPrepareApplication} disabled={isPreparing} className="px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black inline-flex items-center justify-center disabled:opacity-50">
                  {isPreparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Create readiness packet
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <TrustCard icon={<ShieldCheck className="w-5 h-5" />} title="Source trust" value={sourceUrl ? "Official link available" : "Needs source link"} />
        <TrustCard icon={<BadgeCheck className="w-5 h-5" />} title="Human review" value="Eligibility not guaranteed" />
        <TrustCard icon={<Target className="w-5 h-5" />} title="Project fit" value={score !== null ? `${score}% match signal` : "Review required"} />
        <TrustCard icon={<ClipboardCheck className="w-5 h-5" />} title="Next step" value="Translate, check gaps, then packet" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="space-y-6">
          <article className="glass-panel rounded-2xl p-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-black mb-4">
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
              Why this grant is worth reviewing
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fitReasons.map((reason) => (
                <div key={reason} className="rounded-2xl border border-borderColor bg-bgPanel/50 p-4 flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <p className="text-sm text-textSecondary leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>
          </article>

          <ActionPanel
            title="Translate requirements"
            eyebrow="Requirements Translator"
            icon={<FileText className="w-5 h-5 mr-2 text-primary" />}
            button="Translate requirements"
            loading={isRequirementsLoading}
            onClick={runRequirements}
          >
            {requirements ? (
              <>
                <p className="text-textSecondary mb-4 leading-relaxed">
                  {getStringField(requirements, "plain_english_summary", "GrantPilot translated the public grant record into applicant-friendly requirements.")}
                </p>
                <List title="Required documents" items={requirements.required_documents} />
                <List title="Application steps" items={requirements.application_steps} />
              </>
            ) : (
              <p className="text-textSecondary leading-relaxed">
                Convert NOFO-style language into plain-English eligibility, documents, deadline, match, and risk notes.
              </p>
            )}
          </ActionPanel>

          <ActionPanel
            title="Analyze readiness"
            eyebrow="Readiness Gap Analyzer"
            icon={<FileCheck2 className="w-5 h-5 mr-2 text-secondary" />}
            button="Analyze readiness"
            loading={isReadinessLoading}
            onClick={runReadiness}
          >
            {readiness ? (
              <>
                <div className="flex items-end gap-3 mb-4">
                  <div className="text-5xl font-black text-primary">{String(readiness.readiness_score ?? 0)}</div>
                  <div className="text-sm text-textSecondary pb-2">readiness score</div>
                </div>
                <List title="Priority actions" items={readiness.priority_actions} />
                <List title="Needs verification" items={readiness.needs_verification} />
              </>
            ) : (
              <p className="text-textSecondary leading-relaxed">
                Compare this grant with the latest project profile and identify missing documents, risk flags, and next actions.
              </p>
            )}
          </ActionPanel>
        </div>

        <aside className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-black text-textPrimary mb-4">Review checklist</h2>
            <div className="space-y-3">
              {reviewChecks.map((check) => (
                <div key={check} className="flex gap-3 rounded-xl border border-borderColor bg-bgPanel/45 p-3">
                  <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                  <span className="text-sm text-textSecondary">{check}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border-amber-400/20">
            <div className="flex items-center text-amber-300 font-black mb-3">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Trust Guard note
            </div>
            <p className="text-sm text-textSecondary leading-relaxed">
              Do not present this as guaranteed eligibility or guaranteed funding. Confirm deadline, applicant type, match rules, and official instructions on the source page before submission.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-black text-textPrimary mb-4">Related grants</h2>
            <div className="space-y-3">
              {related.length ? related.map((item) => (
                <Link key={item.id || item.title} href={`/explorer/${item.id}`} className="block p-3 rounded-xl bg-bgPanel/50 border border-borderColor hover:border-primary/30">
                  <div className="font-semibold text-textPrimary text-sm line-clamp-2">{item.title}</div>
                  <div className="text-xs text-textSecondary mt-1">{item.source || "Unknown source"}</div>
                </Link>
              )) : <p className="text-sm text-textSecondary">No related grants found.</p>}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
});

function ActionPanel({
  title,
  eyebrow,
  icon,
  button,
  loading,
  onClick,
  children
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  button: string;
  loading: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="text-xs font-black text-textSecondary uppercase tracking-[0.2em] mb-2">{eyebrow}</div>
      <h2 className="text-2xl font-black text-textPrimary mb-4 flex items-center">{icon}{title}</h2>
      <div className="mb-5">{children}</div>
      <button onClick={onClick} disabled={loading} className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold inline-flex items-center disabled:opacity-50">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {button}
      </button>
    </div>
  );
}

function List({ title, items }: { title: string; items: unknown }) {
  const list = asArray(items).filter(Boolean);
  return (
    <div className="mt-4">
      <h3 className="font-bold text-textPrimary mb-2">{title}</h3>
      {list.length ? (
        <ul className="space-y-2">
          {list.map((item, index) => (
            <li key={index} className="text-sm text-textSecondary flex gap-2">
              <span className="text-primary">•</span>
              <span>{stripHtml(item)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-textSecondary">Not listed yet.</p>}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-borderColor bg-bgPanel/50 p-3 min-w-0">
      <div className="text-[11px] text-textSecondary uppercase tracking-wide">{label}</div>
      <div className="font-black text-textPrimary mt-1 break-words text-sm">{String(value ?? "Unknown")}</div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "primary" | "secondary" | "neutral" }) {
  const classes = tone === "primary"
    ? "bg-primary/10 text-primary border-primary/20"
    : tone === "secondary"
      ? "bg-secondary/10 text-secondary border-secondary/20"
      : "bg-bgPanelLight text-textSecondary border-borderColor";

  return <span className={`px-3 py-1 rounded-full border text-xs font-black ${classes}`}>{children}</span>;
}

function TrustCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-borderColor bg-bgPanel/70 p-4 flex items-start gap-3">
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-black text-textPrimary">{title}</div>
        <div className="text-xs text-textSecondary mt-1">{value}</div>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start"><AlertTriangle className="w-5 h-5 mr-3 shrink-0" />{message}</div>;
}

function getSourceUrl(grant: GrantRecord) {
  const record = asRecord(grant);
  const sourceUrl = record.source_url;
  const website = record.website;

  if (typeof sourceUrl === "string" && sourceUrl.trim()) return sourceUrl;
  if (typeof website === "string" && website.trim()) return website;
  return "";
}

function buildFitReasons(grant: GrantRecord, projectProfile: AnyRecord | null) {
  const reasons: string[] = [];
  const recommendation = String(grant.recommendation || "").trim();
  const score = getGrantScore(grant);
  const projectTitle = String(projectProfile?.project_title || projectProfile?.title || projectProfile?.project_type || "").trim();
  const categories = asArray<string>(grant.categories).filter(Boolean).slice(0, 3);

  if (recommendation) reasons.push(truncate(stripHtml(recommendation), 150));
  if (score !== null && score >= 70) reasons.push("Strong fit score makes this a good first opportunity to review.");
  if (score !== null && score < 70) reasons.push("GrantPilot found a possible fit, but eligibility and source details should be checked before investing time.");
  if (projectTitle) reasons.push(`Compared against the current project profile: ${truncate(projectTitle, 80)}.`);
  if (categories.length) reasons.push(`Category signals include ${categories.join(", ")}.`);
  if (getSourceUrl(grant)) reasons.push("Official source link is available for staff verification.");
  if (grant.last_refreshed) reasons.push(`Record was refreshed ${formatRelativeTime(grant.last_refreshed)}.`);

  return Array.from(new Set(reasons)).slice(0, 4);
}

function buildReviewChecks(grant: GrantRecord, requirements: AnyRecord | null, readiness: AnyRecord | null) {
  const checks = [
    grant.source_url ? "Open the official source and confirm the opportunity is still active." : "Find the official source page before treating this as application-ready.",
    "Verify applicant eligibility, deadline, funding limits, and match rules.",
    requirements ? "Translated requirements are available for review." : "Run Requirements Translator before writing the packet.",
    readiness ? "Readiness gaps have been analyzed against the current project." : "Run readiness analysis to identify missing documents and risks.",
    "Use the packet only as a staff draft; final language needs human review."
  ];

  return checks;
}

export default GrantDetail;
