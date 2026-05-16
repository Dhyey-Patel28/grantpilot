# GrantPilot MI — Auto Cache Pipeline

This version gives you a **one-command public grant data refresh pipeline**.

It fetches and caches public grant data from configured sources, adds timestamps, normalizes records, deduplicates, and writes a data-health report.

## What this does

`npm run refresh` runs:

1. Grants.gov public search across configured keywords.
2. Grants.gov public opportunity-detail fetch.
3. MI Funding Hub JavaScript discovery with Playwright.
4. MI Funding Hub exact grant-page scraping for discovered/known URLs.
5. Source registry update with `first_seen_at`, `last_seen_at`, `times_seen`, and content hashes.
6. Normalize all real grant records into one schema.
7. Write a data-health report.

## Important honesty

This fetches from **configured public sources**. It does not guarantee every grant on the internet. For the hackathon, say:

> GrantPilot uses a source registry and refresh pipeline for public Grants.gov and MI Funding Hub data. In production, we would add additional agency connectors and official/licensed feeds where available.

## Setup

```powershell
npm install
npm run setup:browser
```

## One-command refresh

Full refresh:

```powershell
npm run refresh
```

Fast/debug refresh:

```powershell
npm run refresh:fast
```

## Outputs

```text
cache/
  raw/
    grantsgov/
      search/
      details/
    mfh/
      network/
      rendered/
      details/
  registry/
    source_registry.json
  normalized/
    grants_normalized.json
  metadata/
    data_health.json

outputs/
  packets/
```

## Generate scores and packets

After refresh:

```powershell
npm run score:water
npm run packet:water

npm run score:transportation
npm run packet:transportation
```

Generated packets go to:

```text
outputs/packets/
```

## Configure keywords

Edit:

```text
data/config.json
```

The `keywords` list controls the public grant discovery scope.

## How timestamps work

- Raw search files include `fetched_at`.
- Raw detail files include `fetched_at` or `scraped_at`.
- `source_registry.json` tracks `first_seen_at`, `last_seen_at`, and `times_seen`.
- MI Funding Hub exact detail pages include `content_hash` so you can detect changed pages later.

## Suggested hackathon demo

1. Run `npm run refresh:fast` before demo.
2. Do **not** live-refresh during judging.
3. Show `cache/metadata/data_health.json`.
4. Generate packet with `npm run packet:water`.
5. Show `outputs/packets/water_packet.md`.

## watsonx Orchestrate framing

This Node pipeline can be wrapped into Orchestrate tools/agents:

- Discovery Agent
- Source Refresh Agent
- Normalization Agent
- Fit Scoring Agent
- Requirements Translator Agent
- Autofill Agent
- Trust Guard Agent
- Packet Generator Agent

IBM Bob is not required.
