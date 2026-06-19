import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/multi-zone
 * Returns 24-hour power data for all 8 rooms, suitable for a multi-line comparison chart.
 *
 * Returns:
 *  - hours: [{ hour: 0..23, label: "00:00" }]
 *  - rooms: [{ code, name, zone, color, data: [{ hour, kw, isGhost }] }]
 *  - summary: { totalKW, peakKW, peakHour, ghostHours }
 */
export async function GET() {
  const rooms = await db.coldRoom.findMany({ orderBy: { code: 'asc' } })
  const readings = await db.meterReading.findMany({
    orderBy: { timestamp: 'asc' },
    include: { room: { select: { code: true } } },
  })

  // Colors for each room (matching the floor plan palette)
  const colorMap: Record<string, string> = {
    'CR-01': '#ef4444', // red (ghost)
    'CR-02': '#f97316', // orange
    'CR-03': '#0ea5e9', // sky
    'CR-04': '#06b6d4', // cyan
    'CR-05': '#8b5cf6', // violet
    'CR-06': '#10b981', // emerald
    'CR-07': '#f59e0b', // amber
    'CR-08': '#ec4899', // pink
  }

  // Group readings by room + hour
  const byRoom: Record<string, Map<number, { kw: number; isGhost: boolean; count: number }>> = {}
  for (const r of readings) {
    const roomCode = r.room.code
    if (!byRoom[roomCode]) byRoom[roomCode] = new Map()
    const hour = r.timestamp.getHours()
    if (!byRoom[roomCode].has(hour)) byRoom[roomCode].set(hour, { kw: 0, isGhost: false, count: 0 })
    const existing = byRoom[roomCode].get(hour)!
    existing.kw += r.powerKW
    if (r.isGhostLoad) existing.isGhost = true
    existing.count++
  }

  // For rooms without readings, synthesize from room specs
  const roomsData = rooms.map(room => {
    const hourMap = byRoom[room.code] || new Map()
    const data = []
    for (let h = 0; h < 24; h++) {
      const entry = hourMap.get(h)
      if (entry) {
        data.push({
          hour: h,
          kw: Math.round((entry.kw / entry.count) * 10) / 10,
          isGhost: entry.isGhost,
        })
      } else {
        // Synthesize: production 6am-10pm, idle otherwise
        const isProd = h >= 6 && h <= 22
        const idleKW = room.maxPowerKW * 0.15
        const kw = isProd ? room.maxPowerKW * 0.4 : idleKW
        data.push({ hour: h, kw: Math.round(kw * 10) / 10, isGhost: false })
      }
    }
    return {
      code: room.code,
      name: room.name,
      zone: room.zone,
      color: colorMap[room.code] || '#6b7280',
      maxPowerKW: room.maxPowerKW,
      data,
    }
  })

  // Summary
  const allKW = roomsData.flatMap(r => r.data.map(d => d.kw))
  const totalKW = allKW.reduce((s, kw) => s + kw, 0) / allKW.length
  const peakKW = Math.max(...allKW)
  const peakHour = roomsData[0]?.data.find(d => d.kw === peakKW)?.hour || 0
  const ghostHours = roomsData.reduce((s, r) => s + r.data.filter(d => d.isGhost).length, 0)

  return NextResponse.json({
    hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2, '0')}:00` })),
    rooms: roomsData,
    summary: {
      totalKW: Math.round(totalKW * 10) / 10,
      peakKW: Math.round(peakKW * 10) / 10,
      peakHour,
      ghostHours,
      roomCount: rooms.length,
    },
  })
}
