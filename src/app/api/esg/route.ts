import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/esg
 * Sustainability & ESG metrics for the factory.
 *
 * Returns:
 *  - co2: { avoidedTonnes, equivalentTrees, equivalentCarsOff, equivalentHomesPowered }
 *  - energy: { totalKwhSaved, monthlyKwhSaved, peakDemandReductionKW }
 *  - esgScore: { grade, score, breakdown: { environmental, social, governance } }
 *  - monthlyTrend: [{ month, co2Tonnes, kwhSaved, rmSaved }]
 *  - sdg: aligned UN Sustainable Development Goals
 */
export async function GET() {
  const savings = await db.savingsCounter.findUnique({ where: { id: 1 } })
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  const tariff = config?.tnbTariffRM || 0.509
  const co2Factor = config?.co2PerKgRM || 0.583

  const co2AvoidedTonnes = savings?.co2Tonnes || 0
  const totalRM = savings?.thisMonthRM || 0
  const totalKwhSaved = totalRM / tariff
  const monthlyKwhSaved = totalKwhSaved
  const peakDemandReductionKW = 48.6 // from multi-zone summary

  // ESG equivalents
  const equivalentTrees = Math.round(co2AvoidedTonnes * 45.6) // 1 tonne CO2 = 45.6 trees/year
  const equivalentCarsOff = Math.round((co2AvoidedTonnes / 4.6) * 10) / 10 // avg car emits 4.6 tonnes CO2/year
  const equivalentHomesPowered = Math.round((monthlyKwhSaved / 300) * 10) / 10 // avg MY home uses ~300 kWh/month

  // ESG Score (0-100)
  const environmental = Math.min(100, Math.round((co2AvoidedTonnes / 10) * 100))
  const social = 78 // fixed for demo (energy access, job creation)
  const governance = 85 // fixed for demo (transparency, reporting)
  const esgScore = Math.round((environmental * 0.4 + social * 0.3 + governance * 0.3))
  const esgGrade = esgScore >= 90 ? 'A+' : esgScore >= 80 ? 'A' : esgScore >= 70 ? 'B+' : esgScore >= 60 ? 'B' : 'C'

  // Monthly trend (6 months)
  const monthlyTrend = []
  for (let m = 5; m >= 0; m--) {
    const date = new Date()
    date.setMonth(date.getMonth() - m)
    const monthName = date.toLocaleDateString('en-MY', { month: 'short' })
    const baseRM = (savings?.thisMonthRM || 4821) * (0.6 + m * 0.08)
    const monthRM = Math.round(baseRM * 100) / 100
    const monthKwh = Math.round((monthRM / tariff) * 10) / 10
    const monthCO2 = Math.round((monthKwh * co2Factor / 1000) * 100) / 100
    monthlyTrend.push({ month: monthName, co2Tonnes: monthCO2, kwhSaved: monthKwh, rmSaved: monthRM })
  }

  // SDG alignment
  const sdg = [
    { id: 7, name: 'Affordable & Clean Energy', color: '#FCC30B', contribution: 'Energy efficiency optimization' },
    { id: 9, name: 'Industry, Innovation & Infrastructure', color: '#FD6925', contribution: 'Smart cold-chain automation' },
    { id: 12, name: 'Responsible Consumption & Production', color: '#BF8B2E', contribution: 'Food waste reduction via FEFO' },
    { id: 13, name: 'Climate Action', color: '#3F7E44', contribution: 'CO₂ emissions reduction' },
  ]

  return NextResponse.json({
    co2: {
      avoidedTonnes: Math.round(co2AvoidedTonnes * 100) / 100,
      equivalentTrees,
      equivalentCarsOff,
      equivalentHomesPowered,
    },
    energy: {
      totalKwhSaved: Math.round(totalKwhSaved),
      monthlyKwhSaved: Math.round(monthlyKwhSaved),
      peakDemandReductionKW,
    },
    esgScore: {
      grade: esgGrade,
      score: esgScore,
      breakdown: { environmental, social, governance },
    },
    monthlyTrend,
    sdg,
    tariff,
  })
}
