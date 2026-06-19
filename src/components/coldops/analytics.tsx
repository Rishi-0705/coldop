'use client'

import {
  BarChart3, Flame, TrendingDown, TrendingUp, Factory, Zap,
  DollarSign, Target, Leaf, ThermometerSun, RefreshCw, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell
} from 'recharts'
import type { AnalyticsData, MeterData, SetbackHistoryItem } from '@/lib/coldops/types'
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
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
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
