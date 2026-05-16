import path from "node:path";
import { readJson, writeText } from "./lib/fs.js";
import { scoreGrants } from "./pipeline/scoring.js";

const projectPath = process.argv[2];
const outPathArg = process.argv[3] || "outputs/packets/grantpilot_packet.md";
if (!projectPath) {
  console.error("Usage: node src/generatePacket.js data/project_profiles/water.json outputs/packets/water_packet.md");
  process.exit(1);
}

const root = process.cwd();
const config = await readJson(path.join(root, "data", "config.json"));
const project = await readJson(path.join(root, projectPath));
const grants = await readJson(path.join(root, config.cache.normalized), []);
const scored = scoreGrants(project, grants).slice(0, 5);
const health = await readJson(path.join(root, config.cache.data_health), {});

const communityLabel = project.community_name || project.county || "Unknown community";
const categoryLabel = String(project.project_category || "project").replace(/_/g, " ");
const titleCategory = categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);

const lines = [];
lines.push("# GrantPilot MI — Real Grant Readiness Packet", "");
lines.push(`Generated: ${new Date().toISOString()}`, "");
lines.push("## Project", "");
lines.push(`**Community:** ${communityLabel}`);
lines.push(`**County:** ${project.county || "Unknown"}`);
lines.push(`**Applicant type:** ${project.applicant_type || "Unknown"}`);
lines.push(`**Project category:** ${project.project_category || "unknown"}`);
lines.push(`**Project stage:** ${project.project_stage || "unknown"}`, "");
lines.push(project.description || "No project description provided.", "");
lines.push("## Data Health", "");
lines.push(`- **Total normalized real grants:** ${health.total_normalized_real_grants ?? grants.length}`);
lines.push(`- **Known Grants.gov opportunities:** ${health.known_grants_gov_opportunities ?? "Unknown"}`);
lines.push(`- **Known MI Funding Hub URLs:** ${health.known_mi_funding_hub_urls ?? "Unknown"}`);
lines.push(`- **Cache generated at:** ${health.generated_at ?? "Unknown"}`, "");
lines.push("## Top Grant Matches", "");

if (!scored.length) {
  lines.push("> No grant matches found. Run `npm run refresh` first.");
} else {
  scored.forEach((g, idx) => {
    lines.push(`### ${idx + 1}. ${g.title}`, "");
    lines.push(`- **Fit score:** ${g.fit_score} / 100`);
    lines.push(`- **Source:** ${g.source}`);
    lines.push(`- **Agency:** ${g.agency || "Unknown"}`);
    lines.push(`- **Status:** ${g.status}`);
    lines.push(`- **Due date:** ${g.due_date || "Unknown / not specified"}`);
    lines.push(`- **Source URL:** ${g.source_url}`);
    lines.push(`- **Recommendation:** ${g.recommendation}`, "");
    lines.push("#### Score Breakdown");
    for (const item of g.score_breakdown || []) {
      lines.push(`- **${item.name} (${item.points} pts):** ${item.reason}`);
    }
    lines.push("", "#### Missing Requirements");
    for (const req of g.missing_requirements || []) {
      lines.push(`- ${req}`);
    }
    lines.push("", "#### Application Starter Fields");
    lines.push(`**Project Title:** ${communityLabel} ${titleCategory} Readiness Project`, "");
    lines.push(`**Applicant Name:** ${communityLabel}`, "");
    lines.push(`**Problem Statement:** ${project.description || "Unknown — needs project description"}`, "");
    lines.push(`**Funding Request Amount:** ${project.estimated_cost ?? "Unknown — needs preliminary cost estimate"}`, "");
    lines.push(`**Public Benefit:** This project would help ${communityLabel} address a local ${categoryLabel} need and improve service reliability for residents.`, "");
    lines.push("---", "");
  });
}

lines.push("## Next Steps", "");
lines.push("1. Open each source URL and verify the opportunity manually.");
lines.push("2. Confirm eligibility, deadline, match requirements, and required documents.");
lines.push("3. Collect missing technical documents.");
lines.push("4. Move autofilled answers into the official funder form.");
lines.push("5. Have a human grant, finance, engineering, or legal reviewer approve before submission.", "");
lines.push("> Prototype disclaimer: This packet is an AI-assisted planning draft, not final eligibility, legal, financial, or engineering advice.");

await writeText(path.join(root, outPathArg), lines.join("\n"));
console.log(`Saved packet: ${outPathArg}`);
