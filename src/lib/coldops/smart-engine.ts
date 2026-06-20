

import { db } from '@/lib/db'
import { planConsolidation, TNB_TARIFF, CO2_PER_KWH_KG } from '@/lib/coldops/detection'



export const STOCK_TEMP_MAP: Record<string, { min: number; max: number; label: string }> = {
  DAIRY:          { min: 2,   max: 4,   label: 'Dairy products' },
  RAW_MILK:       { min: 1,   max: 4,   label: 'Raw milk intake' },
  DAIRY_WIP:      { min: 2,   max: 4,   label: 'Dairy WIP' },
  JUICE:          { min: 2,   max: 6,   label: 'Juice & beverages' },
  JUICE_STORAGE:  { min: 2,   max: 6,   label: 'Juice storage' },
  FINISHED_GOODS: { min: 2,   max: 6,   label: 'Finished goods' },
  BLAST_FROZEN:   { min: -25, max: -15, label: 'Blast frozen goods' },
  BLAST_FREEZER:  { min: -25, max: -15, label: 'Blast freezer' },
  CHILLED:        { min: 2,   max: 6,   label: 'Chilled storage' },
  CHILLED_STORAGE:{ min: 2,   max: 6,   label: 'Chilled storage' },
  DRY_GOODS:      { min: 10,  max: 15,  label: 'Dry goods' },
}



export interface ScheduleConfig {
  peakStart: string    
  peakEnd: string
  workStart: string
  workEnd: string
  shutdownTime: string
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

function currentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export type TimeWindow = 'PEAK' | 'WORKING' | 'SHUTDOWN'

export function getTimeWindow(schedule: ScheduleConfig): TimeWindow {
  const now = currentMinutes()
  const peak1 = parseHHMM(schedule.peakStart)
  const peak2 = parseHHMM(schedule.peakEnd)
  const work1 = parseHHMM(schedule.workStart)
  const work2 = parseHHMM(schedule.workEnd)
  const shut  = parseHHMM(schedule.shutdownTime)

  if (now >= peak1 && now < peak2) return 'PEAK'
  if (now >= work1 && now < work2) return 'WORKING'
  if (now >= shut || now < work1)  return 'SHUTDOWN'
  return 'WORKING'
}



export interface CoolerInput {
  coolerId: string
  coolerCode: string
  stockType: string
  stockCount: number
  maxCapacity: number
  currentSetpoint: number
  minSafeTemp: number
  maxSafeTemp: number
  currentKW?: number
}

export interface CoolerRecommendation {
  coolerId: string
  coolerCode: string
  stockType: string
  stockCount: number
  maxCapacity: number
  utilisationPct: number
  currentSetpoint: number
  recommendedSetpoint: number
  deltaTemp: number
  estimatedKwhSavedPerHour: number
  estimatedRmSavedPerHour: number
  reason: string
  actionRequired: boolean
  timeWindow: TimeWindow
}

export function computeRecommendation(
  input: CoolerInput,
  timeWindow: TimeWindow,
): CoolerRecommendation {
  const { coolerId, coolerCode, stockType, stockCount, maxCapacity, currentSetpoint, minSafeTemp, maxSafeTemp } = input

  const utilPct = maxCapacity > 0 ? stockCount / maxCapacity : 0
  const tempSpec = STOCK_TEMP_MAP[stockType.toUpperCase()] ?? { min: 2, max: 6, label: stockType }

  let recommended: number
  let reason: string

  if (timeWindow === 'SHUTDOWN') {
    
    recommended = Math.min(maxSafeTemp, tempSpec.max)
    if (recommended > currentSetpoint) {
      reason = `Off-peak scheduled adjustment. Stock (${Math.round(utilPct * 100)}% full) will be stable overnight. Raising setpoint to ${recommended}°C will save significant compressor energy.`
    } else if (recommended < currentSetpoint) {
      reason = `Off-peak scheduled adjustment. Lowering setpoint to ${recommended}°C to ensure stock safety overnight.`
    } else {
      reason = `Off-peak scheduled adjustment. Maintaining setpoint at ${recommended}°C for overnight stability.`
    }
  } else if (timeWindow === 'PEAK') {
    
    recommended = Math.max(minSafeTemp, tempSpec.min)
    reason = `Peak operating hours. Keeping setpoint at minimum (${recommended}°C) for maximum safety margin during high activity.`
  } else {
    
    if (utilPct < 0.25) {
      
      recommended = +(tempSpec.min + (tempSpec.max - tempSpec.min) * 0.6).toFixed(1)
      reason = `Low stock level (${Math.round(utilPct * 100)}%). Raising setpoint to ${recommended}°C — less thermal mass means the room holds temperature with less energy.`
    } else if (utilPct > 0.75) {
      
      recommended = tempSpec.min
      reason = `High stock level (${Math.round(utilPct * 100)}%). Maintaining minimum setpoint (${recommended}°C) to protect full cold chain load.`
    } else {
      
      recommended = +((tempSpec.min + tempSpec.max) / 2).toFixed(1)
      reason = `Normal stock level (${Math.round(utilPct * 100)}%). Balanced setpoint at ${recommended}°C optimises energy vs cold chain safety.`
    }
  }

  
  recommended = Math.max(minSafeTemp, Math.min(maxSafeTemp, recommended))

  const deltaTemp = recommended - currentSetpoint
  
  const maxKW = input.currentKW ?? 15
  const estimatedKwhSavedPerHour = +(maxKW * 0.03 * deltaTemp).toFixed(2)
  const estimatedRmSavedPerHour = +(estimatedKwhSavedPerHour * TNB_TARIFF).toFixed(3)

  const actionRequired = Math.abs(recommended - currentSetpoint) >= 0.5

  return {
    coolerId,
    coolerCode,
    stockType,
    stockCount,
    maxCapacity,
    utilisationPct: Math.round(utilPct * 100),
    currentSetpoint,
    recommendedSetpoint: recommended,
    deltaTemp: +deltaTemp.toFixed(1),
    estimatedKwhSavedPerHour,
    estimatedRmSavedPerHour,
    reason,
    actionRequired,
    timeWindow,
  }
}



export interface EngineResult {
  timeWindow: TimeWindow
  coolerRecommendations: CoolerRecommendation[]
  actionableCount: number
  totalEstimatedRmSavedPerHour: number
  consolidationPlan: any | null
  generatedAt: string
}




export async function runSmartEngine(
  wmsData: { coolerCode: string; stockType: string; stockCount: number; maxCapacity: number }[],
  schedule: ScheduleConfig,
): Promise<EngineResult> {
  
  const timeWindow = 'SHUTDOWN'
  const rooms = await db.coldRoom.findMany()

  
  const recommendations: CoolerRecommendation[] = []

  for (const entry of wmsData) {
    const room = rooms.find(r => r.code.toUpperCase() === entry.coolerCode.toUpperCase())
    if (!room) continue

    const rec = computeRecommendation(
      {
        coolerId: room.id,
        coolerCode: room.code,
        stockType: entry.stockType,
        stockCount: entry.stockCount,
        maxCapacity: entry.maxCapacity,
        currentSetpoint: room.targetTemp,
        minSafeTemp: room.minSafeTemp,
        maxSafeTemp: room.maxSafeTemp,
        currentKW: room.maxPowerKW,
      },
      timeWindow,
    )
    recommendations.push(rec)

    
    await db.coldRoom.update({
      where: { id: room.id },
      data: {
        recommendedSetpoint: rec.recommendedSetpoint,
        aiReason: rec.reason,
        lastStockType: entry.stockType,
      },
    })
  }

  
  await db.notification.updateMany({
    where: { type: 'TEMP_ADJUSTMENT', status: 'OPEN' },
    data: { status: 'DISMISSED', resolvedAt: new Date() },
  })

  for (const rec of recommendations) {
    if (!rec.actionRequired) continue

    const isWarmUp = rec.deltaTemp > 0
    const scheduledTime = schedule.shutdownTime || '12:00 AM'
    const title = isWarmUp
      ? `${rec.coolerCode}: Raise setpoint to ${rec.recommendedSetpoint}°C at ${scheduledTime}`
      : `${rec.coolerCode}: Lower setpoint to ${rec.recommendedSetpoint}°C at ${scheduledTime}`

    const message = `${rec.reason} Estimated ${rec.estimatedRmSavedPerHour >= 0 ? 'saving' : 'cost'}: RM ${Math.abs(rec.estimatedRmSavedPerHour).toFixed(2)}/hr.`

    await db.notification.create({
      data: {
        type: 'TEMP_ADJUSTMENT',
        severity: Math.abs(rec.deltaTemp) >= 4 ? 'HIGH' : 'MEDIUM',
        severityScore: Math.min(99, Math.round(Math.abs(rec.deltaTemp) * 10 + rec.estimatedRmSavedPerHour * 5)),
        title,
        message,
        roomId: rec.coolerId,
        rmImpact: +(rec.estimatedRmSavedPerHour * 8).toFixed(2),
        rmPerHour: rec.estimatedRmSavedPerHour,
        durationHours: 8,
        actionType: 'APPROVE_SETBACK',
      },
    })
  }

  
  const consolidationPlan = await planConsolidation()

  const totalRM = recommendations.reduce((s, r) => s + r.estimatedRmSavedPerHour, 0)

  return {
    timeWindow,
    coolerRecommendations: recommendations,
    actionableCount: recommendations.filter(r => r.actionRequired).length,
    totalEstimatedRmSavedPerHour: +totalRM.toFixed(2),
    consolidationPlan,
    generatedAt: new Date().toISOString(),
  }
}
