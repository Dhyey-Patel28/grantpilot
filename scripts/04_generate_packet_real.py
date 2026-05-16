#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default="data/project_profile.json")
    parser.add_argument("--scored", default="outputs/scored_grants_real.json")
    parser.add_argument("--out", default="outputs/grantpilot_real_packet.md")
    parser.add_argument("--top", type=int, default=5)
    args = parser.parse_args()

    project = json.loads(Path(args.project).read_text(encoding="utf-8"))
    scored = json.loads(Path(args.scored).read_text(encoding="utf-8"))
    top = scored[:args.top]

    lines = [
        "# GrantPilot MI — Real Grant Match Packet",
        "",
        f"Generated: {date.today().isoformat()}",
        "",
        "## Community Project",
        "",
        f"**Community:** {project.get('community_name', 'Unknown')}",
        f"**County:** {project.get('county', 'Unknown')}",
        f"**Project category:** {project.get('project_category', 'Unknown')}",
        f"**Project stage:** {project.get('project_stage', 'Unknown')}",
        "",
        project.get("description", ""),
        "",
        "## Recommended Real Grant Matches",
        "",
    ]

    if not top:
        lines.append("> No real grant matches found. Try adding exact MI Funding Hub URLs or broadening Grants.gov keywords.")
    else:
        for i, g in enumerate(top, 1):
            lines.extend([
                f"### {i}. {g.get('title', 'Untitled')}",
                "",
                f"- **Fit score:** {g.get('fit_score')} / 100",
                f"- **Source:** {g.get('source')}",
                f"- **Agency:** {g.get('agency')}",
                f"- **Status:** {g.get('status')}",
                f"- **Due date:** {g.get('due_date') or 'Unknown / not specified'}",
                f"- **Exact/source URL:** {g.get('source_url')}",
                f"- **Recommendation:** {g.get('recommendation')}",
                "",
                "#### Score Breakdown",
            ])
            for item in g.get("score_breakdown", []):
                lines.append(f"- **{item['name']} ({item['points']} pts):** {item['reason']}")
            lines.extend(["", "#### Missing Requirements"])
            for req in g.get("missing_requirements", []):
                lines.append(f"- {req}")
            lines.extend(["", "#### Application Starter Fields"])
            lines.extend([
                f"**Project Title:** {project.get('community_name')} {project.get('project_category', '').title()} Readiness Project",
                "",
                f"**Applicant Name:** {project.get('community_name')}",
                "",
                f"**Problem Statement:** {project.get('description')}",
                "",
                f"**Funding Request Amount:** Unknown — needs preliminary cost estimate",
                "",
                f"**Public Benefit:** This project would help {project.get('community_name')} address a local {project.get('project_category')} need and improve service reliability for residents.",
                "",
                "---",
                "",
            ])

    lines.extend([
        "## Next Steps",
        "",
        "1. Open the exact/source URL and verify the opportunity manually.",
        "2. Confirm eligibility, deadline, match requirements, and required documents.",
        "3. Collect missing technical documents.",
        "4. Move autofilled answers into the official application form.",
        "5. Have a human grant/finance/engineering reviewer approve before submission.",
        "",
        "> Prototype disclaimer: This is an AI-assisted planning draft, not final eligibility, legal, financial, or engineering advice.",
    ])

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("\n".join(lines), encoding="utf-8")
    print(f"Saved real packet to {args.out}")

if __name__ == "__main__":
    main()
