import fs from "fs/promises";
import path from "path";

import {
  createWorkflowRun,
  completeWorkflowRun,
  failWorkflowRun
} from "./workflowTrace.js";

import { callAgentWithTrace } from "./agentClient.js";

export async function runGrantPilotWorkflow(userInput) {
  const run = await createWorkflowRun({
    workflowType: "grantpilot",
    userInput
  });

  const traceId = run.trace_id;

  try {
    const coordinator = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Coordinator",
      action: "route_request",
      input: userInput
    });

    const route = coordinator.recommended_route || [];

    const finalResult = {
      coordinator
    };

    let projectProfile = userInput.project_profile || null;
    let candidateGrants = userInput.candidate_grants || null;
    let judgments = null;
    let explanations = null;

    // A. Rough project intake
    if (route.includes("GrantPilot Project Profiler")) {
      projectProfile = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Project Profiler",
        action: "create_project_profile",
        input: userInput
      });

      candidateGrants = await runBackendScoring(projectProfile);

      finalResult.project_profile = projectProfile;
      finalResult.candidate_grants = candidateGrants;
    }

    // B. Candidate grant review
    if (
      route.includes("GrantPilot Grant Relevance Judge") &&
      userInput.project_profile &&
      userInput.candidate_grants
    ) {
      projectProfile = userInput.project_profile;
      candidateGrants = userInput.candidate_grants;
    }

    // C. After profiling + backend scoring, continue automatically to Judge + Explainer.
    if (projectProfile && Array.isArray(candidateGrants) && candidateGrants.length > 0) {
      judgments = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Grant Relevance Judge",
        action: "judge_candidate_grants",
        input: {
          project_profile: projectProfile,
          candidate_grants: candidateGrants
        }
      });

      const explainableMatches = filterKeptAndDownranked(judgments, candidateGrants);

      explanations = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Match Explainer",
        action: "explain_matches",
        input: {
          project_profile: projectProfile,
          candidate_grants: explainableMatches,
          judge_result: judgments
        }
      });

      finalResult.judgments = judgments;
      finalResult.explanations = explanations;
      finalResult.display_summary = buildClerkSummary({
        projectProfile,
        candidateGrants,
        judgments,
        explanations
      });
    }

    // D. Selected grant readiness
    if (
      route.includes("GrantPilot Requirements Translator") &&
      route.includes("GrantPilot Readiness Gap Analyzer") &&
      userInput.project_profile &&
      userInput.selected_grant
    ) {
      const requirements = userInput.translated_requirements || await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Requirements Translator",
        action: "translate_requirements",
        input: userInput.selected_grant
      });

      const readinessGaps = userInput.readiness_gaps || await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Readiness Gap Analyzer",
        action: "analyze_readiness_gaps",
        input: {
          project_profile: userInput.project_profile,
          selected_grant: userInput.selected_grant,
          translated_requirements: requirements
        }
      });

      finalResult.requirements = requirements;
      finalResult.readiness_gaps = readinessGaps;
    }

    // E. Packet generation
    if (
      route.includes("GrantPilot Packet Writer") &&
      route.includes("GrantPilot Trust Guard") &&
      userInput.project_profile &&
      userInput.selected_grant &&
      userInput.translated_requirements &&
      userInput.readiness_gaps
    ) {
      const packetDraft = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Packet Writer",
        action: "create_packet_draft",
        input: {
          project_profile: userInput.project_profile,
          selected_grant: userInput.selected_grant,
          translated_requirements: userInput.translated_requirements,
          readiness_gaps: userInput.readiness_gaps
        }
      });

      const trustReview = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Trust Guard",
        action: "review_packet_draft",
        input: {
          project_profile: userInput.project_profile,
          selected_grant: userInput.selected_grant,
          translated_requirements: userInput.translated_requirements,
          readiness_gaps: userInput.readiness_gaps,
          final_output: packetDraft
        }
      });

      finalResult.packet_draft = packetDraft;
      finalResult.trust_review = trustReview;
    }

    // F. Trust review only
    if (
      route.length === 1 &&
      route[0] === "GrantPilot Trust Guard" &&
      userInput.final_output
    ) {
      const trustReview = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Trust Guard",
        action: "review_final_output",
        input: userInput
      });

      finalResult.trust_review = trustReview;
    }

    const completedTrace = await completeWorkflowRun(traceId, finalResult);

    return {
      trace_id: traceId,
      result: finalResult,
      trace: completedTrace
    };
  } catch (error) {
    await failWorkflowRun(traceId, error);
    throw error;
  }
}

async function runBackendScoring(projectProfile) {
  const grants = await loadNormalizedGrants();

  if (!grants.length) {
    return [];
  }

  const scored = grants
    .map((grant) => {
      const normalized = normalizeGrantForCandidate(grant);
      return {
        ...normalized,
        deterministic_score: scoreGrant(projectProfile, normalized)
      };
    })
    .filter((grant) => grant.title && grant.deterministic_score > 0)
    .sort((a, b) => b.deterministic_score - a.deterministic_score)
    .slice(0, 10);

  return scored;
}

async function loadNormalizedGrants() {
  const projectRoot = getProjectRoot();
  const candidatePaths = [
    path.join(projectRoot, "cache", "normalized", "grants_normalized.json"),
    path.join(projectRoot, "data", "grants_normalized.json")
  ];

  for (const filePath of candidatePaths) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return extractGrantArray(parsed);
    } catch {
      // try next path
    }
  }

  return [];
}

function getProjectRoot() {
  const cwd = process.cwd();

  if (path.basename(cwd).toLowerCase() === "backend") {
    return path.resolve(cwd, "..");
  }

  return cwd;
}

function extractGrantArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const directKeys = [
    "grants",
    "items",
    "data",
    "records",
    "normalized",
    "opportunities",
    "results"
  ];

  for (const key of directKeys) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }

  for (const nested of Object.values(value)) {
    if (Array.isArray(nested) && nested.some(looksLikeGrant)) {
      return nested;
    }
  }

  return [];
}

function looksLikeGrant(item) {
  if (!item || typeof item !== "object") return false;

  return Boolean(
    item.title ||
    item.name ||
    item.opportunity_title ||
    item.grant_title ||
    item.summary ||
    item.description
  );
}

function normalizeGrantForCandidate(grant) {
  const title =
    grant.title ||
    grant.name ||
    grant.opportunity_title ||
    grant.grant_title ||
    grant.program_name ||
    "Untitled grant";

  const agency =
    grant.agency ||
    grant.funder ||
    grant.department ||
    grant.source_agency ||
    grant.organization ||
    null;

  const source =
    grant.source ||
    grant.source_name ||
    grant.source_kind ||
    grant.portal ||
    null;

  const sourceUrl =
    grant.source_url ||
    grant.url ||
    grant.link ||
    grant.opportunity_url ||
    grant.grants_gov_url ||
    null;

  const summary =
    grant.summary ||
    grant.description ||
    grant.synopsis ||
    grant.objective ||
    grant.purpose ||
    "";

  return {
    id: grant.id || grant.opportunity_id || grant.number || grant.funding_opportunity_number || null,
    title,
    agency,
    status: grant.status || grant.opportunity_status || grant.lifecycle_status || null,
    source,
    source_url: sourceUrl,
    summary,
    eligible_applicants: grant.eligible_applicants || grant.applicants || [],
    categories: grant.categories || grant.category || grant.assistance_listing || [],
    deadline: grant.deadline || grant.due_date || grant.close_date || null,
    funding_amount: grant.funding_amount || grant.award_ceiling || grant.max_award || null,
    match_required: grant.match_required || grant.cost_share || grant.match || null
  };
}

function scoreGrant(projectProfile, grant) {
  const projectText = [
    projectProfile?.project_category,
    projectProfile?.description,
    ...(projectProfile?.impact_keywords || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const grantText = [
    grant.title,
    grant.agency,
    grant.summary,
    Array.isArray(grant.categories) ? grant.categories.join(" ") : grant.categories,
    Array.isArray(grant.eligible_applicants) ? grant.eligible_applicants.join(" ") : grant.eligible_applicants
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  const weightedTerms = [
    ["bridge", 35],
    ["transportation", 25],
    ["road", 18],
    ["street", 18],
    ["stormwater", 30],
    ["flood", 25],
    ["water", 22],
    ["wastewater", 22],
    ["broadband", 30],
    ["energy", 22],
    ["park", 18],
    ["recreation", 16],
    ["public safety", 22],
    ["infrastructure", 18],
    ["rural", 12],
    ["planning", 10],
    ["construction", 10],
    ["resilience", 14]
  ];

  for (const [term, weight] of weightedTerms) {
    if (projectText.includes(term) && grantText.includes(term)) {
      score += weight;
    }
  }

  for (const keyword of projectProfile?.impact_keywords || []) {
    const cleanKeyword = String(keyword).toLowerCase().replace(/_/g, " ");

    if (cleanKeyword && grantText.includes(cleanKeyword)) {
      score += 10;
    }
  }

  const category = String(projectProfile?.project_category || "").toLowerCase();

  if (category && grantText.includes(category)) {
    score += 20;
  }

  const applicantType = String(projectProfile?.applicant_type || "").toLowerCase();
  const eligibleText = Array.isArray(grant.eligible_applicants)
    ? grant.eligible_applicants.join(" ").toLowerCase()
    : String(grant.eligible_applicants || "").toLowerCase();

  if (applicantType && eligibleText && eligibleText.includes(applicantType.split(" ")[0])) {
    score += 10;
  }

  // Mild penalties for obvious domain mismatches.
  if (
    projectText.includes("bridge") &&
    /maternal|clinical|biomedical|health research|laboratory/.test(grantText)
  ) {
    score -= 40;
  }

  if (
    projectText.includes("transportation") &&
    /arts festival|museum exhibit|performing arts/.test(grantText)
  ) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

function filterKeptAndDownranked(judgments, candidateGrants) {
  const list = judgments?.judgments || [];

  if (!Array.isArray(list) || !list.length) {
    return candidateGrants.slice(0, 5);
  }

  const keptTitles = new Set(
    list
      .filter((item) => {
        const decision = String(item.decision || "").toLowerCase();
        return decision === "keep" || decision === "downrank";
      })
      .map((item) => String(item.grant_title || item.title || "").toLowerCase())
      .filter(Boolean)
  );

  const matched = candidateGrants.filter((grant) => {
    return keptTitles.has(String(grant.title || "").toLowerCase());
  });

  return matched.length ? matched : candidateGrants.slice(0, 5);
}

function buildClerkSummary({
  projectProfile,
  candidateGrants,
  judgments,
  explanations
}) {
  const recommended = extractRecommendedMatches(judgments, candidateGrants);
  const explanationList = explanations?.explanations || [];

  return {
    title: buildProjectTitle(projectProfile),
    plain_english_summary: buildPlainEnglishProjectSummary(projectProfile),
    best_fit_grant_directions: recommended.slice(0, 5).map((grant) => {
      return {
        title: grant.title,
        agency: grant.agency || null,
        source: grant.source || null,
        source_url: grant.source_url || null,
        deterministic_score: grant.deterministic_score || null
      };
    }),
    explanation_highlights: explanationList.slice(0, 3).map((item) => {
      return {
        grant_title: item.grant_title || item.title || null,
        decision: item.display_decision || item.decision || null,
        summary: item.plain_language_explanation || item.fit_summary || item.safe_user_summary || null,
        verification_needed: item.verification_needed || item.missing_verification || []
      };
    }),
    recommended_next_steps: [
      "Review the top grant matches.",
      "Verify the official source page and deadline for any grant before applying.",
      "Confirm applicant eligibility and match requirements.",
      "Gather project cost estimates, photos, meeting notes, maps, and engineering documents if available."
    ],
    human_review_needed: true
  };
}

function extractRecommendedMatches(judgments, candidateGrants) {
  const list = judgments?.judgments || [];

  if (!Array.isArray(list) || !list.length) {
    return candidateGrants.slice(0, 5);
  }

  const acceptableTitles = new Set(
    list
      .filter((item) => {
        const decision = String(item.decision || "").toLowerCase();
        return decision === "keep" || decision === "downrank";
      })
      .map((item) => String(item.grant_title || item.title || "").toLowerCase())
      .filter(Boolean)
  );

  const matched = candidateGrants.filter((grant) => {
    return acceptableTitles.has(String(grant.title || "").toLowerCase());
  });

  return matched.length ? matched : candidateGrants.slice(0, 5);
}

function buildProjectTitle(projectProfile) {
  const place =
    projectProfile?.community_name ||
    projectProfile?.county ||
    "Community";

  const category = String(projectProfile?.project_category || "project")
    .replace(/_/g, " ");

  return `${place} ${category} project`;
}

function buildPlainEnglishProjectSummary(projectProfile) {
  const description = projectProfile?.description || "The project description is incomplete.";
  const category = projectProfile?.project_category || "general";
  const cost = typeof projectProfile?.estimated_cost === "number"
    ? `$${projectProfile.estimated_cost.toLocaleString()}`
    : "an unknown cost";

  return `This appears to be a ${category} project with ${cost} in estimated cost. ${description}`;
}