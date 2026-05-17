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

  return errors;
}
