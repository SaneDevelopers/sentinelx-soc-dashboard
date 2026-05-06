import type {
  LogEntry, Asset, Rule, Alert, Anomaly, ThreatIndicator, Integration, TimelineStep, Severity,
} from "@/types/soc";

// Tiny seedable RNG for deterministic mock data
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const intBetween = (a: number, b: number) => Math.floor(rand() * (b - a + 1)) + a;

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

// ---------------- Assets ----------------
export const assets: Asset[] = [
  { id: "a1", hostname: "web-prod-01", ip: "10.0.1.21", status: "online", risk_level: "high", last_activity: iso(2 * 60_000), os: "Ubuntu 22.04", owner: "Platform" },
  { id: "a2", hostname: "db-primary", ip: "10.0.2.10", status: "online", risk_level: "critical", last_activity: iso(60_000), os: "Debian 12", owner: "Data" },
  { id: "a3", hostname: "auth-service", ip: "10.0.1.45", status: "degraded", risk_level: "high", last_activity: iso(8 * 60_000), os: "Alpine 3.19", owner: "Identity" },
  { id: "a4", hostname: "edge-gw-eu", ip: "10.0.0.4", status: "online", risk_level: "medium", last_activity: iso(30_000), os: "VyOS", owner: "Network" },
  { id: "a5", hostname: "ci-runner-3", ip: "10.0.3.18", status: "offline", risk_level: "low", last_activity: iso(3 * 3600_000), os: "Ubuntu 22.04", owner: "DevTools" },
  { id: "a6", hostname: "office-vpn", ip: "10.0.0.9", status: "online", risk_level: "medium", last_activity: iso(45_000), os: "pfSense", owner: "IT" },
];

// ---------------- Logs ----------------
const eventTypes = ["auth_failure", "auth_success", "port_scan", "http_request", "dns_query", "file_access", "process_exec", "firewall_block"];
const protocols = ["tcp", "udp", "https", "ssh", "smb", "telnet", "dns"];
const users = ["alice", "bob", "carol", "root", "svc_deploy", "guest", "dan"];
const actions = ["login", "read", "write", "exec", "connect", "scan"];
const externalIps = ["185.220.101.4", "45.155.205.211", "103.231.78.7", "92.118.39.81", "5.188.10.12", "23.94.27.10"];
const internalIps = assets.map((a) => a.ip);

function severityFor(et: string, result: string): Severity {
  if (et === "auth_failure" && result === "failure") return "medium";
  if (et === "port_scan") return "high";
  if (et === "firewall_block") return "low";
  if (result === "blocked") return "high";
  return pick(["low", "low", "low", "medium"]) as Severity;
}

export const logs: LogEntry[] = Array.from({ length: 520 }, (_, i) => {
  const et = pick(eventTypes);
  const internal = pick(internalIps);
  const external = pick(externalIps);
  const isInbound = rand() > 0.4;
  const result = pick(["success", "success", "failure", "blocked"]) as LogEntry["result"];
  const proto = pick(protocols);
  return {
    id: `log_${i.toString().padStart(4, "0")}`,
    ts: iso(intBetween(0, 24 * 3600_000)),
    source_ip: isInbound ? external : internal,
    dest_ip: isInbound ? internal : external,
    event_type: et,
    protocol: proto,
    port: pick([22, 80, 443, 3389, 445, 23, 53, 8080, intBetween(1024, 65535)]),
    user_name: pick(users),
    action: pick(actions),
    result,
    severity: severityFor(et, result),
    bytes_out: et === "http_request" ? intBetween(200, 80_000_000) : intBetween(64, 4096),
    raw: { agent: "sentinel-agent/1.4", region: pick(["eu-west", "us-east", "ap-south"]), tlsVersion: pick(["1.2", "1.3"]) },
  };
}).sort((a, b) => +new Date(b.ts) - +new Date(a.ts));

// ---------------- Rules ----------------
export const rules: Rule[] = [
  { id: "r1", name: "Brute force authentication", description: ">5 auth_failure from same source IP in 60s", severity: "high", enabled: true, created_by: "system",
    condition: { all: [{ field: "event_type", op: "eq", value: "auth_failure" }, { field: "source_ip", op: "count_gt", value: 5, window_sec: 60 }] } },
  { id: "r2", name: "Port scan detected", description: ">20 distinct ports from same IP in 120s", severity: "high", enabled: true, created_by: "system",
    condition: { all: [{ field: "port", op: "distinct_count_gt", value: 20, window_sec: 120 }] } },
  { id: "r3", name: "Threat intel match", description: "source_ip matches known indicator", severity: "critical", enabled: true, created_by: "system",
    condition: { all: [{ field: "source_ip", op: "matches_threat_intel", value: true }] } },
  { id: "r4", name: "Privileged action off-hours", description: "admin action between 00:00–05:00", severity: "medium", enabled: true, created_by: "alice",
    condition: { all: [{ field: "user_name", op: "eq", value: "root" }, { field: "ts", op: "hour_between", value: [0, 5] }] } },
  { id: "r5", name: "Suspicious protocol egress", description: "telnet/smb to external IP", severity: "high", enabled: true, created_by: "system",
    condition: { all: [{ field: "protocol", op: "in", value: ["telnet", "smb"] }] } },
  { id: "r6", name: "Large data transfer", description: "bytes_out > 50MB in single event", severity: "high", enabled: true, created_by: "bob",
    condition: { all: [{ field: "bytes_out", op: "gt", value: 50_000_000 }] } },
  { id: "r7", name: "New geo for user", description: "login from new country", severity: "medium", enabled: false, created_by: "system",
    condition: { all: [{ field: "event_type", op: "eq", value: "auth_success" }, { field: "geo", op: "new_for_user", value: true }] } },
  { id: "r8", name: "Repeated 5xx errors", description: ">10 server errors / minute from one host", severity: "low", enabled: true, created_by: "system",
    condition: { all: [{ field: "status_code", op: "regex", value: "^5\\d\\d$" }, { field: "source_ip", op: "count_gt", value: 10, window_sec: 60 }] } },
];

// ---------------- Alerts (derived/mocked) ----------------
const alertTitles: Array<[string, Severity, string]> = [
  ["Brute force from 185.220.101.4", "high", "r1"],
  ["Port scan against web-prod-01", "high", "r2"],
  ["Threat intel match: 45.155.205.211", "critical", "r3"],
  ["Off-hours root activity on db-primary", "medium", "r4"],
  ["Telnet egress detected", "high", "r5"],
  ["Large outbound transfer (78MB)", "high", "r6"],
  ["5xx spike on auth-service", "low", "r8"],
  ["Repeated SSH failures from 92.118.39.81", "medium", "r1"],
  ["Suspicious DNS tunneling pattern", "medium", "r5"],
  ["Privilege escalation attempt", "critical", "r3"],
];

export const alerts: Alert[] = alertTitles.map(([title, sev, ruleId], i) => {
  const log = logs[i * 7 % logs.length];
  return {
    id: `al_${i + 1}`,
    title,
    description: `${title}. Auto-generated from rule ${ruleId}.`,
    severity: sev,
    status: i === 0 ? "investigating" : i < 3 ? "open" : i === 3 ? "escalated" : i % 4 === 0 ? "resolved" : "open",
    source_ip: log.source_ip,
    ts: log.ts,
    rule_id: ruleId,
    log_id: log.id,
    asset_id: assets[i % assets.length].id,
    notes: i === 0 ? [{ author: "alice", ts: iso(20 * 60_000), text: "Investigating — IP also seen on edge gateway." }] : [],
  };
});

// ---------------- Anomalies ----------------
export const anomalies: Anomaly[] = Array.from({ length: 14 }, (_, i) => {
  const log = logs[(i * 11) % logs.length];
  return {
    id: `an_${i + 1}`,
    ts: log.ts,
    source_ip: log.source_ip,
    event_type: log.event_type,
    score: Math.round((0.65 + rand() * 0.35) * 100) / 100,
    status: i % 5 === 0 ? "reviewed" : i % 7 === 0 ? "promoted" : "new",
    log_id: log.id,
    reason: pick([
      "Unusual port for source",
      "Off-baseline request volume",
      "Rare protocol for asset",
      "First-seen geo for user",
      "Sequence resembles recon pattern",
    ]),
  };
});

// ---------------- Threat intel ----------------
export const threats: ThreatIndicator[] = [
  { id: "t1", indicator: "185.220.101.4", type: "ip", risk_level: "high", source: "AbuseIPDB", first_seen: iso(7 * 86_400_000), last_seen: iso(60_000), description: "Tor exit node, repeated brute-force activity." },
  { id: "t2", indicator: "45.155.205.211", type: "ip", risk_level: "critical", source: "Spamhaus", first_seen: iso(20 * 86_400_000), last_seen: iso(2 * 3600_000), description: "Linked to APT-style scanning campaigns." },
  { id: "t3", indicator: "evil-payload.xyz", type: "domain", risk_level: "high", source: "OpenPhish", first_seen: iso(3 * 86_400_000), last_seen: iso(4 * 3600_000), description: "Phishing kit hosting infrastructure." },
  { id: "t4", indicator: "d41d8cd98f00b204e9800998ecf8427e", type: "hash", risk_level: "medium", source: "VirusTotal", first_seen: iso(45 * 86_400_000), last_seen: iso(86_400_000), description: "Known dropper family." },
  { id: "t5", indicator: "103.231.78.7", type: "ip", risk_level: "medium", source: "AlienVault OTX", first_seen: iso(2 * 86_400_000), last_seen: iso(20 * 60_000), description: "Botnet C2 candidate." },
  { id: "t6", indicator: "malicious.example.com", type: "domain", risk_level: "high", source: "Internal", first_seen: iso(86_400_000), last_seen: iso(3600_000), description: "Observed in lateral movement attempts." },
  { id: "t7", indicator: "92.118.39.81", type: "ip", risk_level: "high", source: "GreyNoise", first_seen: iso(10 * 86_400_000), last_seen: iso(15 * 60_000), description: "Mass scanner, SSH probing." },
  { id: "t8", indicator: "https://bad.example/login", type: "url", risk_level: "critical", source: "PhishTank", first_seen: iso(5 * 86_400_000), last_seen: iso(2 * 3600_000), description: "Credential harvesting page." },
  { id: "t9", indicator: "5.188.10.12", type: "ip", risk_level: "low", source: "AbuseIPDB", first_seen: iso(30 * 86_400_000), last_seen: iso(6 * 3600_000), description: "Low-confidence scanner." },
  { id: "t10", indicator: "ransom-pay.onion", type: "domain", risk_level: "critical", source: "Internal", first_seen: iso(60 * 86_400_000), last_seen: iso(48 * 3600_000), description: "Ransomware payment portal." },
  { id: "t11", indicator: "23.94.27.10", type: "ip", risk_level: "medium", source: "GreyNoise", first_seen: iso(4 * 86_400_000), last_seen: iso(2 * 3600_000), description: "VPS provider, mixed reputation." },
  { id: "t12", indicator: "9b74c9897bac770ffc029102a200c5de", type: "hash", risk_level: "high", source: "VirusTotal", first_seen: iso(18 * 86_400_000), last_seen: iso(8 * 3600_000), description: "Loader observed in 14 campaigns." },
];

// ---------------- Integrations ----------------
export const integrations: Integration[] = [
  { id: "i1", name: "AWS CloudTrail", type: "Cloud Audit", status: "connected", last_sync: iso(60_000), data_type: "audit logs" },
  { id: "i2", name: "Okta", type: "Identity", status: "connected", last_sync: iso(2 * 60_000), data_type: "auth events" },
  { id: "i3", name: "CrowdStrike", type: "EDR", status: "syncing", last_sync: iso(15 * 60_000), data_type: "endpoint telemetry" },
  { id: "i4", name: "Cloudflare", type: "Edge / WAF", status: "error", last_sync: iso(3 * 3600_000), data_type: "http logs" },
];

// ---------------- Timeline ----------------
export const timeline: TimelineStep[] = alerts.flatMap((a, i) => [
  { id: `tl_${a.id}_1`, alert_id: a.id, ts: iso(60 * 60_000 + i * 1000), action: "Initial detection", result: "Rule matched" },
  { id: `tl_${a.id}_2`, alert_id: a.id, ts: iso(45 * 60_000 + i * 1000), action: "Correlation enrichment", result: "3 related logs found" },
  { id: `tl_${a.id}_3`, alert_id: a.id, ts: iso(30 * 60_000 + i * 1000), action: "Threat intel lookup", result: i % 2 ? "Match found" : "No match" },
  { id: `tl_${a.id}_4`, alert_id: a.id, ts: iso(10 * 60_000 + i * 1000), action: "Alert raised", result: a.status },
]);

// ---------------- Time series for dashboard ----------------
export const eventActivity = Array.from({ length: 24 }, (_, h) => {
  const hourAgo = 23 - h;
  const bucket = logs.filter((l) => {
    const diffH = (now - +new Date(l.ts)) / 3600_000;
    return diffH >= hourAgo && diffH < hourAgo + 1;
  });
  return {
    hour: `${String(new Date(now - hourAgo * 3600_000).getHours()).padStart(2, "0")}:00`,
    events: bucket.length,
    alerts: alerts.filter((a) => {
      const diffH = (now - +new Date(a.ts)) / 3600_000;
      return diffH >= hourAgo && diffH < hourAgo + 1;
    }).length,
  };
});
