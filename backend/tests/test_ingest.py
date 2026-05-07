from fastapi.testclient import TestClient

from src.api.main import app


def _client() -> TestClient:
    return TestClient(app)


def test_health():
    with _client() as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


def test_ingest_requires_api_key():
    with _client() as client:
        response = client.post(
            "/api/public/ingest",
            json={
                "timestamp": "2026-05-06T19:20:00Z",
                "ip": "185.220.101.4",
                "user": "alice",
                "event_type": "auth_failure",
                "status": "fail",
                "source": "okta",
            },
        )
        assert response.status_code == 422


def test_ingest_creates_alert():
    with _client() as client:
        response = client.post(
            "/api/public/ingest",
            headers={"x-api-key": "snx_demo_key"},
            json={
                "timestamp": "2026-05-06T19:20:00Z",
                "ip": "185.220.101.4",
                "user": "alice",
                "event_type": "auth_failure",
                "status": "fail",
                "source": "okta",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["event_id"] > 0
        assert body["alert_created"] is True
        assert body["anomaly_score"] is not None
