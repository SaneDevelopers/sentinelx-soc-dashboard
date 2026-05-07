from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import ThreatIndicator
from src.schemas.responses import ThreatIndicatorRead

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
