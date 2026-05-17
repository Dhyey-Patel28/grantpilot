const REQUIRED_KEYS = {
  "GrantPilot Coordinator": [
    "workflow_status",
    "recommended_route",
    "backend_should_call",
    "input_summary",
    "next_needed",
    "human_review_needed"
  ],
  "GrantPilot Project Profiler": [
    "community_name",
    "applicant_type",
    "county",
    "population",
    "project_category",
    "project_stage",
    "description",
    "estimated_cost",
    "match_available",
    "documents_available",
    "impact_keywords"
  ],
  "GrantPilot Grant Relevance Judge": [
    "judgments"
  ],
  "GrantPilot Match Explainer": [
    "explanations"
  ],
  "GrantPilot Requirements Translator": [
    "plain_english_summary",
    "eligibility_requirements",
    "required_documents",
    "deadlines",
    "match_requirements",
    "funding_limits",
    "application_steps",
    "risk_warnings",
    "human_review_needed"
  ],
  "GrantPilot Readiness Gap Analyzer": [
    "readiness_score",
    "ready_items",
    "missing_items",
    "needs_verification",
    "priority_actions",
    "recommended_before_applying"
  ],
  "GrantPilot Packet Writer": [
    "project_title",
    "problem_statement",
    "public_benefit",
    "funding_request_summary",
    "council_memo",
    "resident_faq",
    "thirty_day_action_plan",
    "human_review_checklist"
  ],
  "GrantPilot Trust Guard": [
    "trust_status",
    "issues_found",
    "required_fixes",
    "safe_final_language",
    "human_review_needed"
  ]
};

export function validateAgentOutput(agentName, output) {
  const errors = [];

  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return [`${agentName} output is not a JSON object.`];
  }

  const required = REQUIRED_KEYS[agentName];

  if (!required) {
    return errors;
  }

  for (const key of required) {
    if (!(key in output)) {
      errors.push(`${agentName} output missing required key: ${key}`);
    }
  }

  if (agentName === "GrantPilot Grant Relevance Judge") {
    validateRelevanceJudge(output, errors);
  }

  if (agentName === "GrantPilot Match Explainer") {
    validateMatchExplainer(output, errors);
  }

  return errors;
}

function validateRelevanceJudge(output, errors) {
  if (!Array.isArray(output.judgments)) {
    errors.push("GrantPilot Grant Relevance Judge judgments must be an array.");
    return;
  }

  output.judgments.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`GrantPilot Grant Relevance Judge judgments[${index}] is not an object.`);
      return;
    }

    const requiredItemKeys = [
      "grant_title",
      "decision"
    ];

    for (const key of requiredItemKeys) {
      if (!(key in item)) {
        errors.push(`GrantPilot Grant Relevance Judge judgments[${index}] missing key: ${key}`);
      }
    }

    const hasReasonLikeField =
      "reason" in item ||
      "safe_user_summary" in item ||
      "summary" in item;

    if (!hasReasonLikeField) {
      errors.push(
        `GrantPilot Grant Relevance Judge judgments[${index}] needs at least one explanation field: reason, safe_user_summary, or summary.`
      );
    }

    const allowedDecisions = new Set(["keep", "downrank", "reject"]);

    if (item.decision && !allowedDecisions.has(String(item.decision).toLowerCase())) {
      errors.push(
        `GrantPilot Grant Relevance Judge judgments[${index}].decision must be keep, downrank, or reject.`
      );
    }

    if ("critical_mismatch" in item && typeof item.critical_mismatch !== "boolean") {
      errors.push(
        `GrantPilot Grant Relevance Judge judgments[${index}].critical_mismatch must be boolean.`
      );
    }

    if (
      "recommended_score_cap" in item &&
      typeof item.recommended_score_cap !== "number"
    ) {
      errors.push(
        `GrantPilot Grant Relevance Judge judgments[${index}].recommended_score_cap must be number.`
      );
    }

    for (const arrayKey of [
      "positive_fit_factors",
      "risk_flags",
      "missing_verification"
    ]) {
      if (arrayKey in item && !Array.isArray(item[arrayKey])) {
        errors.push(
          `GrantPilot Grant Relevance Judge judgments[${index}].${arrayKey} must be an array.`
        );
      }
    }
  });
}

function validateMatchExplainer(output, errors) {
  if (!Array.isArray(output.explanations)) {
    errors.push("GrantPilot Match Explainer explanations must be an array.");
    return;
  }

  output.explanations.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`GrantPilot Match Explainer explanations[${index}] is not an object.`);
      return;
    }

    if (!("grant_title" in item)) {
      errors.push(`GrantPilot Match Explainer explanations[${index}] missing key: grant_title`);
    }

    const hasExplanationText =
      "plain_language_explanation" in item ||
      "fit_summary" in item ||
      "safe_user_summary" in item ||
      "summary" in item;

    if (!hasExplanationText) {
      errors.push(
        `GrantPilot Match Explainer explanations[${index}] needs at least one explanation field: plain_language_explanation, fit_summary, safe_user_summary, or summary.`
      );
    }

    for (const arrayKey of [
      "why_it_matches",
      "why_it_may_not_fit",
      "verification_needed",
      "missing_project_info",
      "suggested_next_steps"
    ]) {
      if (arrayKey in item && !Array.isArray(item[arrayKey])) {
        errors.push(
          `GrantPilot Match Explainer explanations[${index}].${arrayKey} must be an array.`
        );
      }
    }
  });
}
