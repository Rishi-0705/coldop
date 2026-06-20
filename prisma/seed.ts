/**
 * ColdOps seed — Marigold F&B factory demo data
 * Run: bun run db:seed
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const NOW = new Date()
const HOURS = (h: number) => new Date(NOW.getTime() + h * 3600 * 1000)
const DAYS = (d: number) => new Date(NOW.getTime() + d * 86400 * 1000)

async function main() {
  console.log('🌱 Seeding ColdOps demo data...')

  // ---- AppConfig ----
  await db.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

  // ---- SavingsCounter (always reset to seed values) ----
  await db.savingsCounter.upsert({
    where: { id: 1 },
    update: {
      tonightRM: 0,
      thisWeekRM: 0,
      thisMonthRM: 0,
      co2Tonnes: 0,
      ghostLoadHours: 0,
    },
    create: {
      id: 1,
      tonightRM: 0,
      thisWeekRM: 0,
      thisMonthRM: 0,
      co2Tonnes: 0,
      ghostLoadHours: 0,
    },
  })

  // ---- ColdRooms (8 rooms, Marigold PJ factory layout) ----
  const rooms = [
    { code: 'CR-01', name: 'Chilled Storage A', zone: 'Chilled', targetTemp: 4.0, minSafe: 1.0, maxSafe: 10.0, maxPowerKW: 45, cap: 40, x: 5, y: 10, w: 25, h: 22 },
    { code: 'CR-02', name: 'Chilled Storage B', zone: 'Chilled', targetTemp: 4.0, minSafe: 1.0, maxSafe: 10.0, maxPowerKW: 45, cap: 40, x: 33, y: 10, w: 25, h: 22 },
    { code: 'CR-03', name: 'Blast Freezer 1', zone: 'Blast', targetTemp: -18.0, minSafe: -25.0, maxSafe: -10.0, maxPowerKW: 90, cap: 20, x: 61, y: 10, w: 20, h: 22 },
    { code: 'CR-04', name: 'Blast Freezer 2', zone: 'Blast', targetTemp: -18.0, minSafe: -25.0, maxSafe: -10.0, maxPowerKW: 90, cap: 20, x: 84, y: 10, w: 14, h: 22 },
    { code: 'CR-05', name: 'Dairy WIP', zone: 'Dairy WIP', targetTemp: 2.0, minSafe: 0.0, maxSafe: 8.0, maxPowerKW: 30, cap: 24, x: 5, y: 40, w: 22, h: 18 },
    { code: 'CR-06', name: 'Finished Goods', zone: 'Finished Goods', targetTemp: 4.0, minSafe: 1.0, maxSafe: 10.0, maxPowerKW: 45, cap: 50, x: 30, y: 40, w: 28, h: 18 },
    { code: 'CR-07', name: 'Raw Milk Intake', zone: 'Raw Milk', targetTemp: 2.0, minSafe: 0.0, maxSafe: 6.0, maxPowerKW: 30, cap: 24, x: 61, y: 40, w: 18, h: 18 },
    { code: 'CR-08', name: 'Juice Storage', zone: 'Juice', targetTemp: 4.0, minSafe: 1.0, maxSafe: 12.0, maxPowerKW: 30, cap: 30, x: 82, y: 40, w: 16, h: 18 },
  ]

  for (const r of rooms) {
    await db.coldRoom.upsert({
      where: { code: r.code },
      update: {
        name: r.name, zone: r.zone, targetTemp: r.targetTemp,
        minSafeTemp: r.minSafe, maxSafeTemp: r.maxSafe,
        maxPowerKW: r.maxPowerKW, capacityPallets: r.cap,
        floorX: r.x, floorY: r.y, floorW: r.w, floorH: r.h,
      },
      create: {
        code: r.code, name: r.name, zone: r.zone, targetTemp: r.targetTemp,
        minSafeTemp: r.minSafe, maxSafeTemp: r.maxSafe,
        maxPowerKW: r.maxPowerKW, capacityPallets: r.cap,
        floorX: r.x, floorY: r.y, floorW: r.w, floorH: r.h,
      },
    })
  }
  console.log(`  ✓ ${rooms.length} cold rooms`)

  // ---- Product Specs (Marigold SKUs) ----
  const products = [
    { code: 'MARIGOLD-FM-1L', name: 'Marigold Fresh Milk 1L', cat: 'Dairy', min: 2, max: 6, life: 14, allergens: 'MILK', kg: 1000 },
    { code: 'MARIGOLD-FM-200ML', name: 'Marigold Fresh Milk 200ml', cat: 'Dairy', min: 2, max: 6, life: 14, allergens: 'MILK', kg: 800 },
    { code: 'MARIGOLD-YOG-500G', name: 'Marigold Yogurt 500g', cat: 'Dairy', min: 2, max: 6, life: 21, allergens: 'MILK', kg: 600 },
    { code: 'MARIGOLD-YOG-150G', name: 'Marigold Yogurt 150g (x12)', cat: 'Dairy', min: 2, max: 6, life: 21, allergens: 'MILK', kg: 900 },
    { code: 'MARIGOLD-CHEESE-250G', name: 'Marigold Cheddar Cheese 250g', cat: 'Dairy', min: 2, max: 8, life: 90, allergens: 'MILK', kg: 700 },
    { code: 'MARIGOLD-BUTTER-250G', name: 'Marigold Butter 250g', cat: 'Dairy', min: -2, max: 6, life: 120, allergens: 'MILK', kg: 700 },
    { code: 'MARIGOLD-JUICE-ORANGE-1L', name: 'Marigold Orange Juice 1L', cat: 'Juice', min: 2, max: 8, life: 30, allergens: '', kg: 1000 },
    { code: 'MARIGOLD-JUICE-APPLE-1L', name: 'Marigold Apple Juice 1L', cat: 'Juice', min: 2, max: 8, life: 30, allergens: '', kg: 1000 },
    { code: 'MARIGOLD-JUICE-MANGO-1L', name: 'Marigold Mango Juice 1L', cat: 'Juice', min: 2, max: 8, life: 30, allergens: '', kg: 1000 },
    { code: 'MARIGOLD-RAW-MILK', name: 'Raw Milk (Bulk)', cat: 'Raw Material', min: 0, max: 4, life: 2, allergens: 'MILK', kg: 1000 },
    { code: 'MARIGOLD-CREAM-1L', name: 'Marigold Cream 1L', cat: 'Dairy', min: 0, max: 4, life: 14, allergens: 'MILK', kg: 1000 },
    { code: 'MARIGOLD-STRAWBERRY-MILK-1L', name: 'Marigold Strawberry Milk 1L', cat: 'Dairy', min: 2, max: 6, life: 14, allergens: 'MILK', kg: 1000 },
    { code: 'MARIGOLD-CHOC-MILK-1L', name: 'Marigold Chocolate Milk 1L', cat: 'Dairy', min: 2, max: 6, life: 14, allergens: 'MILK', kg: 1000 },
    { code: 'MARIGOLD-SOY-MILK-1L', name: 'Marigold Soy Milk 1L', cat: 'Beverage', min: 2, max: 8, life: 21, allergens: 'SOY', kg: 1000 },
    { code: 'MARIGOLD-QUARANTINE-RETURN', name: 'Returned Stock (Quarantine)', cat: 'Raw Material', min: 2, max: 6, life: 7, allergens: 'MILK', kg: 1000, quarantine: true },
  ]

  for (const p of products) {
    await db.productSpec.upsert({
      where: { productCode: p.code },
      update: {},
      create: {
        productCode: p.code, productName: p.name, category: p.cat,
        minTemp: p.min, maxTemp: p.max, shelfLifeDays: p.life,
        allergenTags: p.allergens, quarantine: p.quarantine ?? false,
        palletKg: p.kg,
      },
    })
  }
  console.log(`  ✓ ${products.length} product specs`)

  // ---- Pallets distributed across rooms ----
  // We deliberately create an underutilization scenario:
  // CR-01: 6/40 (15%)  CR-02: 8/40 (20%)  CR-05: 4/24 (17%)  CR-08: 5/30 (17%)
  // CR-03: 14/20 (70%) CR-04: 12/20 (60%) CR-06: 38/50 (76%) CR-07: 18/24 (75%)
  const roomPalletCounts: Record<string, number> = {
    'CR-01': 6, 'CR-02': 8, 'CR-03': 14, 'CR-04': 12,
    'CR-05': 4, 'CR-06': 38, 'CR-07': 18, 'CR-08': 5,
  }

  // Map rooms to product categories for sensible assignment
  const roomProducts: Record<string, string[]> = {
    'CR-01': ['MARIGOLD-FM-1L', 'MARIGOLD-FM-200ML', 'MARIGOLD-STRAWBERRY-MILK-1L', 'MARIGOLD-CHOC-MILK-1L'],
    'CR-02': ['MARIGOLD-YOG-500G', 'MARIGOLD-YOG-150G', 'MARIGOLD-CHEESE-250G', 'MARIGOLD-BUTTER-250G'],
    'CR-03': ['MARIGOLD-FM-1L', 'MARIGOLD-CHEESE-250G', 'MARIGOLD-BUTTER-250G'],
    'CR-04': ['MARIGOLD-FM-1L', 'MARIGOLD-CREAM-1L', 'MARIGOLD-BUTTER-250G'],
    'CR-05': ['MARIGOLD-YOG-500G', 'MARIGOLD-CREAM-1L', 'MARIGOLD-RAW-MILK'],
    'CR-06': ['MARIGOLD-FM-1L', 'MARIGOLD-FM-200ML', 'MARIGOLD-STRAWBERRY-MILK-1L', 'MARIGOLD-CHOC-MILK-1L', 'MARIGOLD-YOG-500G', 'MARIGOLD-YOG-150G'],
    'CR-07': ['MARIGOLD-RAW-MILK', 'MARIGOLD-CREAM-1L'],
    'CR-08': ['MARIGOLD-JUICE-ORANGE-1L', 'MARIGOLD-JUICE-APPLE-1L', 'MARIGOLD-JUICE-MANGO-1L', 'MARIGOLD-SOY-MILK-1L'],
  }

  // Add 1 quarantine pallet to CR-06
  const allPallets: any[] = []
  let lotCounter = 1
  for (const [roomCode, count] of Object.entries(roomPalletCounts)) {
    const room = await db.coldRoom.findUnique({ where: { code: roomCode } })
    if (!room) continue
    const productCodes = roomProducts[roomCode]
    for (let i = 0; i < count; i++) {
      const productCode = productCodes[i % productCodes.length]
      const product = await db.productSpec.findUnique({ where: { productCode } })
      if (!product) continue
      const lotNo = `LOT-${String(lotCounter).padStart(4, '0')}`
      const bayCode = `${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}` // A1, A2, ..., B1, B2...
      const expiryDays = 3 + Math.floor(Math.random() * 60) // 3..63 days
      const isQuarantine = product.quarantine
      allPallets.push({
        lotNo,
        productCode,
        productName: product.productName,
        roomId: room.id,
        bayCode,
        quantity: 1,
        expiryDate: DAYS(expiryDays),
        allergenTags: product.allergenTags,
        quarantine: isQuarantine,
      })
      lotCounter++
    }
  }

  // Clear existing pallets (and dependent records) then insert
  await db.workOrderMove.deleteMany({})
  await db.consolidationOpportunity.deleteMany({})
  await db.setbackEvent.deleteMany({})
  await db.pallet.deleteMany({})
  await db.pallet.createMany({ data: allPallets })
  console.log(`  ✓ ${allPallets.length} pallets placed`)

  // ---- Production Schedule (last 24h + next 24h) ----
  await db.productionSchedule.deleteMany({})
  const lines = ['YOGURT-LINE-1', 'JUICE-LINE-2', 'MILK-LINE-1', 'CHEESE-LINE-1']
  // Today: morning + evening shifts, no night shift (this is the ghost load window)
  const schedules = [
    { line: 'YOGURT-LINE-1', batchId: 'YOG-B-2410', startTime: HOURS(-14), endTime: HOURS(-6), shift: 'Morning' },
    { line: 'JUICE-LINE-2', batchId: 'JCE-B-1108', startTime: HOURS(-12), endTime: HOURS(-4), shift: 'Morning' },
    { line: 'MILK-LINE-1', batchId: 'MLK-B-3312', startTime: HOURS(-10), endTime: HOURS(-2), shift: 'Evening' },
    { line: 'CHEESE-LINE-1', batchId: 'CHS-B-0990', startTime: HOURS(-9), endTime: HOURS(-1), shift: 'Evening' },
    // Tomorrow morning planned
    { line: 'YOGURT-LINE-1', batchId: 'YOG-B-2411', startTime: HOURS(10), endTime: HOURS(18), shift: 'Morning' },
    { line: 'MILK-LINE-1', batchId: 'MLK-B-3313', startTime: HOURS(14), endTime: HOURS(22), shift: 'Evening' },
  ]
  await db.productionSchedule.createMany({
    data: schedules.map(s => ({ ...s, active: true })),
  })
  console.log(`  ✓ ${schedules.length} production schedule entries`)

  // ---- Meter Readings (last 6 hours, 15-min intervals) ----
  // We deliberately inject ghost load on CR-01 and CR-02 (chilled rooms with low utilization)
  // from 2h ago to now (no production schedule active).
  await db.meterReading.deleteMany({})
  const roomList = await db.coldRoom.findMany()
  const readings: any[] = []
  for (let i = 24; i >= 0; i--) { // 24 readings = 6 hours at 15-min
    const ts = HOURS(-i * 0.25)
    const isProdActive = i <= 16 && i >= 12 // production ran between -3h and -4h ago (a 1h gap, then ghost load)
    for (const room of roomList) {
      const idleKW = room.maxPowerKW * 0.15
      // Ghost load: CR-01 and CR-02 are running full load from -3h to now (12 trailing readings = 3h, > min 2h)
      const isGhostRoom = (room.code === 'CR-01' || room.code === 'CR-02') && i < 12
      const actualKW = isGhostRoom
        ? room.maxPowerKW * 0.55 // full load
        : (isProdActive ? room.maxPowerKW * (0.4 + Math.random() * 0.2) : idleKW)
      readings.push({
        roomId: room.id,
        timestamp: ts,
        powerKW: Math.round(actualKW * 100) / 100,
        isProductionActive: isProdActive,
        isGhostLoad: isGhostRoom,
        idleBaselineKW: Math.round(idleKW * 100) / 100,
      })
    }
  }
  await db.meterReading.createMany({ data: readings })
  console.log(`  ✓ ${readings.length} meter readings (6h @ 15-min)`)

  // ---- Ghost Load Events (2 active + history) ----
  await db.ghostLoadEvent.deleteMany({})
  const cr01 = await db.coldRoom.findUnique({ where: { code: 'CR-01' } })
  const cr02 = await db.coldRoom.findUnique({ where: { code: 'CR-02' } })
  if (cr01 && cr02) {
    // Active ghost loads right now
    await db.ghostLoadEvent.create({
      data: {
        roomId: cr01.id, startTime: HOURS(-2), durationHours: 2,
        actualKW: 24.75, expectedIdleKW: 6.75,
        rmWaste: 18.32, severity: 'HIGH', severityScore: 72,
        status: 'ACTIVE', rule: 'OVERNIGHT_GHOST_LOAD',
      },
    })
    await db.ghostLoadEvent.create({
      data: {
        roomId: cr02.id, startTime: HOURS(-3), durationHours: 3,
        actualKW: 24.75, expectedIdleKW: 6.75,
        rmWaste: 27.48, severity: 'CRITICAL', severityScore: 88,
        status: 'ACTIVE', rule: 'OVERNIGHT_GHOST_LOAD',
      },
    })
    // Past resolved events
    await db.ghostLoadEvent.create({
      data: {
        roomId: cr01.id, startTime: HOURS(-26), endTime: HOURS(-22), durationHours: 4,
        actualKW: 24.75, expectedIdleKW: 6.75,
        rmWaste: 36.64, severity: 'HIGH', severityScore: 70,
        status: 'RESOLVED', rule: 'OVERNIGHT_GHOST_LOAD',
      },
    })
    await db.ghostLoadEvent.create({
      data: {
        roomId: cr02.id, startTime: HOURS(-50), endTime: HOURS(-46), durationHours: 4,
        actualKW: 24.75, expectedIdleKW: 6.75,
        rmWaste: 36.64, severity: 'MEDIUM', severityScore: 48,
        status: 'RESOLVED', rule: 'WEEKEND_GHOST_LOAD',
      },
    })
  }
  console.log(`  ✓ 4 ghost load events (2 active)`)

  // ---- Notifications (severity-sorted, mixed types) ----
  await db.notification.deleteMany({})
  const notifs = [
    { type: 'GHOST_LOAD', severity: 'CRITICAL', score: 88, title: 'Ghost Load: CR-02 Chilled Storage B', message: 'Compressors drawing 24.75 kW with no scheduled production for 3h. Est. RM 9.18/hr waste.', roomId: cr02?.id, rmImpact: 27.48, rmPerHour: 9.18, durationHours: 3, actionType: 'APPROVE_SETBACK' },
    { type: 'GHOST_LOAD', severity: 'HIGH', score: 72, title: 'Ghost Load: CR-01 Chilled Storage A', message: 'Compressors drawing 24.75 kW with no scheduled production for 2h. Est. RM 9.18/hr waste.', roomId: cr01?.id, rmImpact: 18.32, rmPerHour: 9.18, durationHours: 2, actionType: 'APPROVE_SETBACK' },
    { type: 'CONSOLIDATION', severity: 'HIGH', score: 64, title: 'Consolidation Opportunity: 4 rooms < 25%', message: 'CR-01, CR-02, CR-05, CR-08 are below 25% utilization. Net benefit RM 18.50/hr if consolidated to CR-06.', roomId: null, rmImpact: 18.50, rmPerHour: 18.50, actionType: 'APPROVE_CONSOLIDATION' },
    { type: 'SAFETY', severity: 'MEDIUM', score: 42, title: 'FEFO Warning: LOT-0012 expiring in 3 days', message: 'Marigold Fresh Milk 1L in CR-06 Bay C3 expires in 3 days. Move to outbound priority.', roomId: null, rmImpact: 0, actionType: 'NONE' },
    { type: 'SETBACK', severity: 'MEDIUM', score: 35, title: 'Setback scheduled: CR-03 Blast Freezer 1', message: 'Auto-setback to -22°C planned for 02:00 tonight. Est. RM 4.20/hr saving.', roomId: null, rmImpact: 0, rmPerHour: 4.20, actionType: 'APPROVE_SETBACK' },
    { type: 'SYSTEM', severity: 'LOW', score: 12, title: 'BMS adapter connected', message: 'Siemens Desigo BMS adapter online. 8 rooms reporting.', roomId: null, rmImpact: 0, actionType: 'NONE' },
    { type: 'WORK_ORDER', severity: 'LOW', score: 18, title: 'Work order WO-2024-0142 completed', message: 'Consolidation CR-04 → CR-03 completed in 23 min. RM 6.40 saved.', roomId: null, rmImpact: 6.40, actionType: 'NONE', status: 'RESOLVED' },
  ]
  for (const n of notifs) {
    await db.notification.create({
      data: {
        type: n.type, severity: n.severity, severityScore: n.score,
        title: n.title, message: n.message,
        roomId: n.roomId ?? null,
        rmImpact: n.rmImpact, rmPerHour: n.rmPerHour ?? 0,
        durationHours: n.durationHours ?? 0,
        actionType: n.actionType,
        status: n.status ?? 'OPEN',
        channels: n.severity === 'CRITICAL' ? 'DASHBOARD,SMS,WHATSAPP' : n.severity === 'HIGH' ? 'DASHBOARD,EMAIL' : 'DASHBOARD',
      },
    })
  }
  console.log(`  ✓ ${notifs.length} notifications (severity-sorted)`)

  // ---- Work Orders (history) ----
  await db.workOrder.deleteMany({})
  await db.workOrder.create({
    data: {
      type: 'CONSOLIDATION', roomId: cr01?.id, title: 'Consolidate CR-04 → CR-03 (Blast Freezers)',
      status: 'COMPLETED', assignedTo: 'Warehouse Team A',
      movesJson: '[]', totalMoves: 4, completedMoves: 4,
      estLaborMinutes: 25, rmSavedPerHour: 16.20, rmSaved: 6.40,
      createdAt: HOURS(-3), assignedAt: HOURS(-3), startedAt: HOURS(-3), completedAt: HOURS(-2.6),
    },
  })
  await db.workOrder.create({
    data: {
      type: 'CONSOLIDATION', roomId: cr02?.id, title: 'Consolidate CR-01, CR-02 → CR-06',
      status: 'PENDING', assignedTo: null,
      movesJson: '[]', totalMoves: 14, completedMoves: 0,
      estLaborMinutes: 45, rmSavedPerHour: 18.50, rmSaved: 0,
      createdAt: HOURS(-0.5),
    },
  })
  console.log(`  ✓ 2 work orders`)

  console.log('🌱 Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
