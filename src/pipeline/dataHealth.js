import { nowIso } from "../lib/fs.js";

export function buildDataHealth({ grants, registry, sourceHealth = {}, dedupe = null }) {
  const byStatus = {};
  const bySource = {};
  let newestRefresh = null;

  for (const g of grants) {
    byStatus[g.status || "unknown"] = (byStatus[g.status || "unknown"] || 0) + 1;
    bySource[g.source || "unknown"] = (bySource[g.source || "unknown"] || 0) + 1;

    if (g.last_refreshed && (!newestRefresh || g.last_refreshed > newestRefresh)) {
      newestRefresh = g.last_refreshed;
    }
  }

  return {
    generated_at: nowIso(),
    last_refreshed: newestRefresh || sourceHealth.finished_at || sourceHealth.started_at || null,
    total_normalized_real_grants: grants.length,
    by_source: bySource,
    by_status: byStatus,
    known_mi_funding_hub_urls: Object.keys(registry.sources.mfh_grant_urls || {}).length,
    known_grants_gov_opportunities: Object.keys(registry.sources.grants_gov_opportunities || {}).length,
    dedupe: dedupe || null,
    source_health: summarizeSourceHealth(sourceHealth),
    notes: [
      "This cache is built from public configured sources.",
      "Grants.gov refresh now pages search2 results and fetches all discovered detail records unless fast mode or config limits are used.",
      "Public information can be fragmented; this does not guarantee every grant on the internet.",
      "Use cached JSON for demos instead of live refresh during judging."
    ]
  };
}

function summarizeSourceHealth(sourceHealth) {
  return {
    status: sourceHealth.status || "unknown",
    started_at: sourceHealth.started_at || null,
    finished_at: sourceHealth.finished_at || null,
    duration_ms: sourceHealth.duration_ms || null,
    grants_gov: sourceHealth.grants_gov || null,
    mi_funding_hub: sourceHealth.mi_funding_hub || null,
    errors: (sourceHealth.errors || []).slice(0, 25)
  };
}
