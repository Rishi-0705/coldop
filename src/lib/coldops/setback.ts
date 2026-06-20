
import { db } from '@/lib/db'
import { bmsWriteSetpoint, bmsConfirmSetpoint, type BmsRoomState } from '@/lib/bms/client'
import { broadcast } from '@/lib/realtime/client'
import { buildRampSchedule } from '@/lib/coldops/detection'

interface ActiveSetback {
  setbackId: string
  roomId: string
  roomCode: string
  startSetpoint: number
  endSetpoint: number
  steps: { step: number; setpoint: number; atSec: number; confirmed: boolean }[]
  currentStep: number
  timers: NodeJS.Timeout[]
  aborted: boolean
}


const globalForSetback = globalThis as unknown as {
  __coldopsActiveSetbacks?: Map<string, ActiveSetback>
  __coldopsSetbackIdCounter?: number
}
if (!globalForSetback.__coldopsActiveSetbacks) {
  globalForSetback.__coldopsActiveSetbacks = new Map()
}
if (!globalForSetback.__coldopsSetbackIdCounter) {
  globalForSetback.__coldopsSetbackIdCounter = 1
}
const activeSetbacks = globalForSetback.__coldopsActiveSetbacks

export function getActiveSetbacks(): ActiveSetback[] {
  return Array.from(activeSetbacks.values())
}

export async function startSetback(opts: {
  roomId: string
  endSetpoint: number
  reason: string
  workOrderId?: string
}): Promise<{ setbackId: string; steps: { step: number; setpoint: number; atSec: number; confirmed: boolean }[] }> {
  const room = await db.coldRoom.findUnique({ where: { id: opts.roomId } })
  if (!room) throw new Error('Room not found')

  
  const safeEnd = Math.max(room.minSafeTemp, Math.min(room.maxSafeTemp, opts.endSetpoint))

  
  const steps = buildRampSchedule(room.targetTemp, safeEnd, 4, 4)
  const setbackId = `SB-${String(globalForSetback.__coldopsSetbackIdCounter++).padStart(4, '0')}`

  
  await db.setbackEvent.create({
    data: {
      id: setbackId,
      roomId: room.id,
      type: safeEnd > room.targetTemp ? 'SETBACK' : 'RECOVERY',
      startSetpoint: room.targetTemp,
      endSetpoint: safeEnd,
      status: 'EXECUTING',
      reason: opts.reason,
      stepsJson: JSON.stringify(steps),
      totalSteps: steps.length - 1,
      currentStep: 0,
      startedAt: new Date(),
      workOrderId: opts.workOrderId,
    },
  })

  const active: ActiveSetback = {
    setbackId,
    roomId: room.id,
    roomCode: room.code,
    startSetpoint: room.targetTemp,
    endSetpoint: safeEnd,
    steps,
    currentStep: 0,
    timers: [],
    aborted: false,
  }
  activeSetbacks.set(setbackId, active)

  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const t = setTimeout(async () => {
      if (active.aborted) return
      await executeStep(setbackId, step.step)
    }, step.atSec * 1000)
    active.timers.push(t)
  }

  
  const finalT = setTimeout(async () => {
    if (active.aborted) return
    await completeSetback(setbackId)
  }, steps[steps.length - 1].atSec * 1000 + 2000)
  active.timers.push(finalT)

  return { setbackId, steps }
}

async function executeStep(setbackId: string, stepIndex: number) {
  const active = activeSetbacks.get(setbackId)
  if (!active || active.aborted) return
  const step = active.steps[stepIndex]
  if (!step) return

  const requestId = `${setbackId}-S${stepIndex}`
  console.log(`[setback] ${setbackId} step ${stepIndex}: writing setpoint ${step.setpoint}°C to ${active.roomCode}`)

  
  const writeResult = await bmsWriteSetpoint(active.roomCode, step.setpoint, requestId)
  if (!writeResult.accepted) {
    console.warn(`[setback] ${setbackId} step ${stepIndex} REJECTED:`, writeResult.error)
    await abortSetback(setbackId, `BMS rejected setpoint: ${writeResult.error}`)
    return
  }

  
  await new Promise(r => setTimeout(r, 1000))
  if (active.aborted) return
  const confirm = await bmsConfirmSetpoint(active.roomCode, requestId)
  step.confirmed = confirm.confirmed

  
  await db.setbackEvent.update({
    where: { id: setbackId },
    data: {
      currentStep: stepIndex,
      stepsJson: JSON.stringify(active.steps),
    },
  })

  
  await broadcast('setback-progress', {
    setbackId,
    roomId: active.roomId,
    roomCode: active.roomCode,
    step: stepIndex,
    totalSteps: active.steps.length - 1,
    newSetpoint: step.setpoint,
    confirmed: confirm.confirmed,
    timestamp: new Date().toISOString(),
  })

  console.log(`[setback] ${setbackId} step ${stepIndex}: confirmed=${confirm.confirmed}`)
}

async function completeSetback(setbackId: string) {
  const active = activeSetbacks.get(setbackId)
  if (!active || active.aborted) return

  await db.setbackEvent.update({
    where: { id: setbackId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  
  await db.coldRoom.update({
    where: { id: active.roomId },
    data: { targetTemp: active.endSetpoint },
  })

  
  const room = await db.coldRoom.findUnique({ where: { id: active.roomId } })
  if (room) {
    const savingPerHour = room.maxPowerKW * 0.4 * 0.509 
    const savedTonight = Math.round(savingPerHour * 100) / 100

    
    const savings = await db.savingsCounter.findUnique({ where: { id: 1 } })
    if (savings) {
      const co2Kg = savedTonight / 0.509 * 0.583 
      await db.savingsCounter.update({
        where: { id: 1 },
        data: {
          tonightRM: savings.tonightRM + savedTonight,
          thisWeekRM: savings.thisWeekRM + savedTonight,
          thisMonthRM: savings.thisMonthRM + savedTonight,
          co2Tonnes: savings.co2Tonnes + (co2Kg / 1000),
          ghostLoadHours: savings.ghostLoadHours + 3,
        },
      })
      await broadcast('savings-updated', {
        tonightRM: Math.round((savings.tonightRM + savedTonight) * 100) / 100,
        thisWeekRM: Math.round((savings.thisWeekRM + savedTonight) * 100) / 100,
        thisMonthRM: Math.round((savings.thisMonthRM + savedTonight) * 100) / 100,
        co2Tonnes: Math.round((savings.co2Tonnes + co2Kg / 1000) * 100) / 100,
        ghostLoadHours: savings.ghostLoadHours + 3,
      })
    }

    
    await db.ghostLoadEvent.updateMany({
      where: { roomId: active.roomId, status: 'ACTIVE' },
      data: { status: 'RESOLVED', endTime: new Date() },
    })

    await broadcast('ghost-load-resolved', {
      setbackId,
      roomId: active.roomId,
      roomCode: active.roomCode,
      rmSaved: savedTonight * 8,
      durationHours: 3,
    })

    await broadcast('setback-completed', {
      setbackId,
      roomId: active.roomId,
      roomCode: active.roomCode,
      finalSetpoint: active.endSetpoint,
      rmSavedPerHour: savedTonight,
    })
  }

  
  for (const t of active.timers) clearTimeout(t)
  activeSetbacks.delete(setbackId)
  console.log(`[setback] ${setbackId} COMPLETED`)
}

async function abortSetback(setbackId: string, reason: string) {
  const active = activeSetbacks.get(setbackId)
  if (!active) return
  active.aborted = true

  
  const revertId = `${setbackId}-REVERT`
  await bmsWriteSetpoint(active.roomCode, active.startSetpoint, revertId)

  await db.setbackEvent.update({
    where: { id: setbackId },
    data: { status: 'ABORTED', abortedAt: new Date(), abortReason: reason },
  })

  await broadcast('setback-aborted', {
    setbackId,
    roomId: active.roomId,
    roomCode: active.roomCode,
    reason,
    revertedSetpoint: active.startSetpoint,
  })

  for (const t of active.timers) clearTimeout(t)
  activeSetbacks.delete(setbackId)
  console.warn(`[setback] ${setbackId} ABORTED: ${reason}`)
}


let monitorRunning = false
export function startSafetyMonitor() {
  if (monitorRunning) return
  monitorRunning = true
  setInterval(async () => {
    if (activeSetbacks.size === 0) return
    for (const [id, active] of activeSetbacks.entries()) {
      if (active.aborted) continue
      try {
        const r = await fetch(`http://localhost:3004/bms/rooms/${active.roomCode}`)
        if (!r.ok) continue
        const state: BmsRoomState = await r.json()
        const room = await db.coldRoom.findUnique({ where: { id: active.roomId } })
        if (!room) continue
        if (state.currentTemp < room.minSafeTemp || state.currentTemp > room.maxSafeTemp) {
          await abortSetback(id, `Temperature ${state.currentTemp}°C outside safe range [${room.minSafeTemp}, ${room.maxSafeTemp}]`)
        }
      } catch (e) {
        
      }
    }
  }, 1500)
}

startSafetyMonitor()
