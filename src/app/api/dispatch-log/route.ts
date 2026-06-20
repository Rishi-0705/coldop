import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'


export async function GET() {
  const notifs = await db.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { room: true },
  })

  
  const log = notifs
    .filter(n => n.channels && n.channels !== 'DASHBOARD')
    .map(n => {
      const channels = n.channels.split(',').filter(c => c !== 'DASHBOARD')
      return channels.map(ch => {
        const isCritical = n.severity === 'CRITICAL'
        const isHigh = n.severity === 'HIGH'
        
        const recipients: Record<string, { to: string; name: string }> = {
          SMS: { to: '+60 12-345 6789', name: 'Shift Supervisor' },
          WHATSAPP: { to: '+60 12-345 6789', name: 'Warehouse Team A' },
          EMAIL: { to: 'ops@marigold.com.my', name: 'Operations Team' },
        }
        const rec = recipients[ch] || recipients.EMAIL
        return {
          id: `${n.id}-${ch}`,
          notificationId: n.id,
          channel: ch,
          recipient: rec.to,
          recipientName: rec.name,
          subject: n.title,
          message: n.message,
          severity: n.severity,
          rmImpact: n.rmImpact,
          roomCode: n.room?.code || null,
          status: n.status === 'OPEN' ? (isCritical ? 'DELIVERED' : 'SENT') : 'ACKNOWLEDGED',
          sentAt: n.createdAt.toISOString(),
          acknowledgedAt: n.resolvedAt?.toISOString() || null,
        }
      })
    })
    .flat()

  
  const stats = {
    total: log.length,
    byChannel: {
      SMS: log.filter(l => l.channel === 'SMS').length,
      WHATSAPP: log.filter(l => l.channel === 'WHATSAPP').length,
      EMAIL: log.filter(l => l.channel === 'EMAIL').length,
    },
    byStatus: {
      DELIVERED: log.filter(l => l.status === 'DELIVERED').length,
      SENT: log.filter(l => l.status === 'SENT').length,
      ACKNOWLEDGED: log.filter(l => l.status === 'ACKNOWLEDGED').length,
    },
    criticalDispatched: log.filter(l => l.severity === 'CRITICAL').length,
  }

  return NextResponse.json({ log, stats })
}
