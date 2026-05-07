from __future__ import annotations

from datetime import timedelta

from sqlalchemy.orm import Session

from src.config import get_settings
from src.database.models import Alert, AnomalyScore, LogEvent

settings = get_settings()


def maybe_create_alert(db: Session, log: LogEvent, anomaly: AnomalyScore) -> Alert | None:
    should_raise = anomaly.score >= settings.alert_score_threshold or log.event_type in {"auth_failure", "port_scan", "firewall_block"}
    if not should_raise:
        return None

    duplicate = (
        db.query(Alert)
        .filter(Alert.source_ip == log.source_ip)
        .filter(Alert.event_type == log.event_type)
        .filter(Alert.created_at >= log.timestamp - timedelta(minutes=10))
        .first()
    )
    if duplicate:
        return duplicate

    alert = Alert(
        title=_build_title(log),
        description=_build_description(log, anomaly),
        severity=anomaly.severity,
        status="open",
        source_ip=log.source_ip,
        event_type=log.event_type,
        log_event_id=log.id,
        anomaly_score_id=anomaly.id,
    )
    db.add(alert)
    db.flush()
    return alert


def _build_title(log: LogEvent) -> str:
    if log.event_type == "auth_failure":
        return f"Authentication failure from {log.source_ip}"
    if log.event_type == "port_scan":
        return f"Port scan detected from {log.source_ip}"
    if log.event_type == "firewall_block":
        return f"Firewall block from {log.source_ip}"
    return f"Suspicious {log.event_type} from {log.source_ip}"


def _build_description(log: LogEvent, anomaly: AnomalyScore) -> str:
    return f"{log.event_type} scored {anomaly.score:.2f} by {anomaly.model_name}: {anomaly.reason}."
