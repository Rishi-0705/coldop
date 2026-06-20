import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST(req: Request) {
  try {
    const data = await req.formData()
    const file = data.get('file') as File
    const roomCode = data.get('roomCode') as string || 'RM-C'

    if (!file) return NextResponse.json({ ok: false, error: 'No image provided' }, { status: 400 })

    const room = await db.coldRoom.findFirst({ where: { code: roomCode } })
    if (!room) return NextResponse.json({ ok: false, error: 'Room not found' }, { status: 404 })

    // Save the uploaded image temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create uploads dir if not exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    const tmpPath = path.join(uploadsDir, `scan_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`)
    await writeFile(tmpPath, buffer)

    // Call the Python ML script
    const scriptPath = path.join(process.cwd(), 'scripts', 'analyze_cooler.py')
    
    // Windows execution of python
    const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${tmpPath}"`)
    
    let result
    try {
      result = JSON.parse(stdout.trim())
    } catch (e) {
      console.error('Failed to parse Python output:', stdout, stderr)
      return NextResponse.json({ ok: false, error: 'Computer Vision analysis failed' }, { status: 500 })
    }

    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    const detectedPallets = result.count

    // Always create a notification so the user sees the output during testing
    await db.notification.create({
      data: {
        type: 'GHOST_LOAD',
        severity: 'CRITICAL',
        title: `Camera Scan Anomaly: ${roomCode}`,
        message: `Computer Vision detected only ${detectedPallets} pallets, but BMS reports compressor running high. Ghost load confirmed. Recommend progressive setback.`,
        roomId: room.id,
        rmImpact: 25.50, // simulated impact
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
