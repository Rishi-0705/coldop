'use client'

import { useState } from 'react'
import {
  Bell, Filter, X, Check, Clock, CheckCircle2, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Notification, Severity } from '@/lib/coldops/types'
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
          <p className="text-sm text-muted-foreground">Severity-sorted · approve to trigger automated response</p>
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
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <div className="text-lg font-medium">All clear</div>
              <div className="text-sm text-muted-foreground">No notifications match this filter.</div>
            </CardContent>
          </Card>
        ) : (
          filtered.map(n => {
            const c = severityColor(n.severity)
            const isOpen = n.status === 'OPEN'
            return (
              <Card key={n.id} className={`${c.border} ${isOpen ? c.bg : 'opacity-60'} border`}>
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
                    {isOpen && n.actionType && n.actionType !== 'NONE' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => act(n.id, 'approve')} disabled={acting === n.id}>
                          {acting === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          <span className="ml-1">Approve</span>
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => act(n.id, 'defer')} disabled={acting === n.id}>
                          Defer
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => act(n.id, 'dismiss')} disabled={acting === n.id}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
