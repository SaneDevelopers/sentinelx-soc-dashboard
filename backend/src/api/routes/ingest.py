from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from src.config import get_settings
from src.database.connection import get_db
from src.schemas.ingest import IngestEvent, IngestResponse
from src.services.ingest_service import process_event

router = APIRouter(tags=["ingest"])
settings = get_settings()


@router.post("/api/public/ingest", response_model=IngestResponse)
def ingest_event(
    event: IngestEvent,
    x_api_key: str = Header(..., alias="x-api-key"),
    db: Session = Depends(get_db),
) -> IngestResponse:
    if x_api_key != settings.ingest_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    result = process_event(db, event)
    anomaly = result["anomaly"]
    alert = result["alert"]
    log = result["log"]

    return IngestResponse(
        event_id=log.id,
        alert_created=alert is not None,
        alert_id=alert.id if alert is not None else None,
        anomaly_score=anomaly.score,
        severity=anomaly.severity,
    )
