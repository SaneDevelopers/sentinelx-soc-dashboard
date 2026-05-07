from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import Integration
from src.schemas.responses import IntegrationRead, IntegrationWrite

router = APIRouter(tags=["integrations"])


def _serialize_integration(integration: Integration) -> IntegrationRead:
    return IntegrationRead(
        id=integration.id,
        name=integration.name,
        type=integration.type,
        status=integration.status,
        last_sync=integration.last_sync,
        data_type=integration.data_type,
    )


@router.get("/api/integrations")
def list_integrations(db: Session = Depends(get_db)):
    rows = db.query(Integration).order_by(Integration.last_sync.desc()).all()
    return {"items": [_serialize_integration(row) for row in rows], "total": len(rows)}


@router.post("/api/integrations")
def add_integration(payload: IntegrationWrite, db: Session = Depends(get_db)):
    integration = db.query(Integration).filter(Integration.id == payload.id).first()
    if integration is None:
        integration = Integration(
            id=payload.id,
            name=payload.name,
            type=payload.type,
            status=payload.status,
            last_sync=payload.last_sync,
            data_type=payload.data_type,
        )
        db.add(integration)
    else:
        integration.name = payload.name
        integration.type = payload.type
        integration.status = payload.status
        integration.last_sync = payload.last_sync
        integration.data_type = payload.data_type
    db.commit()
    db.refresh(integration)
    return _serialize_integration(integration)


@router.delete("/api/integrations/{integration_id}")
def remove_integration(integration_id: str, db: Session = Depends(get_db)):
    integration = db.query(Integration).filter(Integration.id == integration_id).first()
    if integration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
    db.delete(integration)
    db.commit()
    return {"success": True, "id": integration_id}
