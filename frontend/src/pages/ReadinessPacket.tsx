"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  FileSignature,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  getErrorMessage,
  getGrantScore,
  getLatestCandidateGrants,
  getLatestProjectProfile,
  getRecordField,
  getSelectedGrant,
  getStringField,
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
  const [error, setError] = useState("");

  useEffect(() => {
    const profile = getLatestProjectProfile();
    const savedGrant = getSelectedGrant();
    const candidates = getLatestCandidateGrants();

    setProjectProfile(profile);
    setSelectedGrant(savedGrant);
    setLatestCandidates(candidates);
    setPacketResponse(null);
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

  const copyPacket = useCallback(async () => {
    if (!hasPacket) return;

    const text = buildReadablePacketText({
      packet,
      readiness,
      trust,
      requirements,
      grant: packetGrant
    });

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [hasPacket, packet, packetGrant, readiness, requirements, trust]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="rounded-[2rem] border border-secondary/10 bg-bgPanel/75 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-end">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold mb-5">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Packet Writer + Trust Guard
              </div>

              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight">
                Build a review-ready starter packet.
              </h1>

              <p className="text-textSecondary mt-3 max-w-3xl leading-relaxed">
                Turn one selected grant and one project profile into requirements, readiness gaps,
                council memo language, resident FAQ, a 30-day action plan, and trust-reviewed caveats.
              </p>
            </div>

            <div className="rounded-2xl border border-borderColor bg-bgPanelLight/50 p-4">
              <div className="text-sm font-black text-textPrimary mb-3">
                Packet workflow
              </div>
              <div className="space-y-2 text-sm text-textSecondary">
                <WorkflowMiniStep done={hasProject} label="Project profile" />
                <WorkflowMiniStep done={hasGrant} label="Grant selected" />
                <WorkflowMiniStep done={hasPacket} label="Packet generated" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <ErrorBox message={error} />}

      {!hasProject ? (
        <EmptyStartState />
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            <div className="glass-panel rounded-2xl p-6 lg:p-7">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-textPrimary">
                    Confirm the packet context
                  </h2>
                  <p className="text-sm text-textSecondary mt-1">
                    GrantPilot will only generate a packet after you confirm the project and grant.
                  </p>
                </div>

                <button
                  onClick={resetLocalPacket}
                  disabled={!hasPacket}
                  className="px-3 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel disabled:opacity-40 text-textPrimary text-sm font-bold inline-flex items-center self-start"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset packet
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
                    ["Source", selectedGrant?.source || "Not available"],
                    ["Due", selectedGrant?.due_date || selectedGrant?.deadline || "Not listed"],
                    ["Match", selectedGrant?.match_required || "Unknown"]
                  ]}
                />
              </div>

              {!selectedGrant && (
                <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
                  <h3 className="font-black text-textPrimary mb-2">
                    Pick a grant to prepare against
                  </h3>
                  <p className="text-sm text-textSecondary mb-4">
                    Choose one of the latest matches or open the Grant Explorer to select a different opportunity.
                  </p>

                  {latestCandidates.length ? (
                    <div className="space-y-3">
                      {latestCandidates.slice(0, 3).map((grant, index) => (
                        <button
                          key={getStableGrantKey(grant, index)}
                          onClick={() => selectCandidateGrant(grant)}
                          className="w-full text-left p-4 rounded-xl bg-bgPanel/70 border border-borderColor hover:border-primary/40 hover:bg-bgPanelLight transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-black text-textPrimary">
                                {grant.title || "Untitled grant"}
                              </div>
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
                    <Link
                      href="/explorer"
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-white font-bold"
                    >
                      Select grant in Explorer <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-6">
                <label className="text-sm font-black text-textPrimary mb-2 block">
                  Documents available <span className="text-textSecondary font-normal">(optional)</span>
                </label>

                <input
                  value={documentsText}
                  onChange={(event) => setDocumentsText(event.target.value)}
                  className="w-full bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
                  placeholder="photos, meeting notes, budget, council resolution"
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

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] gap-3 mt-6">
                <button
                  onClick={runPrepareApplication}
                  disabled={isPreparing || !selectedGrant}
                  className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black inline-flex items-center justify-center"
                >
                  {isPreparing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating packet...
                    </>
                  ) : (
                    <>
                      <FileSignature className="w-5 h-5 mr-2" />
                      Create packet
                    </>
                  )}
                </button>

                <button
                  onClick={copyPacket}
                  disabled={!hasPacket}
                  className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel disabled:opacity-40 text-textPrimary font-black inline-flex items-center justify-center"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {isPreparing && <PacketLoadingPanel />}

            {hasPacket ? (
              <PacketDraft packet={packet} />
            ) : (
              <NoPacketYet />
            )}
          </div>

          <aside className="xl:sticky xl:top-6 space-y-6">
            {hasPacket ? (
              <>
                <ReadinessScoreCard score={readinessScore} tone={readinessTone} actions={readiness.priority_actions} />
                <SideCard
                  icon={<ShieldCheck className="w-5 h-5 mr-2 text-secondary" />}
                  title="Trust review"
                >
                  <p className="text-sm text-textSecondary leading-relaxed">
                    {getStringField(
                      trust,
                      "safe_final_language",
                      "Human review is needed before treating this packet as final."
                    )}
                  </p>
                  <List title="Issues to verify" items={trust.issues_found} />
                </SideCard>
                <SideCard
                  icon={<ClipboardCheck className="w-5 h-5 mr-2 text-primary" />}
                  title="Requirements"
                >
                  <p className="text-sm text-textSecondary leading-relaxed">
                    {getStringField(
                      requirements,
                      "plain_english_summary",
                      "Create a packet to translate grant requirements."
                    )}
                  </p>
                  <List title="Required documents" items={requirements.required_documents} />
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

function EmptyStartState() {
  return (
    <div className="rounded-[2rem] border border-borderColor bg-bgPanel/75 p-8 lg:p-10 text-center shadow-xl shadow-black/5">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <FileText className="w-7 h-7 text-primary" />
      </div>

      <h2 className="text-2xl lg:text-3xl font-black text-textPrimary">
        Start with Project Intake
      </h2>

      <p className="text-textSecondary mt-3 max-w-2xl mx-auto leading-relaxed">
        The readiness packet should not guess from old runs. First create a project profile,
        then select a grant, then generate a packet for that specific pairing.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
        <Link
          href="/intake"
          className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black inline-flex items-center"
        >
          Go to Project Intake <ArrowRight className="w-4 h-4 ml-2" />
        </Link>

        <Link
          href="/explorer"
          className="px-5 py-3 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary font-black inline-flex items-center"
        >
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
      <SideCard
        icon={<ClipboardCheck className="w-5 h-5 mr-2 text-primary" />}
        title="What this creates"
      >
        <div className="space-y-3 text-sm text-textSecondary">
          <CheckRow text="Plain-English requirements" />
          <CheckRow text="Readiness score and missing documents" />
          <CheckRow text="Council memo starter language" />
          <CheckRow text="Resident FAQ" />
          <CheckRow text="30-day action plan" />
          <CheckRow text="Trust Guard review language" />
        </div>
      </SideCard>

      {!hasGrant && latestCandidates.length > 0 && (
        <SideCard
          icon={<Database className="w-5 h-5 mr-2 text-secondary" />}
          title="Latest matches"
        >
          <div className="space-y-3">
            {latestCandidates.slice(0, 3).map((grant, index) => (
              <button
                key={getStableGrantKey(grant, index)}
                onClick={() => onSelectGrant(grant)}
                className="w-full text-left p-3 rounded-xl border border-borderColor bg-bgPanel/50 hover:border-primary/40 transition-colors"
              >
                <div className="font-bold text-textPrimary text-sm">
                  {grant.title || "Untitled grant"}
                </div>
                <div className="text-xs text-textSecondary mt-1">
                  {grant.source || "Unknown source"}
                </div>
              </button>
            ))}
          </div>
        </SideCard>
      )}

      <SideCard
        icon={<ShieldCheck className="w-5 h-5 mr-2 text-secondary" />}
        title="Review posture"
      >
        <p className="text-sm text-textSecondary leading-relaxed">
          GrantPilot drafts starter language only. Staff should verify the official deadline,
          eligibility, match, source page, and required documents before submitting anything.
        </p>
      </SideCard>
    </>
  );
}

function PacketDraft({ packet }: { packet: AnyRecord }) {
  return (
    <div className="glass-panel rounded-2xl p-6 lg:p-7">
      <div className="flex items-center text-secondary text-sm font-black mb-3">
        <CheckCircle2 className="w-5 h-5 mr-2" />
        Packet draft ready
      </div>

      <h2 className="text-2xl lg:text-3xl font-black text-textPrimary">
        {getStringField(packet, "project_title", "Readiness packet")}
      </h2>

      <div className="mt-6 space-y-6">
        <Section title="Problem statement" body={packet.problem_statement} />
        <Section title="Public benefit" body={packet.public_benefit} />
        <Section title="Funding request summary" body={packet.funding_request_summary} />
        <Section title="Council memo" body={packet.council_memo} />
        <List title="Resident FAQ" items={packet.resident_faq} />
        <List title="30-day action plan" items={packet.thirty_day_action_plan} />
        <List title="Human review checklist" items={packet.human_review_checklist} />
      </div>
    </div>
  );
}

function NoPacketYet() {
  return (
    <div className="glass-panel rounded-2xl p-8 lg:p-10">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-black text-textPrimary">
          No packet generated yet
        </h2>
        <p className="text-textSecondary mt-3 leading-relaxed">
          Confirm the project and selected grant above, add any known documents, then create the
          readiness packet. This page will stay clean until you intentionally generate a packet.
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
        Building readiness packet
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {["Translate requirements", "Find gaps", "Draft packet", "Trust review"].map((item) => (
          <div key={item} className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="text-sm font-bold text-textPrimary">
              {item}
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

function ReadinessScoreCard({
  score,
  tone,
  actions
}: {
  score: number;
  tone: string;
  actions: unknown;
}) {
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
        <div className="text-5xl font-black">
          {score}
        </div>
        <div className="text-sm font-bold mt-1">
          {score >= 70 ? "Ready for staff review" : score >= 40 ? "Needs a few checks" : "Needs verification"}
        </div>
      </div>

      <List title="Priority actions" items={actions} />
    </div>
  );
}

function WorkflowMiniStep({ done, label }: { done: boolean; label: string }) {
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

function CheckRow({ text }: { text: string }) {
  return (
    <div className="flex items-start">
      <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-secondary shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function SummaryCard({
  title,
  badge,
  items
}: {
  title: string;
  badge: string;
  items: Array<[string, unknown]>;
}) {
  return (
    <div className="p-5 rounded-2xl bg-bgPanel/50 border border-borderColor">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-black text-textPrimary">
          {title}
        </h3>
        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
          {badge}
        </span>
      </div>

      <div className="space-y-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <div className="text-xs text-textSecondary">
              {label}
            </div>
            <div className="text-sm text-textPrimary leading-relaxed">
              {String(value ?? "Not available")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  body
}: {
  title: string;
  body: unknown;
}) {
  const text = stripHtml(body);

  if (!text) return null;

  return (
    <section>
      <h3 className="font-black text-textPrimary mb-2">
        {title}
      </h3>
      <p className="text-textSecondary leading-relaxed">
        {text}
      </p>
    </section>
  );
}

function List({
  title,
  items
}: {
  title: string;
  items: unknown;
}) {
  const list = asArray(items)
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => stripHtml(item))
    .filter(Boolean);

  if (!list.length) return null;

  return (
    <section className="mt-5">
      <h3 className="font-black text-textPrimary mb-2">
        {title}
      </h3>
      <ul className="space-y-2">
        {list.map((item, index) => (
          <li
            key={`${title}-${index}-${item.slice(0, 24)}`}
            className="text-sm text-textSecondary leading-relaxed flex"
          >
            <span className="text-primary mr-2">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SideCard({
  icon,
  title,
  children
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
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

function buildReadablePacketText({
  packet,
  readiness,
  trust,
  requirements,
  grant
}: {
  packet: AnyRecord;
  readiness: AnyRecord;
  trust: AnyRecord;
  requirements: AnyRecord;
  grant: GrantRecord | null;
}) {
  const lines: string[] = [];

  lines.push(`# ${getStringField(packet, "project_title", "Readiness packet")}`);
  lines.push("");

  if (grant?.title) {
    lines.push(`Grant: ${grant.title}`);
    lines.push("");
  }

  addSection(lines, "Problem statement", packet.problem_statement);
  addSection(lines, "Public benefit", packet.public_benefit);
  addSection(lines, "Funding request summary", packet.funding_request_summary);
  addSection(lines, "Council memo", packet.council_memo);
  addList(lines, "Resident FAQ", packet.resident_faq);
  addList(lines, "30-day action plan", packet.thirty_day_action_plan);
  addList(lines, "Human review checklist", packet.human_review_checklist);
  addList(lines, "Priority actions", readiness.priority_actions);
  addSection(lines, "Trust review", trust.safe_final_language);
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
  const list = asArray(items)
    .map((item) => stripHtml(item))
    .filter(Boolean);

  if (!list.length) return;

  lines.push(`## ${title}`);
  list.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
}

export default ReadinessPacket;