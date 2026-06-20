import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRoomUtilization } from '@/lib/coldops/detection'
import { bmsGetRooms, bmsHealth } from '@/lib/bms/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [utils, bmsRooms, bmsOk] = await Promise.all([
    getRoomUtilization(),
    bmsGetRooms().catch(() => []),
    bmsHealth(),
  ])

  const rooms = await db.coldRoom.findMany()
  const openNotifs = await db.notification.findMany({ where: { status: 'OPEN', type: 'TEMP_ADJUSTMENT' } })
  const openRooms = new Set(openNotifs.map(n => n.roomId))

  const enriched = utils.map(u => {
    const room = rooms.find(r => r.id === u.roomId)
    const bms = bmsRooms.find((b: any) => b.roomId === u.roomCode)
    return {
      ...u,
      id: u.roomId,
      code: u.roomCode,
      name: u.roomName,
      floorX: room?.floorX ?? 0,
      floorY: room?.floorY ?? 0,
      floorW: room?.floorW ?? 20,
      floorH: room?.floorH ?? 15,
      targetTemp: room?.targetTemp ?? 4,
      minSafeTemp: room?.minSafeTemp ?? 0,
      maxSafeTemp: room?.maxSafeTemp ?? 10,
      maxPowerKW: room?.maxPowerKW ?? 30,
      recommendedSetpoint: openRooms.has(u.roomId) ? (room?.recommendedSetpoint ?? null) : null,
      aiReason: openRooms.has(u.roomId) ? (room?.aiReason ?? null) : null,
      lastStockType: room?.lastStockType ?? null,
      bms: bms ? {
        currentTemp: bms.currentTemp,
        setpoint: bms.setpoint,
        compressorLoad: bms.compressorLoad,
        powerKW: bms.powerKW,
        doorOpen: bms.doorOpen,
        status: bms.status,
      } : null,
    }
  })

  return NextResponse.json({ rooms: enriched, bmsOnline: bmsOk })
}
