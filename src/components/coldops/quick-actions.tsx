'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, ChevronUp, X, Check, Loader2, ArrowLeftRight,
  ThermometerSun, Bell, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { formatRM, severityColor } from '@/lib/coldops/ui'
import type { Notification } from '@/lib/coldops/types'

/**
 * Quick Actions floating panel — shows the top critical notification
 * with a one-tap approve button. Collapsible.
 */
export function QuickActions({ notifs, onAction }: { notifs: Notification[]; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  // Get top open notifications (severity-sorted)
  const openNotifs = notifs
    .filter(n => n.status === 'OPEN' && n.actionType && n.actionType !== 'NONE')
    .slice(0, 3)

  const criticalCount = notifs.filter(n => n.status === 'OPEN' && n.severity === 'CRITICAL').length
  const highCount = notifs.filter(n => n.status === 'OPEN' && n.severity === 'HIGH').length

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

  // Don't render if no open notifications
  if (openNotifs.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[380px]">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Zap className="h-4 w-4 text-primary" />
                  {criticalCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                <span className="font-semibold text-sm">Quick Actions</span>
                <Badge variant="outline" className="text-[10px]">{openNotifs.length} pending</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto p-2 space-y-1.5">
              {openNotifs.map(n => {
                const c = severityColor(n.severity)
                return (
                  <div key={n.id} className={`rounded-lg border ${c.border} ${c.bg} p-2.5`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`mt-1 h-2 w-2 rounded-full ${c.dot} flex-shrink-0 animate-pulse`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-medium text-xs truncate">{n.title}</span>
                          <Badge variant="outline" className={`text-[9px] ${c.text} border-current`}>{n.severity}</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {n.rmImpact > 0 && `${formatRM(n.rmImpact)} impact · `}
                          {n.rmPerHour > 0 && `${formatRM(n.rmPerHour)}/hr`}
                          {n.rmImpact === 0 && n.rmPerHour === 0 && n.message.slice(0, 60) + '...'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className="h-6 bg-emerald-600 hover:bg-emerald-700 text-[10px] flex-1"
                        onClick={() => act(n.id, 'approve')}
                        disabled={acting === n.id}
                      >
                        {acting === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        <span className="ml-1">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => act(n.id, 'defer')}
                        disabled={acting === n.id}
                      >
                        Defer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => act(n.id, 'dismiss')}
                        disabled={acting === n.id}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border/60 bg-muted/30 text-[9px] text-muted-foreground text-center">
              One-tap approve triggers automated setback via BMS API
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpanded(true)}
            className="relative grid place-items-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow"
          >
            <Zap className="h-5 w-5" />
            {criticalCount + highCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 grid place-items-center text-[10px] font-bold rounded-full bg-red-500 text-white ring-2 ring-card">
                {criticalCount + highCount}
              </span>
            )}
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary"
              animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
