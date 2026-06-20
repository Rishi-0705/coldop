
import type { Severity, RoomStatus } from '@/lib/coldops/types'

export function severityColor(sev: Severity): { bg: string; text: string; border: string; dot: string } {
  switch (sev) {
    case 'CRITICAL': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
    case 'HIGH': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' }
    case 'MEDIUM': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' }
    case 'LOW': return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-400' }
  }
}

export function roomStatusColor(status: RoomStatus): { bg: string; text: string; border: string; label: string } {
  switch (status) {
    case 'GHOST_LOAD': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Ghost Load' }
    case 'CONSOLIDATION': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Consolidate' }
    case 'OPTIMIZED': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Optimized' }
    case 'ACTIVE': return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300', label: 'Active' }
    case 'IDLE': return { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-300', label: 'Idle' }
  }
}

export function formatRM(v: number, withSymbol = true): string {
  const s = v.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return withSymbol ? `RM ${s}` : s
}

export function formatKW(v: number): string {
  return `${v.toFixed(1)} kW`
}

export function formatTemp(v: number): string {
  return `${v.toFixed(1)}°C`
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - d)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export function channelIcon(channels: string): string[] {
  return channels.split(',').filter(Boolean)
}
