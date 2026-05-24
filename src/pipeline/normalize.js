import fs from "node:fs/promises";
import path from "node:path";
import { cleanText, inferCategories, parseDateMaybe, determineStatus } from "../lib/text.js";
import { nowIso } from "../lib/fs.js";

async function readDirJson(dir) {
  try {
    const files = await fs.readdir(dir);
    const out = [];
    for (const f of files.filter(f => f.endsWith(".json") && !f.endsWith("_summary.json"))) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
        out.push(data);
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

function normalizeGrantsGovDetail(wrapped) {
  const data = wrapped?.response?.data || {};
  const synopsis = data?.synopsis || {};
  const id = String(wrapped.opportunity_id || data.id || data.opportunityId || "");
  const title = cleanText(data.opportunityTitle || synopsis.opportunityTitle || "");
  const agency = cleanText(synopsis.agencyName || data.agencyName || "");
  const overview = cleanText(synopsis.synopsisDesc || "");
  const applicantTypes = Array.isArray(synopsis.applicantTypes)
    ? synopsis.applicantTypes.map(x => x.description).filter(Boolean)
    : [];
  const categories = inferCategories(`${title} ${agency} ${overview} ${JSON.stringify(synopsis.fundingActivityCategories || [])}`);

  return {
    id: `grantsgov_${id}`,
    external_id: id,
    dedupe_key: `grantsgov:${id}`,
    source: "Grants.gov",
    source_kind: "real",
    title,
    agency,
    source_url: id ? `https://www.grants.gov/search-results-detail/${id}` : "https://www.grants.gov/",
    website: id ? `https://www.grants.gov/search-results-detail/${id}` : "https://www.grants.gov/",
    status: determineStatus({
      status: synopsis.opportunityStatus || data.opportunityStatus,
      close_date: synopsis.responseDate || synopsis.responseDateDesc
    }),
    due_date: parseDateMaybe(synopsis.responseDate || synopsis.responseDateDesc),
    posted_date: parseDateMaybe(synopsis.postingDate),
    funding_amount: cleanText(synopsis.awardCeilingFormatted || synopsis.awardCeiling || ""),
    funding_type: "Grant",
    match_required: synopsis.costSharing ? "Yes" : "Unknown",
    eligible_applicants: applicantTypes,
    categories,
    overview,
    last_refreshed: wrapped.fetched_at || null,
    source_health: wrapped.fetched_at ? "cached_detail" : "unknown",
    raw: wrapped
  };
}

function normalizeMfhRecord(record) {
  const title = cleanText(record.title);
  const overview = cleanText(record.overview || record.additional_info);
  const externalId = cleanText(record.grant_id || record.source_url || title);

  return {
    id: `mfh_${record.grant_id}`,
    external_id: externalId,
    dedupe_key: `mfh:${externalId}`,
    source: "MI Funding Hub",
    source_kind: "real",
    title,
    agency: cleanText(record.agency),
    source_url: cleanText(record.source_url),
    website: cleanText(record.website),
    status: determineStatus(record),
    due_date: parseDateMaybe(record.application_due_date || record.due_date),
    posted_date: parseDateMaybe(record.posted_date),
    funding_amount: cleanText(record.funding_amount),
    funding_type: cleanText(record.funding_type || "Grant"),
    match_required: cleanText(record.match_required || "Unknown"),
    eligible_applicants: record.eligible_applicants || [],
    categories: record.categories_inferred?.length ? record.categories_inferred : inferCategories(`${title} ${overview}`),
    overview,
    last_refreshed: record.fetched_at || record.scraped_at || null,
    source_health: record.fetched_at || record.scraped_at ? "cached_detail" : "unknown",
    raw: record
  };
}

function stableDedupeKey(grant) {
  if (grant.dedupe_key) return grant.dedupe_key;
  if (grant.source === "Grants.gov" && grant.external_id) return `grantsgov:${grant.external_id}`;
  if (grant.source_url) return `${String(grant.source || "unknown").toLowerCase()}:url:${String(grant.source_url).toLowerCase()}`;

  return [grant.source, grant.title, grant.agency, grant.due_date]
    .map(value => cleanText(value).toLowerCase())
    .join("|");
}

export function dedupeGrants(grants) {
  const seen = new Map();
  const duplicates = [];

  for (const grant of grants) {
    const key = stableDedupeKey(grant);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, grant);
      continue;
    }

    duplicates.push({
      key,
      kept_id: existing.id,
      duplicate_id: grant.id,
      title: grant.title,
      source: grant.source
    });

    // Keep the record that has more usable detail.
    const existingScore = recordCompleteness(existing);
    const newScore = recordCompleteness(grant);
    if (newScore > existingScore) {
      seen.set(key, grant);
    }
  }

  return {
    grants: Array.from(seen.values()),
    stats: {
      input_count: grants.length,
      output_count: seen.size,
      duplicate_count: duplicates.length,
      duplicates: duplicates.slice(0, 100),
      generated_at: nowIso()
    }
  };
}

function recordCompleteness(grant) {
  let score = 0;
  for (const field of ["title", "agency", "overview", "source_url", "due_date", "posted_date", "funding_amount"]) {
    if (grant[field]) score += 1;
  }
  score += Array.isArray(grant.eligible_applicants) ? Math.min(grant.eligible_applicants.length, 3) : 0;
  score += Array.isArray(grant.categories) ? Math.min(grant.categories.length, 3) : 0;
  return score;
}

export async function normalizeAll({ outDir, returnMetadata = false }) {
  const grantsGovDetails = await readDirJson(path.join(outDir, "raw", "grantsgov", "details"));
  const mfhDetails = await readDirJson(path.join(outDir, "raw", "mfh", "details"));

  const normalized = [];
  for (const item of grantsGovDetails) {
    const rec = normalizeGrantsGovDetail(item);
    if (rec.title) normalized.push(rec);
  }
  for (const item of mfhDetails.filter(x => x && x.source === "MI Funding Hub")) {
    const rec = normalizeMfhRecord(item);
    if (rec.title) normalized.push(rec);
  }

  const deduped = dedupeGrants(normalized);

  if (returnMetadata) {
    return {
      grants: deduped.grants,
      dedupe: deduped.stats,
      source_counts_before_dedupe: countBy(normalized, "source"),
      source_counts_after_dedupe: countBy(deduped.grants, "source")
    };
  }

  return deduped.grants;
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = String(item[key] || "unknown");
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}
