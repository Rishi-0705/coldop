import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET() {
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000) 
  const events: any[] = []

  
  const ghostEvents = await db.ghostLoadEvent.findMany({
    where: { createdAt: { gte: cutoff } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { room: true },
  })
  for (const ge of ghostEvents) {
    events.push({
      id: `ghost-${ge.id}`,
      type: ge.status === 'ACTIVE' ? 'GHOST_LOAD_DETECTED' : 'GHOST_LOAD_RESOLVED',
      severity: ge.severity,
      title: `${ge.room.code} ${ge.status === 'ACTIVE' ? 'ghost load detected' : 'ghost load resolved'}`,
      description: `API Call: Detected ${ge.actualKW}kW draw vs ${ge.expectedIdleKW}kW idle baseline · ${ge.rule.replace(/_/g, ' ')}`,
      roomId: ge.roomId,
      roomCode: ge.room.code,
      rmImpact: ge.rmWaste,
      timestamp: (ge.endTime || ge.startTime).toISOString(),
      icon: ge.status === 'ACTIVE' ? 'Zap' : 'CheckCircle2',
    })
  }

  
  const setbacks = await db.setbackEvent.findMany({
    where: { createdAt: { gte: cutoff } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { room: true },
  })
  for (const sb of setbacks) {
    const isCompleted = sb.status === 'COMPLETED'
    const isAborted = sb.status === 'ABORTED'
    const estSaved = isCompleted && sb.room ? sb.room.maxPowerKW * 0.4 * 0.509 * 8 : 0
    events.push({
      id: `setback-${sb.id}`,
      type: `SETBACK_${sb.status}`,
      severity: isAborted ? 'HIGH' : isCompleted ? 'LOW' : 'MEDIUM',
      title: `${sb.room?.code || '?'} setback ${sb.status.toLowerCase()}`,
      description: `API Call: Changed temperature from ${sb.startSetpoint}°C to ${sb.endSetpoint}°C · ${sb.reason.replace(/_/g, ' ')}${isAborted && sb.abortReason ? ` · ${sb.abortReason}` : ''}`,
      roomId: sb.roomId,
      roomCode: sb.room?.code,
      rmImpact: estSaved,
      timestamp: (sb.completedAt || sb.abortedAt || sb.startedAt || sb.createdAt).toISOString(),
      icon: isAborted ? 'AlertTriangle' : isCompleted ? 'CheckCircle2' : 'ThermometerSun',
    })
  }

  
  const workOrders = await db.workOrder.findMany({
    where: { createdAt: { gte: cutoff } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { room: true },
  })
  for (const wo of workOrders) {
    const isCompleted = wo.status === 'COMPLETED'
    events.push({
      id: `wo-${wo.id}`,
      type: isCompleted ? 'WORK_ORDER_COMPLETED' : 'WORK_ORDER_CREATED',
      severity: 'MEDIUM',
      title: `${wo.room?.code || '—'} work order ${isCompleted ? 'completed' : 'created'}`,
      description: `${wo.title} · ${wo.totalMoves} moves${isCompleted ? ` · ${wo.rmSaved.toFixed(2)} RM saved` : ''}`,
      roomId: wo.roomId,
      roomCode: wo.room?.code,
      rmImpact: isCompleted ? wo.rmSaved : 0,
      timestamp: (wo.completedAt || wo.createdAt).toISOString(),
      icon: isCompleted ? 'CheckCircle2' : 'ClipboardList',
    })
  }

  
  const notifs = await db.notification.findMany({
    where: {
      createdAt: { gte: cutoff },
      status: { not: 'OPEN' },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: { room: true },
  })
  for (const n of notifs) {
    events.push({
      id: `notif-${n.id}`,
      type: `NOTIFICATION_${n.status}`,
      severity: n.severity,
      title: `${n.type.replace(/_/g, ' ')} ${n.status.toLowerCase()}`,
      description: n.title,
      roomId: n.roomId,
      roomCode: n.room?.code,
      rmImpact: n.rmImpact,
      timestamp: (n.resolvedAt || n.updatedAt).toISOString(),
      icon: n.status === 'APPROVED' ? 'Check' : n.status === 'DISMISSED' ? 'X' : 'Clock',
    })
  }

  
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  
  const stats = {
    total: events.length,
    last24h: events.filter(e => new Date(e.timestamp) > new Date(Date.now() - 24 * 3600 * 1000)).length,
    byType: events.reduce((acc, e) => {
      const key = e.type.split('_')[0]
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    totalRmImpact: events.reduce((s, e) => s + (e.rmImpact || 0), 0),
  }

  return NextResponse.json({ events: events.slice(0, 50), stats })
}
