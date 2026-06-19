import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const BMS_BASE = 'http://localhost:3004'

/**
 * Role catalog — hard-coded for the ColdOps demo (would be configurable in production).
 * Mirrors the role switcher in the UI (supervisor / technician / admin / viewer).
 */
const ROLES = [
  {
    role: 'supervisor',
    description: 'Approve setbacks and consolidation, view all data',
    permissions: ['approve', 'defer', 'dismiss', 'execute'],
  },
  {
    role: 'technician',
    description: 'Execute work orders, view rooms',
    permissions: ['execute', 'view'],
  },
  {
    role: 'admin',
    description: 'Configure thresholds, manage users',
    permissions: ['approve', 'defer', 'dismiss', 'execute', 'configure', 'view'],
  },
  {
    role: 'viewer',
    description: 'Read-only access to dashboards',
    permissions: ['view'],
  },
]

async function fetchBmsInfo() {
  let online = false
  let roomsConnected = 0
  try {
    const healthRes = await fetch(`${BMS_BASE}/bms/health`, {
      signal: AbortSignal.timeout(2000),
    })
    online = healthRes.ok
  } catch {
    online = false
  }
  if (online) {
    try {
      const roomsRes = await fetch(`${BMS_BASE}/bms/rooms`, {
        signal: AbortSignal.timeout(2000),
      })
      if (roomsRes.ok) {
        const rooms = await roomsRes.json()
        roomsConnected = Array.isArray(rooms) ? rooms.length : 0
      }
    } catch {
      roomsConnected = 0
    }
  }
  return {
    adapter: 'REST',
    vendor: 'Siemens Desigo',
    online,
    roomsConnected,
  }
}

function shapeConfig(c: any) {
  if (!c) return null
  return {
    id: c.id,
    tnbTariffRM: c.tnbTariffRM,
    idleThresholdPct: c.idleThresholdPct,
    minIdleDurationHours: c.minIdleDurationHours,
    consolidationThresholdPct: c.consolidationThresholdPct,
    laborCostPerMinuteRM: c.laborCostPerMinuteRM,
    co2PerKgRM: c.co2PerKgRM,
    rampStepSeconds: c.rampStepSeconds,
  }
}

export async function GET() {
  try {
    const [config, bms] = await Promise.all([
      db.appConfig.findUnique({ where: { id: 1 } }),
      fetchBmsInfo(),
    ])

    return NextResponse.json({
      config: shapeConfig(config),
      bms,
      roles: ROLES,
    })
  } catch (err: any) {
    console.error('[settings GET] error:', err)
    return NextResponse.json(
      { error: 'Failed to load settings', detail: err.message },
      { status: 500 },
    )
  }
}

/**
 * Allowed numeric updatable fields on AppConfig.
 */
const UPDATABLE_FIELDS = [
  'tnbTariffRM',
  'idleThresholdPct',
  'minIdleDurationHours',
  'consolidationThresholdPct',
  'laborCostPerMinuteRM',
  'co2PerKgRM',
  'rampStepSeconds',
] as const

type UpdatableField = (typeof UPDATABLE_FIELDS)[number]

function pickUpdates(body: any): Record<string, number> {
  const updates: Record<string, number> = {}
  for (const field of UPDATABLE_FIELDS) {
    if (body[field] !== undefined) {
      const value = Number(body[field])
      if (!Number.isNaN(value)) {
        updates[field] = value
      }
    }
  }
  return updates
}

export async function PUT(req: Request) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      )
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 },
      )
    }

    const updates = pickUpdates(body)
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updatable fields provided', allowedFields: UPDATABLE_FIELDS },
        { status: 400 },
      )
    }

    // Ensure the AppConfig row exists before updating (id=1 is the singleton row).
    const existing = await db.appConfig.findUnique({ where: { id: 1 } })
    if (!existing) {
      await db.appConfig.create({ data: { id: 1, ...updates } })
    } else {
      await db.appConfig.update({ where: { id: 1 }, data: updates })
    }

    const updated = await db.appConfig.findUnique({ where: { id: 1 } })
    return NextResponse.json({ config: shapeConfig(updated) })
  } catch (err: any) {
    console.error('[settings PUT] error:', err)
    return NextResponse.json(
      { error: 'Failed to update settings', detail: err.message },
      { status: 500 },
    )
  }
}
