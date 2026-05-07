from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

from sqlalchemy.orm import Session

from src.database.models import Alert, LogEvent, Rule, ThreatIndicator


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _field_value(log: LogEvent, field: str) -> Any:
    mapping = {
        "event_type": log.event_type,
        "source_ip": log.source_ip,
        "destination_ip": log.destination_ip,
        "host": log.host,
        "username": log.username,
        "user_name": log.username,
        "status": log.status,
        "status_code": (log.raw_data or {}).get("status_code") if isinstance(log.raw_data, dict) else None,
        "protocol": log.protocol,
        "port": log.port,
        "action": log.action,
        "result": log.result,
        "bytes_out": log.bytes_out or 0,
        "severity": log.severity,
        "ts": log.timestamp,
    }
    if field in mapping:
        return mapping[field]
    if isinstance(log.raw_data, dict):
        return log.raw_data.get(field)
    return None


def _check_clause(
    db: Session,
    log: LogEvent,
    recent_logs: list[LogEvent],
    clause: dict[str, Any],
) -> bool:
    field = clause.get("field")
    op = clause.get("op")
    value = clause.get("value")
    window = clause.get("window_sec")

    if op == "matches_threat_intel":
        target = _field_value(log, field) if field else log.source_ip
        if not target:
            return False
        match = (
            db.query(ThreatIndicator)
            .filter(ThreatIndicator.indicator == str(target))
            .first()
        )
        return (match is not None) == bool(value)

    fv = _field_value(log, field)

    if op == "eq":
        return fv == value
    if op == "neq":
        return fv != value
    if op == "in":
        return fv in (value or [])
    if op == "gt":
        try:
            return float(fv) > float(value)
        except (TypeError, ValueError):
            return False
    if op == "lt":
        try:
            return float(fv) < float(value)
        except (TypeError, ValueError):
            return False
    if op == "regex":
        if fv is None:
            return False
        try:
            return bool(re.search(str(value), str(fv)))
        except re.error:
            return False
    if op == "hour_between":
        if not isinstance(value, (list, tuple)) or len(value) != 2:
            return False
        hour = log.timestamp.hour
        return value[0] <= hour <= value[1]
    if op == "count_gt":
        scope = recent_logs
        if window:
            cutoff = log.timestamp - timedelta(seconds=window)
            scope = [r for r in recent_logs if r.timestamp >= cutoff]
        return len(scope) > int(value)
    if op == "distinct_count_gt":
        scope = recent_logs
        if window:
            cutoff = log.timestamp - timedelta(seconds=window)
            scope = [r for r in recent_logs if r.timestamp >= cutoff]
        distinct = {_field_value(r, field) for r in scope if _field_value(r, field) is not None}
        return len(distinct) > int(value)
    if op == "new_for_user":
        return False  # stub — would require historical baseline per user

    return False


def _evaluate_rule(
    db: Session,
    log: LogEvent,
    recent_logs: list[LogEvent],
    rule: Rule,
) -> bool:
    cond = rule.condition or {}
    all_clauses: Iterable[dict[str, Any]] = cond.get("all") or []
    any_clauses: Iterable[dict[str, Any]] = cond.get("any") or []

    if all_clauses and not all(_check_clause(db, log, recent_logs, c) for c in all_clauses):
        return False
    if any_clauses and not any(_check_clause(db, log, recent_logs, c) for c in any_clauses):
        return False
    if not all_clauses and not any_clauses:
        return False
    return True


def evaluate_rules(
    db: Session,
    log: LogEvent,
    recent_logs: list[LogEvent],
) -> list[Alert]:
    """Run enabled rules against the new log event; return any new alerts created."""
    rules = db.query(Rule).filter(Rule.enabled.is_(True)).all()
    created: list[Alert] = []
    for rule in rules:
        try:
            if not _evaluate_rule(db, log, recent_logs, rule):
                continue
        except Exception:
            continue

        # Dedup: same rule + source_ip in last 10 minutes
        dup = (
            db.query(Alert)
            .filter(Alert.source_ip == log.source_ip)
            .filter(Alert.event_type == log.event_type)
            .filter(Alert.title.like(f"[{rule.id}]%"))
            .filter(Alert.created_at >= log.timestamp - timedelta(minutes=10))
            .first()
        )
        if dup:
            continue

        alert = Alert(
            title=f"[{rule.id}] {rule.name} — {log.source_ip}",
            description=f"Rule '{rule.name}' matched on {log.event_type}: {rule.description}",
            severity=rule.severity,
            status="open",
            source_ip=log.source_ip,
            event_type=log.event_type,
            log_event_id=log.id,
        )
        db.add(alert)
        db.flush()
        created.append(alert)
    return created


def threat_intel_match(db: Session, log: LogEvent) -> ThreatIndicator | None:
    candidates = [log.source_ip, log.destination_ip, log.host]
    candidates = [c for c in candidates if c]
    if not candidates:
        return None
    return (
        db.query(ThreatIndicator)
        .filter(ThreatIndicator.indicator.in_(candidates))
        .first()
    )