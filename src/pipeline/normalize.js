import fs from "node:fs/promises";
import path from "node:path";
import { cleanText, inferCategories, parseDateMaybe, determineStatus } from "../lib/text.js";

async function readDirJson(dir) {
  try {
    const files = await fs.readdir(dir);
    const out = [];
    for (const f of files.filter(f => f.endsWith(".json"))) {
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
    raw: wrapped
  };
}

function normalizeMfhRecord(record) {
  const title = cleanText(record.title);
  const overview = cleanText(record.overview || record.additional_info);
  return {
    id: `mfh_${record.grant_id}`,
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
    raw: record
  };
}

export async function normalizeAll({ outDir }) {
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

  const seen = new Set();
  const deduped = [];
  for (const g of normalized) {
    const key = `${g.title.toLowerCase()}|${g.agency.toLowerCase()}|${g.source}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(g);
    }
  }
  return deduped;
}
