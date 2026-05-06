# SentinelX SOC Dashboard — UI Build (Mock Data Phase)

Build the complete SOC dashboard UI per the spec, wired to in-memory mock data. Auth, Lovable Cloud, ingest API, and real detection engine are deferred to a later phase.

## Scope (this phase)

**In:**
- Dark SOC theme + design tokens
- Sidebar shell with all 10 sections, collapsible, active-route highlighting
- All 10 pages built to mock spec with realistic mock data
- Working filters, drawers, dialogs, switches, charts (client-side only)
- Mock rule engine output (precomputed alerts/anomalies)

**Out (next phase):**
- Lovable Cloud auth + DB + RLS
- Server functions, ingest API, real detection engine
- AI model training (Analytics stays as "offline" placeholder regardless)

## Theme

- Default `<html class="dark">`
- Near-black background, elevated card surfaces, neon cyan primary
- Severity color tokens: `--sev-low` (green), `--sev-med` (amber), `--sev-high` (orange), `--sev-crit` (red)
- All colors as HSL in `index.css`, exposed via `tailwind.config.ts`
- Mono font for IPs/timestamps/JSON

## App Shell

- `SidebarProvider` + `AppSidebar` with sections: Dashboard, Alerts, Logs, Analytics, Anomalies, Threat Intel, Assets, Rules, Integrations, Settings
- Top bar: sidebar trigger, global search, notification bell with alert count, user menu (mock user)
- Routes added in `App.tsx` under a shared `SocLayout`

## Mock Data Layer

`src/mock/` modules generate deterministic data on load:
- `logs.ts` — ~500 logs over last 24h
- `assets.ts` — 6 hosts
- `rules.ts` — 8 default rules with jsonb conditions
- `alerts.ts` — derived from rules+logs
- `anomalies.ts` — scored entries
- `threats.ts` — 12 indicators
- `integrations.ts` — 4 sources
- `timeline.ts` — per-alert attack steps

Exposed via thin hooks (`useLogs`, `useAlerts`, …) returning typed arrays + simple in-memory mutators (resolve alert, toggle rule, add note) so UI feels live.

## Pages

1. **Dashboard** — 4 KPI cards (system status, 24h events, active alerts, model="offline"), Recharts area chart of event activity, Top Anomalies table, Recent Alerts table, Key Insights tiles
2. **Alerts** — table + right-side drawer (details, attack timeline, related logs, Resolve/Escalate/Add Note)
3. **Logs** — filter bar (search, time range, event type, severity), dense table, expandable row with parsed fields + raw JSON
4. **Analytics** — Isolation Forest & Autoencoder cards in "Model offline — training disabled" state; sliders disabled with tooltip
5. **Anomalies** — list + detail drawer (score breakdown, related logs, Mark Reviewed / Convert to Alert)
6. **Threat Intelligence** — indicators table + detail panel + Add to Watchlist
7. **Assets** — asset cards/table + drawer (open alerts, recent logs, exposure level)
8. **Rules** — list with enable/disable switches, edit dialog with JSON condition editor + severity, "Test against last 1h" button (mock result)
9. **Integrations** — connected sources table, Add/Remove dialogs (mock)
10. **Settings** — preferences (time format, theme toggle), system section with mock API key + Regenerate

## Technical Notes

- Recharts for charts; shadcn Table (no virtualization yet at 500 rows)
- shadcn Sheet for drawers, Dialog for edit modals, Switch for toggles
- Zod schemas defined now for rule conditions + log shape so backend phase reuses them
- Routing via existing `react-router-dom` setup
- Type definitions in `src/types/soc.ts`

## Out of Scope Reminders

- No Supabase calls, no auth gating — all routes open
- No real ingest endpoint
- Detection engine logic stubbed; "Test rule" returns mock matches

## Next Phase (after approval of this UI)

Enable Lovable Cloud → schema + RLS + seed → auth + `_authenticated` layout → server functions + real detection engine + `/api/public/ingest` → swap mock hooks for real queries.
