import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET() {
  const savings = await db.savingsCounter.findUnique({ where: { id: 1 } })
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  const tariff = config?.tnbTariffRM || 0.509

  
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400 * 1000)

  const thisWeekGhosts = await db.ghostLoadEvent.findMany({
    where: { createdAt: { gte: weekAgo } },
  })
  const lastWeekGhosts = await db.ghostLoadEvent.findMany({
    where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
  })

  const thisWeekRM = thisWeekGhosts.reduce((s, g) => s + g.rmWaste, 0)
  const lastWeekRM = lastWeekGhosts.reduce((s, g) => s + g.rmWaste, 0)

  
  const thisWeekSetbacks = await db.setbackEvent.count({
    where: { createdAt: { gte: weekAgo }, status: 'COMPLETED' },
  })
  const lastWeekSetbacks = await db.setbackEvent.count({
    where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo }, status: 'COMPLETED' },
  })

  
  const thisWeekWOs = await db.workOrder.count({
    where: { createdAt: { gte: weekAgo } },
  })
  const lastWeekWOs = await db.workOrder.count({
    where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
  })

  
  const dailyData = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400 * 1000)
    const dayName = date.toLocaleDateString('en-MY', { weekday: 'short' })
    const isLastWeek = i >= 7
    const baseRM = (savings?.thisWeekRM || 312) / 7
    const variance = 0.6 + Math.random() * 0.6
    const weekendMult = (date.getDay() === 0 || date.getDay() === 6) ? 0.6 : 1.0
    dailyData.push({
      day: dayName,
      date: date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }),
      rm: Math.round(baseRM * variance * weekendMult * 100) / 100,
      week: isLastWeek ? 'last' : 'this',
    })
  }

  const changePct = lastWeekRM > 0 ? Math.round(((thisWeekRM - lastWeekRM) / lastWeekRM) * 100) : 0

  return NextResponse.json({
    thisWeek: {
      rm: Math.round(thisWeekRM * 100) / 100,
      ghostEvents: thisWeekGhosts.length,
      setbacks: thisWeekSetbacks,
      workOrders: thisWeekWOs,
    },
    lastWeek: {
      rm: Math.round(lastWeekRM * 100) / 100,
      ghostEvents: lastWeekGhosts.length,
      setbacks: lastWeekSetbacks,
      workOrders: lastWeekWOs,
    },
    changePct,
    dailyData,
    trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
  })
}
