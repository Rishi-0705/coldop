/**
 * BMS client — talks to the BMS Simulator mini-service on port 3004.
 * Server-side only (no XTransformPort needed; we're not in the browser).
 */
const BMS_BASE = 'http://localhost:3004'

export interface BmsRoomState {
  roomId: string
  name: string
  currentTemp: number
  setpoint: number
  compressorLoad: number
  powerKW: number
  doorOpen: boolean
  safeMinTemp: number
  safeMaxTemp: number
  status: 'active' | 'standby' | 'setback' | 'fault'
}

export async function bmsHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${BMS_BASE}/bms/health`, { signal: AbortSignal.timeout(2000) })
    return r.ok
  } catch {
    return false
  }
}

export async function bmsGetRooms(): Promise<BmsRoomState[]> {
  const r = await fetch(`${BMS_BASE}/bms/rooms`)
  if (!r.ok) throw new Error('BMS rooms fetch failed')
  return r.json()
}

export async function bmsGetRoom(roomCode: string): Promise<BmsRoomState | null> {
  const r = await fetch(`${BMS_BASE}/bms/rooms/${roomCode}`)
  if (!r.ok) return null
  return r.json()
}

export async function bmsWriteSetpoint(roomCode: string, setpoint: number, requestId: string): Promise<{ accepted: boolean; error?: string; setpoint?: number; currentTemp?: number }> {
  const r = await fetch(`${BMS_BASE}/bms/rooms/${roomCode}/setpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setpoint, requestId }),
  })
  const data = await r.json()
  if (!r.ok) return { accepted: false, error: data.error || 'UNKNOWN' }
  return { accepted: true, setpoint: data.setpoint, currentTemp: data.currentTemp }
}

export async function bmsConfirmSetpoint(roomCode: string, requestId: string): Promise<{ confirmed: boolean; setpoint?: number; currentTemp?: number }> {
  const r = await fetch(`${BMS_BASE}/bms/rooms/${roomCode}/setpoint/confirm?requestId=${requestId}`)
  const data = await r.json()
  return data
}

export async function bmsReset(): Promise<boolean> {
  const r = await fetch(`${BMS_BASE}/bms/reset`, { method: 'POST' })
  return r.ok
}
