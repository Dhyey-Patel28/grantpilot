"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ExternalLink, FileCheck2, FileText, Loader2, Sparkles } from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  formatCurrencyLike,
  formatDate,
  getArrayField,
  getErrorMessage,
  getLatestProjectProfile,
  getRecordField,
  getStringField,
  saveJson,
  savePreparedApplication,
  saveSelectedGrant,
  STORAGE_KEYS,
  stripHtml
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
    return <div className="max-w-5xl mx-auto glass-panel rounded-2xl p-10 flex items-center justify-center text-textSecondary"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Loading grant detail...</div>;
  }

  if (!grant) {
    return <div className="max-w-5xl mx-auto glass-panel rounded-2xl p-10 text-center"><AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" /><h1 className="text-xl font-bold text-textPrimary">Grant not found</h1><Link href="/explorer" className="text-primary hover:underline mt-4 inline-block">Back to explorer</Link></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/explorer" className="inline-flex items-center text-sm text-textSecondary hover:text-textPrimary"><ArrowLeft className="w-4 h-4 mr-2" />Back to Grant Explorer</Link>
      {error && <ErrorBox message={error} />}

      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">{grant.source || "Unknown source"}</span>
              <span className="px-2 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs">{grant.status || "unknown"}</span>
              {asArray<string>(grant.categories).slice(0, 4).map((category) => <span key={category} className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs">{category}</span>)}
            </div>
            <h1 className="text-3xl font-bold text-textPrimary tracking-tight max-w-4xl">{grant.title}</h1>
            <p className="text-textSecondary mt-2">{grant.agency || "Agency not listed"}</p>
            <p className="text-textSecondary mt-5 max-w-5xl leading-relaxed">{stripHtml(grant.overview || grant.summary)}</p>
          </div>

          <div className="shrink-0 flex flex-col gap-3 min-w-[230px]">
            {grant.source_url && <a href={grant.source_url} target="_blank" rel="noreferrer" className="px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold inline-flex items-center justify-center">Official source <ExternalLink className="w-4 h-4 ml-2" /></a>}
            <button onClick={runPrepareApplication} disabled={isPreparing} className="px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-semibold inline-flex items-center justify-center disabled:opacity-50">{isPreparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Create packet</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <Metric label="Due date" value={formatDate(grant.due_date || grant.deadline)} />
          <Metric label="Funding" value={formatCurrencyLike(grant.funding_amount)} />
          <Metric label="Match" value={grant.match_required || "Unknown"} />
          <Metric label="Source" value={grant.source || "Unknown"} />
          <Metric label="Grant ID" value={grant.id || "Unknown"} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <ActionPanel title="Requirements translator" icon={<FileText className="w-5 h-5 mr-2 text-primary" />} button="Translate requirements" loading={isRequirementsLoading} onClick={runRequirements}>
            {requirements ? <><p className="text-textSecondary mb-4">{getStringField(requirements, "plain_english_summary")}</p><List title="Required documents" items={requirements.required_documents} /></> : <p className="text-textSecondary">Translate this grant into plain-English requirements.</p>}
          </ActionPanel>

          <ActionPanel title="Readiness check" icon={<FileCheck2 className="w-5 h-5 mr-2 text-secondary" />} button="Analyze readiness" loading={isReadinessLoading} onClick={runReadiness}>
            {readiness ? <><div className="text-4xl font-bold text-primary">{String(readiness.readiness_score ?? 0)}</div><List title="Priority actions" items={readiness.priority_actions} /><List title="Needs verification" items={readiness.needs_verification} /></> : <p className="text-textSecondary">Compare the selected grant against your latest project profile.</p>}
          </ActionPanel>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-bold text-textPrimary mb-4">Related grants</h2>
          <div className="space-y-3">
            {related.length ? related.map((item) => <Link key={item.id || item.title} href={`/explorer/${item.id}`} className="block p-3 rounded-xl bg-bgPanel/50 border border-borderColor hover:border-primary/30"><div className="font-semibold text-textPrimary text-sm">{item.title}</div><div className="text-xs text-textSecondary mt-1">{item.source}</div></Link>) : <p className="text-sm text-textSecondary">No related grants found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
});

function ActionPanel({ title, icon, button, loading, onClick, children }: { title: string; icon: ReactNode; button: string; loading: boolean; onClick: () => void; children: ReactNode }) {
  return <div className="glass-panel rounded-2xl p-6"><h2 className="text-xl font-bold text-textPrimary mb-4 flex items-center">{icon}{title}</h2><div className="mb-5">{children}</div><button onClick={onClick} disabled={loading} className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold inline-flex items-center disabled:opacity-50">{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{button}</button></div>;
}

function List({ title, items }: { title: string; items: unknown }) {
  const list = asArray(items).filter(Boolean);
  return <div className="mt-4"><h3 className="font-semibold text-textPrimary mb-2">{title}</h3>{list.length ? <ul className="space-y-1">{list.map((item, index) => <li key={index} className="text-sm text-textSecondary">• {stripHtml(item)}</li>)}</ul> : <p className="text-sm text-textSecondary">Not listed.</p>}</div>;
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className="p-3 rounded-xl bg-bgPanel/50 border border-borderColor"><div className="text-xs text-textSecondary">{label}</div><div className="font-bold text-textPrimary mt-1 break-words">{String(value ?? "Unknown")}</div></div>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start"><AlertTriangle className="w-5 h-5 mr-3 shrink-0" />{message}</div>;
}

export default GrantDetail;
