import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // OPEN / APPROVED / DEFERRED / DISMISSED / RESOLVED
  const severity = searchParams.get('severity') // CRITICAL / HIGH / MEDIUM / LOW
  const type = searchParams.get('type') // GHOST_LOAD / CONSOLIDATION / SETBACK / WORK_ORDER / SAFETY / SYSTEM
  const limit = parseInt(searchParams.get('limit') || '100')

  const where: any = {}
  if (status) where.status = status
  if (severity) where.severity = severity
  if (type) where.type = type

  const notifs = await db.notification.findMany({
    where,
    orderBy: [{ severityScore: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: { room: true },
  })

  const counts = await db.notification.groupBy({
    by: ['severity'],
    where: { status: 'OPEN' },
    _count: true,
  })

  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  const countsMap: Record<string, number> = {}
  for (const s of severityOrder) countsMap[s] = 0
  for (const c of counts) countsMap[c.severity] = c._count

  return NextResponse.json({ notifications: notifs, counts: countsMap, total: notifs.length })
}
