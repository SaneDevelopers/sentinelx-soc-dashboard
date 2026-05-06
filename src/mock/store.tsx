import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import {
  alerts as seedAlerts, anomalies as seedAnomalies, rules as seedRules,
  threats as seedThreats, integrations as seedIntegrations,
  logs, assets, timeline, eventActivity,
} from "./data";
import type { Alert, Anomaly, Rule, ThreatIndicator, Integration, AlertStatus } from "@/types/soc";
import { toast } from "sonner";

interface SocStore {
  logs: typeof logs;
  assets: typeof assets;
  timeline: typeof timeline;
  eventActivity: typeof eventActivity;
  alerts: Alert[];
  anomalies: Anomaly[];
  rules: Rule[];
  threats: ThreatIndicator[];
  integrations: Integration[];
  apiKey: string;
  updateAlertStatus: (id: string, status: AlertStatus) => void;
  addAlertNote: (id: string, text: string) => void;
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

export function SocProvider({ children }: { children: ReactNode }) {
  const [alertsState, setAlerts] = useState<Alert[]>(seedAlerts);
  const [anomaliesState, setAnomalies] = useState<Anomaly[]>(seedAnomalies);
  const [rulesState, setRules] = useState<Rule[]>(seedRules);
  const [threatsState, setThreats] = useState<ThreatIndicator[]>(seedThreats);
  const [integrationsState, setIntegrations] = useState<Integration[]>(seedIntegrations);
  const [apiKey, setApiKey] = useState<string>("snx_5f2a9c7b3d8e1490a6c2b7e4f1d9a8b6c0e3f7a2");

  const updateAlertStatus = useCallback((id: string, status: AlertStatus) => {
    setAlerts((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(`Alert ${status}`);
  }, []);
  const addAlertNote = useCallback((id: string, text: string) => {
    setAlerts((p) => p.map((a) => (a.id === id ? { ...a, notes: [...a.notes, { author: "you", ts: new Date().toISOString(), text }] } : a)));
    toast.success("Note added");
  }, []);
  const toggleRule = useCallback((id: string) => {
    setRules((p) => p.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }, []);
  const upsertRule = useCallback((rule: Rule) => {
    setRules((p) => (p.some((r) => r.id === rule.id) ? p.map((r) => (r.id === rule.id ? rule : r)) : [...p, rule]));
    toast.success("Rule saved");
  }, []);
  const reviewAnomaly = useCallback((id: string) => {
    setAnomalies((p) => p.map((a) => (a.id === id ? { ...a, status: "reviewed" } : a)));
    toast.success("Anomaly marked reviewed");
  }, []);
  const promoteAnomaly = useCallback((id: string) => {
    setAnomalies((p) => p.map((a) => (a.id === id ? { ...a, status: "promoted" } : a)));
    toast.success("Promoted to alert");
  }, []);
  const toggleWatchlist = useCallback((id: string) => {
    setThreats((p) => p.map((t) => (t.id === id ? { ...t, watchlisted: !t.watchlisted } : t)));
  }, []);
  const removeIntegration = useCallback((id: string) => {
    setIntegrations((p) => p.filter((i) => i.id !== id));
    toast.success("Integration removed");
  }, []);
  const addIntegration = useCallback((i: Integration) => {
    setIntegrations((p) => [...p, i]);
    toast.success("Integration added");
  }, []);
  const regenerateApiKey = useCallback(() => {
    setApiKey(genKey());
    toast.success("API key regenerated");
  }, []);

  const value: SocStore = {
    logs, assets, timeline, eventActivity,
    alerts: alertsState, anomalies: anomaliesState, rules: rulesState,
    threats: threatsState, integrations: integrationsState, apiKey,
    updateAlertStatus, addAlertNote, toggleRule, upsertRule,
    reviewAnomaly, promoteAnomaly, toggleWatchlist,
    removeIntegration, addIntegration, regenerateApiKey,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSoc() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSoc must be used within SocProvider");
  return v;
}
