import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads, getRoomUtilization } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [savings, ghosts, utils, notifs, workOrders, config] = await Promise.all([
    db.savingsCounter.findUnique({ where: { id: 1 } }),
    detectActiveGhostLoads(),
    getRoomUtilization(),
    db.notification.findMany({ where: { status: 'OPEN' }, orderBy: { severityScore: 'desc' }, take: 5 }),
    db.workOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    db.appConfig.findUnique({ where: { id: 1 } }),
  ])

  const totalGhostsThisPeriod = await db.ghostLoadEvent.aggregate({
    where: { status: { in: ['ACTIVE', 'RESOLVED'] } },
    _sum: { rmWaste: true },
    _count: true,
  })

  const ghostHours = await db.ghostLoadEvent.aggregate({
    where: { status: { in: ['ACTIVE', 'RESOLVED'] } },
    _sum: { durationHours: true },
  })

  const worstOffender = ghosts[0] || null
  const consolidationCandidates = utils.filter(u => u.status === 'CONSOLIDATION')

  return NextResponse.json({
    savings: savings ? {
      tonightRM: savings.tonightRM,
      thisWeekRM: savings.thisWeekRM,
      thisMonthRM: savings.thisMonthRM,
      co2Tonnes: savings.co2Tonnes,
      ghostLoadHours: savings.ghostLoadHours,
    } : { tonightRM: 0, thisWeekRM: 0, thisMonthRM: 0, co2Tonnes: 0, ghostLoadHours: 0 },
    activeGhosts: ghosts,
    rooms: utils,
    topNotifications: notifs,
    recentWorkOrders: workOrders,
    config: config ? {
      tnbTariffRM: config.tnbTariffRM,
      idleThresholdPct: config.idleThresholdPct,
      consolidationThresholdPct: config.consolidationThresholdPct,
    } : null,
    kpis: {
      ghostLoadRM: totalGhostsThisPeriod._sum.rmWaste || 0,
      ghostLoadCount: totalGhostsThisPeriod._count || 0,
      ghostLoadHours: ghostHours._sum.durationHours || 0,
      worstOffender,
      consolidationCandidateCount: consolidationCandidates.length,
    },
  })
}
