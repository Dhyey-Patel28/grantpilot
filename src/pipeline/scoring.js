import { cleanText } from "../lib/text.js";

function applicantScore(project, grant) {
  const applicant = cleanText(project.applicant_type).toLowerCase();
  const eligible = (grant.eligible_applicants || []).join(" ").toLowerCase();
  if (!eligible) return [10, "Eligible applicants not listed; needs manual review."];
  if (applicant && eligible.includes(applicant)) return [25, "Applicant type appears to match."];
  if (["city", "township", "village", "county", "local government"].some(x => eligible.includes(x)) &&
      ["city", "township", "village", "county", "local"].some(x => applicant.includes(x))) {
    return [22, "Local government eligibility appears likely."];
  }
  return [0, "Applicant type does not clearly match."];
}

function categoryScore(project, grant) {
  const cat = cleanText(project.project_category).toLowerCase();
  const cats = (grant.categories || []).map(x => x.toLowerCase());
  const text = `${grant.title} ${grant.overview}`.toLowerCase();
  if (cat && cats.includes(cat)) return [20, "Project category matches."];
  if (cat && text.includes(cat)) return [15, "Project category appears in grant text."];
  const impactHits = (project.impact_keywords || []).filter(k => text.includes(String(k).toLowerCase()));
  if (impactHits.length >= 2) return [12, `Project impact keywords match: ${impactHits.slice(0, 3).join(", ")}.`];
  return [0, "Project category does not clearly match."];
}

function stageScore(project, grant) {
  const stage = cleanText(project.project_stage).toLowerCase();
  const text = `${grant.title} ${grant.overview}`.toLowerCase();
  if (["early planning", "planning", "pre-development"].includes(stage) &&
      ["planning", "technical assistance", "feasibility", "engineering", "design"].some(w => text.includes(w))) {
    return [15, "Grant may support planning/pre-development."];
  }
  if (["construction", "implementation"].includes(stage) &&
      ["construction", "implementation", "capital"].some(w => text.includes(w))) {
    return [15, "Grant may support implementation."];
  }
  return [5, "Project stage fit is unclear."];
}

function deadlineScore(grant) {
  const st = grant.status;
  if (st === "open") return [10, "Grant appears open."];
  if (st === "closing_soon") return [6, "Open but deadline is close."];
  if (st === "open_unknown_deadline" || st === "rolling") return [8, "Available but deadline needs review."];
  if (st === "forecasted") return [6, "Forecasted; useful for planning."];
  if (st === "closed") return [2, "Closed; consider watchlist if recurring."];
  return [4, "Status unclear."];
}

function costScore(project, grant) {
  if (project.estimated_cost == null) return [4, "Project cost estimate is missing."];
  if (!grant.funding_amount) return [6, "Grant amount unclear."];
  return [8, "Cost/award fit needs manual review."];
}

function matchScore(project, grant) {
  const match = cleanText(grant.match_required).toLowerCase();
  const avail = project.match_available;
  if (match.includes("no")) return [10, "No match appears required."];
  if (match.includes("yes") && avail === true) return [10, "Match appears required and available."];
  if (match.includes("yes") && avail !== true) return [2, "Match may be required but availability unknown/unavailable."];
  return [5, "Match requirement unclear."];
}

function impactScore(project, grant) {
  const kws = (project.impact_keywords || []).map(x => String(x).toLowerCase());
  const text = `${grant.title} ${grant.overview} ${JSON.stringify(grant.raw || {})}`.toLowerCase();
  const matched = kws.filter(k => text.includes(k));
  if (matched.length >= 3) return [10, `Strong impact match: ${matched.slice(0, 5).join(", ")}.`];
  if (matched.length >= 1) return [6, `Some impact match: ${matched.slice(0, 5).join(", ")}.`];
  return [3, "Impact fit needs more evidence."];
}

function missingRequirements(project) {
  const out = [];
  const docs = (project.documents_available || []).map(x => String(x).toLowerCase()).join(" ");
  if (project.estimated_cost == null) out.push("Preliminary cost estimate");
  if (project.match_available == null) out.push("Local match availability");
  if (!docs.includes("engineering")) out.push("Engineering memo or technical opinion");
  if (project.project_category === "water" && !docs.includes("water test")) out.push("Water test results");
  if (!docs.includes("council")) out.push("Council resolution or approval record");
  return out;
}

export function scoreGrants(project, grants) {
  return grants.map(grant => {
    const pieces = [
      ["Applicant eligibility", ...applicantScore(project, grant)],
      ["Project category", ...categoryScore(project, grant)],
      ["Project stage", ...stageScore(project, grant)],
      ["Deadline feasibility", ...deadlineScore(grant)],
      ["Funding amount / cost fit", ...costScore(project, grant)],
      ["Match requirement fit", ...matchScore(project, grant)],
      ["Community impact match", ...impactScore(project, grant)]
    ];
    const total = pieces.reduce((sum, p) => sum + p[1], 0);
    let recommendation = "Low fit.";
    if (grant.status === "closed") recommendation = "Closed now. Add to watchlist if recurring.";
    else if (total >= 80) recommendation = "Strong candidate. Prepare missing documents and verify eligibility.";
    else if (total >= 60) recommendation = "Possible candidate. Review blockers before spending application time.";
    return {
      ...grant,
      fit_score: total,
      score_breakdown: pieces.map(([name, points, reason]) => ({ name, points, reason })),
      missing_requirements: missingRequirements(project),
      recommendation
    };
  }).sort((a, b) => b.fit_score - a.fit_score);
}
