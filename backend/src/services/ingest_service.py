from __future__ import annotations

from sqlalchemy.orm import Session

from src.database.models import LogEvent
from src.schemas.ingest import IngestEvent
from src.services.alert_service import maybe_create_alert
from src.services.detection_service import extract_features, score_event


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
    db.add(anomaly)
    db.flush()

    alert = maybe_create_alert(db, log, anomaly)
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
    }
