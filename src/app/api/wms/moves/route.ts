import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const roomCode = searchParams.get('roomCode')

  const where: any = { confirmedAt: { not: null } }
  
  

  const moves = await db.workOrderMove.findMany({
    where,
    orderBy: { confirmedAt: 'desc' },
    take: limit * 2, 
    include: { workOrder: { include: { room: true } } },
  })

  let filtered = moves
  if (roomCode) {
    filtered = moves.filter(m => m.fromRoomCode === roomCode || m.toRoomCode === roomCode)
  }

  const result = filtered.slice(0, limit).map(m => ({
    id: m.id,
    lotNo: m.lotNo,
    productName: m.productName,
    fromRoomCode: m.fromRoomCode,
    fromBayCode: m.fromBayCode,
    toRoomCode: m.toRoomCode,
    toBayCode: m.toBayCode,
    sequence: m.sequence,
    fefoRank: m.fefoRank,
    allergenOk: m.allergenOk,
    confirmedAt: m.confirmedAt,
    workOrderId: m.workOrderId,
    workOrderTitle: m.workOrder?.title,
    workOrderStatus: m.workOrder?.status,
  }))

  
  const totalMoves = moves.length
  const uniqueProducts = new Set(moves.map(m => m.productName)).size
  const uniqueRooms = new Set(moves.flatMap(m => [m.fromRoomCode, m.toRoomCode])).size

  return NextResponse.json({
    moves: result,
    stats: {
      total: totalMoves,
      uniqueProducts,
      uniqueRooms,
    },
  })
}
