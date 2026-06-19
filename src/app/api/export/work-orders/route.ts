import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/export/work-orders
 * Returns a CSV of all work orders + their moves.
 */
export async function GET() {
  const workOrders = await db.workOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { room: true, moves: { include: { pallet: true } } },
  })

  const lines: string[] = []
  lines.push('ColdOps Work Order Report — Marigold PJ Factory')
  lines.push(`Generated,${new Date().toISOString()}`)
  lines.push('')
  lines.push('WORK ORDERS')
  lines.push('Work Order ID,Title,Type,Status,Room Code,Assigned To,Total Moves,Completed Moves,Est Labor (min),RM Saved/Hr,RM Saved,Created At,Started At,Completed At')
  for (const wo of workOrders) {
    lines.push([
      wo.id,
      `"${wo.title}"`,
      wo.type,
      wo.status,
      wo.room?.code || '',
      wo.assignedTo || '',
      wo.totalMoves,
      wo.completedMoves,
      wo.estLaborMinutes,
      wo.rmSavedPerHour.toFixed(2),
      wo.rmSaved.toFixed(2),
      wo.createdAt.toISOString(),
      wo.startedAt?.toISOString() || '',
      wo.completedAt?.toISOString() || '',
    ].join(','))
  }
  lines.push('')
  lines.push('PALLET MOVES (by work order)')
  lines.push('Work Order ID,Move Sequence,Lot No,Product Name,From Room,From Bay,To Room,To Bay,FEFO Rank,Allergen OK,Confirmed At')
  for (const wo of workOrders) {
    for (const m of wo.moves) {
      lines.push([
        wo.id,
        m.sequence,
        m.lotNo,
        `"${m.productName}"`,
        m.fromRoomCode,
        m.fromBayCode,
        m.toRoomCode,
        m.toBayCode,
        m.fefoRank,
        m.allergenOk ? 'YES' : 'NO',
        m.confirmedAt?.toISOString() || '',
      ].join(','))
    }
  }

  const csv = lines.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="coldops-work-orders-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
