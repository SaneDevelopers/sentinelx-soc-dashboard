from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import LogEvent
from src.schemas.responses import LogEventRead

router = APIRouter(tags=["logs"])


def _serialize_log(log: LogEvent) -> LogEventRead:
    return LogEventRead(
        id=log.id,
        timestamp=log.timestamp,
        source_ip=log.source_ip,
        destination_ip=log.destination_ip,
        host=log.host,
        event_type=log.event_type,
        severity=log.severity,
        username=log.username,
        status=log.status,
        source=log.source,
        protocol=log.protocol,
        port=log.port,
        action=log.action,
        result=log.result,
        bytes_out=log.bytes_out,
        raw_data=log.raw_data,
    )


@router.get("/api/logs")
def list_logs(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    source_ip: str | None = None,
    event_type: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(LogEvent)
    if source_ip:
        query = query.filter(LogEvent.source_ip == source_ip)
    if event_type:
        query = query.filter(LogEvent.event_type == event_type)
    if severity:
        query = query.filter(LogEvent.severity == severity)

    total = query.count()
    rows = query.order_by(desc(LogEvent.timestamp)).offset(offset).limit(limit).all()
    return {
        "items": [_serialize_log(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/api/logs/{log_id}")
def get_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(LogEvent).filter(LogEvent.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    return _serialize_log(log)
