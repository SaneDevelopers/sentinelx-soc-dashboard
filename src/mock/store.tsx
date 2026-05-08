import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import {
  timeline,
} from "./data";
import type { Alert, AlertStatus, Anomaly, Asset, Integration, LogEntry, Rule, ThreatIndicator } from "@/types/soc";
import {
  addIntegrationApi,
  addAlertNote as apiAddAlertNote,
  fetchAssets,
  fetchAlerts,
  fetchAnomalies,
  fetchIntegrations,
  fetchLogs,
  fetchRules,
  fetchStats,
  fetchThreats,
  removeIntegrationApi,
  toggleRule as apiToggleRule,
  toggleThreatWatchlist as apiToggleThreatWatchlist,
  updateAlertStatus as apiUpdateAlertStatus,
  upsertRule as apiUpsertRule,
  promoteAnomalyApi,
  type ApiAlert,
  type ApiAsset,
  type ApiAnomaly,
  type ApiIntegration,
  type ApiLogEvent,
  type ApiRule,
  type ApiThreat,
} from "@/lib/api";

type AssetEntry = Asset;
type SyncStatus = "loading" | "live" | "error";

interface SocStore {
  logs: LogEntry[];
  assets: AssetEntry[];
  timeline: typeof timeline;
  eventActivity: Array<{ hour: string; events: number; alerts: number }>;
  alerts: Alert[];
  anomalies: Anomaly[];
  mlModelOnline: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncAt: string | null;
  rules: Rule[];
  threats: ThreatIndicator[];
  integrations: Integration[];
  apiKey: string;
  refreshData: () => Promise<void>;
  updateAlertStatus: (id: string, status: AlertStatus) => Promise<void>;
  addAlertNote: (id: string, text: string) => Promise<void>;
  toggleRule: (id: string) => void;
  upsertRule: (rule: Rule) => void;
  reviewAnomaly: (id: string) => void;
  promoteAnomaly: (id: string) => void;
  toggleWatchlist: (id: string) => void;
  removeIntegration: (id: string) => void;
  addIntegration: (i: Integration) => void;
  regenerateApiKey: () => void;
}

const Ctx = createContext<SocStore | null>(null);

function genKey() {
  return "snx_" + Array.from(crypto.getRandomValues(new Uint8Array(20))).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeLog(item: ApiLogEvent): LogEntry {
  return {
    id: String(item.id),
    ts: item.timestamp,
    source_ip: item.source_ip,
    dest_ip: item.destination_ip ?? item.source_ip,
    event_type: item.event_type,
    protocol: item.protocol ?? "unknown",
    port: item.port ?? 0,
    user_name: item.username ?? item.source ?? "unknown",
    action: item.action ?? item.result ?? "observe",
    result: (item.result ?? item.status ?? "success") as LogEntry["result"],
    severity: (item.severity ?? "low") as LogEntry["severity"],
    bytes_out: item.bytes_out ?? undefined,
    raw: item.raw_data,
  };
}

function normalizeAsset(item: ApiAsset): AssetEntry {
  return {
    id: item.id,
    hostname: item.hostname,
    ip: item.ip,
    status: item.status as AssetEntry["status"],
    risk_level: item.risk_level as AssetEntry["risk_level"],
    last_activity: item.last_activity,
    os: item.os,
    owner: item.owner,
  };
}

function normalizeRule(item: ApiRule): Rule {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    condition: item.condition as Rule["condition"],
    severity: item.severity as Rule["severity"],
    enabled: item.enabled,
    created_by: item.created_by,
  };
}

function normalizeThreat(item: ApiThreat): ThreatIndicator {
  return {
    id: item.id,
    indicator: item.indicator,
    type: item.type as ThreatIndicator["type"],
    risk_level: item.risk_level as ThreatIndicator["risk_level"],
    source: item.source,
    first_seen: item.first_seen,
    last_seen: item.last_seen,
    description: item.description,
    watchlisted: item.watchlisted,
  };
}

function normalizeIntegration(item: ApiIntegration): Integration {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    status: item.status as Integration["status"],
    last_sync: item.last_sync,
    data_type: item.data_type,
  };
}

function deriveRuleId(eventType: string) {
  if (eventType === "auth_failure") return "r1";
  if (eventType === "port_scan") return "r2";
  if (eventType === "auth_success") return "r7";
  if (eventType === "firewall_block") return "r5";
  return "backend-auto";
}

function buildAlert(item: ApiAlert, logsById: Map<string, LogEntry>, assetCatalog: AssetEntry[]): Alert {
  const relatedLog = item.log_event_id ? logsById.get(String(item.log_event_id)) : undefined;
  return {
    id: String(item.id),
    title: item.title,
    description: item.description,
    severity: item.severity as Alert["severity"],
    status: item.status as AlertStatus,
    source_ip: item.source_ip,
    ts: item.created_at,
    rule_id: deriveRuleId(item.event_type),
    log_id: String(item.log_event_id ?? item.id),
    notes: (item.notes ?? []).map((note) => ({ author: note.author, ts: note.created_at, text: note.text })),
    asset_id: relatedLog ? assetCatalog.find((asset) => asset.ip === relatedLog.dest_ip || asset.ip === relatedLog.source_ip)?.id : undefined,
  };
}

function buildAnomaly(item: ApiAnomaly, logsById: Map<string, LogEntry>): Anomaly {
  const relatedLog = logsById.get(String(item.log_event_id));
  return {
    id: String(item.id),
    ts: item.created_at,
    source_ip: relatedLog?.source_ip ?? "unknown",
    event_type: relatedLog?.event_type ?? "unknown",
    score: item.score,
    status: item.score >= 0.8 ? "promoted" : item.score >= 0.55 ? "reviewed" : "new",
    log_id: String(item.log_event_id),
    reason: item.reason,
  };
}

export function SocProvider({ children }: { children: ReactNode }) {
  const [logsState, setLogs] = useState<LogEntry[]>([]);
  const [assetsState, setAssets] = useState<AssetEntry[]>([]);
  const [alertsState, setAlerts] = useState<Alert[]>([]);
  const [anomaliesState, setAnomalies] = useState<Anomaly[]>([]);
  const [mlModelOnline, setMlModelOnline] = useState(false);
  const [eventActivity, setEventActivity] = useState<Array<{ hour: string; events: number; alerts: number }>>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [rulesState, setRules] = useState<Rule[]>([]);
  const [threatsState, setThreats] = useState<ThreatIndicator[]>([]);
  const [integrationsState, setIntegrations] = useState<Integration[]>([]);
  const [apiKey, setApiKey] = useState<string>("snx_demo_key");

  const refreshData = useCallback(async () => {
    setSyncStatus("loading");
    setSyncError(null);

    try {
      const [
        logsResponse,
        alertsResponse,
        anomaliesResponse,
        statsResponse,
        assetsResponse,
        rulesResponse,
        threatsResponse,
        integrationsResponse,
      ] = await Promise.all([
        fetchLogs(),
        fetchAlerts(),
        fetchAnomalies(),
        fetchStats(),
        fetchAssets(),
        fetchRules(),
        fetchThreats(),
        fetchIntegrations(),
      ]);

      const normalizedLogs = logsResponse.items.map(normalizeLog).sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
      const logsById = new Map(normalizedLogs.map((log) => [log.id, log]));
      setLogs(normalizedLogs);

      const normalizedAssets = assetsResponse.items.map(normalizeAsset);
      const normalizedRules = rulesResponse.items.map(normalizeRule);
      const normalizedThreats = threatsResponse.items.map(normalizeThreat);
      const normalizedIntegrations = integrationsResponse.items.map(normalizeIntegration);
      setAssets(normalizedAssets);
      setRules(normalizedRules);
      setThreats(normalizedThreats);
      setIntegrations(normalizedIntegrations);

      setAlerts(alertsResponse.items.map((item) => buildAlert(item, logsById, normalizedAssets)).sort((a, b) => +new Date(b.ts) - +new Date(a.ts)));

      setAnomalies(anomaliesResponse.items.map((item) => buildAnomaly(item, logsById)).sort((a, b) => b.score - a.score));

      const hasMlScoredAnomalies = anomaliesResponse.items.some((item) => {
        const name = item.model_name.toLowerCase();
        return name.includes("isolation") || name.includes("ensemble");
      });
      setMlModelOnline(Boolean(statsResponse.ml_model_online) || hasMlScoredAnomalies);

      setEventActivity(statsResponse.event_activity.map((item) => ({ hour: item.hour, events: item.events, alerts: item.alerts })));
      setSyncStatus("live");
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Unknown network error");
      console.warn("Failed to load live SOC data.", error);
    }
  }, []);

  useEffect(() => {
    void refreshData();
    const interval = window.setInterval(() => {
      void refreshData();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [refreshData]);

  const updateAlertStatus = useCallback(async (id: string, status: AlertStatus) => {
    const previous = alertsState;
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, status } : alert)));

    const alertId = Number(id);
    if (!Number.isFinite(alertId)) {
      toast.success(`Alert ${status}`);
      return;
    }

    try {
      await apiUpdateAlertStatus(alertId, status);
      toast.success(`Alert ${status}`);
    } catch (error) {
      setAlerts(previous);
      toast.error("Failed to update alert status");
    }
  }, [alertsState]);

  const addAlertNote = useCallback(async (id: string, text: string) => {
    const previous = alertsState;
    const createdAt = new Date().toISOString();
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, notes: [...alert.notes, { author: "you", ts: createdAt, text }] } : alert)));

    const alertId = Number(id);
    if (!Number.isFinite(alertId)) {
      toast.success("Note added");
      return;
    }

    try {
      await apiAddAlertNote(alertId, text);
      toast.success("Note added");
    } catch (error) {
      setAlerts(previous);
      toast.error("Failed to add note");
    }
  }, [alertsState]);

  const toggleRule = useCallback((id: string) => {
    const previous = rulesState;
    const next = rulesState.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
    setRules(next);
    void apiToggleRule(id, next.find((rule) => rule.id === id)?.enabled).catch(() => {
      setRules(previous);
      toast.error("Failed to update rule");
    });
  }, [rulesState]);

  const upsertRule = useCallback((rule: Rule) => {
    const previous = rulesState;
    setRules((current) => (current.some((item) => item.id === rule.id) ? current.map((item) => (item.id === rule.id ? rule : item)) : [...current, rule]));
    void apiUpsertRule(rule as ApiRule).then(() => toast.success("Rule saved")).catch(() => {
      setRules(previous);
      toast.error("Failed to save rule");
    });
  }, [rulesState]);

  const reviewAnomaly = useCallback((id: string) => {
    setAnomalies((current) => current.map((anomaly) => (anomaly.id === id ? { ...anomaly, status: "reviewed" } : anomaly)));
    toast.success("Anomaly marked reviewed");
  }, []);

  const promoteAnomaly = useCallback((id: string) => {
    setAnomalies((current) => current.map((anomaly) => (anomaly.id === id ? { ...anomaly, status: "promoted" } : anomaly)));
    const numId = Number(id);
    if (Number.isFinite(numId)) {
        void promoteAnomalyApi(numId).then(() => {
        toast.success("Promoted to alert");
        void refreshData();
      }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed to promote"));
      } else {
      toast.success("Promoted to alert");
      }
  }, [refreshData]);

  const toggleWatchlist = useCallback((id: string) => {
    const previous = threatsState;
    setThreats((current) => current.map((threat) => (threat.id === id ? { ...threat, watchlisted: !threat.watchlisted } : threat)));
    void apiToggleThreatWatchlist(id).catch(() => {
      setThreats(previous);
      toast.error("Failed to update watchlist");
    });
  }, [threatsState]);

  const removeIntegration = useCallback((id: string) => {
    const previous = integrationsState;
    setIntegrations((current) => current.filter((integration) => integration.id !== id));
    void removeIntegrationApi(id).then(() => toast.success("Integration removed")).catch(() => {
      setIntegrations(previous);
      toast.error("Failed to remove integration");
    });
  }, [integrationsState]);

  const addIntegration = useCallback((integration: Integration) => {
    const previous = integrationsState;
    setIntegrations((current) => [...current, integration]);
    void addIntegrationApi({
      ...integration,
      status: integration.status,
      last_sync: integration.last_sync,
    }).then(() => toast.success("Integration added")).catch(() => {
      setIntegrations(previous);
      toast.error("Failed to add integration");
    });
  }, [integrationsState]);

  const regenerateApiKey = useCallback(() => {
    setApiKey(genKey());
    toast.success("API key regenerated");
  }, []);

  const value: SocStore = {
    logs: logsState,
    assets: assetsState,
    timeline,
    eventActivity,
    alerts: alertsState,
    anomalies: anomaliesState,
    mlModelOnline,
    syncStatus,
    syncError,
    lastSyncAt,
    rules: rulesState,
    threats: threatsState,
    integrations: integrationsState,
    apiKey,
    refreshData,
    updateAlertStatus,
    addAlertNote,
    toggleRule,
    upsertRule,
    reviewAnomaly,
    promoteAnomaly,
    toggleWatchlist,
    removeIntegration,
    addIntegration,
    regenerateApiKey,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSoc() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSoc must be used within SocProvider");
  return value;
}
