
import { db } from '@/lib/db'

export const TNB_TARIFF = 0.509 
export const CO2_PER_KWH_KG = 0.583 

export interface SeverityInput {
  rmWaste: number
  durationHours: number
  safetyRisk: number
  roomCriticality: number
}

export function severityScore(input: SeverityInput): { score: number; bucket: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' } {
  const score = Math.round(
    input.rmWaste * 0.5 +
    input.durationHours * 10 +
    input.safetyRisk +
    input.roomCriticality
  )
  const bucket =
    score >= 80 ? 'CRITICAL' :
    score >= 50 ? 'HIGH' :
    score >= 25 ? 'MEDIUM' : 'LOW'
  return { score, bucket }
}

export function roomCriticality(zone: string): number {
  switch (zone) {
    case 'Blast': return 20
    case 'Raw Milk': return 18
    case 'Dairy WIP': return 15
    case 'Chilled': return 10
    case 'Finished Goods': return 10
    case 'Juice': return 8
    default: return 5
  }
}

export interface GhostLoadDetection {
  roomId: string
  roomCode: string
  roomName: string
  actualKW: number
  expectedIdleKW: number
  durationHours: number
  rmWaste: number
  rmPerHour: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  severityScore: number
  rule: string
}

export async function detectActiveGhostLoads(): Promise<GhostLoadDetection[]> {
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  if (!config) return []
  const tariff = config.tnbTariffRM
  const thresholdPct = config.idleThresholdPct
  const minDurationH = config.minIdleDurationHours

  const rooms = await db.coldRoom.findMany()
  const now = new Date()
  const cutoff = new Date(now.getTime() - 6 * 3600 * 1000)

  const detections: GhostLoadDetection[] = []

  for (const room of rooms) {
    const readings = await db.meterReading.findMany({
      where: { roomId: room.id, timestamp: { gte: cutoff } },
      orderBy: { timestamp: 'desc' },
      take: 24,
    })
    if (readings.length === 0) continue

    const idleBaseline = readings[0].idleBaselineKW || room.maxPowerKW * 0.15
    const ghostThreshold = idleBaseline * (1 + thresholdPct)

    let trailingGhostReadings = 0
    for (const r of readings) {
      if (!r.isProductionActive && r.powerKW > ghostThreshold) {
        trailingGhostReadings++
      } else {
        break
      }
    }

    if (trailingGhostReadings === 0) continue
    const durationHours = trailingGhostReadings * 0.25
    if (durationHours < minDurationH) continue

    const recentKW = readings[0].powerKW
    const rmPerHour = (recentKW - idleBaseline) * tariff
    const rmWaste = rmPerHour * durationHours

    const hour = now.getHours()
    let rule = 'BETWEEN_BATCH'
    if (hour >= 22 || hour < 6) rule = 'OVERNIGHT_GHOST_LOAD'
    else if (now.getDay() === 0 || now.getDay() === 6) rule = 'WEEKEND_GHOST_LOAD'

    const sev = severityScore({
      rmWaste,
      durationHours,
      safetyRisk: 0,
      roomCriticality: roomCriticality(room.zone),
    })

    detections.push({
      roomId: room.id,
      roomCode: room.code,
      roomName: room.name,
      actualKW: recentKW,
      expectedIdleKW: idleBaseline,
      durationHours,
      rmWaste,
      rmPerHour,
      severity: sev.bucket,
      severityScore: sev.score,
      rule,
    })
  }

  return detections.sort((a, b) => b.severityScore - a.severityScore)
}

export interface RoomUtilization {
  roomId: string
  roomCode: string
  roomName: string
  zone: string
  targetTemp: number
  capacityPallets: number
  palletCount: number
  utilizationPct: number
  status: 'GHOST_LOAD' | 'CONSOLIDATION' | 'OPTIMIZED' | 'ACTIVE' | 'IDLE'
  hasGhostLoad: boolean
}

export async function getRoomUtilization(): Promise<RoomUtilization[]> {
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  const threshold = config?.consolidationThresholdPct ?? 0.25
  const rooms = await db.coldRoom.findMany({ include: { pallets: true } })
  const activeGhosts = await detectActiveGhostLoads()
  const ghostRoomIds = new Set(activeGhosts.map(g => g.roomId))

  return rooms.map(r => {
    const palletCount = r.pallets.length
    const utilizationPct = r.capacityPallets > 0 ? palletCount / r.capacityPallets : 0
    const hasGhostLoad = ghostRoomIds.has(r.id)
    let status: RoomUtilization['status'] = 'ACTIVE'
    if (hasGhostLoad) status = 'GHOST_LOAD'
    else if (utilizationPct < threshold) status = 'CONSOLIDATION'
    else if (utilizationPct < 0.4) status = 'IDLE'
    return {
      roomId: r.id,
      roomCode: r.code,
      roomName: r.name,
      zone: r.zone,
      targetTemp: r.targetTemp,
      capacityPallets: r.capacityPallets,
      palletCount,
      utilizationPct: Math.round(utilizationPct * 100),
      status,
      hasGhostLoad,
    }
  })
}

export interface ConsolidationMove {
  palletId: string
  lotNo: string
  productName: string
  fromRoomCode: string
  fromBayCode: string
  toRoomCode: string
  toBayCode: string
  sequence: number
  fefoRank: number
  allergenOk: boolean
}

export interface ConsolidationPlan {
  sourceRoomIds: string[]
  sourceRoomCodes: string[]
  destRoomId: string
  destRoomCode: string
  palletCount: number
  estLaborMinutes: number
  energySavingRM: number
  laborCostRM: number
  netBenefitRM: number
  idleWindowHours: number
  moves: ConsolidationMove[]
}


export async function planConsolidation(): Promise<ConsolidationPlan | null> {
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  if (!config) return null
  const threshold = config.consolidationThresholdPct
  const laborCostPerMin = config.laborCostPerMinuteRM
  const tariff = config.tnbTariffRM

  const utils = await getRoomUtilization()
  const candidates = utils.filter(u => u.utilizationPct < threshold * 100)
  if (candidates.length < 2) return null

  
  const byTempBand: Record<string, RoomUtilization[]> = {}
  for (const c of candidates) {
    const band = `${Math.round(c.targetTemp)}C`
    if (!byTempBand[band]) byTempBand[band] = []
    byTempBand[band].push(c)
  }

  let bestBand = ''
  let bestCount = 0
  for (const [band, rooms] of Object.entries(byTempBand)) {
    if (rooms.length >= 2 && rooms.length > bestCount) {
      bestCount = rooms.length
      bestBand = band
    }
  }
  if (!bestBand) return null

  const zoneRooms = byTempBand[bestBand]
  
  const targetTemp = zoneRooms[0].targetTemp
  const allRoomsInBand = utils.filter(u => Math.round(u.targetTemp) === Math.round(targetTemp))

  
  
  let dest: RoomUtilization | null = null
  let maxHeadroom = 0
  
  for (const r of allRoomsInBand) {
    if (zoneRooms.find(z => z.roomId === r.roomId)) continue 
    const headroom = r.capacityPallets - r.palletCount
    if (headroom > maxHeadroom) {
      maxHeadroom = headroom
      dest = r
    }
  }
  
  if (!dest) {
    for (const r of zoneRooms) {
      const headroom = r.capacityPallets - r.palletCount
      if (headroom > maxHeadroom) {
        maxHeadroom = headroom
        dest = r
      }
    }
  }
  if (!dest || maxHeadroom === 0) return null

  const sources = zoneRooms.filter(r => r.roomId !== dest.roomId)
  if (sources.length === 0) return null

  const sourceRoomIds = sources.map(s => s.roomId)
  const pallets = await db.pallet.findMany({
    where: { roomId: { in: sourceRoomIds } },
    orderBy: { expiryDate: 'asc' },
  })

  const destPallets = await db.pallet.findMany({ where: { roomId: dest.roomId } })
  const usedBays = new Set(destPallets.map(p => p.bayCode))
  const freeBays: string[] = []
  for (let row = 0; row < 10; row++) {
    for (let col = 1; col <= 6; col++) {
      const bay = `${String.fromCharCode(65 + row)}${col}`
      if (!usedBays.has(bay)) freeBays.push(bay)
    }
  }

  const destAllergens = new Set(
    destPallets.flatMap(p => (p.allergenTags || '').split(',').filter(Boolean))
  )

  const moves: ConsolidationMove[] = []
  let seq = 0
  let laborMin = 0
  for (const p of pallets) {
    if (seq >= maxHeadroom) break
    const bay = freeBays[seq]
    if (!bay) break
    if (p.quarantine) continue
    const palletAllergens = (p.allergenTags || '').split(',').filter(Boolean)
    const allergenOk = palletAllergens.length === 0 || palletAllergens.every(a => destAllergens.has(a)) || destAllergens.size === 0
    moves.push({
      palletId: p.id,
      lotNo: p.lotNo,
      productName: p.productName,
      fromRoomCode: sources.find(s => s.roomId === p.roomId)?.roomCode || '?',
      fromBayCode: p.bayCode,
      toRoomCode: dest.roomCode,
      toBayCode: bay,
      sequence: seq + 1,
      fefoRank: seq + 1,
      allergenOk,
    })
    seq++
    laborMin += 3
  }

  if (moves.length === 0) return null

  const sourceRoomRecords = await db.coldRoom.findMany({ where: { id: { in: sourceRoomIds } } })
  const totalSavingKW = sourceRoomRecords.reduce((s, r) => s + r.maxPowerKW * 0.85, 0)
  const idleWindowHours = 8
  const energySavingRM = totalSavingKW * idleWindowHours * tariff
  const laborCostRM = laborMin * laborCostPerMin
  const netBenefitRM = energySavingRM - laborCostRM

  return {
    sourceRoomIds,
    sourceRoomCodes: sources.map(s => s.roomCode),
    destRoomId: dest.roomId,
    destRoomCode: dest.roomCode,
    palletCount: moves.length,
    estLaborMinutes: laborMin,
    energySavingRM: Math.round(energySavingRM * 100) / 100,
    laborCostRM: Math.round(laborCostRM * 100) / 100,
    netBenefitRM: Math.round(netBenefitRM * 100) / 100,
    idleWindowHours,
    moves,
  }
}


export function buildRampSchedule(startSetpoint: number, endSetpoint: number, stepSeconds = 4, numSteps = 4) {
  const steps: { step: number; setpoint: number; atSec: number; confirmed: boolean }[] = []
  const delta = (endSetpoint - startSetpoint) / numSteps
  for (let i = 0; i <= numSteps; i++) {
    steps.push({
      step: i,
      setpoint: Math.round((startSetpoint + delta * i) * 10) / 10,
      atSec: i * stepSeconds,
      confirmed: false,
    })
  }
  return steps
}
