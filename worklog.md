# ColdOps — Worklog

## Project: ColdOps — Cold Chain Energy Intelligence for F&B Manufacturing

### Stack decisions (locked)
- Next.js 16 App Router + TypeScript + Tailwind 4 + shadcn/ui (New York)
- Prisma + SQLite (custom.db at /home/z/my-project/db/custom.db)
- Socket.io mini-service on port 3003 (real-time)
- BMS Simulator mini-service on port 3004 (mimics Siemens Desigo REST)
- Light theme, emerald accent, NO indigo/blue
- No camera/Python pipeline — WMS is primary stock detection
- Deterministic rules only (no ML)
- Greedy consolidation planner (no VRP)
- Marigold-branded sample data, RM0.509/kWh TNB tariff
- No login; role switcher if needed
- Single / route with client-side view switching (Command Center / Cold Room Map / Work Orders / Notifications)

### Priority order
1. Dashboard + Ghost Load Detection
2. Cold Room Map + Utilization Optimizer
3. Work Orders + Progressive Setback
4. Command Center / KPI view (investor wow)
5. (Camera dropped)

### Pages (all on `/`)
- **Command Center** (default home view): KPI cards, live savings counter, ghost load heatmap, CO2, worst offender
- **Cold Room Map**: factory floor plan, color-coded rooms, utilization %, consolidation arrows
- **Work Orders**: consolidation tasks, pallet moves, confirm-complete, live setback ramp chart
- **Notifications**: severity-sorted alerts, approve/defer/dismiss, channel badges

### Severity scoring formula
`severity_score = (rmWaste * 0.5) + (durationHours * 10) + (safetyRiskBonus) + (roomCriticalityBonus)`
Buckets: Critical (>=80), High (50-79), Medium (25-49), Low (<25)

### Progressive setback ramp
T+0/4s/8s/12s (compressed from 0/15/30/45min for demo) — actual HTTP POST to BMS sim with readback.
Safety: abort+revert if temp out of safe range.

---
Task ID: 0
Agent: orchestrator
Task: Set up project foundation, schema plan, worklog.

Work Log:
- Surveyed existing project (Next.js 16, Prisma+SQLite, shadcn/ui installed, dev server running on :3000)
- Read websocket example for socket.io mini-service pattern
- Created this worklog with locked decisions
- Dispatched subagent for BMS Simulator + Socket.io mini-services (Task 1-b/1-c combined)
- Will build Prisma schema + seed data + engine + API + UI next

Stage Summary:
- Foundation decisions locked
- Mini-services subagent dispatched in parallel
- Next: Prisma schema + seed, then engine, then API, then UI

---
Task ID: 1-b/1-c
Agent: full-stack-developer (mini-services)
Task: Built the BMS Simulator (port 3004) and Socket.io Realtime Hub (port 3003) mini-services for ColdOps, seeded 8 cold rooms matching the Marigold factory, wired up REST + socket.io pub/sub contracts, started both in background detached.

Work Log:
- Read worklog.md for locked decisions (Marigold seed data, BMS sim on :3004, realtime hub on :3003, RM0.509/kWh tariff).
- Read examples/websocket/server.ts for the socket.io attach pattern + Caddy gateway rules.
- Inspected Caddyfile — confirms ?XTransformPort query-param routing.
- Created /home/z/my-project/mini-services/bms-simulator/ as independent bun project:
  - package.json with `"dev": "bun --hot index.ts"`, deps: express, cors; devDeps: @types/express, @types/cors, @types/node, typescript.
  - tsconfig.json (bun-types, ESNext, strict).
  - index.ts implementing all 8 endpoints + 1s background sim loop with temp drift (0.05°C/s normal, 0.15°C/s door-open), compressor load model `clamp(0.15 + |Δtemp|*0.4, 0.15, 1.0)`, power = load*maxKW, safety fault transition when temp leaves [safeMin, safeMax].
  - Seeded CR-01..CR-08 exactly per spec (4 chilled, 2 blast freezers, 1 dairy WIP, 1 raw milk, 1 juice) with per-room maxKW and safe ranges.
  - setpoint write persists `requestId → setpoint` map; confirm endpoint returns `confirmed:true` iff current setpoint matches the recorded write.
  - Logs 1-room snapshot every 5s.
- Created /home/z/my-project/mini-services/realtime-hub/ as independent bun project:
  - package.json with `"dev": "bun --hot index.ts"`, deps: express, cors, socket.io; devDeps: @types/*, typescript.
  - index.ts: Express REST `POST /broadcast { event, payload }` + `GET /health`, attached socket.io server with 11 whitelisted ColdOps events (ghost-load-detected, ghost-load-resolved, savings-updated, setback-progress, setback-completed, setback-aborted, work-order-updated, work-order-completed, notification-new, notification-updated, room-status-changed).
  - On connect: emits `hello`, logs `client connected: <id>, total: <n>`. On disconnect: logs. 30s heartbeat `ping`.
  - **Important deviation from spec (documented inline)**: socket.io path is `/socket.io` (default), NOT `/`. The websocket example uses path `/`, but that pattern only works for pure-socket.io processes. With path `/`, Engine.IO's attach middleware intercepts EVERY HTTP request (because every URL starts with `/`), which would block the `/broadcast` and `/health` REST routes on the same port. Caddy still routes correctly because it only inspects the `XTransformPort` query param, not the URL path. Browser client should call `io({ path: '/socket.io', query: { XTransformPort: 3003 } })`.
- Installed deps in both projects via `bun install`.
- Started both services detached (subshell + setsid + nohup + `< /dev/null > log 2>&1 &`) so they re-parent to PID 1 (tini) and survive bash session changes. Logs at /home/z/my-project/mini-services/logs/{bms,hub}.log.
- Ran full verification suite (14 tests) — all pass.

Stage Summary:
- Artifacts produced:
  - /home/z/my-project/mini-services/bms-simulator/{package.json, tsconfig.json, index.ts}
  - /home/z/my-project/realtime-hub/{package.json, tsconfig.json, index.ts}
  - /home/z/my-project/mini-services/logs/{bms.log, hub.log}
- Ports: BMS Simulator → 0.0.0.0:3004, Realtime Hub → 0.0.0.0:3003
- BMS endpoints: GET /bms/health, GET /bms/rooms, GET /bms/rooms/:id, POST /bms/rooms/:id/setpoint, GET /bms/rooms/:id/setpoint/confirm, POST /bms/rooms/:id/door, POST /bms/rooms/:id/fault, POST /bms/reset
- Hub endpoints: POST /broadcast, GET /health, socket.io at path /socket.io
- Both processes have PPID=1 (detached, will survive).
- Verification curl outputs (all green):
  1. GET /bms/health         → `{"ok":true,"service":"bms-simulator","rooms":8}`
  2. GET /bms/rooms/CR-01    → full room state JSON
  3. POST setpoint 6°C r1    → `{"accepted":true,"setpoint":6,"currentTemp":4,...,"requestId":"r1"}`
  4. GET confirm?requestId=r1 → `{"confirmed":true,"setpoint":6,"currentTemp":4,...}`
  5. POST setpoint 0.5°C r2  → `{"accepted":false,"error":"OUT_OF_SAFE_RANGE","safeMin":1,"safeMax":10,"attempted":0.5}` HTTP 400
  6. POST /bms/reset         → `{"ok":true,"rooms":8}`
  7. GET /bms/rooms          → 8 rooms, correct seed temps/loads/power
  8. GET /health (hub)       → `{"ok":true,"service":"coldops-realtime","clients":0,"knownEvents":[11 events]}`
  9. POST /broadcast         → `{"ok":true,"event":"ghost-load-detected","clients":0}`
  10. POST /broadcast (no event) → `{"ok":false,"error":"MISSING_EVENT"}` HTTP 400
  11. GET /socket.io/?EIO=4&transport=polling → `0{"sid":"...","upgrades":["websocket"],"pingInterval":25000,...}` (socket.io handshake OK)
  12. BMS background sim loop → 5s snapshots in log, temp drift + load model working
  13. Hub broadcast logging  → `[hub] broadcast "ghost-load-detected" -> 0 client(s)`
  14. Process status         → both `bun --hot index.ts` with PPID=1
- Next: Next.js side can now POST to `http://localhost:3004/bms/...` (server-to-server) and `http://localhost:3003/broadcast` (server-to-server) — both bypass the Caddy gateway as allowed by spec. Browser connects to socket.io via `io({ path: '/socket.io', query: { XTransformPort: 3003 } })`.

---
Task ID: 1-a / 2 / 3 / 4 / 5
Agent: orchestrator (main)
Task: Build full ColdOps platform — schema, engine, API, UI, real-time, browser verification.

Work Log:
- Designed Prisma schema (12 models: ColdRoom, ProductSpec, Pallet, ProductionSchedule, MeterReading, GhostLoadEvent, ConsolidationOpportunity, WorkOrder, WorkOrderMove, SetbackEvent, Notification, SavingsCounter, AppConfig) and pushed to SQLite.
- Seeded Marigold PJ factory demo data: 8 cold rooms (Chilled/Blast/Dairy WIP/Finished Goods/Raw Milk/Juice), 15 Marigold SKUs (Fresh Milk, Yogurt, Cheese, Butter, Cream, Juice, Raw Milk, Soy Milk, Quarantine), 105 pallets with FEFO-ordered expiry dates, 6 production schedule entries, 200 meter readings (6h @ 15-min intervals with injected ghost load on CR-01/CR-02), 4 ghost load events, 7 severity-sorted notifications, 2 work orders.
- Built ColdOps detection engine (src/lib/coldops/detection.ts): deterministic ghost-load rules (OVERNIGHT/WEEKEND/BETWEEN_BATCH), severity scoring formula (RM waste × 0.5 + duration × 10 + safety + criticality), greedy consolidation planner (FEFO-sorted, allergen-checked, same-temperature-band grouping, prefers non-candidate destinations), ramp schedule builder.
- Built progressive setback engine (src/lib/coldops/setback.ts): real HTTP calls to BMS simulator, 4-step ramp at 4s intervals (compressed from 15min), readback confirmations, safety monitor polling room temp every 1.5s, auto-abort + revert if temp leaves safe range, savings counter increment on completion, ghost-load event resolution.
- Built BMS client (src/lib/bms/client.ts) and realtime client (src/lib/realtime/client.ts) — server-to-server fetch to mini-services.
- Built 12 API routes: /api/dashboard (aggregated KPIs), /api/rooms (with BMS enrichment), /api/notifications (+approve/defer/dismiss), /api/work-orders (+complete triggers setbacks), /api/consolidation (plan), /api/consolidation/execute (creates WO + moves), /api/setback/start, /api/setback/active, /api/wms/stock, /api/wms/stock/[id]/move, /api/savings, /api/bms-health.
- Built single-page UI on / with 4 views (client-side switching per "only / route" rule):
  • Command Center: 4 KPI cards (ghost load RM, savings, CO2, worst offender), live energy timeline chart (Recharts area chart with idle baseline reference), active ghost loads panel, active setbacks panel, room status grid, priority alerts.
  • Cold Room Map: SVG floor plan with 8 color-coded rooms (red/amber/emerald/sky/grey), live BMS temps + kW, click-to-inspect detail panel, consolidation plan card with net benefit breakdown, animated dashed arrows from source rooms to destination, FEFO-ordered move sequence list.
  • Work Orders: pending + completed sections, expandable move lists with confirm checkmarks, active setbacks strip, complete button triggers WMS pallet moves + auto-setbacks.
  • Notifications: severity-sorted list with severity tabs (Critical/High/Medium/Low counts), type filter chips, approve/defer/dismiss actions, channel icons (Dashboard/SMS/WhatsApp/Email), RM impact display.
- Real-time wiring via Socket.io: useRealtimeEvent hook + useRealtimeConnection, broadcasts for savings-updated, notification-new/updated, setback-progress/completed/aborted, work-order-updated/completed, ghost-load-detected/resolved, room-status-changed. Toast notifications on key events.
- Light theme with emerald accent (oklch color space), semantic colors for ghost/consolidation/optimized/active/idle + critical/high/medium/low severity. Sticky header with brand + nav + status pills (BMS online, realtime connected, savings tonight). Sticky footer with tariff/CO2/region info.
- Browser verification with agent-browser: all 4 views render, floor plan shows correct colors + temps, approve flow triggers real BMS API setback (verified SB-0001 completed 4°C→8°C with all steps confirmed), consolidation flow creates work order + completes + triggers 3 setbacks on emptied rooms, savings counter increments, no console errors.

Stage Summary:
- ✅ Production-grade demo running at http://localhost:3000
- ✅ BMS simulator on :3004 (8 rooms, real temp drift, setpoint write/confirm, safety ranges)
- ✅ Realtime hub on :3003 (11 event types, broadcast endpoint)
- ✅ Full closed-loop demo: detect ghost load → approve → progressive setback via BMS API → savings accumulate
- ✅ Full consolidation loop: detect underutilization → plan → execute work order → complete → auto-setback emptied rooms
- ✅ Real-time UI updates via Socket.io
- ✅ Lint clean, no console errors
- Known limitations: SQLite (not TimescaleDB), in-process setback scheduler (not BullMQ), BMS is a simulator (not real Siemens Desigo), no auth (per demo decision)
