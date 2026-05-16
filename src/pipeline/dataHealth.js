import { nowIso } from "../lib/fs.js";

export function buildDataHealth({ grants, registry }) {
  const byStatus = {};
  const bySource = {};
  for (const g of grants) {
    byStatus[g.status || "unknown"] = (byStatus[g.status || "unknown"] || 0) + 1;
    bySource[g.source || "unknown"] = (bySource[g.source || "unknown"] || 0) + 1;
  }

  return {
    generated_at: nowIso(),
    total_normalized_real_grants: grants.length,
    by_source: bySource,
    by_status: byStatus,
    known_mi_funding_hub_urls: Object.keys(registry.sources.mfh_grant_urls || {}).length,
    known_grants_gov_opportunities: Object.keys(registry.sources.grants_gov_opportunities || {}).length,
    notes: [
      "This cache is built from public configured sources.",
      "Public information can be fragmented; this does not guarantee every grant on the internet.",
      "Use cached JSON for demos instead of live refresh during judging."
    ]
  };
}
