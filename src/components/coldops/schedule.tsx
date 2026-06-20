'use client'

import {
  Calendar, Timer, AlertTriangle, CheckCircle2, ClipboardList, RefreshCw, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ProductionScheduleData } from '@/lib/coldops/types'
import { formatRM } from '@/lib/coldops/ui'

// ============================================================================
// VIEW: PRODUCTION SCHEDULE
// ============================================================================

export function ScheduleView({ schedule, onRefresh }: { schedule: ProductionScheduleData | null; onRefresh: () => void }) {
  if (!schedule) {
    return (
      <div className="grid place-items-center h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground">Loading production schedule…</div>
        </div>
      </div>
    )
  }

  const now = new Date(schedule.now)
  const windowStart = new Date(now.getTime() - 12 * 3600 * 1000)
  const windowEnd = new Date(now.getTime() + 24 * 3600 * 1000)
  const totalHours = (windowEnd.getTime() - windowStart.getTime()) / 3600000

  // Group by line
  const lines = schedule.lines as any[]
  const ghostWindows = schedule.ghostWindows

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Production Schedule
          </h2>
          <p className="text-sm text-muted-foreground">Shift rosters · batch timing · ghost load windows detected</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed">
            Renders an interactive <b>Gantt chart</b> of production batches across every line for the last 12 hours + next 24 hours. The <b>deterministic ghost load detector</b> scans the schedule for idle gaps ≥2h between batches and overlays them as dashed red <b>GHOST windows</b> — these are the future opportunities the setback engine can act on automatically. This is the planning surface that lets the operations team pre-approve setbacks for tonight’s idle windows before they cost money.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Gantt chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            Production Gantt — Last 12h → Next 24h
          </CardTitle>
          <CardDescription className="text-xs">
            Green bars = scheduled production · Red bars = ghost load windows (idle gaps ≥ 2h) · Dashed line = now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Hour axis */}
              <div className="flex ml-[100px] mb-2">
                {Array.from({ length: Math.ceil(totalHours) }, (_, i) => {
                  const h = new Date(windowStart.getTime() + i * 3600000)
                  const isNow = Math.abs(h.getTime() - now.getTime()) < 1800000
                  return (
                    <div key={i} className={`flex-1 text-center text-[9px] font-mono ${isNow ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {h.getHours()}h
                    </div>
                  )
                })}
              </div>

              {/* Line rows */}
              <div className="space-y-1.5">
                {lines.map(line => {
                  const batches = line.batches.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.endTime).getTime())
                  const lineGhosts = ghostWindows.filter(g => g.line === line.line)
                  const isRunning = line.current !== null
                  return (
                    <div key={line.line} className="flex items-center gap-2">
                      <div className="w-[95px] flex-shrink-0">
                        <div className="text-xs font-medium truncate">{line.line}</div>
                        <div className="flex items-center gap-1">
                          {isRunning ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          )}
                          <span className="text-[9px] text-muted-foreground">{isRunning ? 'Running' : 'Idle'}</span>
                        </div>
                      </div>
                      <div className="relative flex-1 h-8 bg-zinc-50 rounded border border-border/60 overflow-hidden">
                        {/* Now line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary/50 z-10"
                          style={{ left: `${((now.getTime() - windowStart.getTime()) / (windowEnd.getTime() - windowStart.getTime())) * 100}%` }}
                        />
                        {/* Batch bars */}
                        {batches.map((b: any) => {
                          const bStart = new Date(b.startTime).getTime()
                          const bEnd = new Date(b.endTime).getTime()
                          const left = ((bStart - windowStart.getTime()) / (windowEnd.getTime() - windowStart.getTime())) * 100
                          const width = ((bEnd - bStart) / (windowEnd.getTime() - windowStart.getTime())) * 100
                          if (left > 100 || left + width < 0) return null
                          return (
                            <TooltipProvider key={b.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="absolute top-1 bottom-1 rounded bg-blue-500/80 hover:bg-blue-600 cursor-pointer flex items-center px-1 overflow-hidden"
                                    style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` }}
                                  >
                                    <span className="text-[8px] text-white font-mono truncate">{b.batchId}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <div className="font-mono">{b.line} · {b.batchId}</div>
                                  <div>{b.shift} shift</div>
                                  <div>{new Date(b.startTime).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })} → {new Date(b.endTime).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                        {/* Ghost windows */}
                        {lineGhosts.map((g, gi) => {
                          const left = ((new Date(g.start).getTime() - windowStart.getTime()) / (windowEnd.getTime() - windowStart.getTime())) * 100
                          const width = ((new Date(g.end).getTime() - new Date(g.start).getTime()) / (windowEnd.getTime() - windowStart.getTime())) * 100
                          if (left > 100 || left + width < 0) return null
                          return (
                            <TooltipProvider key={gi}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="absolute top-1 bottom-1 rounded border-2 border-dashed border-red-400 bg-red-100/50 cursor-pointer"
                                    style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` }}
                                  >
                                    <div className="text-[8px] text-red-700 font-mono text-center pt-0.5">GHOST {g.durationHours}h</div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <div className="text-red-700 font-semibold">Ghost Load Window</div>
                                  <div>{g.durationHours}h idle gap</div>
                                  <div>{new Date(g.start).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })} → {new Date(g.end).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ghost load windows summary */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Detected Ghost Load Windows
          </CardTitle>
          <CardDescription className="text-xs">Idle gaps ≥ 2h between production batches — prime targets for setback automation</CardDescription>
        </CardHeader>
        <CardContent>
          {ghostWindows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              No ghost load windows detected in the next 24h.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ghostWindows.map((g, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-semibold text-sm">{g.line}</span>
                    <Badge variant="outline" className="text-[10px] text-red-700 border-red-300">{g.durationHours}h idle</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(g.start).toLocaleString('en-MY', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    {' → '}
                    {new Date(g.end).toLocaleString('en-MY', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </div>
                  <div className="mt-2 text-[10px] text-red-600 font-medium">
                    Est. waste: {formatRM(g.durationHours * 9.18)} at RM 9.18/hr
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch list */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Upcoming Batches
          </CardTitle>
          <CardDescription className="text-xs">{schedule.schedules.length} scheduled batches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {schedule.schedules.map(s => {
              const isPast = new Date(s.endTime) < now
              const isCurrent = new Date(s.startTime) <= now && new Date(s.endTime) >= now
              const isFuture = new Date(s.startTime) > now
              return (
                <div key={s.id} className={`rounded-lg border p-3 ${isCurrent ? 'border-blue-300 bg-blue-50/50' : isFuture ? 'border-border/60' : 'border-border/40 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-semibold text-sm">{s.batchId}</span>
                    {isCurrent && <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">Live</Badge>}
                    {isFuture && <Badge variant="outline" className="text-[10px]">Upcoming</Badge>}
                    {isPast && <Badge variant="outline" className="text-[10px] text-muted-foreground">Done</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.line}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(s.startTime).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })} → {new Date(s.endTime).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.shift} shift</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
