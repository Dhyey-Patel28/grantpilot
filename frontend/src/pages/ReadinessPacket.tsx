"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Copy, FileSignature, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  getErrorMessage,
  getLatestCandidateGrants,
  getLatestProjectProfile,
  getRecordField,
  getSelectedGrant,
  getStringField,
  loadJson,
  savePreparedApplication,
  STORAGE_KEYS,
  stripHtml
} from "../lib/grantpilotApi";

export const ReadinessPacket = memo(function ReadinessPacket() {
  const [projectProfile, setProjectProfile] = useState<AnyRecord | null>(null);
  const [selectedGrant, setSelectedGrant] = useState<GrantRecord | null>(null);
  const [packetResponse, setPacketResponse] = useState<AnyRecord | null>(null);
  const [documentsText, setDocumentsText] = useState("photos, meeting notes");
  const [isPreparing, setIsPreparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const profile = getLatestProjectProfile();
    const savedGrant = getSelectedGrant();
    const latestPacket = loadJson<AnyRecord>(STORAGE_KEYS.latestPacket, null);
    const latestCandidates = getLatestCandidateGrants();

    setProjectProfile(profile);
    setSelectedGrant(savedGrant || latestCandidates[0] || null);
    setPacketResponse(latestPacket);
  }, []);

  const documentsAvailable = useMemo(() => documentsText.split(/[,\n]/).map((item) => item.trim()).filter(Boolean), [documentsText]);

  const runPrepareApplication = useCallback(async () => {
    if (!projectProfile) {
      setError("Run project intake first so GrantPilot has a project profile.");
      return;
    }
    if (!selectedGrant?.id) {
      setError("Select a grant from the Grant Explorer first.");
      return;
    }

    setIsPreparing(true);
    setError("");

    try {
      const output = await GrantPilotApi.prepareApplication({ grant_id: selectedGrant.id, project_profile: projectProfile, documents_available: documentsAvailable });
      setPacketResponse(output);
      savePreparedApplication(output);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not create readiness packet."));
    } finally {
      setIsPreparing(false);
    }
  }, [documentsAvailable, projectProfile, selectedGrant]);

  const copyPacket = useCallback(async () => {
    if (!packetResponse?.result) return;
    const text = JSON.stringify(packetResponse.result, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [packetResponse]);

  const result = getRecordField(packetResponse, "result");
  const packet = getRecordField(result, "packet_draft");
  const requirements = Object.keys(getRecordField(result, "requirements")).length ? getRecordField(result, "requirements") : (loadJson<AnyRecord>(STORAGE_KEYS.latestRequirements, {}) || {});
  const readiness = Object.keys(getRecordField(result, "readiness_gaps")).length ? getRecordField(result, "readiness_gaps") : (loadJson<AnyRecord>(STORAGE_KEYS.latestReadiness, {}) || {});
  const trust = getRecordField(result, "trust_review");
  const grant = Object.keys(getRecordField(result, "selected_grant")).length ? (getRecordField(result, "selected_grant") as GrantRecord) : selectedGrant;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold mb-4"><Sparkles className="w-3.5 h-3.5 mr-2" />Packet Writer + Trust Guard</div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight mb-2">Readiness Packet</h1>
          <p className="text-textSecondary max-w-3xl">Generate a clerk-friendly starter packet: requirements, readiness gaps, council memo, resident FAQ, 30-day action plan, and final trust review.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={copyPacket} disabled={!packetResponse} className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel disabled:opacity-40 text-textPrimary font-semibold inline-flex items-center"><Copy className="w-4 h-4 mr-2" />{copied ? "Copied" : "Copy JSON"}</button>
          <button onClick={runPrepareApplication} disabled={isPreparing} className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold inline-flex items-center disabled:opacity-50">{isPreparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}Create packet</button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {!projectProfile && <Notice title="Start with project intake" body="GrantPilot needs a project profile before it can compare a selected grant against your project." href="/intake" label="Go to intake" />}
      {projectProfile && !selectedGrant && <Notice title="Select a grant" body="Choose a grant from the Explorer before creating a readiness packet." href="/explorer" label="Go to explorer" />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-bold text-textPrimary mb-4">Selected project and grant</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryCard title="Project" items={[["Applicant", getStringField(projectProfile, "applicant_type", "Not available")], ["County", getStringField(projectProfile, "county", "Not available")], ["Category", getStringField(projectProfile, "project_category", "Not available")], ["Description", getStringField(projectProfile, "description", "Not available")]]} />
              <SummaryCard title="Grant" items={[["Title", grant?.title || "Not selected"], ["Source", grant?.source || "Not available"], ["Due", grant?.due_date || grant?.deadline || "Not listed"], ["Match", grant?.match_required || "Unknown"]]} />
            </div>
            <div className="mt-5">
              <label className="text-sm font-semibold text-textPrimary mb-2 block">Documents available</label>
              <input value={documentsText} onChange={(event) => setDocumentsText(event.target.value)} className="w-full bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary" placeholder="photos, meeting notes, budget, council resolution" />
            </div>
          </div>

          {getStringField(packet, "project_title") ? (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center text-secondary text-sm font-semibold mb-3"><CheckCircle2 className="w-5 h-5 mr-2" />Packet draft ready</div>
              <h2 className="text-2xl font-bold text-textPrimary">{getStringField(packet, "project_title")}</h2>
              <Section title="Problem statement" body={packet.problem_statement} />
              <Section title="Public benefit" body={packet.public_benefit} />
              <Section title="Funding request summary" body={packet.funding_request_summary} />
              <Section title="Council memo" body={packet.council_memo} />
              <List title="Resident FAQ" items={packet.resident_faq} />
              <List title="30-day action plan" items={packet.thirty_day_action_plan} />
              <List title="Human review checklist" items={packet.human_review_checklist} />
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 text-textSecondary">Create a packet to see the council memo, resident FAQ, and action plan.</div>
          )}
        </div>

        <div className="space-y-6">
          <SideCard icon={<ClipboardCheck className="w-5 h-5 mr-2 text-primary" />} title="Readiness score"><div className="text-4xl font-bold text-primary">{String(readiness.readiness_score ?? 0)}</div><List title="Priority actions" items={readiness.priority_actions} /></SideCard>
          <SideCard icon={<ShieldCheck className="w-5 h-5 mr-2 text-secondary" />} title="Trust review"><p className="text-sm text-textSecondary">{getStringField(trust, "safe_final_language", "Human review is needed before treating this packet as final.")}</p><List title="Issues" items={trust.issues_found} /></SideCard>
          <SideCard icon={<ClipboardCheck className="w-5 h-5 mr-2 text-primary" />} title="Requirements"><p className="text-sm text-textSecondary">{getStringField(requirements, "plain_english_summary")}</p><List title="Required documents" items={requirements.required_documents} /></SideCard>
        </div>
      </div>
    </div>
  );
});

function Notice({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return <div className="glass-panel rounded-2xl p-6 border border-amber-500/20"><h2 className="text-xl font-bold text-textPrimary mb-2">{title}</h2><p className="text-textSecondary mb-4">{body}</p><Link href={href} className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-white font-semibold">{label} <ArrowRight className="w-4 h-4 ml-2" /></Link></div>;
}

function SummaryCard({ title, items }: { title: string; items: Array<[string, unknown]> }) {
  return <div className="p-4 rounded-xl bg-bgPanel/50 border border-borderColor"><h3 className="font-bold text-textPrimary mb-3">{title}</h3><div className="space-y-2">{items.map(([label, value]) => <div key={label}><div className="text-xs text-textSecondary">{label}</div><div className="text-sm text-textPrimary">{String(value ?? "Not available")}</div></div>)}</div></div>;
}

function Section({ title, body }: { title: string; body: unknown }) {
  if (!body) return null;
  return <div className="mt-5"><h3 className="font-bold text-textPrimary mb-2">{title}</h3><p className="text-textSecondary leading-relaxed">{stripHtml(body)}</p></div>;
}

function List({ title, items }: { title: string; items: unknown }) {
  const list = asArray(items).filter(Boolean);
  if (!list.length) return null;
  return <div className="mt-5"><h3 className="font-bold text-textPrimary mb-2">{title}</h3><ul className="space-y-2">{list.map((item, index) => <li key={index} className="text-sm text-textSecondary">• {stripHtml(item)}</li>)}</ul></div>;
}

function SideCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="glass-panel rounded-2xl p-6"><h2 className="text-xl font-bold text-textPrimary mb-4 flex items-center">{icon}{title}</h2>{children}</div>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start"><AlertTriangle className="w-5 h-5 mr-3 shrink-0" />{message}</div>;
}

export default ReadinessPacket;
