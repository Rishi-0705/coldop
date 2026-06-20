import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'


export async function GET() {
  const rooms = await db.coldRoom.findMany({ orderBy: { code: 'asc' }, include: { pallets: true } })
  const activeGhosts = await detectActiveGhostLoads()

  
  const bmsRes = await fetch('http://localhost:3004/bms/rooms').catch(() => null)
  const bmsRooms: any[] = bmsRes ? await bmsRes.json() : []

  
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

    
    const tempDiff = bms ? Math.abs(bms.currentTemp - room.targetTemp) : 0
    const tempCompliance = Math.max(0, 100 - tempDiff * 20)

    
    const compressorLoad = bms ? bms.compressorLoad * 100 : 0

    
    const utilPct = utilization * 100

    
    const ghostHours = ghostStats?._sum.durationHours || 0
    const ghostHoursScore = Math.min(100, (ghostHours / 24) * 100)

    
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

  
  const axes = [
    { key: 'tempCompliance', label: 'Temp Compliance', fullLabel: 'Temperature Compliance (%)' },
    { key: 'compressorLoad', label: 'Compressor Load', fullLabel: 'Compressor Load (%)' },
    { key: 'utilization', label: 'Utilization', fullLabel: 'Utilization (%)' },
    { key: 'ghostHours', label: 'Ghost Hours', fullLabel: 'Ghost Load Hours (normalized)' },
    { key: 'rmWaste', label: 'RM Waste', fullLabel: 'RM Waste (normalized)' },
  ]

  return NextResponse.json({ rooms: roomsData, axes })
}
