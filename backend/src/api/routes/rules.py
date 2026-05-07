from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models import Rule
from src.schemas.responses import RuleRead, RuleWrite

router = APIRouter(tags=["rules"])


def _serialize_rule(rule: Rule) -> RuleRead:
    return RuleRead(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        condition=rule.condition,
        severity=rule.severity,
        enabled=rule.enabled,
        created_by=rule.created_by,
    )


@router.get("/api/rules")
def list_rules(db: Session = Depends(get_db)):
    rows = db.query(Rule).order_by(Rule.created_at.asc()).all()
    return {"items": [_serialize_rule(row) for row in rows], "total": len(rows)}


@router.post("/api/rules")
def upsert_rule(payload: RuleWrite, db: Session = Depends(get_db)):
    rule = db.query(Rule).filter(Rule.id == payload.id).first()
    if rule is None:
        rule = Rule(
            id=payload.id,
            name=payload.name,
            description=payload.description,
            condition=payload.condition,
            severity=payload.severity,
            enabled=payload.enabled,
            created_by=payload.created_by,
        )
        db.add(rule)
    else:
        rule.name = payload.name
        rule.description = payload.description
        rule.condition = payload.condition
        rule.severity = payload.severity
        rule.enabled = payload.enabled
        rule.created_by = payload.created_by
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@router.patch("/api/rules/{rule_id}")
def toggle_rule(rule_id: str, payload: dict[str, bool] | None = None, db: Session = Depends(get_db)):
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    if payload and "enabled" in payload:
        rule.enabled = bool(payload["enabled"])
    else:
        rule.enabled = not rule.enabled
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)
