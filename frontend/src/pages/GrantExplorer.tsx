"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  Filter,
  GitCompare,
  Loader2,
  Search,
  Sparkles,
  X
} from "lucide-react";
import type { AnyRecord, GrantRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asRecord,
  formatCurrencyLike,
  formatDate,
  getArrayField,
  getErrorMessage,
  getGrantScore,
  getLatestCandidateGrants,
  getLatestProjectProfile,
  getLatestRun,
  saveSelectedGrant,
  stripHtml,
  truncate
} from "../lib/grantpilotApi";

type ExplorerMode = "database" | "latest";

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
    setMode("database");

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

      setDatabaseGrants(dedupeGrants(allItems));
      setDatabaseMeta(firstOutput);
      setMode("database");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not load grants."));
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
    return filterAndRankGrants(activeGrants, query);
  }, [activeGrants, query]);

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
          "Project-aware comparison failed, so GrantPilot is showing a local side-by-side comparison."
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
      <section className="rounded-[2rem] border border-primary/10 bg-bgPanel/75 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-5">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Search real grant records
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-end">
            <div>
              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight">
                Find grants worth reviewing.
              </h1>
              <p className="text-textSecondary mt-3 max-w-3xl leading-relaxed">
                Search in everyday project words, review the full grant database, and compare promising opportunities without losing your place.
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
                label="Latest matches"
                disabled={!hasLatestMatches}
              />
            </div>
          </div>
        </div>
      </section>

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
            values={Object.keys(asRecord(facetsRecord.sources))}
          />

          <FacetSelect
            value={status}
            onChange={setStatus}
            disabled={mode === "latest"}
            label="All statuses"
            values={Object.keys(asRecord(facetsRecord.statuses))}
          />

          <FacetSelect
            value={category}
            onChange={setCategory}
            disabled={mode === "latest"}
            label="All categories"
            values={Object.keys(asRecord(facetsRecord.categories))}
          />
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

            {(query || source || status || category) && (
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
            Select 2–{MAX_COMPARE_SELECTIONS} grants to compare. Project-aware comparison is available after Project Intake.
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
              Showing matches from trace {String(latestRun?.trace_id ?? "")}
            </span>
          </div>
          <Link href="/intake" className="text-secondary font-bold hover:underline">
            Run another intake
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
          {visibleGrants.map((grant) => {
            const id = getGrantId(grant);
            const selected = Boolean(id && selectedIds.includes(id));
            const selectionDisabled =
              !selected && selectedIds.length >= MAX_COMPARE_SELECTIONS;

            return (
              <GrantCard
                key={id || getGrantTitle(grant)}
                grant={grant}
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
  selected,
  selectionDisabled,
  onToggle
}: {
  grant: GrantRecord;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: () => void;
}) {
  const score = getGrantScore(grant);
  const id = getGrantId(grant);
  const sourceUrl = getSourceUrl(grant);
  const categories = getGrantCategories(grant).slice(0, 3);

  const selectGrant = () => saveSelectedGrant(grant);

  return (
    <article
      className={`rounded-2xl border p-5 transition-colors bg-bgPanel/70 shadow-sm ${
        selected
          ? "border-secondary/70 ring-2 ring-secondary/20"
          : "border-borderColor hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
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
        No grants found
      </h2>
      <p className="text-textSecondary mt-2 max-w-xl mx-auto">
        Try a broader project word like “water,” “bridge,” or “energy,” or clear filters and browse the master database.
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