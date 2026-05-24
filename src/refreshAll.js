import path from "node:path";
import { readJson, writeJson, ensureDir, nowIso } from "./lib/fs.js";
import { loadRegistry, saveRegistry } from "./lib/registry.js";
import { searchGrantsGovKeyword, collectGrantsGovDetails } from "./sources/grantsGov.js";
import { discoverMfhUrlsWithBrowser, scrapeKnownMfhUrls } from "./sources/mifundinghub.js";
import { normalizeAll } from "./pipeline/normalize.js";
import { buildDataHealth } from "./pipeline/dataHealth.js";

const args = new Set(process.argv.slice(2));
const fast = args.has("--fast");
const forceDetails = args.has("--force-details");
const root = process.cwd();
const cacheRoot = path.join(root, "cache");
const config = await readJson(path.join(root, "data", "config.json"));
const startedAt = Date.now();

const sourceHealth = {
  status: "running",
  mode: fast ? "fast" : "full",
  started_at: nowIso(),
  finished_at: null,
  duration_ms: null,
  grants_gov: {
    enabled: Boolean(config.grants_gov?.enabled),
    searches: [],
    detail_fetch: null
  },
  mi_funding_hub: {
    enabled: Boolean(config.mifundinghub?.enabled),
    discovery: null,
    detail_scrape: null
  },
  errors: []
};

await ensureDir(cacheRoot);
await ensureDir(path.join(cacheRoot, "metadata"));
await ensureDir(path.join(cacheRoot, "raw", "mfh", "network"));
await ensureDir(path.join(cacheRoot, "raw", "mfh", "rendered"));
await ensureDir(path.join(cacheRoot, "raw", "mfh", "details"));
await ensureDir(path.join(cacheRoot, "raw", "grantsgov", "search"));
await ensureDir(path.join(cacheRoot, "raw", "grantsgov", "details"));

const registryPath = path.join(root, config.cache.registry);
const registry = await loadRegistry(registryPath);

const keywords = config.keywords || [];
console.log(`\nGrantPilot refresh starting. Mode: ${fast ? "FAST" : "FULL"}`);
console.log(`Configured keywords: ${keywords.length}`);

if (config.grants_gov?.enabled) {
  const rows = fast ? config.grants_gov.rows_per_keyword_fast : config.grants_gov.rows_per_keyword;
  const maxPages = fast ? config.grants_gov.max_pages_per_keyword_fast : config.grants_gov.max_pages_per_keyword;

  for (const keyword of keywords) {
    try {
      await searchGrantsGovKeyword({
        keyword,
        rows,
        outDir: cacheRoot,
        registry,
        maxPages,
        delayMs: config.grants_gov.delay_ms || 250,
        sourceHealth: sourceHealth.grants_gov
      });
      await new Promise(r => setTimeout(r, config.grants_gov.delay_ms || 250));
    } catch (err) {
      const message = `Grants.gov keyword failed "${keyword}": ${err.message}`;
      sourceHealth.errors.push({ source: "Grants.gov", stage: "search", keyword, error: err.message });
      sourceHealth.grants_gov.searches.push({ source: "Grants.gov", keyword, status: "failed", error: err.message, fetched_at: nowIso() });
      console.log(message);
    }
  }

  if (config.grants_gov.fetch_details) {
    try {
      await collectGrantsGovDetails({
        registry,
        outDir: cacheRoot,
        maxDetails: fast ? config.grants_gov.max_detail_fetches_fast : config.grants_gov.max_detail_fetches,
        delayMs: config.grants_gov.delay_ms || 250,
        force: forceDetails,
        sourceHealth: sourceHealth.grants_gov
      });
    } catch (err) {
      sourceHealth.errors.push({ source: "Grants.gov", stage: "detail", error: err.message });
      console.log(`Grants.gov detail fetch failed: ${err.message}`);
    }
  }
}

if (config.mifundinghub?.enabled && config.mifundinghub.discover_with_playwright) {
  try {
    await discoverMfhUrlsWithBrowser({
      keywords,
      registry,
      outDir: cacheRoot,
      maxLinksPerKeyword: fast ? config.mifundinghub.max_links_per_keyword_fast : config.mifundinghub.max_links_per_keyword,
      headless: config.mifundinghub.headless !== false
    });
    sourceHealth.mi_funding_hub.discovery = {
      status: "ok",
      finished_at: nowIso(),
      known_urls: Object.keys(registry.sources.mfh_grant_urls || {}).length
    };
  } catch (err) {
    sourceHealth.mi_funding_hub.discovery = { status: "failed", error: err.message, finished_at: nowIso() };
    sourceHealth.errors.push({ source: "MI Funding Hub", stage: "discovery", error: err.message });
    console.log(`MI Funding Hub JS discovery failed: ${err.message}`);
  }
}

if (config.mifundinghub?.enabled && config.mifundinghub.refresh_existing_urls) {
  try {
    await scrapeKnownMfhUrls({
      registry,
      outDir: cacheRoot,
      delayMs: config.mifundinghub.delay_ms || 500
    });
    sourceHealth.mi_funding_hub.detail_scrape = {
      status: "ok",
      finished_at: nowIso(),
      known_urls: Object.keys(registry.sources.mfh_grant_urls || {}).length
    };
  } catch (err) {
    sourceHealth.mi_funding_hub.detail_scrape = { status: "failed", error: err.message, finished_at: nowIso() };
    sourceHealth.errors.push({ source: "MI Funding Hub", stage: "details", error: err.message });
    console.log(`MI Funding Hub detail scrape failed: ${err.message}`);
  }
}

await saveRegistry(registryPath, registry);

const normalizedOutput = await normalizeAll({ outDir: cacheRoot, returnMetadata: true });
await writeJson(path.join(root, config.cache.normalized), normalizedOutput.grants);
await writeJson(path.join(cacheRoot, "metadata", "dedupe_report.json"), normalizedOutput.dedupe);

sourceHealth.status = sourceHealth.errors.length ? "partial" : "ok";
sourceHealth.finished_at = nowIso();
sourceHealth.duration_ms = Date.now() - startedAt;
sourceHealth.normalization = {
  status: "ok",
  grants_before_dedupe: normalizedOutput.dedupe.input_count,
  grants_after_dedupe: normalizedOutput.dedupe.output_count,
  duplicate_count: normalizedOutput.dedupe.duplicate_count,
  by_source_before_dedupe: normalizedOutput.source_counts_before_dedupe,
  by_source_after_dedupe: normalizedOutput.source_counts_after_dedupe
};
await writeJson(path.join(cacheRoot, "metadata", "source_health.json"), sourceHealth);

const health = buildDataHealth({ grants: normalizedOutput.grants, registry, sourceHealth, dedupe: normalizedOutput.dedupe });
await writeJson(path.join(root, config.cache.data_health), health);

console.log("\nRefresh complete.");
console.log(`Normalized real grants: ${normalizedOutput.grants.length}`);
console.log(`Duplicates removed: ${normalizedOutput.dedupe.duplicate_count}`);
console.log(`Data health written to: ${config.cache.data_health}`);
console.log("Source health written to: cache/metadata/source_health.json");
console.log(`Normalized cache written to: ${config.cache.normalized}`);
