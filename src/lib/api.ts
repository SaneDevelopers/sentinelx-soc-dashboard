const DEFAULT_API_BASE_URL = "http://localhost:8000";

function getApiBaseUrl() {
  const value = import.meta.env.VITE_API_URL?.trim();
  if (!value) return DEFAULT_API_BASE_URL;
  return value.replace(/\/$/, "");
}

function buildUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface ApiListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiLogEvent {
  id: number;
  timestamp: string;
  source_ip: string;
  destination_ip: string | null;
  host: string | null;
  event_type: string;
  severity: string | null;
  username: string | null;
  status: string | null;
  source: string | null;
  protocol: string | null;
  port: number | null;
  action: string | null;
  result: string | null;
  bytes_out: number | null;
  raw_data: Record<string, unknown>;
}

export interface ApiAlertNote {
  id: number;
  author: string;
  text: string;
  created_at: string;
}

export interface ApiAlert {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  source_ip: string;
  event_type: string;
  log_event_id: number | null;
  anomaly_score_id: number | null;
  created_at: string;
  updated_at: string;
  notes: ApiAlertNote[];
}

export interface ApiAnomaly {
  id: number;
  log_event_id: number;
  score: number;
  model_name: string;
  severity: string;
  reason: string;
  created_at: string;
}

export interface ApiStats {
  events_24h: number;
  alerts_total: number;
  active_alerts: number;
  critical_alerts: number;
  anomalies_24h: number;
  ml_model_online: boolean;
  ml_model_name: string;
  event_activity: Array<{ hour: string; events: number; alerts: number }>;
  top_sources: Array<{ source_ip: string; count: number }>;
}

export interface ApiAsset {
  id: string;
  hostname: string;
  ip: string;
  status: string;
  risk_level: string;
  last_activity: string;
  os: string;
  owner: string;
}

export interface ApiRule {
  id: string;
  name: string;
  description: string;
  condition: Record<string, unknown>;
  severity: string;
  enabled: boolean;
  created_by: string;
}

export interface ApiThreat {
  id: string;
  indicator: string;
  type: string;
  risk_level: string;
  source: string;
  first_seen: string;
  last_seen: string;
  description: string;
  watchlisted: boolean;
}

export interface ApiIntegration {
  id: string;
  name: string;
  type: string;
  status: string;
  last_sync: string;
  data_type: string;
}

export function fetchLogs() {
  return requestJson<ApiListResponse<ApiLogEvent>>("/api/logs?limit=500");
}

export function fetchAlerts() {
  return requestJson<ApiListResponse<ApiAlert>>("/api/alerts?limit=500");
}

export function fetchAnomalies() {
  return requestJson<ApiListResponse<ApiAnomaly>>("/api/anomalies?limit=500");
}

export function fetchStats() {
  return requestJson<ApiStats>("/api/stats");
}

export function fetchAssets() {
  return requestJson<ApiListResponse<ApiAsset>>("/api/assets");
}

export function fetchRules() {
  return requestJson<ApiListResponse<ApiRule>>("/api/rules");
}

export function upsertRule(rule: ApiRule) {
  return requestJson<ApiRule>("/api/rules", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export function toggleRule(ruleId: string, enabled?: boolean) {
  return requestJson<ApiRule>(`/api/rules/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify(enabled === undefined ? {} : { enabled }),
  });
}

export function fetchThreats() {
  return requestJson<ApiListResponse<ApiThreat>>("/api/threat-intel");
}

export function toggleThreatWatchlist(threatId: string) {
  return requestJson<ApiThreat>(`/api/threat-intel/${threatId}/watchlist`, {
    method: "PATCH",
  });
}

export function fetchIntegrations() {
  return requestJson<ApiListResponse<ApiIntegration>>("/api/integrations");
}

export function addIntegrationApi(integration: ApiIntegration) {
  return requestJson<ApiIntegration>("/api/integrations", {
    method: "POST",
    body: JSON.stringify(integration),
  });
}

export function removeIntegrationApi(integrationId: string) {
  return requestJson<{ success: boolean; id: string }>(`/api/integrations/${integrationId}`, {
    method: "DELETE",
  });
}

export function updateAlertStatus(alertId: number, status: string) {
  return requestJson<ApiAlert>(`/api/alerts/${alertId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function addAlertNote(alertId: number, text: string, author = "you") {
  return requestJson<ApiAlertNote>(`/api/alerts/${alertId}/notes`, {
    method: "POST",
    body: JSON.stringify({ text, author }),
  });
}
