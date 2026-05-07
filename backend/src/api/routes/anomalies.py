from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import Alert, AnomalyScore, LogEvent
from src.schemas.responses import AnomalyRead

router = APIRouter(tags=["anomalies"])


def _serialize_anomaly(item: AnomalyScore) -> AnomalyRead:
    return AnomalyRead(
        id=item.id,
        log_event_id=item.log_event_id,
        score=item.score,
        model_name=item.model_name,
        severity=item.severity,
        reason=item.reason,
        created_at=item.created_at,
    )


@router.get("/api/anomalies")
def list_anomalies(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    min_score: float = Query(default=0.0, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    query = db.query(AnomalyScore).filter(AnomalyScore.score >= min_score)
    total = query.count()
    rows = query.order_by(desc(AnomalyScore.score), desc(AnomalyScore.created_at)).offset(offset).limit(limit).all()
    return {
        "items": [_serialize_anomaly(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/api/anomalies/{anomaly_id}")
def get_anomaly(anomaly_id: int, db: Session = Depends(get_db)):
    anomaly = db.query(AnomalyScore).filter(AnomalyScore.id == anomaly_id).first()
    if anomaly is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found")
    return _serialize_anomaly(anomaly)


@router.post("/api/anomalies/{anomaly_id}/promote")
def promote_anomaly(anomaly_id: int, db: Session = Depends(get_db)):
    anomaly = db.query(AnomalyScore).filter(AnomalyScore.id == anomaly_id).first()
    if anomaly is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found")
    log = db.query(LogEvent).filter(LogEvent.id == anomaly.log_event_id).first()
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source log missing")
    alert = Alert(
        title=f"Promoted anomaly from {log.source_ip}",
        description=f"Manually promoted anomaly score={anomaly.score:.2f}: {anomaly.reason}",
        severity=anomaly.severity,
        status="open",
        source_ip=log.source_ip,
        event_type=log.event_type,
        log_event_id=log.id,
        anomaly_score_id=anomaly.id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"success": True, "alert_id": alert.id}
