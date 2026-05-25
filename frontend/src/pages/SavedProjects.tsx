"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Database,
  FileText,
  RotateCcw,
  Search,
  Trash2
} from "lucide-react";
import type { AnyRecord, GrantRecord, SavedProjectSnapshot } from "../lib/grantpilotApi";
import {
  deleteSavedProject,
  formatDate,
  getGrantScore,
  getSavedProjects,
  getStringField,
  isPortfolioDemoMode,
  loadStaticPreviewCandidateGrants,
  loadStaticPreviewLatestRun,
  loadStaticPreviewPacket,
  loadStaticPreviewProjectProfile,
  restoreSavedProject,
  stripHtml,
  truncate
} from "../lib/grantpilotApi";

export const SavedProjects = memo(function SavedProjects() {
  const [projects, setProjects] = useState<SavedProjectSnapshot[]>([]);
  const [restoredId, setRestoredId] = useState("");
  const [query, setQuery] = useState("");

  const refresh = useCallback(() => {
    const hydrateProjects = async () => {
      const savedProjects = getSavedProjects();

      if (!isPortfolioDemoMode()) {
        setProjects(savedProjects);
        return;
      }

      const [staticRun, staticProfile, staticCandidates, staticPacket] = await Promise.all([
        loadStaticPreviewLatestRun(),
        loadStaticPreviewProjectProfile(),
        loadStaticPreviewCandidateGrants(10),
        loadStaticPreviewPacket()
      ]);

      const staticProject = buildStaticSavedProject({
        latestRun: staticRun,
        projectProfile: staticProfile,
        candidateGrants: staticCandidates,
        latestPacket: staticPacket
      });

      if (staticProject) {
        setProjects([staticProject]);
        return;
      }

      setProjects(savedProjects);
    };

    void hydrateProjects();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;

    return projects.filter((project) => {
      const haystack = [
        project.title,
        project.description,
        project.trace_id,
        project.project_profile?.county,
        project.project_profile?.project_category,
        ...(project.candidate_grants || []).map((grant) => `${grant.title} ${grant.agency} ${grant.source}`)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [projects, query]);

  const restoreProject = useCallback((projectId: string) => {
    const restored = restoreSavedProject(projectId);
    if (!restored) return;

    setRestoredId(projectId);
    window.setTimeout(() => setRestoredId(""), 1800);
  }, []);

  const removeProject = useCallback((projectId: string) => {
    deleteSavedProject(projectId);
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="rounded-[2rem] border border-secondary/10 bg-bgPanel/75 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-end">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold mb-5">
                <Archive className="w-3.5 h-3.5 mr-2" />
                Project library
              </div>

              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight">
                Saved project workspace.
              </h1>

              <p className="text-textSecondary mt-3 max-w-3xl leading-relaxed">
                GrantPilot includes a saved infrastructure workflow with its project profile,
                ranked grants, selected opportunity, and packet handoff.
              </p>
            </div>

            <div className="rounded-2xl border border-borderColor bg-bgPanelLight/50 p-4">
              <div className="text-sm text-textSecondary">Saved workflows</div>
              <div className="text-3xl font-black text-textPrimary mt-1">{projects.length}</div>
              <div className="text-xs text-textSecondary mt-1">Reference workflow included</div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-4 lg:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-textSecondary" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved projects, grant titles, county, category, or trace id..."
            className="w-full bg-bgPanel/70 border border-borderColor rounded-xl pl-10 pr-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
          />
        </div>
      </section>

      {visibleProjects.length ? (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              restored={restoredId === project.id}
              onRestore={() => restoreProject(project.id)}
              onDelete={() => removeProject(project.id)}
            />
          ))}
        </section>
      ) : (
        <EmptySavedProjects hasProjects={projects.length > 0} />
      )}
    </div>
  );
});

function buildStaticSavedProject({
  latestRun,
  projectProfile,
  candidateGrants,
  latestPacket
}: {
  latestRun: AnyRecord | null;
  projectProfile: AnyRecord | null;
  candidateGrants: GrantRecord[];
  latestPacket: AnyRecord | null;
}): SavedProjectSnapshot | null {
  if (!latestRun && !projectProfile && !candidateGrants.length) return null;

  const title =
    getStringField(projectProfile, "project_title") ||
    "Township stormwater readiness project";

  const description =
    getStringField(projectProfile, "description") ||
    "Saved stormwater road-flooding workflow with ranked grants and a staff-ready readiness packet.";

  return {
    id: "static_stormwater_readiness_workflow",
    title,
    description,
    created_at: getStringField(latestRun, "created_at", "2026-05-25T03:45:12.542Z"),
    updated_at: getStringField(latestRun, "completed_at", new Date().toISOString()),
    trace_id: getStringField(latestRun, "trace_id"),
    documents_available: [
      "photos",
      "meeting notes",
      "preliminary cost estimate",
      "road map",
      "public works observations"
    ],
    project_profile: projectProfile || {},
    candidate_grants: candidateGrants,
    selected_grant: candidateGrants[0] || null,
    latest_run: latestRun as SavedProjectSnapshot["latest_run"],
    latest_packet: latestPacket
  };
}

function ProjectCard({
  project,
  restored,
  onRestore,
  onDelete
}: {
  project: SavedProjectSnapshot;
  restored: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const topGrants = (project.candidate_grants || []).slice(0, 3);
  const profile = project.project_profile || {};

  return (
    <article className="rounded-2xl border border-borderColor bg-bgPanel/75 p-5 shadow-sm hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge icon={<CalendarClock className="w-3.5 h-3.5 mr-1" />} text={formatDate(project.updated_at)} />
            {project.trace_id && <Badge icon={<Database className="w-3.5 h-3.5 mr-1" />} text={`Trace ${project.trace_id}`} />}
          </div>

          <h2 className="text-xl font-black text-textPrimary leading-snug">
            {project.title}
          </h2>
          <p className="text-sm text-textSecondary mt-2 leading-relaxed">
            {truncate(project.description, 260)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs">
        <Metric label="County" value={profile.county || "Unknown"} />
        <Metric label="Category" value={profile.project_category || "Unknown"} />
        <Metric label="Documents" value={project.documents_available.length || "None"} />
        <Metric label="Matches" value={project.candidate_grants?.length || 0} />
      </div>

      {topGrants.length > 0 && (
        <div className="mt-5 rounded-xl border border-borderColor bg-bgPanel/50 p-4">
          <div className="text-sm font-black text-textPrimary mb-3">Top saved matches</div>
          <div className="space-y-2">
            {topGrants.map((grant) => (
              <div key={grant.id || grant.title} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-textSecondary truncate">{stripHtml(grant.title || "Untitled grant")}</span>
                {getGrantScore(grant) !== null && (
                  <span className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-black shrink-0">
                    {getGrantScore(grant)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-5">
        <button
          onClick={onRestore}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-black inline-flex items-center"
        >
          {restored ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
          {restored ? "Restored" : "Restore"}
        </button>
        <Link
          href="/explorer"
          className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary text-sm font-black inline-flex items-center"
        >
          Open matches <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
        <Link
          href="/packet"
          className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary text-sm font-black inline-flex items-center"
        >
          Packet <FileText className="w-4 h-4 ml-2" />
        </Link>
        <button
          onClick={onDelete}
          className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-red-300 text-sm font-black inline-flex items-center"
        >
          Delete <Trash2 className="w-4 h-4 ml-2" />
        </button>
      </div>
    </article>
  );
}

function EmptySavedProjects({ hasProjects }: { hasProjects: boolean }) {
  return (
    <div className="rounded-[2rem] border border-borderColor bg-bgPanel/75 p-8 lg:p-10 text-center shadow-xl shadow-black/5">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <Archive className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-2xl lg:text-3xl font-black text-textPrimary">
        {hasProjects ? "No saved projects match that search" : "No saved projects found"}
      </h2>
      <p className="text-textSecondary mt-3 max-w-2xl mx-auto leading-relaxed">
        This preview normally includes one saved workflow. Clear the search or replay Project Intake to restore it.
      </p>
      <Link
        href="/intake"
        className="mt-7 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black inline-flex items-center"
      >
        Go to Project Intake <ArrowRight className="w-4 h-4 ml-2" />
      </Link>
    </div>
  );
}

function Badge({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="px-2.5 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs font-bold inline-flex items-center max-w-full">
      {icon}
      <span className="truncate">{text}</span>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-borderColor bg-bgPanel/50 p-3">
      <div className="text-textSecondary">{label}</div>
      <div className="text-textPrimary font-black mt-1 truncate">{String(value ?? "Unknown")}</div>
    </div>
  );
}

export default SavedProjects;
