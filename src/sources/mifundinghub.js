import path from "node:path";
import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeJson, writeText, readJson, nowIso, slugify } from "../lib/fs.js";
import { sha256 } from "../lib/hash.js";
import { cleanText, inferCategories } from "../lib/text.js";
import { upsertMfhUrl } from "../lib/registry.js";

const FIND_FUNDING_URL = "https://mifundinghub.org/find-funding/";
const GRANT_URL_RE = /https:\/\/mifundinghub\.org\/funding-opportunities\/\?grant=\d+/g;

function extractGrantUrlsFromText(text) {
  return Array.from(new Set(String(text || "").match(GRANT_URL_RE) || []));
}

async function collectFrameLinks(page) {
  const all = [];
  for (const frame of page.frames()) {
    try {
      const links = await frame.$$eval("a[href]", els => els.map(a => ({
        text: (a.innerText || a.textContent || "").trim(),
        href: a.href
      })));
      all.push(...links);
    } catch {}
  }
  return all;
}

async function trySearchInFrames(page, keyword) {
  if (!keyword) return false;
  const selectors = [
    "input[type='search']",
    "input[placeholder*='Search']",
    "input[aria-label*='Search']",
    "input"
  ];

  for (const frame of page.frames()) {
    for (const selector of selectors) {
      try {
        const loc = frame.locator(selector).first();
        await loc.waitFor({ timeout: 2000 });
        await loc.fill(keyword);
        await loc.press("Enter");
        await page.waitForTimeout(3500);
        return true;
      } catch {}
    }
  }
  return false;
}

export async function discoverMfhUrlsWithBrowser({ keywords, registry, outDir, maxLinksPerKeyword, headless }) {
  console.log("MI Funding Hub JS discovery starting...");
  const discovered = [];
  const seen = new Set();

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    userAgent: "GrantPilotMI/1.0 educational hackathon prototype"
  });

  page.on("response", async response => {
    try {
      const ctype = response.headers()["content-type"] || "";
      if (!ctype.toLowerCase().includes("json") && !ctype.toLowerCase().includes("application")) return;
      const url = response.url();
      let body;
      try { body = await response.json(); } catch { return; }
      const raw = JSON.stringify(body);
      for (const grantUrl of extractGrantUrlsFromText(raw)) {
        if (!seen.has(grantUrl)) {
          seen.add(grantUrl);
          discovered.push({ source: "network", keyword: null, url: grantUrl, text: "" });
          upsertMfhUrl(registry, grantUrl, { discovery_method: "playwright_network" });
        }
      }
      await writeJson(
        path.join(outDir, "raw", "mfh", "network", `${slugify(url)}.json`),
        { url, fetched_at: nowIso(), body }
      );
    } catch {}
  });

  for (const keyword of keywords) {
    console.log(`MI Funding Hub keyword: ${keyword}`);
    try {
      await page.goto(FIND_FUNDING_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(6000);

      await trySearchInFrames(page, keyword);

      let count = 0;
      for (let i = 0; i < 12; i++) {
        const links = await collectFrameLinks(page);
        for (const link of links) {
          const urls = extractGrantUrlsFromText(link.href);
          for (const url of urls) {
            if (!seen.has(url)) {
              seen.add(url);
              count += 1;
              discovered.push({ source: "rendered_link", keyword, url, text: link.text });
              upsertMfhUrl(registry, url, { discovery_method: "playwright_rendered_link", keyword });
            }
          }
          if (count >= maxLinksPerKeyword) break;
        }
        if (count >= maxLinksPerKeyword) break;
        await page.mouse.wheel(0, 1500);
        await page.waitForTimeout(900);
      }

      await writeText(path.join(outDir, "raw", "mfh", "rendered", `${slugify(keyword)}.html`), await page.content());
      console.log(`  discovered new/total URLs so far: ${seen.size}`);
    } catch (err) {
      console.log(`  MI Funding Hub discovery failed for ${keyword}: ${err.message}`);
    }
  }

  await browser.close();

  await writeJson(path.join(outDir, "raw", "mfh", "mfh_discovered_urls.json"), {
    fetched_at: nowIso(),
    count: discovered.length,
    discovered
  });

  return Array.from(seen);
}

function valueAfter(lines, label) {
  const ll = label.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (lower.startsWith(`${ll}:`)) return cleanText(lines[i].split(":").slice(1).join(":"));
    if (lower === ll || lower === `${ll}:`) return lines[i + 1] || "";
  }
  return "";
}

function sectionBetween(lines, start, stops) {
  const startKey = start.toLowerCase().replace(/:$/, "");
  const stopSet = new Set(stops.map(s => s.toLowerCase().replace(/:$/, "")));
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().replace(/:$/, "") === startKey) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx < 0) return "";
  let endIdx = lines.length;
  for (let j = startIdx; j < lines.length; j++) {
    if (stopSet.has(lines[j].toLowerCase().replace(/:$/, ""))) {
      endIdx = j;
      break;
    }
  }
  return cleanText(lines.slice(startIdx, endIdx).join(" "));
}

function collectAfter(lines, label, stops) {
  const key = label.toLowerCase().replace(/:$/, "");
  const stopSet = new Set(stops.map(s => s.toLowerCase().replace(/:$/, "")));
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().replace(/:$/, "") === key) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx < 0) return [];
  const out = [];
  for (let j = startIdx; j < lines.length; j++) {
    if (stopSet.has(lines[j].toLowerCase().replace(/:$/, ""))) break;
    if (!["*", "* * *", "Show More"].includes(lines[j])) out.push(lines[j]);
  }
  return out;
}

export async function scrapeMfhGrantUrl({ url, outDir, registry }) {
  const grantId = new URL(url).searchParams.get("grant") || sha256(url).slice(0, 12);
  const rawPath = path.join(outDir, "raw", "mfh", "details", `${grantId}.html`);
  let html = null;
  let fromCache = false;

  try {
    html = await fetch(url, { headers: { "User-Agent": "GrantPilotMI/1.0" } }).then(r => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.text();
    });
    await writeText(rawPath, html);
  } catch (err) {
    try {
      html = await (await import("node:fs/promises")).readFile(rawPath, "utf8");
      fromCache = true;
      console.log(`  using cached MI Funding Hub page ${grantId}`);
    } catch {
      console.log(`  failed MI Funding Hub detail ${url}: ${err.message}`);
      return null;
    }
  }

  const $ = cheerio.load(html);
  const title = cleanText($("h1").first().text());
  const pageText = cleanText($.text());

  if (!title || !pageText.includes("Key Information")) {
    return null;
  }

  const lines = $.text().split(/\n+/).map(cleanText).filter(Boolean);
  const overview = sectionBetween(lines, "Overview", ["Additional Info", "Apply with Confidence", "Need Help?"]);
  const additionalInfo = sectionBetween(lines, "Additional Info", ["Apply with Confidence", "Need Help?"]);
  const eligibleApplicants = collectAfter(lines, "Eligible Applicants", ["Apply with Confidence", "Need Help?", "Show More"]);
  const fundingCategoriesRaw = collectAfter(lines, "Funding Categories", ["Funding Amount", "Funding Type", "Match Required", "Status"]);

  let website = "";
  $("a[href]").each((_, a) => {
    const text = cleanText($(a).text()).toLowerCase();
    if (text.includes("view website")) website = $(a).attr("href");
  });

  const record = {
    source: "MI Funding Hub",
    source_kind: "real",
    source_url: url,
    exact_grant_url: url,
    website,
    grant_id: grantId,
    title,
    overview,
    additional_info: additionalInfo,
    eligible_applicants: eligibleApplicants,
    funding_categories_raw: fundingCategoriesRaw,
    categories_inferred: inferCategories(`${title} ${overview} ${additionalInfo} ${fundingCategoriesRaw.join(" ")}`),
    due_date: valueAfter(lines, "Due Date"),
    agency: valueAfter(lines, "Agency"),
    source_level: valueAfter(lines, "Source"),
    funding_amount: valueAfter(lines, "Funding Amount"),
    funding_type: valueAfter(lines, "Funding Type"),
    match_required: valueAfter(lines, "Match Required"),
    status: valueAfter(lines, "Status"),
    contact_info: valueAfter(lines, "Contact Info"),
    posted_date: valueAfter(lines, "Posted Date"),
    application_due_date: valueAfter(lines, "Application Due Date"),
    scraped_at: nowIso(),
    content_hash: sha256(html),
    from_cache: fromCache
  };

  registry.sources.mfh_grant_urls[url] = {
    ...(registry.sources.mfh_grant_urls[url] || {}),
    title,
    last_scraped_at: nowIso(),
    content_hash: record.content_hash,
    url_verified: true
  };

  await writeJson(path.join(outDir, "raw", "mfh", "details", `${grantId}.json`), record);
  return record;
}

export async function scrapeKnownMfhUrls({ registry, outDir, delayMs }) {
  const urls = Object.keys(registry.sources.mfh_grant_urls || {});
  console.log(`MI Funding Hub detail scrape queue: ${urls.length} URLs`);
  const records = [];
  for (const url of urls) {
    try {
      const rec = await scrapeMfhGrantUrl({ url, outDir, registry });
      if (rec) records.push(rec);
    } catch (err) {
      console.log(`  scrape failed for ${url}: ${err.message}`);
    }
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
  }
  return records;
}
