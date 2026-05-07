from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class IngestEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    timestamp: datetime
    source_ip: str = Field(validation_alias=AliasChoices("source_ip", "ip"))
    user: str | None = Field(default=None, validation_alias=AliasChoices("user", "username", "user_name"))
    destination_ip: str | None = Field(default=None, validation_alias=AliasChoices("destination_ip", "dest_ip"))
    host: str | None = None
    event_type: str
    severity: str | None = None
    status: str | None = None
    source: str | None = None
    protocol: str | None = None
    port: int | None = None
    action: str | None = None
    result: str | None = None
    bytes_out: int | None = None
    raw: dict[str, Any] | None = None


class IngestResponse(BaseModel):
    success: bool = True
    event_id: int
    alert_created: bool
    alert_id: int | None = None
    anomaly_score: float | None = None
    severity: str | None = None
