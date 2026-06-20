import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/realtime/client'

export const dynamic = 'force-dynamic'


export async function POST(req: Request, { params }: { params: Promise<{ palletId: string }> }) {
  const { palletId } = await params
  const body = await req.json()
  const { toRoomCode, toBayCode } = body
  if (!toRoomCode || !toBayCode) {
    return NextResponse.json({ error: 'toRoomCode and toBayCode required' }, { status: 400 })
  }

  const pallet = await db.pallet.findUnique({ where: { id: palletId }, include: { room: true } })
  if (!pallet) return NextResponse.json({ error: 'Pallet not found' }, { status: 404 })

  const destRoom = await db.coldRoom.findUnique({ where: { code: toRoomCode } })
  if (!destRoom) return NextResponse.json({ error: 'Destination room not found' }, { status: 404 })

  
  const destPallets = await db.pallet.findMany({ where: { roomId: destRoom.id } })
  const destAllergens = new Set(destPallets.flatMap(p => (p.allergenTags || '').split(',').filter(Boolean)))
  const palletAllergens = (pallet.allergenTags || '').split(',').filter(Boolean)
  const allergenOk = palletAllergens.length === 0 || palletAllergens.every(a => destAllergens.has(a)) || destAllergens.size === 0

  await db.pallet.update({
    where: { id: palletId },
    data: { roomId: destRoom.id, bayCode: toBayCode },
  })

  await broadcast('room-status-changed', {
    roomId: pallet.roomId,
    roomCode: pallet.room.code,
    status: 'UPDATED',
  })

  return NextResponse.json({
    ok: true,
    palletId,
    fromRoom: pallet.room.code,
    fromBay: pallet.bayCode,
    toRoom: toRoomCode,
    toBay: toBayCode,
    allergenOk,
  })
}
