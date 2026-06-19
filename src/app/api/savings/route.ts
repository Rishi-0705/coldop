import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await db.savingsCounter.findUnique({ where: { id: 1 } })
  return NextResponse.json(s || { tonightRM: 0, thisWeekRM: 0, thisMonthRM: 0, co2Tonnes: 0, ghostLoadHours: 0 })
}
