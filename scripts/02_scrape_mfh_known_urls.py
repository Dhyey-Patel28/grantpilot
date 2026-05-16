#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "GrantPilotMI/0.1 educational hackathon prototype; contact: dpatel48@emich.edu"}

FIELD_LABELS = [
    "Due Date", "Agency", "Source", "Funding Amount", "Funding Type",
    "Match Required", "Status", "Contact Info", "Posted Date",
    "Application Due Date", "Estimated Award Date",
]

def clean(x: Any) -> str:
    return re.sub(r"\s+", " ", str(x or "")).strip()

def get_grant_id(url: str) -> str:
    return parse_qs(urlparse(url).query).get("grant", [""])[0]

def load_urls(path: str) -> list[str]:
    p = Path(path)
    if not p.exists():
        return []
    return [
        line.strip()
        for line in p.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]

def fetch_html(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=25, allow_redirects=True)
    r.raise_for_status()
    return r.text

def lines_from_soup(soup: BeautifulSoup) -> list[str]:
    return [clean(x) for x in soup.get_text("\n").splitlines() if clean(x)]

def value_after(lines: list[str], label: str) -> str:
    label_l = label.lower()
    for i, line in enumerate(lines):
        lower = line.lower()
        if lower.startswith(label_l + ":"):
            return clean(line.split(":", 1)[1])
        if lower == label_l or lower == label_l + ":":
            return lines[i + 1] if i + 1 < len(lines) else ""
    return ""

def section_between(lines: list[str], start: str, stops: list[str]) -> str:
    start_idx = None
    for i, line in enumerate(lines):
        if line.lower().rstrip(":") == start.lower().rstrip(":"):
            start_idx = i + 1
            break
    if start_idx is None:
        return ""
    stop_set = {s.lower().rstrip(":") for s in stops}
    end_idx = len(lines)
    for j in range(start_idx, len(lines)):
        if lines[j].lower().rstrip(":") in stop_set:
            end_idx = j
            break
    return clean(" ".join(lines[start_idx:end_idx]))

def collect_after(lines: list[str], label: str, stops: list[str]) -> list[str]:
    start_idx = None
    for i, line in enumerate(lines):
        if line.lower().rstrip(":") == label.lower().rstrip(":"):
            start_idx = i + 1
            break
    if start_idx is None:
        return []
    stop_set = {s.lower().rstrip(":") for s in stops}
    out = []
    for line in lines[start_idx:]:
        if line.lower().rstrip(":") in stop_set:
            break
        if line not in {"*", "* * *", "Show More"}:
            out.append(line)
    return out

def extract_website(soup: BeautifulSoup) -> str:
    for a in soup.find_all("a", href=True):
        if "view website" in clean(a.get_text(" ")).lower():
            return a["href"]
    return ""

def is_exact_grant_page(soup: BeautifulSoup) -> bool:
    text = soup.get_text(" ")
    return "Key Information" in text and bool(soup.find("h1"))

def parse_url(url: str) -> dict[str, Any] | None:
    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")
    if not is_exact_grant_page(soup):
        print(f"  SKIP: not an exact grant detail page: {url}")
        return None

    lines = lines_from_soup(soup)
    h1 = soup.find("h1")
    title = clean(h1.get_text(" ")) if h1 else ""

    overview = section_between(lines, "Overview", ["Additional Info", "Apply with Confidence", "Need Help?"])
    additional = section_between(lines, "Additional Info", ["Apply with Confidence", "Need Help?"])
    eligible = collect_after(lines, "Eligible Applicants", ["Apply with Confidence", "Need Help?", "Show More"])
    categories = collect_after(lines, "Funding Categories", ["Funding Amount", "Funding Type", "Match Required", "Status"])

    rec = {
        "source": "MI Funding Hub",
        "source_kind": "real",
        "source_url": url,
        "exact_grant_url": url,
        "grant_id": get_grant_id(url),
        "title": title,
        "website": extract_website(soup),
        "overview": overview,
        "additional_info": additional,
        "eligible_applicants": eligible,
        "funding_categories_raw": categories,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "url_verified": True,
    }

    for label in FIELD_LABELS:
        rec[label.lower().replace(" ", "_")] = value_after(lines, label)

    return rec

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--urls", default="data/mfh_urls_real.txt")
    parser.add_argument("--out", default="outputs/data_mfh_real.json")
    parser.add_argument("--delay", type=float, default=1.0)
    args = parser.parse_args()

    urls = load_urls(args.urls)
    if not urls:
        print(f"No MI Funding Hub URLs found in {args.urls}. Skipping MI Funding Hub layer.")
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text("[]", encoding="utf-8")
        return

    records = []
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] Scraping {url}")
        try:
            rec = parse_url(url)
            if rec:
                records.append(rec)
        except Exception as exc:
            print(f"  ERROR: {exc}")
        time.sleep(args.delay)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Saved {len(records)} real MI Funding Hub records to {args.out}")

if __name__ == "__main__":
    main()
