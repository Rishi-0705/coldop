/**
 * Socket.io client hook for ColdOps real-time events.
 * Connects via the gateway with XTransformPort=3003.
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type ColdOpsEvent =
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

interface RealtimeState {
  connected: boolean
  lastEvent: { event: ColdOpsEvent; payload: any; at: number } | null
}

let socketSingleton: Socket | null = null
const listeners = new Map<ColdOpsEvent, Set<(payload: any) => void>>()

function getSocket(): Socket {
  if (socketSingleton) return socketSingleton
  socketSingleton = io({
    path: '/socket.io',
    query: { XTransformPort: 3003 },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })
  return socketSingleton
}

export function useRealtimeEvent(event: ColdOpsEvent, handler: (payload: any) => void) {
  useEffect(() => {
    const socket = getSocket()
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(handler)
    socket.on(event as string, handler)
    return () => {
      socket.off(event as string, handler)
      listeners.get(event)?.delete(handler)
    }
  }, [event, handler])
}

export function useRealtimeConnection() {
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    const socket = getSocket()
    const onConn = () => setConnected(true)
    const onDisc = () => setConnected(false)
    socket.on('connect', onConn)
    socket.on('disconnect', onDisc)
    // Use a microtask to avoid the synchronous-setState-in-effect lint rule
    if (socket.connected) {
      Promise.resolve().then(() => setConnected(true))
    }
    return () => {
      socket.off('connect', onConn)
      socket.off('disconnect', onDisc)
    }
  }, [])
  return connected
}

/**
 * Broadcast helper for client-side testing (rarely used; the server is normally the producer).
 * Calls the realtime hub directly via the gateway.
 */
export async function pushEvent(event: ColdOpsEvent, payload: any) {
  await fetch('/broadcast?XTransformPort=3003', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, payload }),
  })
}
