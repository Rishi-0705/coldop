'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Server, Wifi, WifiOff, Clock, Cpu, CheckCircle2, AlertCircle,
  Loader2, Radio, Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { BmsAdapterData, BmsAdapter } from '@/lib/coldops/types'
import { timeAgo } from '@/lib/coldops/ui'
import { LiveDot } from './motion'

export function BmsAdapterPanel() {
  const [data, setData] = useState<BmsAdapterData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bms-adapters')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('bms adapters fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 grid place-items-center h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const statusConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
    CONNECTED: { icon: Wifi, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    SIMULATED: { icon: Radio, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
    AVAILABLE: { icon: WifiOff, color: 'text-zinc-500', bg: 'bg-zinc-50', border: 'border-zinc-200' },
    OFFLINE: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              BMS Protocol Adapters
            </CardTitle>
            <CardDescription className="text-xs">
              {data.stats.total} adapters · {data.stats.connected} connected · {data.stats.simulated} simulated · {data.stats.available} available · avg {data.stats.avgLatency}ms latency
            </CardDescription>
          </div>
          <LiveDot color="bg-emerald-500" size="h-1.5 w-1.5" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Adapter cards */}
        <div className="grid gap-2 sm:grid-cols-2">
          {data.adapters.map((adapter, i) => {
            const sc = statusConfig[adapter.status] || statusConfig.OFFLINE
            const StatusIcon = sc.icon
            return (
              <motion.div
                key={adapter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-lg border ${sc.border} ${sc.bg} p-3`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`grid place-items-center h-8 w-8 rounded-lg bg-card ${sc.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{adapter.name}</div>
                      <div className="text-[10px] text-muted-foreground">{adapter.vendor} · {adapter.model}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${sc.color} border-current`}>
                    {adapter.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] mb-2">
                  <div>
                    <div className="text-muted-foreground">Protocol</div>
                    <div className="font-mono font-medium" style={{ color: adapter.color }}>{adapter.protocol}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Rooms</div>
                    <div className="font-medium">{adapter.roomsManaged}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Latency</div>
                    <div className="font-medium">{adapter.latency > 0 ? `${adapter.latency}ms` : '—'}</div>
                  </div>
                </div>

                <div className="text-[9px] text-muted-foreground font-mono truncate mb-1.5">{adapter.endpoint}</div>

                {adapter.lastSync && (
                  <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Last sync: {timeAgo(adapter.lastSync)}
                  </div>
                )}

                {adapter.note && (
                  <div className="text-[9px] text-amber-700 mt-1.5 italic">{adapter.note}</div>
                )}

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/40">
                  {adapter.capabilities.map(cap => (
                    <span key={cap} className="text-[8px] px-1 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">
                      {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        <Separator className="my-4" />

        {/* Protocol support table */}
        <div>
          <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            Protocol Support Matrix
          </div>
          <div className="space-y-1.5">
            {data.protocolSupport.map(proto => (
              <div key={proto.protocol} className="flex items-center gap-3 text-xs rounded-md border border-border/60 p-2">
                <div className="w-24 font-mono font-medium flex-shrink-0">{proto.protocol}</div>
                <div className="w-32 text-[10px] text-muted-foreground flex-shrink-0">{proto.library}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground truncate">
                    {proto.vendors.join(', ')}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] flex-shrink-0 ${
                    proto.maturity === 'Production' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                    proto.maturity === 'Adapter Ready' ? 'text-sky-700 border-sky-300 bg-sky-50' :
                    'text-zinc-600 border-zinc-300 bg-zinc-50'
                  }`}
                >
                  {proto.maturity}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
