#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from dateutil import parser as date_parser

def clean(x: Any) -> str:
    return re.sub(r"\s+", " ", str(x or "")).strip()

def load(path: str) -> list[dict[str, Any]]:
    p = Path(path)
    if not p.exists():
        return []
    data = json.loads(p.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []

def parse_date(x: Any) -> str | None:
    s = clean(x)
    if not s or s.lower() in {"unknown", "none", "n/a", "not specified"}:
        return None
    try:
        return date_parser.parse(s, fuzzy=True).date().isoformat()
    except Exception:
        return None

def status_from(record: dict[str, Any]) -> str:
    raw = clean(record.get("status")).lower()
    due = parse_date(record.get("application_due_date")) or parse_date(record.get("due_date")) or parse_date(record.get("close_date"))
    today = datetime.now(timezone.utc).date()
    if due:
        d = datetime.fromisoformat(due).date()
        if d < today:
            return "closed"
        return "closing_soon" if (d - today).days <= 30 else "open"
    if "forecast" in raw:
        return "forecasted"
    if "posted" in raw or "open" in raw:
        return "open_unknown_deadline"
    if "closed" in raw or "archived" in raw:
        return "closed"
    return "unknown"

def infer_categories(text: str) -> list[str]:
    text = text.lower()
    mapping = {
        "water": ["water", "drinking water", "wastewater", "sewer", "stormwater"],
        "transportation": ["road", "bridge", "transportation", "transit", "traffic", "sidewalk"],
        "housing": ["housing", "home", "rental", "affordable"],
        "energy": ["energy", "grid", "renewable", "solar", "efficiency", "resilience"],
        "broadband": ["broadband", "internet", "connectivity"],
        "community_development": ["community development", "downtown", "revitalization", "placemaking"],
        "public_safety": ["public safety", "fire", "police", "emergency", "ems"],
        "agriculture": ["agriculture", "farm", "food", "rural"],
        "workforce": ["workforce", "training", "career", "apprenticeship"],
        "environment": ["environment", "climate", "conservation", "great lakes", "brownfield"],
    }
    return sorted([cat for cat, words in mapping.items() if any(w in text for w in words)])

def normalize_mfh(r: dict[str, Any]) -> dict[str, Any]:
    text = " ".join([clean(r.get("title")), clean(r.get("overview")), clean(r.get("additional_info")), json.dumps(r.get("funding_categories_raw", []))])
    return {
        "id": "mfh_" + clean(r.get("grant_id")),
        "source": "MI Funding Hub",
        "source_kind": "real",
        "title": clean(r.get("title")),
        "agency": clean(r.get("agency")),
        "source_url": clean(r.get("source_url")),
        "website": clean(r.get("website")),
        "status": status_from(r),
        "due_date": parse_date(r.get("application_due_date")) or parse_date(r.get("due_date")),
        "funding_amount": clean(r.get("funding_amount")),
        "funding_type": clean(r.get("funding_type")),
        "match_required": clean(r.get("match_required")),
        "eligible_applicants": r.get("eligible_applicants") or [],
        "categories": infer_categories(text),
        "overview": clean(r.get("overview") or r.get("additional_info")),
        "raw": r,
    }

def normalize_grantsgov(r: dict[str, Any]) -> dict[str, Any]:
    details = r.get("details") or {}
    text = " ".join([clean(r.get("title")), clean(r.get("agency")), clean(details.get("description")), json.dumps(details.get("funding_categories", []))])
    return {
        "id": "grantsgov_" + clean(r.get("opportunity_id") or r.get("opportunity_number")),
        "source": "Grants.gov",
        "source_kind": "real",
        "title": clean(r.get("title")),
        "agency": clean(r.get("agency") or details.get("agency_name")),
        "source_url": clean(r.get("source_url") or "https://www.grants.gov/"),
        "website": clean(r.get("source_url") or "https://www.grants.gov/"),
        "status": status_from(r),
        "due_date": parse_date(r.get("close_date") or details.get("response_date")),
        "funding_amount": clean(details.get("award_ceiling")),
        "funding_type": "Grant",
        "match_required": "Yes" if details.get("cost_sharing") else "Unknown",
        "eligible_applicants": details.get("applicant_types") or [],
        "categories": infer_categories(text),
        "overview": clean(details.get("description")),
        "raw": r,
    }

def applicant_score(project, grant):
    applicant = clean(project.get("applicant_type")).lower()
    eligible = " ".join(grant.get("eligible_applicants", [])).lower()
    if not eligible:
        return 10, "Eligible applicants not listed; needs manual review."
    if applicant and applicant in eligible:
        return 25, "Applicant type appears to match."
    if any(x in eligible for x in ["city", "township", "village", "county", "local government"]) and any(x in applicant for x in ["city", "township", "village", "county", "local"]):
        return 22, "Local government eligibility appears likely."
    return 0, "Applicant type does not clearly match."

def category_score(project, grant):
    cat = clean(project.get("project_category")).lower()
    cats = [x.lower() for x in grant.get("categories", [])]
    text = (grant.get("title","") + " " + grant.get("overview","")).lower()
    if cat in cats:
        return 20, "Project category matches."
    if cat and cat in text:
        return 15, "Project category appears in grant text."
    return 0, "Project category does not clearly match."

def stage_score(project, grant):
    stage = clean(project.get("project_stage")).lower()
    text = (grant.get("title","") + " " + grant.get("overview","")).lower()
    if stage in {"early planning", "planning", "pre-development"} and any(w in text for w in ["planning", "technical assistance", "feasibility", "engineering", "design"]):
        return 15, "Grant may support planning/pre-development."
    if stage in {"construction", "implementation"} and any(w in text for w in ["construction", "implementation", "capital"]):
        return 15, "Grant may support implementation."
    return 5, "Project stage fit is unclear."

def deadline_score(grant):
    st = grant.get("status")
    if st == "open": return 10, "Grant appears open."
    if st == "closing_soon": return 6, "Open but deadline is close."
    if st == "open_unknown_deadline": return 8, "Available but deadline needs review."
    if st == "forecasted": return 6, "Forecasted; useful for planning."
    if st == "closed": return 2, "Closed; consider watchlist if recurring."
    return 4, "Status unclear."

def cost_score(project, grant):
    if project.get("estimated_cost") is None:
        return 4, "Project cost estimate is missing."
    if not grant.get("funding_amount"):
        return 6, "Grant amount unclear."
    return 8, "Cost/award fit needs manual review."

def match_score(project, grant):
    match = grant.get("match_required", "").lower()
    avail = project.get("match_available")
    if "no" in match: return 10, "No match appears required."
    if "yes" in match and avail is True: return 10, "Match appears required and available."
    if "yes" in match and avail is not True: return 2, "Match may be required but availability unknown."
    return 5, "Match requirement unclear."

def impact_score(project, grant):
    kws = [str(x).lower() for x in project.get("impact_keywords", [])]
    text = (grant.get("title","") + " " + grant.get("overview","") + " " + json.dumps(grant.get("raw", {}))).lower()
    matched = [k for k in kws if k in text]
    if len(matched) >= 3: return 10, "Strong impact match: " + ", ".join(matched[:5])
    if matched: return 6, "Some impact match: " + ", ".join(matched[:5])
    return 3, "Impact fit needs more evidence."

def score(project, grant):
    parts = [
        ("Applicant eligibility", *applicant_score(project, grant)),
        ("Project category", *category_score(project, grant)),
        ("Project stage", *stage_score(project, grant)),
        ("Deadline feasibility", *deadline_score(grant)),
        ("Funding amount / cost fit", *cost_score(project, grant)),
        ("Match requirement fit", *match_score(project, grant)),
        ("Community impact match", *impact_score(project, grant)),
    ]
    total = sum(p[1] for p in parts)
    missing = []
    if project.get("estimated_cost") is None: missing.append("Preliminary cost estimate")
    if project.get("match_available") is None: missing.append("Local match availability")
    docs = " ".join([str(x).lower() for x in project.get("documents_available", [])])
    if "engineering" not in docs: missing.append("Engineering memo or technical opinion")
    if project.get("project_category") == "water" and "water test" not in docs: missing.append("Water test results")
    if "council" not in docs: missing.append("Council resolution or approval record")
    rec = "Low fit."
    if grant["status"] == "closed": rec = "Closed now. Add to watchlist if recurring."
    elif total >= 80: rec = "Strong candidate. Prepare missing documents and verify eligibility."
    elif total >= 60: rec = "Possible candidate. Review blockers before spending application time."
    return {**grant, "fit_score": total, "score_breakdown": [{"name": a, "points": b, "reason": c} for a,b,c in parts], "missing_requirements": missing, "recommendation": rec}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default="data/project_profile.json")
    parser.add_argument("--mfh", default="outputs/data_mfh_real.json")
    parser.add_argument("--grantsgov", default="outputs/data_grants_gov_real.json")
    parser.add_argument("--normalized-out", default="outputs/grants_normalized_real.json")
    parser.add_argument("--scored-out", default="outputs/scored_grants_real.json")
    args = parser.parse_args()

    project = json.loads(Path(args.project).read_text(encoding="utf-8"))
    grants = [normalize_mfh(r) for r in load(args.mfh)] + [normalize_grantsgov(r) for r in load(args.grantsgov)]

    dedup = []
    seen = set()
    for g in grants:
        key = (g["title"].lower(), g["agency"].lower())
        if g["title"] and key not in seen:
            seen.add(key)
            dedup.append(g)

    scored = [score(project, g) for g in dedup]
    scored.sort(key=lambda x: x["fit_score"], reverse=True)

    Path(args.normalized_out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.normalized_out).write_text(json.dumps(dedup, indent=2), encoding="utf-8")
    Path(args.scored_out).write_text(json.dumps(scored, indent=2), encoding="utf-8")

    print(f"Normalized real grants: {len(dedup)}")
    print(f"Scored real grants: {len(scored)}")
    print("Top 10:")
    for g in scored[:10]:
        print(f"{g['fit_score']:>3} | {g['status']:<20} | {g['source']:<15} | {g['title'][:90]}")

if __name__ == "__main__":
    main()
