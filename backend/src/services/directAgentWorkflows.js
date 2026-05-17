import {
  createWorkflowRun,
  completeWorkflowRun,
  failWorkflowRun
} from "./workflowTrace.js";
import { callAgentWithTrace } from "./agentClient.js";
import { getGrantById, getScoredGrantCandidates } from "./grantDatabase.js";

export async function runProfileOnly(userInput) {
  return runTracedWorkflow("grantpilot_profile", userInput, async (traceId) => {
    const projectProfile = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Project Profiler",
      action: "create_project_profile",
      input: userInput
    });

    return {
      project_profile: projectProfile
    };
  });
}

export async function runScoreOnly(userInput) {
  const projectProfile = userInput.project_profile;

  if (!projectProfile) {
    throw new Error("Missing project_profile.");
  }

  const limit = Number(userInput.limit || 10);
  const candidateGrants = await getScoredGrantCandidates(projectProfile, { limit });

  return {
    candidate_grants: candidateGrants
  };
}

export async function runJudgeOnly(userInput) {
  return runTracedWorkflow("grantpilot_judge", userInput, async (traceId) => {
    const projectProfile = userInput.project_profile;
    const candidateGrants = userInput.candidate_grants;

    if (!projectProfile) {
      throw new Error("Missing project_profile.");
    }

    if (!Array.isArray(candidateGrants)) {
      throw new Error("Missing candidate_grants array.");
    }

    const judgments = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Grant Relevance Judge",
      action: "judge_candidate_grants",
      input: {
        project_profile: projectProfile,
        candidate_grants: candidateGrants
      }
    });

    return {
      judgments
    };
  });
}

export async function runExplainOnly(userInput) {
  return runTracedWorkflow("grantpilot_explain", userInput, async (traceId) => {
    const projectProfile = userInput.project_profile;
    const candidateGrants = userInput.candidate_grants;
    const judgeResult = userInput.judge_result || userInput.judgments;

    if (!projectProfile) {
      throw new Error("Missing project_profile.");
    }

    if (!Array.isArray(candidateGrants)) {
      throw new Error("Missing candidate_grants array.");
    }

    if (!judgeResult) {
      throw new Error("Missing judge_result.");
    }

    const explanations = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Match Explainer",
      action: "explain_matches",
      input: {
        project_profile: projectProfile,
        candidate_grants: candidateGrants,
        judge_result: judgeResult
      }
    });

    return {
      explanations
    };
  });
}

export async function runRequirementsOnly(userInput) {
  return runTracedWorkflow("grantpilot_requirements", userInput, async (traceId) => {
    const selectedGrant = await resolveGrantInput(userInput);

    const requirements = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Requirements Translator",
      action: "translate_requirements",
      input: selectedGrant
    });

    return {
      selected_grant: selectedGrant,
      requirements
    };
  });
}

export async function runReadinessOnly(userInput) {
  return runTracedWorkflow("grantpilot_readiness", userInput, async (traceId) => {
    const projectProfile = userInput.project_profile;

    if (!projectProfile) {
      throw new Error("Missing project_profile.");
    }

    const selectedGrant = await resolveGrantInput(userInput);

    const requirements = userInput.translated_requirements || await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Requirements Translator",
      action: "translate_requirements",
      input: selectedGrant
    });

    const readinessGaps = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Readiness Gap Analyzer",
      action: "analyze_readiness_gaps",
      input: {
        project_profile: projectProfile,
        selected_grant: selectedGrant,
        translated_requirements: requirements,
        documents_available: userInput.documents_available || []
      }
    });

    return {
      selected_grant: selectedGrant,
      requirements,
      readiness_gaps: readinessGaps
    };
  });
}

export async function runPacketOnly(userInput) {
  return runTracedWorkflow("grantpilot_packet", userInput, async (traceId) => {
    const projectProfile = userInput.project_profile;
    const translatedRequirements = userInput.translated_requirements;
    const readinessGaps = userInput.readiness_gaps;

    if (!projectProfile) {
      throw new Error("Missing project_profile.");
    }

    if (!translatedRequirements) {
      throw new Error("Missing translated_requirements.");
    }

    if (!readinessGaps) {
      throw new Error("Missing readiness_gaps.");
    }

    const selectedGrant = await resolveGrantInput(userInput);

    const packetDraft = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Packet Writer",
      action: "create_packet_draft",
      input: {
        project_profile: projectProfile,
        selected_grant: selectedGrant,
        translated_requirements: translatedRequirements,
        readiness_gaps: readinessGaps
      }
    });

    return {
      selected_grant: selectedGrant,
      packet_draft: packetDraft
    };
  });
}

export async function runTrustReviewOnly(userInput) {
  return runTracedWorkflow("grantpilot_trust_review", userInput, async (traceId) => {
    const finalOutput = userInput.final_output || userInput.packet_draft;

    if (!finalOutput) {
      throw new Error("Missing final_output or packet_draft.");
    }

    const selectedGrant = userInput.selected_grant || userInput.grant_id
      ? await resolveGrantInput(userInput)
      : null;

    const trustReview = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Trust Guard",
      action: "review_final_output",
      input: {
        project_profile: userInput.project_profile || null,
        selected_grant: selectedGrant,
        translated_requirements: userInput.translated_requirements || null,
        readiness_gaps: userInput.readiness_gaps || null,
        final_output: finalOutput
      }
    });

    return {
      trust_review: trustReview
    };
  });
}

export async function runPrepareApplication(userInput) {
  return runTracedWorkflow("grantpilot_prepare_application", userInput, async (traceId) => {
    const projectProfile = userInput.project_profile;

    if (!projectProfile) {
      throw new Error("Missing project_profile.");
    }

    const selectedGrant = await resolveGrantInput(userInput);

    const requirements = userInput.translated_requirements || await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Requirements Translator",
      action: "translate_requirements",
      input: selectedGrant
    });

    const readinessGaps = userInput.readiness_gaps || await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Readiness Gap Analyzer",
      action: "analyze_readiness_gaps",
      input: {
        project_profile: projectProfile,
        selected_grant: selectedGrant,
        translated_requirements: requirements,
        documents_available: userInput.documents_available || []
      }
    });

    const packetDraft = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Packet Writer",
      action: "create_packet_draft",
      input: {
        project_profile: projectProfile,
        selected_grant: selectedGrant,
        translated_requirements: requirements,
        readiness_gaps: readinessGaps
      }
    });

    const trustReview = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Trust Guard",
      action: "review_packet_draft",
      input: {
        project_profile: projectProfile,
        selected_grant: selectedGrant,
        translated_requirements: requirements,
        readiness_gaps: readinessGaps,
        final_output: packetDraft
      }
    });

    return {
      selected_grant: selectedGrant,
      requirements,
      readiness_gaps: readinessGaps,
      packet_draft: packetDraft,
      trust_review: trustReview
    };
  });
}

export async function runDocumentExtract(userInput) {
  return runTracedWorkflow("grantpilot_document_extract", userInput, async (traceId) => {
    const documentText = userInput.document_text || userInput.text;

    if (!documentText) {
      throw new Error("Missing document_text.");
    }

    const extractedProject = await callAgentWithTrace({
      traceId,
      agentName: "GrantPilot Document Project Extractor",
      action: "extract_project_from_document",
      input: {
        document_name: userInput.document_name || null,
        document_text: documentText
      }
    });

    return {
      extracted_project: extractedProject
    };
  });
}

async function runTracedWorkflow(workflowType, userInput, callback) {
  const run = await createWorkflowRun({
    workflowType,
    userInput
  });

  const traceId = run.trace_id;

  try {
    const result = await callback(traceId);
    const completedTrace = await completeWorkflowRun(traceId, result);

    return {
      trace_id: traceId,
      result,
      trace: completedTrace
    };
  } catch (error) {
    await failWorkflowRun(traceId, error);
    throw error;
  }
}

async function resolveGrantInput(userInput) {
  if (userInput.selected_grant) {
    return userInput.selected_grant;
  }

  if (userInput.grant_id) {
    const grant = await getGrantById(userInput.grant_id);

    if (!grant) {
      throw new Error(`Grant not found for grant_id: ${userInput.grant_id}`);
    }

    return grant;
  }

  if (userInput.grant_text) {
    return {
      title: userInput.title || "Pasted grant text",
      source: userInput.source || "pasted_text",
      source_kind: "pasted_text",
      source_url: userInput.source_url || null,
      overview: userInput.grant_text,
      raw_text: userInput.grant_text
    };
  }

  throw new Error("Missing selected_grant, grant_id, or grant_text.");
}
