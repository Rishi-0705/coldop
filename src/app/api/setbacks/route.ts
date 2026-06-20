import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET() {
  const setbacks = await db.setbackEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { room: { select: { code: true, name: true, zone: true, maxPowerKW: true } } },
  })

  const enriched = setbacks.map(s => {
    const steps = s.stepsJson ? JSON.parse(s.stepsJson) : []
    return {
      id: s.id,
      roomCode: s.room?.code,
      roomName: s.room?.name,
      zone: s.room?.zone,
      type: s.type,
      startSetpoint: s.startSetpoint,
      endSetpoint: s.endSetpoint,
      status: s.status,
      reason: s.reason,
      currentStep: s.currentStep,
      totalSteps: s.totalSteps,
      steps,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      abortedAt: s.abortedAt,
      abortReason: s.abortReason,
      workOrderId: s.workOrderId,
      maxPowerKW: s.room?.maxPowerKW,
      
      estRmSaved: s.status === 'COMPLETED' && s.room ? Math.round(s.room.maxPowerKW * 0.4 * 0.509 * 8 * 100) / 100 : 0,
    }
  })

  const stats = {
    total: setbacks.length,
    completed: setbacks.filter(s => s.status === 'COMPLETED').length,
    aborted: setbacks.filter(s => s.status === 'ABORTED').length,
    executing: setbacks.filter(s => s.status === 'EXECUTING').length,
    totalRmSaved: enriched.reduce((sum, s) => sum + s.estRmSaved, 0),
  }

  return NextResponse.json({ setbacks: enriched, stats })
}
