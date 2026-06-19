'use client'

import { useState } from 'react'
import {
  Map as MapIcon, ArrowRight, ArrowLeftRight, ClipboardList, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { RoomWithBms, ConsolidationPlan } from '@/lib/coldops/types'
import { roomStatusColor, formatRM, formatKW, formatTemp } from '@/lib/coldops/ui'
import { Legend, Metric } from './shared'

// ============================================================================
// VIEW: COLD ROOM MAP
// ============================================================================

export function ColdRoomMap({ rooms, plan, onExecutePlan }: { rooms: RoomWithBms[]; plan: ConsolidationPlan | null; onExecutePlan: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const selectedRoom = rooms.find(r => r.id === selected)

  const executePlan = async () => {
    setExecuting(true)
    try {
      const r = await fetch('/api/consolidation/execute', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast.success(`Work order created: ${d.plan.palletCount} pallets to move`)
        onExecutePlan()
      } else {
        toast.error(d.error || 'Failed to create work order')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-primary" />
            Factory Floor — Cold Room Map
          </h2>
          <p className="text-sm text-muted-foreground">Marigold PJ · 8 rooms · real-time BMS telemetry</p>
        </div>
        <Legend />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Floor plan */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live Floor Plan</CardTitle>
            <CardDescription className="text-xs">Click a room to inspect. Colors update from BMS + WMS data.</CardDescription>
          </CardHeader>
          <CardContent>
            <FloorPlan rooms={rooms} selected={selected} onSelect={setSelected} plan={plan} />
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {selectedRoom ? (
            <RoomDetailCard room={selectedRoom} />
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-6 text-center">
                <MapIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Select a cold room to inspect its live status, temperature, and pallet inventory.</div>
              </CardContent>
            </Card>
          )}

          {plan && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                  Consolidation Plan
                </CardTitle>
                <CardDescription className="text-xs">Greedy FEFO assignment · allergen-checked</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  Move <b>{plan.palletCount} pallets</b> from{' '}
                  {plan.sourceRoomCodes.map((c, i) => (
                    <span key={c}>
                      <Badge variant="outline" className="text-[10px] mx-0.5">{c}</Badge>
                      {i < plan.sourceRoomCodes.length - 1 ? '+' : ''}
                    </span>
                  ))}{' '}
                  → <Badge variant="outline" className="text-[10px] mx-0.5">{plan.destRoomCode}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Energy saving</div>
                    <div className="font-semibold text-emerald-700">{formatRM(plan.energySavingRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Labor cost</div>
                    <div className="font-semibold text-zinc-700">{formatRM(plan.laborCostRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Net benefit</div>
                    <div className="font-bold text-emerald-700">{formatRM(plan.netBenefitRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Est. labor</div>
                    <div className="font-semibold">{plan.estLaborMinutes} min</div>
                  </div>
                </div>
                <Button className="w-full" onClick={executePlan} disabled={executing}>
                  {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                  Generate Work Order
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Move list */}
          {plan && plan.moves.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Move Sequence (FEFO)</CardTitle>
                <CardDescription className="text-xs">{plan.moves.length} pallets · earliest expiry first</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[260px] pr-2">
                  <div className="space-y-1.5">
                    {plan.moves.map(m => (
                      <div key={m.palletId} className="flex items-center gap-2 text-xs rounded-md border border-border/60 p-2">
                        <span className="grid place-items-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{m.sequence}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{m.productName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{m.lotNo}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono">
                          <span className="px-1 rounded bg-red-50 text-red-700">{m.fromRoomCode}:{m.fromBayCode}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="px-1 rounded bg-emerald-50 text-emerald-700">{m.toRoomCode}:{m.toBayCode}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function FloorPlan({ rooms, selected, onSelect, plan }: { rooms: RoomWithBms[]; selected: string | null; onSelect: (id: string) => void; plan: ConsolidationPlan | null }) {
  return (
    <div className="relative w-full aspect-[16/8] bg-zinc-50 rounded-lg border border-border/60 overflow-hidden">
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4d4d8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Rooms */}
      {rooms.map(r => {
        const c = roomStatusColor(r.status)
        const isGhost = r.status === 'GHOST_LOAD'
        const isConsolidation = r.status === 'CONSOLIDATION'
        const isOptimized = r.status === 'OPTIMIZED'
        const isDest = plan?.destRoomCode === r.code
        const isSource = plan?.sourceRoomCodes.includes(r.code)
        const isSel = selected === r.id
        const fillColor = isGhost ? '#fee2e2' : isConsolidation ? '#fef3c7' : isOptimized ? '#d1fae5' : r.status === 'ACTIVE' ? '#e0f2fe' : '#f4f4f5'
        const strokeColor = isGhost ? '#ef4444' : isConsolidation ? '#f59e0b' : isOptimized ? '#10b981' : r.status === 'ACTIVE' ? '#0ea5e9' : '#a1a1aa'
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`absolute rounded-md border-2 transition-all ${isSel ? 'ring-2 ring-primary ring-offset-1 z-10' : ''} ${isSource ? 'ring-2 ring-amber-400' : ''} ${isDest ? 'ring-2 ring-emerald-500' : ''}`}
            style={{
              left: `${r.floorX}%`,
              top: `${r.floorY}%`,
              width: `${r.floorW}%`,
              height: `${r.floorH}%`,
              backgroundColor: fillColor,
              borderColor: strokeColor,
            }}
          >
            <div className="absolute inset-0 p-1.5 flex flex-col text-left overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-800">{r.code}</span>
                {r.bms && (
                  <span className="text-[9px] font-mono text-zinc-600">{r.bms.currentTemp.toFixed(1)}°</span>
                )}
              </div>
              <div className="text-[8px] text-zinc-600 truncate">{r.name}</div>
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <div className="text-[8px] text-zinc-500">{r.utilizationPct}%</div>
                  <div className="h-1 w-12 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full ${isGhost ? 'bg-red-500' : isConsolidation ? 'bg-amber-500' : isOptimized ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${r.utilizationPct}%` }} />
                  </div>
                </div>
                {r.bms && (
                  <div className="text-[8px] font-mono text-zinc-600">{r.bms.powerKW.toFixed(1)}kW</div>
                )}
              </div>
            </div>
            {isGhost && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        )
      })}

      {/* Consolidation arrows overlay */}
      {plan && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {plan.sourceRoomCodes.map(srcCode => {
            const src = rooms.find(r => r.code === srcCode)
            const dst = rooms.find(r => r.code === plan.destRoomCode)
            if (!src || !dst) return null
            const sx = src.floorX + src.floorW / 2
            const sy = src.floorY + src.floorH / 2
            const dx = dst.floorX + dst.floorW / 2
            const dy = dst.floorY + dst.floorH / 2
            return (
              <g key={srcCode}>
                <defs>
                  <marker id={`arrow-${srcCode}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#10b981" />
                  </marker>
                </defs>
                <path
                  d={`M ${sx}% ${sy}% Q ${(sx + dx) / 2}% ${Math.min(sy, dy) - 8}% ${dx}% ${dy}%`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                  markerEnd={`url(#arrow-${srcCode})`}
                  opacity="0.7"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
                </path>
              </g>
            )
          })}
        </svg>
      )}

      {/* Zone labels */}
      <div className="absolute top-1 left-2 text-[10px] font-medium text-zinc-500">Production Floor — Cold Storage Zone</div>
    </div>
  )
}

function RoomDetailCard({ room }: { room: RoomWithBms }) {
  const c = roomStatusColor(room.status)
  const tempOk = room.bms && room.bms.currentTemp >= room.minSafeTemp && room.bms.currentTemp <= room.maxSafeTemp
  return (
    <Card className={`${c.bg} ${c.border} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {room.code}
              <Badge variant="outline" className={`text-[10px] ${c.text} border-current`}>{c.label}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">{room.name} · {room.zone}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {room.bms ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Current temp" value={formatTemp(room.bms.currentTemp)} ok={tempOk} />
            <Metric label="Setpoint" value={formatTemp(room.bms.setpoint)} />
            <Metric label="Compressor load" value={`${Math.round(room.bms.compressorLoad * 100)}%`} />
            <Metric label="Power draw" value={formatKW(room.bms.powerKW)} />
            <Metric label="Utilization" value={`${room.utilizationPct}% (${room.palletCount}/${room.capacityPallets})`} />
            <Metric label="Max power" value={formatKW(room.maxPowerKW)} />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center">BMS offline for this room</div>
        )}
        <Separator />
        <div className="text-[11px] text-muted-foreground">
          Safe range: <span className="font-mono">{room.minSafeTemp.toFixed(1)}°C — {room.maxSafeTemp.toFixed(1)}°C</span>
        </div>
      </CardContent>
    </Card>
  )
}
