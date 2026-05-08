const STORAGE_BASE_URL = "sentinelx_api_url";
const STORAGE_TOKEN = "sentinelx_token";
const DEFAULT_API_BASE_URL = "http://localhost:8000";

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_BASE_URL);
    if (stored) return stored.replace(/\/$/, "");
  }
  const value = import.meta.env.VITE_API_URL?.trim();
  if (!value) return DEFAULT_API_BASE_URL;
  return value.replace(/\/$/, "");
}

export function setApiBaseUrl(url: string) {
  if (typeof window === "undefined") return;
  if (url) window.localStorage.setItem(STORAGE_BASE_URL, url.replace(/\/$/, ""));
  else window.localStorage.removeItem(STORAGE_BASE_URL);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_TOKEN);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(STORAGE_TOKEN, token);
  else window.localStorage.removeItem(STORAGE_TOKEN);
}

function buildUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const token = getAuthToken();
  if (token && !headers["Authorization"]) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(buildUrl(path), { ...init, headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface ApiListResponse<T> { items: T[]; total: number; limit: number; offset: number; }

export interface ApiLogEvent {
  id: number; timestamp: string; source_ip: string; destination_ip: string | null;
  host: string | null; event_type: string; severity: string | null; username: string | null;
  status: string | null; source: string | null; protocol: string | null; port: number | null;
  action: string | null; result: string | null; bytes_out: number | null; raw_data: Record<string, unknown>;
}
export interface ApiAlertNote { id: number; author: string; text: string; created_at: string; }
export interface ApiAlert {
  id: number; title: string; description: string; severity: string; status: string;
  source_ip: string; event_type: string; log_event_id: number | null; anomaly_score_id: number | null;
  created_at: string; updated_at: string; notes: ApiAlertNote[];
}
export interface ApiAnomaly {
  id: number; log_event_id: number; score: number; model_name: string; severity: string;
  reason: string; created_at: string;
}
export interface ApiStats {
  events_24h: number; alerts_total: number; active_alerts: number; critical_alerts: number;
  anomalies_24h: number; ml_model_online: boolean; ml_model_name: string;
  event_activity: Array<{ hour: string; events: number; alerts: number }>;
  top_sources: Array<{ source_ip: string; count: number }>;
}
export interface ApiAsset { id: string; hostname: string; ip: string; status: string; risk_level: string; last_activity: string; os: string; owner: string; }
export interface ApiRule { id: string; name: string; description: string; condition: Record<string, unknown>; severity: string; enabled: boolean; created_by: string; }
export interface ApiThreat { id: string; indicator: string; type: string; risk_level: string; source: string; first_seen: string; last_seen: string; description: string; watchlisted: boolean; }
export interface ApiIntegration { id: string; name: string; type: string; status: string; last_sync: string; data_type: string; }
export interface ApiUser { id: number; email: string; role: string; }
export interface ApiAuthResponse { token: string; user: ApiUser; }
export interface ApiSettings {
  ingest_api_key_preview: string;
  alert_score_threshold: number;
  model: { online: boolean; name: string };
}

export const fetchLogs = () => requestJson<ApiListResponse<ApiLogEvent>>("/api/logs?limit=500");
export const fetchAlerts = () => requestJson<ApiListResponse<ApiAlert>>("/api/alerts?limit=500");
export const fetchAnomalies = () => requestJson<ApiListResponse<ApiAnomaly>>("/api/anomalies?limit=500");
export const fetchStats = () => requestJson<ApiStats>("/api/stats");
export const fetchAssets = () => requestJson<ApiListResponse<ApiAsset>>("/api/assets");
export const fetchRules = () => requestJson<ApiListResponse<ApiRule>>("/api/rules");
export const upsertRule = (rule: ApiRule) => requestJson<ApiRule>("/api/rules", { method: "POST", body: JSON.stringify(rule) });
export const toggleRule = (ruleId: string, enabled?: boolean) =>
  requestJson<ApiRule>(`/api/rules/${ruleId}`, { method: "PATCH", body: JSON.stringify(enabled === undefined ? {} : { enabled }) });
export const deleteRuleApi = (ruleId: string) => requestJson<void>(`/api/rules/${ruleId}`, { method: "DELETE" });
export const fetchThreats = () => requestJson<ApiListResponse<ApiThreat>>("/api/threat-intel");
export const toggleThreatWatchlist = (threatId: string) => requestJson<ApiThreat>(`/api/threat-intel/${threatId}/watchlist`, { method: "PATCH" });
export const fetchIntegrations = () => requestJson<ApiListResponse<ApiIntegration>>("/api/integrations");
export const addIntegrationApi = (i: ApiIntegration) => requestJson<ApiIntegration>("/api/integrations", { method: "POST", body: JSON.stringify(i) });
export const removeIntegrationApi = (id: string) => requestJson<{ success: boolean; id: string }>(`/api/integrations/${id}`, { method: "DELETE" });
export const updateAlertStatus = (alertId: number, status: string) =>
  requestJson<ApiAlert>(`/api/alerts/${alertId}`, { method: "PATCH", body: JSON.stringify({ status }) });
export const addAlertNote = (alertId: number, text: string, author = "you") =>
  requestJson<ApiAlertNote>(`/api/alerts/${alertId}/notes`, { method: "POST", body: JSON.stringify({ text, author }) });
export const promoteAnomalyApi = (anomalyId: number) =>
  requestJson<ApiAlert>(`/api/anomalies/${anomalyId}/promote`, { method: "POST" });

// Auth
export const apiSignup = (email: string, password: string) =>
  requestJson<ApiAuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
export const apiLogin = (email: string, password: string) =>
  requestJson<ApiAuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const apiMe = () => requestJson<ApiUser>("/api/auth/me");

// Settings
export const fetchSettings = () => requestJson<ApiSettings>("/api/settings");
export const rotateApiKey = () => requestJson<{ api_key: string }>("/api/settings/api-key/rotate", { method: "POST" });
export const updateThreshold = (threshold: number) =>
  requestJson<{ alert_score_threshold: number }>("/api/settings/threshold", { method: "PATCH", body: JSON.stringify({ threshold }) });

// Ingest (uses x-api-key, not bearer)
export interface IngestPayload {
  timestamp: string; source_ip: string; event_type: string;
  destination_ip?: string; host?: string; user?: string; severity?: string;
  status?: string; protocol?: string; port?: number; action?: string;
  result?: string; bytes_out?: number; source?: string; raw?: Record<string, unknown>;
}
export async function sendIngestEvent(apiKey: string, payload: IngestPayload) {
  const response = await fetch(buildUrl("/api/public/ingest"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text()) || `Ingest failed (${response.status})`);
  return response.json();
}
