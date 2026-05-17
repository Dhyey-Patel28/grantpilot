import express from "express";
import { runGrantPilotWorkflow } from "../services/workflowRunner.js";
import { getTrace, listTraces } from "../services/workflowTrace.js";
import {
  listGrants,
  getGrantById,
  getGrantStats
} from "../services/grantDatabase.js";
import {
  runProfileOnly,
  runScoreOnly,
  runJudgeOnly,
  runExplainOnly,
  runRequirementsOnly,
  runReadinessOnly,
  runPacketOnly,
  runTrustReviewOnly,
  runPrepareApplication,
  runDocumentExtract
} from "../services/directAgentWorkflows.js";
import {
  getApiCapabilities,
  getDatasetStatus,
  getGrantFacets,
  lookupGrantsByIds,
  getRelatedGrants,
  compareGrantsForProject,
  validateProjectIntake,
  getDemoScenarios,
  recordFeedback,
  summarizeTrace
} from "../services/goodToHaveApi.js";

const router = express.Router();

router.post("/run", asyncHandler(async (req, res) => {
  const output = await runGrantPilotWorkflow(req.body);
  res.json(output);
}));

// Alias for the main project intake -> match flow.
router.post("/match", asyncHandler(async (req, res) => {
  const output = await runGrantPilotWorkflow(req.body);
  res.json(output);
}));

router.post("/profile", asyncHandler(async (req, res) => {
  const output = await runProfileOnly(req.body);
  res.json(output);
}));

router.post("/score", asyncHandler(async (req, res) => {
  const output = await runScoreOnly(req.body);
  res.json(output);
}));

router.post("/judge", asyncHandler(async (req, res) => {
  const output = await runJudgeOnly(req.body);
  res.json(output);
}));

router.post("/explain", asyncHandler(async (req, res) => {
  const output = await runExplainOnly(req.body);
  res.json(output);
}));

router.post("/requirements", asyncHandler(async (req, res) => {
  const output = await runRequirementsOnly(req.body);
  res.json(output);
}));

router.post("/readiness", asyncHandler(async (req, res) => {
  const output = await runReadinessOnly(req.body);
  res.json(output);
}));

router.post("/packet", asyncHandler(async (req, res) => {
  const output = await runPacketOnly(req.body);
  res.json(output);
}));

router.post("/trust-review", asyncHandler(async (req, res) => {
  const output = await runTrustReviewOnly(req.body);
  res.json(output);
}));

router.post("/prepare-application", asyncHandler(async (req, res) => {
  const output = await runPrepareApplication(req.body);
  res.json(output);
}));

router.post("/documents/extract", asyncHandler(async (req, res) => {
  const output = await runDocumentExtract(req.body);
  res.json(output);
}));

router.get("/capabilities", asyncHandler(async (req, res) => {
  res.json(getApiCapabilities());
}));

router.get("/dataset/status", asyncHandler(async (req, res) => {
  const output = await getDatasetStatus();
  res.json(output);
}));

router.get("/grants/facets", asyncHandler(async (req, res) => {
  const output = await getGrantFacets();
  res.json(output);
}));

router.post("/grants/lookup", asyncHandler(async (req, res) => {
  const output = await lookupGrantsByIds(req.body);
  res.json(output);
}));

router.get("/grants/:id/related", asyncHandler(async (req, res) => {
  const output = await getRelatedGrants(req.params.id, req.query);

  if (!output) {
    res.status(404).json({
      error: "Grant not found"
    });
    return;
  }

  res.json(output);
}));

router.post("/grants/compare", asyncHandler(async (req, res) => {
  const output = await compareGrantsForProject(req.body);
  res.json(output);
}));

router.post("/intake/validate", asyncHandler(async (req, res) => {
  res.json(validateProjectIntake(req.body));
}));

router.get("/demo/scenarios", asyncHandler(async (req, res) => {
  res.json(getDemoScenarios());
}));

router.post("/feedback", asyncHandler(async (req, res) => {
  const output = await recordFeedback(req.body);
  res.json(output);
}));

router.get("/traces/:traceId/summary", asyncHandler(async (req, res) => {
  try {
    const output = await summarizeTrace(req.params.traceId);
    res.json(output);
  } catch {
    res.status(404).json({
      error: "Trace not found"
    });
  }
}));

router.get("/grants", asyncHandler(async (req, res) => {
  const output = await listGrants(req.query);
  res.json(output);
}));

router.get("/grants/:id", asyncHandler(async (req, res) => {
  const grant = await getGrantById(req.params.id);

  if (!grant) {
    res.status(404).json({
      error: "Grant not found"
    });
    return;
  }

  res.json(grant);
}));

router.get("/stats", asyncHandler(async (req, res) => {
  const output = await getGrantStats();
  res.json(output);
}));

router.get("/traces", asyncHandler(async (req, res) => {
  const traces = await listTraces();
  res.json({ traces });
}));

router.get("/traces/:traceId", asyncHandler(async (req, res) => {
  try {
    const trace = await getTrace(req.params.traceId);
    res.json(trace);
  } catch {
    res.status(404).json({
      error: "Trace not found"
    });
  }
}));

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("GrantPilot API failed:", error);
      res.status(500).json({
        error: String(error?.message || error)
      });
    }
  };
}

export default router;
