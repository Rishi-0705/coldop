'use client'

import { useState, useEffect } from 'react'
import {
  Bell, Filter, X, Check, Clock, CheckCircle2, Loader2,
  ChevronRight, History, Zap, ArrowLeftRight, ThermometerSun,
  ClipboardList, AlertTriangle, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Notification, Severity, NotificationDetail } from '@/lib/coldops/types'
import {
  severityColor, formatRM, formatDuration, timeAgo, channelIcon
} from '@/lib/coldops/ui'
import { SeverityTabs, ChannelIcon } from './shared'

// ============================================================================
// VIEW: NOTIFICATIONS
// ============================================================================

export function NotificationsView({ notifs, counts, onAction }: { notifs: Notification[]; counts: Record<string, number>; onAction: () => void }) {
  const [filter, setFilter] = useState<Severity | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [acting, setActing] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

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
          <p className="text-sm text-muted-foreground">Severity-sorted · approve to trigger automated response · click for full detail</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed">
            Central queue for every actionable event ColdOps detects — <b>ghost load</b>, <b>consolidation candidate</b>, <b>setback opportunity</b>, <b>safety</b>, and <b>system</b> alerts. Each notification carries an <b>RM impact</b>, an <b>actionType</b> (APPROVE_SETBACK / GENERATE_WORK_ORDER / NONE), and a <b>severity badge</b> computed from the same scoring formula used everywhere else. One-tap <b>Approve</b> fires the corresponding engine — the human stays in the loop on every money-moving decision.
          </p>
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
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                  <div className="text-lg font-medium">All clear</div>
                  <div className="text-sm text-muted-foreground">No notifications match this filter.</div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map((n, idx) => {
              const c = severityColor(n.severity)
              const isOpen = n.status === 'OPEN'
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                >
                  <Card className={`${c.border} ${isOpen ? c.bg : 'opacity-60'} border cursor-pointer hover:shadow-md transition-shadow group`} onClick={() => setDetailId(n.id)}>
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
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isOpen && n.actionType && n.actionType !== 'NONE' && (
                            <>
                              <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-xs" onClick={(e) => { e.stopPropagation(); act(n.id, 'approve') }} disabled={acting === n.id}>
                                {acting === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                <span className="ml-1">Approve</span>
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); act(n.id, 'defer') }} disabled={acting === n.id}>
                                Defer
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); act(n.id, 'dismiss') }} disabled={acting === n.id}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <NotificationDetailModal notifId={detailId} onClose={() => setDetailId(null)} onAction={act} acting={acting} />
    </div>
  )
}

// ============================================================================
// NOTIFICATION DETAIL MODAL
// ============================================================================

function NotificationDetailModal({ notifId, onClose, onAction, acting }: { notifId: string | null; onClose: () => void; onAction: (id: string, action: 'approve' | 'defer' | 'dismiss') => void; acting: string | null }) {
  const [detail, setDetail] = useState<NotificationDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!notifId) {
      Promise.resolve().then(() => setDetail(null))
      return
    }
    let cancelled = false
    Promise.resolve().then(() => setLoading(true))
    fetch(`/api/notifications/${notifId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setDetail(d) })
      .catch(e => { if (!cancelled) console.error('notif detail fetch failed', e) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [notifId])

  const notif = detail?.notification

  return (
    <Dialog open={!!notifId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {notif ? (
              <>
                {getTypeIcon(notif.type)}
                {notif.title}
              </>
            ) : 'Loading...'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {notif ? `${notif.type.replace(/_/g, ' ')} · ${notif.severity} severity · created ${timeAgo(notif.createdAt)}` : 'Fetching notification details...'}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail || !notif ? (
          <div className="grid place-items-center h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4">
              {/* Message + impact */}
              <div className={`rounded-lg border p-3 ${severityColor(notif.severity).border} ${severityColor(notif.severity).bg}`}>
                <div className="text-sm">{notif.message}</div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/40">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">RM Impact</div>
                    <div className={`text-lg font-bold ${severityColor(notif.severity).text}`}>{formatRM(notif.rmImpact)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">RM / Hour</div>
                    <div className="text-lg font-bold">{notif.rmPerHour > 0 ? formatRM(notif.rmPerHour) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Duration</div>
                    <div className="text-lg font-bold">{notif.durationHours > 0 ? formatDuration(notif.durationHours) : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {notif.status === 'OPEN' && notif.actionType && notif.actionType !== 'NONE' && (
                <div className="flex items-center gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700 flex-1" onClick={() => onAction(notif.id, 'approve')} disabled={acting === notif.id}>
                    {acting === notif.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Approve & Execute
                  </Button>
                  <Button variant="outline" onClick={() => onAction(notif.id, 'defer')} disabled={acting === notif.id}>
                    Defer
                  </Button>
                  <Button variant="ghost" onClick={() => onAction(notif.id, 'dismiss')} disabled={acting === notif.id}>
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Timeline */}
              <div>
                <div className="text-xs font-medium flex items-center gap-1.5 mb-3">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  Action Timeline
                </div>
                <div className="space-y-3">
                  {detail.timeline.map((evt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`h-2.5 w-2.5 rounded-full ${getTimelineDotColor(evt.event)}`} />
                        {i < detail.timeline.length - 1 && <div className="w-px flex-1 bg-border/60 min-h-[24px]" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] font-mono ${getTimelineBadgeColor(evt.event)}`}>
                            {evt.event.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(evt.at)}</span>
                          {evt.rmImpact !== undefined && evt.rmImpact > 0 && (
                            <span className="text-[10px] text-red-600 font-medium">-{formatRM(evt.rmImpact)}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{evt.description}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Related entity summary */}
              {detail.related && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs font-medium mb-2">Related Records</div>
                    {detail.related.type === 'GHOST_LOAD' && (
                      <div className="space-y-2">
                        {detail.related.ghostEvents?.slice(0, 3).map((ge: any) => (
                          <div key={ge.id} className="rounded-md border border-border/60 p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono">{ge.rule.replace(/_/g, ' ')}</span>
                              <Badge variant={ge.status === 'ACTIVE' ? 'destructive' : 'outline'} className="text-[9px]">{ge.status}</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {ge.actualKW}kW actual vs {ge.expectedIdleKW}kW idle · {formatDuration(ge.durationHours)} · {formatRM(ge.rmWaste)} waste
                            </div>
                          </div>
                        ))}
                        {detail.related.setbacks?.slice(0, 3).map((sb: any) => (
                          <div key={sb.id} className="rounded-md border border-border/60 p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono">{sb.id}</span>
                              <Badge variant="outline" className="text-[9px]">{sb.status}</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {sb.startSetpoint}°C → {sb.endSetpoint}°C · {sb.reason.replace(/_/g, ' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {detail.related.type === 'WORK_ORDER' && (
                      <div className="space-y-2">
                        {detail.related.workOrders?.slice(0, 3).map((wo: any) => (
                          <div key={wo.id} className="rounded-md border border-border/60 p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{wo.title}</span>
                              <Badge variant="outline" className="text-[9px]">{wo.status}</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {wo.totalMoves} moves · {wo.assignedTo || 'unassigned'} · {wo.rmSaved > 0 ? `${formatRM(wo.rmSaved)} saved` : `${formatRM(wo.rmSavedPerHour)}/hr est`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Footer info */}
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div>ID: <span className="font-mono">{notif.id.slice(-12)}</span></div>
                <div>Channels: <span>{notif.channels}</span></div>
                <div>Action type: <span className="font-mono">{notif.actionType || 'NONE'}</span></div>
                <div>Status: <span className="font-mono">{notif.status}</span></div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}

function getTypeIcon(type: string) {
  const map: Record<string, any> = {
    GHOST_LOAD: Zap,
    CONSOLIDATION: ArrowLeftRight,
    SETBACK: ThermometerSun,
    WORK_ORDER: ClipboardList,
    SAFETY: AlertTriangle,
    SYSTEM: Info,
  }
  const Icon = map[type] || Bell
  return <Icon className="h-4 w-4 text-primary" />
}

function getTimelineDotColor(event: string): string {
  if (event.includes('CREATED')) return 'bg-sky-500'
  if (event.includes('APPROVED')) return 'bg-blue-500'
  if (event.includes('DEFERRED')) return 'bg-amber-500'
  if (event.includes('DISMISSED')) return 'bg-zinc-400'
  if (event.includes('RESOLVED') || event.includes('COMPLETED')) return 'bg-blue-500'
  if (event.includes('DETECTED')) return 'bg-red-500'
  if (event.includes('SETBACK')) return 'bg-amber-500'
  if (event.includes('WORK_ORDER')) return 'bg-purple-500'
  return 'bg-muted-foreground'
}

function getTimelineBadgeColor(event: string): string {
  if (event.includes('CREATED')) return 'text-sky-700 border-sky-300'
  if (event.includes('APPROVED')) return 'text-blue-700 border-blue-300'
  if (event.includes('RESOLVED') || event.includes('COMPLETED')) return 'text-blue-700 border-blue-300'
  if (event.includes('DETECTED')) return 'text-red-700 border-red-300'
  if (event.includes('SETBACK')) return 'text-amber-700 border-amber-300'
  return 'text-muted-foreground'
}
