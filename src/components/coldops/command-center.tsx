'use client'

import {
  Zap, TrendingDown, Leaf, AlertTriangle, Activity, CheckCircle2,
  ThermometerSun, Layers, Bell, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import type {
  DashboardData, RoomWithBms, ActiveSetback, MeterData
} from '@/lib/coldops/types'
import {
  severityColor, roomStatusColor, formatRM, formatKW, formatTemp,
  formatDuration, timeAgo
} from '@/lib/coldops/ui'
import { KpiCard, ActiveSetbackCard } from './shared'

// ============================================================================
// VIEW: COMMAND CENTER
// ============================================================================

export function CommandCenter({ dashboard, rooms, activeSetbacks, meterData, onNeedMeter }: { dashboard: DashboardData | null; rooms: RoomWithBms[]; activeSetbacks: ActiveSetback[]; meterData: MeterData | null; onNeedMeter: () => void }) {
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
            <GhostLoadChart meterData={meterData} />
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

function GhostLoadChart({ meterData }: { meterData: MeterData | null }) {
  if (!meterData || meterData.timeline.length === 0) {
    return (
      <div className="h-[260px] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground mt-2">Loading meter data…</span>
      </div>
    )
  }
  const data = meterData.timeline.map(p => ({
    t: p.t,
    kw: p.kw,
    idle: p.idle,
    isGhost: p.isGhost,
  }))
  const maxIdle = Math.max(...data.map(d => d.idle))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <RTooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v: any, name: string) => [`${v} kW`, name === 'kw' ? 'Power draw' : 'Expected idle']}
        />
        <ReferenceLine y={maxIdle} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Idle baseline', fontSize: 10, fill: '#10b981', position: 'insideTopRight' }} />
        <Area type="monotone" dataKey="kw" name="kw" stroke="#ef4444" strokeWidth={2} fill="url(#kwGrad)" />
        <Area type="monotone" dataKey="idle" name="idle" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#idleGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
