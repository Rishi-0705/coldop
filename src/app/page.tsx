'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRealtimeEvent, useRealtimeConnection } from '@/hooks/use-realtime'
import type {
  DashboardData, RoomWithBms, Notification, Savings, MeterData, ViewKey
} from '@/lib/coldops/types'
import { TopNav, Footer, LoadingState } from '@/components/coldops/shared'
import { DataIngestionView } from '@/components/coldops/data-ingestion'
import { ActionMenuView } from '@/components/coldops/action-menu'
import { ResultsDashboard } from '@/components/coldops/results-dashboard'
import { ViewTransition } from '@/components/coldops/motion'

export default function ColdOpsPage() {
  const [view, setView] = useState<ViewKey>('ingestion')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [rooms, setRooms] = useState<RoomWithBms[]>([])
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [notifCounts, setNotifCounts] = useState<Record<string, number>>({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 })
  const [meterData, setMeterData] = useState<MeterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [d, r, n] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/rooms').then(r => r.json()),
        fetch('/api/notifications').then(r => r.json()),
      ])
      setDashboard(d)
      setRooms(r.rooms || [])
      setNotifs(n.notifications || [])
      setNotifCounts(n.counts || {})
    } catch (e) {
      console.error('fetch failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMeter = useCallback(async () => {
    try {
      const m = await fetch('/api/meter-readings?hours=6').then(r => r.json())
      setMeterData(m)
    } catch (e) {
      console.error('meter fetch failed', e)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    fetchMeter()
    const interval = setInterval(() => { fetchAll(); fetchMeter() }, 30000)
    return () => clearInterval(interval)
  }, [fetchAll, fetchMeter])

  const conn = useRealtimeConnection()
  useEffect(() => setRealtimeConnected(conn), [conn])

  useRealtimeEvent('savings-updated', (p: Partial<Savings>) => {
    setDashboard(d => d ? { ...d, savings: { ...d.savings, ...p } as Savings } : d)
  })
  useRealtimeEvent('notification-new', (n: Notification) => {
    setNotifs(prev => [n, ...prev])
    setNotifCounts(prev => ({ ...prev, [n.severity]: (prev[n.severity] || 0) + 1 }))
    toast.info(`New ${n.severity.toLowerCase()} alert: ${n.title}`)
  })
  useRealtimeEvent('notification-updated', () => fetchAll())
  useRealtimeEvent('setback-completed', () => {
    toast.success('Setback completed — savings accumulating')
    fetchAll()
  })
  useRealtimeEvent('setback-aborted', (p: { reason: string }) => {
    toast.error(`Setback aborted: ${p.reason}`)
    fetchAll()
  })
  useRealtimeEvent('work-order-completed', () => {
    fetchAll()
    toast.success('Work order completed')
  })
  useRealtimeEvent('room-status-changed', () => fetchAll())

  // Keyboard: → = Actions, ← = Configure, ↑ = Dashboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') setView('workorders')
      if (e.key === 'ArrowLeft') setView('ingestion')
      if (e.key === 'ArrowUp') setView('command')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const pendingCount = Object.values(notifCounts).reduce((a, b) => a + b, 0)

  const goToActions = () => setView('workorders')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav
        view={view}
        onView={setView}
        pendingCount={pendingCount}
        savings={dashboard?.savings}
      />

      <main className="flex-1 container mx-auto px-6 py-8 max-w-[1400px]">
        {loading && !dashboard ? (
          <LoadingState />
        ) : (
          <ViewTransition viewKey={view}>
            {view === 'ingestion' ? (
              <DataIngestionView rooms={rooms} onAction={goToActions} />
            ) : view === 'workorders' ? (
              <ActionMenuView notifs={notifs} onAction={fetchAll} onViewDashboard={() => setView('command')} />
            ) : view === 'command' ? (
              <ResultsDashboard dashboard={dashboard} rooms={rooms} meterData={meterData} />
            ) : null}
          </ViewTransition>
        )}
      </main>

      <Footer />
    </div>
  )
}
