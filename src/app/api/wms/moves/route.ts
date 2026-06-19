import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wms/moves
 * Returns pallet move history (confirmed work order moves).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const roomCode = searchParams.get('roomCode')

  const where: any = { confirmedAt: { not: null } }
  // We can't filter by room code directly on WorkOrderMove, but we can filter on fromRoomCode/toRoomCode
  // For simplicity, fetch all and filter in JS if roomCode is provided

  const moves = await db.workOrderMove.findMany({
    where,
    orderBy: { confirmedAt: 'desc' },
    take: limit * 2, // fetch more in case we filter
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

  // Stats
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
