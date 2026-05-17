import { spawn } from "node:child_process";
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

  if (mode === "live") {
    return callLiveWatsonAgent(agentName, payload);
  }

  throw new Error(`Unsupported AGENT_MODE: ${mode}`);
}

const DEFAULT_ADK_AGENT_NAMES = {
  "GrantPilot Coordinator": "GrantPilot_Coordinator_0412TA",
  "GrantPilot Project Profiler": "GrantPilot_Project_Profiler_9813ux",
  "GrantPilot Document Project Extractor": "GrantPilot_Document_Project_Extractor_1159Vs",
  "GrantPilot Grant Relevance Judge": "GrantPilot_Grant_Relevance_Judge_788907",
  "GrantPilot Match Explainer": "GrantPilot_Match_Explainer_6614Yc",
  "GrantPilot Requirements Translator": "GrantPilot_Requirements_Translator_0183ih",
  "GrantPilot Readiness Gap Analyzer": "GrantPilot_Readiness_Gap_Analyzer_6293z5",
  "GrantPilot Packet Writer": "GrantPilot_Packet_Writer_84312J",
  "GrantPilot Trust Guard": "GrantPilot_Trust_Guard_7503Cb"
};

const ADK_AGENT_ENV_KEYS = {
  "GrantPilot Coordinator": "ADK_AGENT_COORDINATOR_NAME",
  "GrantPilot Project Profiler": "ADK_AGENT_PROJECT_PROFILER_NAME",
  "GrantPilot Document Project Extractor": "ADK_AGENT_DOCUMENT_EXTRACTOR_NAME",
  "GrantPilot Grant Relevance Judge": "ADK_AGENT_RELEVANCE_JUDGE_NAME",
  "GrantPilot Match Explainer": "ADK_AGENT_MATCH_EXPLAINER_NAME",
  "GrantPilot Requirements Translator": "ADK_AGENT_REQUIREMENTS_TRANSLATOR_NAME",
  "GrantPilot Readiness Gap Analyzer": "ADK_AGENT_READINESS_ANALYZER_NAME",
  "GrantPilot Packet Writer": "ADK_AGENT_PACKET_WRITER_NAME",
  "GrantPilot Trust Guard": "ADK_AGENT_TRUST_GUARD_NAME"
};

async function callLiveWatsonAgent(agentName, payload) {
  const adkAgentName = getAdkAgentName(agentName);
  const message = buildAgentMessage(agentName, payload);

  await activateOrchestrateEnv();

  const cliOutput = await runOrchestrateChatAsk({
    adkAgentName,
    message
  });

  return parseJsonFromAgentText(agentName, cliOutput, adkAgentName);
}

function getAdkAgentName(agentName) {
  const envKey = ADK_AGENT_ENV_KEYS[agentName];
  const envValue = envKey ? process.env[envKey] : null;
  const defaultValue = DEFAULT_ADK_AGENT_NAMES[agentName];

  const adkAgentName = envValue || defaultValue;

  if (!adkAgentName) {
    throw new Error(`No ADK agent name configured for ${agentName}`);
  }

  return adkAgentName;
}

async function runOrchestrateChatAsk({ adkAgentName, message }) {
  const command = process.env.ORCHESTRATE_CLI_PATH || "orchestrate";
  const timeoutMs = Number(process.env.ORCHESTRATE_TIMEOUT_MS || 180000);

  const args = [
    "chat",
    "ask",
    "--agent-name",
    adkAgentName,
    message
  ];

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let hasSentQuit = false;
    let settled = false;

    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      env: {
        ...process.env,

        // Windows/Python unicode safety.
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
        PYTHONLEGACYWINDOWSSTDIO: "0",

        // Reduce color/styled output and make Rich wider so JSON wraps less.
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        TERM: "dumb",
        COLUMNS: process.env.ORCHESTRATE_TERMINAL_COLUMNS || "300",
        RICH_WIDTH: process.env.ORCHESTRATE_TERMINAL_COLUMNS || "300"
      }
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;

      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }

      reject(
        new Error(
          [
            `ADK CLI call timed out for ${adkAgentName}.`,
            `Command: ${command} ${args.slice(0, 4).join(" ")} ...`,
            stdout ? `STDOUT:\n${stdout}` : "",
            stderr ? `STDERR:\n${stderr}` : ""
          ]
            .filter(Boolean)
            .join("\n")
        )
      );
    }, timeoutMs);

    function maybeQuit() {
      if (hasSentQuit) return;

      const combined = `${stdout}\n${stderr}`;

      // The ADK prints a second user prompt after the first answer.
      // When we see the save/thread section or the prompt, send q so it exits.
      const looksDone =
        combined.includes("Thread ID:") ||
        combined.includes("Save this ID") ||
        combined.includes("👤 You:") ||
        combined.includes("You:");

      if (!looksDone) return;

      hasSentQuit = true;

      setTimeout(() => {
        try {
          child.stdin.write("q\n");
        } catch {
          // ignore
        }

        try {
          child.stdin.end();
        } catch {
          // ignore
        }
      }, 300);
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      maybeQuit();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      maybeQuit();
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      reject(
        new Error(
          [
            `ADK CLI failed to start for ${adkAgentName}.`,
            `Command: ${command} ${args.slice(0, 4).join(" ")} ...`,
            `Error: ${error?.message || String(error)}`
          ].join("\n")
        )
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const output = `${stdout || ""}\n${stderr || ""}`.trim();

      if (code !== 0) {
        reject(
          new Error(
            [
              `ADK CLI call failed for ${adkAgentName}.`,
              `Command: ${command} ${args.slice(0, 4).join(" ")} ...`,
              `Exit code: ${code}`,
              stdout ? `STDOUT:\n${stdout}` : "",
              stderr ? `STDERR:\n${stderr}` : ""
            ]
              .filter(Boolean)
              .join("\n")
          )
        );
        return;
      }

      resolve(output);
    });
  });
}

async function activateOrchestrateEnv() {
  const command = process.env.ORCHESTRATE_CLI_PATH || "orchestrate";
  const adkEnvName = process.env.ADK_ENV_NAME || "grantpilot-live";
  const apiKey = process.env.IBM_API_KEY;

  if (!apiKey) {
    throw new Error("Missing IBM_API_KEY in backend .env. Cannot activate Orchestrate ADK environment.");
  }

  const args = [
    "env",
    "activate",
    adkEnvName,
    "--api-key",
    apiKey
  ];

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
        PYTHONLEGACYWINDOWSSTDIO: "0",
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        TERM: "dumb"
      }
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(
        new Error(
          [
            `Failed to start Orchestrate env activate.`,
            `Error: ${error?.message || String(error)}`
          ].join("\n")
        )
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            [
              `Failed to activate Orchestrate environment: ${adkEnvName}`,
              `Exit code: ${code}`,
              stdout ? `STDOUT:\n${stdout}` : "",
              stderr ? `STDERR:\n${stderr}` : ""
            ]
              .filter(Boolean)
              .join("\n")
          )
        );
        return;
      }

      resolve();
    });
  });
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

function parseJsonFromAgentText(agentName, rawText, adkAgentName = "") {
  const noAnsi = stripAnsi(String(rawText || ""));

  const possibleSections = [
    extractAssistantSection(noAnsi, adkAgentName),
    noAnsi
  ].filter(Boolean);

  for (const section of possibleSections) {
    const normalized = normalizeCliSection(section);
    const candidates = extractBalancedJsonCandidates(normalized);

    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const candidate = sanitizeJsonCandidate(stripCodeFence(candidates[i]));

      try {
        return cleanParsedJson(JSON.parse(candidate));
      } catch {
        // try next candidate
      }
    }

    const whole = sanitizeJsonCandidate(stripCodeFence(normalized.trim()));

    try {
      return cleanParsedJson(JSON.parse(whole));
    } catch {
      // continue
    }
  }

  throw new Error(
    `${agentName} did not return parseable JSON. Raw ADK output:\n${rawText}`
  );
}

function cleanParsedJson(value) {
  if (Array.isArray(value)) {
    return value.map(cleanParsedJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanParsedJson(item)])
    );
  }

  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  return value;
}

function extractAssistantSection(text, adkAgentName) {
  const lines = String(text || "").split(/\r?\n/);

  let startIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const isAssistantHeader =
      line.includes("🤖") ||
      (adkAgentName && line.includes(adkAgentName));

    const isUserOrSaveLine =
      line.includes("👤 User") ||
      line.includes("Save Your Conversation") ||
      line.includes("Thread ID:");

    if (isAssistantHeader && !isUserOrSaveLine) {
      startIndex = i + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  const collected = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];

    if (line.includes("👤 You:")) break;
    if (line.includes("Save Your Conversation")) break;
    if (line.includes("Thread ID:")) break;

    // End of the assistant rich panel.
    if (/^[└╰].*[┘╯]?$/.test(line.trim()) && collected.length > 0) {
      break;
    }

    collected.push(line);
  }

  return collected.join("\n");
}

function normalizeCliSection(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => stripRichBorderLine(line))
    .filter((line) => {
      const trimmed = line.trim();

      if (!trimmed) return true;

      // Drop Rich borders and CLI metadata.
      if (/^[┌┐└┘╭╮╰╯─━┏┓┗┛┡┢┣┫┳┻╋┼├┤]+/.test(trimmed)) return false;
      if (trimmed.startsWith("[INFO]")) return false;
      if (trimmed.startsWith("[DEBUG]")) return false;
      if (trimmed.startsWith("Chat Mode")) return false;
      if (trimmed.startsWith("Type your messages")) return false;
      if (trimmed.startsWith("Commands:")) return false;
      if (trimmed.startsWith("Thread ID:")) return false;
      if (trimmed.startsWith("Save this ID")) return false;
      if (trimmed.startsWith("Exiting chat")) return false;
      if (trimmed.startsWith("👤")) return false;
      if (trimmed.startsWith("🤖")) return false;

      return true;
    })
    .join("\n")
    .trim();
}

function stripRichBorderLine(line) {
  const source = String(line || "");

  const firstBar = source.indexOf("│");
  const lastBar = source.lastIndexOf("│");

  if (firstBar !== -1 && lastBar !== -1 && lastBar > firstBar) {
    return source.slice(firstBar + 1, lastBar).trimEnd();
  }

  if (firstBar !== -1) {
    return source.slice(firstBar + 1).trimEnd();
  }

  return source;
}

function sanitizeJsonCandidate(text) {
  const source = String(text || "").trim();

  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      out += char;
      escaped = true;
      continue;
    }

    if (char === "\"") {
      out += char;
      inString = !inString;
      continue;
    }

    // Rich can wrap long JSON strings across lines.
    // Literal newlines inside strings are invalid JSON, so convert them to spaces.
    if ((char === "\n" || char === "\r") && inString) {
      out += " ";
      continue;
    }

    out += char;
  }

  return out.trim();
}

function stripAnsi(text) {
  return String(text || "").replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
    ""
  );
}

function stripCodeFence(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractBalancedJsonCandidates(text) {
  const candidates = [];
  const source = String(text || "");

  for (let start = 0; start < source.length; start += 1) {
    const open = source[start];

    if (open !== "{" && open !== "[") continue;

    const close = open === "{" ? "}" : "]";
    const stack = [close];

    let inString = false;
    let escaped = false;

    for (let i = start + 1; i < source.length; i += 1) {
      const char = source[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "{") {
        stack.push("}");
      } else if (char === "[") {
        stack.push("]");
      } else if (char === stack[stack.length - 1]) {
        stack.pop();

        if (stack.length === 0) {
          candidates.push(source.slice(start, i + 1));
          start = i;
          break;
        }
      }
    }
  }

  return candidates;
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
  const isProjectDescription =
    typeof payload === "string" ||
    typeof payload?.project_description === "string" ||
    typeof payload?.message === "string";

  const hasProjectProfile = Boolean(payload?.project_profile);
  const hasCandidateGrants = Array.isArray(payload?.candidate_grants);
  const hasSelectedGrant = Boolean(payload?.selected_grant);
  const hasGrantText = Boolean(payload?.selected_grant?.grant_text || payload?.grant_text);
  const hasTranslatedRequirements = Boolean(payload?.translated_requirements);
  const hasReadinessGaps = Boolean(payload?.readiness_gaps);
  const hasFinalOutput = Boolean(payload?.final_output);
  const asksForPacket = String(payload?.request || "").toLowerCase().includes("packet");

  if (isProjectDescription) {
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