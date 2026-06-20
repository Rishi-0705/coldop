'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import {
  ThermometerSun, Package, Check, X, Loader2, Zap,
  CheckCircle2, ChevronRight, SkipForward, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as RTooltip
} from 'recharts'
import type { Notification } from '@/lib/coldops/types'
import { formatRM } from '@/lib/coldops/ui'
import { GlassCard } from '@/components/coldops/shared'

// ─── helpers ──────────────────────────────────────────────────────────────

function generateImpactData(baseKW: number, savingPct: number) {
  // Simulate a "before vs after" sparkline over 8 time slots
  return Array.from({ length: 8 }, (_, i) => ({
    t: i,
    before: +(baseKW + Math.random() * 2 - 1).toFixed(1),
    after: i < 4
      ? +(baseKW + Math.random() * 2 - 1).toFixed(1)
      : +(baseKW * (1 - savingPct) + Math.random() * 0.5).toFixed(1),
  }))
}

// ─── single swipeable card ─────────────────────────────────────────────────

function ActionCard({
  notif,
  onApprove,
  onDeny,
  isTop,
  offset,
}: {
  notif: Notification
  onApprove: (id: string) => void
  onDeny: (id: string) => void
  isTop: boolean
  offset: number
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const approveOpacity = useTransform(x, [30, 150], [0, 1])
  const denyOpacity = useTransform(x, [-150, -30], [1, 0])

  const isConsolidation = notif.type === 'CONSOLIDATION' || notif.type === 'CONSOLIDATION_SUGGESTED'
  const isTemp = !isConsolidation

  // Calculate actual saving percentage from the notification's estimated RM impact
  const baseKW = 15 // Assume average 15kW for visual chart baseline
  let kwhSavedPerHour = 0
  if (notif.rmPerHour) {
    kwhSavedPerHour = notif.rmPerHour / 0.509 // TNB_TARIFF
  } else if (isConsolidation && notif.rmImpact > 0) {
    kwhSavedPerHour = (notif.rmImpact / (notif.durationHours || 8)) / 0.509
  }
  
  const savingPct = kwhSavedPerHour / baseKW
  const estimatedKwhSaved = (kwhSavedPerHour * (notif.durationHours || 8)).toFixed(1)
  const impactData = generateImpactData(baseKW, savingPct)

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 120) {
      onApprove(notif.id)
    } else if (info.offset.x < -120) {
      onDeny(notif.id)
    }
  }

  return (
    <motion.div
      style={{
        x: isTop ? x : undefined,
        rotate: isTop ? rotate : undefined,
        scale: 1 - offset * 0.04,
        y: offset * 10,
        zIndex: 10 - offset,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: -300, right: 300 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      className={`absolute inset-0 ${isTop ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Approve/Deny overlays */}
      {isTop && (
        <>
          <motion.div
            style={{ opacity: approveOpacity }}
            className="absolute inset-0 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-2xl">
              <Check className="h-8 w-8" /> APPROVE
            </div>
          </motion.div>
          <motion.div
            style={{ opacity: denyOpacity }}
            className="absolute inset-0 rounded-2xl bg-red-500/15 border-2 border-red-500 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 text-red-600 font-bold text-2xl">
              <X className="h-8 w-8" /> DENY
            </div>
          </motion.div>
        </>
      )}

      {/* Card body */}
      <div className="h-full overflow-hidden select-none flex flex-col p-0 bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Color bar */}
        <div className={`h-1 w-full flex-shrink-0 ${isConsolidation ? 'bg-[#F59E0B]' : 'bg-[#0EA5E9]'}`} />

        <div className="p-6 h-full flex flex-col gap-4">
          {/* Icon + type label */}
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center ${
              isConsolidation ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#EFF6FF] text-[#0EA5E9]'
            }`}>
              {isConsolidation
                ? <Package className="h-5 w-5" />
                : <ThermometerSun className="h-5 w-5" />
              }
            </div>
            <div>
              <span className={`px-2 py-1 rounded-[6px] text-[10px] font-semibold ${
                isConsolidation ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]' : 'bg-[#EFF6FF] text-[#0EA5E9] border border-[#BAE6FD]'
              }`}>
                {isConsolidation ? 'Stock Consolidation' : 'Temperature Adjustment'}
              </span>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {notif.room ? `Room: ${notif.room.code} — ${notif.room.name}` : 'All Rooms'}
              </div>
            </div>
            {notif.rmImpact !== 0 && (
              <div className="ml-auto text-right">
                <div className={`text-lg font-bold ${notif.rmImpact > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {notif.rmImpact > 0 ? '+' : '-'}{formatRM(Math.abs(notif.rmImpact))}
                </div>
                <div className="text-[10px] text-muted-foreground">potential {notif.rmImpact > 0 ? 'saving' : 'cost'}</div>
              </div>
            )}
          </div>

          {/* AI Action Statement */}
          <div className="rounded-xl bg-muted/40 p-4 border border-border/60">
            <p className="text-sm font-semibold leading-relaxed">{notif.message}</p>
          </div>

          {/* Predictive Impact Mini-Chart */}
          <div className="flex-1 min-h-0">
            <p className="text-[11px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Projected power {savingPct >= 0 ? 'drop' : 'increase'} if approved (~{Math.abs(savingPct * 100).toFixed(0)}% {savingPct >= 0 ? 'reduction' : 'increase'}, est. {Math.abs(Number(estimatedKwhSaved)).toFixed(1)} kWh {savingPct >= 0 ? 'saved' : 'consumed'})
            </p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={impactData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`beforeGrad-${notif.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={`afterGrad-${notif.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="before"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    fill={`url(#beforeGrad-${notif.id})`}
                    dot={false}
                    name="Current kW"
                  />
                  <Area
                    type="monotone"
                    dataKey="after"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fill={`url(#afterGrad-${notif.id})`}
                    dot={false}
                    name="After action kW"
                  />
                  <RTooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v: any, name: string) => [`${v} kW`, name]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hint */}
          <p className="text-[11px] text-muted-foreground text-center">
            ← Swipe left to Deny &nbsp;·&nbsp; Swipe right to Approve →
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── main view ────────────────────────────────────────────────────────────

export function ActionMenuView({
  notifs,
  onAction,
  onViewDashboard,
}: {
  notifs: Notification[]
  onAction: () => void
  onViewDashboard: () => void
}) {
  const openNotifs = notifs.filter(n => n.status === 'OPEN' && n.actionType && n.actionType !== 'NONE')
  const [queue, setQueue] = useState<Notification[]>([])
  const [acting, setActing] = useState<string | null>(null)
  const [autoPilot, setAutoPilot] = useState(false)
  const [approved, setApproved] = useState(0)
  const [denied, setDenied] = useState(0)
  const autoPilotRef = useRef(autoPilot)
  autoPilotRef.current = autoPilot

  useEffect(() => {
    setQueue(openNotifs)
  }, [notifs.length])

  const current = queue[queue.length - 1]

  const doApprove = useCallback(async (id: string) => {
    if (acting) return
    setActing(id)
    try {
      const r = await fetch(`/api/notifications/${id}/approve`, { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast.success('Action approved — BMS command sent.')
        if (d.sideEffect?.type === 'SETBACK_STARTED') {
          toast.info(`Progressive setback started: ${d.sideEffect.setbackId}`)
        }
        setApproved(p => p + 1)
        setQueue(prev => prev.filter(n => n.id !== id))
        onAction()
      } else {
        toast.error(d.error || 'Failed to approve.')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActing(null)
    }
  }, [acting, onAction])

  const doDeny = useCallback((id: string) => {
    setDenied(p => p + 1)
    setQueue(prev => prev.filter(n => n.id !== id))
    toast.info('Action skipped.')
  }, [])

  // Auto-pilot: step through cards with delay
  useEffect(() => {
    if (!autoPilot || !current || acting) return
    const t = setTimeout(() => {
      if (autoPilotRef.current && current) doApprove(current.id)
    }, 1800)
    return () => clearTimeout(t)
  }, [autoPilot, current, acting, doApprove])

  const allDone = queue.length === 0

  return (
    <div className="max-w-[860px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827]">Step 2 — AI Actions</h1>
          <p className="text-[14px] text-[#6B7280] leading-[1.6] mt-1">
            Review each AI recommendation. Swipe right to approve, left to deny.
          </p>
        </div>

        {/* Auto-Pilot toggle */}
        <div className="flex-shrink-0 flex items-center gap-3 bg-white border border-[#E5E7EB] rounded-[12px] px-[20px] py-[12px]">
          <div className="text-right">
            <div className="text-[13px] font-semibold text-[#111827]">Auto-Pilot</div>
            <div className="text-[11px] text-[#9CA3AF]">Auto-approve actions</div>
          </div>
          <Switch
            checked={autoPilot}
            onCheckedChange={setAutoPilot}
            id="autopilot-toggle"
            className="data-[state=checked]:bg-[#0EA5E9] data-[state=unchecked]:bg-[#D1D5DB]"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white/60 backdrop-blur-[12px] border border-[rgba(255,255,255,0.9)] rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-[32px] py-[28px] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] hover:border-white">
          <div className="text-[40px] font-[800] text-[#111827] leading-none">{queue.length}</div>
          <div className="text-[11px] font-[600] tracking-[0.08em] uppercase text-[#9CA3AF] mt-1.5">
            Pending
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-[12px] border border-[rgba(255,255,255,0.9)] rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-[32px] py-[28px] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] hover:border-white">
          <div className="text-[40px] font-[800] text-[#10B981] leading-none">{approved}</div>
          <div className="text-[11px] font-[600] tracking-[0.08em] uppercase text-[#9CA3AF] mt-1.5">
            Approved
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-[12px] border border-[rgba(255,255,255,0.9)] rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-[32px] py-[28px] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] hover:border-white">
          <div className="text-[40px] font-[800] text-[#EF4444] leading-none">{denied}</div>
          <div className="text-[11px] font-[600] tracking-[0.08em] uppercase text-[#9CA3AF] mt-1.5">
            Denied
          </div>
        </div>
      </div>

      {/* Card stack */}
      {allDone ? (
        <div className="bg-white/60 backdrop-blur-[12px] border border-[rgba(255,255,255,0.9)] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-[40px] py-[64px] flex flex-col items-center text-center">
          <div className="w-[56px] h-[56px] rounded-[14px] bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] flex items-center justify-center mb-2">
            <Check className="text-[#10B981] h-[26px] w-[26px]" strokeWidth={2.5} />
          </div>
          <p className="text-[22px] font-bold text-[#111827] mt-[20px]">All actions reviewed!</p>
          <p className="text-[14px] text-[#6B7280] leading-[1.6] mt-2 mb-8">
            {approved} approved · {denied} skipped — view your savings on the Dashboard
          </p>
          <button 
            onClick={onViewDashboard} 
            className="bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white rounded-[10px] px-[28px] py-[12px] font-semibold text-[14px] transition-all duration-200 hover:opacity-90 hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(14,165,233,0.35)] flex items-center justify-center"
          >
            View Dashboard <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      ) : (
        <>
          {/* Stack */}
          <div className="relative h-[440px]">
            <AnimatePresence>
              {queue.slice(-3).map((n, idx, arr) => (
                <ActionCard
                  key={n.id}
                  notif={n}
                  onApprove={doApprove}
                  onDeny={doDeny}
                  isTop={idx === arr.length - 1}
                  offset={arr.length - 1 - idx}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Button controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-[10px] font-bold"
              onClick={() => current && doDeny(current.id)}
              disabled={!current || !!acting}
            >
              <X className="h-4 w-4 mr-2" />
              Deny
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground"
              onClick={() => current && doDeny(current.id)}
              disabled={!current || !!acting}
              title="Skip"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold rounded-[10px]"
              onClick={() => current && doApprove(current.id)}
              disabled={!current || !!acting}
            >
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Keyboard: <kbd className="px-1 bg-muted rounded">→</kbd> approve&nbsp;&nbsp;
            <kbd className="px-1 bg-muted rounded">←</kbd> deny
          </p>
        </>
      )}
    </div>
  )
}
