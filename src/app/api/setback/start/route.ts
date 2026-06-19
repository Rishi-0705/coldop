import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { startSetback, getActiveSetbacks } from '@/lib/coldops/setback'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setback/start
 * Body: { roomId, endSetpoint, reason }
 * Kicks off a progressive setback ramp.
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { roomId, endSetpoint, reason } = body
  if (!roomId || endSetpoint === undefined) {
    return NextResponse.json({ error: 'roomId and endSetpoint required' }, { status: 400 })
  }
  const result = await startSetback({
    roomId,
    endSetpoint: parseFloat(endSetpoint),
    reason: reason || 'MANUAL',
  })
  return NextResponse.json({ ok: true, ...result })
}
