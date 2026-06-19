import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = {}
  if (status) where.status = status

  const workOrders = await db.workOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { room: true, moves: { include: { pallet: true } } },
  })

  return NextResponse.json({ workOrders })
}
