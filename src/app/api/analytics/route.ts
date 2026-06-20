import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads, CO2_PER_KWH_KG } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'


export async function GET() {
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  const tariff = config?.tnbTariffRM || 0.509

  
  
  
  const rooms = await db.coldRoom.findMany({ orderBy: { code: 'asc' } })
  const readings = await db.meterReading.findMany({
    orderBy: { timestamp: 'asc' },
    include: { room: { select: { code: true } } },
  })

  
  const heatmap: { roomCode: string; roomName: string; zone: string; hours: { hour: number; kw: number; isGhost: boolean; isProd: boolean }[] }[] = []
  for (const room of rooms) {
    const hours: { hour: number; kw: number; isGhost: boolean; isProd: boolean }[] = []
    for (let h = 0; h < 24; h++) {
      
      const hourReadings = readings.filter(r => r.roomId === room.id && r.timestamp.getHours() === h)
      if (hourReadings.length > 0) {
        const avgKW = hourReadings.reduce((s, r) => s + r.powerKW, 0) / hourReadings.length
        const isGhost = hourReadings.some(r => r.isGhostLoad)
        const isProd = hourReadings.some(r => r.isProductionActive)
        hours.push({ hour: h, kw: Math.round(avgKW * 10) / 10, isGhost, isProd })
      } else {
        
        const isProd = h >= 6 && h <= 22
        const idleKW = room.maxPowerKW * 0.15
        const kw = isProd ? room.maxPowerKW * 0.4 : idleKW
        hours.push({ hour: h, kw: Math.round(kw * 10) / 10, isGhost: false, isProd })
      }
    }
    heatmap.push({ roomCode: room.code, roomName: room.name, zone: room.zone, hours })
  }

  
  
  const savings = await db.savingsCounter.findUnique({ where: { id: 1 } })
  const baseMonthly = savings?.thisMonthRM || 0
  const trend: { day: string; rm: number; co2: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400 * 1000)
    
    const dailyAvg = baseMonthly / 30
    const variance = 0.7 + Math.random() * 0.4
    const weekendMult = (date.getDay() === 0 || date.getDay() === 6) ? 0.7 : 1.0
    const rm = Math.round(dailyAvg * variance * weekendMult * 100) / 100
    const co2 = Math.round((rm / tariff) * CO2_PER_KWH_KG / 100) / 10 
    trend.push({
      day: date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }),
      rm,
      co2,
    })
  }

  
  
  const saasMonthlyCost = 5000
  const monthlySavings = baseMonthly
  const roiMonths = monthlySavings > 0 ? saasMonthlyCost / monthlySavings : 0
  const annualSavings = monthlySavings * 12
  const annualSaaS = saasMonthlyCost * 12
  const netAnnualBenefit = annualSavings - annualSaaS
  const roiPercent = annualSaaS > 0 ? Math.round((annualSavings / annualSaaS) * 100) : 0

  
  const ghostByRoom = await db.ghostLoadEvent.groupBy({
    by: ['roomId'],
    _sum: { rmWaste: true, durationHours: true },
    _count: true,
  })
  const topRooms = await Promise.all(
    ghostByRoom.map(async (g) => {
      const room = await db.coldRoom.findUnique({ where: { id: g.roomId } })
      return {
        roomCode: room?.code || '?',
        roomName: room?.name || '?',
        zone: room?.zone || '?',
        totalRM: Math.round((g._sum.rmWaste || 0) * 100) / 100,
        totalHours: Math.round((g._sum.durationHours || 0) * 10) / 10,
        eventCount: g._count,
      }
    })
  )
  topRooms.sort((a, b) => b.totalRM - a.totalRM)

  
  const activeGhosts = await detectActiveGhostLoads()
  const energyByZone: Record<string, { kw: number; rooms: number; ghostRooms: number }> = {}
  for (const room of rooms) {
    if (!energyByZone[room.zone]) energyByZone[room.zone] = { kw: 0, rooms: 0, ghostRooms: 0 }
    
    const latest = readings.filter(r => r.roomId === room.id).pop()
    if (latest) energyByZone[room.zone].kw += latest.powerKW
    energyByZone[room.zone].rooms++
    if (activeGhosts.find(g => g.roomId === room.id)) energyByZone[room.zone].ghostRooms++
  }
  const energyMix = Object.entries(energyByZone).map(([zone, d]) => ({
    zone,
    kw: Math.round(d.kw * 10) / 10,
    rooms: d.rooms,
    ghostRooms: d.ghostRooms,
  }))

  return NextResponse.json({
    heatmap,
    trend,
    roi: {
      saasMonthlyCost,
      monthlySavings: Math.round(monthlySavings * 100) / 100,
      roiMonths: Math.round(roiMonths * 10) / 10,
      annualSavings: Math.round(annualSavings * 100) / 100,
      annualSaaS,
      netAnnualBenefit: Math.round(netAnnualBenefit * 100) / 100,
      roiPercent,
    },
    topRooms: topRooms.slice(0, 5),
    energyMix,
    tariff,
  })
}
