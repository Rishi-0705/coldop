'use client'

import { useState } from 'react'
import {
  ClipboardList, ThermometerSun, Clock, CheckCircle2, ChevronRight,
  ArrowRight, Check, Loader2, CircleDot
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { WorkOrder, ActiveSetback } from '@/lib/coldops/types'
import { formatRM, timeAgo } from '@/lib/coldops/ui'
import { ActiveSetbackCard } from './shared'





export function WorkOrdersView({ workOrders, activeSetbacks, onComplete }: { workOrders: WorkOrder[]; activeSetbacks: ActiveSetback[]; onComplete: () => void }) {
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const complete = async (id: string) => {
    setCompletingId(id)
    try {
      const r = await fetch(`/api/work-orders/${id}/complete`, { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast.success(`Completed in ${d.elapsedMin} min · ${d.setbacks?.length || 0} setbacks triggered`)
        onComplete()
      } else {
        toast.error(d.error || 'Failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCompletingId(null)
    }
  }

  const pending = workOrders.filter(w => w.status !== 'COMPLETED')
  const completed = workOrders.filter(w => w.status === 'COMPLETED')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Work Orders
          </h2>
          <p className="text-sm text-muted-foreground">Consolidation tasks dispatched to warehouse · FEFO-sequenced · allergen-checked</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed">
            Lists the <b>greedy consolidation planner</b> output as actionable move tasks for warehouse staff — each work order carries a FEFO-ordered pallet sequence, allergen segregation checks, an estimated labor minute budget, and a net-benefit figure (energy saved minus labor cost). Completing a task fires a <b>POST /api/work-orders/{`{id}`}/complete</b> that updates WMS pallet locations and auto-triggers <b>Progressive Setback</b> on the emptied source rooms — closing the loop from plan → physical move → automated BMS recovery.
          </p>
        </div>
      </div>

      {}
      {activeSetbacks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-amber-600" />
              {activeSetbacks.length} Active Setback{activeSetbacks.length > 1 ? 's' : ''} · BMS API Live
            </CardTitle>
            <CardDescription className="text-xs">Progressive ramp commands executing against the BMS simulator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeSetbacks.map(s => <ActiveSetbackCard key={s.setbackId} setback={s} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Pending & In Progress ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">No pending work orders.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {pending.map(wo => (
              <WorkOrderCard
                key={wo.id}
                wo={wo}
                expanded={expanded === wo.id}
                onToggle={() => setExpanded(expanded === wo.id ? null : wo.id)}
                onComplete={() => complete(wo.id)}
                completing={completingId === wo.id}
              />
            ))}
          </div>
        )}
      </div>

      {}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500" /> Recently Completed ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.map(wo => (
              <Card key={wo.id} className="border-blue-200 bg-blue-50/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{wo.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {wo.assignedTo} · {wo.estLaborMinutes} min est · completed {timeAgo(wo.completedAt || wo.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-700">{formatRM(wo.rmSaved || wo.rmSavedPerHour)}</div>
                      <div className="text-[10px] text-muted-foreground">saved</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WorkOrderCard({ wo, expanded, onToggle, onComplete, completing }: {
  wo: WorkOrder; expanded: boolean; onToggle: () => void; onComplete: () => void; completing: boolean
}) {
  const pct = wo.totalMoves > 0 ? (wo.completedMoves / wo.totalMoves) * 100 : 0
  return (
    <Card className="border-border/60">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{wo.title}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{wo.status}</Badge>
              {wo.assignedTo && <span>· {wo.assignedTo}</span>}
              <span>· {wo.totalMoves} moves · {wo.estLaborMinutes} min</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-blue-700">{formatRM(wo.rmSavedPerHour)}/hr</div>
            <div className="text-[10px] text-muted-foreground">est. saving</div>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onComplete} disabled={completing}>
            {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Complete</span>
          </Button>
        </div>
        <Progress value={pct} className="h-1 mt-2" />
        {expanded && wo.moves && wo.moves.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5 max-h-72 overflow-y-auto">
            {wo.moves.map(m => (
              <div key={m.id} className={`flex items-center gap-2 text-xs rounded-md p-2 ${m.confirmedAt ? 'bg-blue-50 border border-blue-200' : 'bg-zinc-50 border border-border/60'}`}>
                <span className={`grid place-items-center h-5 w-5 rounded-full text-[10px] font-bold ${m.confirmedAt ? 'bg-blue-500 text-white' : 'bg-primary/10 text-primary'}`}>{m.sequence}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.productName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{m.lotNo}</div>
                </div>
                {!m.allergenOk && <Badge variant="outline" className="text-[10px] text-red-700 border-red-300">allergen</Badge>}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="px-1 rounded bg-red-50 text-red-700">{m.fromRoomCode}:{m.fromBayCode}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="px-1 rounded bg-blue-50 text-blue-700">{m.toRoomCode}:{m.toBayCode}</span>
                </div>
                {m.confirmedAt ? <Check className="h-3.5 w-3.5 text-blue-500" /> : <CircleDot className="h-3.5 w-3.5 text-muted-foreground/50" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
