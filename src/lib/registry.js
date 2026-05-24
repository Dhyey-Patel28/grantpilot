import { readJson, writeJson, nowIso } from "./fs.js";

const DEFAULT_REGISTRY = {
  created_at: null,
  updated_at: null,
  sources: {
    mfh_grant_urls: {},
    grants_gov_opportunities: {}
  }
};

export async function loadRegistry(filePath) {
  const registry = await readJson(filePath, null);
  if (registry) return registry;
  const fresh = { ...DEFAULT_REGISTRY, created_at: nowIso(), updated_at: nowIso() };
  await writeJson(filePath, fresh);
  return fresh;
}

export async function saveRegistry(filePath, registry) {
  registry.updated_at = nowIso();
  await writeJson(filePath, registry);
}

export function upsertMfhUrl(registry, url, meta = {}) {
  const existing = registry.sources.mfh_grant_urls[url] || {};
  const now = nowIso();
  registry.sources.mfh_grant_urls[url] = {
    ...existing,
    source: "MI Funding Hub",
    url,
    first_seen_at: existing.first_seen_at || now,
    last_seen_at: now,
    times_seen: (existing.times_seen || 0) + 1,
    ...meta
  };
}

export function upsertGrantsGovOpportunity(registry, opportunityId, meta = {}) {
  if (!opportunityId) return;
  const key = String(opportunityId);
  const existing = registry.sources.grants_gov_opportunities[key] || {};
  const now = nowIso();
  registry.sources.grants_gov_opportunities[key] = {
    ...existing,
    source: "Grants.gov",
    opportunity_id: key,
    first_seen_at: existing.first_seen_at || now,
    last_seen_at: now,
    times_seen: (existing.times_seen || 0) + 1,
    ...meta
  };
}
