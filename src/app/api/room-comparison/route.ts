import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/room-comparison
 * Returns radar chart data comparing all 8 rooms across 5 dimensions:
 *  - Temperature compliance (how close to target)
 *  - Compressor load (% of max)
 *  - Utilization (% full)
 *  - Ghost load hours (last 24h)
 *  - RM waste (this period)
 *
 * Returns data normalized 0-100 for radar chart.
 */
export async function GET() {
  const rooms = await db.coldRoom.findMany({ orderBy: { code: 'asc' }, include: { pallets: true } })
  const activeGhosts = await detectActiveGhostLoads()

  // Fetch BMS current state for all rooms
  const bmsRes = await fetch('http://localhost:3004/bms/rooms').catch(() => null)
  const bmsRooms: any[] = bmsRes ? await bmsRes.json() : []

  // Get ghost load events per room
  const ghostEvents = await db.ghostLoadEvent.groupBy({
    by: ['roomId'],
    _sum: { rmWaste: true, durationHours: true },
    where: { status: { in: ['ACTIVE', 'RESOLVED'] } },
  })

  const colors = ['#ef4444', '#f97316', '#0ea5e9', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899']

  const roomsData = rooms.map((room, i) => {
    const bms = bmsRooms.find((b: any) => b.roomId === room.code)
    const ghost = activeGhosts.find(g => g.roomId === room.id)
    const ghostStats = ghostEvents.find(g => g.roomId === room.id)
    const utilization = room.capacityPallets > 0 ? room.pallets.length / room.capacityPallets : 0

    // Temperature compliance: 100 = perfect, 0 = way off
    const tempDiff = bms ? Math.abs(bms.currentTemp - room.targetTemp) : 0
    const tempCompliance = Math.max(0, 100 - tempDiff * 20)

    // Compressor load (0-100%)
    const compressorLoad = bms ? bms.compressorLoad * 100 : 0

    // Utilization (0-100%)
    const utilPct = utilization * 100

    // Ghost hours (normalized: 24h = 100)
    const ghostHours = ghostStats?._sum.durationHours || 0
    const ghostHoursScore = Math.min(100, (ghostHours / 24) * 100)

    // RM waste (normalized: RM 100 = 100)
    const rmWaste = ghostStats?._sum.rmWaste || 0
    const rmWasteScore = Math.min(100, rmWaste)

    return {
      code: room.code,
      name: room.name,
      zone: room.zone,
      color: colors[i % colors.length],
      metrics: {
        tempCompliance: Math.round(tempCompliance),
        compressorLoad: Math.round(compressorLoad),
        utilization: Math.round(utilPct),
        ghostHours: Math.round(ghostHoursScore),
        rmWaste: Math.round(rmWasteScore),
      },
      raw: {
        currentTemp: bms?.currentTemp || 0,
        targetTemp: room.targetTemp,
        powerKW: bms?.powerKW || 0,
        maxPowerKW: room.maxPowerKW,
        palletCount: room.pallets.length,
        capacityPallets: room.capacityPallets,
        ghostHours: Math.round(ghostHours * 10) / 10,
        rmWaste: Math.round(rmWaste * 100) / 100,
        isGhost: !!ghost,
      },
    }
  })

  // Axes labels
  const axes = [
    { key: 'tempCompliance', label: 'Temp Compliance', fullLabel: 'Temperature Compliance (%)' },
    { key: 'compressorLoad', label: 'Compressor Load', fullLabel: 'Compressor Load (%)' },
    { key: 'utilization', label: 'Utilization', fullLabel: 'Utilization (%)' },
    { key: 'ghostHours', label: 'Ghost Hours', fullLabel: 'Ghost Load Hours (normalized)' },
    { key: 'rmWaste', label: 'RM Waste', fullLabel: 'RM Waste (normalized)' },
  ]

  return NextResponse.json({ rooms: roomsData, axes })
}
