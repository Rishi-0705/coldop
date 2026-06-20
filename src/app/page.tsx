'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRealtimeEvent, useRealtimeConnection } from '@/hooks/use-realtime'
import type {
  DashboardData, RoomWithBms, Notification, WorkOrder, ConsolidationPlan,
  ActiveSetback, Savings, AnalyticsData, MeterData,
  SetbackHistoryItem, ProductionScheduleData, ViewKey
} from '@/lib/coldops/types'
import { Sidebar, Footer, LoadingState } from '@/components/coldops/shared'
import { CommandCenter } from '@/components/coldops/command-center'
import { CameraScan } from '@/components/coldops/camera-scan'
import { ColdRoomMap } from '@/components/coldops/cold-room-map'
import { WorkOrdersView } from '@/components/coldops/work-orders'
import { NotificationsView } from '@/components/coldops/notifications'
import { AnalyticsView } from '@/components/coldops/analytics'
import { ScheduleView } from '@/components/coldops/schedule'
import { WmsView } from '@/components/coldops/wms'
import { LogsView } from '@/components/coldops/logs'
import { SettingsView } from '@/components/coldops/settings'
import { ViewTransition } from '@/components/coldops/motion'
import { QuickActions } from '@/components/coldops/quick-actions'
import { DemoTour } from '@/components/coldops/demo-tour'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BarChart3, Calendar, Package, Bell, ScrollText } from 'lucide-react'

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

  const fetchMeter = useCallback(async () => {
    try {
      const m = await fetch('/api/meter-readings?hours=6').then(r => r.json())
      setMeterData(m)
    } catch (e) {
      console.error('meter fetch failed', e)
    }
  }, [])

  const fetchSchedule = useCallback(async () => {
    try {
      const s = await fetch('/api/production-schedule').then(r => r.json())
      setSchedule(s)
    } catch (e) {
      console.error('schedule fetch failed', e)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    fetchMeter()
    const interval = setInterval(() => setTick(t => t + 1), 8000)
    return () => clearInterval(interval)
  }, [fetchAll, fetchMeter])

  useEffect(() => {
    if (tick > 0) fetchAll()
  }, [tick, fetchAll])

  useEffect(() => {
    if (view === 'command' && !analytics) fetchAnalytics()
    if (view === 'command' && !schedule) fetchSchedule()
  }, [view, analytics, schedule, fetchAnalytics, fetchSchedule])

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

  // Keyboard shortcuts: 1-5 for views, 6 for settings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const views: ViewKey[] = ['command', 'camera', 'map', 'workorders', 'logs', 'settings']
      const num = parseInt(e.key)
      if (num >= 1 && num <= 6) {
        setView(views[num - 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar
        view={view}
        onView={setView}
        notifCounts={notifCounts}
        bmsOnline={bmsOnline}
        realtimeConnected={realtimeConnected}
        savings={dashboard?.savings}
        onRefresh={() => { setLoading(true); fetchAll() }}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 container mx-auto px-6 py-6 max-w-[1400px]">
          {loading && !dashboard ? (
            <LoadingState />
          ) : (
            <ViewTransition viewKey={view}>
              {view === 'command' ? (
                <div className="space-y-6">
                  <CommandCenter dashboard={dashboard} rooms={rooms} activeSetbacks={activeSetbacks} meterData={meterData} onNeedMeter={fetchMeter} />
                  {/* Analytics + Schedule as tabs within Command Center */}
                  <Tabs defaultValue="analytics" className="w-full">
                    <TabsList>
                      <TabsTrigger value="analytics" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
                      <TabsTrigger value="schedule" className="text-xs gap-1.5"><Calendar className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
                    </TabsList>
                    <TabsContent value="analytics">
                      <AnalyticsView analytics={analytics} meterData={meterData} setbackHistory={setbackHistory} onRefresh={fetchAnalytics} />
                    </TabsContent>
                    <TabsContent value="schedule">
                      <ScheduleView schedule={schedule} onRefresh={fetchSchedule} />
                    </TabsContent>
                  </Tabs>
                </div>
              ) : view === 'camera' ? (
                <CameraScan />
              ) : view === 'map' ? (
                <div className="space-y-6">
                  <ColdRoomMap rooms={rooms} plan={plan} onExecutePlan={fetchAll} />
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold">WMS Stock Browser</h3>
                    <span className="text-xs text-muted-foreground">— search, filter, and manage pallet inventory</span>
                  </div>
                  <WmsView />
                </div>
              ) : view === 'workorders' ? (
                <div className="space-y-6">
                  <WorkOrdersView workOrders={workOrders} activeSetbacks={activeSetbacks} onComplete={fetchAll} />
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold">Notifications</h3>
                    <span className="text-xs text-muted-foreground">— severity-sorted alerts, approve to trigger automated response</span>
                  </div>
                  <NotificationsView notifs={notifs} counts={notifCounts} onAction={fetchAll} />
                </div>
              ) : view === 'logs' ? (
                <LogsView />
              ) : (
                <SettingsView />
              )}
            </ViewTransition>
          )}
        </main>
        <QuickActions notifs={notifs} onAction={fetchAll} />
        <DemoTour onViewChange={(v) => setView(v as ViewKey)} />
        <Footer />
      </div>
    </div>
  )
}
