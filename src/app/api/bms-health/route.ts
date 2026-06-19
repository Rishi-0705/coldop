import { NextResponse } from 'next/server'
import { bmsHealth, bmsGetRooms } from '@/lib/bms/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const online = await bmsHealth()
  let rooms: any[] = []
  if (online) {
    try {
      rooms = await bmsGetRooms()
    } catch {}
  }
  return NextResponse.json({ online, rooms, count: rooms.length })
}
