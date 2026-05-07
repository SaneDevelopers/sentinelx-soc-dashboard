# SentinelX Backend

FastAPI backend for the SentinelX SOC dashboard.

## Run locally

```bash
cd backend
python3 -m pip install -e .
python3 -m pip install -e .[dev]
uvicorn src.api.main:app --reload
```

## Environment variables

- `DATABASE_URL` - defaults to `sqlite:///./sentinelx.db`
- `INGEST_API_KEY` - defaults to `snx_demo_key`
- `ALERT_SCORE_THRESHOLD` - defaults to `0.7`
- `CORS_ORIGINS` - defaults to `*`
