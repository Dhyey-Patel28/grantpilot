import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import grantpilotRoutes from "./routes/grantpilotRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "GrantPilot backend",
    message: "Use /api/health or /api/grantpilot/* routes",
    routes: [
      "GET /api/health",
      "GET /api/grantpilot/stats",
      "GET /api/grantpilot/grants",
      "GET /api/grantpilot/grants/:id",
      "POST /api/grantpilot/run",
      "POST /api/grantpilot/match",
      "POST /api/grantpilot/profile",
      "POST /api/grantpilot/score",
      "POST /api/grantpilot/judge",
      "POST /api/grantpilot/explain",
      "POST /api/grantpilot/requirements",
      "POST /api/grantpilot/readiness",
      "POST /api/grantpilot/packet",
      "POST /api/grantpilot/trust-review",
      "POST /api/grantpilot/prepare-application",
      "POST /api/grantpilot/documents/extract",
      "GET /api/grantpilot/capabilities",
      "GET /api/grantpilot/dataset/status",
      "GET /api/grantpilot/grants/facets",
      "POST /api/grantpilot/grants/lookup",
      "GET /api/grantpilot/grants/:id/related",
      "POST /api/grantpilot/grants/compare",
      "POST /api/grantpilot/intake/validate",
      "GET /api/grantpilot/demo/scenarios",
      "POST /api/grantpilot/feedback",
      "GET /api/grantpilot/traces",
      "GET /api/grantpilot/traces/:traceId",
      "GET /api/grantpilot/traces/:traceId/summary"
    ]
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "GrantPilot backend",
    mode: process.env.AGENT_MODE || "mock"
  });
});

app.use("/api/grantpilot", grantpilotRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled backend error:", err);
  res.status(500).json({
    error: "Internal server error",
    detail: String(err?.message || err)
  });
});

app.listen(PORT, () => {
  console.log(`GrantPilot backend running on http://localhost:${PORT}`);
});
