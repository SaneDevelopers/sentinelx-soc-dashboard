from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import uuid4

from src.database.connection import SessionLocal
from src.schemas.ingest import IngestEvent
from src.services.ingest_service import process_event


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


_lock = Lock()
_tasks: dict[str, dict[str, Any]] = {}


def enqueue_event(event: IngestEvent) -> str:
    task_id = str(uuid4())
    with _lock:
        _tasks[task_id] = {
            "task_id": task_id,
            "status": "queued",
            "created_at": utcnow().isoformat(),
            "updated_at": utcnow().isoformat(),
            "event_id": None,
            "alert_id": None,
            "error": None,
        }
    return task_id


def process_queued_event(task_id: str, event: IngestEvent) -> None:
    with _lock:
        if task_id not in _tasks:
            return
        _tasks[task_id]["status"] = "processing"
        _tasks[task_id]["updated_at"] = utcnow().isoformat()

    try:
        with SessionLocal() as db:
            result = process_event(db, event)
            log = result["log"]
            alert = result["alert"]

        with _lock:
            if task_id in _tasks:
                _tasks[task_id]["status"] = "completed"
                _tasks[task_id]["event_id"] = getattr(log, "id", None)
                _tasks[task_id]["alert_id"] = getattr(alert, "id", None) if alert is not None else None
                _tasks[task_id]["updated_at"] = utcnow().isoformat()
    except Exception as exc:  # pragma: no cover - defensive path
        with _lock:
            if task_id in _tasks:
                _tasks[task_id]["status"] = "failed"
                _tasks[task_id]["error"] = str(exc)
                _tasks[task_id]["updated_at"] = utcnow().isoformat()


def get_task(task_id: str) -> dict[str, Any] | None:
    with _lock:
        task = _tasks.get(task_id)
        return dict(task) if task else None
