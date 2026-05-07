from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from src.database.models import LogEvent
from src.schemas.ingest import IngestEvent
from src.services.ingest_service import process_event

EVENT_TYPES = [
    ("auth_success", "low"),
    ("auth_success", "low"),
    ("auth_success", "low"),
    ("auth_failure", "medium"),
    ("auth_failure", "high"),
    ("port_scan", "high"),
    ("firewall_block", "high"),
    ("dns_query", "low"),
    ("http_request", "low"),
    ("file_access", "medium"),
]

SOURCE_IPS = [
    "10.0.1.21", "10.0.2.10", "10.0.1.45", "10.0.0.4",
    "192.168.1.50", "192.168.1.77",
    "185.220.101.4",  # threat-intel match
    "45.155.205.211", # threat-intel match
    "203.0.113.5", "198.51.100.22",
]
DEST_IPS = ["10.0.2.10", "10.0.1.21", "8.8.8.8", "1.1.1.1", "172.16.0.5"]
USERS = ["alice", "bob", "carol", "root", "svc-deploy", "guest"]
PROTOCOLS = ["tcp", "udp", "http", "https", "ssh"]
SOURCES = ["okta", "cloudtrail", "crowdstrike", "cloudflare", "syslog"]


def seed_demo_events(db: Session, count: int = 400) -> int:
    if db.query(LogEvent).count() > 0:
        return 0

    rng = random.Random(42)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    created = 0

    for i in range(count):
        offset_minutes = rng.randint(0, 24 * 60)
        ts = now - timedelta(minutes=offset_minutes)
        evt_type, sev = rng.choice(EVENT_TYPES)
        src = rng.choice(SOURCE_IPS)
        port = rng.choice([22, 80, 443, 3389, 8080, 25, 53, rng.randint(1024, 65535)])

        event = IngestEvent(
            timestamp=ts,
            source_ip=src,
            destination_ip=rng.choice(DEST_IPS),
            host=f"host-{rng.randint(1, 30)}",
            event_type=evt_type,
            severity=sev,
            user=rng.choice(USERS),
            status="fail" if evt_type == "auth_failure" else "ok",
            source=rng.choice(SOURCES),
            protocol=rng.choice(PROTOCOLS),
            port=port,
            action="block" if evt_type == "firewall_block" else "allow",
            result="failure" if evt_type == "auth_failure" else "success",
            bytes_out=rng.randint(100, 5_000_000),
            raw=None,
        )
        try:
            process_event(db, event)
            created += 1
        except Exception:
            db.rollback()
    return created