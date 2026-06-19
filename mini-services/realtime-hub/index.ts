/**
 * ColdOps Realtime Hub
 * --------------------
 * A pub/sub hub for ColdOps real-time events.
 *
 *   - Browser clients connect via socket.io and listen for events.
 *   - The Next.js backend (producer) POSTs events to /broadcast, which re-emits
 *     them to every connected socket.io client.
 *
 * Bound to 0.0.0.0:3003 (hardcoded — do not use PORT env).
 *
 * NOTE on socket.io path:
 *   The websocket example uses path: '/', but that pattern ONLY works when the
 *   process is pure socket.io (no other HTTP routes). With path '/', Engine.IO's
 *   attach middleware intercepts EVERY HTTP request (because every URL starts
 *   with '/'), which would block the /broadcast and /health REST routes.
 *   We therefore use socket.io's default path '/socket.io'. The gateway still
 *   routes correctly because Caddy only inspects the XTransformPort query param,
 *   not the URL path.
 *
 *   Browser connection (recommended):
 *     io({ path: '/socket.io', query: { XTransformPort: 3003 } })
 *
 *   Or, equivalently, the shorthand from the gateway spec also works because
 *   socket.io-client falls back to its default path '/socket.io':
 *     io("/?XTransformPort=3003", { path: '/socket.io' })
 *
 * Emitted socket.io events (consumed by the dashboard):
 *   ghost-load-detected, ghost-load-resolved, savings-updated,
 *   setback-progress, setback-completed, setback-aborted,
 *   work-order-updated, work-order-completed,
 *   notification-new, notification-updated, room-status-changed
 *
 * Plus lifecycle events: `hello` (on connect) and `ping` (heartbeat every 30s).
 */

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)

const io = new Server(httpServer, {
  // Using the default socket.io path '/socket.io' so the /broadcast and /health
  // REST routes on this same port are not intercepted by Engine.IO.
  // (See NOTE on socket.io path above.)
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Whitelisted events (defensive — anything else is logged but still broadcast,
// so future producers don't need a hub redeploy).
const KNOWN_EVENTS = new Set<string>([
  'ghost-load-detected',
  'ghost-load-resolved',
  'savings-updated',
  'setback-progress',
  'setback-completed',
  'setback-aborted',
  'work-order-updated',
  'work-order-completed',
  'notification-new',
  'notification-updated',
  'room-status-changed',
])

// ------------------------------------------------------------------
// REST: producer push endpoint
// ------------------------------------------------------------------
app.post('/broadcast', (req, res) => {
  const { event, payload } = req.body ?? {}
  if (typeof event !== 'string' || !event) {
    return res.status(400).json({ ok: false, error: 'MISSING_EVENT' })
  }
  if (payload === undefined) {
    return res.status(400).json({ ok: false, error: 'MISSING_PAYLOAD' })
  }

  const clientCount = io.engine.clientsCount
  io.emit(event, payload)

  if (!KNOWN_EVENTS.has(event)) {
    console.log(`[hub] ⚠️  unknown event broadcasted: ${event}`)
  }
  console.log(`[hub] broadcast "${event}" -> ${clientCount} client(s)`)

  res.json({ ok: true, event, clients: clientCount })
})

// Health endpoint (handy for sanity checks; not on the spec but harmless)
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'coldops-realtime',
    clients: io.engine.clientsCount,
    knownEvents: Array.from(KNOWN_EVENTS),
  })
})

// ------------------------------------------------------------------
// Socket.io: consumer connections
// ------------------------------------------------------------------
io.on('connection', (socket) => {
  const total = io.engine.clientsCount
  console.log(`[hub] client connected: ${socket.id}, total: ${total}`)

  socket.emit('hello', {
    service: 'coldops-realtime',
    time: new Date().toISOString(),
  })

  socket.on('disconnect', (reason) => {
    console.log(`[hub] client disconnected: ${socket.id} (${reason}), total: ${io.engine.clientsCount}`)
  })

  socket.on('error', (err) => {
    console.error(`[hub] socket error (${socket.id}):`, err)
  })
})

// Heartbeat ping every 30s — clients ignore.
setInterval(() => {
  io.emit('ping', { time: new Date().toISOString() })
}, 30_000)

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 ColdOps Realtime Hub listening on http://0.0.0.0:${PORT}`)
  console.log(`   socket.io path: /socket.io  (browser: io({ path: '/socket.io', query: { XTransformPort: ${PORT} } }))`)
  console.log(`   REST push:    POST /broadcast { event, payload }`)
  console.log(`   Health check: GET  /health`)
})

// Graceful shutdown
const shutdown = (sig: string) => {
  console.log(`\n[hub] ${sig} received, shutting down...`)
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
