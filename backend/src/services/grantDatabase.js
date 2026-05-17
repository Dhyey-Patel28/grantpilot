import fs from "fs/promises";
import path from "path";
import { scoreGrants } from "../../../src/pipeline/scoring.js";

let cachedGrants = null;

export async function loadMasterGrants() {
  if (cachedGrants) return cachedGrants;

  const projectRoot = getProjectRoot();
  const filePath = path.join(projectRoot, "cache", "normalized", "grants_normalized.json");

  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("cache/normalized/grants_normalized.json must be a JSON array.");
  }

  cachedGrants = parsed.map(normalizeMasterGrant);
  return cachedGrants;
}

export async function getScoredGrantCandidates(projectProfile, options = {}) {
  const limit = Number(options.limit || 10);
  const grants = await loadMasterGrants();

  const scored = scoreGrants(projectProfile, grants)
    .filter((grant) => Number(grant.fit_score || 0) > 0)
    .slice(0, limit)
    .map(toCandidateGrant);

  return scored;
}

export async function listGrants(query = {}) {
  const grants = await loadMasterGrants();

  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
  const search = String(query.query || "").trim().toLowerCase();
  const category = String(query.category || "").trim().toLowerCase();
  const source = String(query.source || "").trim().toLowerCase();
  const status = String(query.status || "").trim().toLowerCase();

  let filtered = grants;

  if (search) {
    filtered = filtered.filter((grant) => {
      const haystack = [
        grant.title,
        grant.agency,
        grant.overview,
        grant.source,
        ...(grant.categories || []),
        ...(grant.eligible_applicants || [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  if (category) {
    filtered = filtered.filter((grant) => {
      return (grant.categories || []).some((item) => String(item).toLowerCase() === category);
    });
  }

  if (source) {
    filtered = filtered.filter((grant) => String(grant.source || "").toLowerCase() === source);
  }

  if (status) {
    filtered = filtered.filter((grant) => String(grant.status || "").toLowerCase() === status);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit).map(toGrantListItem);

  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
    items
  };
}

export async function getGrantById(id) {
  const grants = await loadMasterGrants();
  const target = String(id || "");

  const grant = grants.find((item) => String(item.id) === target);

  if (!grant) {
    return null;
  }

  return grant;
}

export async function getGrantStats() {
  const grants = await loadMasterGrants();

  const bySource = countBy(grants, "source");
  const byStatus = countBy(grants, "status");

  const byCategory = {};

  for (const grant of grants) {
    for (const category of grant.categories || []) {
      const key = String(category || "unknown");
      byCategory[key] = (byCategory[key] || 0) + 1;
    }
  }

  return {
    total_grants: grants.length,
    by_source: bySource,
    by_status: byStatus,
    by_category: byCategory
  };
}

function normalizeMasterGrant(grant) {
  return {
    id: grant.id || null,
    source: grant.source || null,
    source_kind: grant.source_kind || null,
    title: grant.title || "Untitled grant",
    agency: grant.agency || null,
    source_url: grant.source_url || grant.website || null,
    website: grant.website || grant.source_url || null,
    status: grant.status || "unknown",
    due_date: grant.due_date || grant.deadline || null,
    posted_date: grant.posted_date || null,
    funding_amount: grant.funding_amount || null,
    funding_type: grant.funding_type || null,
    match_required: grant.match_required || "Unknown",
    eligible_applicants: Array.isArray(grant.eligible_applicants) ? grant.eligible_applicants : [],
    categories: Array.isArray(grant.categories) ? grant.categories : [],
    overview: grant.overview || grant.summary || grant.description || "",
    raw: grant.raw || {}
  };
}

function toCandidateGrant(grant) {
  const cleanOverview = truncateText(stripHtml(grant.overview), 1200);

  return {
    id: grant.id,
    title: grant.title,
    agency: grant.agency,
    status: grant.status,
    source: grant.source,
    source_url: grant.source_url,

    // Keep candidate payload small for agents.
    // Full grant detail is still available through GET /api/grantpilot/grants/:id.
    summary: cleanOverview,
    overview: cleanOverview,

    eligible_applicants: grant.eligible_applicants || [],
    categories: grant.categories || [],
    deadline: grant.due_date || null,
    due_date: grant.due_date || null,
    funding_amount: grant.funding_amount || null,
    match_required: grant.match_required || "Unknown",

    deterministic_score: grant.fit_score,
    fit_score: grant.fit_score,
    direct_relevance_score: grant.direct_relevance_score,
    score_breakdown: grant.score_breakdown || [],
    missing_requirements: grant.missing_requirements || [],
    recommendation: grant.recommendation || null
  };
}

function toGrantListItem(grant) {
  return {
    id: grant.id,
    title: grant.title,
    agency: grant.agency,
    source: grant.source,
    source_kind: grant.source_kind,
    source_url: grant.source_url,
    status: grant.status,
    due_date: grant.due_date,
    funding_amount: grant.funding_amount,
    funding_type: grant.funding_type,
    match_required: grant.match_required,
    eligible_applicants: grant.eligible_applicants,
    categories: grant.categories,
    overview: grant.overview
  };
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, "\"")
    .replace(/&rdquo;/g, "\"")
    .replace(/&quot;/g, "\"")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, maxLength = 1200) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function countBy(items, key) {
  const counts = {};

  for (const item of items) {
    const value = String(item[key] || "unknown");
    counts[value] = (counts[value] || 0) + 1;
  }

  return counts;
}

function getProjectRoot() {
  const cwd = process.cwd();

  if (path.basename(cwd).toLowerCase() === "backend") {
    return path.resolve(cwd, "..");
  }

  return cwd;
}