import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/system-health
 * Returns system health metrics: uptime, API response times, error rate,
 * DB query stats, BMS simulator status, realtime hub status.
 */
export async function GET() {
  const startTime = Date.now()

  // Check BMS simulator
  const bmsStart = Date.now()
  let bmsOnline = false
  let bmsLatency = 0
  try {
    const r = await fetch('http://localhost:3004/bms/health', { signal: AbortSignal.timeout(2000) })
    bmsOnline = r.ok
    bmsLatency = Date.now() - bmsStart
  } catch {
    bmsOnline = false
  }

  // Check realtime hub
  const hubStart = Date.now()
  let hubOnline = false
  let hubLatency = 0
  let hubClients = 0
  try {
    const r = await fetch('http://localhost:3003/health', { signal: AbortSignal.timeout(2000) })
    if (r.ok) {
      const d = await r.json()
      hubOnline = d.ok
      hubClients = d.clients || 0
    }
    hubLatency = Date.now() - hubStart
  } catch {
    hubOnline = false
  }

  // DB query timing
  const dbStart = Date.now()
  let dbOnline = false
  let dbLatency = 0
  let dbStats = { rooms: 0, pallets: 0, notifications: 0, workOrders: 0 }
  try {
    const [rooms, pallets, notifs, workOrders] = await Promise.all([
      db.coldRoom.count(),
      db.pallet.count(),
      db.notification.count(),
      db.workOrder.count(),
    ])
    dbOnline = true
    dbLatency = Date.now() - dbStart
    dbStats = { rooms, pallets, notifications: notifs, workOrders }
  } catch {
    dbOnline = false
  }

  // Compute uptime (simulated — in production this would read from process.uptime())
  const uptimeSeconds = Math.floor((Date.now() - new Date('2026-06-19T20:14:00Z').getTime()) / 1000)
  const uptimeHours = Math.floor(uptimeSeconds / 3600)
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60)

  // Error rate (simulated — would come from CloudWatch/logs in production)
  const errorRate = 0.2 // 0.2% error rate
  const requestsPerMin = 142

  // API endpoint health (simulated response times)
  const endpoints = [
    { path: '/api/dashboard', avgMs: 45, status: 'healthy', calls24h: 3420 },
    { path: '/api/rooms', avgMs: 38, status: 'healthy', calls24h: 2890 },
    { path: '/api/notifications', avgMs: 22, status: 'healthy', calls24h: 5210 },
    { path: '/api/work-orders', avgMs: 31, status: 'healthy', calls24h: 890 },
    { path: '/api/consolidation', avgMs: 68, status: 'healthy', calls24h: 450 },
    { path: '/api/setback/active', avgMs: 12, status: 'healthy', calls24h: 3120 },
    { path: '/api/analytics', avgMs: 145, status: 'healthy', calls24h: 320 },
    { path: '/api/meter-readings', avgMs: 89, status: 'healthy', calls24h: 670 },
    { path: '/api/esg', avgMs: 76, status: 'healthy', calls24h: 180 },
    { path: '/api/forecast', avgMs: 92, status: 'healthy', calls24h: 240 },
  ]

  const totalLatency = Date.now() - startTime

  return NextResponse.json({
    overall: {
      status: bmsOnline && hubOnline && dbOnline ? 'operational' : 'degraded',
      uptime: { hours: uptimeHours, minutes: uptimeMinutes, seconds: uptimeSeconds },
      uptimePct: 99.8,
      errorRate,
      requestsPerMin,
      totalCheckMs: totalLatency,
    },
    services: {
      bms: { online: bmsOnline, latency: bmsLatency, rooms: 8, endpoint: ':3004' },
      realtime: { online: hubOnline, latency: hubLatency, clients: hubClients, endpoint: ':3003' },
      database: { online: dbOnline, latency: dbLatency, ...dbStats, type: 'SQLite' },
    },
    endpoints,
    timestamp: new Date().toISOString(),
  })
}
