'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Search, Filter, AlertTriangle, Shield, Clock, Loader2,
  RefreshCw, ChevronDown, X, MapPin, Calendar, Tag, ArrowLeftRight, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import type { WmsData, WmsPallet } from '@/lib/coldops/types'
import { formatRM, timeAgo } from '@/lib/coldops/ui'

export function WmsView() {
  const [data, setData] = useState<WmsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roomFilter, setRoomFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [allergenFilter, setAllergenFilter] = useState<string>('ALL')
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL')
  const [sort, setSort] = useState<string>('expiry')
  const [showQuarantineOnly, setShowQuarantineOnly] = useState(false)

  const fetchPallets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roomFilter !== 'ALL') params.set('roomCode', roomFilter)
      if (categoryFilter !== 'ALL') params.set('productCode', categoryFilter === 'Dairy' ? 'MARIGOLD-FM' : categoryFilter)
      if (allergenFilter !== 'ALL') params.set('allergen', allergenFilter)
      if (expiryFilter !== 'ALL') {
        const days = expiryFilter === '3d' ? '3' : expiryFilter === '7d' ? '7' : expiryFilter === '14d' ? '14' : '30'
        params.set('expiringDays', days)
      }
      if (showQuarantineOnly) params.set('quarantine', 'true')
      if (search) params.set('search', search)
      params.set('sort', sort)
      params.set('limit', '500')
      const r = await fetch(`/api/wms/pallets?${params}`)
      const d = await r.json()
      setData(d)
    } catch (e) {
      console.error('WMS fetch failed', e)
    } finally {
      setLoading(false)
    }
  }, [roomFilter, categoryFilter, allergenFilter, expiryFilter, showQuarantineOnly, search, sort])

  useEffect(() => {
    const t = setTimeout(fetchPallets, 300)
    return () => clearTimeout(t)
  }, [fetchPallets])

  const clearFilters = () => {
    setSearch('')
    setRoomFilter('ALL')
    setCategoryFilter('ALL')
    setAllergenFilter('ALL')
    setExpiryFilter('ALL')
    setShowQuarantineOnly(false)
    setSort('expiry')
  }

  const hasActiveFilters = search || roomFilter !== 'ALL' || categoryFilter !== 'ALL' || allergenFilter !== 'ALL' || expiryFilter !== 'ALL' || showQuarantineOnly

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            WMS Stock Browser
          </h2>
          <p className="text-sm text-muted-foreground">{data?.stats.total || 0} pallets across {Object.keys(data?.stats.byRoom || {}).length || 0} rooms · FEFO-tracked · allergen-tagged</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed">
            Live browser over the <b>WMS pallet table</b> — every pallet has a lot number, room/bay location, expiry date, allergen tags, and a computed <b>FEFO rank</b> (1 = ship first). The consolidation planner reads this same table when generating work orders, so what you see here is exactly what the planner sees. Filtering by expiry, allergen, or quarantine lets the supervisor sanity-check the planner’s destination choices before approving a move.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPallets}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Stats strip */}
      {data && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          <StatChip icon={Package} label="Total pallets" value={data.stats.total} tone="primary" />
          <StatChip icon={Clock} label="Expiring ≤7d" value={data.stats.expiringSoon} tone={data.stats.expiringSoon > 0 ? 'amber' : 'default'} />
          <StatChip icon={Shield} label="Quarantine" value={data.stats.quarantineCount} tone={data.stats.quarantineCount > 0 ? 'red' : 'default'} />
          <StatChip icon={Tag} label="Categories" value={Object.keys(data.stats.byCategory).length} tone="default" />
          <StatChip icon={MapPin} label="Rooms" value={Object.keys(data.stats.byRoom).length} tone="default" />
          <StatChip icon={AlertTriangle} label="Allergens" value={Object.keys(data.stats.allergenBreakdown).filter(k => k !== 'none').length} tone="default" />
        </div>
      )}

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search lot, product, code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Room" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All rooms</SelectItem>
                {data?.filters.rooms.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.code} ({r.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {data?.filters.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={allergenFilter} onValueChange={setAllergenFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Allergen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All allergens</SelectItem>
                {data?.filters.allergens.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Expiry" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any expiry</SelectItem>
                <SelectItem value="3d">≤ 3 days</SelectItem>
                <SelectItem value="7d">≤ 7 days</SelectItem>
                <SelectItem value="14d">≤ 14 days</SelectItem>
                <SelectItem value="30d">≤ 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expiry">FEFO (expiry ↑)</SelectItem>
                <SelectItem value="received">Received (newest)</SelectItem>
                <SelectItem value="product">Product (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showQuarantineOnly ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowQuarantineOnly(!showQuarantineOnly)}
            >
              <Shield className="h-3.5 w-3.5 mr-1" /> Quarantine
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pallet table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Pallet Inventory</CardTitle>
              <CardDescription className="text-xs">{data?.pallets.length || 0} pallets shown · FEFO rank shown in # column</CardDescription>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!data ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">Loading pallets…</div>
            </div>
          ) : data.pallets.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              No pallets match these filters.
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="min-w-[800px]">
                {/* Header row */}
                <div className="grid grid-cols-[40px_100px_1fr_80px_90px_100px_90px_60px] gap-2 px-3 py-2 border-b border-border/60 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wide sticky top-0 z-10">
                  <div>#</div>
                  <div>Lot</div>
                  <div>Product</div>
                  <div>Room</div>
                  <div>Bay</div>
                  <div>Expiry</div>
                  <div>Days</div>
                  <div>Tags</div>
                </div>
                {/* Rows */}
                {data.pallets.map((p, i) => (
                  <PalletRow key={p.id} pallet={p} index={i} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      {data && Object.keys(data.stats.byCategory).length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock by Category</CardTitle>
            <CardDescription className="text-xs">Distribution across product types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.stats.byCategory).sort(([, a], [, b]) => b - a).map(([cat, count]) => {
                const pct = (count / data.stats.total) * 100
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium truncate">{cat}</div>
                    <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat === 'Dairy' ? '#10b981' : cat === 'Juice' ? '#f59e0b' : cat === 'Raw Material' ? '#0ea5e9' : cat === 'Beverage' ? '#8b5cf6' : '#ec4899'
                        }}
                      />
                    </div>
                    <div className="w-16 text-right text-xs font-medium">{count} ({pct.toFixed(0)}%)</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Move History */}
      <WmsMoveHistory />
    </div>
  )
}

function StatChip({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'primary' | 'amber' | 'red' | 'default' }) {
  const tones = {
    primary: { bg: 'bg-primary/5', text: 'text-primary' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700' },
    default: { bg: 'bg-muted/50', text: 'text-foreground' },
  }
  const t = tones[tone]
  return (
    <div className={`rounded-lg border border-border/60 ${t.bg} p-2.5`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={`h-3 w-3 ${t.text}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold ${t.text}`}>{value}</div>
    </div>
  )
}

function PalletRow({ pallet, index }: { pallet: WmsPallet; index: number }) {
  const isExpiringSoon = pallet.daysToExpiry <= 7
  const isCritical = pallet.daysToExpiry <= 3
  const allergens = pallet.allergenTags.split(',').filter(Boolean)

  return (
    <div className={`grid grid-cols-[40px_100px_1fr_80px_90px_100px_90px_60px] gap-2 px-3 py-2 border-b border-border/40 text-xs items-center hover:bg-muted/30 transition-colors ${index % 2 === 1 ? 'bg-muted/10' : ''}`}>
      <div className={`font-mono font-bold ${pallet.fefoRank <= 3 ? 'text-red-600' : 'text-muted-foreground'}`}>{pallet.fefoRank}</div>
      <div className="font-mono text-[11px] text-muted-foreground">{pallet.lotNo}</div>
      <div className="min-w-0">
        <div className="font-medium truncate">{pallet.productName}</div>
        <div className="text-[10px] text-muted-foreground">{pallet.productCode} · {pallet.category}</div>
      </div>
      <div>
        <Badge variant="outline" className="text-[10px] font-mono">{pallet.roomCode}</Badge>
      </div>
      <div className="font-mono text-[11px]">{pallet.bayCode}</div>
      <div className={`text-[11px] ${isCritical ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
        {new Date(pallet.expiryDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}
      </div>
      <div>
        <Badge variant={isCritical ? 'destructive' : isExpiringSoon ? 'secondary' : 'outline'} className="text-[10px]">
          {pallet.daysToExpiry}d
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        {pallet.quarantine && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><Shield className="h-3.5 w-3.5 text-red-500" /></TooltipTrigger>
              <TooltipContent>Quarantine</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {allergens.map(a => (
          <TooltipProvider key={a}>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700">{a.slice(0, 3)}</span>
              </TooltipTrigger>
              <TooltipContent>Allergen: {a}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// WMS MOVE HISTORY SECTION
// ============================================================================

export function WmsMoveHistory() {
  const [moves, setMoves] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, uniqueProducts: 0, uniqueRooms: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wms/moves?limit=50')
      .then(r => r.json())
      .then(d => {
        setMoves(d.moves || [])
        setStats(d.stats || { total: 0, uniqueProducts: 0, uniqueRooms: 0 })
      })
      .catch(e => console.error('moves fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              Pallet Move History
            </CardTitle>
            <CardDescription className="text-xs">
              {stats.total} confirmed moves · {stats.uniqueProducts} products · {stats.uniqueRooms} rooms
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid place-items-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : moves.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">No pallet moves recorded yet.</div>
            <div className="text-xs text-muted-foreground mt-1">Complete a consolidation work order to see move history here.</div>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-1.5">
              {moves.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-center gap-2 text-xs rounded-md border border-border/60 p-2 hover:bg-muted/30 transition-colors"
                >
                  <span className="grid place-items-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{m.sequence}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.productName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{m.lotNo}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700">{m.fromRoomCode}:{m.fromBayCode}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{m.toRoomCode}:{m.toBayCode}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">
                    <div>{m.confirmedAt ? timeAgo(m.confirmedAt) : '—'}</div>
                    <div className="font-mono">{m.workOrderId?.slice(-8) || ''}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
