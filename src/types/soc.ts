export type Severity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "investigating" | "resolved" | "escalated";
export type AnomalyStatus = "new" | "reviewed" | "promoted";
export type AssetStatus = "online" | "offline" | "degraded";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface LogEntry {
  id: string;
  ts: string;
  source_ip: string;
  dest_ip: string;
  event_type: string;
  protocol: string;
  port: number;
  user_name: string;
  action: string;
  result: "success" | "failure" | "blocked";
  severity: Severity;
  bytes_out?: number;
  raw: Record<string, unknown>;
}

export interface Asset {
  id: string;
  hostname: string;
  ip: string;
  status: AssetStatus;
  risk_level: RiskLevel;
  last_activity: string;
  os: string;
  owner: string;
}

export interface RuleCondition {
  all?: Array<{ field: string; op: string; value: unknown; window_sec?: number }>;
  any?: Array<{ field: string; op: string; value: unknown; window_sec?: number }>;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  condition: RuleCondition;
  severity: Severity;
  enabled: boolean;
  created_by: string;
}

export interface AlertNote { author: string; ts: string; text: string; }

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  source_ip: string;
  ts: string;
  rule_id: string;
  log_id: string;
  notes: AlertNote[];
  asset_id?: string;
}

export interface Anomaly {
  id: string;
  ts: string;
  source_ip: string;
  event_type: string;
  score: number;
  status: AnomalyStatus;
  log_id: string;
  alert_id?: string;
  reason: string;
}

export interface ThreatIndicator {
  id: string;
  indicator: string;
  type: "ip" | "domain" | "hash" | "url";
  risk_level: RiskLevel;
  source: string;
  first_seen: string;
  last_seen: string;
  description: string;
  watchlisted?: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: "connected" | "error" | "syncing" | "disconnected";
  last_sync: string;
  data_type: string;
}

export interface TimelineStep {
  id: string;
  alert_id: string;
  ts: string;
  action: string;
  result: string;
}
