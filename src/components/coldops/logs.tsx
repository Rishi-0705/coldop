'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText, Zap, Package, ThermometerSun, ClipboardList, Bell, Camera,
  RefreshCw, Loader2, Filter, AlertTriangle, CheckCircle2, Clock, Cpu,
  ArrowRight, Activity, BadgeHelp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ActivityData, ActivityEvent } from '@/lib/coldops/types'
import { severityColor, formatRM, timeAgo } from '@/lib/coldops/ui'
import { SectionHeader } from './shared'

const techniqueMap: Record<string, { name: string; description: string }> = {
  GHOST_LOAD_DETECTED: {
    name: 'Deterministic Rule Engine',
    description: 'Cross-references 15-minute smart meter data with production schedules. Rule: if power > 130% of idle baseline AND no production scheduled for ≥2 hours, flag as ghost load. No ML — fully explainable.',
  },
  GHOST_LOAD_RESOLVED: {
    name: 'Progressive Setback Engine',
    description: 'Ramped temperature gradually (4°C→8°C in 4 steps) via real HTTP BMS API commands with readback confirmations. Safety guardrails monitored temp every 1.5s.',
  },
  SETBACK_COMPLETED: {
    name: 'Progressive Setback Engine',
    description: '4-step ramp schedule (T+0/4s/8s/12s compressed from 15-min intervals). Each step: POST setpoint → GET confirm → broadcast progress. Compressor load reduced ~40%.',
  },
  SETBACK_EXECUTING: {
    name: 'Progressive Setback Engine',
    description: 'Real-time BMS API integration — HTTP POST to Siemens Desigo REST adapter with requestId tracking + readback confirmation at each step.',
  },
  SETBACK_ABORTED: {
    name: 'Safety Guardrail System',
    description: 'Auto-aborted setback when temperature sensor read outside safe range. Reverted setpoint to original value immediately. Safety > savings.',
  },
  WORK_ORDER_CREATED: {
    name: 'Greedy Consolidation Planner',
    description: 'FEFO-ordered pallet assignment with allergen segregation checks. Groups rooms by temperature band, picks destination with most headroom, calculates net benefit (energy saving − labor cost).',
  },
  WORK_ORDER_COMPLETED: {
    name: 'WMS Integration + Auto-Setback',
    description: 'Updated pallet locations in WMS, triggered progressive setbacks on emptied source rooms. Savings counter incremented based on maxPowerKW × 0.4 × tariff × 8h.',
  },
  NOTIFICATION_APPROVED: {
    name: 'Human-in-the-Loop Approval',
    description: 'Supervisor approved the system recommendation. Triggers automated execution via existing engines (setback or work order). One-tap approve from dashboard or Quick Actions panel.',
  },
  NOTIFICATION_DEFERRED: {
    name: 'Deferred Action Queue',
    description: 'Supervisor deferred the alert — it remains in the open queue for later review. No automated action taken.',
  },
  NOTIFICATION_DISMISSED: {
    name: 'Alert Dismissal',
    description: 'Supervisor dismissed the alert as not actionable. Removed from the active queue.',
  },
}

const categoryIcon: Record<string, any> = {
  GHOST: Zap,
  SETBACK: ThermometerSun,
  WORK: ClipboardList,
  NOTIFICATION: Bell,
  CAMERA: Camera,
}

const categoryColor: Record<string, string> = {
  GHOST: 'text-red-500',
  SETBACK: 'text-amber-500',
  WORK: 'text-emerald-500',
  NOTIFICATION: 'text-sky-500',
  CAMERA: 'text-violet-500',
}

export function LogsView() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  const fetchActivity = () => {
    setLoading(true)
    fetch('/api/activity')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('activity fetch failed', e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.resolve().then(fetchActivity)
    const interval = setInterval(fetchActivity, 10000)
    return () => clearInterval(interval)
  }, [])

  const categories = data ? Array.from(new Set(data.events.map(e => e.type.split('_')[0]))) : []
  const filtered = data ? (filter === 'ALL' ? data.events : data.events.filter(e => e.type.startsWith(filter))) : []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          Detection Logs — Audit Trail & Scenario Results
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Every detection event with clear descriptions of the ML technique / automation used. When you test anomalies (via camera scans or system triggers), the outcome appears here with a full explanation.
        </p>
      </div>

      {/* Stats + filters */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : data ? (
              <>
                <div className="text-xs text-muted-foreground">
                  <b className="text-foreground">{data.stats.total}</b> total events · <b className="text-foreground">{data.stats.last24h}</b> in last 24h · <b className="text-foreground">{formatRM(data.stats.totalRmImpact)}</b> total RM impact
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <Button variant={filter === 'ALL' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => setFilter('ALL')}>All</Button>
                  {categories.map(cat => (
                    <Button key={cat} variant={filter === cat ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => setFilter(cat)}>
                      {cat === 'GHOST' ? 'Ghost Load' : cat === 'SETBACK' ? 'Setback' : cat === 'WORK' ? 'Work Orders' : cat === 'NOTIFICATION' ? 'Alerts' : cat}
                    </Button>
                  ))}
                </div>
              </>
            ) : null}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto" onClick={fetchActivity}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log entries */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center h-[300px]">
              <div className="text-center">
                <ScrollText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">No log entries match this filter.</div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="p-3 space-y-2">
                <AnimatePresence mode="popLayout">
                  {filtered.map((event, i) => (
                    <LogEntry key={event.id} event={event} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// LOG ENTRY — with technique description
// ============================================================================

function LogEntry({ event, index }: { event: ActivityEvent; index: number }) {
  const c = severityColor(event.severity as any) || severityColor('LOW')
  const category = event.type.split('_')[0]
  const Icon = categoryIcon[category] || Activity
  const catColor = categoryColor[category] || 'text-muted-foreground'
  const technique = techniqueMap[event.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      className={`rounded-lg border ${c.border} ${c.bg} p-3`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`grid place-items-center h-8 w-8 rounded-lg bg-card/80 ${catColor} flex-shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{event.title}</span>
            <Badge variant="outline" className={`text-[9px] ${c.text} border-current`}>{event.severity}</Badge>
            <Badge variant="outline" className="text-[9px]">{event.type.replace(/_/g, ' ')}</Badge>
          </div>

          {/* Description */}
          <div className="text-xs text-muted-foreground mb-2">{event.description}</div>

          {/* Technique used */}
          {technique && (
            <div className="rounded-md bg-card/60 border border-border/40 p-2 mb-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Cpu className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Technique: {technique.name}</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">{technique.description}</div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo(event.timestamp)}
            </span>
            {event.roomCode && <span>· Room {event.roomCode}</span>}
            {event.rmImpact > 0 && <span className={c.text}>· {formatRM(event.rmImpact)} impact</span>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
