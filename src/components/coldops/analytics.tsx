'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, Flame, TrendingDown, TrendingUp, Factory, Zap,
  DollarSign, Target, Leaf, ThermometerSun, RefreshCw, Loader2,
  Download, Layers
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import type { AnalyticsData, MeterData, SetbackHistoryItem, MultiZoneData, RoomComparisonData } from '@/lib/coldops/types'
import { formatRM, timeAgo } from '@/lib/coldops/ui'
import { RoiCard } from './shared'

// ============================================================================
// VIEW: ANALYTICS
// ============================================================================

export function AnalyticsView({ analytics, meterData, setbackHistory, onRefresh }: {
  analytics: AnalyticsData | null
  meterData: MeterData | null
  setbackHistory: SetbackHistoryItem[]
  onRefresh: () => void
}) {
  if (!analytics) {
    return (
      <div className="grid place-items-center h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground">Loading analytics…</div>
        </div>
      </div>
    )
  }

  const { heatmap, trend, roi, topRooms, energyMix, tariff } = analytics

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Energy Analytics & ROI
          </h2>
          <p className="text-sm text-muted-foreground">30-day trends · ghost load heatmap · payback analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('/api/export/savings', '_blank')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Savings CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/api/export/work-orders', '_blank')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Work Orders CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ROI hero cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <RoiCard icon={DollarSign} label="Monthly Savings" value={formatRM(roi.monthlySavings)} sub="Current period" tone="optimized" />
        <RoiCard icon={Target} label="Payback Period" value={roi.roiMonths < 1 ? '< 1 month' : `${roi.roiMonths} months`} sub={`SaaS cost: ${formatRM(roi.saasMonthlyCost)}/mo`} tone="active" />
        <RoiCard icon={TrendingUp} label="Annual Net Benefit" value={formatRM(roi.netAnnualBenefit)} sub={`ROI: ${roi.roiPercent}%`} tone={roi.netAnnualBenefit > 0 ? 'optimized' : 'ghost'} />
        <RoiCard icon={Leaf} label="Annual CO₂ Avoided" value={`${(analytics.trend.reduce((s, d) => s + d.co2, 0) * 12 / 30).toFixed(1)} t`} sub="vs TNB grid factor" tone="active" />
      </div>

      {/* Ghost load heatmap */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            24-Hour Ghost Load Heatmap
          </CardTitle>
          <CardDescription className="text-xs">Power draw (kW) by room × hour · red = ghost load active · blue = production active</CardDescription>
        </CardHeader>
        <CardContent>
          <GhostLoadHeatmap data={heatmap} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 30-day savings trend */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              30-Day Savings Trend
            </CardTitle>
            <CardDescription className="text-xs">Daily RM savings · weekends shaded</CardDescription>
          </CardHeader>
          <CardContent>
            <SavingsTrendChart data={trend} />
          </CardContent>
        </Card>

        {/* Energy mix by zone */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4 text-primary" />
              Current Energy Mix by Zone
            </CardTitle>
            <CardDescription className="text-xs">Live power draw · ghost rooms highlighted</CardDescription>
          </CardHeader>
          <CardContent>
            <EnergyMixChart data={energyMix} />
          </CardContent>
        </Card>
      </div>

      {/* Multi-zone 24h comparison */}
      <MultiZoneComparison />

      {/* Room Comparison Radar Chart */}
      <RoomComparisonRadar />

      {/* Top ghost load rooms + Setback history */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-500" />
              Top Ghost Load Rooms
            </CardTitle>
            <CardDescription className="text-xs">Ranked by total RM waste this period</CardDescription>
          </CardHeader>
          <CardContent>
            {topRooms.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No ghost load events recorded.</div>
            ) : (
              <div className="space-y-2">
                {topRooms.map((r, i) => (
                  <div key={r.roomCode} className="flex items-center gap-3 p-2 rounded-lg border border-border/60">
                    <span className={`grid place-items-center h-7 w-7 rounded-full text-xs font-bold ${i === 0 ? 'bg-red-100 text-red-700' : i === 1 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{r.roomCode} · {r.roomName}</div>
                      <div className="text-[11px] text-muted-foreground">{r.zone} · {r.eventCount} events · {r.totalHours}h total</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">{formatRM(r.totalRM)}</div>
                      <div className="text-[10px] text-muted-foreground">waste</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setback history */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-amber-500" />
              Setback History
            </CardTitle>
            <CardDescription className="text-xs">{setbackHistory.length} events · real BMS API executions</CardDescription>
          </CardHeader>
          <CardContent>
            {setbackHistory.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No setback events yet.</div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-2">
                  {setbackHistory.slice(0, 15).map(s => (
                    <div key={s.id} className={`rounded-lg border p-2.5 text-xs ${s.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50/50' : s.status === 'ABORTED' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{s.id}</span>
                          <Badge variant="outline" className="text-[9px]">{s.roomCode}</Badge>
                          <Badge variant="outline" className={`text-[9px] ${s.status === 'COMPLETED' ? 'text-emerald-700' : s.status === 'ABORTED' ? 'text-red-700' : 'text-amber-700'}`}>{s.status}</Badge>
                        </div>
                        {s.estRmSaved > 0 && <span className="font-bold text-emerald-700">{formatRM(s.estRmSaved)}</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{s.startSetpoint}°C → {s.endSetpoint}°C</span>
                        <span>·</span>
                        <span>{s.reason.replace(/_/g, ' ')}</span>
                        {s.completedAt && <span>· {timeAgo(s.completedAt)}</span>}
                        {s.abortedAt && s.abortReason && <span className="text-red-600">· {s.abortReason}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GhostLoadHeatmap({ data }: { data: AnalyticsData['heatmap'] }) {
  const maxKW = Math.max(...data.flatMap(r => r.hours.map(h => h.kw)))
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Hour labels */}
        <div className="flex gap-0.5 mb-1 ml-[120px]">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[8px] text-muted-foreground font-mono">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {/* Room rows */}
        <div className="space-y-0.5">
          {data.map(room => (
            <div key={room.roomCode} className="flex items-center gap-1">
              <div className="w-[115px] flex-shrink-0 text-[10px] font-medium text-right pr-2 truncate">
                <span className="font-mono">{room.roomCode}</span>
                <span className="text-muted-foreground ml-1">{room.zone}</span>
              </div>
              <div className="flex gap-0.5 flex-1">
                {room.hours.map(h => {
                  const intensity = h.kw / maxKW
                  let bg: string
                  if (h.isGhost) {
                    bg = `rgba(239, 68, 68, ${0.3 + intensity * 0.6})`
                  } else if (h.isProd) {
                    bg = `rgba(14, 165, 233, ${0.15 + intensity * 0.3})`
                  } else {
                    bg = `rgba(16, 185, 129, ${0.1 + intensity * 0.2})`
                  }
                  return (
                    <TooltipProvider key={h.hour}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="flex-1 h-6 rounded-sm border border-white/40 cursor-pointer hover:ring-1 hover:ring-primary"
                            style={{ backgroundColor: bg }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="font-mono">{room.roomCode} · {h.hour}:00</div>
                          <div>Power: <b>{h.kW ?? h.kw} kW</b></div>
                          <div>Status: {h.isGhost ? '🔴 Ghost Load' : h.isProd ? '🔵 Production' : '🟢 Idle'}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 ml-[120px] text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }} /> Ghost Load</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'rgba(14, 165, 233, 0.4)' }} /> Production</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }} /> Idle</div>
        </div>
      </div>
    </div>
  )
}

function SavingsTrendChart({ data }: { data: AnalyticsData['trend'] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={4} />
        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" unit=" RM" />
        <RTooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v: any) => [formatRM(v), 'Savings']}
        />
        <Bar dataKey="rm" fill="url(#savingsGrad)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function EnergyMixChart({ data }: { data: AnalyticsData['energyMix'] }) {
  const colors = ['#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899']
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" unit=" kW" />
        <YAxis type="category" dataKey="zone" tick={{ fontSize: 10 }} stroke="#9ca3af" width={70} />
        <RTooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v: any, _name: string, props: any) => [`${v} kW (${props.payload.rooms} rooms, ${props.payload.ghostRooms} ghost)`, 'Power']}
        />
        <Bar dataKey="kw" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ============================================================================
// MULTI-ZONE 24H COMPARISON CHART
// ============================================================================

function MultiZoneComparison() {
  const [data, setData] = useState<MultiZoneData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visibleRooms, setVisibleRooms] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/multi-zone')
      .then(r => r.json())
      .then(d => {
        setData(d)
        // Show all rooms by default except CR-03/CR-04 (blast freezers have different scale)
        setVisibleRooms(new Set(d.rooms.map((r: any) => r.code)))
      })
      .catch(e => console.error('multi-zone fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 grid place-items-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Transform for Recharts: [{ hour: 0, 'CR-01': 12.5, 'CR-02': 13.2, ... }]
  const chartData = data.hours.map(h => {
    const row: any = { hour: h.label }
    for (const room of data.rooms) {
      if (visibleRooms.has(room.code)) {
        const point = room.data.find(d => d.hour === h.hour)
        row[room.code] = point?.kw || 0
      }
    }
    return row
  })

  const toggleRoom = (code: string) => {
    setVisibleRooms(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              24-Hour Multi-Zone Power Comparison
            </CardTitle>
            <CardDescription className="text-xs">
              {data.summary.roomCount} rooms · Peak {data.summary.peakKW} kW at {String(data.summary.peakHour).padStart(2,'0')}:00 · {data.summary.ghostHours} ghost-load hours · Avg {data.summary.totalKW} kW
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Room toggle chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.rooms.map(r => (
            <button
              key={r.code}
              onClick={() => toggleRoom(r.code)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${
                visibleRooms.has(r.code)
                  ? 'border-border/60 bg-card shadow-sm'
                  : 'border-border/30 bg-muted/30 opacity-40'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.code}
              <span className="text-muted-foreground">{r.maxPowerKW}kW</span>
            </button>
          ))}
        </div>

        {/* Multi-line chart */}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={2} />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" unit=" kW" />
            <RTooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(v: any, name: string) => [`${v} kW`, name]}
            />
            {data.rooms.filter(r => visibleRooms.has(r.code)).map(r => (
              <Line
                key={r.code}
                type="monotone"
                dataKey={r.code}
                stroke={r.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend with current values */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/60">
          {data.rooms.filter(r => visibleRooms.has(r.code)).map(r => {
            const currentKW = r.data[r.data.length - 1]?.kw || 0
            const peakRoomKW = Math.max(...r.data.map(d => d.kw))
            return (
              <div key={r.code} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                <div className="min-w-0">
                  <div className="text-[10px] font-medium truncate">{r.code} · {r.name}</div>
                  <div className="text-[9px] text-muted-foreground">Now {currentKW}kW · Peak {peakRoomKW}kW</div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ROOM COMPARISON RADAR CHART
// ============================================================================

function RoomComparisonRadar() {
  const [data, setData] = useState<RoomComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visibleRooms, setVisibleRooms] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/room-comparison')
      .then(r => r.json())
      .then(d => {
        setData(d)
        // Show first 4 rooms by default
        setVisibleRooms(new Set(d.rooms.slice(0, 4).map((r: any) => r.code)))
      })
      .catch(e => console.error('room comparison fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 grid place-items-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Transform for Recharts radar: [{ axis: 'Temp Compliance', 'CR-01': 96, 'CR-02': 99, ... }]
  const chartData = data.axes.map(axis => {
    const row: any = { axis: axis.label }
    for (const room of data.rooms) {
      if (visibleRooms.has(room.code)) {
        row[room.code] = room.metrics[axis.key as keyof typeof room.metrics]
      }
    }
    return row
  })

  const toggleRoom = (code: string) => {
    setVisibleRooms(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const visibleRoomsData = data.rooms.filter(r => visibleRooms.has(r.code))

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Room Comparison Radar
            </CardTitle>
            <CardDescription className="text-xs">
              5-dimension comparison: temp compliance, compressor load, utilization, ghost hours, RM waste · {visibleRooms.size} of {data.rooms.length} rooms shown
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Radar chart */}
          <div>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={chartData} margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#9ca3af' }} />
                <RTooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v: any, name: string) => [`${v}`, name]}
                />
                {visibleRoomsData.map(r => (
                  <Radar
                    key={r.code}
                    name={r.code}
                    dataKey={r.code}
                    stroke={r.color}
                    fill={r.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Room toggle + details */}
          <div className="space-y-3">
            {/* Toggle chips */}
            <div className="flex flex-wrap gap-1.5">
              {data.rooms.map(r => (
                <button
                  key={r.code}
                  onClick={() => toggleRoom(r.code)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${
                    visibleRooms.has(r.code)
                      ? 'border-border/60 bg-card shadow-sm'
                      : 'border-border/30 bg-muted/30 opacity-40'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.code}
                  {r.raw.isGhost && <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />}
                </button>
              ))}
            </div>

            {/* Selected rooms detail table */}
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {visibleRoomsData.map(r => (
                <div key={r.code} className="rounded-md border border-border/60 p-2 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="font-medium">{r.code}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{r.name}</span>
                      {r.raw.isGhost && <Badge variant="outline" className="text-[9px] text-red-700 border-red-300">GHOST</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{r.raw.currentTemp}°C / {r.raw.powerKW}kW</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-[9px]">
                    <MetricCell label="Temp" value={r.metrics.tempCompliance} invert={false} />
                    <MetricCell label="Load" value={r.metrics.compressorLoad} invert={true} />
                    <MetricCell label="Util" value={r.metrics.utilization} invert={false} />
                    <MetricCell label="Ghost" value={r.metrics.ghostHours} invert={true} />
                    <MetricCell label="RM" value={r.metrics.rmWaste} invert={true} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCell({ label, value, invert }: { label: string; value: number; invert: boolean }) {
  // invert=true means lower is better (red high), invert=false means higher is better (green high)
  const color = invert
    ? value > 66 ? 'text-red-600' : value > 33 ? 'text-amber-600' : 'text-emerald-600'
    : value > 66 ? 'text-emerald-600' : value > 33 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="text-center">
      <div className="text-[8px] text-muted-foreground uppercase">{label}</div>
      <div className={`font-bold ${color}`}>{value}</div>
    </div>
  )
}
