from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import Alert, AlertNote
from src.schemas.responses import AlertNoteRead, AlertRead

router = APIRouter(tags=["alerts"])


def _serialize_note(note: AlertNote) -> AlertNoteRead:
    return AlertNoteRead(
        id=note.id,
        author=note.author,
        text=note.text,
        created_at=note.created_at,
    )


def _serialize_alert(alert: Alert) -> AlertRead:
    notes = getattr(alert, "notes", [])
    return AlertRead(
        id=alert.id,
        title=alert.title,
        description=alert.description,
        severity=alert.severity,
        status=alert.status,
        source_ip=alert.source_ip,
        event_type=alert.event_type,
        log_event_id=alert.log_event_id,
        anomaly_score_id=alert.anomaly_score_id,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
        notes=[_serialize_note(note) for note in notes],
    )


@router.get("/api/alerts")
def list_alerts(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    status_filter: str | None = Query(default=None, alias="status"),
    severity: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.status == status_filter)
    if severity:
        query = query.filter(Alert.severity == severity)

    total = query.count()
    rows = query.order_by(desc(Alert.created_at)).offset(offset).limit(limit).all()
    for alert in rows:
        alert.notes = (
            db.query(AlertNote)
            .filter(AlertNote.alert_id == alert.id)
            .order_by(desc(AlertNote.created_at))
            .all()
        )
    return {
        "items": [_serialize_alert(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.patch("/api/alerts/{alert_id}")
def update_alert_status(alert_id: int, payload: dict[str, str], db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    status_value = payload.get("status")
    if not status_value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status is required")

    alert.status = status_value
    alert.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(alert)
    return _serialize_alert(alert)


@router.post("/api/alerts/{alert_id}/notes")
def add_alert_note(alert_id: int, payload: dict[str, str], db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    text = payload.get("text", "").strip()
    author = payload.get("author", "analyst").strip() or "analyst"
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="text is required")

    note = AlertNote(alert_id=alert.id, author=author, text=text)
    db.add(note)
    db.commit()
    db.refresh(note)
    return _serialize_note(note)
