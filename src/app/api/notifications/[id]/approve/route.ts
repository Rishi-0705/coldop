import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/realtime/client'
import { startSetback } from '@/lib/coldops/setback'
import { planConsolidation, TNB_TARIFF, CO2_PER_KWH_KG } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'

async function handleAction(params: { id: string; action: 'APPROVE' | 'DEFER' | 'DISMISS' }) {
  const notif = await db.notification.findUnique({
    where: { id: params.id },
    include: { room: true },
  })
  if (!notif) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  const newStatus = params.action === 'APPROVE' ? 'APPROVED' : params.action === 'DEFER' ? 'DEFERRED' : 'DISMISSED'

  await db.notification.update({
    where: { id: params.id },
    data: { status: newStatus, resolvedAt: new Date() },
  })

  let sideEffect: any = null

  
  if (params.action === 'APPROVE' && notif.actionType === 'APPROVE_SETBACK' && notif.roomId) {
    const room = notif.room
    if (room) {
      const endSetpoint = Math.min(room.maxSafeTemp, room.targetTemp + 4)
      try {
        const result = await startSetback({
          roomId: room.id,
          endSetpoint,
          reason: 'GHOST_LOAD',
        })
        sideEffect = { type: 'SETBACK_STARTED', setbackId: result.setbackId, endSetpoint }

        
        const estSavingRM = notif.rmImpact > 0 ? notif.rmImpact : (notif.rmPerHour * 6)
        const estKwh = estSavingRM / TNB_TARIFF
        const estCo2 = (estKwh * CO2_PER_KWH_KG) / 1000
        await db.savingsCounter.upsert({
          where: { id: 1 },
          create: {
            id: 1,
            tonightRM: estSavingRM,
            thisWeekRM: estSavingRM,
            thisMonthRM: estSavingRM,
            co2Tonnes: estCo2,
            ghostLoadHours: notif.durationHours,
          },
          update: {
            tonightRM: { increment: estSavingRM },
            thisWeekRM: { increment: estSavingRM },
            thisMonthRM: { increment: estSavingRM },
            co2Tonnes: { increment: estCo2 },
            ghostLoadHours: { increment: notif.durationHours },
          },
        })
        await broadcast('savings-updated', {
          tonightRM: (await db.savingsCounter.findUnique({ where: { id: 1 } }))?.tonightRM,
        })
      } catch (e: any) {
        sideEffect = { type: 'SETBACK_FAILED', error: e.message }
      }
    }
  }

  
  if (
    params.action === 'APPROVE' &&
    (notif.actionType === 'APPROVE_CONSOLIDATION' || notif.actionType === 'GENERATE_WORK_ORDER') &&
    (notif.type === 'CONSOLIDATION_SUGGESTED' || notif.type === 'CONSOLIDATION')
  ) {
    try {
      const plan = await planConsolidation()
      if (plan && plan.moves.length > 0) {
        
        const wo = await db.workOrder.create({
          data: {
            type: 'CONSOLIDATION',
            title: `Consolidate ${plan.sourceRoomCodes.join(', ')} → ${plan.destRoomCode} (${plan.palletCount} pallets)`,
            status: 'PENDING',
            totalMoves: plan.moves.length,
            estLaborMinutes: plan.estLaborMinutes,
            rmSavedPerHour: plan.energySavingRM / (plan.idleWindowHours || 8),
            rmSaved: plan.netBenefitRM,
            movesJson: JSON.stringify(plan.moves),
          },
        })

        
        await db.workOrderMove.createMany({
          data: plan.moves.map(m => ({
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
          })),
        })

        
        const estKwh = plan.energySavingRM / TNB_TARIFF
        const estCo2 = (estKwh * CO2_PER_KWH_KG) / 1000
        await db.savingsCounter.upsert({
          where: { id: 1 },
          create: {
            id: 1,
            tonightRM: plan.netBenefitRM,
            thisWeekRM: plan.netBenefitRM,
            thisMonthRM: plan.netBenefitRM,
            co2Tonnes: estCo2,
            ghostLoadHours: 0,
          },
          update: {
            tonightRM: { increment: plan.netBenefitRM },
            thisWeekRM: { increment: plan.netBenefitRM },
            thisMonthRM: { increment: plan.netBenefitRM },
            co2Tonnes: { increment: estCo2 },
          },
        })

        await broadcast('savings-updated', {
          tonightRM: (await db.savingsCounter.findUnique({ where: { id: 1 } }))?.tonightRM,
        })
        await broadcast('work-order-updated', { workOrderId: wo.id })

        sideEffect = {
          type: 'WORK_ORDER_CREATED',
          workOrderId: wo.id,
          moves: plan.moves.length,
          rooms: plan.sourceRoomCodes,
          dest: plan.destRoomCode,
          netBenefitRM: plan.netBenefitRM,
        }
      } else {
        sideEffect = { type: 'CONSOLIDATION_NO_PLAN', message: 'No consolidation plan available at this time.' }
      }
    } catch (e: any) {
      sideEffect = { type: 'CONSOLIDATION_FAILED', error: e.message }
    }
  }

  await broadcast('notification-updated', {
    id: params.id,
    status: newStatus,
    action: params.action,
    sideEffect,
    updatedAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, status: newStatus, sideEffect })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handleAction({ id, action: 'APPROVE' })
}
