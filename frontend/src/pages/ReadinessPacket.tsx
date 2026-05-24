"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  formatTimestamp,
  getErrorMessage,
  getGrantScore,
  getLatestCandidateGrants,
  getLatestPacket,
  getLatestProjectProfile,
  getRecordField,
  getSelectedGrant,
  getStringField,
  exportJsonFile,
  exportTextFile,
  savePreparedApplication,
  saveSelectedGrant,
  stripHtml
} from "../lib/grantpilotApi";

const documentSuggestions = [
  "photos",
  "meeting notes",
  "cost estimate",
  "engineering memo",
  "budget",
  "map",
  "council resolution"
];

export const ReadinessPacket = memo(function ReadinessPacket() {
  const [projectProfile, setProjectProfile] = useState<AnyRecord | null>(null);
  const [selectedGrant, setSelectedGrant] = useState<GrantRecord | null>(null);
  const [latestCandidates, setLatestCandidates] = useState<GrantRecord[]>([]);
  const [packetResponse, setPacketResponse] = useState<AnyRecord | null>(null);
  const [documentsText, setDocumentsText] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const profile = getLatestProjectProfile();
    const savedGrant = getSelectedGrant();
    const candidates = getLatestCandidateGrants();

    setProjectProfile(profile);
    setSelectedGrant(savedGrant);
    setLatestCandidates(candidates);
    setPacketResponse(getLatestPacket());
    setDocumentsText("photos, meeting notes, cost estimate, location map, preliminary engineering memo");
  }, []);

  const documentsAvailable = useMemo(() => {
    return documentsText
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [documentsText]);

  const result = getRecordField(packetResponse, "result");
  const packet = getRecordField(result, "packet_draft");
  const requirements = getRecordField(result, "requirements");
  const readiness = getRecordField(result, "readiness_gaps");
  const trust = getRecordField(result, "trust_review");
  const packetGrant = Object.keys(getRecordField(result, "selected_grant")).length
    ? (getRecordField(result, "selected_grant") as GrantRecord)
    : selectedGrant;

  const hasProject = Boolean(projectProfile);
  const hasGrant = Boolean(selectedGrant);
  const hasPacket = Boolean(getStringField(packet, "project_title"));

  const readinessScore = getReadinessScore(readiness);
  const readinessTone = getReadinessTone(readinessScore);
  const requiredDocuments = asCleanList(requirements.required_documents);
  const priorityActions = asCleanList(readiness.priority_actions);
  const trustIssues = asCleanList(trust.issues_found);
  const reviewChecklist = asCleanList(packet.human_review_checklist);

  const selectCandidateGrant = useCallback((grant: GrantRecord) => {
    setSelectedGrant(grant);
    saveSelectedGrant(grant);
    setPacketResponse(null);
    setError("");
  }, []);

  const resetLocalPacket = useCallback(() => {
    setPacketResponse(null);
    setError("");
    setCopied(false);
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

  const runPrepareApplication = useCallback(async () => {
    if (!projectProfile) {
      setError("Run Project Intake first so GrantPilot has a project profile.");
      return;
    }

    const grantId = getGrantId(selectedGrant);

    if (!selectedGrant || !grantId) {
      setError("Select a grant before creating a readiness packet.");
      return;
    }

    setIsPreparing(true);
    setError("");
    setPacketResponse(null);

    try {
      const output = await GrantPilotApi.prepareApplication({
        grant_id: grantId,
        project_profile: projectProfile,
        documents_available: documentsAvailable
      });

      setPacketResponse(output);
      savePreparedApplication(output);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not create readiness packet."));
    } finally {
      setIsPreparing(false);
    }
  }, [documentsAvailable, projectProfile, selectedGrant]);

  const packetText = useMemo(() => {
    if (!hasPacket) return "";

    return buildReadablePacketText({
      packet,
      readiness,
      trust,
      requirements,
      grant: packetGrant,
      projectProfile
    });
  }, [hasPacket, packet, packetGrant, projectProfile, readiness, requirements, trust]);

  const exportBaseName = useMemo(() => {
    const title = getStringField(packet, "project_title", "grantpilot-readiness-packet");
    return slugify(title || "grantpilot-readiness-packet");
  }, [packet]);

  const copyPacket = useCallback(async () => {
    if (!hasPacket || !packetText) return;

    await navigator.clipboard.writeText(packetText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [hasPacket, packetText]);

  const downloadMarkdown = useCallback(() => {
    if (!hasPacket || !packetText) return;

    exportTextFile(`${exportBaseName}.md`, packetText, "text/markdown;charset=utf-8");
    setExported("Markdown downloaded");
    window.setTimeout(() => setExported(""), 1800);
  }, [exportBaseName, hasPacket, packetText]);

  const downloadJson = useCallback(() => {
    if (!hasPacket) return;

    exportJsonFile(`${exportBaseName}.json`, {
      generated_at: new Date().toISOString(),
      grant: packetGrant,
      packet,
      requirements,
      readiness,
      trust
    });
    setExported("JSON downloaded");
    window.setTimeout(() => setExported(""), 1800);
  }, [exportBaseName, hasPacket, packet, packetGrant, readiness, requirements, trust]);

  const printPacket = useCallback(() => {
    if (!hasPacket) return;
    window.print();
  }, [hasPacket]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="production-surface rounded-[2rem] overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_410px] gap-7 items-end">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-black mb-5">
                <FileSignature className="w-3.5 h-3.5 mr-2" />
                Public demo · staff-ready grant memo
              </div>

              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight max-w-4xl">
                Review the final grant-readiness memo.
              </h1>

              <p className="text-textSecondary mt-4 max-w-3xl leading-relaxed">
                This sample packet shows the payoff: project case, funding fit, document gaps,
                priority actions, and human verification notes before anyone treats it as submission-ready.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-textSecondary font-black mb-3">
                Packet status
              </div>
              <div className="space-y-2 text-sm text-textSecondary">
                <WorkflowMiniStep done={hasProject} label="Project profile loaded" />
                <WorkflowMiniStep done={hasGrant} label="Grant opportunity selected" />
                <WorkflowMiniStep done={hasPacket} label="Memo generated" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <ErrorBox message={error} />}

      {!hasProject ? (
        <EmptyStartState />
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            <PacketSetupPanel
              projectProfile={projectProfile}
              selectedGrant={selectedGrant}
              latestCandidates={latestCandidates}
              documentsText={documentsText}
              documentsAvailable={documentsAvailable}
              hasPacket={hasPacket}
              isPreparing={isPreparing}
              copied={copied}
              exported={exported}
              onDocumentsTextChange={setDocumentsText}
              onAddDocument={addDocumentSuggestion}
              onSelectGrant={selectCandidateGrant}
              onReset={resetLocalPacket}
              onCreate={runPrepareApplication}
              onCopy={copyPacket}
              onMarkdown={downloadMarkdown}
              onJson={downloadJson}
              onPrint={printPacket}
            />

            {isPreparing && <PacketLoadingPanel />}

            {hasPacket ? (
              <ProfessionalMemo
                packet={packet}
                projectProfile={projectProfile}
                grant={packetGrant}
                readinessScore={readinessScore}
                readinessTone={readinessTone}
                requirements={requirements}
                readiness={readiness}
                trust={trust}
              />
            ) : (
              <NoPacketYet />
            )}
          </div>

          <aside className="xl:sticky xl:top-6 space-y-6">
            {hasPacket ? (
              <>
                <ReadinessScoreCard score={readinessScore} tone={readinessTone} actions={priorityActions} />
                <SideCard
                  icon={<ShieldCheck className="w-5 h-5 mr-2 text-secondary" />}
                  title="Verification needed"
                >
                  <p className="text-sm text-textSecondary leading-relaxed">
                    {getStringField(
                      trust,
                      "safe_final_language",
                      "Human review is needed before treating this packet as final."
                    )}
                  </p>
                  <List title="Issues to verify" items={trustIssues} />
                </SideCard>
                <SideCard
                  icon={<ClipboardCheck className="w-5 h-5 mr-2 text-primary" />}
                  title="Submission checklist"
                >
                  <List title="Required documents" items={requiredDocuments} />
                  <List title="Human review checklist" items={reviewChecklist} />
                </SideCard>
              </>
            ) : (
              <BeforePacketRail
                hasGrant={hasGrant}
                latestCandidates={latestCandidates}
                onSelectGrant={selectCandidateGrant}
              />
            )}
          </aside>
        </section>
      )}
    </div>
  );
});

function PacketSetupPanel({
  projectProfile,
  selectedGrant,
  latestCandidates,
  documentsText,
  documentsAvailable,
  hasPacket,
  isPreparing,
  copied,
  exported,
  onDocumentsTextChange,
  onAddDocument,
  onSelectGrant,
  onReset,
  onCreate,
  onCopy,
  onMarkdown,
  onJson,
  onPrint
}: {
  projectProfile: AnyRecord | null;
  selectedGrant: GrantRecord | null;
  latestCandidates: GrantRecord[];
  documentsText: string;
  documentsAvailable: string[];
  hasPacket: boolean;
  isPreparing: boolean;
  copied: boolean;
  exported: string;
  onDocumentsTextChange: (value: string) => void;
  onAddDocument: (documentName: string) => void;
  onSelectGrant: (grant: GrantRecord) => void;
  onReset: () => void;
  onCreate: () => void;
  onCopy: () => void;
  onMarkdown: () => void;
  onJson: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="glass-panel rounded-2xl p-6 lg:p-7">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-textPrimary">Packet workspace</h2>
          <p className="text-sm text-textSecondary mt-1">
            Confirm the source project, selected opportunity, and known documents before creating the memo.
          </p>
        </div>

        <button
          onClick={onReset}
          disabled={!hasPacket}
          className="px-3 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel disabled:opacity-40 text-textPrimary text-sm font-bold inline-flex items-center self-start"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset memo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SummaryCard
          title="Project"
          badge="From intake"
          items={[
            ["Applicant", getStringField(projectProfile, "applicant_type", "Not available")],
            ["County", getStringField(projectProfile, "county", "Not available")],
            ["Category", getStringField(projectProfile, "project_category", "Not available")],
            ["Description", getStringField(projectProfile, "description", "Not available")]
          ]}
        />

        <SummaryCard
          title="Grant"
          badge={selectedGrant ? "Selected" : "Needed"}
          items={[
            ["Title", selectedGrant?.title || "Select a grant"],
            ["Agency", selectedGrant?.agency || "Not available"],
            ["Due", selectedGrant?.due_date || selectedGrant?.deadline || "Not listed"],
            ["Match", selectedGrant?.match_required || "Unknown"]
          ]}
        />
      </div>

      {!selectedGrant && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
          <h3 className="font-black text-textPrimary mb-2">Pick a grant to prepare against</h3>
          <p className="text-sm text-textSecondary mb-4">
            Choose one of the latest matches or open Grant Explorer to select a different opportunity.
          </p>

          {latestCandidates.length ? (
            <div className="space-y-3">
              {latestCandidates.slice(0, 3).map((grant, index) => (
                <button
                  key={getStableGrantKey(grant, index)}
                  onClick={() => onSelectGrant(grant)}
                  className="w-full text-left p-4 rounded-xl bg-bgPanel/70 border border-borderColor hover:border-primary/40 hover:bg-bgPanelLight transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-textPrimary">{grant.title || "Untitled grant"}</div>
                      <div className="text-xs text-textSecondary mt-1">
                        {grant.source || "Unknown source"} • {grant.agency || "Agency not listed"}
                      </div>
                    </div>
                    {getGrantScore(grant) !== null && (
                      <span className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-black shrink-0">
                        {getGrantScore(grant)}% fit
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Link href="/explorer" className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-white font-bold">
              Select grant in Explorer <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          )}
        </div>
      )}

      <div className="mt-6">
        <label className="text-sm font-black text-textPrimary mb-2 block">
          Documents available <span className="text-textSecondary font-normal">({documentsAvailable.length} listed)</span>
        </label>

        <input
          value={documentsText}
          onChange={(event) => onDocumentsTextChange(event.target.value)}
          className="w-full bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
          placeholder="photos, meeting notes, budget, council resolution"
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {documentSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onAddDocument(item)}
              className="px-3 py-1.5 rounded-full border border-borderColor bg-bgPanel/50 text-xs font-bold text-textSecondary hover:border-primary/40 hover:text-primary transition-colors"
            >
              + {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] gap-3 mt-6">
        <button
          onClick={onCreate}
          disabled={isPreparing || !selectedGrant}
          className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black inline-flex items-center justify-center"
        >
          {isPreparing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating memo...
            </>
          ) : (
            <>
              <FileSignature className="w-5 h-5 mr-2" />
              Create readiness memo
            </>
          )}
        </button>

        <button
          onClick={onCopy}
          disabled={!hasPacket}
          className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel disabled:opacity-40 text-textPrimary font-black inline-flex items-center justify-center"
        >
          <Copy className="w-5 h-5 mr-2" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {hasPacket && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={onMarkdown} className="px-4 py-2.5 rounded-xl border border-borderColor bg-bgPanel/60 hover:bg-bgPanelLight text-textPrimary text-sm font-black inline-flex items-center justify-center">
            <Download className="w-4 h-4 mr-2" />
            Markdown
          </button>
          <button onClick={onJson} className="px-4 py-2.5 rounded-xl border border-borderColor bg-bgPanel/60 hover:bg-bgPanelLight text-textPrimary text-sm font-black inline-flex items-center justify-center">
            <Database className="w-4 h-4 mr-2" />
            JSON
          </button>
          <button onClick={onPrint} className="px-4 py-2.5 rounded-xl border border-borderColor bg-bgPanel/60 hover:bg-bgPanelLight text-textPrimary text-sm font-black inline-flex items-center justify-center">
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </button>
        </div>
      )}

      {exported && <div className="mt-3 text-xs font-bold text-secondary">{exported}</div>}
    </div>
  );
}

function ProfessionalMemo({
  packet,
  projectProfile,
  grant,
  readinessScore,
  readinessTone,
  requirements,
  readiness,
  trust
}: {
  packet: AnyRecord;
  projectProfile: AnyRecord | null;
  grant: GrantRecord | null;
  readinessScore: number;
  readinessTone: string;
  requirements: AnyRecord;
  readiness: AnyRecord;
  trust: AnyRecord;
}) {
  const generatedAt = formatTimestamp(new Date().toISOString());
  const sourceUrl = typeof grant?.source_url === "string" ? grant.source_url : "";
  const dueDate = grant?.due_date || grant?.deadline || "Not listed";
  const readinessLabel = getReadinessLabel(readinessScore);

  return (
    <article className="grant-memo rounded-[1.75rem] overflow-hidden border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/10">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />
              Draft readiness memo
            </div>
            <h2 className="mt-4 text-3xl lg:text-4xl font-black tracking-tight text-slate-950">
              {getStringField(packet, "project_title", "Grant readiness packet")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Prepared by GrantPilot for staff review. This packet summarizes funding fit,
              application readiness, documents needed, and verification items before submission.
            </p>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400 font-black">Generated</div>
            <div className="mt-1 font-bold text-slate-900">{generatedAt}</div>
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400 font-black">Readiness</div>
            <div className={`mt-1 text-2xl font-black ${readinessTone === "strong" ? "text-emerald-700" : readinessTone === "medium" ? "text-blue-700" : "text-amber-700"}`}>
              {readinessScore}/100
            </div>
            <div className="text-xs font-bold text-slate-500">{readinessLabel}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-slate-200">
        <MemoMetric label="Applicant" value={getStringField(projectProfile, "applicant_type", "Not available")} />
        <MemoMetric label="Project category" value={getStringField(projectProfile, "project_category", "Not available")} />
        <MemoMetric label="Grant deadline" value={String(dueDate)} />
        <MemoMetric label="Match requirement" value={String(grant?.match_required || "Unknown")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-0">
        <div className="p-6 lg:p-8 space-y-8">
          <MemoBlock eyebrow="Opportunity" title={grant?.title || "Selected grant opportunity"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <MemoFact label="Agency" value={grant?.agency || "Not listed"} />
              <MemoFact label="Source" value={grant?.source || "Unknown source"} />
              <MemoFact label="Funding amount" value={grant?.funding_amount || "Not listed"} />
              <MemoFact label="Official source" value={sourceUrl ? "Available" : "Not listed"} />
            </div>
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center text-sm font-black text-blue-700 hover:text-blue-900">
                Open official source <ExternalLink className="w-4 h-4 ml-1.5" />
              </a>
            )}
          </MemoBlock>

          <MemoBlock eyebrow="Project case" title="Why this project matters">
            <MemoSection title="Problem statement" body={packet.problem_statement} />
            <MemoSection title="Public benefit" body={packet.public_benefit} />
            <MemoSection title="Funding request summary" body={packet.funding_request_summary} />
          </MemoBlock>

          <MemoBlock eyebrow="Prepared language" title="Council memo starter">
            <MemoSection body={packet.council_memo} />
          </MemoBlock>

          <MemoBlock eyebrow="Action plan" title="Next 30 days">
            <MemoList items={packet.thirty_day_action_plan} ordered />
          </MemoBlock>

          <MemoBlock eyebrow="Community communication" title="Resident FAQ">
            <MemoList items={packet.resident_faq} />
          </MemoBlock>
        </div>

        <div className="border-t xl:border-t-0 xl:border-l border-slate-200 bg-slate-50/80 p-6 lg:p-7 space-y-6">
          <MemoSidePanel title="Required documents" icon={<FileText className="w-4 h-4" />}>
            <MemoList items={requirements.required_documents} compact />
          </MemoSidePanel>

          <MemoSidePanel title="Priority actions" icon={<CalendarDays className="w-4 h-4" />}>
            <MemoList items={readiness.priority_actions} compact />
          </MemoSidePanel>

          <MemoSidePanel title="Human review checklist" icon={<ShieldCheck className="w-4 h-4" />}>
            <MemoList items={packet.human_review_checklist} compact />
          </MemoSidePanel>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center text-sm font-black text-amber-800">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Trust review
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              {getStringField(trust, "safe_final_language", "Verify source details, eligibility, deadline, match, and required documents before submission.")}
            </p>
            <MemoList items={trust.issues_found} compact />
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyStartState() {
  return (
    <div className="rounded-[2rem] border border-borderColor bg-bgPanel/75 p-8 lg:p-10 text-center shadow-xl shadow-black/5">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <FileText className="w-7 h-7 text-primary" />
      </div>

      <h2 className="text-2xl lg:text-3xl font-black text-textPrimary">Sample packet not loaded</h2>

      <p className="text-textSecondary mt-3 max-w-2xl mx-auto leading-relaxed">
        The deployed demo normally loads a saved readiness memo automatically. Use Project Intake to replay the workflow if this page was reset locally.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
        <Link href="/intake" className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black inline-flex items-center">
          Go to Project Intake <ArrowRight className="w-4 h-4 ml-2" />
        </Link>

        <Link href="/explorer" className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black inline-flex items-center">
          Browse grants <Database className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
}

function BeforePacketRail({
  hasGrant,
  latestCandidates,
  onSelectGrant
}: {
  hasGrant: boolean;
  latestCandidates: GrantRecord[];
  onSelectGrant: (grant: GrantRecord) => void;
}) {
  return (
    <>
      <SideCard icon={<ClipboardCheck className="w-5 h-5 mr-2 text-primary" />} title="What this creates">
        <div className="space-y-3 text-sm text-textSecondary">
          <CheckRow text="Professional memo-style packet" />
          <CheckRow text="Readiness score and missing documents" />
          <CheckRow text="Council memo starter language" />
          <CheckRow text="Resident FAQ and action plan" />
          <CheckRow text="Trust Guard verification notes" />
        </div>
      </SideCard>

      {!hasGrant && latestCandidates.length > 0 && (
        <SideCard icon={<Database className="w-5 h-5 mr-2 text-secondary" />} title="Latest matches">
          <div className="space-y-3">
            {latestCandidates.slice(0, 3).map((grant, index) => (
              <button
                key={getStableGrantKey(grant, index)}
                onClick={() => onSelectGrant(grant)}
                className="w-full text-left p-3 rounded-xl border border-borderColor bg-bgPanel/50 hover:border-primary/40 transition-colors"
              >
                <div className="font-bold text-textPrimary text-sm">{grant.title || "Untitled grant"}</div>
                <div className="text-xs text-textSecondary mt-1">{grant.source || "Unknown source"}</div>
              </button>
            ))}
          </div>
        </SideCard>
      )}

      <SideCard icon={<ShieldCheck className="w-5 h-5 mr-2 text-secondary" />} title="Review posture">
        <p className="text-sm text-textSecondary leading-relaxed">
          GrantPilot drafts starter language only. Staff should verify the official deadline,
          eligibility, match, source page, and required documents before submitting anything.
        </p>
      </SideCard>
    </>
  );
}

function NoPacketYet() {
  return (
    <div className="glass-panel rounded-2xl p-8 lg:p-10 overflow-hidden relative">
      <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
      <div className="relative max-w-2xl">
        <h2 className="text-2xl font-black text-textPrimary">Memo preview will appear here</h2>
        <p className="text-textSecondary mt-3 leading-relaxed">
          Confirm the project and selected grant above, add any known documents, then create the readiness memo.
          The final view is designed to look like a staff-facing report for walkthroughs and exports.
        </p>
      </div>
    </div>
  );
}

function PacketLoadingPanel() {
  return (
    <div className="glass-panel rounded-2xl p-6 lg:p-7">
      <h2 className="text-lg font-black text-textPrimary mb-4 flex items-center">
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
        Building readiness memo
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {["Translate requirements", "Find gaps", "Draft memo", "Trust review"].map((item) => (
          <div key={item} className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="text-sm font-bold text-textPrimary">{item}</div>
            <div className="text-xs text-textSecondary mt-1">Running...</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadinessScoreCard({ score, tone, actions }: { score: number; tone: string; actions: unknown }) {
  const toneClass =
    tone === "strong"
      ? "text-secondary bg-secondary/10 border-secondary/20"
      : tone === "medium"
        ? "text-primary bg-primary/10 border-primary/20"
        : "text-amber-500 bg-amber-400/10 border-amber-400/20";

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="text-xl font-black text-textPrimary mb-4 flex items-center">
        <ClipboardCheck className="w-5 h-5 mr-2 text-primary" />
        Readiness score
      </h2>

      <div className={`rounded-2xl border p-5 ${toneClass}`}>
        <div className="text-5xl font-black">{score}</div>
        <div className="text-sm font-bold mt-1">{getReadinessLabel(score)}</div>
      </div>

      <List title="Priority actions" items={actions} />
    </div>
  );
}

function WorkflowMiniStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center">
      <span className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${done ? "bg-secondary/15 text-secondary" : "bg-bgPanel border border-borderColor text-textSecondary"}`}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      </span>
      <span className={done ? "text-textPrimary font-bold" : ""}>{label}</span>
    </div>
  );
}

function CheckRow({ text }: { text: string }) {
  return (
    <div className="flex items-start">
      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-secondary shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function SummaryCard({ title, badge, items }: { title: string; badge: string; items: Array<[string, unknown]> }) {
  return (
    <div className="p-5 rounded-2xl bg-bgPanel/50 border border-borderColor">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-black text-textPrimary">{title}</h3>
        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{badge}</span>
      </div>

      <div className="space-y-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <div className="text-xs text-textSecondary">{label}</div>
            <div className="text-sm text-textPrimary leading-relaxed line-clamp-3">{String(value ?? "Not available")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoMetric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="border-t lg:border-t-0 lg:border-r last:border-r-0 border-slate-200 bg-white p-5">
      <div className="text-xs uppercase tracking-[0.16em] font-black text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-black text-slate-900 line-clamp-2">{String(value || "Not available")}</div>
    </div>
  );
}

function MemoBlock({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="memo-section">
      <div className="text-xs uppercase tracking-[0.2em] font-black text-blue-700">{eyebrow}</div>
      <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function MemoFact({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-[0.14em] font-black text-slate-400">{label}</div>
      <div className="mt-1 font-bold text-slate-900">{String(value || "Not available")}</div>
    </div>
  );
}

function MemoSection({ title, body }: { title?: string; body: unknown }) {
  const text = stripHtml(body);
  if (!text) return null;

  return (
    <section>
      {title && <h4 className="font-black text-slate-900 mb-1">{title}</h4>}
      <p className="text-sm leading-7 text-slate-700">{text}</p>
    </section>
  );
}

function MemoList({ items, ordered = false, compact = false }: { items: unknown; ordered?: boolean; compact?: boolean }) {
  const list = asCleanList(items);
  if (!list.length) return <p className="text-sm text-slate-500">Not available yet.</p>;

  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag className={`${ordered ? "list-decimal" : "list-disc"} pl-5 ${compact ? "space-y-2" : "space-y-3"}`}>
      {list.map((item, index) => (
        <li key={`${item.slice(0, 32)}-${index}`} className={`${compact ? "text-xs leading-5" : "text-sm leading-6"} text-slate-700`}>
          {item}
        </li>
      ))}
    </Tag>
  );
}

function MemoSidePanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="flex items-center gap-2 text-sm font-black text-slate-950 mb-3">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function List({ title, items }: { title: string; items: unknown }) {
  const list = asCleanList(items);
  if (!list.length) return null;

  return (
    <section className="mt-5">
      <h3 className="font-black text-textPrimary mb-2">{title}</h3>
      <ul className="space-y-2">
        {list.map((item, index) => (
          <li key={`${title}-${index}-${item.slice(0, 24)}`} className="text-sm text-textSecondary leading-relaxed flex">
            <span className="text-primary mr-2">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SideCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="text-xl font-black text-textPrimary mb-4 flex items-center">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start">
      <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
      {message}
    </div>
  );
}

function getGrantId(grant: GrantRecord | null) {
  if (!grant) return "";
  return typeof grant.id === "string" ? grant.id.trim() : "";
}

function getStableGrantKey(grant: GrantRecord, index: number) {
  const id = typeof grant.id === "string" ? grant.id.trim() : "";
  const title = String(grant.title || "grant");
  const source = String(grant.source || "source");
  const agency = String(grant.agency || "agency");

  return `${id || title}-${source}-${agency}-${index}`;
}

function getReadinessScore(readiness: AnyRecord) {
  const raw = readiness.readiness_score;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  const parsed = Number.parseInt(String(raw ?? "0"), 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

function getReadinessTone(score: number) {
  if (score >= 70) return "strong";
  if (score >= 40) return "medium";
  return "low";
}

function getReadinessLabel(score: number) {
  if (score >= 70) return "Ready for staff review";
  if (score >= 40) return "Needs a few checks";
  return "Needs verification";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "grantpilot-readiness-packet";
}

function asCleanList(items: unknown) {
  return asArray(items)
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => stripHtml(item))
    .filter(Boolean);
}

function buildReadablePacketText({
  packet,
  readiness,
  trust,
  requirements,
  grant,
  projectProfile
}: {
  packet: AnyRecord;
  readiness: AnyRecord;
  trust: AnyRecord;
  requirements: AnyRecord;
  grant: GrantRecord | null;
  projectProfile: AnyRecord | null;
}) {
  const lines: string[] = [];

  lines.push(`# ${getStringField(packet, "project_title", "Grant readiness packet")}`);
  lines.push("");
  lines.push(`Generated: ${formatTimestamp(new Date().toISOString())}`);
  lines.push(`Applicant: ${getStringField(projectProfile, "applicant_type", "Not available")}`);

  if (grant?.title) {
    lines.push(`Grant: ${grant.title}`);
    lines.push(`Agency: ${grant.agency || "Not listed"}`);
    lines.push(`Source: ${grant.source || "Unknown"}`);
    if (grant.source_url) lines.push(`Official source: ${grant.source_url}`);
  }

  lines.push("");
  addSection(lines, "Problem statement", packet.problem_statement);
  addSection(lines, "Public benefit", packet.public_benefit);
  addSection(lines, "Funding request summary", packet.funding_request_summary);
  addSection(lines, "Council memo starter", packet.council_memo);
  addList(lines, "Resident FAQ", packet.resident_faq);
  addList(lines, "30-day action plan", packet.thirty_day_action_plan);
  addList(lines, "Required documents", requirements.required_documents);
  addList(lines, "Priority actions", readiness.priority_actions);
  addList(lines, "Human review checklist", packet.human_review_checklist);
  addSection(lines, "Trust review", trust.safe_final_language);
  addList(lines, "Issues to verify", trust.issues_found);
  addSection(lines, "Requirements summary", requirements.plain_english_summary);

  return lines.join("\n");
}

function addSection(lines: string[], title: string, body: unknown) {
  const text = stripHtml(body);
  if (!text) return;

  lines.push(`## ${title}`);
  lines.push(text);
  lines.push("");
}

function addList(lines: string[], title: string, items: unknown) {
  const list = asCleanList(items);
  if (!list.length) return;

  lines.push(`## ${title}`);
  list.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
}

export default ReadinessPacket;
