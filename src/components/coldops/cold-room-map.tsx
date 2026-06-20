'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Map as MapIcon, ArrowRight, ArrowLeftRight, ClipboardList, Loader2,
  Package, Clock, AlertTriangle, Shield, X, ChevronRight, ThermometerSun
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import type { RoomWithBms, ConsolidationPlan, RoomDetail } from '@/lib/coldops/types'
import { roomStatusColor, formatRM, formatKW, formatTemp, timeAgo } from '@/lib/coldops/ui'
import { Legend, Metric } from './shared'
import { CircularGauge } from './motion'





export function ColdRoomMap({ rooms, plan, onExecutePlan }: { rooms: RoomWithBms[]; plan: ConsolidationPlan | null; onExecutePlan: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const [detailRoom, setDetailRoom] = useState<string | null>(null)
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
    <div className="space-y-6">
      {}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-4">
        <div className="grid place-items-center h-10 w-10 rounded-full bg-primary/20 text-primary flex-shrink-0 mt-0.5">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">Solution 2: Cold Room Utilization Optimizer</h2>
          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
            This module analyzes stock levels across all cold rooms. When rooms are underutilized (e.g., &lt;25% capacity), 
            it generates FEFO-sequenced consolidation plans to merge pallets into a single room. 
            Once executed via Work Orders, the empty rooms can be completely shut down to save massive amounts of energy.
          </p>
        </div>
      </div>

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
        {}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live Floor Plan</CardTitle>
            <CardDescription className="text-xs">Click a room to inspect. Colors update from BMS + WMS data.</CardDescription>
          </CardHeader>
          <CardContent>
            <FloorPlan rooms={rooms} selected={selected} onSelect={setSelected} plan={plan} />
          </CardContent>
        </Card>

        {}
        <div className="space-y-4">
          {selectedRoom ? (
            <RoomDetailCard room={selectedRoom} onViewDetail={() => setDetailRoom(selectedRoom.code)} />
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
                    <div className="font-semibold text-blue-700">{formatRM(plan.energySavingRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Labor cost</div>
                    <div className="font-semibold text-zinc-700">{formatRM(plan.laborCostRM)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Net benefit</div>
                    <div className="font-bold text-blue-700">{formatRM(plan.netBenefitRM)}</div>
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

          {}
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
                          <span className="px-1 rounded bg-blue-50 text-blue-700">{m.toRoomCode}:{m.toBayCode}</span>
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

      {}
      <TempGaugeGrid rooms={rooms} />

      {}
      <RoomDetailModal roomCode={detailRoom} onClose={() => setDetailRoom(null)} />
    </div>
  )
}

function FloorPlan({ rooms, selected, onSelect, plan }: { rooms: RoomWithBms[]; selected: string | null; onSelect: (id: string) => void; plan: ConsolidationPlan | null }) {
  return (
    <div className="relative w-full aspect-[16/8] bg-zinc-50 rounded-lg border border-border/60 overflow-hidden">
      {}
      <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4d4d8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {}
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
            className={`absolute rounded-md border-2 transition-all ${isSel ? 'ring-2 ring-primary ring-offset-1 z-10' : ''} ${isSource ? 'ring-2 ring-amber-400' : ''} ${isDest ? 'ring-2 ring-blue-500' : ''}`}
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
                    <div className={`h-full ${isGhost ? 'bg-red-500' : isConsolidation ? 'bg-amber-500' : isOptimized ? 'bg-blue-500' : 'bg-sky-500'}`} style={{ width: `${r.utilizationPct}%` }} />
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

      {}
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

      {}
      <div className="absolute top-1 left-2 text-[10px] font-medium text-zinc-500">Production Floor — Cold Storage Zone</div>
    </div>
  )
}

function RoomDetailCard({ room, onViewDetail }: { room: RoomWithBms; onViewDetail: () => void }) {
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
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewDetail}>
            Detail <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
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
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Safe range: <span className="font-mono">{room.minSafeTemp.toFixed(1)}°C — {room.maxSafeTemp.toFixed(1)}°C</span>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onViewDetail}>
            <Package className="h-3 w-3 mr-1" /> View Pallets
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}





function RoomDetailModal({ roomCode, onClose }: { roomCode: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<RoomDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!roomCode) {
      setDetail(null)
      return
    }
    setLoading(true)
    fetch(`/api/rooms/${roomCode}/detail`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(e => console.error('room detail fetch failed', e))
      .finally(() => setLoading(false))
  }, [roomCode])

  return (
    <Dialog open={!!roomCode} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {detail ? `${detail.room.code} — ${detail.room.name}` : 'Loading...'}
            {detail?.stats.isGhostLoad && (
              <Badge variant="outline" className="text-[10px] text-red-700 border-red-300 bg-red-50">Ghost Load Active</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {detail ? `${detail.room.zone} zone · Target ${detail.room.targetTemp}°C · Capacity ${detail.room.capacityPallets} pallets` : 'Fetching room details...'}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="grid place-items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4">
              {}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {detail.bms && (
                  <>
                    <Metric label="Current temp" value={formatTemp(detail.bms.currentTemp)} ok={detail.bms.currentTemp >= detail.room.minSafeTemp && detail.bms.currentTemp <= detail.room.maxSafeTemp} />
                    <Metric label="Setpoint" value={formatTemp(detail.bms.setpoint)} />
                    <Metric label="Power" value={formatKW(detail.bms.powerKW)} />
                    <Metric label="Load" value={`${Math.round(detail.bms.compressorLoad * 100)}%`} />
                  </>
                )}
              </div>

              {}
              {detail.recentReadings.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Power History (last 6h)
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={detail.recentReadings.reverse().map(r => ({
                      t: new Date(r.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
                      kw: r.powerKW,
                      ghost: r.isGhostLoad,
                    }))}>
                      <defs>
                        <linearGradient id="modalKwGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={4} />
                      <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" unit=" kW" />
                      <RTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="kw" stroke="#ef4444" strokeWidth={1.5} fill="url(#modalKwGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <Separator />

              {}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Pallet Inventory — FEFO Sorted
                  </div>
                  <Badge variant="outline" className="text-[10px]">{detail.pallets.length} pallets · {detail.stats.utilizationPct}% full</Badge>
                </div>
                {detail.pallets.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No pallets in this room.</div>
                ) : (
                  <div className="space-y-1 max-h-[280px] overflow-y-auto">
                    {detail.pallets.map((p, i) => {
                      const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000)
                      const isCritical = days <= 3
                      const isExpiringSoon = days <= 7
                      const allergens = (p.allergenTags || '').split(',').filter(Boolean)
                      return (
                        <div key={p.id} className={`flex items-center gap-2 text-xs rounded-md border p-2 ${isCritical ? 'border-red-200 bg-red-50/50' : isExpiringSoon ? 'border-amber-200 bg-amber-50/30' : 'border-border/60'}`}>
                          <span className={`grid place-items-center h-5 w-5 rounded-full text-[10px] font-bold ${i < 3 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{p.productName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{p.lotNo} · Bay {p.bayCode}</div>
                          </div>
                          {p.quarantine && <Shield className="h-3.5 w-3.5 text-red-500" />}
                          {allergens.map(a => (
                            <span key={a} className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700">{a.slice(0, 3)}</span>
                          ))}
                          <Badge variant={isCritical ? 'destructive' : isExpiringSoon ? 'secondary' : 'outline'} className="text-[10px]">
                            {days}d
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {}
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span className="text-muted-foreground">Allergens:</span> <span className="font-medium">{detail.stats.allergensPresent.join(', ') || 'None'}</span></div>
                <div><span className="text-muted-foreground">Earliest expiry:</span> <span className="font-medium">{detail.stats.earliestExpiry ? new Date(detail.stats.earliestExpiry).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }) : '—'}</span></div>
                <div><span className="text-muted-foreground">Idle baseline:</span> <span className="font-mono">{formatKW(detail.stats.idleBaselineKW)}</span></div>
                <div><span className="text-muted-foreground">Ghost load:</span> <span className={`font-medium ${detail.stats.isGhostLoad ? 'text-red-600' : 'text-blue-600'}`}>{detail.stats.isGhostLoad ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}





function TempGaugeGrid({ rooms }: { rooms: RoomWithBms[] }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-amber-500" />
              Live BMS Temperature Gauges
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time compressor load + temperature from BMS simulator · {rooms.length} rooms monitored
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {rooms.map((room, i) => {
            if (!room.bms) return (
              <div key={room.id} className="text-center p-2 rounded-lg border border-border/40 opacity-50">
                <div className="text-[10px] font-mono">{room.code}</div>
                <div className="text-[9px] text-muted-foreground">Offline</div>
              </div>
            )
            const tempPct = (room.bms.currentTemp - room.minSafeTemp) / (room.maxSafeTemp - room.minSafeTemp)
            const loadPct = room.bms.compressorLoad
            const isGhost = room.status === 'GHOST_LOAD'
            const tempColor = isGhost ? '#ef4444' : room.bms.currentTemp > room.targetTemp + 2 ? '#f59e0b' : '#10b981'
            const loadColor = loadPct > 0.7 ? '#ef4444' : loadPct > 0.4 ? '#f59e0b' : '#10b981'

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex flex-col items-center p-2 rounded-lg border ${isGhost ? 'border-red-200 bg-red-50/40' : 'border-border/60'}`}
              >
                <div className="text-[10px] font-mono font-bold mb-1">{room.code}</div>
                <CircularGauge
                  value={room.bms.currentTemp}
                  max={room.maxSafeTemp}
                  size={80}
                  unit="°C"
                  color={tempColor}
                />
                <div className="text-[9px] text-muted-foreground mt-1.5 mb-1">Load</div>
                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: loadColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${loadPct * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                  />
                </div>
                <div className="text-[9px] font-mono mt-0.5">{Math.round(loadPct * 100)}%</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{formatKW(room.bms.powerKW)}</div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
