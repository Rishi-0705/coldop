import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET() {
  const savings = await db.savingsCounter.findUnique({ where: { id: 1 } })
  const config = await db.appConfig.findUnique({ where: { id: 1 } })
  const ghostEvents = await db.ghostLoadEvent.findMany({
    orderBy: { startTime: 'desc' },
    take: 100,
    include: { room: true },
  })
  const setbacks = await db.setbackEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { room: true },
  })

  const lines: string[] = []
  lines.push('ColdOps Savings Report — Marigold PJ Factory')
  lines.push(`Generated,${new Date().toISOString()}`)
  lines.push(`TNB Tariff (RM/kWh),${config?.tnbTariffRM || 0.509}`)
  lines.push('')
  lines.push('SUMMARY')
  lines.push(`Tonight Savings (RM),${savings?.tonightRM || 0}`)
  lines.push(`This Week Savings (RM),${savings?.thisWeekRM || 0}`)
  lines.push(`This Month Savings (RM),${savings?.thisMonthRM || 0}`)
  lines.push(`CO2 Avoided (tonnes),${savings?.co2Tonnes || 0}`)
  lines.push(`Ghost Load Hours,${savings?.ghostLoadHours || 0}`)
  lines.push('')
  lines.push('GHOST LOAD EVENTS')
  lines.push('Event ID,Room Code,Room Name,Start Time,End Time,Duration (hrs),Actual kW,Idle kW,RM Waste,Severity,Status,Rule')
  for (const ge of ghostEvents) {
    lines.push([
      ge.id,
      ge.room.code,
      `"${ge.room.name}"`,
      ge.startTime.toISOString(),
      ge.endTime?.toISOString() || '',
      ge.durationHours.toFixed(2),
      ge.actualKW,
      ge.expectedIdleKW,
      ge.rmWaste.toFixed(2),
      ge.severity,
      ge.status,
      ge.rule,
    ].join(','))
  }
  lines.push('')
  lines.push('SETBACK EVENTS')
  lines.push('Setback ID,Room Code,Room Name,Type,Start Setpoint,End Setpoint,Status,Reason,Started At,Completed At,RM Saved Est')
  for (const sb of setbacks) {
    const estSaved = sb.status === 'COMPLETED' && sb.room ? (sb.room.maxPowerKW * 0.4 * 0.509 * 8).toFixed(2) : '0'
    lines.push([
      sb.id,
      sb.room?.code || '',
      `"${sb.room?.name || ''}"`,
      sb.type,
      sb.startSetpoint,
      sb.endSetpoint,
      sb.status,
      sb.reason,
      sb.startedAt?.toISOString() || '',
      sb.completedAt?.toISOString() || '',
      estSaved,
    ].join(','))
  }

  const csv = lines.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="coldops-savings-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
