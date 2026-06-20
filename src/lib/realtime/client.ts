
const HUB_BASE = 'http://localhost:3003'

export type RealtimeEvent =
  | 'ghost-load-detected'
  | 'ghost-load-resolved'
  | 'savings-updated'
  | 'setback-progress'
  | 'setback-completed'
  | 'setback-aborted'
  | 'work-order-updated'
  | 'work-order-completed'
  | 'notification-new'
  | 'notification-updated'
  | 'room-status-changed'

export async function broadcast<T = unknown>(event: RealtimeEvent, payload: T): Promise<boolean> {
  try {
    const r = await fetch(`${HUB_BASE}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload }),
      signal: AbortSignal.timeout(2000),
    })
    return r.ok
  } catch (e) {
    console.warn('[realtime] broadcast failed:', e)
    return false
  }
}
