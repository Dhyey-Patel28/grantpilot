#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any

import requests

SEARCH_URL = "https://api.grants.gov/v1/api/search2"
FETCH_URL = "https://api.grants.gov/v1/api/fetchOpportunity"

def load_keywords(path: str) -> list[str]:
    return [
        line.strip()
        for line in Path(path).read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]

def post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    r = requests.post(
        url,
        headers={"Content-Type": "application/json", "User-Agent": "GrantPilotMI/0.1"},
        json=payload,
        timeout=40,
    )
    r.raise_for_status()
    return r.json()

def search(keyword: str, rows: int) -> dict[str, Any]:
    return post_json(SEARCH_URL, {
        "keyword": keyword,
        "oppStatuses": "forecasted|posted",
        "rows": rows,
    })

def fetch_detail(opp_id: int | str) -> dict[str, Any]:
    return post_json(FETCH_URL, {"opportunityId": int(opp_id)})

def get_hits(resp: dict[str, Any]) -> list[dict[str, Any]]:
    data = resp.get("data", {})
    if isinstance(data, dict) and isinstance(data.get("oppHits"), list):
        return data["oppHits"]
    if isinstance(resp.get("oppHits"), list):
        return resp["oppHits"]
    return []

def normalize_hit(hit: dict[str, Any], keyword: str) -> dict[str, Any]:
    return {
        "source": "Grants.gov",
        "source_kind": "real",
        "search_keyword": keyword,
        "opportunity_id": hit.get("id"),
        "opportunity_number": hit.get("number"),
        "title": hit.get("title"),
        "agency": hit.get("agencyName") or hit.get("agencyCode"),
        "agency_code": hit.get("agencyCode"),
        "open_date": hit.get("openDate"),
        "close_date": hit.get("closeDate"),
        "status": hit.get("oppStatus"),
        "source_url": "https://www.grants.gov/search-results-detail/" + str(hit.get("id")) if hit.get("id") else "https://www.grants.gov/",
        "raw_search_hit": hit,
    }

def enrich(record: dict[str, Any]) -> dict[str, Any]:
    opp_id = record.get("opportunity_id")
    if not opp_id:
        return record
    try:
        detail = fetch_detail(opp_id)
        data = detail.get("data", {})
        synopsis = data.get("synopsis", {}) if isinstance(data, dict) else {}

        record["details"] = {
            "description": synopsis.get("synopsisDesc"),
            "agency_name": synopsis.get("agencyName"),
            "cost_sharing": synopsis.get("costSharing"),
            "award_ceiling": synopsis.get("awardCeilingFormatted") or synopsis.get("awardCeiling"),
            "award_floor": synopsis.get("awardFloorFormatted") or synopsis.get("awardFloor"),
            "posting_date": synopsis.get("postingDate"),
            "response_date": synopsis.get("responseDateDesc"),
            "applicant_types": [
                x.get("description") for x in synopsis.get("applicantTypes", []) if isinstance(x, dict)
            ],
            "funding_instruments": [
                x.get("description") for x in synopsis.get("fundingInstruments", []) if isinstance(x, dict)
            ],
            "funding_categories": [
                x.get("description") for x in synopsis.get("fundingActivityCategories", []) if isinstance(x, dict)
            ],
            "agency_contact_name": synopsis.get("agencyContactName"),
            "agency_contact_email": synopsis.get("agencyContactEmail"),
        }
    except Exception as exc:
        record["detail_error"] = str(exc)
    return record

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keywords", default="data/keywords.txt")
    parser.add_argument("--out", default="outputs/data_grants_gov_real.json")
    parser.add_argument("--rows", type=int, default=15)
    parser.add_argument("--fetch-details", action="store_true")
    parser.add_argument("--delay", type=float, default=0.5)
    args = parser.parse_args()

    keywords = load_keywords(args.keywords)
    records = []
    seen = set()

    for keyword in keywords:
        print(f"Searching Grants.gov: {keyword}")
        try:
            resp = search(keyword, args.rows)
            hits = get_hits(resp)
            print(f"  {len(hits)} hits")
            for hit in hits:
                record = normalize_hit(hit, keyword)
                key = record.get("opportunity_id") or (record.get("title"), record.get("agency"))
                if key in seen:
                    continue
                seen.add(key)
                if args.fetch_details:
                    record = enrich(record)
                    time.sleep(args.delay)
                records.append(record)
        except Exception as exc:
            print(f"  ERROR: {exc}")
        time.sleep(args.delay)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Saved {len(records)} real Grants.gov records to {args.out}")

if __name__ == "__main__":
    main()
