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

    if (route.includes("GrantPilot Project Profiler")) {
      const projectProfile = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Project Profiler",
        action: "create_project_profile",
        input: userInput
      });

      const candidateGrants = await runBackendScoring(projectProfile);

      finalResult.project_profile = projectProfile;
      finalResult.candidate_grants = candidateGrants;
      finalResult.next_step = "Send candidate_grants with project_profile back through workflow for relevance judging.";
    }

    if (
      route.includes("GrantPilot Grant Relevance Judge") &&
      userInput.project_profile &&
      userInput.candidate_grants
    ) {
      const judgments = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Grant Relevance Judge",
        action: "judge_candidate_grants",
        input: {
          project_profile: userInput.project_profile,
          candidate_grants: userInput.candidate_grants
        }
      });

      const explainableMatches = filterKeptAndDownranked(judgments);

      const explanations = await callAgentWithTrace({
        traceId,
        agentName: "GrantPilot Match Explainer",
        action: "explain_matches",
        input: {
          project_profile: userInput.project_profile,
          candidate_grants: explainableMatches,
          judge_result: judgments
        }
      });

      finalResult.judgments = judgments;
      finalResult.explanations = explanations;
    }

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
  return [
    {
      title: "Bridge Investment Program",
      agency: "U.S. Department of Transportation",
      status: "open",
      source: "Grants.gov",
      source_url: "https://www.grants.gov/example",
      summary:
        "Provides funding for bridge replacement, rehabilitation, preservation, and protection projects that improve transportation infrastructure.",
      deterministic_score: 88
    },
    {
      title: "NIH Maternal Health Clinical Research Program",
      agency: "National Institutes of Health",
      status: "open",
      source: "Grants.gov",
      source_url: "https://www.grants.gov/example",
      summary:
        "Supports clinical research studies focused on pregnancy outcomes, maternal health interventions, and biomedical research networks.",
      deterministic_score: 72
    }
  ];
}

function filterKeptAndDownranked(judgments) {
  const list = judgments?.judgments || [];

  return list.filter((item) => {
    return item.decision === "keep" || item.decision === "downrank";
  });
}
