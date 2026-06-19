import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcast } from '@/lib/realtime/client'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const notif = await db.notification.findUnique({ where: { id } })
  if (!notif) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

  await db.notification.update({
    where: { id },
    data: { status: 'DEFERRED', resolvedAt: new Date() },
  })

  await broadcast('notification-updated', {
    id, status: 'DEFERRED', action: 'DEFER', updatedAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, status: 'DEFERRED' })
}
