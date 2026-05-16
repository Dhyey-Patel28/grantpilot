import path from "node:path";
import { writeJson, readJson, slugify, nowIso } from "../lib/fs.js";
import { upsertGrantsGovOpportunity } from "../lib/registry.js";

const SEARCH_URL = "https://api.grants.gov/v1/api/search2";
const FETCH_URL = "https://api.grants.gov/v1/api/fetchOpportunity";

async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "GrantPilotMI/1.0" },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} for ${url}`);
  return await resp.json();
}

function getHits(response) {
  if (response?.data?.oppHits && Array.isArray(response.data.oppHits)) return response.data.oppHits;
  if (Array.isArray(response?.oppHits)) return response.oppHits;
  return [];
}

export async function searchGrantsGovKeyword({ keyword, rows, outDir, registry }) {
  console.log(`Grants.gov search: ${keyword}`);
  const response = await postJson(SEARCH_URL, {
    keyword,
    oppStatuses: "forecasted|posted",
    rows
  });

  const hits = getHits(response);
  const file = path.join(outDir, "raw", "grantsgov", "search", `${slugify(keyword)}.json`);
  await writeJson(file, {
    source: "Grants.gov",
    endpoint: SEARCH_URL,
    keyword,
    fetched_at: nowIso(),
    rows_requested: rows,
    hit_count: hits.length,
    response
  });

  for (const hit of hits) {
    const id = hit.id || hit.opportunityId;
    upsertGrantsGovOpportunity(registry, id, {
      title: hit.title || null,
      agency: hit.agencyName || hit.agencyCode || null,
      status: hit.oppStatus || null,
      close_date: hit.closeDate || null,
      source_url: id ? `https://www.grants.gov/search-results-detail/${id}` : "https://www.grants.gov/"
    });
  }

  return hits;
}

export async function fetchGrantsGovDetail({ opportunityId, outDir, delayMs = 0 }) {
  const file = path.join(outDir, "raw", "grantsgov", "details", `${opportunityId}.json`);
  const existing = await readJson(file, null);
  if (existing?.fetched_at) return existing;

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
  return wrapped;
}

export async function collectGrantsGovDetails({ registry, outDir, maxDetails, delayMs }) {
  const ids = Object.keys(registry.sources.grants_gov_opportunities || {});
  console.log(`Grants.gov detail fetch queue: ${ids.length} opportunities; max this run: ${maxDetails}`);
  let count = 0;
  for (const id of ids) {
    if (count >= maxDetails) break;
    try {
      await fetchGrantsGovDetail({ opportunityId: id, outDir, delayMs });
      count += 1;
    } catch (err) {
      console.log(`  detail fetch failed for ${id}: ${err.message}`);
    }
  }
  console.log(`Fetched/confirmed ${count} Grants.gov detail records`);
}
