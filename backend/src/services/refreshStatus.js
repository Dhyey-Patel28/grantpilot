import fs from "fs/promises";
import path from "path";

export async function getRefreshStatus() {
  const projectRoot = getProjectRoot();
  const dataHealthPath = path.join(projectRoot, "cache", "metadata", "data_health.json");
  const sourceHealthPath = path.join(projectRoot, "cache", "metadata", "source_health.json");
  const dedupeReportPath = path.join(projectRoot, "cache", "metadata", "dedupe_report.json");
  const normalizedPath = path.join(projectRoot, "cache", "normalized", "grants_normalized.json");
  const registryPath = path.join(projectRoot, "cache", "registry", "source_registry.json");

  const [dataHealth, sourceHealth, dedupeReport, normalizedStats, registryStats] = await Promise.all([
    readJson(dataHealthPath, null),
    readJson(sourceHealthPath, null),
    readJson(dedupeReportPath, null),
    readNormalizedStats(normalizedPath),
    readRegistryStats(registryPath)
  ]);

  return {
    status: sourceHealth?.status || dataHealth?.source_health?.status || "unknown",
    last_refreshed: dataHealth?.last_refreshed || sourceHealth?.finished_at || dataHealth?.generated_at || null,
    generated_at: dataHealth?.generated_at || null,
    normalized_grants: normalizedStats.total,
    by_source: dataHealth?.by_source || normalizedStats.by_source,
    by_status: dataHealth?.by_status || normalizedStats.by_status,
    dedupe: dedupeReport || dataHealth?.dedupe || null,
    registry: registryStats,
    source_health: sourceHealth || dataHealth?.source_health || null,
    files: {
      data_health: relativeToRoot(projectRoot, dataHealthPath),
      source_health: relativeToRoot(projectRoot, sourceHealthPath),
      dedupe_report: relativeToRoot(projectRoot, dedupeReportPath),
      normalized: relativeToRoot(projectRoot, normalizedPath),
      registry: relativeToRoot(projectRoot, registryPath)
    },
    recommendations: buildRecommendations({ dataHealth, sourceHealth, normalizedStats, registryStats })
  };
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function readNormalizedStats(filePath) {
  const grants = await readJson(filePath, []);
  if (!Array.isArray(grants)) {
    return { total: 0, by_source: {}, by_status: {} };
  }

  return {
    total: grants.length,
    by_source: countBy(grants, "source"),
    by_status: countBy(grants, "status")
  };
}

async function readRegistryStats(filePath) {
  const registry = await readJson(filePath, null);
  const sources = registry?.sources || {};
  return {
    updated_at: registry?.updated_at || null,
    grants_gov_opportunities: Object.keys(sources.grants_gov_opportunities || {}).length,
    mi_funding_hub_urls: Object.keys(sources.mfh_grant_urls || {}).length
  };
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = String(item?.[key] || "unknown");
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function buildRecommendations({ dataHealth, sourceHealth, normalizedStats, registryStats }) {
  const recommendations = [];

  if (!sourceHealth) {
    recommendations.push("Run `npm run refresh` from the project root to generate cache/metadata/source_health.json.");
  }

  if (sourceHealth?.status === "partial") {
    recommendations.push("Refresh completed partially. Check source_health.errors before trusting all sources.");
  }

  if (registryStats.grants_gov_opportunities > normalizedStats.total) {
    recommendations.push("Some discovered opportunities may not have normalized detail records yet. Run a full refresh, not fast mode.");
  }

  if (dataHealth?.dedupe?.duplicate_count > 0) {
    recommendations.push(`${dataHealth.dedupe.duplicate_count} duplicate records were removed during normalization.`);
  }

  if (!recommendations.length) {
    recommendations.push("Refresh cache looks healthy.");
  }

  return recommendations;
}

function relativeToRoot(root, filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function getProjectRoot() {
  const cwd = process.cwd();

  if (path.basename(cwd).toLowerCase() === "backend") {
    return path.resolve(cwd, "..");
  }

  return cwd;
}
