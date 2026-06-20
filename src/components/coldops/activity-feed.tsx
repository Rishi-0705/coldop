'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, CheckCircle2, AlertTriangle, ThermometerSun, ClipboardList,
  X, Clock, Activity as ActivityIcon, RefreshCw, Loader2, Bell
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ActivityData, ActivityEvent } from '@/lib/coldops/types'
import { formatRM, timeAgo } from '@/lib/coldops/ui'
import { LiveDot } from './motion'

const iconMap: Record<string, any> = {
  Zap, CheckCircle2, AlertTriangle, ThermometerSun, ClipboardList, X, Clock, Bell
}

const severityColors: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  CRITICAL: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50/50', border: 'border-red-200' },
  HIGH: { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50/50', border: 'border-orange-200' },
  MEDIUM: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50/50', border: 'border-amber-200' },
  LOW: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50/50', border: 'border-blue-200' },
}

export function ActivityFeed() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchActivity = () => {
    fetch('/api/activity')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('activity fetch failed', e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 10000) 
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" />
              Live Activity Feed
              <LiveDot color="bg-blue-500" size="h-1.5 w-1.5" />
            </CardTitle>
            <CardDescription className="text-xs">
              {loading ? 'Loading...' : `${data?.stats.total || 0} events · ${data?.stats.last24h || 0} in last 24h · ${formatRM(data?.stats.totalRmImpact || 0)} total impact`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchActivity}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid place-items-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.events.length === 0 ? (
          <div className="text-center py-8">
            <ActivityIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">No activity recorded yet.</div>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {data.events.map((event, i) => (
                  <ActivityRow key={event.id} event={event} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityRow({ event, index }: { event: ActivityEvent; index: number }) {
  const Icon = iconMap[event.icon] || ActivityIcon
  const sev = severityColors[event.severity] || severityColors.LOW

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      className={`flex items-start gap-2.5 rounded-lg border ${sev.border} ${sev.bg} p-2.5 hover:shadow-sm transition-shadow`}
    >
      <div className={`grid place-items-center h-7 w-7 rounded-lg bg-card/80 ${sev.text} flex-shrink-0`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-medium text-xs truncate">{event.title}</span>
          <Badge variant="outline" className={`text-[9px] ${sev.text} border-current`}>{event.severity}</Badge>
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{event.description}</div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{timeAgo(event.timestamp)}</span>
          {event.roomCode && <span>· {event.roomCode}</span>}
          {event.rmImpact > 0 && <span className={sev.text}>· {formatRM(event.rmImpact)}</span>}
        </div>
      </div>
    </motion.div>
  )
}
