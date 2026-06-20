'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Zap, Package, ThermometerSun, Bell, ChevronRight,
  Loader2, Target, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { severityColor, formatRM } from '@/lib/coldops/ui'
import { SectionHeader } from './shared'

interface CriticalItem {
  id: string
  category: string
  severity: string
  severityScore: number
  title: string
  description: string
  roomCode: string | null
  rmImpact: number
  rmPerHour: number
  actionType: string
  timestamp: string
  duration?: number
}

const categoryIcons: Record<string, any> = {
  'Ghost Load': Zap,
  'Consolidation': Package,
  'Active Setback': ThermometerSun,
  'SAFETY': AlertTriangle,
  'CONSOLIDATION': Package,
  'GHOST LOAD': Zap,
  'SYSTEM': Bell,
  'WORK ORDER': Package,
}

export function TopCriticalPanel() {
  const [items, setItems] = useState<CriticalItem[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch2 = () => {
      fetch('/api/top-critical')
        .then(r => r.json())
        .then(d => {
          setItems(d.items || [])
          setStats(d.stats || null)
        })
        .catch(e => console.error('top critical fetch failed', e))
        .finally(() => setLoading(false))
    }
    Promise.resolve().then(fetch2)
    const interval = setInterval(fetch2, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="border-red-200 bg-gradient-to-br from-red-50/30 via-card to-card">
      <CardHeader className="pb-2">
        <SectionHeader
          icon={Target}
          title="Top 10 Critical Items"
          description="Cross-category severity ranking — the most urgent issues across ghost loads, consolidation, temperature violations, and FEFO warnings. Tackle these first."
          flagship="Main Detection"
          detailed="Aggregates items from every ColdOps engine — <b>deterministic ghost load rules</b>, <b>greedy consolidation planner</b> output, active BMS setbacks, and notification queue — then re-scores them on a unified <b>severity formula</b> (RM waste × 0.5 + duration × 10 + safety bonus + room criticality bonus). This is ColdOps' single prioritized queue: instead of flipping between four views, the supervisor sees the 10 actions that will recover the most Ringgit per minute of attention."
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid place-items-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center h-[200px]">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">No critical items — system is optimal.</div>
            </div>
          </div>
        ) : (
          <>
            {}
            {stats && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1" />
                  {stats.critical} Critical
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                  {stats.high} High
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  {stats.medium} Medium
                </Badge>
                {stats.totalRmImpact > 0 && (
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    Total impact: {formatRM(stats.totalRmImpact)}
                  </Badge>
                )}
              </div>
            )}

            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {items.map((item, i) => {
                    const c = severityColor(item.severity as any)
                    const Icon = categoryIcons[item.category] || AlertTriangle
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className={`flex items-center gap-3 rounded-lg border ${c.border} ${c.bg} p-2.5 hover:shadow-sm transition-shadow cursor-pointer`}
                      >
                        {}
                        <span className={`grid place-items-center h-7 w-7 rounded-full text-[10px] font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-red-500 text-white' : i === 1 ? 'bg-orange-500 text-white' : i === 2 ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>

                        {}
                        <div className={`grid place-items-center h-7 w-7 rounded-lg bg-card/80 ${c.text} flex-shrink-0`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        {}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-medium text-xs truncate">{item.title}</span>
                            <Badge variant="outline" className={`text-[9px] ${c.text} border-current`}>{item.severity}</Badge>
                            <Badge variant="outline" className="text-[8px]">{item.category}</Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                        </div>

                        {}
                        <div className="text-right flex-shrink-0">
                          {item.rmImpact > 0 && (
                            <>
                              <div className={`text-xs font-bold ${c.text}`}>{formatRM(item.rmImpact)}</div>
                              <div className="text-[9px] text-muted-foreground">impact</div>
                            </>
                          )}
                          {item.actionType && item.actionType !== 'NONE' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[8px] mt-0.5 cursor-help">
                                    {item.actionType.replace(/_/g, ' ')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">
                                  Click to approve this action
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}
