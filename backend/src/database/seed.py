from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from src.database.models import Asset, Integration, Rule, ThreatIndicator


ASSET_SEED = [
    {"id": "a1", "hostname": "web-prod-01", "ip": "10.0.1.21", "status": "online", "risk_level": "high", "last_activity": -2 * 60, "os": "Ubuntu 22.04", "owner": "Platform"},
    {"id": "a2", "hostname": "db-primary", "ip": "10.0.2.10", "status": "online", "risk_level": "critical", "last_activity": -1 * 60, "os": "Debian 12", "owner": "Data"},
    {"id": "a3", "hostname": "auth-service", "ip": "10.0.1.45", "status": "degraded", "risk_level": "high", "last_activity": -8 * 60, "os": "Alpine 3.19", "owner": "Identity"},
    {"id": "a4", "hostname": "edge-gw-eu", "ip": "10.0.0.4", "status": "online", "risk_level": "medium", "last_activity": -30, "os": "VyOS", "owner": "Network"},
    {"id": "a5", "hostname": "ci-runner-3", "ip": "10.0.3.18", "status": "offline", "risk_level": "low", "last_activity": -3 * 3600, "os": "Ubuntu 22.04", "owner": "DevTools"},
    {"id": "a6", "hostname": "office-vpn", "ip": "10.0.0.9", "status": "online", "risk_level": "medium", "last_activity": -45, "os": "pfSense", "owner": "IT"},
]

RULE_SEED = [
    {"id": "r1", "name": "Brute force authentication", "description": ">5 auth_failure from same source IP in 60s", "severity": "high", "enabled": True, "created_by": "system", "condition": {"all": [{"field": "event_type", "op": "eq", "value": "auth_failure"}, {"field": "source_ip", "op": "count_gt", "value": 5, "window_sec": 60}]}},
    {"id": "r2", "name": "Port scan detected", "description": ">20 distinct ports from same IP in 120s", "severity": "high", "enabled": True, "created_by": "system", "condition": {"all": [{"field": "port", "op": "distinct_count_gt", "value": 20, "window_sec": 120}]}},
    {"id": "r3", "name": "Threat intel match", "description": "source_ip matches known indicator", "severity": "critical", "enabled": True, "created_by": "system", "condition": {"all": [{"field": "source_ip", "op": "matches_threat_intel", "value": True}]}},
    {"id": "r4", "name": "Privileged action off-hours", "description": "admin action between 00:00–05:00", "severity": "medium", "enabled": True, "created_by": "alice", "condition": {"all": [{"field": "user_name", "op": "eq", "value": "root"}, {"field": "ts", "op": "hour_between", "value": [0, 5]}]}},
    {"id": "r5", "name": "Suspicious protocol egress", "description": "telnet/smb to external IP", "severity": "high", "enabled": True, "created_by": "system", "condition": {"all": [{"field": "protocol", "op": "in", "value": ["telnet", "smb"]}]}},
    {"id": "r6", "name": "Large data transfer", "description": "bytes_out > 50MB in single event", "severity": "high", "enabled": True, "created_by": "bob", "condition": {"all": [{"field": "bytes_out", "op": "gt", "value": 50_000_000}]}},
    {"id": "r7", "name": "New geo for user", "description": "login from new country", "severity": "medium", "enabled": False, "created_by": "system", "condition": {"all": [{"field": "event_type", "op": "eq", "value": "auth_success"}, {"field": "geo", "op": "new_for_user", "value": True}]}},
    {"id": "r8", "name": "Repeated 5xx errors", "description": ">10 server errors / minute from one host", "severity": "low", "enabled": True, "created_by": "system", "condition": {"all": [{"field": "status_code", "op": "regex", "value": "^5\\d\\d$"}, {"field": "source_ip", "op": "count_gt", "value": 10, "window_sec": 60}]}},
]

THREAT_SEED = [
    {"id": "t1", "indicator": "185.220.101.4", "type": "ip", "risk_level": "high", "source": "AbuseIPDB", "first_seen_days": 7, "last_seen_hours": 1, "description": "Tor exit node, repeated brute-force activity.", "watchlisted": False},
    {"id": "t2", "indicator": "45.155.205.211", "type": "ip", "risk_level": "critical", "source": "Spamhaus", "first_seen_days": 20, "last_seen_hours": 2, "description": "Linked to APT-style scanning campaigns.", "watchlisted": False},
    {"id": "t3", "indicator": "evil-payload.xyz", "type": "domain", "risk_level": "high", "source": "OpenPhish", "first_seen_days": 3, "last_seen_hours": 4, "description": "Phishing kit hosting infrastructure.", "watchlisted": False},
    {"id": "t4", "indicator": "d41d8cd98f00b204e9800998ecf8427e", "type": "hash", "risk_level": "medium", "source": "VirusTotal", "first_seen_days": 45, "last_seen_hours": 24, "description": "Known dropper family.", "watchlisted": False},
    {"id": "t5", "indicator": "103.231.78.7", "type": "ip", "risk_level": "medium", "source": "AlienVault OTX", "first_seen_days": 2, "last_seen_hours": 20, "description": "Botnet C2 candidate.", "watchlisted": False},
    {"id": "t6", "indicator": "malicious.example.com", "type": "domain", "risk_level": "high", "source": "Internal", "first_seen_days": 1, "last_seen_hours": 1, "description": "Observed in lateral movement attempts.", "watchlisted": False},
]

INTEGRATION_SEED = [
    {"id": "i1", "name": "AWS CloudTrail", "type": "Cloud Audit", "status": "connected", "last_sync_minutes": 1, "data_type": "audit logs"},
    {"id": "i2", "name": "Okta", "type": "Identity", "status": "connected", "last_sync_minutes": 2, "data_type": "auth events"},
    {"id": "i3", "name": "CrowdStrike", "type": "EDR", "status": "syncing", "last_sync_minutes": 15, "data_type": "endpoint telemetry"},
    {"id": "i4", "name": "Cloudflare", "type": "Edge / WAF", "status": "error", "last_sync_minutes": 180, "data_type": "http logs"},
]


def seed_reference_data(db: Session) -> None:
    if db.query(Asset).count() == 0:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for item in ASSET_SEED:
            db.add(
                Asset(
                    id=item["id"],
                    hostname=item["hostname"],
                    ip=item["ip"],
                    status=item["status"],
                    risk_level=item["risk_level"],
                    last_activity=now + timedelta(seconds=item["last_activity"]),
                    os=item["os"],
                    owner=item["owner"],
                )
            )

    if db.query(Rule).count() == 0:
        for item in RULE_SEED:
            db.add(
                Rule(
                    id=item["id"],
                    name=item["name"],
                    description=item["description"],
                    condition=item["condition"],
                    severity=item["severity"],
                    enabled=item["enabled"],
                    created_by=item["created_by"],
                )
            )

    if db.query(ThreatIndicator).count() == 0:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for item in THREAT_SEED:
            db.add(
                ThreatIndicator(
                    id=item["id"],
                    indicator=item["indicator"],
                    type=item["type"],
                    risk_level=item["risk_level"],
                    source=item["source"],
                    first_seen=now - timedelta(days=item["first_seen_days"]),
                    last_seen=now - timedelta(hours=item["last_seen_hours"]),
                    description=item["description"],
                    watchlisted=item["watchlisted"],
                )
            )

    if db.query(Integration).count() == 0:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for item in INTEGRATION_SEED:
            db.add(
                Integration(
                    id=item["id"],
                    name=item["name"],
                    type=item["type"],
                    status=item["status"],
                    last_sync=now - timedelta(minutes=item["last_sync_minutes"]),
                    data_type=item["data_type"],
                )
            )

    db.commit()
