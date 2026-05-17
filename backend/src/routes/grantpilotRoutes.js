import express from "express";
import { runGrantPilotWorkflow } from "../services/workflowRunner.js";
import { getTrace, listTraces } from "../services/workflowTrace.js";

const router = express.Router();

router.post("/run", async (req, res) => {
  try {
    const output = await runGrantPilotWorkflow(req.body);
    res.json(output);
  } catch (error) {
    console.error("GrantPilot workflow failed:", error);
    res.status(500).json({
      error: String(error?.message || error)
    });
  }
});

router.get("/traces", async (req, res) => {
  try {
    const traces = await listTraces();
    res.json({ traces });
  } catch (error) {
    res.status(500).json({
      error: String(error?.message || error)
    });
  }
});

router.get("/traces/:traceId", async (req, res) => {
  try {
    const trace = await getTrace(req.params.traceId);
    res.json(trace);
  } catch (error) {
    res.status(404).json({
      error: "Trace not found"
    });
  }
});

export default router;
