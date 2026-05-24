import path from "node:path";
import { writeJson, readJson, slugify, nowIso } from "../lib/fs.js";
import { upsertGrantsGovOpportunity } from "../lib/registry.js";

const SEARCH_URL = "https://api.grants.gov/v1/api/search2";
const FETCH_URL = "https://api.grants.gov/v1/api/fetchOpportunity";
const DEFAULT_PAGE_ROWS = 100;
const DEFAULT_MAX_PAGES = 250;

async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "GrantPilotMI/1.0" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${resp.statusText} for ${url}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }

  return await resp.json();
}

function getHits(response) {
  if (response?.data?.oppHits && Array.isArray(response.data.oppHits)) return response.data.oppHits;
  if (Array.isArray(response?.oppHits)) return response.oppHits;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function getHitCount(response) {
  const candidates = [
    response?.data?.hitCount,
    response?.data?.totalRecords,
    response?.data?.total,
    response?.hitCount,
    response?.totalRecords,
    response?.total
  ];

  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }

  return null;
}

function normalizeLimit(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  if (String(value).toLowerCase() === "all") return Infinity;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return Infinity;
  return number;
}

function buildSearchPayload({ keyword, rows, startRecord }) {
  const payload = {
    keyword,
    oppStatuses: "forecasted|posted",
    rows
  };

  // Grants.gov's search2 endpoint supports paging through startRecord.
  // The first page works without it; subsequent pages request the next offset.
  if (Number.isFinite(startRecord) && startRecord > 0) {
    payload.startRecord = startRecord;
  }

  return payload;
}

function extractOpportunityId(hit) {
  return hit?.id || hit?.opportunityId || hit?.oppId || hit?.opportunityID || null;
}

function toSearchMeta(hit) {
  const id = extractOpportunityId(hit);

  return {
    title: hit?.title || hit?.opportunityTitle || null,
    agency: hit?.agencyName || hit?.agencyCode || hit?.agency || null,
    status: hit?.oppStatus || hit?.opportunityStatus || null,
    close_date: hit?.closeDate || hit?.responseDate || null,
    posted_date: hit?.postedDate || hit?.postingDate || null,
    source_url: id ? `https://www.grants.gov/search-results-detail/${id}` : "https://www.grants.gov/"
  };
}

export async function searchGrantsGovKeyword({
  keyword,
  rows = DEFAULT_PAGE_ROWS,
  outDir,
  registry,
  maxPages = DEFAULT_MAX_PAGES,
  delayMs = 0,
  sourceHealth = null
}) {
  const pageRows = Math.max(1, Math.min(1000, Number(rows || DEFAULT_PAGE_ROWS)));
  const pageLimit = normalizeLimit(maxPages, DEFAULT_MAX_PAGES);
  const safeKeyword = slugify(keyword);
  const keywordStartedAt = nowIso();

  console.log(`Grants.gov paged search: ${keyword} (${pageRows} rows/page)`);

  let startRecord = 0;
  let page = 0;
  let totalAvailable = null;
  let totalFetched = 0;
  let duplicateHits = 0;
  const seenIds = new Set();
  const pageSummaries = [];

  while (page < pageLimit) {
    const payload = buildSearchPayload({ keyword, rows: pageRows, startRecord });
    const response = await postJson(SEARCH_URL, payload);
    const hits = getHits(response);

    if (totalAvailable === null) {
      totalAvailable = getHitCount(response);
    }

    const pageFile = path.join(outDir, "raw", "grantsgov", "search", `${safeKeyword}_page_${String(page + 1).padStart(4, "0")}.json`);
    await writeJson(pageFile, {
      source: "Grants.gov",
      endpoint: SEARCH_URL,
      keyword,
      fetched_at: nowIso(),
      page: page + 1,
      rows_requested: pageRows,
      start_record_requested: startRecord,
      total_available: totalAvailable,
      hit_count: hits.length,
      request: payload,
      response
    });

    if (!hits.length) {
      pageSummaries.push({ page: page + 1, start_record: startRecord, hit_count: 0, file: pageFile });
      break;
    }

    let newThisPage = 0;
    for (const hit of hits) {
      const id = extractOpportunityId(hit);
      if (!id) continue;

      const key = String(id);
      if (seenIds.has(key)) {
        duplicateHits += 1;
      } else {
        seenIds.add(key);
        newThisPage += 1;
      }

      upsertGrantsGovOpportunity(registry, key, {
        ...toSearchMeta(hit),
        last_search_keyword: keyword,
        last_search_page: page + 1,
        last_seen_in_search_at: nowIso()
      });
    }

    totalFetched += hits.length;
    pageSummaries.push({
      page: page + 1,
      start_record: startRecord,
      hit_count: hits.length,
      new_opportunity_ids: newThisPage,
      file: pageFile
    });

    page += 1;

    if (totalAvailable !== null && totalFetched >= totalAvailable) break;
    if (hits.length < pageRows) break;
    if (newThisPage === 0 && page > 1) break;

    startRecord += hits.length;
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
  }

  const summary = {
    source: "Grants.gov",
    endpoint: SEARCH_URL,
    keyword,
    status: "ok",
    started_at: keywordStartedAt,
    finished_at: nowIso(),
    rows_per_page: pageRows,
    pages_fetched: pageSummaries.length,
    total_available: totalAvailable,
    total_hits_fetched: totalFetched,
    unique_opportunity_ids: seenIds.size,
    duplicate_hits: duplicateHits,
    pages: pageSummaries
  };

  const summaryFile = path.join(outDir, "raw", "grantsgov", "search", `${safeKeyword}_summary.json`);
  await writeJson(summaryFile, summary);

  if (sourceHealth) {
    sourceHealth.searches = sourceHealth.searches || [];
    sourceHealth.searches.push({
      source: "Grants.gov",
      keyword,
      status: "ok",
      fetched_at: summary.finished_at,
      pages_fetched: summary.pages_fetched,
      total_available: summary.total_available,
      total_hits_fetched: summary.total_hits_fetched,
      unique_opportunity_ids: summary.unique_opportunity_ids,
      duplicate_hits: summary.duplicate_hits
    });
  }

  console.log(`  ${keyword}: ${seenIds.size} unique ids from ${pageSummaries.length} page(s)`);
  return Array.from(seenIds);
}

export async function fetchGrantsGovDetail({ opportunityId, outDir, delayMs = 0, force = false }) {
  const file = path.join(outDir, "raw", "grantsgov", "details", `${opportunityId}.json`);
  const existing = await readJson(file, null);
  if (!force && existing?.fetched_at) {
    return {
      ...existing,
      cache_hit: true
    };
  }

  if (delayMs) await new Promise(r => setTimeout(r, delayMs));

  const response = await postJson(FETCH_URL, { opportunityId: Number(opportunityId) });
  const wrapped = {
    source: "Grants.gov",
    endpoint: FETCH_URL,
    opportunity_id: String(opportunityId),
    fetched_at: nowIso(),
    response
  };
  await writeJson(file, wrapped);
  return {
    ...wrapped,
    cache_hit: false
  };
}

export async function collectGrantsGovDetails({ registry, outDir, maxDetails = "all", delayMs = 0, force = false, sourceHealth = null }) {
  const ids = Object.keys(registry.sources.grants_gov_opportunities || {}).sort((a, b) => Number(a) - Number(b));
  const detailLimit = normalizeLimit(maxDetails, Infinity);
  console.log(`Grants.gov detail fetch queue: ${ids.length} opportunities; max this run: ${detailLimit === Infinity ? "all" : detailLimit}`);

  let attempted = 0;
  let fetched = 0;
  let cacheHits = 0;
  let failed = 0;
  const errors = [];

  for (const id of ids) {
    if (attempted >= detailLimit) break;
    attempted += 1;

    try {
      const detail = await fetchGrantsGovDetail({ opportunityId: id, outDir, delayMs, force });
      if (detail.cache_hit) {
        cacheHits += 1;
      } else {
        fetched += 1;
      }

      const existing = registry.sources.grants_gov_opportunities[id] || {};
      registry.sources.grants_gov_opportunities[id] = {
        ...existing,
        detail_cached_at: detail.fetched_at,
        detail_cache_status: "ok",
        detail_cache_hit: Boolean(detail.cache_hit),
        last_detail_checked_at: nowIso()
      };
    } catch (err) {
      failed += 1;
      const message = err?.message || String(err);
      errors.push({ opportunity_id: id, error: message });
      const existing = registry.sources.grants_gov_opportunities[id] || {};
      registry.sources.grants_gov_opportunities[id] = {
        ...existing,
        detail_cache_status: "failed",
        last_detail_checked_at: nowIso(),
        detail_error: message
      };
      console.log(`  detail fetch failed for ${id}: ${message}`);
    }
  }

  const summary = {
    source: "Grants.gov",
    endpoint: FETCH_URL,
    status: failed ? "partial" : "ok",
    finished_at: nowIso(),
    queued: ids.length,
    attempted,
    fetched_live: fetched,
    cache_hits: cacheHits,
    failed,
    errors: errors.slice(0, 25)
  };

  await writeJson(path.join(outDir, "raw", "grantsgov", "details_summary.json"), summary);

  if (sourceHealth) {
    sourceHealth.detail_fetch = summary;
  }

  console.log(`Fetched ${fetched} live detail records; confirmed ${cacheHits} cached records; failures: ${failed}`);
  return summary;
}
