import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const TRACE_DIR = path.join(process.cwd(), "data", "workflow_traces");

export async function createWorkflowRun({ workflowType, userInput }) {
  await fs.mkdir(TRACE_DIR, { recursive: true });

  const traceId = `trace_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  const run = {
    trace_id: traceId,
    workflow_type: workflowType,
    status: "running",
    created_at: new Date().toISOString(),
    completed_at: null,
    user_input: userInput,
    steps: [],
    final_result: null,
    error: null
  };

  await saveTrace(run);
  return run;
}

export async function addWorkflowStep(traceId, step) {
  const run = await getTrace(traceId);

  run.steps.push({
    step_number: run.steps.length + 1,
    agent_name: step.agentName,
    action: step.action,
    status: step.status || "completed",
    started_at: step.startedAt,
    ended_at: step.endedAt,
    duration_ms: step.durationMs,
    input: step.input,
    output: step.output,
    validation_errors: step.validationErrors || [],
    error: step.error || null
  });

  await saveTrace(run);
  return run;
}

export async function completeWorkflowRun(traceId, finalResult) {
  const run = await getTrace(traceId);

  run.status = "completed";
  run.completed_at = new Date().toISOString();
  run.final_result = finalResult;

  await saveTrace(run);
  return run;
}

export async function failWorkflowRun(traceId, error) {
  const run = await getTrace(traceId);

  run.status = "failed";
  run.completed_at = new Date().toISOString();
  run.error = String(error?.message || error);

  await saveTrace(run);
  return run;
}

export async function getTrace(traceId) {
  const filePath = path.join(TRACE_DIR, `${traceId}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function listTraces() {
  await fs.mkdir(TRACE_DIR, { recursive: true });

  const files = await fs.readdir(TRACE_DIR);
  const traces = [];

  for (const file of files.filter((name) => name.endsWith(".json"))) {
    const raw = await fs.readFile(path.join(TRACE_DIR, file), "utf8");
    const trace = JSON.parse(raw);

    traces.push({
      trace_id: trace.trace_id,
      workflow_type: trace.workflow_type,
      status: trace.status,
      created_at: trace.created_at,
      completed_at: trace.completed_at,
      step_count: trace.steps?.length || 0
    });
  }

  return traces.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

async function saveTrace(run) {
  await fs.mkdir(TRACE_DIR, { recursive: true });
  const filePath = path.join(TRACE_DIR, `${run.trace_id}.json`);
  await fs.writeFile(filePath, JSON.stringify(run, null, 2), "utf8");
}
