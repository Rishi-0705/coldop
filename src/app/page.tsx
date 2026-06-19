'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRealtimeEvent, useRealtimeConnection } from '@/hooks/use-realtime'
import type {
  DashboardData, RoomWithBms, Notification, WorkOrder, ConsolidationPlan,
  ActiveSetback, Savings, AnalyticsData, MeterData,
  SetbackHistoryItem, ProductionScheduleData
} from '@/lib/coldops/types'
import { TopBar, Footer, LoadingState } from '@/components/coldops/shared'
import { CommandCenter } from '@/components/coldops/command-center'
import { ColdRoomMap } from '@/components/coldops/cold-room-map'
import { WorkOrdersView } from '@/components/coldops/work-orders'
import { NotificationsView } from '@/components/coldops/notifications'
import { AnalyticsView } from '@/components/coldops/analytics'
import { ScheduleView } from '@/components/coldops/schedule'
import { WmsView } from '@/components/coldops/wms'
import { SettingsView } from '@/components/coldops/settings'
import type { ViewKey } from '@/lib/coldops/types'

// ============================================================================
// MAIN PAGE — orchestrates state + data fetching + realtime events, delegates
// rendering to view components under @/components/coldops/*.
// ============================================================================

export default function ColdOpsPage() {
  const [view, setView] = useState<ViewKey>('command')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [rooms, setRooms] = useState<RoomWithBms[]>([])
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [plan, setPlan] = useState<ConsolidationPlan | null>(null)
  const [activeSetbacks, setActiveSetbacks] = useState<ActiveSetback[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [meterData, setMeterData] = useState<MeterData | null>(null)
  const [setbackHistory, setSetbackHistory] = useState<SetbackHistoryItem[]>([])
  const [schedule, setSchedule] = useState<ProductionScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifCounts, setNotifCounts] = useState<Record<string, number>>({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 })
  const [bmsOnline, setBmsOnline] = useState(true)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [tick, setTick] = useState(0)

  const fetchAll = useCallback(async () => {
    try {
      const [d, r, n, w, c, s, bh] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/rooms').then(r => r.json()),
        fetch('/api/notifications').then(r => r.json()),
        fetch('/api/work-orders').then(r => r.json()),
        fetch('/api/consolidation').then(r => r.json()),
        fetch('/api/setback/active').then(r => r.json()),
        fetch('/api/bms-health').then(r => r.json()),
      ])
      setDashboard(d)
      setRooms(r.rooms || [])
      setNotifs(n.notifications || [])
      setNotifCounts(n.counts || {})
      setWorkOrders(w.workOrders || [])
      setPlan(c.plan)
      setActiveSetbacks(s.active || [])
      setBmsOnline(bh.online)
    } catch (e) {
      console.error('fetch failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch analytics data when analytics view is opened
  const fetchAnalytics = useCallback(async () => {
    try {
      const [a, m, sh] = await Promise.all([
        fetch('/api/analytics').then(r => r.json()),
        fetch('/api/meter-readings?hours=6').then(r => r.json()),
        fetch('/api/setbacks').then(r => r.json()),
      ])
      setAnalytics(a)
      setMeterData(m)
      setSetbackHistory(sh.setbacks || [])
    } catch (e) {
      console.error('analytics fetch failed', e)
    }
  }, [])

  // Fetch meter data for the Command Center chart
  const fetchMeter = useCallback(async () => {
    try {
      const m = await fetch('/api/meter-readings?hours=6').then(r => r.json())
      setMeterData(m)
    } catch (e) {
      console.error('meter fetch failed', e)
    }
  }, [])

  // Fetch schedule data when schedule view is opened
  const fetchSchedule = useCallback(async () => {
    try {
      const s = await fetch('/api/production-schedule').then(r => r.json())
      setSchedule(s)
    } catch (e) {
      console.error('schedule fetch failed', e)
    }
  }, [])

  useEffect(() => {
    if (view === 'analytics' && !analytics) fetchAnalytics()
    if (view === 'schedule' && !schedule) fetchSchedule()
  }, [view, analytics, schedule, fetchAnalytics, fetchSchedule])

  useEffect(() => {
    fetchAll()
    fetchMeter()
    const interval = setInterval(() => setTick(t => t + 1), 8000)
    return () => clearInterval(interval)
  }, [fetchAll, fetchMeter])

  useEffect(() => {
    if (tick > 0) fetchAll()
  }, [tick, fetchAll])

  // Real-time events
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
  useRealtimeEvent('notification-updated', (p: { id: string; status: string }) => {
    setNotifs(prev => prev.map(n => n.id === p.id ? { ...n, status: p.status as Notification['status'] } : n))
    fetchAll()
  })
  useRealtimeEvent('setback-progress', () => {
    fetch('/api/setback/active').then(r => r.json()).then(s => setActiveSetbacks(s.active || []))
  })
  useRealtimeEvent('setback-completed', (p: { setbackId: string }) => {
    setActiveSetbacks(prev => prev.filter(s => s.setbackId !== p.setbackId))
    toast.success(`Setback completed — savings accumulating`)
    fetchAll()
  })
  useRealtimeEvent('setback-aborted', (p: { setbackId: string; reason: string }) => {
    setActiveSetbacks(prev => prev.filter(s => s.setbackId !== p.setbackId))
    toast.error(`Setback aborted: ${p.reason}`)
    fetchAll()
  })
  useRealtimeEvent('work-order-completed', () => {
    fetchAll()
    toast.success('Work order completed')
  })
  useRealtimeEvent('work-order-updated', () => fetchAll())
  useRealtimeEvent('ghost-load-detected', () => fetchAll())
  useRealtimeEvent('room-status-changed', () => fetchAll())

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar
        view={view}
        onView={setView}
        notifCounts={notifCounts}
        bmsOnline={bmsOnline}
        realtimeConnected={realtimeConnected}
        savings={dashboard?.savings}
        onRefresh={() => { setLoading(true); fetchAll() }}
      />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-[1600px]">
        {loading && !dashboard ? (
          <LoadingState />
        ) : view === 'command' ? (
          <CommandCenter dashboard={dashboard} rooms={rooms} activeSetbacks={activeSetbacks} meterData={meterData} onNeedMeter={fetchMeter} />
        ) : view === 'map' ? (
          <ColdRoomMap rooms={rooms} plan={plan} onExecutePlan={fetchAll} />
        ) : view === 'workorders' ? (
          <WorkOrdersView workOrders={workOrders} activeSetbacks={activeSetbacks} onComplete={fetchAll} />
        ) : view === 'notifications' ? (
          <NotificationsView notifs={notifs} counts={notifCounts} onAction={fetchAll} />
        ) : view === 'analytics' ? (
          <AnalyticsView analytics={analytics} meterData={meterData} setbackHistory={setbackHistory} onRefresh={fetchAnalytics} />
        ) : view === 'schedule' ? (
          <ScheduleView schedule={schedule} onRefresh={fetchSchedule} />
        ) : view === 'wms' ? (
          <WmsView />
        ) : (
          <SettingsView />
        )}
      </main>
      <Footer />
    </div>
  )
}
