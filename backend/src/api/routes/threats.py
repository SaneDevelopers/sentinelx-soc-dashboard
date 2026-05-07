from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import ThreatIndicator
from src.schemas.responses import ThreatIndicatorRead, ThreatIndicatorWrite

router = APIRouter(tags=["threat-intel"])


def _serialize_threat(threat: ThreatIndicator) -> ThreatIndicatorRead:
    return ThreatIndicatorRead(
        id=threat.id,
        indicator=threat.indicator,
        type=threat.type,
        risk_level=threat.risk_level,
        source=threat.source,
        first_seen=threat.first_seen,
        last_seen=threat.last_seen,
        description=threat.description,
        watchlisted=threat.watchlisted,
    )


@router.get("/api/threat-intel")
def list_threats(db: Session = Depends(get_db)):
    rows = db.query(ThreatIndicator).order_by(ThreatIndicator.last_seen.desc()).all()
    return {"items": [_serialize_threat(row) for row in rows], "total": len(rows)}


@router.patch("/api/threat-intel/{threat_id}/watchlist")
def toggle_watchlist(threat_id: str, db: Session = Depends(get_db)):
    threat = db.query(ThreatIndicator).filter(ThreatIndicator.id == threat_id).first()
    if threat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Threat indicator not found")

    threat.watchlisted = not threat.watchlisted
    db.commit()
    db.refresh(threat)
    return _serialize_threat(threat)


@router.post("/api/threat-intel")
def add_threat(payload: ThreatIndicatorWrite, db: Session = Depends(get_db)):
    existing = db.query(ThreatIndicator).filter(ThreatIndicator.id == payload.id).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if existing is None:
        ti = ThreatIndicator(
            id=payload.id,
            indicator=payload.indicator,
            type=payload.type,
            risk_level=payload.risk_level,
            source=payload.source,
            first_seen=payload.first_seen or now,
            last_seen=payload.last_seen or now,
            description=payload.description,
            watchlisted=payload.watchlisted,
        )
        db.add(ti)
    else:
        ti = existing
        ti.indicator = payload.indicator
        ti.type = payload.type
        ti.risk_level = payload.risk_level
        ti.source = payload.source
        ti.last_seen = payload.last_seen or now
        ti.description = payload.description
        ti.watchlisted = payload.watchlisted
    db.commit()
    db.refresh(ti)
    return _serialize_threat(ti)


@router.delete("/api/threat-intel/{threat_id}")
def delete_threat(threat_id: str, db: Session = Depends(get_db)):
    threat = db.query(ThreatIndicator).filter(ThreatIndicator.id == threat_id).first()
    if threat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Threat indicator not found")
    db.delete(threat)
    db.commit()
    return {"success": True, "id": threat_id}
