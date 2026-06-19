import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/meter-readings
 * Returns time-series power data for charting.
 * Query params:
 *   - hours: lookback window (default 6)
 *   - roomCode: filter to single room (optional)
 *
 * Returns:
 *   - timeline: [{ t: 'HH:mm', kw: number, idle: number, isGhost: bool, isProd: bool }]
 *   - rooms: per-room current power
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const hours = parseInt(searchParams.get('hours') || '6')
  const roomCode = searchParams.get('roomCode')

  const cutoff = new Date(Date.now() - hours * 3600 * 1000)

  let roomFilter: any = {}
  if (roomCode) {
    const room = await db.coldRoom.findUnique({ where: { code: roomCode } })
    if (room) roomFilter = { roomId: room.id }
  }

  const readings = await db.meterReading.findMany({
    where: { ...roomFilter, timestamp: { gte: cutoff } },
    orderBy: { timestamp: 'asc' },
    include: { room: { select: { code: true, name: true, maxPowerKW: true } } },
    take: 500,
  })

  // Group by timestamp (15-min bucket)
  const buckets: Record<string, { kw: number; idle: number; count: number; isGhost: boolean; isProd: boolean }> = {}
  for (const r of readings) {
    const key = r.timestamp.toISOString()
    if (!buckets[key]) buckets[key] = { kw: 0, idle: 0, count: 0, isGhost: false, isProd: false }
    buckets[key].kw += r.powerKW
    buckets[key].idle += r.idleBaselineKW
    buckets[key].count++
    if (r.isGhostLoad) buckets[key].isGhost = true
    if (r.isProductionActive) buckets[key].isProd = true
  }

  const timeline = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, v]) => ({
      t: new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      iso,
      kw: Math.round(v.kw * 10) / 10,
      idle: Math.round(v.idle * 10) / 10,
      isGhost: v.isGhost,
      isProd: v.isProd,
    }))

  // Per-room current power (most recent reading)
  const rooms = await db.coldRoom.findMany()
  const roomCurrent: { code: string; name: string; currentKW: number; idleKW: number; isGhost: boolean }[] = []
  for (const room of rooms) {
    const latest = await db.meterReading.findFirst({
      where: { roomId: room.id },
      orderBy: { timestamp: 'desc' },
    })
    if (latest) {
      roomCurrent.push({
        code: room.code,
        name: room.name,
        currentKW: latest.powerKW,
        idleKW: latest.idleBaselineKW,
        isGhost: latest.isGhostLoad,
      })
    }
  }

  return NextResponse.json({ timeline, rooms: roomCurrent, hours })
}
