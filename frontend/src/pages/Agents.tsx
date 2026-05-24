"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileSignature,
  FileText,
  GitBranch,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";

type AgentStatus = "waiting" | "processing" | "complete";

type AgentNode = {
  id: string;
  name: string;
  role: string;
  icon: typeof Bot;
  output: string;
};

const agentNodes: AgentNode[] = [
  {
    id: "profiler",
    name: "Project Profiler",
    role: "Turns rough notes into structured project data.",
    icon: BrainCircuit,
    output: "Normalized applicant type, project category, location, scope, funding need, and public benefit signals."
  },
  {
    id: "extractor",
    name: "Document Extractor",
    role: "Finds project candidates inside minutes, notes, agendas, and PDFs.",
    icon: FileSearch,
    output: "Extracted possible project records and separated actionable projects from background discussion."
  },
  {
    id: "judge",
    name: "Grant Relevance Judge",
    role: "Keeps, downranks, or rejects matches based on fit and mismatch risk.",
    icon: Target,
    output: "Reviewed top scored grants and kept the opportunities with direct infrastructure and resilience relevance."
  },
  {
    id: "explainer",
    name: "Match Explainer",
    role: "Explains why a grant is worth reviewing in plain language.",
    icon: Search,
    output: "Generated fit reasons, concerns, source checks, missing documents, and recommended next steps."
  },
  {
    id: "translator",
    name: "Requirements Translator",
    role: "Translates NOFO and source text into eligibility, deadlines, match, and documents.",
    icon: FileText,
    output: "Converted dense grant language into required documents, eligibility notes, match rules, risks, and application steps."
  },
  {
    id: "readiness",
    name: "Readiness Gap Analyzer",
    role: "Compares the project against translated requirements.",
    icon: ClipboardCheck,
    output: "Calculated readiness, identified missing evidence, and prioritized the next items to gather before applying."
  },
  {
    id: "packet",
    name: "Packet Writer",
    role: "Creates the staff-facing readiness memo and application starter packet.",
    icon: FileSignature,
    output: "Prepared a project case, funding summary, council memo starter, resident FAQ, and 30-day action plan."
  },
  {
    id: "trust",
    name: "Trust Guard",
    role: "Flags overclaims, weak source support, closed grants, and verification needs.",
    icon: ShieldCheck,
    output: "Added review warnings so the final packet stays safe, source-aware, and human-verifiable."
  }
];

export const Agents = memo(function Agents() {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(() =>
    Object.fromEntries(agentNodes.map((node) => [node.id, "complete"])) as Record<string, AgentStatus>
  );
  const [activeOutput, setActiveOutput] = useState<string>(agentNodes[0].id);
  const [isRunning, setIsRunning] = useState(false);

  const activeAgent = useMemo(
    () => agentNodes.find((node) => node.id === activeOutput) || agentNodes[0],
    [activeOutput]
  );

  const completedCount = agentNodes.filter((node) => statuses[node.id] === "complete").length;

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    setStatuses(Object.fromEntries(agentNodes.map((node) => [node.id, "waiting"])) as Record<string, AgentStatus>);

    const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    for (const node of agentNodes) {
      setActiveOutput(node.id);
      setStatuses((previous) => ({ ...previous, [node.id]: "processing" }));
      await delay(850);
      setStatuses((previous) => ({ ...previous, [node.id]: "complete" }));
      await delay(240);
    }

    setIsRunning(false);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="production-surface rounded-[2rem] overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-7 items-end">
            <div>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black mb-5">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Multi-agent review trace
              </div>
              <h1 className="text-4xl lg:text-6xl font-black text-textPrimary tracking-tight leading-[0.95] max-w-4xl">
                Specialist agents turn a grant search into a reviewable plan.
              </h1>
              <p className="text-textSecondary mt-5 max-w-3xl leading-relaxed text-base lg:text-lg">
                This page shows the full specialist chain as a completed review trace. GrantPilot keeps database scoring separate from the AI layer, then uses agents to explain, translate, check, and prepare outputs for human review.
              </p>
            </div>

            <div className="rounded-3xl border border-borderColor bg-bgPanel/80 p-5 shadow-xl shadow-black/5">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-textSecondary">Review trace status</div>
              <div className="mt-3 text-4xl font-black text-textPrimary">{completedCount}/{agentNodes.length}</div>
              <p className="text-sm text-textSecondary mt-2">specialist reviews complete in the saved trace</p>
              <button
                onClick={runWorkflow}
                disabled={isRunning}
                className="mt-5 w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-black transition-colors shadow-lg shadow-primary/20 flex items-center justify-center"
              >
                {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                {isRunning ? "Running agents" : "Replay review trace"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="glass-panel rounded-[2rem] p-6 lg:p-7 overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-textPrimary flex items-center">
                <GitBranch className="w-6 h-6 text-primary mr-2" />
                Agent chain
              </h2>
              <p className="text-sm text-textSecondary mt-1">Each agent owns one review task; the saved trace is complete so reviewers can inspect the outputs immediately.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentNodes.map((node, index) => {
              const status = statuses[node.id];
              const Icon = node.icon;
              return (
                <button
                  key={node.id}
                  onClick={() => setActiveOutput(node.id)}
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    activeOutput === node.id
                      ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-borderColor bg-bgPanel/65 hover:border-primary/30 hover:bg-bgPanelLight"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      status === "complete"
                        ? "bg-secondary/10 text-secondary"
                        : status === "processing"
                          ? "bg-primary/10 text-primary animate-pulse"
                          : "bg-bgPanelLight text-textSecondary"
                    }`}>
                      {status === "complete" ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary">{String(index + 1).padStart(2, "0")}</span>
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-textSecondary">{status}</span>
                      </div>
                      <h3 className="font-black text-textPrimary mt-1">{node.name}</h3>
                      <p className="text-sm text-textSecondary mt-1 leading-relaxed">{node.role}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 space-y-6">
          <div className="rounded-[2rem] border border-borderColor bg-bgPanel/75 p-6 shadow-xl shadow-black/5">
            <div className="flex items-center text-sm font-black text-primary mb-3">
              <Bot className="w-5 h-5 mr-2" />
              Active agent output
            </div>
            <h3 className="text-2xl font-black text-textPrimary">{activeAgent.name}</h3>
            <p className="text-sm text-textSecondary leading-relaxed mt-2">{activeAgent.role}</p>
            <div className="mt-5 rounded-2xl border border-borderColor bg-bgPanelLight/70 p-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-textSecondary mb-2">Structured output</div>
              <p className="text-sm leading-relaxed text-textPrimary font-medium">{activeAgent.output}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-secondary/20 bg-secondary/5 p-6">
            <h3 className="font-black text-textPrimary flex items-center">
              <BadgeCheck className="w-5 h-5 mr-2 text-secondary" />
              Why this matters
            </h3>
            <p className="text-sm text-textSecondary leading-relaxed mt-3">
              The agent layer does not replace official review. It makes the work inspectable: what matched, why it matched,
              what is missing, and what a human should verify next.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
});

export default Agents;
