import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomCode = searchParams.get('roomCode')
  const productCode = searchParams.get('productCode')

  const where: any = {}
  if (roomCode) {
    const room = await db.coldRoom.findUnique({ where: { code: roomCode } })
    if (room) where.roomId = room.id
  }
  if (productCode) where.productCode = productCode

  const pallets = await db.pallet.findMany({
    where,
    orderBy: { expiryDate: 'asc' },
    include: { room: true },
    take: 500,
  })

  
  const byRoom: Record<string, any[]> = {}
  for (const p of pallets) {
    if (!byRoom[p.room.code]) byRoom[p.room.code] = []
    byRoom[p.room.code].push({
      id: p.id,
      lotNo: p.lotNo,
      productCode: p.productCode,
      productName: p.productName,
      bayCode: p.bayCode,
      expiryDate: p.expiryDate,
      allergenTags: p.allergenTags,
      quarantine: p.quarantine,
    })
  }

  const rooms = await db.coldRoom.findMany({ include: { _count: { select: { pallets: true } } } })

  return NextResponse.json({
    pallets,
    byRoom,
    rooms: rooms.map(r => ({
      id: r.id, code: r.code, name: r.name, zone: r.zone,
      targetTemp: r.targetTemp, capacityPallets: r.capacityPallets,
      palletCount: r._count.pallets,
      utilizationPct: Math.round((r._count.pallets / r.capacityPallets) * 100),
    })),
    totalPallets: pallets.length,
  })
}
