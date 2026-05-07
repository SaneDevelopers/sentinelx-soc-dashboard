from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LogEventRead(BaseModel):
    id: int
    timestamp: datetime
    source_ip: str
    destination_ip: str | None
    host: str | None
    event_type: str
    severity: str | None
    username: str | None
    status: str | None
    source: str | None
    protocol: str | None
    port: int | None
    action: str | None
    result: str | None
    bytes_out: int | None
    raw_data: dict[str, Any]


class AlertNoteRead(BaseModel):
    id: int
    author: str
    text: str
    created_at: datetime


class AlertRead(BaseModel):
    id: int
    title: str
    description: str
    severity: str
    status: str
    source_ip: str
    event_type: str
    log_event_id: int | None
    anomaly_score_id: int | None
    created_at: datetime
    updated_at: datetime
    notes: list[AlertNoteRead] = Field(default_factory=list)


class AnomalyRead(BaseModel):
    id: int
    log_event_id: int
    score: float
    model_name: str
    severity: str
    reason: str
    created_at: datetime


class StatsResponse(BaseModel):
    events_24h: int
    alerts_total: int
    active_alerts: int
    critical_alerts: int
    anomalies_24h: int
    ml_model_online: bool = False
    ml_model_name: str = "none"
    event_activity: list[dict[str, Any]]
    top_sources: list[dict[str, Any]]


class AssetRead(BaseModel):
    id: str
    hostname: str
    ip: str
    status: str
    risk_level: str
    last_activity: datetime
    os: str
    owner: str


class RuleRead(BaseModel):
    id: str
    name: str
    description: str
    condition: dict[str, Any]
    severity: str
    enabled: bool
    created_by: str


class RuleWrite(BaseModel):
    id: str
    name: str
    description: str
    condition: dict[str, Any]
    severity: str
    enabled: bool = True
    created_by: str


class ThreatIndicatorRead(BaseModel):
    id: str
    indicator: str
    type: str
    risk_level: str
    source: str
    first_seen: datetime
    last_seen: datetime
    description: str
    watchlisted: bool


class IntegrationRead(BaseModel):
    id: str
    name: str
    type: str
    status: str
    last_sync: datetime
    data_type: str


class IntegrationWrite(BaseModel):
    id: str
    name: str
    type: str
    status: str = "syncing"
    last_sync: datetime
    data_type: str = "events"
