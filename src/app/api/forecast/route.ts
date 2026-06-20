import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'


export async function GET() {
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  const tariff = config?.tnbTariffRM || 0.509
  const co2Factor = config?.co2PerKgRM || 0.583

  
  const bmsRes = await fetch('http://localhost:3004/bms/rooms').catch(() => null)
  const bmsRooms: any[] = bmsRes ? await bmsRes.json() : []

  
  const currentTotalKW = bmsRooms.reduce((s, r) => s + r.powerKW, 0)

  
  const monthlyCostWithout = currentTotalKW * 24 * 30 * tariff

  
  const activeGhosts = await detectActiveGhostLoads()

  
  const ghostSavingsMonthly = activeGhosts.reduce((s, g) => {
    return s + (g.rmPerHour * 8 * 22)
  }, 0)

  
  let consolidationSavingsMonthly = 0
  const ghostRoomIds = new Set(activeGhosts.map(g => g.roomId))
  const rooms = await db.coldRoom.findMany({ include: { pallets: true } })
  for (const room of rooms) {
    const util = room.capacityPallets > 0 ? room.pallets.length / room.capacityPallets : 0
    
    if (util < 0.25 && !ghostRoomIds.has(room.id)) {
      consolidationSavingsMonthly += room.maxPowerKW * 0.85 * 8 * 22 * tariff
    }
  }

  
  const activeSetbacks = await db.setbackEvent.findMany({
    where: { status: 'EXECUTING' },
    include: { room: true },
  })
  const setbackSavingsMonthly = activeSetbacks.reduce((s, sb) => {
    return s + (sb.room.maxPowerKW * 0.4 * tariff * 24 * 30)
  }, 0)

  
  const totalSavingsMonthly = ghostSavingsMonthly + consolidationSavingsMonthly + setbackSavingsMonthly

  
  const monthlyCostWith = Math.max(0, monthlyCostWithout - totalSavingsMonthly)

  
  const saasMonthlyCost = 5000

  
  const netMonthlyBenefit = totalSavingsMonthly - saasMonthlyCost
  const roiPercent = saasMonthlyCost > 0 ? Math.round((totalSavingsMonthly / saasMonthlyCost) * 100) : 0
  const paybackDays = totalSavingsMonthly > 0 ? Math.ceil((saasMonthlyCost / totalSavingsMonthly) * 30) : 0

  
  const monthlyCO2Saved = (totalSavingsMonthly / tariff) * co2Factor / 1000 
  const annualCO2Saved = monthlyCO2Saved * 12

  
  const projection = []
  for (let m = 0; m < 6; m++) {
    
    const growthFactor = 1 + (m * 0.05)
    projection.push({
      month: new Date(Date.now() + m * 30 * 86400000).toLocaleDateString('en-MY', { month: 'short' }),
      withoutColdOps: Math.round(monthlyCostWithout * 100) / 100,
      withColdOps: Math.round(monthlyCostWith / growthFactor * 100) / 100,
      savings: Math.round(totalSavingsMonthly * growthFactor * 100) / 100,
    })
  }

  return NextResponse.json({
    current: {
      totalPowerKW: Math.round(currentTotalKW * 10) / 10,
      monthlyCostWithout: Math.round(monthlyCostWithout * 100) / 100,
      monthlyCostWith: Math.round(monthlyCostWith * 100) / 100,
      monthlySavings: Math.round(totalSavingsMonthly * 100) / 100,
    },
    breakdown: {
      ghostLoad: {
        count: activeGhosts.length,
        monthlySavings: Math.round(ghostSavingsMonthly * 100) / 100,
        rooms: activeGhosts.map(g => ({ code: g.roomCode, rmPerHour: g.rmPerHour })),
      },
      consolidation: {
        candidateRooms: rooms.filter(r => {
          const util = r.capacityPallets > 0 ? r.pallets.length / r.capacityPallets : 0
          return util < 0.25 && !ghostRoomIds.has(r.id)
        }).length,
        monthlySavings: Math.round(consolidationSavingsMonthly * 100) / 100,
      },
      setback: {
        activeCount: activeSetbacks.length,
        monthlySavings: Math.round(setbackSavingsMonthly * 100) / 100,
      },
    },
    roi: {
      saasMonthlyCost,
      netMonthlyBenefit: Math.round(netMonthlyBenefit * 100) / 100,
      roiPercent,
      paybackDays,
      annualSavings: Math.round(totalSavingsMonthly * 12 * 100) / 100,
      annualCO2Saved: Math.round(annualCO2Saved * 100) / 100,
    },
    projection,
    tariff,
  })
}
