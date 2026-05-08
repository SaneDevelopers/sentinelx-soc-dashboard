# SentinelX Backend

FastAPI backend for the SentinelX SOC dashboard.

## Installation

### Using pip with requirements files

```bash
cd backend

# Install all dependencies (recommended)
pip install -r requirements.txt

# Or install specific dependency sets:
pip install -r requirements-core.txt    # Core API without ML
pip install -r requirements-ml.txt      # ML dependencies only
pip install -r requirements-dev.txt     # Development tools
```

### Using pip with pyproject.toml (alternative)

```bash
cd backend
python3 -m pip install -e .          # Core dependencies
python3 -m pip install -e .[dev]     # + development dependencies
```

## Run locally

```bash
cd backend
uvicorn src.api.main:app --reload
```

## Environment variables

- `DATABASE_URL` - defaults to `sqlite:///./sentinelx.db`
- `INGEST_API_KEY` - defaults to `snx_demo_key`
- `ALERT_SCORE_THRESHOLD` - defaults to `0.7`
- `CORS_ORIGINS` - defaults to `*`
