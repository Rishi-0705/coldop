'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Activity, Map as MapIcon, ClipboardList, Bell, Snowflake, Zap, TrendingDown,
  Leaf, AlertTriangle, CheckCircle2, Clock, ArrowRight, ArrowLeftRight,
  ThermometerSun, Gauge, Radio, Server, ChevronRight, Filter, X, Check,
  Smartphone, Mail, MessageSquare, Loader2, Power, RefreshCw, Package,
  ArrowDownToLine, ArrowUpFromLine, CircleDot, Layers
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { useRealtimeEvent, useRealtimeConnection } from '@/hooks/use-realtime'
import type {
  DashboardData, RoomWithBms, Notification, WorkOrder, ConsolidationPlan,
  ActiveSetback, Severity, ViewKey, Savings
} from '@/lib/coldops/types'
import {
  severityColor, roomStatusColor, formatRM, formatKW, formatTemp,
  formatDuration, timeAgo, channelIcon
} from '@/lib/coldops/ui'

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ColdOpsPage() {
  const [view, setView] = useState<ViewKey>('command')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [rooms, setRooms] = useState<RoomWithBms[]>([])
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [plan, setPlan] = useState<ConsolidationPlan | null>(null)
  const [activeSetbacks, setActiveSetbacks] = useState<ActiveSetback[]>([])
  const [loading, setLoading] = useState(true)
  const [notifCounts, setNotifCounts] = useState<Record<string, number>>({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 })
  const [bmsOnline, setBmsOnline] = useState(true)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [tick, setTick] = useState(0) // forces refetch every 5s

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

  useEffect(() => {
    fetchAll()
    const interval = setInterval(() => setTick(t => t + 1), 8000)
    return () => clearInterval(interval)
  }, [fetchAll])

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
          <CommandCenter dashboard={dashboard} rooms={rooms} activeSetbacks={activeSetbacks} />
        ) : view === 'map' ? (
          <ColdRoomMap rooms={rooms} plan={plan} onExecutePlan={fetchAll} />
        ) : view === 'workorders' ? (
          <WorkOrdersView workOrders={workOrders} activeSetbacks={activeSetbacks} onComplete={fetchAll} />
        ) : (
          <NotificationsView notifs={notifs} counts={notifCounts} onAction={fetchAll} />
        )}
      </main>
      <Footer />
    </div>
  )
}

// ============================================================================
// TOP BAR
// ============================================================================

function TopBar({
  view, onView, notifCounts, bmsOnline, realtimeConnected, savings, onRefresh,
}: {
  view: ViewKey
  onView: (v: ViewKey) => void
  notifCounts: Record<string, number>
  bmsOnline: boolean
  realtimeConnected: boolean
  savings?: Savings
  onRefresh: () => void
}) {
  const totalOpen = Object.values(notifCounts).reduce((a, b) => a + b, 0)
  const nav: { key: ViewKey; label: string; icon: any }[] = [
    { key: 'command', label: 'Command Center', icon: Activity },
    { key: 'map', label: 'Cold Room Map', icon: MapIcon },
    { key: 'workorders', label: 'Work Orders', icon: ClipboardList },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ]
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 max-w-[1600px]">
        <div className="flex h-16 items-center gap-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Snowflake className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-semibold leading-tight">ColdOps</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Marigold PJ Factory · Live</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 mx-auto">
            {nav.map(n => {
              const Icon = n.icon
              const active = view === n.key
              const badge = n.key === 'notifications' && totalOpen > 0 ? totalOpen : null
              return (
                <Button
                  key={n.key}
                  variant={active ? 'default' : 'ghost'}
                  size="sm"
                  className={`relative h-9 gap-2 ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => onView(n.key)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{n.label}</span>
                  {badge !== null && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold rounded-full bg-red-500 text-white ring-2 ring-card">
                      {badge}
                    </span>
                  )}
                </Button>
              )
            })}
          </nav>

          {/* Status pills */}
          <div className="flex items-center gap-2">
            {savings && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {formatRM(savings.tonightRM)}
                      <span className="text-emerald-500/70 font-normal">tonight</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-xs space-y-0.5">
                      <div>Tonight: <b>{formatRM(savings.tonightRM)}</b></div>
                      <div>This week: <b>{formatRM(savings.thisWeekRM)}</b></div>
                      <div>This month: <b>{formatRM(savings.thisMonthRM)}</b></div>
                      <div>CO₂ avoided: <b>{savings.co2Tonnes.toFixed(2)} t</b></div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <StatusPill
              ok={bmsOnline}
              okLabel="BMS"
              okIcon={Server}
              badLabel="BMS off"
              badIcon={Server}
            />
            <StatusPill
              ok={realtimeConnected}
              okLabel="Live"
              okIcon={Radio}
              badLabel="Offline"
              badIcon={Radio}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function StatusPill({ ok, okLabel, okIcon, badLabel, badIcon }: { ok: boolean; okLabel: string; okIcon: any; badLabel: string; badIcon: any }) {
  const Icon = ok ? okIcon : badIcon
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-300 text-zinc-500'}`}>
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{ok ? okLabel : badLabel}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/50">
      <div className="container mx-auto px-4 py-4 max-w-[1600px]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Snowflake className="h-3.5 w-3.5 text-primary" />
            <span><b className="text-foreground">ColdOps</b> v1.0 · White-label SaaS by Double Dot Solutions Sdn Bhd</span>
          </div>
          <div className="flex items-center gap-3">
            <span>TNB Tariff: RM 0.509/kWh</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">CO₂ factor: 0.583 kg/kWh</span>
            <span className="hidden sm:inline">·</span>
            <span>ap-southeast-1 (SG)</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function LoadingState() {
  return (
    <div className="grid place-items-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm text-muted-foreground">Loading ColdOps dashboard…</div>
      </div>
    </div>
  )
}

// ============================================================================
// VIEW: COMMAND CENTER
// ============================================================================

function CommandCenter({ dashboard, rooms, activeSetbacks }: { dashboard: DashboardData | null; rooms: RoomWithBms[]; activeSetbacks: ActiveSetback[] }) {
  if (!dashboard) return null
  const { savings, kpis, activeGhosts, topNotifications, config } = dashboard

  return (
    <div className="space-y-6">
      {/* Hero KPI strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Zap}
          label="Ghost Load This Period"
          value={formatRM(kpis.ghostLoadRM)}
          sub={`${kpis.ghostLoadCount} events · ${formatDuration(kpis.ghostLoadHours)}`}
          tone="ghost"
        />
        <KpiCard
          icon={TrendingDown}
          label="Savings This Month"
          value={formatRM(savings.thisMonthRM)}
          sub={`Tonight: ${formatRM(savings.tonightRM)}`}
          tone="optimized"
        />
        <KpiCard
          icon={Leaf}
          label="CO₂ Avoided"
          value={`${savings.co2Tonnes.toFixed(2)} t`}
          sub={`≈ ${(savings.co2Tonnes * 4.5).toFixed(0)} trees / mo`}
          tone="active"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Worst Offender"
          value={kpis.worstOffender?.roomCode || '—'}
          sub={kpis.worstOffender ? `${formatKW(kpis.worstOffender.actualKW)} · ${formatRM(kpis.worstOffender.rmPerHour)}/hr` : 'No active ghost load'}
          tone="ghost"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Live savings + ghost trend */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Live Energy & Ghost Load Timeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Last 6 hours · 15-minute intervals · TNB tariff {formatRM(config?.tnbTariffRM || 0.509)}/kWh
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-normal">Real-time</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <GhostLoadChart rooms={rooms} />
          </CardContent>
        </Card>

        {/* Active ghost loads */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-500" />
              Active Ghost Loads
            </CardTitle>
            <CardDescription className="text-xs">Compressors running without production</CardDescription>
          </CardHeader>
          <CardContent>
            {activeGhosts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No active ghost loads. System optimal.
              </div>
            ) : (
              <ScrollArea className="h-[260px] pr-2">
                <div className="space-y-2">
                  {activeGhosts.map(g => {
                    const c = severityColor(g.severity)
                    return (
                      <div key={g.roomId} className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse`} />
                            <span className="font-semibold text-sm">{g.roomCode}</span>
                            <Badge variant="outline" className={`text-[10px] ${c.text} border-current`}>{g.severity}</Badge>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${c.text}`}>{formatRM(g.rmPerHour)}/hr</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">{g.roomName}</div>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <div className="text-muted-foreground">Actual</div>
                            <div className="font-medium">{formatKW(g.actualKW)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Idle base</div>
                            <div className="font-medium">{formatKW(g.expectedIdleKW)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Duration</div>
                            <div className="font-medium">{formatDuration(g.durationHours)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground font-mono">Rule: {g.rule.replace(/_/g, ' ')}</div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active setbacks + room status + notifications */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Active setbacks */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-amber-500" />
              Active Progressive Setbacks
            </CardTitle>
            <CardDescription className="text-xs">Real BMS API calls · safety-guarded</CardDescription>
          </CardHeader>
          <CardContent>
            {activeSetbacks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                <ThermometerSun className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                No active setbacks. Approve a ghost load alert to start one.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSetbacks.map(s => (
                  <ActiveSetbackCard key={s.setbackId} setback={s} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Room status grid */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Cold Room Status Overview
            </CardTitle>
            <CardDescription className="text-xs">{rooms.length} rooms monitored · click for details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rooms.map(r => {
                const c = roomStatusColor(r.status)
                const tempOk = r.bms && r.bms.currentTemp >= r.minSafeTemp && r.bms.currentTemp <= r.maxSafeTemp
                return (
                  <div key={r.id} className={`rounded-lg border ${c.border} ${c.bg} p-2.5`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs">{r.code}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.bg.includes('emerald') ? 'bg-emerald-500' : c.bg.includes('red') ? 'bg-red-500' : c.bg.includes('amber') ? 'bg-amber-500' : 'bg-zinc-400'} animate-pulse`} />
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mb-1.5">{r.name}</div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono">{r.bms ? formatTemp(r.bms.currentTemp) : '—'}</span>
                      <span className="text-muted-foreground">{r.utilizationPct}%</span>
                    </div>
                    <Progress value={r.utilizationPct} className="h-1 mt-1" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top notifications */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Priority Alerts
          </CardTitle>
          <CardDescription className="text-xs">Severity-sorted · top 5 open</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topNotifications.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No open alerts.</div>
            ) : (
              topNotifications.map(n => {
                const c = severityColor(n.severity)
                return (
                  <div key={n.id} className={`flex items-start gap-3 rounded-lg border ${c.border} ${c.bg} p-3`}>
                    <span className={`mt-1 h-2 w-2 rounded-full ${c.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{n.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${c.text} border-current`}>{n.severity}</Badge>
                        <Badge variant="outline" className="text-[10px]">{n.type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{n.message}</div>
                    </div>
                    {n.rmImpact > 0 && (
                      <div className="text-right">
                        <div className={`text-sm font-bold ${c.text}`}>{formatRM(n.rmImpact)}</div>
                        <div className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: 'ghost' | 'optimized' | 'active' | 'consolidation' }) {
  const tones = {
    ghost: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: 'text-red-500' },
    optimized: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
    active: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: 'text-sky-500' },
    consolidation: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  }
  const t = tones[tone]
  return (
    <Card className={`${t.bg} ${t.border} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`grid place-items-center h-8 w-8 rounded-lg bg-card/80 ${t.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className={`text-2xl font-bold tracking-tight ${t.text}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
        <Separator className="my-2" />
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}

function GhostLoadChart({ rooms }: { rooms: RoomWithBms[] }) {
  // We'll synthesize a 6h timeline from current room power readings.
  // (The real readings are in the DB but we don't expose a meter API; this is a UI demo.)
  const data = useRef<{ t: string; kw: number; idle: number }[]>([])
  if (data.current.length === 0) {
    const now = Date.now()
    for (let i = 24; i >= 0; i--) {
      const t = new Date(now - i * 15 * 60 * 1000)
      const hr = t.getHours()
      const isProd = hr >= 6 && hr <= 22
      const isGhost = i < 12
      const kw = isGhost ? 49.5 : isProd ? 35 + Math.random() * 8 : 12
      const idle = 13.5
      data.current.push({ t: t.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }), kw: Math.round(kw * 10) / 10, idle })
    }
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data.current} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="kwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="idleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="#9ca3af" interval={3} />
        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" unit=" kW" />
        <RTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <ReferenceLine y={13.5} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Idle baseline', fontSize: 10, fill: '#10b981', position: 'insideTopRight' }} />
        <Area type="monotone" dataKey="kw" name="Power draw" stroke="#ef4444" strokeWidth={2} fill="url(#kwGrad)" />
        <Area type="monotone" dataKey="idle" name="Expected idle" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#idleGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ActiveSetbackCard({ setback }: { setback: ActiveSetback }) {
  const pct = (setback.currentStep / setback.totalSteps) * 100
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ThermometerSun className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-sm">{setback.roomCode}</span>
          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Ramping</Badge>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{setback.setbackId}</span>
      </div>
      <div className="flex items-center gap-2 text-xs mb-2">
        <span className="font-mono">{setback.startSetpoint.toFixed(1)}°C</span>
        <ArrowRight className="h-3 w-3 text-amber-600" />
        <span className="font-mono font-semibold">{setback.endSetpoint.toFixed(1)}°C</span>
        {setback.bms && (
          <span className="ml-auto text-muted-foreground">Now: <b className="text-foreground">{setback.bms.currentTemp.toFixed(1)}°C</b></span>
        )}
      </div>
      <Progress value={pct} className="h-1.5 mb-2" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Step {setback.currentStep}/{setback.totalSteps}</span>
        <span>{setback.bms ? formatKW(setback.bms.powerKW) : '—'}</span>
      </div>
    </div>
  )
}

// ============================================================================
// VIEW: COLD ROOM MAP
// ============================================================================

function ColdRoomMap({ rooms, plan, onExecutePlan }: { rooms: RoomWithBms[]; plan: ConsolidationPlan | null; onExecutePlan: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const selectedRoom = rooms.find(r => r.id === selected)

  const executePlan = async () => {
    setExecuting(true)
    try {
      const r = await fetch('/api/consolidation/execute', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast.success(`Work order created: ${d.plan.palletCount} pallets to move`)
        onExecutePlan()
      } else {
        toast.error(d.error || 'Failed to create work order')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-primary" />
            Factory Floor — Cold Room Map
          </h2>
          <p className="text-sm text-muted-foreground">Marigold PJ · 8 rooms · real-time BMS telemetry</p>
        </div>
        <Legend />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Floor plan */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live Floor Plan</CardTitle>
            <CardDescription className="text-xs">Click a room to inspect. Colors update from BMS + WMS data.</CardDescription>
          </CardHeader>
          <CardContent>
            <FloorPlan rooms={rooms} selected={selected} onSelect={setSelected} plan={plan} />
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {selectedRoom ? (
            <RoomDetailCard room={selectedRoom} />
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-6 text-center">
                <MapIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Select a cold room to inspect its live status, temperature, and pallet inventory.</div>
              </CardContent>
            </Card>
          )}

          {plan && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                  Consolidation Plan
                </CardTitle>
                <CardDescription className="text-xs">Greedy FEFO assignment · allergen-checked</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  Move <b>{plan.palletCount} pallets</b> from{' '}
                  {plan.sourceRoomCodes.map((c, i) => (
                    <span key={c}>
                      <Badge variant="outline" className="text-[10px] mx-0.5">{c}</Badge>
                      {i < plan.sourceRoomCodes.length - 1 ? '+' : ''}
                    </span>
                  ))}{' '}
                  → <Badge variant="outline" className="text-[10px] mx-0.5">{plan.destRoomCode}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Energy saving</div>
                    <div className="font-semibold text-emerald-700">{formatRM(plan.energySavingRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Labor cost</div>
                    <div className="font-semibold text-zinc-700">{formatRM(plan.laborCostRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Net benefit</div>
                    <div className="font-bold text-emerald-700">{formatRM(plan.netBenefitRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Est. labor</div>
                    <div className="font-semibold">{plan.estLaborMinutes} min</div>
                  </div>
                </div>
                <Button className="w-full" onClick={executePlan} disabled={executing}>
                  {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                  Generate Work Order
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Move list */}
          {plan && plan.moves.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Move Sequence (FEFO)</CardTitle>
                <CardDescription className="text-xs">{plan.moves.length} pallets · earliest expiry first</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[260px] pr-2">
                  <div className="space-y-1.5">
                    {plan.moves.map(m => (
                      <div key={m.palletId} className="flex items-center gap-2 text-xs rounded-md border border-border/60 p-2">
                        <span className="grid place-items-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{m.sequence}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{m.productName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{m.lotNo}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono">
                          <span className="px-1 rounded bg-red-50 text-red-700">{m.fromRoomCode}:{m.fromBayCode}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="px-1 rounded bg-emerald-50 text-emerald-700">{m.toRoomCode}:{m.toBayCode}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Legend() {
  const items: { label: string; cls: string }[] = [
    { label: 'Ghost Load', cls: 'bg-red-500' },
    { label: 'Consolidate', cls: 'bg-amber-500' },
    { label: 'Optimized', cls: 'bg-emerald-500' },
    { label: 'Active', cls: 'bg-sky-500' },
    { label: 'Idle', cls: 'bg-zinc-400' },
  ]
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={`h-2.5 w-2.5 rounded-sm ${i.cls}`} />
          {i.label}
        </div>
      ))}
    </div>
  )
}

function FloorPlan({ rooms, selected, onSelect, plan }: { rooms: RoomWithBms[]; selected: string | null; onSelect: (id: string) => void; plan: ConsolidationPlan | null }) {
  return (
    <div className="relative w-full aspect-[16/8] bg-zinc-50 rounded-lg border border-border/60 overflow-hidden">
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4d4d8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Rooms */}
      {rooms.map(r => {
        const c = roomStatusColor(r.status)
        const isGhost = r.status === 'GHOST_LOAD'
        const isConsolidation = r.status === 'CONSOLIDATION'
        const isOptimized = r.status === 'OPTIMIZED'
        const isDest = plan?.destRoomCode === r.code
        const isSource = plan?.sourceRoomCodes.includes(r.code)
        const isSel = selected === r.id
        const fillColor = isGhost ? '#fee2e2' : isConsolidation ? '#fef3c7' : isOptimized ? '#d1fae5' : r.status === 'ACTIVE' ? '#e0f2fe' : '#f4f4f5'
        const strokeColor = isGhost ? '#ef4444' : isConsolidation ? '#f59e0b' : isOptimized ? '#10b981' : r.status === 'ACTIVE' ? '#0ea5e9' : '#a1a1aa'
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`absolute rounded-md border-2 transition-all ${isSel ? 'ring-2 ring-primary ring-offset-1 z-10' : ''} ${isSource ? 'ring-2 ring-amber-400' : ''} ${isDest ? 'ring-2 ring-emerald-500' : ''}`}
            style={{
              left: `${r.floorX}%`,
              top: `${r.floorY}%`,
              width: `${r.floorW}%`,
              height: `${r.floorH}%`,
              backgroundColor: fillColor,
              borderColor: strokeColor,
            }}
          >
            <div className="absolute inset-0 p-1.5 flex flex-col text-left overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-800">{r.code}</span>
                {r.bms && (
                  <span className="text-[9px] font-mono text-zinc-600">{r.bms.currentTemp.toFixed(1)}°</span>
                )}
              </div>
              <div className="text-[8px] text-zinc-600 truncate">{r.name}</div>
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <div className="text-[8px] text-zinc-500">{r.utilizationPct}%</div>
                  <div className="h-1 w-12 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full ${isGhost ? 'bg-red-500' : isConsolidation ? 'bg-amber-500' : isOptimized ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${r.utilizationPct}%` }} />
                  </div>
                </div>
                {r.bms && (
                  <div className="text-[8px] font-mono text-zinc-600">{r.bms.powerKW.toFixed(1)}kW</div>
                )}
              </div>
            </div>
            {isGhost && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        )
      })}

      {/* Consolidation arrows overlay */}
      {plan && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {plan.sourceRoomCodes.map(srcCode => {
            const src = rooms.find(r => r.code === srcCode)
            const dst = rooms.find(r => r.code === plan.destRoomCode)
            if (!src || !dst) return null
            const sx = src.floorX + src.floorW / 2
            const sy = src.floorY + src.floorH / 2
            const dx = dst.floorX + dst.floorW / 2
            const dy = dst.floorY + dst.floorH / 2
            return (
              <g key={srcCode}>
                <defs>
                  <marker id={`arrow-${srcCode}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#10b981" />
                  </marker>
                </defs>
                <path
                  d={`M ${sx}% ${sy}% Q ${(sx + dx) / 2}% ${Math.min(sy, dy) - 8}% ${dx}% ${dy}%`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                  markerEnd={`url(#arrow-${srcCode})`}
                  opacity="0.7"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
                </path>
              </g>
            )
          })}
        </svg>
      )}

      {/* Zone labels */}
      <div className="absolute top-1 left-2 text-[10px] font-medium text-zinc-500">Production Floor — Cold Storage Zone</div>
    </div>
  )
}

function RoomDetailCard({ room }: { room: RoomWithBms }) {
  const c = roomStatusColor(room.status)
  const tempOk = room.bms && room.bms.currentTemp >= room.minSafeTemp && room.bms.currentTemp <= room.maxSafeTemp
  return (
    <Card className={`${c.bg} ${c.border} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {room.code}
              <Badge variant="outline" className={`text-[10px] ${c.text} border-current`}>{c.label}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">{room.name} · {room.zone}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {room.bms ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Current temp" value={formatTemp(room.bms.currentTemp)} ok={tempOk} />
            <Metric label="Setpoint" value={formatTemp(room.bms.setpoint)} />
            <Metric label="Compressor load" value={`${Math.round(room.bms.compressorLoad * 100)}%`} />
            <Metric label="Power draw" value={formatKW(room.bms.powerKW)} />
            <Metric label="Utilization" value={`${room.utilizationPct}% (${room.palletCount}/${room.capacityPallets})`} />
            <Metric label="Max power" value={formatKW(room.maxPowerKW)} />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center">BMS offline for this room</div>
        )}
        <Separator />
        <div className="text-[11px] text-muted-foreground">
          Safe range: <span className="font-mono">{room.minSafeTemp.toFixed(1)}°C — {room.maxSafeTemp.toFixed(1)}°C</span>
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-md bg-card/60 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-mono font-semibold text-sm ${ok === false ? 'text-red-600' : ''}`}>{value}</div>
    </div>
  )
}

// ============================================================================
// VIEW: WORK ORDERS
// ============================================================================

function WorkOrdersView({ workOrders, activeSetbacks, onComplete }: { workOrders: WorkOrder[]; activeSetbacks: ActiveSetback[]; onComplete: () => void }) {
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const complete = async (id: string) => {
    setCompletingId(id)
    try {
      const r = await fetch(`/api/work-orders/${id}/complete`, { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast.success(`Completed in ${d.elapsedMin} min · ${d.setbacks?.length || 0} setbacks triggered`)
        onComplete()
      } else {
        toast.error(d.error || 'Failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCompletingId(null)
    }
  }

  const pending = workOrders.filter(w => w.status !== 'COMPLETED')
  const completed = workOrders.filter(w => w.status === 'COMPLETED')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Work Orders
          </h2>
          <p className="text-sm text-muted-foreground">Consolidation tasks dispatched to warehouse · FEFO-sequenced · allergen-checked</p>
        </div>
      </div>

      {/* Active setbacks strip */}
      {activeSetbacks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-amber-600" />
              {activeSetbacks.length} Active Setback{activeSetbacks.length > 1 ? 's' : ''} · BMS API Live
            </CardTitle>
            <CardDescription className="text-xs">Progressive ramp commands executing against the BMS simulator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeSetbacks.map(s => <ActiveSetbackCard key={s.setbackId} setback={s} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Pending & In Progress ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">No pending work orders.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {pending.map(wo => (
              <WorkOrderCard
                key={wo.id}
                wo={wo}
                expanded={expanded === wo.id}
                onToggle={() => setExpanded(expanded === wo.id ? null : wo.id)}
                onComplete={() => complete(wo.id)}
                completing={completingId === wo.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Recently Completed ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.map(wo => (
              <Card key={wo.id} className="border-emerald-200 bg-emerald-50/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{wo.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {wo.assignedTo} · {wo.estLaborMinutes} min est · completed {timeAgo(wo.completedAt || wo.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-700">{formatRM(wo.rmSaved || wo.rmSavedPerHour)}</div>
                      <div className="text-[10px] text-muted-foreground">saved</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WorkOrderCard({ wo, expanded, onToggle, onComplete, completing }: {
  wo: WorkOrder; expanded: boolean; onToggle: () => void; onComplete: () => void; completing: boolean
}) {
  const pct = wo.totalMoves > 0 ? (wo.completedMoves / wo.totalMoves) * 100 : 0
  return (
    <Card className="border-border/60">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{wo.title}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{wo.status}</Badge>
              {wo.assignedTo && <span>· {wo.assignedTo}</span>}
              <span>· {wo.totalMoves} moves · {wo.estLaborMinutes} min</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-emerald-700">{formatRM(wo.rmSavedPerHour)}/hr</div>
            <div className="text-[10px] text-muted-foreground">est. saving</div>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onComplete} disabled={completing}>
            {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Complete</span>
          </Button>
        </div>
        <Progress value={pct} className="h-1 mt-2" />
        {expanded && wo.moves && wo.moves.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5 max-h-72 overflow-y-auto">
            {wo.moves.map(m => (
              <div key={m.id} className={`flex items-center gap-2 text-xs rounded-md p-2 ${m.confirmedAt ? 'bg-emerald-50 border border-emerald-200' : 'bg-zinc-50 border border-border/60'}`}>
                <span className={`grid place-items-center h-5 w-5 rounded-full text-[10px] font-bold ${m.confirmedAt ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'}`}>{m.sequence}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.productName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{m.lotNo}</div>
                </div>
                {!m.allergenOk && <Badge variant="outline" className="text-[10px] text-red-700 border-red-300">allergen</Badge>}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="px-1 rounded bg-red-50 text-red-700">{m.fromRoomCode}:{m.fromBayCode}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="px-1 rounded bg-emerald-50 text-emerald-700">{m.toRoomCode}:{m.toBayCode}</span>
                </div>
                {m.confirmedAt ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <CircleDot className="h-3.5 w-3.5 text-muted-foreground/50" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// VIEW: NOTIFICATIONS
// ============================================================================

function NotificationsView({ notifs, counts, onAction }: { notifs: Notification[]; counts: Record<string, number>; onAction: () => void }) {
  const [filter, setFilter] = useState<Severity | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [acting, setActing] = useState<string | null>(null)

  const filtered = notifs.filter(n => {
    if (filter !== 'ALL' && n.severity !== filter) return false
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false
    return true
  })

  const types = Array.from(new Set(notifs.map(n => n.type)))

  const act = async (id: string, action: 'approve' | 'defer' | 'dismiss') => {
    setActing(id)
    try {
      const r = await fetch(`/api/notifications/${id}/${action}`, { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast.success(`Notification ${action}d`)
        if (d.sideEffect?.type === 'SETBACK_STARTED') {
          toast.info(`Progressive setback started: ${d.sideEffect.setbackId}`)
        }
        onAction()
      } else {
        toast.error(d.error || 'Failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alerts & Notifications
          </h2>
          <p className="text-sm text-muted-foreground">Severity-sorted · approve to trigger automated response</p>
        </div>
        <SeverityTabs counts={counts} active={filter} onChange={setFilter} />
      </div>

      {/* Type filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Button variant={typeFilter === 'ALL' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setTypeFilter('ALL')}>All types</Button>
        {types.map(t => (
          <Button key={t} variant={typeFilter === t ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setTypeFilter(t)}>
            {t.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <div className="text-lg font-medium">All clear</div>
              <div className="text-sm text-muted-foreground">No notifications match this filter.</div>
            </CardContent>
          </Card>
        ) : (
          filtered.map(n => {
            const c = severityColor(n.severity)
            const isOpen = n.status === 'OPEN'
            return (
              <Card key={n.id} className={`${c.border} ${isOpen ? c.bg : 'opacity-60'} border`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${c.dot} flex-shrink-0 ${isOpen ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{n.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${c.text} border-current`}>{n.severity}</Badge>
                        <Badge variant="outline" className="text-[10px]">{n.type.replace(/_/g, ' ')}</Badge>
                        {!isOpen && <Badge variant="outline" className="text-[10px]">{n.status}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{n.message}</div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(n.createdAt)}</span>
                        {n.durationHours > 0 && <span>· {formatDuration(n.durationHours)}</span>}
                        {n.rmImpact > 0 && <span>· {formatRM(n.rmImpact)} impact</span>}
                        {n.rmPerHour > 0 && <span>· {formatRM(n.rmPerHour)}/hr</span>}
                        <span className="flex items-center gap-1">
                          {channelIcon(n.channels).map(ch => <ChannelIcon key={ch} ch={ch} />)}
                        </span>
                      </div>
                    </div>
                    {isOpen && n.actionType && n.actionType !== 'NONE' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => act(n.id, 'approve')} disabled={acting === n.id}>
                          {acting === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          <span className="ml-1">Approve</span>
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => act(n.id, 'defer')} disabled={acting === n.id}>
                          Defer
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => act(n.id, 'dismiss')} disabled={acting === n.id}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

function SeverityTabs({ counts, active, onChange }: { counts: Record<string, number>; active: Severity | 'ALL'; onChange: (s: Severity | 'ALL') => void }) {
  const tabs: { key: Severity | 'ALL'; label: string; color: string }[] = [
    { key: 'ALL', label: 'All', color: 'bg-zinc-500' },
    { key: 'CRITICAL', label: 'Critical', color: 'bg-red-500' },
    { key: 'HIGH', label: 'High', color: 'bg-orange-500' },
    { key: 'MEDIUM', label: 'Medium', color: 'bg-amber-400' },
    { key: 'LOW', label: 'Low', color: 'bg-sky-400' },
  ]
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      {tabs.map(t => {
        const count = t.key === 'ALL' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[t.key] || 0
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${active === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${t.color}`} />
            {t.label}
            <span className="text-[10px] text-muted-foreground">({count})</span>
          </button>
        )
      })}
    </div>
  )
}

function ChannelIcon({ ch }: { ch: string }) {
  const map: Record<string, { icon: any; label: string }> = {
    DASHBOARD: { icon: Activity, label: 'Dashboard' },
    SMS: { icon: Smartphone, label: 'SMS' },
    WHATSAPP: { icon: MessageSquare, label: 'WhatsApp' },
    EMAIL: { icon: Mail, label: 'Email' },
  }
  const m = map[ch]
  if (!m) return null
  const Icon = m.icon
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex"><Icon className="h-3 w-3" /></span>
        </TooltipTrigger>
        <TooltipContent side="top">{m.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
