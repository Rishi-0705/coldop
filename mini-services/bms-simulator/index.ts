/**
 * ColdOps BMS Simulator
 * ---------------------
 * Mimics the REST contract of a Siemens Desigo / Honeywell EBI Building Management System,
 * so the ColdOps Next.js backend can issue real HTTP setpoint commands and read back
 * confirmations against in-memory simulated cold rooms.
 *
 * Bound to 0.0.0.0:3004 (hardcoded — do not use PORT env).
 *
 * Endpoints:
 *   GET    /bms/health
 *   GET    /bms/rooms
 *   GET    /bms/rooms/:roomId
 *   POST   /bms/rooms/:roomId/setpoint        { setpoint, requestId }
 *   GET    /bms/rooms/:roomId/setpoint/confirm?requestId=<id>
 *   POST   /bms/rooms/:roomId/door            { open }
 *   POST   /bms/rooms/:roomId/fault           { fault }
 *   POST   /bms/reset
 */

import express from 'express'
import cors from 'cors'

const PORT = 3004

type RoomStatus = 'active' | 'standby' | 'setback' | 'fault'

interface Room {
  roomId: string
  name: string
  currentTemp: number
  setpoint: number
  compressorLoad: number
  powerKW: number
  doorOpen: boolean
  safeMinTemp: number
  safeMaxTemp: number
  maxKW: number
  status: RoomStatus
  sensorFault?: boolean
  /** last write per requestId → setpoint that was committed */
  pendingRequests: Map<string, number>
}

interface SeedRoom {
  roomId: string
  name: string
  setpoint: number
  maxKW: number
  currentTemp: number
  compressorLoad: number
  safeMinTemp: number
  safeMaxTemp: number
}

const SEED: SeedRoom[] = [
  { roomId: 'CR-01', name: 'Chilled Storage A', setpoint: 4.0,  maxKW: 45, currentTemp: 5.4,  compressorLoad: 0.55, safeMinTemp: 1.0, safeMaxTemp: 10.0 },
  { roomId: 'CR-02', name: 'Chilled Storage B', setpoint: 4.0,  maxKW: 45, currentTemp: 5.7,  compressorLoad: 0.55, safeMinTemp: 1.0, safeMaxTemp: 10.0 },
  { roomId: 'CR-03', name: 'Blast Freezer 1',   setpoint: -18.0, maxKW: 90, currentTemp: -18.2, compressorLoad: 0.55, safeMinTemp: -25.0, safeMaxTemp: -10.0 },
  { roomId: 'CR-04', name: 'Blast Freezer 2',   setpoint: -18.0, maxKW: 90, currentTemp: -17.9, compressorLoad: 0.60, safeMinTemp: -25.0, safeMaxTemp: -10.0 },
  { roomId: 'CR-05', name: 'Dairy WIP',         setpoint: 2.0,  maxKW: 30, currentTemp: 2.1,  compressorLoad: 0.35, safeMinTemp: 0.0, safeMaxTemp: 8.0 },
  { roomId: 'CR-06', name: 'Finished Goods',    setpoint: 4.0,  maxKW: 45, currentTemp: 4.0,  compressorLoad: 0.42, safeMinTemp: 1.0, safeMaxTemp: 10.0 },
  { roomId: 'CR-07', name: 'Raw Milk Intake',   setpoint: 2.0,  maxKW: 30, currentTemp: 2.0,  compressorLoad: 0.30, safeMinTemp: 0.0, safeMaxTemp: 8.0 },
  { roomId: 'CR-08', name: 'Juice Storage',     setpoint: 4.0,  maxKW: 30, currentTemp: 4.0,  compressorLoad: 0.28, safeMinTemp: 1.0, safeMaxTemp: 10.0 },
]

const rooms = new Map<string, Room>()

function buildRoom(seed: SeedRoom): Room {
  return {
    roomId: seed.roomId,
    name: seed.name,
    currentTemp: seed.currentTemp,
    setpoint: seed.setpoint,
    compressorLoad: seed.compressorLoad,
    powerKW: +(seed.compressorLoad * seed.maxKW).toFixed(2),
    doorOpen: false,
    safeMinTemp: seed.safeMinTemp,
    safeMaxTemp: seed.safeMaxTemp,
    maxKW: seed.maxKW,
    status: 'active',
    sensorFault: false,
    pendingRequests: new Map<string, number>(),
  }
}

function resetAll() {
  rooms.clear()
  for (const s of SEED) rooms.set(s.roomId, buildRoom(s))
}

resetAll()

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round2 = (v: number) => Math.round(v * 100) / 100

function snapshot(room: Room) {
  return {
    roomId: room.roomId,
    name: room.name,
    currentTemp: round2(room.currentTemp),
    setpoint: room.setpoint,
    compressorLoad: round2(room.compressorLoad),
    powerKW: round2(room.powerKW),
    doorOpen: room.doorOpen,
    safeMinTemp: room.safeMinTemp,
    safeMaxTemp: room.safeMaxTemp,
    status: room.status,
    sensorFault: !!room.sensorFault,
  }
}

// ------------------------------------------------------------------
// Background simulation loop — 1s tick
// ------------------------------------------------------------------
let tick = 0
setInterval(() => {
  tick++
  for (const room of rooms.values()) {
    if (room.sensorFault) {
      room.status = 'fault'
      continue
    }
    const driftRate = room.doorOpen ? 0.15 : 0.05
    const delta = room.setpoint - room.currentTemp
    if (Math.abs(delta) < 0.005) {
      room.currentTemp = room.setpoint
    } else {
      // Drift toward setpoint. A small noise term keeps things lively.
      const noise = (Math.random() - 0.5) * 0.02
      room.currentTemp = room.currentTemp + Math.sign(delta) * Math.min(Math.abs(delta), driftRate) + noise
    }

    // Heat infiltration for ghost-load rooms (CR-01, CR-02): simulate poor insulation / door gaps
    // so the compressor keeps running at high load — matches the ghost-load story.
    if (room.roomId === 'CR-01' || room.roomId === 'CR-02') {
      room.currentTemp += 0.045 // counter the 0.05 drift, keeping temp ~1.5°C above setpoint
    }

    // Compressor load + power
    if (room.status === 'active') {
      room.compressorLoad = clamp(0.15 + Math.abs(room.currentTemp - room.setpoint) * 0.4, 0.15, 1.0)
    } else if (room.status === 'setback' || room.status === 'standby') {
      room.compressorLoad = 0.15
    }
    room.powerKW = room.compressorLoad * room.maxKW

    // Safety check
    if (room.currentTemp < room.safeMinTemp || room.currentTemp > room.safeMaxTemp) {
      room.status = 'fault'
    } else if (room.status === 'fault') {
      // auto-recover when back in safe range (unless sensor fault set explicitly)
      room.status = 'active'
    }
  }

  if (tick % 5 === 0) {
    const r = rooms.get('CR-01')
    if (r) {
      console.log(`[bms-sim t=${tick}s] ${r.roomId} ${r.name} | temp=${round2(r.currentTemp)}°C sp=${r.setpoint}°C load=${(r.compressorLoad * 100).toFixed(0)}% power=${round2(r.powerKW)}kW status=${r.status}`)
    }
  }
}, 1000)

// ------------------------------------------------------------------
// Express app
// ------------------------------------------------------------------
const app = express()
app.use(cors())
app.use(express.json())

// Request logging (lightweight)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  next()
})

app.get('/bms/health', (_req, res) => {
  res.json({ ok: true, service: 'bms-simulator', rooms: rooms.size })
})

app.get('/bms/rooms', (_req, res) => {
  res.json(Array.from(rooms.values()).map(snapshot))
})

app.get('/bms/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', roomId: req.params.roomId })
  res.json(snapshot(room))
})

app.post('/bms/rooms/:roomId/setpoint', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', roomId: req.params.roomId })

  const { setpoint, requestId } = req.body ?? {}
  if (typeof setpoint !== 'number' || Number.isNaN(setpoint)) {
    return res.status(400).json({ accepted: false, error: 'INVALID_SETPOINT' })
  }
  if (typeof requestId !== 'string' || !requestId) {
    return res.status(400).json({ accepted: false, error: 'INVALID_REQUEST_ID' })
  }

  if (setpoint < room.safeMinTemp || setpoint > room.safeMaxTemp) {
    return res.status(400).json({
      accepted: false,
      error: 'OUT_OF_SAFE_RANGE',
      safeMin: room.safeMinTemp,
      safeMax: room.safeMaxTemp,
      attempted: setpoint,
    })
  }

  room.setpoint = setpoint
  room.pendingRequests.set(requestId, setpoint)
  // If room was in setback/standby, a new setpoint reactivates it.
  if (room.status === 'setback' || room.status === 'standby') room.status = 'active'

  console.log(`[bms-sim] setpoint write ${room.roomId} -> ${setpoint}°C (req=${requestId})`)

  res.json({
    accepted: true,
    setpoint: room.setpoint,
    currentTemp: round2(room.currentTemp),
    timestamp: new Date().toISOString(),
    requestId,
  })
})

app.get('/bms/rooms/:roomId/setpoint/confirm', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', roomId: req.params.roomId })

  const requestId = String(req.query.requestId ?? '')
  if (!requestId) {
    return res.status(400).json({ confirmed: false, error: 'MISSING_REQUEST_ID' })
  }

  const expected = room.pendingRequests.get(requestId)
  if (expected === undefined) {
    return res.json({
      confirmed: false,
      error: 'UNKNOWN_REQUEST_ID',
      requestId,
      actual: room.setpoint,
    })
  }

  const confirmed = Math.abs(room.setpoint - expected) < 0.001
  res.json({
    confirmed,
    setpoint: room.setpoint,
    currentTemp: round2(room.currentTemp),
    requestId,
    timestamp: new Date().toISOString(),
    ...(confirmed ? {} : { expected, actual: room.setpoint }),
  })
})

app.post('/bms/rooms/:roomId/door', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', roomId: req.params.roomId })
  const open = !!req.body?.open
  room.doorOpen = open
  console.log(`[bms-sim] door ${room.roomId} -> ${open ? 'OPEN' : 'CLOSED'}`)
  res.json({ ok: true, roomId: room.roomId, doorOpen: room.doorOpen })
})

app.post('/bms/rooms/:roomId/fault', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', roomId: req.params.roomId })
  const fault = !!req.body?.fault
  room.sensorFault = fault
  if (fault) room.status = 'fault'
  else if (room.status === 'fault') room.status = 'active'
  console.log(`[bms-sim] fault ${room.roomId} -> ${fault ? 'ON' : 'OFF'}`)
  res.json({ ok: true, roomId: room.roomId, sensorFault: room.sensorFault, status: room.status })
})

app.post('/bms/reset', (_req, res) => {
  resetAll()
  console.log('[bms-sim] all rooms reset to seed state')
  res.json({ ok: true, rooms: rooms.size })
})

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', path: req.path })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`❄️  BMS Simulator listening on http://0.0.0.0:${PORT}`)
  console.log(`   ${rooms.size} cold rooms seeded (CR-01..CR-08)`)
})

// Graceful shutdown
const shutdown = (sig: string) => {
  console.log(`\n[bms-sim] ${sig} received, shutting down...`)
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
