import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runSmartEngine, STOCK_TEMP_MAP, ScheduleConfig } from '@/lib/coldops/smart-engine'
import { planConsolidation } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'


const ZONE_TO_STOCK_TYPE: Record<string, string> = {
  CHILLED_STORAGE:  'CHILLED_STORAGE',
  BLAST_FREEZER:    'BLAST_FREEZER',
  DAIRY_WIP:        'DAIRY_WIP',
  FINISHED_GOODS:   'FINISHED_GOODS',
  RAW_MILK:         'RAW_MILK',
  JUICE_STORAGE:    'JUICE_STORAGE',
  DRY:              'DRY_GOODS',
}

const DEFAULT_SCHEDULE: ScheduleConfig = {
  peakStart: '08:00',
  peakEnd: '18:00',
  workStart: '07:00',
  workEnd: '22:00',
  shutdownTime: '23:00',
}


function detectFormat(header: string): 'new' | 'old' {
  const lower = header.toLowerCase()
  if (lower.includes('stock_type') || lower.includes('cooler_id')) return 'new'
  return 'old'
}

export async function POST(req: Request) {
  try {
    const data = await req.formData()
    const file = data.get('file') as File
    const scheduleRaw = data.get('schedule') as string | null
    const schedule: ScheduleConfig = scheduleRaw
      ? { ...DEFAULT_SCHEDULE, ...JSON.parse(scheduleRaw) }
      : DEFAULT_SCHEDULE

    if (!file) return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return NextResponse.json({ ok: false, error: 'File is empty or has no data rows' }, { status: 400 })

    const format = detectFormat(lines[0])
    let startIndex = 1

    
    const roomData: Record<string, { stockType: string; stockCount: number; maxCapacity: number }> = {}

    if (format === 'new') {
      
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim())
        if (parts.length < 4) continue
        const [coolerId, stockType, stockCountStr, maxCapacityStr] = parts
        const code = coolerId.toUpperCase()
        if (!roomData[code]) roomData[code] = { stockType: stockType.toUpperCase(), stockCount: 0, maxCapacity: 0 }
        roomData[code].stockCount += parseInt(stockCountStr, 10) || 0
        roomData[code].maxCapacity = Math.max(roomData[code].maxCapacity, parseInt(maxCapacityStr, 10) || 0)
        roomData[code].stockType = stockType.toUpperCase() 
      }
    } else {
      
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim())
        if (parts.length < 5) continue
        const binLocation = parts[0]
        const zoneType = parts[1]
        const maxCapacity = parseInt(parts[3], 10) || 0
        const currentCount = parseInt(parts[4], 10) || 0

        const match = binLocation.match(/^(CR-[0-9]+|RM-[A-Z]|WH[0-9]+)/i)
        if (!match) continue

        const code = match[0].toUpperCase()
        const stockType = ZONE_TO_STOCK_TYPE[zoneType] ?? 'CHILLED_STORAGE'

        if (!roomData[code]) roomData[code] = { stockType, stockCount: 0, maxCapacity: 0 }
        roomData[code].stockCount += currentCount
        roomData[code].maxCapacity += maxCapacity
        roomData[code].stockType = stockType
      }
    }

    let updatedRooms = 0

    
    for (const [code, entry] of Object.entries(roomData)) {
      const room = await db.coldRoom.findFirst({ where: { code } })
      if (!room) continue

      const existingPallets = await db.pallet.findMany({ where: { roomId: room.id } })
      const palletCount = entry.stockCount

      if (entry.maxCapacity > 0 && entry.maxCapacity !== room.capacityPallets) {
        await db.coldRoom.update({
          where: { id: room.id },
          data: { capacityPallets: entry.maxCapacity }
        })
      }

      if (palletCount < existingPallets.length) {
        const idsToRemove = existingPallets.slice(0, existingPallets.length - palletCount).map(p => p.id)
        await db.workOrderMove.deleteMany({ where: { palletId: { in: idsToRemove } } })
        await db.pallet.deleteMany({ where: { id: { in: idsToRemove } } })
      } else if (palletCount > existingPallets.length) {
        const toAdd = palletCount - existingPallets.length
        const now = Date.now()
        await db.pallet.createMany({
          data: Array.from({ length: toAdd }, (_, idx) => ({
            roomId: room.id,
            bayCode: `BIN-${now}-${idx}`,
            productCode: 'MARIGOLD-FM-1L',
            productName: entry.stockType.replace(/_/g, ' '),
            lotNo: `WMS-${now}-${idx}`,
            expiryDate: new Date(now + 30 * 86400000),
            allergenTags: '',
          })),
        })
      }
      updatedRooms++
    }

    
    const wmsData = Object.entries(roomData).map(([coolerCode, entry]) => ({
      coolerCode,
      stockType: entry.stockType,
      stockCount: entry.stockCount,
      maxCapacity: entry.maxCapacity,
    }))

    const engineResult = await runSmartEngine(wmsData, schedule)

    
    await db.notification.updateMany({
      where: { type: 'CONSOLIDATION_SUGGESTED', status: 'OPEN' },
      data: { status: 'DISMISSED', resolvedAt: new Date() },
    })

    const plan = await planConsolidation()
    if (plan && plan.netBenefitRM > 0) {
      const sourceList = plan.sourceRoomCodes.join(', ')
      await db.notification.create({
        data: {
          type: 'CONSOLIDATION_SUGGESTED',
          severity: plan.netBenefitRM >= 100 ? 'HIGH' : 'MEDIUM',
          severityScore: Math.min(99, Math.round(plan.netBenefitRM)),
          title: 'Stock Consolidation Opportunity',
          message: `Move ${plan.palletCount} pallets from ${sourceList} → ${plan.destRoomCode}. Saves RM ${plan.energySavingRM.toFixed(2)} in energy (net RM ${plan.netBenefitRM.toFixed(2)} after RM ${plan.laborCostRM.toFixed(2)} labour).`,
          roomId: plan.sourceRoomIds[0] ?? null,
          rmImpact: plan.netBenefitRM,
          rmPerHour: plan.energySavingRM / (plan.idleWindowHours || 8),
          durationHours: plan.idleWindowHours,
          actionType: 'GENERATE_WORK_ORDER',
        },
      })
    }

    return NextResponse.json({
      ok: true,
      format,
      message: `Processed ${format === 'new' ? 'new' : 'legacy'} WMS format. Updated ${updatedRooms} rooms. ${engineResult.actionableCount} temperature actions generated.`,
      engineResult,
    })
  } catch (error: any) {
    console.error('WMS Ingest error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
