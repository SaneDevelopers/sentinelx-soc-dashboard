from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import asc
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import Asset
from src.schemas.responses import AssetRead

router = APIRouter(tags=["assets"])


def _serialize_asset(asset: Asset) -> AssetRead:
    return AssetRead(
        id=asset.id,
        hostname=asset.hostname,
        ip=asset.ip,
        status=asset.status,
        risk_level=asset.risk_level,
        last_activity=asset.last_activity,
        os=asset.os,
        owner=asset.owner,
    )


@router.get("/api/assets")
def list_assets(db: Session = Depends(get_db)):
    rows = db.query(Asset).order_by(asc(Asset.hostname)).all()
    return {"items": [_serialize_asset(row) for row in rows], "total": len(rows)}
