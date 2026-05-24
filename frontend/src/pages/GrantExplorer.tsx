"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Database,
  ExternalLink,
  FileCheck2,
  Filter,
  GitCompare,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X
} from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asRecord,
  formatCurrencyLike,
  formatDate,
  formatRelativeTime,
  getArrayField,
  getErrorMessage,
  getGrantScore,
  getLatestCandidateGrants,
  getLatestProjectProfile,
  getLatestRun,
  isPortfolioDemoMode,
  saveSelectedGrant,
  stripHtml,
  truncate
} from "../lib/grantpilotApi";

type ExplorerMode = "database" | "latest";
type SortMode = "relevance" | "fit" | "deadline" | "freshness";

const MAX_COMPARE_SELECTIONS = 3;

const quickSearchTerms = [
  "bridge",
  "drainage",
  "water",
  "transportation",
  "rural",
  "energy",
  "housing",
  "broadband"
];

export const GrantExplorer = memo(function GrantExplorer() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [onlyActionable, setOnlyActionable] = useState(true);
  const [mode, setMode] = useState<ExplorerMode>("database");
  const [facets, setFacets] = useState<AnyRecord | null>(null);
  const [databaseGrants, setDatabaseGrants] = useState<GrantRecord[]>([]);
  const [latestMatches, setLatestMatches] = useState<GrantRecord[]>([]);
  const [latestRun, setLatestRun] = useState<AnyRecord | null>(null);
  const [databaseMeta, setDatabaseMeta] = useState<AnyRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<AnyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState("");

  const comparePanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedRun = getLatestRun();
    const latestGrants = getLatestCandidateGrants();

    setLatestRun(savedRun);
    setLatestMatches(latestGrants);
    setMode(latestGrants.length ? "latest" : "database");

    GrantPilotApi.facets()
      .then((output) => setFacets(asRecord(output)))
      .catch(() => setFacets(null));
  }, []);

  const loadDatabaseGrants = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const firstOutput = asRecord(
        await GrantPilotApi.listGrants({
          query: "",
          source,
          status,
          category,
          page: 1,
          limit: 100
        })
      );

      const firstItems = getArrayField<GrantRecord>(firstOutput, "items");
      const rawTotal = firstOutput.total;
      const total =
        typeof rawTotal === "number"
          ? rawTotal
          : Number.parseInt(String(rawTotal ?? firstItems.length), 10);

      const safeTotal = Number.isFinite(total) && total > 0 ? total : firstItems.length;
      const totalPages = Math.min(8, Math.max(1, Math.ceil(safeTotal / 100)));
      const allItems = [...firstItems];

      for (let page = 2; page <= totalPages; page += 1) {
        const pageOutput = asRecord(
          await GrantPilotApi.listGrants({
            query: "",
            source,
            status,
            category,
            page,
            limit: 100
          })
        );

        allItems.push(...getArrayField<GrantRecord>(pageOutput, "items"));
      }

      setDatabaseGrants(dedupeGrants(allItems.length ? allItems : getLatestCandidateGrants()));
      setDatabaseMeta(firstOutput);
      setMode("database");
    } catch (err: unknown) {
      setDatabaseGrants(getLatestCandidateGrants());
      setDatabaseMeta({ total: getLatestCandidateGrants().length, mode: "guided_preview" });
      setError(isPortfolioDemoMode() ? "" : getErrorMessage(err, "Could not load grants."));
    } finally {
      setIsLoading(false);
    }
  }, [category, source, status]);

  useEffect(() => {
    if (mode !== "database") {
      return;
    }

    void loadDatabaseGrants();
  }, [loadDatabaseGrants, mode]);

  const activeGrants = mode === "database" ? databaseGrants : latestMatches;

  const visibleGrants = useMemo(() => {
    return sortGrants(
      filterAndRankGrants(activeGrants, query).filter((grant) => {
        if (!onlyActionable) return true;
        return !isProbablyClosed(grant);
      }),
      sortMode
    );
  }, [activeGrants, onlyActionable, query, sortMode]);

  const grantLookup = useMemo(() => {
    const lookup = new Map<string, GrantRecord>();

    for (const grant of [...databaseGrants, ...latestMatches]) {
      const id = getGrantId(grant);
      if (id) {
        lookup.set(id, grant);
      }
    }

    return lookup;
  }, [databaseGrants, latestMatches]);

  const selectedGrants = useMemo(() => {
    return selectedIds
      .map((id) => grantLookup.get(id))
      .filter((grant): grant is GrantRecord => Boolean(grant));
  }, [grantLookup, selectedIds]);

  const facetsRecord = asRecord(facets);
  const hasLatestMatches = latestMatches.length > 0;
  const totalDatabaseCount = getDisplayTotal(databaseMeta, databaseGrants.length);
  const resultCountText =
    mode === "database"
      ? `${visibleGrants.length} of ${totalDatabaseCount} grant records`
      : `${visibleGrants.length} project matches`;
  const topGrant = visibleGrants[0] || null;
  const activeProjectProfile = getLatestProjectProfile();

  const clearComparisonAndSelection = useCallback(() => {
    setCompareResult(null);
    setSelectedIds([]);
    setError("");
  }, []);

  const openLatestMatches = useCallback(() => {
    setMode("latest");
    setError("");
    setCompareResult(null);
    setSelectedIds([]);
    setLatestRun(getLatestRun());
    setLatestMatches(getLatestCandidateGrants());
  }, []);

  const openDatabase = useCallback(() => {
    setMode("database");
    setError("");
    setCompareResult(null);
    setSelectedIds([]);
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSource("");
    setStatus("");
    setCategory("");
    setSortMode("relevance");
    setOnlyActionable(true);
    setError("");
  }, []);

  const toggleSelected = useCallback((grant: GrantRecord) => {
    const id = getGrantId(grant);
    if (!id) return;

    setCompareResult(null);
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        setError("");
        return previous.filter((item) => item !== id);
      }

      if (previous.length >= MAX_COMPARE_SELECTIONS) {
        setError(`You can compare up to ${MAX_COMPARE_SELECTIONS} grants at a time. Clear one selection to add another.`);
        return previous;
      }

      setError("");
      return [...previous, id];
    });
  }, []);

  const compareSelected = useCallback(async () => {
    if (selectedGrants.length < 2) {
      setError("Select at least two grants to compare.");
      return;
    }

    setIsComparing(true);
    setError("");

    const projectProfile = getLatestProjectProfile();

    if (!projectProfile) {
      setCompareResult({
        comparison_mode: "local",
        note:
          "This side-by-side comparison uses visible grant details only. Run Project Intake first for project-aware scoring.",
        grants: selectedGrants
      });

      setIsComparing(false);
      window.setTimeout(() => {
        comparePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    try {
      const output = asRecord(
        await GrantPilotApi.compareGrants({
          grant_ids: selectedIds,
          project_profile: projectProfile
        })
      );

      setCompareResult({
        ...output,
        comparison_mode: "project-aware",
        grants: mergeComparedGrants(selectedGrants, output)
      });
    } catch (err: unknown) {
      setCompareResult({
        comparison_mode: "local",
        note: getErrorMessage(
          err,
          "Project-aware comparison is unavailable, so GrantPilot is showing a side-by-side comparison."
        ),
        grants: selectedGrants
      });
    } finally {
      setIsComparing(false);
      window.setTimeout(() => {
        comparePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [selectedGrants, selectedIds]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28">
      <section className="explorer-cinema rounded-[2rem] border border-primary/10 bg-bgPanel/75 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-5">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Ranked opportunity review
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-end">
            <div>
              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight">
                Turn search results into one clean funding decision.
              </h1>
              <p className="text-textSecondary mt-3 max-w-3xl leading-relaxed">
                GrantPilot opens with a saved infrastructure project and ranked matches, then shows source trust, fit rationale, and one clean selected grant before the readiness packet.
              </p>
            </div>

            <div className="rounded-2xl border border-borderColor bg-bgPanelLight/50 p-1.5 grid grid-cols-2 gap-1.5">
              <ModeButton
                active={mode === "database"}
                onClick={openDatabase}
                label="Master database"
              />
              <ModeButton
                active={mode === "latest"}
                onClick={openLatestMatches}
                label="Latest project matches"
                disabled={!hasLatestMatches}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-8">
            <ProcessPill icon={<Target className="w-4 h-4" />} title="Rank" copy="Sort by project fit and urgency" />
            <ProcessPill icon={<ShieldCheck className="w-4 h-4" />} title="Verify" copy="Show source, status, and refresh age" />
            <ProcessPill icon={<BadgeCheck className="w-4 h-4" />} title="Explain" copy="Summarize fit, risks, and next checks" />
            <ProcessPill icon={<FileCheck2 className="w-4 h-4" />} title="Select" copy="Open one grant for packet prep" />
          </div>
        </div>
      </section>

      {topGrant && (
        <FeaturedGrantPanel
          grant={topGrant}
          projectProfile={activeProjectProfile}
          mode={mode}
        />
      )}

      {error && <ErrorBox message={error} />}

      <section className="sticky top-0 z-40 -mx-4 sm:mx-0 rounded-b-2xl sm:rounded-2xl border border-borderColor bg-bgPanel/85 p-4 lg:p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-textSecondary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search like a project: bridge flooding, rural water, drainage, energy shelter..."
              className="w-full bg-bgPanel/70 border border-borderColor rounded-xl pl-10 pr-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
            />
          </div>

          <FacetSelect
            value={source}
            onChange={setSource}
            disabled={mode === "latest"}
            label="All sources"
            values={getFacetValues(facetsRecord.sources)}
          />

          <FacetSelect
            value={status}
            onChange={setStatus}
            disabled={mode === "latest"}
            label="All statuses"
            values={getFacetValues(facetsRecord.statuses)}
          />

          <FacetSelect
            value={category}
            onChange={setCategory}
            disabled={mode === "latest"}
            label="All categories"
            values={getFacetValues(facetsRecord.categories || facetsRecord.category_counts)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 mt-3">
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary"
          >
            <option value="relevance">Sort: relevance</option>
            <option value="fit">Sort: best fit score</option>
            <option value="deadline">Sort: deadline soonest</option>
            <option value="freshness">Sort: recently refreshed</option>
          </select>

          <label className="rounded-xl border border-borderColor bg-bgPanel/50 px-4 py-3 flex items-center justify-between gap-3 text-sm text-textSecondary cursor-pointer">
            <span>Hide likely closed grants for a cleaner review list</span>
            <input
              type="checkbox"
              checked={onlyActionable}
              onChange={(event) => setOnlyActionable(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {quickSearchTerms.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  if (mode !== "database") {
                    setMode("database");
                  }
                }}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                  query.toLowerCase() === term
                    ? "bg-primary text-white border-primary"
                    : "bg-bgPanel/60 border-borderColor text-textSecondary hover:text-primary hover:border-primary/40"
                }`}
              >
                {term}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-textSecondary">
            <span className="inline-flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              {resultCountText}
            </span>

            {(query || source || status || category || sortMode !== "relevance" || !onlyActionable) && (
              <button
                onClick={clearFilters}
                className="text-primary font-bold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-borderColor bg-bgPanel/40 px-4 py-3 text-xs text-textSecondary flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            Select 2–{MAX_COMPARE_SELECTIONS} grants to compare, or open the top match to continue the workflow.
          </span>
          <span className="font-bold text-textPrimary">
            {selectedIds.length}/{MAX_COMPARE_SELECTIONS} selected
          </span>
        </div>
      </section>

      {Boolean(latestRun?.trace_id) && mode === "latest" && (
        <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4 text-sm text-secondary flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center min-w-0">
            <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
            <span className="truncate">
              Showing saved matches from review trace {String(latestRun?.trace_id ?? "")}
            </span>
          </div>
          <Link href="/intake" className="text-secondary font-bold hover:underline">
            Replay intake
          </Link>
        </div>
      )}

      <div ref={comparePanelRef}>
        {compareResult && (
          <ComparisonPanel
            result={compareResult}
            grants={getArrayField<GrantRecord>(compareResult, "grants")}
            onClear={clearComparisonAndSelection}
          />
        )}
      </div>

      {isLoading ? (
        <div className="glass-panel rounded-2xl p-10 flex items-center justify-center text-textSecondary">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading grants...
        </div>
      ) : visibleGrants.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibleGrants.map((grant, index) => {
            const id = getGrantId(grant);
            const selected = Boolean(id && selectedIds.includes(id));
            const selectionDisabled =
              !selected && selectedIds.length >= MAX_COMPARE_SELECTIONS;

            return (
              <GrantCard
                key={id || getGrantTitle(grant)}
                grant={grant}
                rank={index + 1}
                selected={selected}
                selectionDisabled={selectionDisabled}
                onToggle={() => toggleSelected(grant)}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          mode={mode}
          onClear={clearFilters}
          onDatabase={openDatabase}
        />
      )}

      {selectedIds.length > 0 && !compareResult && (
        <SelectionBar
          count={selectedIds.length}
          maxCount={MAX_COMPARE_SELECTIONS}
          selectedGrants={selectedGrants}
          isComparing={isComparing}
          onCompare={compareSelected}
          onClear={() => {
            setSelectedIds([]);
            setCompareResult(null);
            setError("");
          }}
        />
      )}
    </div>
  );
});

function ProcessPill({
  icon,
  title,
  copy
}: {
  icon: ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-2xl border border-borderColor bg-bgPanel/55 p-4">
      <div className="flex items-center gap-2 text-primary font-black text-sm">
        {icon}
        {title}
      </div>
      <p className="text-xs text-textSecondary mt-2 leading-relaxed">{copy}</p>
    </div>
  );
}

function FeaturedGrantPanel({
  grant,
  projectProfile,
  mode
}: {
  grant: GrantRecord;
  projectProfile: AnyRecord | null;
  mode: ExplorerMode;
}) {
  const id = getGrantId(grant);
  const score = getGrantScore(grant);
  const sourceUrl = getSourceUrl(grant);
  const reasons = buildFitReasons(grant, projectProfile).slice(0, 3);

  return (
    <section className="rounded-[1.75rem] border border-secondary/20 bg-secondary/5 p-5 lg:p-6 shadow-lg shadow-black/5">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-secondary text-white text-xs font-black">
              Recommended first review
            </span>
            <span className="px-3 py-1 rounded-full bg-bgPanelLight text-textSecondary text-xs font-bold">
              {mode === "latest" ? "From latest project run" : "From current filters"}
            </span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-black text-textPrimary leading-tight">
            {getGrantTitle(grant)}
          </h2>
          <p className="text-sm text-textSecondary mt-2">
            {String(grant.agency || "Agency not listed")} • {String(grant.source || "Unknown source")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <Metric label="Fit score" value={score !== null ? `${score}%` : "Review"} />
            <Metric label="Deadline" value={formatDate(grant.due_date || grant.deadline)} />
            <Metric label="Funding" value={formatCurrencyLike(grant.funding_amount)} />
          </div>
        </div>

        <div className="rounded-2xl border border-borderColor bg-bgPanel/75 p-4">
          <div className="text-xs font-black text-textSecondary uppercase tracking-[0.2em] mb-3">
            Why this fit
          </div>
          <ul className="space-y-2">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm text-textSecondary">
                <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 mt-5">
            {id && (
              <Link
                onClick={() => saveSelectedGrant(grant)}
                href={`/explorer/${id}`}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-black inline-flex items-center"
              >
                Review selected grant <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            )}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight text-textPrimary text-sm font-bold inline-flex items-center"
              >
                Source <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeButton({
  active,
  label,
  onClick,
  disabled = false
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-sm font-black transition-colors ${
        active
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "text-textSecondary hover:text-textPrimary hover:bg-bgPanel disabled:opacity-40 disabled:hover:bg-transparent"
      }`}
    >
      {label}
    </button>
  );
}

function getFacetValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  const record = asRecord(value);
  return Object.keys(record);
}

function FacetSelect({
  value,
  onChange,
  disabled,
  label,
  values
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label: string;
  values: string[];
}) {
  const cleanValues = values
    .filter((item) => item && item !== "unknown")
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 80);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary disabled:opacity-40"
    >
      <option value="">{label}</option>
      {cleanValues.map((item) => (
        <option key={item} value={item}>
          {prettify(item)}
        </option>
      ))}
    </select>
  );
}

function GrantCard({
  grant,
  rank,
  selected,
  selectionDisabled,
  onToggle
}: {
  grant: GrantRecord;
  rank: number;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: () => void;
}) {
  const score = getGrantScore(grant);
  const id = getGrantId(grant);
  const sourceUrl = getSourceUrl(grant);
  const categories = getGrantCategories(grant).slice(0, 3);
  const fitReasons = buildFitReasons(grant, getLatestProjectProfile()).slice(0, 3);

  const selectGrant = () => saveSelectedGrant(grant);

  return (
    <article
      className={`explorer-card rounded-2xl border p-5 transition-colors bg-bgPanel/70 shadow-sm ${
        selected
          ? "border-secondary/70 ring-2 ring-secondary/20"
          : "border-borderColor hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-black">
              #{rank}
            </span>
            {score !== null && (
              <span className="px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-black">
                {score}% fit
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
              {grant.source || "Unknown source"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs">
              {grant.status || "unknown"}
            </span>
          </div>

          <h3 className="font-black text-textPrimary text-lg leading-snug">
            {getGrantTitle(grant)}
          </h3>

          <p className="text-sm text-textSecondary mt-1">
            {String(grant.agency || "Agency not listed")}
          </p>

          <p className="text-sm text-textSecondary mt-3 leading-relaxed">
            {truncate(stripHtml(grant.summary || grant.overview), 240)}
          </p>

          <TrustBadges grant={grant} sourceUrl={sourceUrl} />

          <div className="mt-4 rounded-2xl border border-borderColor bg-bgPanel/45 p-4">
            <div className="text-xs font-black text-textSecondary uppercase tracking-[0.18em] mb-2">
              Why this is worth reviewing
            </div>
            <ul className="space-y-2">
              {fitReasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-sm text-textSecondary">
                  <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          onClick={onToggle}
          disabled={selectionDisabled}
          title={selectionDisabled ? `Compare up to ${MAX_COMPARE_SELECTIONS} grants at a time` : undefined}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 ${
            selected
              ? "bg-secondary text-white"
              : selectionDisabled
                ? "bg-bgPanelLight border border-borderColor text-textSecondary opacity-60 cursor-not-allowed"
                : "bg-bgPanelLight border border-borderColor text-textPrimary hover:border-secondary/50"
          }`}
        >
          {selected ? "Selected" : selectionDisabled ? "Limit reached" : "Select"}
        </button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => (
            <span
              key={category}
              className="px-2.5 py-1 rounded-full bg-bgPanelLight text-textSecondary text-xs"
            >
              {prettify(category)}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs">
        <Metric label="Due" value={formatDate(grant.due_date || grant.deadline)} />
        <Metric label="Funding" value={formatCurrencyLike(grant.funding_amount)} />
        <Metric label="Match" value={grant.match_required || "Unknown"} />
        <Metric label="ID" value={id || "Unknown"} />
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        {id && (
          <Link
            onClick={selectGrant}
            href={`/explorer/${id}`}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold inline-flex items-center"
          >
            Details <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight hover:bg-bgPanel text-textPrimary text-sm font-bold inline-flex items-center"
          >
            Source <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        )}
      </div>
    </article>
  );
}

function TrustBadges({ grant, sourceUrl }: { grant: GrantRecord; sourceUrl: string }) {
  const status = String(grant.status || "unknown").toLowerCase();
  const openLabel = status.includes("open") || status.includes("posted") || status.includes("forecast")
    ? "Possibly open"
    : status === "unknown"
      ? "Status unknown"
      : "Check status";

  const refreshed = grant.last_refreshed ? formatRelativeTime(grant.last_refreshed) : "Refresh unknown";

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <span className="px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-bold">
        Source: {grant.source || "Unknown"}
      </span>
      <span className="px-2.5 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs font-bold">
        {refreshed}
      </span>
      <span className="px-2.5 py-1 rounded-lg bg-bgPanelLight text-textSecondary text-xs font-bold">
        {openLabel}
      </span>
      <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 text-xs font-bold">
        Human verify
      </span>
      {sourceUrl && (
        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
          Official link
        </span>
      )}
    </div>
  );
}

function ComparisonPanel({
  result,
  grants,
  onClear
}: {
  result: AnyRecord;
  grants: GrantRecord[];
  onClear: () => void;
}) {
  const sortedGrants = [...grants].sort((a, b) => {
    return (getGrantScore(b) ?? 0) - (getGrantScore(a) ?? 0);
  });

  const mode = String(result.comparison_mode || "comparison");
  const note = String(result.note || "");

  return (
    <section className="rounded-2xl border border-secondary/25 bg-secondary/5 p-5 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-black mb-3">
            <GitCompare className="w-3.5 h-3.5 mr-2" />
            {mode === "project-aware" ? "Project-aware comparison" : "Side-by-side comparison"}
          </div>

          <h2 className="text-2xl font-black text-textPrimary">
            Compare selected grants
          </h2>

          <p className="text-sm text-textSecondary mt-1 max-w-3xl">
            Use this to decide which opportunity is worth staff time first.
          </p>

          {note && (
            <p className="text-sm text-textSecondary mt-3 rounded-xl border border-borderColor bg-bgPanel/60 p-3">
              {note}
            </p>
          )}
        </div>

        <button
          onClick={onClear}
          className="px-3 py-2 rounded-xl border border-borderColor bg-bgPanelLight text-textPrimary text-sm font-bold inline-flex items-center self-start"
        >
          <X className="w-4 h-4 mr-2" />
          Close and clear
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {sortedGrants.map((grant, index) => (
          <ComparisonCard
            key={getGrantId(grant) || getGrantTitle(grant)}
            grant={grant}
            rank={index + 1}
          />
        ))}
      </div>
    </section>
  );
}

function ComparisonCard({
  grant,
  rank
}: {
  grant: GrantRecord;
  rank: number;
}) {
  const score = getGrantScore(grant);
  const id = getGrantId(grant);

  return (
    <div className="rounded-2xl border border-borderColor bg-bgPanel/80 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-black text-primary">
          OPTION {rank}
        </span>
        {score !== null && (
          <span className="text-2xl font-black text-secondary">
            {score}%
          </span>
        )}
      </div>

      <h3 className="font-black text-textPrimary leading-snug">
        {getGrantTitle(grant)}
      </h3>

      <p className="text-xs text-textSecondary mt-1">
        {String(grant.source || "Unknown source")} • {String(grant.agency || "Agency not listed")}
      </p>

      <p className="text-sm text-textSecondary mt-4 leading-relaxed">
        {getComparisonReason(grant)}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
        <Metric label="Due" value={formatDate(grant.due_date || grant.deadline)} />
        <Metric label="Funding" value={formatCurrencyLike(grant.funding_amount)} />
        <Metric label="Match" value={grant.match_required || "Unknown"} />
        <Metric label="Status" value={grant.status || "Unknown"} />
      </div>

      {id && (
        <Link
          onClick={() => saveSelectedGrant(grant)}
          href={`/explorer/${id}`}
          className="mt-5 w-full px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold inline-flex items-center justify-center"
        >
          Review details <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      )}
    </div>
  );
}

function SelectionBar({
  count,
  maxCount,
  selectedGrants,
  isComparing,
  onCompare,
  onClear
}: {
  count: number;
  maxCount: number;
  selectedGrants: GrantRecord[];
  isComparing: boolean;
  onCompare: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed bottom-5 left-4 right-4 md:left-[calc(280px+1.5rem)] md:right-6 z-50">
      <div className="mx-auto max-w-5xl rounded-2xl border border-secondary/30 bg-bgPanel/95 shadow-2xl shadow-black/20 backdrop-blur p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 text-center lg:text-left">
            <div className="text-sm font-black text-textPrimary">
              {count} of {maxCount} grants selected for comparison
            </div>
            <div className="text-xs text-textSecondary mt-1 truncate">
              {selectedGrants.map((grant) => getGrantTitle(grant)).join(" • ")}
            </div>
          </div>

          <div className="flex justify-center gap-2 shrink-0">
            <button
              onClick={onClear}
              className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight text-textPrimary text-sm font-bold"
            >
              Clear
            </button>

            <button
              onClick={onCompare}
              disabled={count < 2 || isComparing}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-white text-sm font-black inline-flex items-center"
            >
              {isComparing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <GitCompare className="w-4 h-4 mr-2" />
              )}
              Compare now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  mode,
  onClear,
  onDatabase
}: {
  mode: ExplorerMode;
  onClear: () => void;
  onDatabase: () => void;
}) {
  return (
    <div className="glass-panel rounded-2xl p-10 text-center">
      <Database className="w-10 h-10 text-primary mx-auto mb-4" />
      <h2 className="text-2xl font-black text-textPrimary">
        No grants match those filters
      </h2>
      <p className="text-textSecondary mt-2 max-w-xl mx-auto">
        Clear filters to return to the curated preview matches, or search a broader term like “water,” “bridge,” or “transportation.”
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-xl bg-primary text-white font-bold"
        >
          Clear filters
        </button>

        {mode !== "database" && (
          <button
            onClick={onDatabase}
            className="px-4 py-2 rounded-xl border border-borderColor bg-bgPanelLight text-textPrimary font-bold"
          >
            Browse database
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div>
      <div className="text-textSecondary">{label}</div>
      <div className="font-semibold text-textPrimary truncate">
        {String(value ?? "Unknown")}
      </div>
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

function getDisplayTotal(meta: AnyRecord | null, fallback: number) {
  const record = asRecord(meta);
  const rawTotal = record.total;

  if (typeof rawTotal === "number" && Number.isFinite(rawTotal)) {
    return String(rawTotal);
  }

  if (typeof rawTotal === "string" && rawTotal.trim()) {
    return rawTotal;
  }

  return String(fallback);
}

function getGrantId(grant: GrantRecord) {
  const id = typeof grant.id === "string" ? grant.id.trim() : "";
  if (id) return id;

  const fallback = `${String(grant.source || "")}-${String(grant.title || "")}`.trim();
  return fallback || "";
}

function getGrantTitle(grant: GrantRecord) {
  return String(grant.title || "Untitled grant");
}

function getSourceUrl(grant: GrantRecord) {
  const record = asRecord(grant);
  const sourceUrl = record.source_url;
  const website = record.website;

  if (typeof sourceUrl === "string" && sourceUrl.trim()) {
    return sourceUrl;
  }

  if (typeof website === "string" && website.trim()) {
    return website;
  }

  return "";
}

function getGrantCategories(grant: GrantRecord) {
  const categories = grant.categories;

  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function getComparisonReason(grant: GrantRecord) {
  const recommendation = String(grant.recommendation || "").trim();

  if (recommendation) {
    return recommendation;
  }

  const score = getGrantScore(grant);

  if (score !== null && score >= 70) {
    return "This appears worth reviewing first because the score is comparatively strong. Confirm eligibility, match, deadline, and required documents before applying.";
  }

  if (score !== null && score >= 40) {
    return "This may be worth a secondary review, but staff should verify fit carefully before committing application time.";
  }

  return "This looks like a lower-confidence option. Review the official source before spending staff time on an application.";
}

function buildFitReasons(grant: GrantRecord, projectProfile: AnyRecord | null) {
  const reasons: string[] = [];
  const recommendation = String(grant.recommendation || "").trim();
  const projectName = String(projectProfile?.project_title || projectProfile?.title || projectProfile?.project_type || "").trim();
  const categories = getGrantCategories(grant).map((item) => item.toLowerCase());
  const score = getGrantScore(grant);
  const sourceUrl = getSourceUrl(grant);
  const status = String(grant.status || "").toLowerCase();

  if (recommendation) {
    reasons.push(truncate(stripHtml(recommendation), 130));
  }

  if (score !== null && score >= 70) {
    reasons.push("High project-fit score compared with other visible opportunities.");
  } else if (score !== null && score >= 45) {
    reasons.push("Moderate fit that is worth a secondary eligibility review.");
  } else {
    reasons.push("Potential match found; confirm fit before investing application time.");
  }

  if (projectName) {
    reasons.push(`Reviewed against the latest project profile: ${truncate(projectName, 70)}.`);
  } else if (categories.length) {
    reasons.push(`Relevant category signals: ${categories.slice(0, 2).map(prettify).join(", ")}.`);
  }

  if (sourceUrl) {
    reasons.push("Official source link is available for human verification.");
  }

  if (grant.last_refreshed) {
    reasons.push(`Grant record refreshed ${formatRelativeTime(grant.last_refreshed)}.`);
  }

  if (!status.includes("closed") && !status.includes("archived")) {
    reasons.push("Status does not look closed, but deadline and eligibility still need review.");
  }

  return Array.from(new Set(reasons)).slice(0, 4);
}

function mergeComparedGrants(selectedGrants: GrantRecord[], output: AnyRecord) {
  const backendGrants = getArrayField<GrantRecord>(output, "grants");

  if (!backendGrants.length) {
    return selectedGrants;
  }

  return selectedGrants.map((selectedGrant) => {
    const selectedId = getGrantId(selectedGrant);
    const selectedTitle = getGrantTitle(selectedGrant).toLowerCase();

    const backendGrant = backendGrants.find((candidate) => {
      const candidateId = getGrantId(candidate);
      const candidateTitle = getGrantTitle(candidate).toLowerCase();

      return (
        (selectedId && candidateId === selectedId) ||
        (selectedTitle && candidateTitle === selectedTitle)
      );
    });

    return backendGrant ? { ...selectedGrant, ...backendGrant } : selectedGrant;
  });
}

function dedupeGrants(grants: GrantRecord[]) {
  const seen = new Set<string>();
  const output: GrantRecord[] = [];

  for (const grant of grants) {
    const id = getGrantId(grant);

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    output.push(grant);
  }

  return output;
}

function sortGrants(grants: GrantRecord[], sortMode: SortMode) {
  const copy = [...grants];

  if (sortMode === "fit") {
    return copy.sort((a, b) => (getGrantScore(b) ?? -1) - (getGrantScore(a) ?? -1));
  }

  if (sortMode === "deadline") {
    return copy.sort((a, b) => getDeadlineTime(a) - getDeadlineTime(b));
  }

  if (sortMode === "freshness") {
    return copy.sort((a, b) => getRefreshTime(b) - getRefreshTime(a));
  }

  return copy;
}

function isProbablyClosed(grant: GrantRecord) {
  const status = normalizeText(grant.status);
  if (!status) return false;
  return status.includes("closed") || status.includes("archived") || status.includes("inactive");
}

function getDeadlineTime(grant: GrantRecord) {
  const raw = grant.due_date || grant.deadline;
  if (!raw) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(String(raw)).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function getRefreshTime(grant: GrantRecord) {
  if (!grant.last_refreshed) return 0;
  const timestamp = new Date(String(grant.last_refreshed)).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function filterAndRankGrants(grants: GrantRecord[], query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return grants;
  }

  const queryTokens = expandQueryTokens(normalizedQuery);

  return grants
    .map((grant) => ({
      grant,
      searchScore: scoreGrantForQuery(grant, normalizedQuery, queryTokens)
    }))
    .filter((item) => item.searchScore > 0)
    .sort((a, b) => {
      if (b.searchScore !== a.searchScore) {
        return b.searchScore - a.searchScore;
      }

      return (getGrantScore(b.grant) ?? 0) - (getGrantScore(a.grant) ?? 0);
    })
    .map((item) => item.grant);
}

function scoreGrantForQuery(grant: GrantRecord, normalizedQuery: string, queryTokens: string[]) {
  const title = normalizeText(grant.title);
  const agency = normalizeText(grant.agency);
  const overview = normalizeText(`${String(grant.summary || "")} ${String(grant.overview || "")}`);
  const source = normalizeText(grant.source);
  const status = normalizeText(grant.status);
  const categories = normalizeText(getGrantCategories(grant).join(" "));
  const fullText = `${title} ${agency} ${overview} ${source} ${status} ${categories}`;

  let score = 0;

  if (title.includes(normalizedQuery)) score += 120;
  if (agency.includes(normalizedQuery)) score += 50;
  if (categories.includes(normalizedQuery)) score += 45;
  if (overview.includes(normalizedQuery)) score += 30;
  if (fullText.includes(normalizedQuery)) score += 20;

  for (const token of queryTokens) {
    if (title.includes(token)) score += 24;
    if (categories.includes(token)) score += 18;
    if (agency.includes(token)) score += 10;
    if (overview.includes(token)) score += 8;
    if (source.includes(token) || status.includes(token)) score += 4;
  }

  return score;
}

function expandQueryTokens(normalizedQuery: string) {
  const baseTokens = normalizedQuery
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  const expanded = new Set(baseTokens);

  const aliases: Record<string, string[]> = {
    bridge: ["transportation", "road", "highway", "infrastructure", "safety"],
    road: ["transportation", "highway", "bridge", "safety"],
    flood: ["flooding", "stormwater", "drainage", "resilience", "hazard"],
    flooding: ["flood", "stormwater", "drainage", "resilience", "hazard"],
    drainage: ["stormwater", "water", "flood", "flooding", "infrastructure"],
    water: ["wastewater", "drinking", "stormwater", "drainage", "sewer"],
    rural: ["community", "township", "county", "agriculture"],
    energy: ["resilience", "solar", "efficiency", "facility"],
    housing: ["community", "development", "homeless", "affordable"],
    broadband: ["internet", "connectivity", "digital", "infrastructure"],
    agriculture: ["farm", "rural", "food", "conservation"]
  };

  for (const token of baseTokens) {
    for (const alias of aliases[token] || []) {
      expanded.add(alias);
    }
  }

  return Array.from(expanded);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function prettify(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() 
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default GrantExplorer;