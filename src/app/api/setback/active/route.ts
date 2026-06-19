import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActiveSetbacks } from '@/lib/coldops/setback'
import { bmsGetRoom } from '@/lib/bms/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const active = getActiveSetbacks()
  const result = []
  for (const a of active) {
    const evt = await db.setbackEvent.findUnique({ where: { id: a.setbackId } })
    const bms = await bmsGetRoom(a.roomCode)
    result.push({
      setbackId: a.setbackId,
      roomId: a.roomId,
      roomCode: a.roomCode,
      startSetpoint: a.startSetpoint,
      endSetpoint: a.endSetpoint,
      currentStep: a.currentStep,
      totalSteps: a.steps.length - 1,
      steps: a.steps,
      aborted: a.aborted,
      bms: bms ? {
        currentTemp: bms.currentTemp,
        compressorLoad: bms.compressorLoad,
        powerKW: bms.powerKW,
        status: bms.status,
      } : null,
      event: evt,
    })
  }
  return NextResponse.json({ active: result })
}
