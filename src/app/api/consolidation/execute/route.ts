import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { planConsolidation } from '@/lib/coldops/detection'
import { broadcast } from '@/lib/realtime/client'

export const dynamic = 'force-dynamic'

/**
 * Generate + persist a work order from the current consolidation plan.
 */
export async function POST() {
  const plan = await planConsolidation()
  if (!plan) {
    return NextResponse.json({ ok: false, error: 'No consolidation opportunity available' }, { status: 400 })
  }

  // Create opportunity record
  const opp = await db.consolidationOpportunity.create({
    data: {
      sourceRoomIds: plan.sourceRoomIds.join(','),
      destRoomId: plan.destRoomId,
      palletCount: plan.palletCount,
      estLaborMinutes: plan.estLaborMinutes,
      energySavingRM: plan.energySavingRM,
      laborCostRM: plan.laborCostRM,
      netBenefitRM: plan.netBenefitRM,
      idleWindowHours: plan.idleWindowHours,
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  // Create work order
  const destRoom = await db.coldRoom.findUnique({ where: { id: plan.destRoomId } })
  const wo = await db.workOrder.create({
    data: {
      type: 'CONSOLIDATION',
      roomId: plan.destRoomId,
      title: `Consolidate ${plan.sourceRoomCodes.join(', ')} → ${plan.destRoomCode}`,
      status: 'PENDING',
      assignedTo: 'Warehouse Team A',
      movesJson: JSON.stringify(plan.moves),
      totalMoves: plan.moves.length,
      completedMoves: 0,
      estLaborMinutes: plan.estLaborMinutes,
      rmSavedPerHour: Math.round((plan.energySavingRM / plan.idleWindowHours) * 100) / 100,
      createdAt: new Date(),
      assignedAt: new Date(),
      startedAt: new Date(),
    },
  })

  // Create move records
  for (const m of plan.moves) {
    await db.workOrderMove.create({
      data: {
        workOrderId: wo.id,
        palletId: m.palletId,
        lotNo: m.lotNo,
        productName: m.productName,
        fromRoomCode: m.fromRoomCode,
        fromBayCode: m.fromBayCode,
        toRoomCode: m.toRoomCode,
        toBayCode: m.toBayCode,
        sequence: m.sequence,
        fefoRank: m.fefoRank,
        allergenOk: m.allergenOk,
      },
    })
  }

  // Link opportunity → work order
  await db.consolidationOpportunity.update({
    where: { id: opp.id },
    data: { workOrderId: wo.id, status: 'EXECUTING' },
  })

  await broadcast('work-order-updated', {
    workOrderId: wo.id, status: 'PENDING', completedMoves: 0, totalMoves: plan.moves.length,
  })

  await broadcast('notification-new', {
    type: 'WORK_ORDER',
    severity: 'MEDIUM',
    severityScore: 40,
    title: `New work order: ${wo.title}`,
    message: `${plan.moves.length} pallets to move from ${plan.sourceRoomCodes.join(', ')} to ${plan.destRoomCode}. Est. ${plan.estLaborMinutes} min labor, RM ${plan.netBenefitRM} net benefit.`,
    rmImpact: plan.netBenefitRM,
    actionType: 'NONE',
    refId: wo.id,
    status: 'OPEN',
    channels: 'DASHBOARD,SMS',
    createdAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, workOrderId: wo.id, opportunityId: opp.id, plan })
}
