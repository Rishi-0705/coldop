import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/realtime/client'
import { startSetback } from '@/lib/coldops/setback'

export const dynamic = 'force-dynamic'


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const wo = await db.workOrder.findUnique({
    where: { id },
    include: { moves: { include: { pallet: true } } },
  })
  if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 })

  if (wo.status === 'COMPLETED') {
    return NextResponse.json({ ok: false, error: 'Already completed' })
  }

  
  const setbacks: string[] = []
  const sourceRoomsAffected = new Set<string>()
  for (const move of wo.moves) {
    const destRoom = await db.coldRoom.findUnique({ where: { code: move.toRoomCode } })
    if (!destRoom) continue
    await db.pallet.update({
      where: { id: move.palletId },
      data: { roomId: destRoom.id, bayCode: move.toBayCode },
    })
    await db.workOrderMove.update({
      where: { id: move.id },
      data: { confirmedAt: new Date() },
    })
    const sourceRoom = await db.coldRoom.findUnique({ where: { code: move.fromRoomCode } })
    if (sourceRoom) sourceRoomsAffected.add(sourceRoom.id)
  }

  
  const elapsedMin = wo.startedAt
    ? Math.round((Date.now() - wo.startedAt.getTime()) / 60000)
    : Math.round((Date.now() - wo.createdAt.getTime()) / 60000)
  await db.workOrder.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedMoves: wo.totalMoves,
      rmSaved: Math.round(wo.rmSavedPerHour * (elapsedMin / 60) * 100) / 100,
    },
  })

  
  for (const roomId of sourceRoomsAffected) {
    const room = await db.coldRoom.findUnique({ where: { id: roomId } })
    if (!room) continue
    const endSetpoint = Math.min(room.maxSafeTemp, room.targetTemp + 4)
    try {
      const r = await startSetback({ roomId, endSetpoint, reason: 'CONSOLIDATION', workOrderId: id })
      setbacks.push(r.setbackId)
    } catch (e) {
      console.warn('Setback failed for', room.code, e)
    }
  }

  
  const savings = await db.savingsCounter.findUnique({ where: { id: 1 } })
  if (savings) {
    await db.savingsCounter.update({
      where: { id: 1 },
      data: {
        tonightRM: savings.tonightRM + wo.rmSavedPerHour,
        thisWeekRM: savings.thisWeekRM + wo.rmSavedPerHour,
        thisMonthRM: savings.thisMonthRM + wo.rmSavedPerHour,
      },
    })
    await broadcast('savings-updated', {
      tonightRM: savings.tonightRM + wo.rmSavedPerHour,
      thisWeekRM: savings.thisWeekRM + wo.rmSavedPerHour,
      thisMonthRM: savings.thisMonthRM + wo.rmSavedPerHour,
      co2Tonnes: savings.co2Tonnes,
    })
  }

  await broadcast('work-order-completed', {
    workOrderId: id,
    roomId: wo.roomId,
    elapsedMin,
    rmSaved: wo.rmSavedPerHour * (elapsedMin / 60),
    setbacks,
  })

  return NextResponse.json({ ok: true, workOrderId: id, elapsedMin, setbacks })
}
