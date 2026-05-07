from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.config import get_settings
from src.database.models import User
from src.ml.inference import get_model_status
from src.security import get_ingest_api_key, set_ingest_api_key
from src.services.auth_service import get_current_user, require_admin

router = APIRouter(tags=["settings"], prefix="/api/settings")

_runtime_threshold = {"value": get_settings().alert_score_threshold}


class ThresholdBody(BaseModel):
    threshold: float = Field(ge=0.0, le=1.0)


@router.get("")
def read_settings(_: User = Depends(get_current_user)):
    key = get_ingest_api_key()
    return {
        "ingest_api_key_preview": f"{key[:6]}…{key[-4:]}" if len(key) > 12 else key,
        "alert_score_threshold": _runtime_threshold["value"],
        "model": get_model_status(),
    }


@router.post("/api-key/rotate")
def rotate_api_key(_: User = Depends(require_admin)):
    new_key = "snx_" + secrets.token_urlsafe(24)
    try:
        set_ingest_api_key(new_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"api_key": new_key}


@router.patch("/threshold")
def update_threshold(body: ThresholdBody, _: User = Depends(require_admin)):
    _runtime_threshold["value"] = body.threshold
    # also patch settings cache so alert_service sees it
    get_settings().alert_score_threshold = body.threshold  # type: ignore[attr-defined]
    return {"alert_score_threshold": body.threshold}