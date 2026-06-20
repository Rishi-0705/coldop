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

export function ColdOpsApp({ initialView = 'ingestion' }: { initialView?: ViewKey }) {
  const [view, setView] = useState<ViewKey>(initialView)
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
      if (e.key === 'ArrowRight') handleSetView('workorders')
      if (e.key === 'ArrowLeft') handleSetView('ingestion')
      if (e.key === 'ArrowUp') handleSetView('command')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSetView = (newView: ViewKey) => {
    setView(newView)
    if (newView === 'ingestion') window.history.pushState(null, '', '/configure')
    if (newView === 'workorders') window.history.pushState(null, '', '/actions')
    if (newView === 'command') window.history.pushState(null, '', '/dashboard')
  }

  const pendingCount = Object.values(notifCounts).reduce((a, b) => a + b, 0)

  const goToActions = () => handleSetView('workorders')

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 20% 10%, rgba(14,165,233,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(16,185,129,0.05) 0%, transparent 55%), #F7F8FA' }}
    >
      <TopNav
        view={view}
        onView={handleSetView}
        pendingCount={pendingCount}
        savings={dashboard?.savings}
      />

      <main className={`flex-1 ${view === 'command' ? 'container mx-auto px-6 pt-[100px] pb-8 max-w-[1400px]' : 'pt-[100px] pb-20 px-6'}`}>
        {loading && !dashboard ? (
          <LoadingState />
        ) : (
          <ViewTransition viewKey={view}>
            {view === 'ingestion' ? (
              <DataIngestionView rooms={rooms} onAction={goToActions} />
            ) : view === 'workorders' ? (
              <ActionMenuView notifs={notifs} onAction={fetchAll} onViewDashboard={() => handleSetView('command')} />
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
