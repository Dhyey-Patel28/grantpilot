import { addWorkflowStep } from "./workflowTrace.js";
import { validateAgentOutput } from "./jsonValidation.js";

export async function callAgentWithTrace({
  traceId,
  agentName,
  action,
  input
}) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  try {
    const output = await callWatsonAgent(agentName, input);
    const validationErrors = validateAgentOutput(agentName, output);
    const endedAt = new Date().toISOString();

    await addWorkflowStep(traceId, {
      agentName,
      action,
      status: validationErrors.length ? "completed_with_validation_errors" : "completed",
      startedAt,
      endedAt,
      durationMs: Date.now() - startMs,
      input,
      output,
      validationErrors
    });

    if (validationErrors.length) {
      throw new Error(`${agentName} returned invalid JSON shape: ${validationErrors.join("; ")}`);
    }

    return output;
  } catch (error) {
    const endedAt = new Date().toISOString();

    await addWorkflowStep(traceId, {
      agentName,
      action,
      status: "failed",
      startedAt,
      endedAt,
      durationMs: Date.now() - startMs,
      input,
      output: null,
      error: String(error?.message || error)
    });

    throw error;
  }
}

async function callWatsonAgent(agentName, payload) {
  const mode = process.env.AGENT_MODE || "mock";

  if (mode === "mock") {
    return mockAgentResponse(agentName, payload);
  }

  return callLiveWatsonAgent(agentName, payload);
}

let cachedIamToken = null;
let cachedIamTokenExpiresAt = 0;

const AGENT_ENV_MAP = {
  "GrantPilot Coordinator": {
    id: "IBM_WXO_AGENT_COORDINATOR_ID",
    envId: "IBM_WXO_AGENT_COORDINATOR_ENV_ID"
  },
  "GrantPilot Project Profiler": {
    id: "IBM_WXO_AGENT_PROJECT_PROFILER_ID",
    envId: "IBM_WXO_AGENT_PROJECT_PROFILER_ENV_ID"
  },
  "GrantPilot Document Project Extractor": {
    id: "IBM_WXO_AGENT_DOCUMENT_EXTRACTOR_ID",
    envId: "IBM_WXO_AGENT_DOCUMENT_EXTRACTOR_ENV_ID"
  },
  "GrantPilot Grant Relevance Judge": {
    id: "IBM_WXO_AGENT_RELEVANCE_JUDGE_ID",
    envId: "IBM_WXO_AGENT_RELEVANCE_JUDGE_ENV_ID"
  },
  "GrantPilot Match Explainer": {
    id: "IBM_WXO_AGENT_MATCH_EXPLAINER_ID",
    envId: "IBM_WXO_AGENT_MATCH_EXPLAINER_ENV_ID"
  },
  "GrantPilot Requirements Translator": {
    id: "IBM_WXO_AGENT_REQUIREMENTS_TRANSLATOR_ID",
    envId: "IBM_WXO_AGENT_REQUIREMENTS_TRANSLATOR_ENV_ID"
  },
  "GrantPilot Readiness Gap Analyzer": {
    id: "IBM_WXO_AGENT_READINESS_ANALYZER_ID",
    envId: "IBM_WXO_AGENT_READINESS_ANALYZER_ENV_ID"
  },
  "GrantPilot Packet Writer": {
    id: "IBM_WXO_AGENT_PACKET_WRITER_ID",
    envId: "IBM_WXO_AGENT_PACKET_WRITER_ENV_ID"
  },
  "GrantPilot Trust Guard": {
    id: "IBM_WXO_AGENT_TRUST_GUARD_ID",
    envId: "IBM_WXO_AGENT_TRUST_GUARD_ENV_ID"
  }
};

async function callLiveWatsonAgent(agentName, payload) {
  const agentConfig = getAgentConfig(agentName);
  const token = await getIamToken();

  const baseUrl = requiredEnv("IBM_WXO_BASE_URL").replace(/\/$/, "");
  const url = `${baseUrl}/api/v1/orchestrate/${agentConfig.agentId}/chat/completions`;

  const message = buildAgentMessage(agentName, payload);

  const apiKey = requiredEnv("IBM_API_KEY");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "IAM-API_KEY": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      stream: false,
      messages: [
        {
          role: "user",
          content: [
            {
              response_type: "text",
              text: message
            }
          ]
        }
      ],
      additional_parameters: {},
      context: {}
    })
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(
      `IBM Orchestrate call failed for ${agentName}. HTTP ${response.status}: ${rawText}`
    );
  }

  let responseJson;
  try {
    responseJson = JSON.parse(rawText);
  } catch {
    throw new Error(`IBM Orchestrate returned non-JSON response for ${agentName}: ${rawText}`);
  }

  const assistantText = extractAssistantText(responseJson);

  if (!assistantText) {
    throw new Error(
      `Could not find assistant text in IBM response for ${agentName}: ${JSON.stringify(responseJson)}`
    );
  }

  return parseJsonFromAgentText(agentName, assistantText);
}

function getAgentConfig(agentName) {
  const envKeys = AGENT_ENV_MAP[agentName];

  if (!envKeys) {
    throw new Error(`No IBM agent env mapping found for ${agentName}`);
  }

  const agentId = requiredEnv(envKeys.id);
  const agentEnvironmentId = process.env[envKeys.envId] || "";

  return {
    agentId,
    agentEnvironmentId
  };
}

async function getIamToken() {
  const now = Date.now();

  if (cachedIamToken && now < cachedIamTokenExpiresAt) {
    return cachedIamToken;
  }

  const apiKey = requiredEnv("IBM_API_KEY");

  const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: apiKey
    })
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`IBM IAM token request failed. HTTP ${response.status}: ${rawText}`);
  }

  const data = JSON.parse(rawText);

  if (!data.access_token) {
    throw new Error(`IBM IAM token response did not include access_token: ${rawText}`);
  }

  cachedIamToken = data.access_token;

  const expiresInSeconds = Number(data.expires_in || 3600);
  cachedIamTokenExpiresAt = Date.now() + Math.max(60, expiresInSeconds - 120) * 1000;

  return cachedIamToken;
}

function buildAgentMessage(agentName, payload) {
  const input =
    typeof payload === "string"
      ? payload
      : JSON.stringify(payload, null, 2);

  return [
    "Return valid JSON only.",
    "Do not include markdown.",
    "Do not include commentary outside the JSON.",
    "",
    `Agent to run: ${agentName}`,
    "",
    "Input:",
    input
  ].join("\n");
}

function extractAssistantText(responseJson) {
  const choice = responseJson?.choices?.[0];

  if (typeof choice?.message?.content === "string") {
    return choice.message.content;
  }

  if (Array.isArray(choice?.message?.content)) {
    return choice.message.content
      .map((part) => part?.text || part?.content || "")
      .filter(Boolean)
      .join("\n");
  }

  if (typeof choice?.delta?.content === "string") {
    return choice.delta.content;
  }

  const runMessageContent = responseJson?.result?.data?.message?.content;

  if (typeof runMessageContent === "string") {
    return runMessageContent;
  }

  if (Array.isArray(runMessageContent)) {
    return runMessageContent
      .map((part) => part?.text || part?.content || "")
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function parseJsonFromAgentText(agentName, text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstObject = cleaned.indexOf("{");
    const lastObject = cleaned.lastIndexOf("}");

    if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
      const possibleJson = cleaned.slice(firstObject, lastObject + 1);
      try {
        return JSON.parse(possibleJson);
      } catch {
        // fall through
      }
    }

    const firstArray = cleaned.indexOf("[");
    const lastArray = cleaned.lastIndexOf("]");

    if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
      const possibleJson = cleaned.slice(firstArray, lastArray + 1);
      try {
        return JSON.parse(possibleJson);
      } catch {
        // fall through
      }
    }

    throw new Error(
      `${agentName} did not return parseable JSON. Raw assistant text: ${text}`
    );
  }
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function mockAgentResponse(agentName, payload) {
  switch (agentName) {
    case "GrantPilot Coordinator":
      return mockCoordinator(payload);

    case "GrantPilot Project Profiler":
      return {
        community_name: "Clare County",
        applicant_type: "County governments",
        county: "Clare County",
        population: 31400,
        project_category: "transportation",
        project_stage: "construction",
        description:
          "Clare County has broken bridge and pipe infrastructure causing flooding, commute delays, and water impacts in residential yards.",
        estimated_cost: 100000,
        match_available: false,
        documents_available: [
          "resident survey responses",
          "pictures of flooding and broken bridge",
          "township meeting notes"
        ],
        impact_keywords: [
          "bridge repair",
          "flooding",
          "transportation",
          "water infrastructure"
        ]
      };

    case "GrantPilot Grant Relevance Judge":
      return {
        judgments: [
          {
            grant_title: "Bridge Investment Program",
            source: "Grants.gov",
            decision: "keep",
            relevance_label: "strong",
            confidence: "high",
            critical_mismatch: false,
            recommended_score_cap: 100,
            reason:
              "The grant directly supports bridge replacement, rehabilitation, preservation, and protection projects.",
            positive_fit_factors: [
              "Bridge repair project",
              "Transportation infrastructure focus"
            ],
            risk_flags: [],
            missing_verification: [
              "Verify official source page",
              "Verify deadline",
              "Verify match requirement"
            ],
            safe_user_summary:
              "This appears to be a strong bridge infrastructure match, pending staff verification."
          },
          {
            grant_title: "NIH Maternal Health Clinical Research Program",
            source: "Grants.gov",
            decision: "reject",
            relevance_label: "mismatch",
            confidence: "high",
            critical_mismatch: true,
            recommended_score_cap: 20,
            reason:
              "The grant supports maternal health clinical research, not bridge or transportation repair.",
            positive_fit_factors: [],
            risk_flags: ["Domain mismatch"],
            missing_verification: [],
            safe_user_summary:
              "This grant should not be pursued for the bridge repair project."
          }
        ]
      };

    case "GrantPilot Match Explainer":
      return {
        explanations: [
          {
            grant_title: "Bridge Investment Program",
            display_decision: "recommended",
            fit_summary:
              "The grant appears to align with bridge repair and transportation infrastructure needs.",
            why_it_matches: [
              "The project involves bridge repair.",
              "The grant supports bridge infrastructure activities."
            ],
            why_it_may_not_fit: [
              "Source, deadline, eligibility, and match still need verification."
            ],
            verification_needed: [
              "Verify official source page",
              "Verify deadline",
              "Verify applicant eligibility",
              "Verify match requirement"
            ],
            missing_project_info: [],
            suggested_next_steps: [
              "Review the official grant page.",
              "Confirm match requirements.",
              "Prepare engineering and cost documentation if required."
            ],
            staff_time_warning:
              "Staff should verify source, deadline, eligibility, and match before spending significant application time.",
            plain_language_explanation:
              "This grant may be a strong fit for a bridge repair project, but staff should verify the official details before applying.",
            safe_disclaimer:
              "This is an AI-assisted match explanation. Staff should verify eligibility, deadline, source page, required documents, and match requirements before applying."
          }
        ]
      };

    case "GrantPilot Requirements Translator":
      return {
        plain_english_summary:
          "The grant appears to support planning, engineering, testing, and project development for drinking water infrastructure.",
        eligibility_requirements: [
          "Michigan cities",
          "Michigan villages",
          "Michigan townships",
          "Michigan counties",
          "Public water systems serving fewer than 10,000 residents"
        ],
        required_documents: [
          "Project narrative",
          "Documentation of public water system ownership or operation",
          "Preliminary budget",
          "Council or board resolution",
          "Map of proposed service area"
        ],
        deadlines: ["August 15, 2026 by 5:00 PM Eastern"],
        match_requirements: ["No local match is required"],
        funding_limits: ["Maximum award is $75,000"],
        application_steps: [
          "Create an account on the state online grants portal",
          "Prepare required documents",
          "Submit through the portal before the deadline"
        ],
        risk_warnings: [
          "Staff should verify the official source page and current status"
        ],
        human_review_needed: true
      };

    case "GrantPilot Readiness Gap Analyzer":
      return {
        readiness_score: 62,
        ready_items: [
          "Resident complaints are available",
          "Council meeting notes are available"
        ],
        missing_items: [
          "Project narrative",
          "Preliminary budget",
          "Formal council or board resolution",
          "Map of proposed service area"
        ],
        needs_verification: [
          "Verify official source page",
          "Verify applicant eligibility",
          "Verify deadline",
          "Verify no local match requirement"
        ],
        priority_actions: [
          "Verify official grant source page",
          "Prepare preliminary budget",
          "Create project narrative",
          "Prepare board resolution",
          "Create service area map"
        ],
        recommended_before_applying: [
          "Complete required documents",
          "Confirm eligibility and deadline",
          "Verify submission portal requirements"
        ]
      };

    case "GrantPilot Packet Writer":
      return {
        project_title: "Harbor Glen Village Stormwater Planning Project",
        problem_statement:
          "Harbor Glen Village experiences repeated street flooding near Lakeshore Avenue and the downtown business district. Planning work is needed to define drainage improvements and green infrastructure options.",
        public_benefit:
          "The project may improve public safety, transportation reliability, and community resilience by supporting stormwater planning.",
        funding_request_summary:
          "The grant is identified as a potential funding source for stormwater planning. Staff should verify source, deadline, eligibility, match, and required documents before application work continues.",
        council_memo:
          "Staff recommend verifying the grant source, deadline, match requirements, and required documentation before preparing an application package.",
        resident_faq: [
          "What is the project? The village is exploring stormwater planning to address repeated flooding.",
          "Is funding guaranteed? No. The grant is only a potential funding source and must be verified.",
          "Will this affect local taxes or fees? Local financial impact has not been determined and should be reviewed by staff."
        ],
        thirty_day_action_plan: [
          "Verify official grant source page",
          "Confirm deadline",
          "Verify match requirements",
          "Confirm applicant eligibility",
          "Prepare or confirm required documents"
        ],
        human_review_checklist: [
          "Verify official grant source page",
          "Verify grant deadline",
          "Verify applicant eligibility",
          "Verify match or cost-share requirements",
          "Verify required documents",
          "Verify project cost or budget",
          "Verify local approval or board authorization"
        ]
      };

    case "GrantPilot Trust Guard":
      return {
        trust_status: "needs_review",
        issues_found: [
          "Source, deadline, eligibility, and match still require staff verification"
        ],
        required_fixes: [
          "Verify official source page before displaying as final",
          "Confirm deadline, eligibility, and match requirements"
        ],
        safe_final_language:
          "This packet is a preliminary draft. Staff should verify the official source page, deadline, eligibility, match requirements, required documents, project budget, and local approval before proceeding.",
        human_review_needed: true
      };

    default:
      throw new Error(`Unknown mock agent: ${agentName}`);
  }
}

function mockCoordinator(payload) {
  const isStringInput = typeof payload === "string";
  const hasProjectProfile = Boolean(payload?.project_profile);
  const hasCandidateGrants = Array.isArray(payload?.candidate_grants);
  const hasSelectedGrant = Boolean(payload?.selected_grant);
  const hasGrantText = Boolean(payload?.selected_grant?.grant_text || payload?.grant_text);
  const hasTranslatedRequirements = Boolean(payload?.translated_requirements);
  const hasReadinessGaps = Boolean(payload?.readiness_gaps);
  const hasFinalOutput = Boolean(payload?.final_output);
  const asksForPacket = String(payload?.request || "").toLowerCase().includes("packet");

  if (isStringInput) {
    return {
      workflow_status: "needs_backend_candidates",
      recommended_route: ["GrantPilot Project Profiler"],
      backend_should_call: [
        "Call Project Profiler",
        "Run backend deterministic scoring",
        "Send top candidate grants to Grant Relevance Judge"
      ],
      input_summary: {
        has_project_profile: false,
        has_candidate_grants: false,
        has_selected_grant: false,
        has_grant_text: false,
        has_translated_requirements: false,
        has_readiness_gaps: false,
        has_final_output: false
      },
      next_needed: [
        "Run backend deterministic scoring against the grant dataset and provide top candidate grant records for relevance review."
      ],
      human_review_needed: false
    };
  }

  if (hasProjectProfile && hasCandidateGrants) {
    return {
      workflow_status: "route_ready",
      recommended_route: [
        "GrantPilot Grant Relevance Judge",
        "GrantPilot Match Explainer"
      ],
      backend_should_call: [
        "Call Grant Relevance Judge",
        "Send kept and downranked matches to Match Explainer"
      ],
      input_summary: {
        has_project_profile: true,
        has_candidate_grants: true,
        has_selected_grant: false,
        has_grant_text: false,
        has_translated_requirements: false,
        has_readiness_gaps: false,
        has_final_output: false
      },
      next_needed: [],
      human_review_needed: false
    };
  }

  if (hasProjectProfile && hasSelectedGrant && hasTranslatedRequirements && hasReadinessGaps && asksForPacket) {
    return {
      workflow_status: "route_ready",
      recommended_route: [
        "GrantPilot Packet Writer",
        "GrantPilot Trust Guard"
      ],
      backend_should_call: [
        "Call Packet Writer",
        "Validate returned JSON against Packet Writer schema",
        "Call Trust Guard with packet and context"
      ],
      input_summary: {
        has_project_profile: true,
        has_candidate_grants: false,
        has_selected_grant: true,
        has_grant_text: hasGrantText,
        has_translated_requirements: true,
        has_readiness_gaps: true,
        has_final_output: false
      },
      next_needed: [],
      human_review_needed: true
    };
  }

  if (hasProjectProfile && hasSelectedGrant) {
    return {
      workflow_status: "route_ready",
      recommended_route: [
        "GrantPilot Requirements Translator",
        "GrantPilot Readiness Gap Analyzer"
      ],
      backend_should_call: [
        "Call Requirements Translator",
        "Validate returned JSON",
        "Call Readiness Gap Analyzer",
        "Validate returned JSON"
      ],
      input_summary: {
        has_project_profile: true,
        has_candidate_grants: false,
        has_selected_grant: true,
        has_grant_text: hasGrantText,
        has_translated_requirements: hasTranslatedRequirements,
        has_readiness_gaps: hasReadinessGaps,
        has_final_output: false
      },
      next_needed: [],
      human_review_needed: true
    };
  }

  if (hasFinalOutput) {
    return {
      workflow_status: "route_ready",
      recommended_route: ["GrantPilot Trust Guard"],
      backend_should_call: ["Call Trust Guard"],
      input_summary: {
        has_project_profile: hasProjectProfile,
        has_candidate_grants: hasCandidateGrants,
        has_selected_grant: hasSelectedGrant,
        has_grant_text: hasGrantText,
        has_translated_requirements: hasTranslatedRequirements,
        has_readiness_gaps: hasReadinessGaps,
        has_final_output: true
      },
      next_needed: [],
      human_review_needed: true
    };
  }

  return {
    workflow_status: "needs_more_information",
    recommended_route: [],
    backend_should_call: [],
    input_summary: {
      has_project_profile: hasProjectProfile,
      has_candidate_grants: hasCandidateGrants,
      has_selected_grant: hasSelectedGrant,
      has_grant_text: hasGrantText,
      has_translated_requirements: hasTranslatedRequirements,
      has_readiness_gaps: hasReadinessGaps,
      has_final_output: hasFinalOutput
    },
    next_needed: [
      "Provide a project description, project profile, candidate grants, selected grant, grant text, readiness gaps, or final output."
    ],
    human_review_needed: true
  };
}
