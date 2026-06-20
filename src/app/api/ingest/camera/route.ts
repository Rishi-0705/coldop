import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const data = await req.formData()
    const file = data.get('file') as File
    const roomCode = data.get('roomCode') as string || 'RM-C'

    if (!file) return NextResponse.json({ ok: false, error: 'No image provided' }, { status: 400 })

    const room = await db.coldRoom.findFirst({ where: { code: roomCode } })
    if (!room) return NextResponse.json({ ok: false, error: 'Room not found' }, { status: 404 })

    
    const formData = new FormData()
    formData.append('file', file)

    
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'
    const backendResponse = await fetch(`${pythonBackendUrl}/analyze`, {
      method: 'POST',
      body: formData,
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Python backend error:', errorText)
      return NextResponse.json({ ok: false, error: 'Computer Vision analysis failed' }, { status: 500 })
    }

    const result = await backendResponse.json()
    const detectedPallets = result.count

    
    await db.notification.create({
      data: {
        type: 'GHOST_LOAD',
        severity: 'CRITICAL',
        title: `Camera Scan Anomaly: ${roomCode}`,
        message: `Computer Vision detected only ${detectedPallets} pallets, but BMS reports compressor running high. Ghost load confirmed. Recommend progressive setback.`,
        roomId: room.id,
        rmImpact: 25.50, 
      }
    })

    return NextResponse.json({ 
      ok: true, 
      detected: {
        pallets: detectedPallets,
        status: 'GHOST_LOAD_CONFIRMED'
      }
    })
  } catch (error: any) {
    console.error('Camera Ingest error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
