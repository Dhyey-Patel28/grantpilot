import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { loadMasterGrants, getGrantById } from "./grantDatabase.js";
import { getTrace } from "./workflowTrace.js";
import { scoreGrants } from "../../../src/pipeline/scoring.js";

export function getApiCapabilities() {
  return {
    service: "GrantPilot backend",
    version: "mvp-plus",
    purpose: "Grant matching, grant readiness, packet generation, workflow tracing, and master grant database access.",
    core_endpoints: [
      "GET /api/health",
      "GET /api/grantpilot/stats",
      "GET /api/grantpilot/grants",
      "GET /api/grantpilot/grants/:id",
      "POST /api/grantpilot/run",
      "POST /api/grantpilot/match",
      "GET /api/grantpilot/traces",
      "GET /api/grantpilot/traces/:traceId"
    ],
    direct_agent_endpoints: [
      "POST /api/grantpilot/profile",
      "POST /api/grantpilot/score",
      "POST /api/grantpilot/judge",
      "POST /api/grantpilot/explain",
      "POST /api/grantpilot/requirements",
      "POST /api/grantpilot/readiness",
      "POST /api/grantpilot/packet",
      "POST /api/grantpilot/trust-review",
      "POST /api/grantpilot/prepare-application",
      "POST /api/grantpilot/documents/extract"
    ],
    good_to_have_endpoints: [
      "GET /api/grantpilot/capabilities",
      "GET /api/grantpilot/dataset/status",
      "GET /api/grantpilot/grants/facets",
      "POST /api/grantpilot/grants/lookup",
      "GET /api/grantpilot/grants/:id/related",
      "POST /api/grantpilot/grants/compare",
      "POST /api/grantpilot/intake/validate",
      "GET /api/grantpilot/demo/scenarios",
      "POST /api/grantpilot/feedback",
      "GET /api/grantpilot/traces/:traceId/summary"
    ],
    frontend_usage_notes: {
      intake: "POST /api/grantpilot/run",
      explorer: "GET /api/grantpilot/grants plus GET /api/grantpilot/grants/facets",
      detail: "GET /api/grantpilot/grants/:id",
      readiness_packet: "POST /api/grantpilot/prepare-application",
      trace_panel: "GET /api/grantpilot/traces/:traceId or /summary",
      demo_selector: "GET /api/grantpilot/demo/scenarios"
    },
    security_notes: [
      "Add authentication before production.",
      "Rate-limit live agent endpoints.",
      "Do not expose IBM_API_KEY or backend/.env.",
      "Keep master grant dataset behind backend only."
    ]
  };
}

export async function getDatasetStatus() {
  const projectRoot = getProjectRoot();
  const filePath = path.join(projectRoot, "cache", "normalized", "grants_normalized.json");
  const grants = await loadMasterGrants();

  let file = null;

  try {
    const stat = await fs.stat(filePath);
    file = {
      path: "cache/normalized/grants_normalized.json",
      size_bytes: stat.size,
      modified_at: stat.mtime.toISOString()
    };
  } catch {
    file = {
      path: "cache/normalized/grants_normalized.json",
      warning: "File stat unavailable, but loadMasterGrants returned data."
    };
  }

  const sourceCounts = countBy(grants, (grant) => grant.source || "unknown");
  const statusCounts = countBy(grants, (grant) => grant.status || "unknown");

  return {
    ok: true,
    master_database: "cache/normalized/grants_normalized.json",
    total_grants: grants.length,
    file,
    sources: sourceCounts,
    statuses: statusCounts,
    sample_ids: grants.slice(0, 5).map((grant) => grant.id),
    important_fields: [
      "id",
      "source",
      "source_kind",
      "title",
      "agency",
      "source_url",
      "website",
      "status",
      "due_date",
      "posted_date",
      "funding_amount",
      "funding_type",
      "match_required",
      "eligible_applicants",
      "categories",
      "overview",
      "raw"
    ]
  };
}

export async function getGrantFacets() {
  const grants = await loadMasterGrants();

  const categories = {};
  const eligibleApplicants = {};

  for (const grant of grants) {
    for (const category of grant.categories || []) {
      const key = String(category || "unknown").trim() || "unknown";
      categories[key] = (categories[key] || 0) + 1;
    }

    for (const applicant of grant.eligible_applicants || []) {
      const normalizedApplicants = splitApplicantText(applicant);

      for (const item of normalizedApplicants) {
        eligibleApplicants[item] = (eligibleApplicants[item] || 0) + 1;
      }
    }
  }

  return {
    total_grants: grants.length,
    sources: countBy(grants, (grant) => grant.source || "unknown"),
    statuses: countBy(grants, (grant) => grant.status || "unknown"),
    categories: sortCountObject(categories),
    funding_types: countBy(grants, (grant) => grant.funding_type || "unknown"),
    match_required: countBy(grants, (grant) => grant.match_required || "Unknown"),
    eligible_applicants: sortCountObject(eligibleApplicants)
  };
}

export async function lookupGrantsByIds(input = {}) {
  const ids = Array.isArray(input.ids) ? input.ids : [];
  const grants = [];

  for (const id of ids) {
    const grant = await getGrantById(id);

    if (grant) {
      grants.push(grant);
    }
  }

  return {
    requested_count: ids.length,
    found_count: grants.length,
    grants
  };
}

export async function getRelatedGrants(grantId, options = {}) {
  const limit = Math.min(25, Math.max(1, Number(options.limit || 6)));
  const grants = await loadMasterGrants();
  const base = grants.find((grant) => String(grant.id) === String(grantId));

  if (!base) {
    return null;
  }

  const baseText = buildGrantSearchText(base);
  const baseTerms = tokenSet(baseText);
  const baseCategories = new Set((base.categories || []).map((item) => String(item).toLowerCase()));
  const baseApplicants = new Set((base.eligible_applicants || []).flatMap(splitApplicantText).map((item) => item.toLowerCase()));

  const related = grants
    .filter((grant) => String(grant.id) !== String(grantId))
    .map((grant) => {
      const grantTerms = tokenSet(buildGrantSearchText(grant));
      const categoryOverlap = (grant.categories || []).filter((item) => baseCategories.has(String(item).toLowerCase())).length;
      const applicantOverlap = (grant.eligible_applicants || [])
        .flatMap(splitApplicantText)
        .filter((item) => baseApplicants.has(String(item).toLowerCase())).length;
      const keywordOverlap = intersectionSize(baseTerms, grantTerms);

      let score = keywordOverlap + categoryOverlap * 8 + applicantOverlap * 3;

      if (grant.source === base.source) score += 3;
      if (grant.status === "open") score += 2;

      return {
        id: grant.id,
        title: grant.title,
        agency: grant.agency,
        source: grant.source,
        source_url: grant.source_url,
        status: grant.status,
        due_date: grant.due_date,
        categories: grant.categories,
        funding_amount: grant.funding_amount,
        match_required: grant.match_required,
        related_score: score,
        related_reasons: buildRelatedReasons({
          grant,
          base,
          categoryOverlap,
          applicantOverlap,
          keywordOverlap
        })
      };
    })
    .filter((grant) => grant.related_score > 0)
    .sort((a, b) => b.related_score - a.related_score)
    .slice(0, limit);

  return {
    grant_id: base.id,
    grant_title: base.title,
    related
  };
}

export async function compareGrantsForProject(input = {}) {
  const projectProfile = input.project_profile;

  if (!projectProfile) {
    throw new Error("Missing project_profile.");
  }

  const grantIds = Array.isArray(input.grant_ids) ? input.grant_ids : [];

  if (!grantIds.length) {
    throw new Error("Missing grant_ids array.");
  }

  const grants = await loadMasterGrants();
  const selected = grants.filter((grant) => grantIds.includes(grant.id));

  const scored = scoreGrants(projectProfile, selected).map((grant) => {
    return {
      id: grant.id,
      title: grant.title,
      agency: grant.agency,
      source: grant.source,
      source_url: grant.source_url,
      status: grant.status,
      due_date: grant.due_date,
      categories: grant.categories,
      fit_score: grant.fit_score,
      direct_relevance_score: grant.direct_relevance_score,
      score_breakdown: grant.score_breakdown || [],
      missing_requirements: grant.missing_requirements || [],
      recommendation: grant.recommendation || null
    };
  });

  return {
    compared_count: scored.length,
    grants: scored
  };
}

export function validateProjectIntake(input = {}) {
  const warnings = [];
  const missing = [];
  const suggestions = [];

  const description = String(input.project_description || input.description || "").trim();

  if (!description) {
    missing.push("project_description");
  } else {
    if (description.length < 40) {
      warnings.push("Project description is very short. Matching will be less reliable.");
    }

    if (!/\b(county|city|township|village|tribe|nonprofit|school|district|authority)\b/i.test(description)) {
      suggestions.push("Mention the applicant type, such as county government, township, city, village, school district, tribe, or nonprofit.");
    }

    if (!/\$|cost|budget|estimate|million|thousand/i.test(description)) {
      suggestions.push("Add estimated project cost or budget range if known.");
    }

    if (!/\b(match|cost share|local funds|no match|cash|in-kind)\b/i.test(description)) {
      suggestions.push("Mention whether local match or cost share is available.");
    }

    if (!/\b(photo|meeting|resolution|engineering|budget|estimate|map|complaint|survey|notes|documents?)\b/i.test(description)) {
      suggestions.push("Mention documents you already have, such as photos, meeting notes, engineering memo, budget, or resolution.");
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    suggestions,
    normalized_input: {
      project_description: description || null
    }
  };
}

export function getDemoScenarios() {
  return {
    scenarios: [
      {
        id: "bridge-repair",
        title: "County bridge repair with flooding",
        strength: "strong match path",
        project_description:
          "Clare County has a broken bridge causing flooding and commute delays. The county wants funding to repair the bridge. Estimated cost is $100,000 and no match is available.",
        expected_story:
          "Bridge project should route to transportation/bridge grants, then warn about match and engineering documentation."
      },
      {
        id: "tourism-retreat-mismatch",
        title: "Private retreat center asking for infrastructure grants",
        strength: "edge case / mismatch",
        project_description:
          "The Bayview Tribal Arts Collective in Michigan is seeking $4.5 million to renovate a luxury lakefront cultural retreat center with artist cabins, meditation gardens, private event spaces, and wellness facilities. The organization wants flood mitigation and transportation grants because heavy rainfall occasionally affects nearby walking trails. The project primarily supports tourism, retreats, and private events. Applicant type: nonprofit organization.",
        expected_story:
          "System should avoid overclaiming infrastructure fit and should downrank or reject unrelated flood/transportation grants."
      },
      {
        id: "rural-drainage-recreation",
        title: "Drainage capacity with secondary recreation",
        strength: "mixed-purpose project",
        project_description:
          "Plainfield Township, Michigan reports that farmers have long waits for water due to limited capacity of the drain canal system. The township seeks funds to expand drain canal capacity. They also want to add recreation opportunities along the newly expanded system. They are rural and can commit about $500,000 from the general fund and $50,000 from the parks budget.",
        expected_story:
          "System should treat drainage/water infrastructure as primary and recreation as secondary."
      },
      {
        id: "energy-resilience-shelter",
        title: "Community center energy resilience shelter",
        strength: "readiness packet path",
        project_description:
          "Ironwood Heights City wants to upgrade its community center with insulation, efficient HVAC, and backup power so it can serve as a warming shelter during outages. Estimated cost is $450,000. The city has utility bills and emergency meeting notes but still needs a detailed budget, engineering scope, and board resolution.",
        expected_story:
          "System should find energy/resilience/community facility grants and identify missing readiness documents."
      }
    ]
  };
}

export async function recordFeedback(input = {}) {
  const feedbackDir = path.join(process.cwd(), "data", "feedback");
  await fs.mkdir(feedbackDir, { recursive: true });

  const feedback = {
    id: `feedback_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: new Date().toISOString(),
    trace_id: input.trace_id || null,
    rating: input.rating || null,
    page: input.page || null,
    message: input.message || null,
    payload: input.payload || null
  };

  const filePath = path.join(feedbackDir, `${feedback.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(feedback, null, 2), "utf8");

  return {
    ok: true,
    feedback_id: feedback.id
  };
}

export async function summarizeTrace(traceId) {
  const trace = await getTrace(traceId);
  const started = trace.created_at ? new Date(trace.created_at).getTime() : null;
  const ended = trace.completed_at ? new Date(trace.completed_at).getTime() : null;

  return {
    trace_id: trace.trace_id,
    workflow_type: trace.workflow_type,
    status: trace.status,
    created_at: trace.created_at,
    completed_at: trace.completed_at,
    total_duration_ms: started && ended ? ended - started : null,
    step_count: trace.steps?.length || 0,
    steps: (trace.steps || []).map((step) => ({
      step_number: step.step_number,
      agent_name: step.agent_name,
      action: step.action,
      status: step.status,
      duration_ms: step.duration_ms,
      validation_error_count: step.validation_errors?.length || 0,
      has_error: Boolean(step.error)
    })),
    display_summary:
      trace.final_result?.display_summary ||
      trace.final_result?.result?.display_summary ||
      null,
    error: trace.error || null
  };
}

function buildGrantSearchText(grant) {
  return [
    grant.title,
    grant.agency,
    grant.source,
    grant.overview,
    ...(grant.categories || []),
    ...(grant.eligible_applicants || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tokenSet(text) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "are",
    "will",
    "program",
    "grant",
    "funding",
    "application",
    "applications"
  ]);

  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !stopWords.has(word))
  );
}

function intersectionSize(a, b) {
  let count = 0;

  for (const item of a) {
    if (b.has(item)) {
      count += 1;
    }
  }

  return count;
}

function buildRelatedReasons({ grant, base, categoryOverlap, applicantOverlap, keywordOverlap }) {
  const reasons = [];

  if (categoryOverlap > 0) {
    reasons.push("Shares grant category with selected grant.");
  }

  if (applicantOverlap > 0) {
    reasons.push("Has overlapping applicant eligibility language.");
  }

  if (grant.source === base.source) {
    reasons.push("Comes from the same grant source.");
  }

  if (keywordOverlap >= 5) {
    reasons.push("Has similar title or overview keywords.");
  }

  if (grant.status === "open") {
    reasons.push("Appears open.");
  }

  return reasons;
}

function splitApplicantText(value) {
  return String(value || "")
    .split(/(?=City or township|County governments|Independent school|Native American|Nonprofits|Others|Special district|State governments|Public and State)/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countBy(items, keyFn) {
  const counts = {};

  for (const item of items) {
    const key = String(keyFn(item) || "unknown");
    counts[key] = (counts[key] || 0) + 1;
  }

  return sortCountObject(counts);
}

function sortCountObject(counts) {
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
}

function getProjectRoot() {
  const cwd = process.cwd();

  if (path.basename(cwd).toLowerCase() === "backend") {
    return path.resolve(cwd, "..");
  }

  return cwd;
}
