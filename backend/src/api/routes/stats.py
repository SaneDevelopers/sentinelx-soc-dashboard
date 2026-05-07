from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import Alert, AnomalyScore, LogEvent
from src.ml.inference import get_model_status
from src.schemas.responses import StatsResponse

router = APIRouter(tags=["stats"])


@router.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    since_24h = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)

    events_24h = db.query(LogEvent).filter(LogEvent.timestamp >= since_24h).count()
    alerts_total = db.query(Alert).count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["open", "investigating", "escalated"])).count()
    critical_alerts = db.query(Alert).filter(Alert.severity == "critical").count()
    anomalies_24h = db.query(AnomalyScore).filter(AnomalyScore.created_at >= since_24h).count()

    logs = (
        db.query(LogEvent)
        .filter(LogEvent.timestamp >= since_24h)
        .order_by(LogEvent.timestamp.asc())
        .all()
    )
    alerts = (
        db.query(Alert)
        .filter(Alert.created_at >= since_24h)
        .order_by(Alert.created_at.asc())
        .all()
    )

    event_activity = []
    for bucket in range(24):
        start = since_24h + timedelta(hours=bucket)
        end = start + timedelta(hours=1)
        event_count = sum(1 for item in logs if start <= item.timestamp < end)
        alert_count = sum(1 for item in alerts if start <= item.created_at < end)
        event_activity.append({"hour": start.strftime("%H:00"), "events": event_count, "alerts": alert_count})

    source_counts = Counter(item.source_ip for item in logs)
    top_sources = [{"source_ip": source_ip, "count": count} for source_ip, count in source_counts.most_common(5)]
    model_status = get_model_status()

    return StatsResponse(
        events_24h=events_24h,
        alerts_total=alerts_total,
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
        anomalies_24h=anomalies_24h,
        ml_model_online=model_status["online"],
        ml_model_name=model_status["model_name"],
        event_activity=event_activity,
        top_sources=top_sources,
    )
