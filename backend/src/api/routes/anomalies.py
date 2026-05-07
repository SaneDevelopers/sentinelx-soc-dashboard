from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import AnomalyScore
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
