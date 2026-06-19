import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const MS_PER_DAY = 86400000

function daysToExpiry(expiry: Date): number {
  return Math.ceil((expiry.getTime() - Date.now()) / MS_PER_DAY)
}

/**
 * WMS Pallet Browser
 *
 * Returns filtered + sorted pallet inventory with FEFO ranks, plus global stats
 * (category/room/allergen breakdowns, expiringSoon, quarantineCount) and filter
 * facets (rooms with counts, distinct categories, distinct allergen tags).
 *
 * Stats are computed from the FULL inventory (unfiltered) so the UI can show
 * "X of Y pallets" context; only the `pallets[]` array reflects the active filter.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const roomCode = searchParams.get('roomCode')
    const productCode = searchParams.get('productCode')
    const allergen = searchParams.get('allergen')
    const expiringDaysRaw = searchParams.get('expiringDays')
    const expiringDays = expiringDaysRaw ? Number(expiringDaysRaw) : null
    const quarantine = searchParams.get('quarantine')
    const quarantineOnly = quarantine === 'true'
    const search = searchParams.get('search')?.trim() || ''
    const sort = searchParams.get('sort') || 'expiry'
    const limitRaw = searchParams.get('limit')
    const limit = limitRaw ? Math.max(1, Math.min(2000, Number(limitRaw))) : 500

    // Build the where clause using AND-array composition so multiple filters stack.
    const andClauses: Prisma.PalletWhereInput[] = []
    if (roomCode) {
      andClauses.push({ room: { code: roomCode } })
    }
    if (productCode) {
      andClauses.push({ productCode })
    }
    if (allergen) {
      if (allergen.toUpperCase() === 'NONE') {
        andClauses.push({ allergenTags: '' })
      } else {
        andClauses.push({ allergenTags: { contains: allergen } })
      }
    }
    if (expiringDays !== null && !Number.isNaN(expiringDays)) {
      const cutoff = new Date(Date.now() + expiringDays * MS_PER_DAY)
      andClauses.push({ expiryDate: { lte: cutoff } })
    }
    if (quarantineOnly) {
      andClauses.push({ quarantine: true })
    }
    if (search) {
      andClauses.push({
        OR: [
          { lotNo: { contains: search } },
          { productName: { contains: search } },
          { productCode: { contains: search } },
        ],
      })
    }
    const where: Prisma.PalletWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {}

    // Determine orderBy for the result list.
    let orderBy: Prisma.PalletOrderByWithRelationInput
    if (sort === 'received') {
      orderBy = { receivedAt: 'desc' }
    } else if (sort === 'product') {
      orderBy = { productName: 'asc' }
    } else {
      // default: expiry ascending (FEFO)
      orderBy = { expiryDate: 'asc' }
    }

    const [pallets, allPallets, allRooms] = await Promise.all([
      db.pallet.findMany({
        where,
        include: { room: true, product: true },
        orderBy,
        take: limit,
      }),
      // Global pallet set for stats (unfiltered).
      db.pallet.findMany({
        include: { room: true, product: true },
      }),
      db.coldRoom.findMany({
        include: { _count: { select: { pallets: true } } },
        orderBy: { code: 'asc' },
      }),
    ])

    // FEFO rank: 1-based index when the filtered set is sorted by expiry asc.
    // Computed independently of the user's chosen sort so rank always reflects
    // pickup priority, not display order.
    const expirySorted = [...pallets].sort(
      (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime(),
    )
    const fefoRankMap = new Map<string, number>()
    expirySorted.forEach((p, i) => fefoRankMap.set(p.id, i + 1))

    const shapedPallets = pallets.map(p => ({
      id: p.id,
      lotNo: p.lotNo,
      productCode: p.productCode,
      productName: p.productName,
      roomCode: p.room.code,
      roomName: p.room.name,
      bayCode: p.bayCode,
      quantity: p.quantity,
      expiryDate: p.expiryDate,
      receivedAt: p.receivedAt,
      allergenTags: p.allergenTags || '',
      quarantine: p.quarantine,
      daysToExpiry: daysToExpiry(p.expiryDate),
      fefoRank: fefoRankMap.get(p.id) || 0,
      category: p.product?.category || 'Uncategorized',
    }))

    // Aggregate stats from the full inventory.
    const byCategory: Record<string, number> = {}
    const byRoom: Record<string, number> = {}
    const allergenBreakdown: Record<string, number> = {}
    let expiringSoonCount = 0
    let quarantineCount = 0
    const soonCutoff = new Date(Date.now() + 7 * MS_PER_DAY)

    for (const p of allPallets) {
      const cat = p.product?.category || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + 1
      byRoom[p.room.code] = (byRoom[p.room.code] || 0) + 1

      if (p.expiryDate <= soonCutoff) expiringSoonCount++
      if (p.quarantine) quarantineCount++

      const tags = (p.allergenTags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
      if (tags.length === 0) {
        allergenBreakdown['none'] = (allergenBreakdown['none'] || 0) + 1
      } else {
        for (const t of tags) {
          allergenBreakdown[t] = (allergenBreakdown[t] || 0) + 1
        }
      }
    }

    // Filter facets — drive the sidebar / dropdowns in the WMS browser UI.
    const roomsFilter = allRooms.map(r => ({
      code: r.code,
      name: r.name,
      count: r._count.pallets,
    }))
    const categoriesFilter = Object.keys(byCategory).sort()
    const allergensFilter = Object.keys(allergenBreakdown)
      .filter(a => a !== 'none')
      .sort()

    return NextResponse.json({
      pallets: shapedPallets,
      stats: {
        total: allPallets.length,
        byCategory,
        byRoom,
        expiringSoon: expiringSoonCount,
        quarantineCount,
        allergenBreakdown,
      },
      filters: {
        rooms: roomsFilter,
        categories: categoriesFilter,
        allergens: allergensFilter,
      },
    })
  } catch (err: any) {
    console.error('[wms/pallets GET] error:', err)
    return NextResponse.json(
      { error: 'Failed to load pallets', detail: err.message },
      { status: 500 },
    )
  }
}
