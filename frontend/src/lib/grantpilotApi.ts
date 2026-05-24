import {
  DEMO_CAPABILITIES,
  DEMO_COMPARE_GRANTS,
  DEMO_DATASET_STATUS,
  DEMO_FACETS,
  DEMO_GRANTS,
  DEMO_PREPARE_APPLICATION,
  DEMO_PROJECT_PROFILE,
  DEMO_REFRESH_STATUS,
  DEMO_REQUIREMENTS,
  DEMO_RUN,
  DEMO_SAVED_PROJECT,
  DEMO_SCENARIOS,
  DEMO_STATS,
  DEMO_TRACE_SUMMARY,
  DEMO_TRACES,
  DEMO_VALIDATE_INTAKE
} from "./demoFallbackData";

export const GRANTPILOT_API_BASE =
  process.env.NEXT_PUBLIC_GRANTPILOT_API_BASE || "http://localhost:5050";

export type AnyRecord = Record<string, unknown>;
export type ApiParams = Record<string, string | number | boolean | null | undefined>;

export interface GrantRecord extends AnyRecord {
  id?: string;
  title?: string;
  agency?: string;
  source?: string;
  source_url?: string;
  status?: string;
  due_date?: string | null;
  deadline?: string | null;
  funding_amount?: string | number | null;
  match_required?: string | null;
  overview?: string;
  summary?: string;
  deterministic_score?: number;
  fit_score?: number;
  score?: number;
  related_score?: number;
  categories?: string[];
  eligible_applicants?: string[];
  recommendation?: string;
  last_refreshed?: string | null;
  source_health?: AnyRecord | null;
}

export interface RefreshStatus extends AnyRecord {
  ok?: boolean;
  status?: string;
  last_refreshed?: string | null;
  normalized_grant_count?: number;
  counts?: AnyRecord;
  registry?: AnyRecord;
  dedupe?: AnyRecord;
  source_health?: AnyRecord;
  recommendations?: string[];
}

export interface GrantPilotRunResponse extends AnyRecord {
  trace_id: string;
  result: AnyRecord;
  trace?: AnyRecord;
}

export interface SavedProjectSnapshot {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  documents_available: string[];
  trace_id?: string;
  project_profile?: AnyRecord;
  candidate_grants?: GrantRecord[];
  selected_grant?: GrantRecord | null;
  latest_run?: GrantPilotRunResponse;
  latest_packet?: AnyRecord | null;
}

export function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "true" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "no") return false;
  }
  return fallback;
}

export function asArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === undefined || value === null || value === "") return [];
  return [value as T];
}

export function getRecordField(record: unknown, key: string): AnyRecord {
  return asRecord(asRecord(record)[key]);
}

export function getArrayField<T = unknown>(record: unknown, key: string): T[] {
  return asArray<T>(asRecord(record)[key]);
}

export function getStringField(record: unknown, key: string, fallback = ""): string {
  return asString(asRecord(record)[key], fallback);
}

export function getNumberField(record: unknown, key: string, fallback = 0): number {
  return asNumber(asRecord(record)[key], fallback);
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) return error.message;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

async function parseResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();

  let parsed: unknown;
  try {
    parsed = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const message =
      getStringField(parsed, "error") ||
      getStringField(parsed, "detail") ||
      getStringField(parsed, "message") ||
      `GrantPilot API request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return parsed as T;
}

export function isPortfolioDemoMode(): boolean {
  const envValue = process.env.NEXT_PUBLIC_GRANTPILOT_DEMO_MODE;
  if (envValue === "true" || envValue === "1") return true;
  if (process.env.NEXT_PUBLIC_GRANTPILOT_API_BASE === "static") return true;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return true;
    }
  }

  return false;
}

export function getPortfolioDemoNotice(): string {
  return "This portfolio preview uses a saved sample workflow, so the product remains reviewable without live credentials.";
}

export async function apiGet<T = AnyRecord>(path: string): Promise<T> {
  const demoResponse = getDemoGetResponse(path);

  if (isPortfolioDemoMode() && demoResponse !== undefined) {
    return cloneDemo(demoResponse) as T;
  }

  try {
    const response = await fetch(`${GRANTPILOT_API_BASE}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    return await parseResponse<T>(response);
  } catch (error) {
    if (demoResponse !== undefined) {
      return cloneDemo(demoResponse) as T;
    }

    throw error;
  }
}

export async function apiPost<T = AnyRecord>(path: string, body: AnyRecord): Promise<T> {
  const demoResponse = getDemoPostResponse(path, body);

  if (isPortfolioDemoMode() && demoResponse !== undefined) {
    return cloneDemo(demoResponse) as T;
  }

  try {
    const response = await fetch(`${GRANTPILOT_API_BASE}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    return await parseResponse<T>(response);
  } catch (error) {
    if (demoResponse !== undefined) {
      return cloneDemo(demoResponse) as T;
    }

    throw error;
  }
}

function cloneDemo(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function getDemoGetResponse(path: string): unknown {
  const url = new URL(path, "https://grantpilot.local");
  const pathname = url.pathname;

  if (pathname === "/api/health") {
    return { ok: true, service: "GrantPilot frontend preview", mode: "portfolio preview" };
  }

  if (pathname === "/api/grantpilot/stats") return DEMO_STATS;
  if (pathname === "/api/grantpilot/capabilities") return DEMO_CAPABILITIES;
  if (pathname === "/api/grantpilot/dataset/status") return DEMO_DATASET_STATUS;
  if (pathname === "/api/grantpilot/refresh/status") return DEMO_REFRESH_STATUS;
  if (pathname === "/api/grantpilot/grants/facets") return DEMO_FACETS;
  if (pathname === "/api/grantpilot/demo/scenarios") return DEMO_SCENARIOS;
  if (pathname === "/api/grantpilot/demo/latest-run") return DEMO_RUN;
  if (pathname === "/api/grantpilot/traces") return DEMO_TRACES;

  const traceSummaryMatch = pathname.match(/^\/api\/grantpilot\/traces\/([^/]+)\/summary$/);
  if (traceSummaryMatch) return { ...DEMO_TRACE_SUMMARY, trace_id: decodeURIComponent(traceSummaryMatch[1]) };

  const traceMatch = pathname.match(/^\/api\/grantpilot\/traces\/([^/]+)$/);
  if (traceMatch) return { ...DEMO_RUN.trace, trace_id: decodeURIComponent(traceMatch[1]) };

  if (pathname === "/api/grantpilot/grants") {
    return buildDemoGrantList(url.searchParams);
  }

  const relatedMatch = pathname.match(/^\/api\/grantpilot\/grants\/([^/]+)\/related$/);
  if (relatedMatch) {
    const id = decodeURIComponent(relatedMatch[1]);
    const limit = Number(url.searchParams.get("limit") || 5);
    return { related: DEMO_GRANTS.filter((grant) => String(grant.id) !== id).slice(0, limit) };
  }

  const grantMatch = pathname.match(/^\/api\/grantpilot\/grants\/([^/]+)$/);
  if (grantMatch) {
    const id = decodeURIComponent(grantMatch[1]);
    return findDemoGrant(id) || DEMO_GRANTS[0];
  }

  return undefined;
}

function getDemoPostResponse(path: string, body: AnyRecord): unknown {
  if (path === "/api/grantpilot/run" || path === "/api/grantpilot/match") {
    return DEMO_RUN;
  }

  if (path === "/api/grantpilot/profile") {
    return { project_profile: DEMO_PROJECT_PROFILE };
  }

  if (path === "/api/grantpilot/score") {
    return { candidate_grants: DEMO_GRANTS };
  }

  if (path === "/api/grantpilot/requirements") {
    const selectedGrant = findDemoGrant(asString(body.grant_id)) || DEMO_GRANTS[0];
    return {
      trace_id: "demo_trace_requirements",
      result: { selected_grant: selectedGrant, requirements: DEMO_REQUIREMENTS },
      requirements: DEMO_REQUIREMENTS
    };
  }

  if (path === "/api/grantpilot/readiness") {
    return {
      trace_id: "demo_trace_readiness",
      result: { requirements: DEMO_REQUIREMENTS, readiness_gaps: DEMO_PREPARE_APPLICATION.result.readiness_gaps },
      readiness_gaps: DEMO_PREPARE_APPLICATION.result.readiness_gaps
    };
  }

  if (path === "/api/grantpilot/prepare-application") {
    const selectedGrant = findDemoGrant(asString(body.grant_id)) || DEMO_GRANTS[0];
    return {
      ...DEMO_PREPARE_APPLICATION,
      result: {
        ...DEMO_PREPARE_APPLICATION.result,
        selected_grant: selectedGrant
      }
    };
  }

  if (path === "/api/grantpilot/intake/validate") return DEMO_VALIDATE_INTAKE;
  if (path === "/api/grantpilot/grants/compare") return DEMO_COMPARE_GRANTS;
  if (path === "/api/grantpilot/feedback") return { ok: true, stored: false, mode: "portfolio_demo" };

  return undefined;
}

function buildDemoGrantList(params: URLSearchParams): AnyRecord {
  const query = String(params.get("query") || "").trim().toLowerCase();
  const source = String(params.get("source") || "").trim().toLowerCase();
  const status = String(params.get("status") || "").trim().toLowerCase();
  const category = String(params.get("category") || "").trim().toLowerCase();
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.max(1, Number(params.get("limit") || 25));

  let items = [...DEMO_GRANTS];

  if (query) {
    items = items.filter((grant) =>
      [grant.title, grant.agency, grant.overview, grant.source, ...(grant.categories || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  if (source) items = items.filter((grant) => String(grant.source || "").toLowerCase() === source);
  if (status) items = items.filter((grant) => String(grant.status || "").toLowerCase() === status);
  if (category) items = items.filter((grant) => (grant.categories || []).some((item) => String(item).toLowerCase() === category));

  const total = query || source || status || category ? items.length : asNumber(DEMO_STATS.total_grants, items.length);
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    mode: "portfolio_demo",
    notice: getPortfolioDemoNotice()
  };
}

function findDemoGrant(id: string): (typeof DEMO_GRANTS)[number] | null {
  if (!id) return null;
  return DEMO_GRANTS.find((grant) => String(grant.id) === id) || null;
}

export const GrantPilotApi = {
  health: () => apiGet<AnyRecord>("/api/health"),
  stats: () => apiGet<AnyRecord>("/api/grantpilot/stats"),
  capabilities: () => apiGet<AnyRecord>("/api/grantpilot/capabilities"),
  datasetStatus: () => apiGet<AnyRecord>("/api/grantpilot/dataset/status"),
  refreshStatus: () => apiGet<RefreshStatus>("/api/grantpilot/refresh/status"),
  facets: () => apiGet<AnyRecord>("/api/grantpilot/grants/facets"),
  demoScenarios: () => apiGet<AnyRecord>("/api/grantpilot/demo/scenarios"),
  demoLatestRun: () => apiGet<GrantPilotRunResponse>("/api/grantpilot/demo/latest-run"),
  traces: () => apiGet<AnyRecord>("/api/grantpilot/traces"),
  trace: (traceId: string) => apiGet<AnyRecord>(`/api/grantpilot/traces/${encodeURIComponent(traceId)}`),
  traceSummary: (traceId: string) => apiGet<AnyRecord>(`/api/grantpilot/traces/${encodeURIComponent(traceId)}/summary`),

  listGrants: (params: ApiParams = {}) => {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        query.set(key, String(value));
      }
    }

    return apiGet<AnyRecord>(`/api/grantpilot/grants${query.toString() ? `?${query}` : ""}`);
  },

  grantDetail: (id: string) => apiGet<GrantRecord>(`/api/grantpilot/grants/${encodeURIComponent(id)}`),
  relatedGrants: (id: string, limit = 5) =>
    apiGet<AnyRecord>(`/api/grantpilot/grants/${encodeURIComponent(id)}/related?limit=${limit}`),

  run: (body: AnyRecord) => apiPost<GrantPilotRunResponse>("/api/grantpilot/run", body),
  match: (body: AnyRecord) => apiPost<GrantPilotRunResponse>("/api/grantpilot/match", body),
  profile: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/profile", body),
  score: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/score", body),
  requirements: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/requirements", body),
  readiness: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/readiness", body),
  prepareApplication: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/prepare-application", body),
  validateIntake: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/intake/validate", body),
  compareGrants: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/grants/compare", body),
  feedback: (body: AnyRecord) => apiPost<AnyRecord>("/api/grantpilot/feedback", body)
};

export const STORAGE_KEYS = {
  latestRun: "grantpilot_latest_run",
  latestProjectProfile: "grantpilot_latest_project_profile",
  latestCandidateGrants: "grantpilot_latest_candidate_grants",
  selectedGrant: "grantpilot_selected_grant",
  selectedGrantId: "grantpilot_selected_grant_id",
  latestRequirements: "grantpilot_latest_requirements",
  latestReadiness: "grantpilot_latest_readiness",
  latestPacket: "grantpilot_latest_packet",
  latestTraceId: "grantpilot_latest_trace_id",
  demoScenario: "grantpilot_demo_scenario",
  demoMode: "grantpilot_demo_mode",
  offlineMode: "grantpilot_offline_mode",
  recordingMode: "grantpilot_recording_mode",
  savedProjects: "grantpilot_saved_projects"
};

export function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage failures
  }
}

export function loadJson<T = unknown>(key: string, fallback: T | null = null): T | null {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLatestRun(response: GrantPilotRunResponse): void {
  saveJson(STORAGE_KEYS.latestRun, response);
  saveJson(STORAGE_KEYS.latestTraceId, response.trace_id);

  if (isRecord(response.result.project_profile)) {
    saveJson(STORAGE_KEYS.latestProjectProfile, response.result.project_profile);
  }

  if (Array.isArray(response.result.candidate_grants)) {
    saveJson(STORAGE_KEYS.latestCandidateGrants, response.result.candidate_grants);
  }
}

export function saveSelectedGrant(grant: GrantRecord): void {
  saveJson(STORAGE_KEYS.selectedGrant, grant);
  if (grant.id) {
    saveJson(STORAGE_KEYS.selectedGrantId, grant.id);
  }
}

export function savePreparedApplication(response: AnyRecord): void {
  saveJson(STORAGE_KEYS.latestPacket, response);
  const result = getRecordField(response, "result");

  if (isRecord(result.requirements)) {
    saveJson(STORAGE_KEYS.latestRequirements, result.requirements);
  }

  if (isRecord(result.readiness_gaps)) {
    saveJson(STORAGE_KEYS.latestReadiness, result.readiness_gaps);
  }

  if (isRecord(result.selected_grant)) {
    saveSelectedGrant(result.selected_grant as GrantRecord);
  }

  if (typeof response.trace_id === "string") {
    saveJson(STORAGE_KEYS.latestTraceId, response.trace_id);
  }
}

export function stripHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(value: unknown, length = 220): string {
  const text = stripHtml(value);

  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}...`;
}

export function formatDate(value: unknown): string {
  if (!value) return "Not listed";
  return String(value);
}

export function formatTimestamp(value: unknown): string {
  if (!value) return "Not available";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatRelativeTime(value: unknown): string {
  if (!value) return "Not refreshed";

  const date = new Date(String(value));
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return String(value);

  const diffMs = Date.now() - timestamp;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);

  const suffix = diffMs >= 0 ? "ago" : "from now";
  if (minutes < 60) return `${Math.max(1, minutes)}m ${suffix}`;
  if (hours < 48) return `${hours}h ${suffix}`;
  return `${days}d ${suffix}`;
}

export function formatCurrencyLike(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Not listed";

  const text = String(value);
  if (text.startsWith("$")) return text;
  if (/^\d[\d,]*(\.\d+)?$/.test(text)) return `$${text}`;
  return text;
}

export function getGrantScore(grant: GrantRecord): number | null {
  return grant.deterministic_score ?? grant.fit_score ?? grant.score ?? grant.related_score ?? null;
}

export function getLatestProjectProfile(): AnyRecord | null {
  return loadJson<AnyRecord>(STORAGE_KEYS.latestProjectProfile, null) || (cloneDemo(DEMO_PROJECT_PROFILE) as AnyRecord);
}

export function getLatestCandidateGrants(): GrantRecord[] {
  const saved = loadJson<GrantRecord[]>(STORAGE_KEYS.latestCandidateGrants, []) || [];
  return saved.length ? saved : (cloneDemo(DEMO_GRANTS) as GrantRecord[]);
}

export function getLatestRun(): GrantPilotRunResponse | null {
  return loadJson<GrantPilotRunResponse>(STORAGE_KEYS.latestRun, null) || (cloneDemo(DEMO_RUN) as GrantPilotRunResponse);
}

export function getSelectedGrant(): GrantRecord | null {
  return loadJson<GrantRecord>(STORAGE_KEYS.selectedGrant, null) || (cloneDemo(DEMO_GRANTS[0]) as GrantRecord);
}

export function getLatestPacket(): AnyRecord | null {
  return loadJson<AnyRecord>(STORAGE_KEYS.latestPacket, null) || (cloneDemo(DEMO_PREPARE_APPLICATION) as AnyRecord);
}

export function getDemoSavedProjectCount(): number {
  return getSavedProjects().length;
}

export function getOfflineMode(): boolean {
  return loadJson<boolean>(STORAGE_KEYS.offlineMode, false) === true;
}

export function setOfflineMode(value: boolean): void {
  saveJson(STORAGE_KEYS.offlineMode, value);
}

export function getRecordingMode(): boolean {
  return loadJson<boolean>(STORAGE_KEYS.recordingMode, false) === true;
}

export function setRecordingMode(value: boolean): void {
  saveJson(STORAGE_KEYS.recordingMode, value);
}

export function getSavedProjects(): SavedProjectSnapshot[] {
  const projects = loadJson<SavedProjectSnapshot[]>(STORAGE_KEYS.savedProjects, []) || [];
  const normalized = projects
    .filter((project) => isRecord(project) && typeof project.id === "string")
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));

  if (normalized.length) return normalized;
  return [cloneDemo(DEMO_SAVED_PROJECT) as SavedProjectSnapshot];
}

export function saveSavedProjects(projects: SavedProjectSnapshot[]): void {
  saveJson(STORAGE_KEYS.savedProjects, projects.slice(0, 25));
}

export function saveProjectSnapshotFromRun({
  description,
  documents_available,
  response,
  selected_grant = null
}: {
  description: string;
  documents_available: string[];
  response: GrantPilotRunResponse;
  selected_grant?: GrantRecord | null;
}): SavedProjectSnapshot {
  const now = new Date().toISOString();
  const result = asRecord(response.result);
  const projectProfile = getRecordField(result, "project_profile");
  const candidateGrants = getArrayField<GrantRecord>(result, "candidate_grants");
  const title = buildProjectTitle(projectProfile, description);
  const existing = getSavedProjects();
  const stableKey = String(response.trace_id || title).trim().toLowerCase();
  const previous = existing.find((project) => {
    return String(project.trace_id || project.title).trim().toLowerCase() === stableKey;
  });

  const snapshot: SavedProjectSnapshot = {
    id: previous?.id || `project_${Date.now()}`,
    title,
    description,
    created_at: previous?.created_at || now,
    updated_at: now,
    documents_available,
    trace_id: response.trace_id,
    project_profile: projectProfile,
    candidate_grants: candidateGrants,
    selected_grant,
    latest_run: response,
    latest_packet: loadJson<AnyRecord>(STORAGE_KEYS.latestPacket, null)
  };

  saveSavedProjects([snapshot, ...existing.filter((project) => project.id !== snapshot.id)]);
  return snapshot;
}

export function deleteSavedProject(projectId: string): void {
  saveSavedProjects(getSavedProjects().filter((project) => project.id !== projectId));
}

export function restoreSavedProject(projectId: string): SavedProjectSnapshot | null {
  const project = getSavedProjects().find((item) => item.id === projectId) || null;
  if (!project) return null;

  if (project.latest_run) saveLatestRun(project.latest_run);
  if (project.project_profile) saveJson(STORAGE_KEYS.latestProjectProfile, project.project_profile);
  if (project.candidate_grants) saveJson(STORAGE_KEYS.latestCandidateGrants, project.candidate_grants);
  if (project.selected_grant) saveSelectedGrant(project.selected_grant);
  if (project.latest_packet) savePreparedApplication(project.latest_packet);

  return project;
}

export function exportTextFile(filename: string, contents: string, mimeType = "text/plain;charset=utf-8"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportJsonFile(filename: string, value: unknown): void {
  exportTextFile(filename, JSON.stringify(value, null, 2), "application/json;charset=utf-8");
}

function buildProjectTitle(projectProfile: AnyRecord, description: string): string {
  const explicit = getStringField(projectProfile, "project_title") || getStringField(projectProfile, "title");
  if (explicit) return explicit;

  const county = getStringField(projectProfile, "county");
  const category = getStringField(projectProfile, "project_category");
  if (county && category) return `${county} ${category} project`;
  if (category) return `${category} project`;

  const shortDescription = stripHtml(description).slice(0, 56).trim();
  return shortDescription ? `${shortDescription}${shortDescription.length >= 56 ? "..." : ""}` : "Saved GrantPilot project";
}
