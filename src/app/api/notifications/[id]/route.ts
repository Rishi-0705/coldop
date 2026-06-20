import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const notif = await db.notification.findUnique({
    where: { id },
    include: { room: true },
  })
  if (!notif) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  const detail: any = {
    notification: notif,
    related: null,
    timeline: [],
  }

  
  detail.timeline.push({
    at: notif.createdAt,
    event: 'CREATED',
    description: `Alert detected: ${notif.title}`,
  })
  if (notif.resolvedAt && notif.status !== 'OPEN') {
    detail.timeline.push({
      at: notif.resolvedAt,
      event: notif.status,
      description: `Marked as ${notif.status.toLowerCase()}`,
    })
  }

  
  if (notif.type === 'GHOST_LOAD' && notif.roomId) {
    const ghostEvents = await db.ghostLoadEvent.findMany({
      where: { roomId: notif.roomId },
      orderBy: { startTime: 'desc' },
      take: 5,
    })
    const setbacks = await db.setbackEvent.findMany({
      where: { roomId: notif.roomId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    
    for (const ge of ghostEvents) {
      detail.timeline.push({
        at: ge.startTime,
        event: 'GHOST_LOAD_DETECTED',
        description: `${ge.rule.replace(/_/g, ' ')} — ${ge.actualKW}kW vs ${ge.expectedIdleKW}kW idle baseline`,
        rmImpact: ge.rmWaste,
      })
      if (ge.endTime) {
        detail.timeline.push({
          at: ge.endTime,
          event: 'GHOST_LOAD_RESOLVED',
          description: `Resolved after ${ge.durationHours}h — ${formatRM(ge.rmWaste)} waste`,
        })
      }
    }
    for (const sb of setbacks) {
      detail.timeline.push({
        at: sb.startedAt || sb.createdAt,
        event: `SETBACK_${sb.status}`,
        description: `${sb.type}: ${sb.startSetpoint}°C → ${sb.endSetpoint}°C (${sb.reason.replace(/_/g, ' ')})`,
      })
    }
    detail.related = { type: 'GHOST_LOAD', ghostEvents, setbacks }
  } else if (notif.type === 'CONSOLIDATION' || notif.type === 'WORK_ORDER') {
    const workOrders = await db.workOrder.findMany({
      where: notif.refId ? { id: notif.refId } : { roomId: notif.roomId },
      include: { moves: { include: { pallet: true } }, room: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
    for (const wo of workOrders) {
      detail.timeline.push({
        at: wo.createdAt,
        event: 'WORK_ORDER_CREATED',
        description: `${wo.title} — ${wo.totalMoves} moves`,
      })
      if (wo.completedAt) {
        const elapsed = Math.round((wo.completedAt.getTime() - wo.createdAt.getTime()) / 60000)
        detail.timeline.push({
          at: wo.completedAt,
          event: 'WORK_ORDER_COMPLETED',
          description: `Completed in ${elapsed} min — ${formatRM(wo.rmSaved)} saved`,
        })
      }
    }
    detail.related = { type: 'WORK_ORDER', workOrders }
  } else if (notif.type === 'SETBACK' && notif.refId) {
    const setback = await db.setbackEvent.findUnique({
      where: { id: notif.refId },
      include: { room: true },
    })
    if (setback) {
      detail.timeline.push({
        at: setback.startedAt || setback.createdAt,
        event: `SETBACK_${setback.status}`,
        description: `${setback.startSetpoint}°C → ${setback.endSetpoint}°C`,
      })
    }
    detail.related = { type: 'SETBACK', setback }
  }

  
  detail.timeline.sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return NextResponse.json(detail)
}

function formatRM(v: number): string {
  return `RM ${v.toFixed(2)}`
}
