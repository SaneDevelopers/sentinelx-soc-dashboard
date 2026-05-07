from __future__ import annotations

from threading import Lock

from src.config import get_settings

_lock = Lock()
_current_ingest_api_key = get_settings().ingest_api_key


def get_ingest_api_key() -> str:
    with _lock:
        return _current_ingest_api_key


def set_ingest_api_key(new_key: str) -> str:
    if not new_key or len(new_key.strip()) < 8:
        raise ValueError("API key must be at least 8 characters")
    with _lock:
        global _current_ingest_api_key
        _current_ingest_api_key = new_key.strip()
        return _current_ingest_api_key
