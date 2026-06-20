import { NextResponse } from 'next/server'
import { runSmartEngine, ScheduleConfig } from '@/lib/coldops/smart-engine'

export const dynamic = 'force-dynamic'

const DEFAULT_SCHEDULE: ScheduleConfig = {
  peakStart: '08:00',
  peakEnd: '18:00',
  workStart: '07:00',
  workEnd: '22:00',
  shutdownTime: '23:00',
}


export async function POST(req: Request) {
  try {
    const body = await req.json()
    const wmsData: { coolerCode: string; stockType: string; stockCount: number; maxCapacity: number }[] = body.wmsData ?? []
    const schedule: ScheduleConfig = { ...DEFAULT_SCHEDULE, ...(body.schedule ?? {}) }

    if (!wmsData.length) {
      return NextResponse.json({ ok: false, error: 'No WMS data provided' }, { status: 400 })
    }

    const result = await runSmartEngine(wmsData, schedule)

    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('Analyze error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
