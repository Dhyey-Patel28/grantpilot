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
    message: "Use /api/health or /api/grantpilot/run",
    routes: [
      "GET /api/health",
      "POST /api/grantpilot/run",
      "GET /api/grantpilot/traces",
      "GET /api/grantpilot/traces/:traceId"
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