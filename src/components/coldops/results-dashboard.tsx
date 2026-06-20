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
import { GlassCard } from '@/components/coldops/shared'



function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub: string; accent: 'emerald' | 'blue' | 'amber'
}) {
  const colors = {
    emerald: { iconBg: 'bg-emerald-50', icon: 'text-emerald-500', value: 'text-[#10B981]' },
    blue:    { iconBg: 'bg-sky-50',     icon: 'text-sky-500',     value: 'text-[#0EA5E9]' },
    amber:   { iconBg: 'bg-amber-50',   icon: 'text-amber-500',   value: 'text-[#F59E0B]' },
  }
  const c = colors[accent]
  return (
    <GlassCard className="px-[28px] py-[24px] space-y-3 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] hover:border-white">
      <div className={`h-10 w-10 rounded-[10px] ${c.iconBg} flex items-center justify-center ${c.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className={`text-[40px] font-[800] leading-[1.1] tracking-tight text-[#111827]`}>{value}</div>
        <div className="text-[11px] font-[600] tracking-[0.08em] uppercase text-[#9CA3AF] mt-2">{label}</div>
      </div>
      <div className="text-[12px] text-[#6B7280]">{sub}</div>
    </GlassCard>
  )
}



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



function TempGrid({ rooms }: { rooms: (RoomWithBms & { recommendedSetpoint?: number | null; aiReason?: string | null; lastStockType?: string | null })[] }) {
  if (!rooms.length) return <div className="h-32 grid place-items-center text-sm text-muted-foreground">No room data.</div>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {rooms.map(r => {
        const hasRec = r.recommendedSetpoint !== null && r.recommendedSetpoint !== undefined
        const delta = hasRec ? +(r.recommendedSetpoint! - (r.bms?.setpoint ?? r.targetTemp)).toFixed(1) : 0
        const currentDisplay = r.bms?.setpoint ?? r.targetTemp
        
        const isGhost = r.status === 'GHOST_LOAD'
        const badgeStyle = isGhost
          ? "bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]"
          : "bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]"
        const dotStyle = isGhost 
          ? "bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" 
          : "bg-[#10B981]"

        return (
          <div key={r.id} className="bg-[rgba(255,255,255,0.75)] backdrop-blur-[8px] border border-[rgba(255,255,255,0.95)] rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.05)] px-[20px] py-[18px] transition-all duration-200 ease hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)] flex flex-col justify-between">
            
            <div>
              <div className="flex items-center justify-between mb-[2px]">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-[700] text-[#111827]">{r.code}</span>
                  <span className={`h-[8px] w-[8px] rounded-full ${dotStyle}`} />
                </div>
                <div className={`border rounded-[6px] text-[10px] font-[600] px-[8px] py-[2px] ${badgeStyle}`}>
                  {isGhost ? 'Ghost Load' : 'Active'}
                </div>
              </div>
              <div className="text-[12px] text-[#6B7280] mb-[12px] truncate">{r.name}</div>

              <div className="mb-[12px]">
                <div className={`text-[26px] font-[800] text-[#111827] leading-none mb-[4px]`}>
                  {r.bms ? formatTemp(r.bms.currentTemp) : '—'}
                </div>
                <div className="text-[11px] text-[#9CA3AF]">
                  setpoint {currentDisplay.toFixed(1)}°C
                </div>
              </div>

              {}
              {hasRec && (
                <div className={`rounded-[8px] px-2.5 py-2 flex items-center justify-between gap-1 mb-[12px] ${
                  Math.abs(delta) < 0.5 ? 'bg-[#F9FAFB] border border-[#E5E7EB]'
                  : delta > 0 ? 'bg-amber-50 border border-amber-200'
                  : 'bg-sky-50 border border-sky-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {Math.abs(delta) < 0.5
                      ? <Minus className="h-3 w-3 text-[#9CA3AF]" />
                      : delta > 0
                      ? <ArrowUp className="h-3 w-3 text-[#EF4444]" />
                      : <ArrowDown className="h-3 w-3 text-[#10B981]" />
                    }
                    <span className={`text-[11px] font-[600] tracking-wide ${
                      Math.abs(delta) < 0.5 ? 'text-[#6B7280]'
                      : delta > 0 ? 'text-amber-700' : 'text-sky-700'
                    }`}>
                      AI: {r.recommendedSetpoint!.toFixed(1)}°C
                    </span>
                  </div>
                  <span className={`text-[10px] font-[700] ${Math.abs(delta) < 0.5 ? 'text-[#9CA3AF]' : delta > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                    {Math.abs(delta) < 0.5 ? 'none' : `${delta > 0 ? '+' : ''}${delta}°C`}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-1 mt-auto">
              <div className="flex justify-between items-center mb-[4px]">
                <span className="text-[11px] font-[500] text-[#6B7280]">Stock</span>
                <span className="text-[12px] font-[700] text-[#111827]">{r.utilizationPct}%</span>
              </div>
              <div className="h-[5px] w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]" style={{ width: `${r.utilizationPct}%` }} />
              </div>
            </div>

          </div>
        )
      })}
    </div>
  )
}



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
    <GlassCard className="px-[32px] py-[28px]">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-[36px] w-[36px] rounded-[10px] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] flex items-center justify-center flex-shrink-0">
          <Activity className="h-5 w-5 text-[#0EA5E9]" />
        </div>
        <div>
          <h2 className="text-[16px] font-[700] text-[#111827]">Recent System Activity</h2>
          <p className="text-[12px] text-[#9CA3AF]">Last 48 hours — all approved actions and system events</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No activity yet. Approve actions in Step 2 to see events here.
        </div>
      ) : (
        <div className="flex flex-col">
          {events.slice(0, visibleCount).map((ev, i) => {
            const isLast = i === visibleCount - 1 && visibleCount >= events.length
            return (
              <div key={ev.id} className={`flex items-start sm:items-center gap-4 py-[14px] ${!isLast ? 'border-b border-[#F3F4F6]' : ''}`}>
                <div className="flex-shrink-0 h-[32px] w-[32px] rounded-full bg-[#F0FDF4] flex items-center justify-center mt-0.5 sm:mt-0">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <div className="text-[13px] font-[600] text-[#111827] truncate">{ev.title}</div>
                    <div className="text-[12px] text-[#9CA3AF] mt-[2px] truncate">{ev.description}</div>
                    {ev.rmImpact > 0 && (
                      <div className="text-[12px] font-[600] text-[#10B981] mt-[4px]">
                        +{formatRM(ev.rmImpact)} saved
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] flex-shrink-0 self-start sm:self-center sm:ml-4 mt-2 sm:mt-0">
                    {timeAgo(ev.timestamp)}
                  </div>
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
    </GlassCard>
  )
}



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
    <div className="space-y-8 max-w-[1200px] mx-auto pb-12">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-bold text-[#111827]">Step 3 — Dashboard</h1>
          <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
            <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">Live Data</span>
          </div>
        </div>
        <p className="text-[14px] text-[#6B7280] leading-[1.6] mt-1">
          Live summary of energy savings and AI-recommended cooler adjustments.
        </p>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard icon={Zap}         label="Total Energy Saved (This Month)" value={`${kwhSaved} kWh`} sub={`Tonight: ${(savings.tonightRM / 0.509).toFixed(1)} kWh`} accent="emerald" />
        <KpiCard icon={TrendingDown} label="Total Money Saved (This Month)"  value={formatRM(savings.thisMonthRM)} sub={`This week: ${formatRM(savings.thisWeekRM)}`} accent="blue" />
        <KpiCard icon={Leaf}         label="CO₂ Avoided"                     value={`${savings.co2Tonnes.toFixed(2)} t`} sub={`≈ ${(savings.co2Tonnes * 4.5).toFixed(0)} trees saved`} accent="amber" />
      </div>

      {}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-[28px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-[8px] bg-primary/10 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">Cooler Energy Consumption</h2>
              <p className="text-[12px] text-[#6B7280]">Ranked by current power draw</p>
            </div>
          </div>
          <CoolerEnergyChart meterData={meterData} />
        </GlassCard>

        <GlassCard className="p-[28px] space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-[8px] bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[#111827]">Top Energy Consumers</h2>
                <p className="text-[12px] text-[#6B7280]">Equipment ranked by kW draw</p>
              </div>
            </div>
            <TopConsumers meterData={meterData} />
          </div>
          <div className="border-t border-[#E5E7EB] pt-6 grid grid-cols-2 gap-4">
            <div className="rounded-[12px] bg-white/50 border border-[rgba(255,255,255,0.8)] shadow-sm p-4 text-center">
              <div className="text-[28px] font-bold text-red-500 leading-none">{kpis.ghostLoadCount}</div>
              <div className="text-[11px] font-semibold tracking-wide uppercase text-[#6B7280] mt-1.5">Ghost Load Events</div>
            </div>
            <div className="rounded-[12px] bg-white/50 border border-[rgba(255,255,255,0.8)] shadow-sm p-4 text-center">
              <div className="text-[28px] font-bold text-[#111827] leading-none">{kpis.consolidationCandidateCount}</div>
              <div className="text-[11px] font-semibold tracking-wide uppercase text-[#6B7280] mt-1.5">Consolidations</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {}
      <GlassCard className="px-[32px] py-[28px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-[36px] w-[36px] rounded-[10px] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] flex items-center justify-center flex-shrink-0">
            <Thermometer className="h-5 w-5 text-[#0EA5E9]" />
          </div>
          <div>
            <h2 className="text-[16px] font-[700] text-[#111827]">Temperature Overview</h2>
            <p className="text-[12px] text-[#9CA3AF]">
              Current temp · setpoint · AI-recommended setpoint · utilisation
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-4 text-[11px] font-[500] text-[#6B7280]">
            <span className="flex items-center gap-1.5"><ArrowDown className="h-3 w-3 text-[#10B981]" />Lower</span>
            <span className="flex items-center gap-1.5"><ArrowUp className="h-3 w-3 text-[#EF4444]" />Higher</span>
            <span className="flex items-center gap-1.5"><Minus className="h-3 w-3 text-[#9CA3AF]" />No change</span>
          </div>
        </div>
        <TempGrid rooms={rooms as any} />
      </GlassCard>

      {}
      <ActivityFeed />
    </div>
  )
}
