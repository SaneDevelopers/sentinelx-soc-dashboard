# SentinelX Backend — Status & Completion Plan

## What's already done ✅

**Infrastructure**
- FastAPI app (`src/api/main.py`) with CORS, lifespan that creates tables + seeds reference data.
- SQLAlchemy models: `LogEvent`, `Feature`, `AnomalyScore`, `Alert`, `AlertNote`, `Asset`, `Rule`, `ThreatIndicator`, `Integration`.
- SQLite default DB, env-driven config (`DATABASE_URL`, `INGEST_API_KEY`, `ALERT_SCORE_THRESHOLD`, `CORS_ORIGINS`).
- Seed data for assets (6), rules (8), threats (6), integrations (4).

**Routes implemented**
- `POST /api/public/ingest` (api-key gated) → log + features + anomaly + maybe alert.
- `GET /api/logs` (filter by ip/event_type/severity, paginated).
- `GET/PATCH /api/alerts`, `POST /api/alerts/{id}/notes`.
- `GET /api/anomalies` (min_score, paginated).
- `GET /api/assets`, `GET/POST/PATCH /api/rules`.
- `GET/PATCH /api/threat-intel/{id}/watchlist`.
- `GET/POST/DELETE /api/integrations`.
- `GET /api/stats` (24h KPIs, hourly activity buckets, top sources, ML model status).
- `/health`, `/`.

**Detection**
- Heuristic scorer (auth_failure / port_scan / failed-login bursts / off-hours / etc.).
- Isolation Forest ML model trained, .pkl artifacts present, ensemble (60% heuristic + 40% ML).
- Alert dedup window of 10 min per (source_ip, event_type).

**Tests**
- `tests/test_ingest.py` covers health, missing api-key (422), and alert creation path.

---

## What's missing / needs work ❌

1. **Rule engine doesn't evaluate user-defined rules.** `Rule` rows are stored but `detection_service.score_event` only runs hardcoded heuristics. Toggling/editing rules in the UI has no effect on detections.
2. **Threat-intel is not consulted at ingest time.** Rule `r3` ("matches_threat_intel") is dead.
3. **No auth.** Spec called for Lovable Cloud email/password login; backend has no user model, no JWT/session middleware, no `/me`. Ingest is api-key only — fine — but analyst routes are wide-open.
4. **No Settings endpoints.** Frontend `regenerateApiKey`, profile, threshold, etc. have nothing to call. `src/security.py` exists but isn't wired to any route.
5. **Frontend↔backend bridge broken in preview.** `src/lib/api.ts` hardcodes `http://localhost:8000`; the Lovable preview can't reach it. Need either a deployed backend URL via `VITE_API_URL`, or a proxy/edge-function shim.
6. **`SocProvider` (mock store) is still what the pages render from.** Pages need to be switched to the real `fetch*` calls in `src/lib/api.ts` (with React Query) before the backend matters.
7. **Missing endpoints used by UI / spec**:
   - `GET /api/logs/{id}` (drawer detail).
   - `GET /api/alerts/{id}` + timeline (`TimelineStep` model not implemented).
   - `DELETE /api/rules/{id}`.
   - `GET /api/anomalies/{id}` + promote-to-alert.
   - `POST /api/threat-intel` (manual add) and `DELETE`.
8. **Background tasks**: `services/ingest_queue.py` is implemented but not registered as a route — either expose `POST /api/public/ingest/async` + `GET /api/tasks/{id}` or delete it.
9. **No demo data generator** for logs/alerts (DB starts empty → dashboard is blank until events are POSTed). Needed for a usable first-run.
10. **No CI / lint / typecheck**, only one test file. Detection logic and rule evaluator need unit tests.
11. **Deployment story**: no Dockerfile, no `Procfile`, no Render/Fly/Railway config.

---

## Plan to finish the backend

### Phase 1 — Make the existing backend usable end-to-end (small, high impact)
1. **Add a rule evaluator** `src/services/rule_engine.py`:
   - Loads enabled rules from DB.
   - Supports ops already used in seeds: `eq`, `in`, `gt`, `count_gt` (per source_ip in window), `distinct_count_gt`, `regex`, `hour_between`, `matches_threat_intel`, `new_for_user` (stub).
   - Called from `process_event` after scoring; each match raises an `Alert` linked to the rule, severity = rule severity, dedup as today.
2. **Wire threat-intel match** — query `ThreatIndicator` table by `source_ip` / `host` and bump the anomaly score + reason when matched.
3. **Add demo seed for logs** — a `seed_demo_events.py` script that injects ~500 synthetic LogEvents over the past 24h (so `/api/stats` and dashboard look alive on first run). Auto-run in `lifespan` if `LogEvent` table is empty AND `SEED_DEMO=1`.
4. **Add missing CRUD endpoints**: `GET /api/logs/{id}`, `GET /api/alerts/{id}`, `DELETE /api/rules/{id}`, anomaly → alert promote (`POST /api/anomalies/{id}/promote`), `POST/DELETE /api/threat-intel`.

### Phase 2 — Auth & settings
5. **Auth module** (`src/api/routes/auth.py`):
   - New `User` model (id, email, password_hash, role).
   - `POST /api/auth/signup`, `POST /api/auth/login` → JWT (HS256, secret from env `JWT_SECRET`).
   - `Depends(get_current_user)` guard added to all non-public routes (everything except `/api/public/ingest`, `/health`).
   - First signup becomes `admin`; later signups default to `analyst`.
6. **Settings endpoints** (`src/api/routes/settings.py`):
   - `GET /api/settings` (current api-key prefix, threshold, model status).
   - `POST /api/settings/api-key/rotate` (admin only) → uses `src/security.set_ingest_api_key`.
   - `PATCH /api/settings/threshold`.

### Phase 3 — Frontend wiring (so the work is visible)
7. **Replace `SocProvider` consumers** with React Query hooks calling `src/lib/api.ts`. Keep mock as fallback when `VITE_API_URL` is unset.
8. **Add a thin auth context** in the React app: stores JWT in memory, attaches `Authorization: Bearer …` to every `requestJson`.
9. **Configure `VITE_API_URL`** to point at the deployed backend.

### Phase 4 — Deployment & polish
10. **Dockerfile** + `render.yaml` (or Fly.toml) for one-click deploy of FastAPI.
11. **Tests**: unit tests for rule engine ops, threat-intel match, auth flow, settings rotation.
12. **Optional**: re-expose `ingest_queue` as `/api/public/ingest/async` + `/api/tasks/{task_id}`.

---

## Technical notes

- Keep SQLite for dev; the code already works against any SQLAlchemy URL, so Postgres in prod is a config swap.
- JWT lib: use `pyjwt` (add to `pyproject.toml`); password hashing via `passlib[bcrypt]`.
- Rule engine should run inside the same DB session as ingest so a single commit covers log + features + anomaly + rule alerts.
- For `count_gt` / `distinct_count_gt` windows, reuse the 5-min `recent_logs` query already done in `extract_features` — pass it into the engine to avoid re-querying.
- CORS: change default from `*` to the Lovable preview origin once frontend is wired (credentials need a non-`*` origin if we ever use cookies — JWT in headers is fine with `*`).

## Suggested execution order

1. Phase 1 (rule engine + threat-intel + demo seed + missing endpoints).
2. Phase 3 step 7 (swap a couple of pages to live data) to validate Phase 1.
3. Phase 2 (auth + settings).
4. Phase 3 steps 8–9 (auth context + env).
5. Phase 4 (deploy + tests).

Approve this and I'll start with Phase 1.
