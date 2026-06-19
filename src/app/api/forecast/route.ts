import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/forecast
 * Energy cost forecast: projected monthly cost without ColdOps vs with ColdOps.
 *
 * Calculation:
 *  - Without ColdOps: sum of (current power draw * 24 * 30 * tariff) for all rooms
 *    (assumes compressors run 24/7 at current load — the status quo)
 *  - With ColdOps: subtract estimated savings from:
 *    a) Ghost load resolution (each active ghost = rmPerHour * 8h/night * 22 nights/month)
 *    b) Consolidation (energy saving from idling emptied rooms)
 *    c) Progressive setbacks (load reduction on setback rooms)
 *  - Also returns: payback period, annual net benefit, CO2 impact
 */
export async function GET() {
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  const tariff = config?.tnbTariffRM || 0.509
  const co2Factor = config?.co2PerKgRM || 0.583

  // Fetch BMS current power for all rooms
  const bmsRes = await fetch('http://localhost:3004/bms/rooms').catch(() => null)
  const bmsRooms: any[] = bmsRes ? await bmsRes.json() : []

  // Current total power draw
  const currentTotalKW = bmsRooms.reduce((s, r) => s + r.powerKW, 0)

  // Without ColdOps: compressors run at current load 24/7
  const monthlyCostWithout = currentTotalKW * 24 * 30 * tariff

  // Detect active ghost loads
  const activeGhosts = await detectActiveGhostLoads()

  // Ghost load savings: each ghost resolved = rmPerHour * 8h/night * 22 nights
  const ghostSavingsMonthly = activeGhosts.reduce((s, g) => {
    return s + (g.rmPerHour * 8 * 22)
  }, 0)

  // Consolidation savings: check for consolidation plan
  let consolidationSavingsMonthly = 0
  const ghostRoomIds = new Set(activeGhosts.map(g => g.roomId))
  const rooms = await db.coldRoom.findMany({ include: { pallets: true } })
  for (const room of rooms) {
    const util = room.capacityPallets > 0 ? room.pallets.length / room.capacityPallets : 0
    // Rooms below 25% utilization that aren't already ghost-flagged could be consolidated
    if (util < 0.25 && !ghostRoomIds.has(room.id)) {
      consolidationSavingsMonthly += room.maxPowerKW * 0.85 * 8 * 22 * tariff
    }
  }

  // Setback savings: rooms currently in setback mode (check active setbacks)
  const activeSetbacks = await db.setbackEvent.findMany({
    where: { status: 'EXECUTING' },
    include: { room: true },
  })
  const setbackSavingsMonthly = activeSetbacks.reduce((s, sb) => {
    return s + (sb.room.maxPowerKW * 0.4 * tariff * 24 * 30)
  }, 0)

  // Total monthly savings
  const totalSavingsMonthly = ghostSavingsMonthly + consolidationSavingsMonthly + setbackSavingsMonthly

  // With ColdOps
  const monthlyCostWith = Math.max(0, monthlyCostWithout - totalSavingsMonthly)

  // SaaS cost (RM 5,000/mo mid-tier)
  const saasMonthlyCost = 5000

  // ROI
  const netMonthlyBenefit = totalSavingsMonthly - saasMonthlyCost
  const roiPercent = saasMonthlyCost > 0 ? Math.round((totalSavingsMonthly / saasMonthlyCost) * 100) : 0
  const paybackDays = totalSavingsMonthly > 0 ? Math.ceil((saasMonthlyCost / totalSavingsMonthly) * 30) : 0

  // CO2 impact
  const monthlyCO2Saved = (totalSavingsMonthly / tariff) * co2Factor / 1000 // tonnes
  const annualCO2Saved = monthlyCO2Saved * 12

  // 6-month projection chart data
  const projection = []
  for (let m = 0; m < 6; m++) {
    // Savings grow slightly as system learns + more rooms optimized
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
