import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET() {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000)
  const future = new Date(Date.now() + 24 * 3600 * 1000)

  const schedules = await db.productionSchedule.findMany({
    where: {
      active: true,
      OR: [
        { startTime: { gte: cutoff } },
        { endTime: { gte: cutoff } },
      ],
    },
    orderBy: { startTime: 'asc' },
  })

  
  const now = new Date()
  const lines = schedules.reduce((acc, s) => {
    if (!acc[s.line]) acc[s.line] = { line: s.line, current: null, next: null, batches: [] }
    acc[s.line].batches.push(s)
    if (s.startTime <= now && s.endTime >= now) acc[s.line].current = s
    if (s.startTime > now && !acc[s.line].next) acc[s.line].next = s
    return acc
  }, {} as Record<string, any>)

  const lineArray = Object.values(lines)

  
  
  const ghostWindows: { line: string; start: string; end: string; durationHours: number }[] = []
  for (const line of lineArray) {
    const batches = line.batches.sort((a: any, b: any) => a.startTime.getTime() - b.endTime.getTime())
    for (let i = 0; i < batches.length - 1; i++) {
      const gapStart = batches[i].endTime
      const gapEnd = batches[i + 1].startTime
      const gapHours = (gapEnd.getTime() - gapStart.getTime()) / 3600000
      if (gapHours >= 2 && gapEnd > now) {
        ghostWindows.push({
          line: line.line,
          start: gapStart.toISOString(),
          end: gapEnd.toISOString(),
          durationHours: Math.round(gapHours * 10) / 10,
        })
      }
    }
  }

  return NextResponse.json({
    schedules: schedules.map(s => ({
      id: s.id,
      line: s.line,
      batchId: s.batchId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      shift: s.shift,
      active: s.active,
    })),
    lines: lineArray,
    ghostWindows,
    now: now.toISOString(),
  })
}
