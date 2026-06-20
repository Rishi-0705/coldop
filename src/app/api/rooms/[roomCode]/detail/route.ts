import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'

const BMS_BASE = 'http://localhost:3004'

const MS_PER_DAY = 86400000

function daysToExpiry(expiry: Date): number {
  return Math.ceil((expiry.getTime() - Date.now()) / MS_PER_DAY)
}


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await params

    const room = await db.coldRoom.findUnique({
      where: { code: roomCode },
      include: {
        pallets: {
          orderBy: { expiryDate: 'asc' },
          include: { product: true },
        },
      },
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found', roomCode },
        { status: 404 },
      )
    }

    
    const [bmsRes, recentReadings, activeGhosts] = await Promise.all([
      fetch(`${BMS_BASE}/bms/rooms/${encodeURIComponent(roomCode)}`, {
        signal: AbortSignal.timeout(2500),
      }).catch(() => null),
      db.meterReading.findMany({
        where: { roomId: room.id },
        orderBy: { timestamp: 'desc' },
        take: 24,
      }),
      detectActiveGhostLoads(),
    ])

    let bms: any = null
    if (bmsRes && bmsRes.ok) {
      try {
        bms = await bmsRes.json()
      } catch {
        bms = null
      }
    }

    
    const pallets = room.pallets.map((p, idx) => ({
      id: p.id,
      lotNo: p.lotNo,
      productCode: p.productCode,
      productName: p.productName,
      bayCode: p.bayCode,
      quantity: p.quantity,
      expiryDate: p.expiryDate,
      receivedAt: p.receivedAt,
      allergenTags: p.allergenTags || '',
      quarantine: p.quarantine,
      daysToExpiry: daysToExpiry(p.expiryDate),
      fefoRank: idx + 1,
      category: p.product?.category || 'Uncategorized',
    }))

    
    const palletCount = room.pallets.length
    const capacityPallets = room.capacityPallets
    const utilizationPct =
      capacityPallets > 0
        ? Math.round((palletCount / capacityPallets) * 100)
        : 0

    const currentPowerKW =
      bms?.powerKW ??
      (recentReadings[0]?.powerKW ?? 0)

    
    
    const idleBaselineKW =
      recentReadings[0]?.idleBaselineKW && recentReadings[0].idleBaselineKW > 0
        ? recentReadings[0].idleBaselineKW
        : Math.round(room.maxPowerKW * 0.15 * 100) / 100

    const ghostDetection = activeGhosts.find(g => g.roomId === room.id)
    const isGhostLoad = !!ghostDetection

    
    const allergenSet = new Set<string>()
    for (const p of room.pallets) {
      for (const t of (p.allergenTags || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)) {
        allergenSet.add(t)
      }
    }
    const allergensPresent = Array.from(allergenSet).sort()

    
    let earliestExpiry: string | null = null
    let latestExpiry: string | null = null
    if (room.pallets.length > 0) {
      
      earliestExpiry = room.pallets[0].expiryDate.toISOString()
      latestExpiry = room.pallets[room.pallets.length - 1].expiryDate.toISOString()
    }

    
    
    const {
      pallets: _omitPallets,
      ...roomFields
    } = room

    return NextResponse.json({
      room: {
        ...roomFields,
        
        id: room.id,
        code: room.code,
        name: room.name,
        zone: room.zone,
        targetTemp: room.targetTemp,
        minSafeTemp: room.minSafeTemp,
        maxSafeTemp: room.maxSafeTemp,
        maxPowerKW: room.maxPowerKW,
        capacityPallets: room.capacityPallets,
        floorX: room.floorX,
        floorY: room.floorY,
        floorW: room.floorW,
        floorH: room.floorH,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
      bms,
      pallets,
      recentReadings: recentReadings.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        powerKW: r.powerKW,
        isProductionActive: r.isProductionActive,
        isGhostLoad: r.isGhostLoad,
        idleBaselineKW: r.idleBaselineKW,
      })),
      stats: {
        utilizationPct,
        palletCount,
        capacityPallets,
        currentPowerKW: Math.round(currentPowerKW * 100) / 100,
        idleBaselineKW,
        isGhostLoad,
        allergensPresent,
        earliestExpiry,
        latestExpiry,
      },
    })
  } catch (err: any) {
    console.error('[rooms/[roomCode]/detail GET] error:', err)
    return NextResponse.json(
      { error: 'Failed to load room detail', detail: err.message },
      { status: 500 },
    )
  }
}
