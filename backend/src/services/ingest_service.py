from __future__ import annotations

from sqlalchemy.orm import Session

from src.database.models import LogEvent
from src.schemas.ingest import IngestEvent
from src.services.alert_service import maybe_create_alert
from src.services.detection_service import extract_features, score_event
from src.services.rule_engine import evaluate_rules, threat_intel_match
from datetime import timedelta


def process_event(db: Session, event: IngestEvent) -> dict[str, object]:
    log = LogEvent(
        timestamp=event.timestamp,
        source_ip=event.source_ip,
        destination_ip=event.destination_ip,
        host=event.host,
        event_type=event.event_type,
        severity=event.severity,
        username=event.user,
        status=event.status,
        source=event.source,
        protocol=event.protocol,
        port=event.port,
        action=event.action,
        result=event.result or event.status,
        bytes_out=event.bytes_out,
        raw_data=event.model_dump(mode="json"),
    )
    db.add(log)
    db.flush()

    feature = extract_features(db, log)
    db.add(feature)
    db.flush()

    anomaly = score_event(log, feature)

    # Threat-intel boost
    ti = threat_intel_match(db, log)
    if ti is not None:
        bump = {"low": 0.15, "medium": 0.25, "high": 0.35, "critical": 0.45}.get(ti.risk_level, 0.2)
        anomaly.score = min(0.99, (anomaly.score or 0) + bump)
        anomaly.reason = (anomaly.reason + "; " if anomaly.reason else "") + f"threat-intel match ({ti.source}:{ti.indicator})"
        # Re-evaluate severity
        if anomaly.score >= 0.9:
            anomaly.severity = "critical"
        elif anomaly.score >= 0.7:
            anomaly.severity = "high"
        elif anomaly.score >= 0.45:
            anomaly.severity = "medium"

    db.add(anomaly)
    db.flush()

    alert = maybe_create_alert(db, log, anomaly)

    # Run user-defined rule engine
    window_start = log.timestamp - timedelta(minutes=10)
    recent_logs = (
        db.query(LogEvent)
        .filter(LogEvent.source_ip == log.source_ip)
        .filter(LogEvent.timestamp >= window_start)
        .all()
    )
    rule_alerts = evaluate_rules(db, log, recent_logs)

    db.commit()
    db.refresh(log)
    db.refresh(feature)
    db.refresh(anomaly)
    if alert is not None:
        db.refresh(alert)

    return {
        "log": log,
        "feature": feature,
        "anomaly": anomaly,
        "alert": alert,
        "rule_alerts": rule_alerts,
    }
