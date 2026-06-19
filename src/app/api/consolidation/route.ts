import { NextResponse } from 'next/server'
import { planConsolidation } from '@/lib/coldops/detection'

export const dynamic = 'force-dynamic'

export async function GET() {
  const plan = await planConsolidation()
  return NextResponse.json({ plan })
}
