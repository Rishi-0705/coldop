import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/realtime/client'
import { startSetback } from '@/lib/coldops/setback'

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

  // If approving a GHOST_LOAD notification with APPROVE_SETBACK action, kick off a setback
  if (params.action === 'APPROVE' && notif.actionType === 'APPROVE_SETBACK' && notif.roomId) {
    const room = notif.room
    if (room) {
      // Setback end setpoint = +4°C from target (within safe range)
      const endSetpoint = Math.min(room.maxSafeTemp, room.targetTemp + 4)
      try {
        const result = await startSetback({
          roomId: room.id,
          endSetpoint,
          reason: 'GHOST_LOAD',
        })
        sideEffect = { type: 'SETBACK_STARTED', setbackId: result.setbackId, endSetpoint }
      } catch (e: any) {
        sideEffect = { type: 'SETBACK_FAILED', error: e.message }
      }
    }
  }

  // If approving a CONSOLIDATION notification, mark for work order generation (handled by consolidation API)
  if (params.action === 'APPROVE' && notif.actionType === 'APPROVE_CONSOLIDATION') {
    sideEffect = { type: 'CONSOLIDATION_QUEUED', message: 'Consolidation work order will be generated. Visit Cold Room Map to view plan.' }
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
