import path from "node:path";
import { readJson, writeJson, ensureDir } from "./lib/fs.js";
import { loadRegistry, saveRegistry } from "./lib/registry.js";
import { searchGrantsGovKeyword, collectGrantsGovDetails } from "./sources/grantsGov.js";
import { discoverMfhUrlsWithBrowser, scrapeKnownMfhUrls } from "./sources/mifundinghub.js";
import { normalizeAll } from "./pipeline/normalize.js";
import { buildDataHealth } from "./pipeline/dataHealth.js";

const args = new Set(process.argv.slice(2));
const fast = args.has("--fast");
const root = process.cwd();
const cacheRoot = path.join(root, "cache");
const config = await readJson(path.join(root, "data", "config.json"));

await ensureDir(cacheRoot);
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
  for (const keyword of keywords) {
    try {
      await searchGrantsGovKeyword({ keyword, rows, outDir: cacheRoot, registry });
      await new Promise(r => setTimeout(r, config.grants_gov.delay_ms || 250));
    } catch (err) {
      console.log(`Grants.gov keyword failed "${keyword}": ${err.message}`);
    }
  }

  if (config.grants_gov.fetch_details) {
    await collectGrantsGovDetails({
      registry,
      outDir: cacheRoot,
      maxDetails: fast ? config.grants_gov.max_detail_fetches_fast : config.grants_gov.max_detail_fetches,
      delayMs: config.grants_gov.delay_ms || 250
    });
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
  } catch (err) {
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
  } catch (err) {
    console.log(`MI Funding Hub detail scrape failed: ${err.message}`);
  }
}

await saveRegistry(registryPath, registry);

const grants = await normalizeAll({ outDir: cacheRoot });
await writeJson(path.join(root, config.cache.normalized), grants);

const health = buildDataHealth({ grants, registry });
await writeJson(path.join(root, config.cache.data_health), health);

console.log("\nRefresh complete.");
console.log(`Normalized real grants: ${grants.length}`);
console.log(`Data health written to: ${config.cache.data_health}`);
console.log(`Normalized cache written to: ${config.cache.normalized}`);
