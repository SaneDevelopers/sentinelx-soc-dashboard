from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from src.database.connection import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class LogEvent(Base):
    __tablename__ = "log_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, index=True, nullable=False)
    source_ip = Column(String(64), index=True, nullable=False)
    destination_ip = Column(String(64), nullable=True)
    host = Column(String(255), nullable=True)
    event_type = Column(String(120), index=True, nullable=False)
    severity = Column(String(32), index=True, nullable=True)
    username = Column(String(120), index=True, nullable=True)
    status = Column(String(64), nullable=True)
    source = Column(String(120), nullable=True)
    protocol = Column(String(32), nullable=True)
    port = Column(Integer, nullable=True)
    action = Column(String(64), nullable=True)
    result = Column(String(64), nullable=True)
    bytes_out = Column(Integer, nullable=True)
    raw_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True)
    log_event_id = Column(Integer, ForeignKey("log_events.id"), nullable=False, unique=True)
    source_ip = Column(String(64), index=True, nullable=False)
    window_seconds = Column(Integer, nullable=False, default=300)
    event_count_5m = Column(Integer, nullable=False, default=0)
    failed_login_count_5m = Column(Integer, nullable=False, default=0)
    unique_destination_count_5m = Column(Integer, nullable=False, default=0)
    distinct_event_types_5m = Column(Integer, nullable=False, default=0)
    off_hours_activity = Column(Integer, nullable=False, default=0)
    burst_traffic = Column(Integer, nullable=False, default=0)
    high_risk_event = Column(Integer, nullable=False, default=0)
    metrics = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class AnomalyScore(Base):
    __tablename__ = "anomaly_scores"

    id = Column(Integer, primary_key=True, index=True)
    log_event_id = Column(Integer, ForeignKey("log_events.id"), nullable=False, index=True)
    score = Column(Float, nullable=False, index=True)
    model_name = Column(String(80), nullable=False)
    severity = Column(String(32), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), index=True, nullable=False)
    status = Column(String(32), index=True, nullable=False, default="open")
    source_ip = Column(String(64), index=True, nullable=False)
    event_type = Column(String(120), index=True, nullable=False)
    log_event_id = Column(Integer, ForeignKey("log_events.id"), nullable=True, index=True)
    anomaly_score_id = Column(Integer, ForeignKey("anomaly_scores.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, nullable=False)


class AlertNote(Base):
    __tablename__ = "alert_notes"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False, index=True)
    author = Column(String(120), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(32), primary_key=True)
    hostname = Column(String(255), nullable=False)
    ip = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(String(32), nullable=False)
    risk_level = Column(String(32), nullable=False)
    last_activity = Column(DateTime, nullable=False)
    os = Column(String(120), nullable=False)
    owner = Column(String(120), nullable=False)


class Rule(Base):
    __tablename__ = "rules"

    id = Column(String(32), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    condition = Column(JSON, nullable=False)
    severity = Column(String(32), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"

    id = Column(String(32), primary_key=True)
    indicator = Column(String(255), unique=True, index=True, nullable=False)
    type = Column(String(32), nullable=False)
    risk_level = Column(String(32), nullable=False)
    source = Column(String(120), nullable=False)
    first_seen = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, nullable=False)
    description = Column(Text, nullable=False)
    watchlisted = Column(Boolean, nullable=False, default=False)


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String(32), primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(String(120), nullable=False)
    status = Column(String(32), nullable=False)
    last_sync = Column(DateTime, nullable=False)
    data_type = Column(String(120), nullable=False)
