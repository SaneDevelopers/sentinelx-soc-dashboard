from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes.alerts import router as alerts_router
from src.api.routes.assets import router as assets_router
from src.api.routes.anomalies import router as anomalies_router
from src.api.routes.auth import router as auth_router
from src.api.routes.integrations import router as integrations_router
from src.api.routes.ingest import router as ingest_router
from src.api.routes.logs import router as logs_router
from src.api.routes.rules import router as rules_router
from src.api.routes.settings import router as settings_router
from src.api.routes.stats import router as stats_router
from src.api.routes.threats import router as threats_router
from src.config import get_settings
from src.database.connection import Base, engine
from src.database import models  # noqa: F401  # ensure models are registered
from src.database.connection import SessionLocal
from src.database.seed import seed_reference_data
from src.database.seed_demo import seed_demo_events
import os

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_reference_data(db)
        if os.getenv("SEED_DEMO", "1") == "1":
            seed_demo_events(db)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins if settings.allowed_origins != ["*"] else ["*"],
    allow_credentials=settings.allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(logs_router)
app.include_router(alerts_router)
app.include_router(assets_router)
app.include_router(anomalies_router)
app.include_router(integrations_router)
app.include_router(stats_router)
app.include_router(rules_router)
app.include_router(threats_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "SentinelX API", "status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/stats")
def legacy_stats() -> dict[str, str]:
    return {"message": "Use /api/stats for structured dashboard stats"}
