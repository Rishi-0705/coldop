import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectActiveGhostLoads, getRoomUtilization, severityScore, roomCriticality } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'


export async function GET() {
  const items: any[] = []

  
  const ghosts = await detectActiveGhostLoads()
  for (const g of ghosts) {
    items.push({
      id: `ghost-${g.roomId}`,
      category: 'Ghost Load',
      severity: g.severity,
      severityScore: g.severityScore,
      title: `${g.roomCode}: ${g.roomName}`,
      description: `${g.actualKW}kW draw vs ${g.expectedIdleKW}kW idle — ${g.rule.replace(/_/g, ' ')}`,
      roomCode: g.roomCode,
      rmImpact: g.rmWaste,
      rmPerHour: g.rmPerHour,
      actionType: 'APPROVE_SETBACK',
      timestamp: new Date().toISOString(),
      duration: g.durationHours,
    })
  }

  
  const utils = await getRoomUtilization()
  const consolidationCandidates = utils.filter(u => u.status === 'CONSOLIDATION')
  if (consolidationCandidates.length >= 2) {
    const totalKW = consolidationCandidates.reduce((s, r) => s + (r.capacityPallets * 0.85), 0)
    const rmWaste = totalKW * 8 * 0.509
    const sev = severityScore({
      rmWaste,
      durationHours: 8,
      safetyRisk: 0,
      roomCriticality: roomCriticality(consolidationCandidates[0].zone),
    })
    items.push({
      id: 'consolidation-1',
      category: 'Consolidation',
      severity: sev.bucket,
      severityScore: sev.score,
      title: `${consolidationCandidates.length} rooms below 25% utilization`,
      description: `${consolidationCandidates.map(c => c.roomCode).join(', ')} — consolidate to reduce energy waste`,
      roomCode: consolidationCandidates[0].roomCode,
      rmImpact: rmWaste,
      rmPerHour: rmWaste / 8,
      actionType: 'APPROVE_CONSOLIDATION',
      timestamp: new Date().toISOString(),
      duration: 8,
    })
  }

  
  const notifs = await db.notification.findMany({
    where: { status: 'OPEN', severity: { in: ['CRITICAL', 'HIGH'] } },
    orderBy: { severityScore: 'desc' },
    take: 10,
    include: { room: true },
  })
  for (const n of notifs) {
    
    if (n.type === 'GHOST_LOAD' && ghosts.find(g => g.roomCode === n.room?.code)) continue
    items.push({
      id: `notif-${n.id}`,
      category: n.type.replace(/_/g, ' '),
      severity: n.severity,
      severityScore: n.severityScore,
      title: n.title,
      description: n.message,
      roomCode: n.room?.code || null,
      rmImpact: n.rmImpact,
      rmPerHour: n.rmPerHour,
      actionType: n.actionType || 'NONE',
      timestamp: n.createdAt.toISOString(),
      duration: n.durationHours,
    })
  }

  
  const activeSetbacks = await db.setbackEvent.findMany({
    where: { status: 'EXECUTING' },
    include: { room: true },
  })
  for (const sb of activeSetbacks) {
    items.push({
      id: `setback-${sb.id}`,
      category: 'Active Setback',
      severity: 'MEDIUM',
      severityScore: 35,
      title: `${sb.room?.code}: Setback in progress`,
      description: `${sb.startSetpoint}°C → ${sb.endSetpoint}°C, step ${sb.currentStep}/${sb.totalSteps}`,
      roomCode: sb.room?.code || null,
      rmImpact: 0,
      rmPerHour: 0,
      actionType: 'NONE',
      timestamp: sb.startedAt?.toISOString() || sb.createdAt.toISOString(),
      duration: 0,
    })
  }

  
  items.sort((a, b) => b.severityScore - a.severityScore)
  const top10 = items.slice(0, 10)

  
  const stats = {
    total: items.length,
    critical: items.filter(i => i.severity === 'CRITICAL').length,
    high: items.filter(i => i.severity === 'HIGH').length,
    medium: items.filter(i => i.severity === 'MEDIUM').length,
    low: items.filter(i => i.severity === 'LOW').length,
    totalRmImpact: items.reduce((s, i) => s + (i.rmImpact || 0), 0),
  }

  return NextResponse.json({ items: top10, stats })
}
