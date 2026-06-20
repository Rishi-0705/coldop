'use client'

import { useState, useEffect } from 'react'
import {
  Zap, TrendingDown, Leaf, Thermometer, BarChart2, Loader2,
  Activity, CheckCircle2, AlertTriangle, Package, Clock, ThermometerSun,
  ArrowDown, ArrowUp, Minus
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import type { DashboardData, RoomWithBms, MeterData } from '@/lib/coldops/types'
import { formatRM, formatKW, formatTemp } from '@/lib/coldops/ui'

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub: string; accent: 'emerald' | 'blue' | 'amber'
}) {
  const colors = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', value: 'text-emerald-700' },
    blue:    { bg: 'bg-sky-50',     border: 'border-sky-200',     icon: 'text-sky-500',     value: 'text-sky-700' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-500',   value: 'text-amber-700' },
  }
  const c = colors[accent]
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 space-y-2`}>
      <div className={`h-9 w-9 rounded-lg bg-white/60 flex items-center justify-center ${c.icon}`}><Icon className="h-5 w-5" /></div>
      <div className={`text-2xl font-bold tracking-tight ${c.value}`}>{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}

// ─── Cooler consumption chart ──────────────────────────────────────────────

function CoolerEnergyChart({ meterData }: { meterData: MeterData | null }) {
  if (!meterData) return <div className="h-48 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  const sorted = [...meterData.rooms].sort((a, b) => b.currentKW - a.currentKW)
  const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" unit=" kW" />
        <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} stroke="#9ca3af" width={56} />
        <RTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(v: any) => [`${v} kW`, 'Power draw']} />
        <Bar dataKey="currentKW" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {sorted.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Top consumers ─────────────────────────────────────────────────────────

function TopConsumers({ meterData }: { meterData: MeterData | null }) {
  if (!meterData) return null
  const sorted = [...meterData.rooms].sort((a, b) => b.currentKW - a.currentKW).slice(0, 5)
  const max = sorted[0]?.currentKW || 1
  return (
    <div className="space-y-2">
      {sorted.map((r, i) => (
        <div key={r.code} className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted-foreground w-5">{i + 1}</span>
          <span className="text-sm font-medium w-14 flex-shrink-0">{r.code}</span>
          <div className="flex-1"><div className="h-2 rounded-full bg-primary/70" style={{ width: `${(r.currentKW / max) * 100}%` }} /></div>
          <span className="text-xs font-mono text-right w-16">{formatKW(r.currentKW)}</span>
          {r.isGhost && <Badge variant="outline" className="text-[9px] text-red-600 border-red-200 bg-red-50 flex-shrink-0">Ghost</Badge>}
        </div>
      ))}
    </div>
  )
}

// ─── Status helpers ────────────────────────────────────────────────────────

function statusDot(status: string) {
  if (status === 'GHOST_LOAD')   return 'bg-red-500 animate-pulse'
  if (status === 'CONSOLIDATION') return 'bg-amber-500'
  if (status === 'OPTIMIZED')    return 'bg-emerald-500'
  if (status === 'ACTIVE')       return 'bg-sky-500'
  return 'bg-zinc-400'
}

function statusLabel(status: string) {
  if (status === 'GHOST_LOAD')   return { label: 'Ghost Load',  cls: 'text-red-600 border-red-200 bg-red-50' }
  if (status === 'CONSOLIDATION') return { label: 'Consolidate', cls: 'text-amber-700 border-amber-200 bg-amber-50' }
  if (status === 'OPTIMIZED')    return { label: 'Optimized',   cls: 'text-emerald-700 border-emerald-200 bg-emerald-50' }
  if (status === 'ACTIVE')       return { label: 'Active',      cls: 'text-sky-700 border-sky-200 bg-sky-50' }
  return { label: 'Idle', cls: 'text-zinc-600 border-zinc-200 bg-zinc-50' }
}

// ─── Temperature grid — shows current + AI recommended ────────────────────

function TempGrid({ rooms }: { rooms: (RoomWithBms & { recommendedSetpoint?: number | null; aiReason?: string | null; lastStockType?: string | null })[] }) {
  if (!rooms.length) return <div className="h-32 grid place-items-center text-sm text-muted-foreground">No room data.</div>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {rooms.map(r => {
        const sl = statusLabel(r.status)
        const tempOk = r.bms ? r.bms.currentTemp >= r.minSafeTemp && r.bms.currentTemp <= r.maxSafeTemp : true
        const hasRec = r.recommendedSetpoint !== null && r.recommendedSetpoint !== undefined
        const delta = hasRec ? +(r.recommendedSetpoint! - (r.bms?.setpoint ?? r.targetTemp)).toFixed(1) : 0
        const currentDisplay = r.bms?.setpoint ?? r.targetTemp
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{r.code}</span>
              <span className={`h-2 w-2 rounded-full ${statusDot(r.status)}`} />
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{r.name}</div>

            <div className="flex items-end justify-between">
              <div>
                <div className={`text-xl font-bold font-mono ${!tempOk ? 'text-red-600' : ''}`}>
                  {r.bms ? formatTemp(r.bms.currentTemp) : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  setpoint {currentDisplay.toFixed(1)}°C
                </div>
              </div>
              <Badge variant="outline" className={`text-[9px] ${sl.cls}`}>{sl.label}</Badge>
            </div>

            {/* AI recommended setpoint */}
            {hasRec && (
              <div className={`rounded-md px-2 py-1.5 flex items-center justify-between gap-1 ${
                Math.abs(delta) < 0.5 ? 'bg-muted/40 border border-border/40'
                : delta > 0 ? 'bg-amber-50 border border-amber-200'
                : 'bg-sky-50 border border-sky-200'
              }`}>
                <div className="flex items-center gap-1">
                  {Math.abs(delta) < 0.5
                    ? <Minus className="h-3 w-3 text-muted-foreground" />
                    : delta > 0
                    ? <ArrowUp className="h-3 w-3 text-amber-600" />
                    : <ArrowDown className="h-3 w-3 text-sky-600" />
                  }
                  <span className={`text-[10px] font-semibold ${
                    Math.abs(delta) < 0.5 ? 'text-muted-foreground'
                    : delta > 0 ? 'text-amber-700' : 'text-sky-700'
                  }`}>
                    AI: {r.recommendedSetpoint!.toFixed(1)}°C
                  </span>
                </div>
                <span className={`text-[9px] ${Math.abs(delta) < 0.5 ? 'text-muted-foreground' : delta > 0 ? 'text-amber-600' : 'text-sky-600'}`}>
                  {Math.abs(delta) < 0.5 ? 'no change' : `${delta > 0 ? '+' : ''}${delta}°C`}
                </span>
              </div>
            )}

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Stock</span><span>{r.utilizationPct}%</span>
              </div>
              <Progress value={r.utilizationPct} className="h-1.5" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Activity Feed ─────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, any> = {
  GHOST_LOAD_DETECTED: Zap,
  GHOST_LOAD_RESOLVED: CheckCircle2,
  SETBACK_EXECUTING:   ThermometerSun,
  SETBACK_COMPLETED:   CheckCircle2,
  SETBACK_ABORTED:     AlertTriangle,
  WORK_ORDER_CREATED:  Package,
  WORK_ORDER_COMPLETED: CheckCircle2,
  NOTIFICATION_APPROVED: CheckCircle2,
  NOTIFICATION_DISMISSED: Minus,
}

const EVENT_COLORS: Record<string, string> = {
  GHOST_LOAD_DETECTED:  'text-red-500 bg-red-50 border-red-200',
  GHOST_LOAD_RESOLVED:  'text-emerald-600 bg-emerald-50 border-emerald-200',
  SETBACK_EXECUTING:    'text-sky-600 bg-sky-50 border-sky-200',
  SETBACK_COMPLETED:    'text-emerald-600 bg-emerald-50 border-emerald-200',
  SETBACK_ABORTED:      'text-amber-600 bg-amber-50 border-amber-200',
  WORK_ORDER_CREATED:   'text-amber-600 bg-amber-50 border-amber-200',
  WORK_ORDER_COMPLETED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  NOTIFICATION_APPROVED:'text-emerald-600 bg-emerald-50 border-emerald-200',
  NOTIFICATION_DISMISSED:'text-zinc-500 bg-zinc-50 border-zinc-200',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ActivityFeed() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(5)

  useEffect(() => {
    fetch('/api/activity')
      .then(r => r.json())
      .then(d => setEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Recent System Activity</h2>
          <p className="text-[11px] text-muted-foreground">Last 48 hours — all approved actions and system events</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No activity yet. Approve actions in Step 2 to see events here.
        </div>
      ) : (
        <div className="space-y-2">
          {events.slice(0, visibleCount).map(ev => {
            const Icon = EVENT_ICONS[ev.type] ?? Clock
            const colorCls = EVENT_COLORS[ev.type] ?? 'text-zinc-500 bg-zinc-50 border-zinc-200'
            return (
              <div key={ev.id} className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 h-6 w-6 rounded-full border flex items-center justify-center ${colorCls}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold truncate">{ev.title}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(ev.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{ev.description}</p>
                  {ev.rmImpact > 0 && (
                    <span className="inline-block mt-0.5 text-[10px] text-emerald-600 font-semibold">
                      +{formatRM(ev.rmImpact)} saved
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {visibleCount < events.length && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 text-xs text-muted-foreground"
              onClick={() => setVisibleCount(v => v + 5)}
            >
              Show more activity
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────

export function ResultsDashboard({
  dashboard,
  rooms,
  meterData,
}: {
  dashboard: DashboardData | null
  rooms: RoomWithBms[]
  meterData: MeterData | null
}) {
  if (!dashboard) {
    return <div className="h-[60vh] grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const { savings, kpis } = dashboard
  const kwhSaved = savings.thisMonthRM > 0 ? (savings.thisMonthRM / 0.509).toFixed(0) : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Step 3 — Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live summary of energy savings and AI-recommended cooler adjustments.
        </p>
      </div>

      {/* Hero KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={Zap}         label="Total Energy Saved (This Month)" value={`${kwhSaved} kWh`} sub={`Tonight: ${(savings.tonightRM / 0.509).toFixed(1)} kWh`} accent="emerald" />
        <KpiCard icon={TrendingDown} label="Total Money Saved (This Month)"  value={formatRM(savings.thisMonthRM)} sub={`This week: ${formatRM(savings.thisWeekRM)}`} accent="blue" />
        <KpiCard icon={Leaf}         label="CO₂ Avoided"                     value={`${savings.co2Tonnes.toFixed(2)} t`} sub={`≈ ${(savings.co2Tonnes * 4.5).toFixed(0)} trees saved`} accent="amber" />
      </div>

      {/* 2-col grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Cooler Energy Consumption</h2>
              <p className="text-[11px] text-muted-foreground">Ranked by current power draw</p>
            </div>
          </div>
          <CoolerEnergyChart meterData={meterData} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Top Energy Consumers</h2>
                <p className="text-[11px] text-muted-foreground">Equipment ranked by kW draw</p>
              </div>
            </div>
            <TopConsumers meterData={meterData} />
          </div>
          <div className="border-t border-border/60 pt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="text-xl font-bold text-red-600">{kpis.ghostLoadCount}</div>
              <div className="text-[11px] text-muted-foreground">Ghost Load Events</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="text-xl font-bold">{kpis.consolidationCandidateCount}</div>
              <div className="text-[11px] text-muted-foreground">Consolidation Candidates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Temperature grid with AI recommendations */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Temperature Overview — All Coolers</h2>
            <p className="text-[11px] text-muted-foreground">
              Current temp · setpoint · AI-recommended setpoint · utilisation
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-sky-500" />AI suggests lower</span>
            <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-amber-500" />AI suggests higher</span>
            <span className="flex items-center gap-1"><Minus className="h-3 w-3 text-muted-foreground" />No change</span>
          </div>
        </div>
        <TempGrid rooms={rooms as any} />
      </div>

      {/* Recent activity feed */}
      <ActivityFeed />
    </div>
  )
}
