'use client'

import {
  Activity, Map as MapIcon, ClipboardList, Bell, Snowflake, TrendingDown,
  Server, Radio, RefreshCw, ArrowRight, ThermometerSun, Loader2,
  Smartphone, Mail, MessageSquare, BarChart3, Calendar
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Savings, Severity, ViewKey, ActiveSetback } from '@/lib/coldops/types'
import { formatRM, formatKW } from '@/lib/coldops/ui'

export type { ViewKey } from '@/lib/coldops/types'

// ============================================================================
// TOP BAR
// ============================================================================

export function TopBar({
  view, onView, notifCounts, bmsOnline, realtimeConnected, savings, onRefresh,
}: {
  view: ViewKey
  onView: (v: ViewKey) => void
  notifCounts: Record<string, number>
  bmsOnline: boolean
  realtimeConnected: boolean
  savings?: Savings
  onRefresh: () => void
}) {
  const totalOpen = Object.values(notifCounts).reduce((a, b) => a + b, 0)
  const nav: { key: ViewKey; label: string; icon: any }[] = [
    { key: 'command', label: 'Command Center', icon: Activity },
    { key: 'map', label: 'Cold Room Map', icon: MapIcon },
    { key: 'workorders', label: 'Work Orders', icon: ClipboardList },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'schedule', label: 'Schedule', icon: Calendar },
  ]
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 max-w-[1600px]">
        <div className="flex h-16 items-center gap-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Snowflake className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-semibold leading-tight">ColdOps</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Marigold PJ Factory · Live</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 mx-auto">
            {nav.map(n => {
              const Icon = n.icon
              const active = view === n.key
              const badge = n.key === 'notifications' && totalOpen > 0 ? totalOpen : null
              return (
                <Button
                  key={n.key}
                  variant={active ? 'default' : 'ghost'}
                  size="sm"
                  className={`relative h-9 gap-2 ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => onView(n.key)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{n.label}</span>
                  {badge !== null && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold rounded-full bg-red-500 text-white ring-2 ring-card">
                      {badge}
                    </span>
                  )}
                </Button>
              )
            })}
          </nav>

          {/* Status pills */}
          <div className="flex items-center gap-2">
            {savings && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {formatRM(savings.tonightRM)}
                      <span className="text-emerald-500/70 font-normal">tonight</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-xs space-y-0.5">
                      <div>Tonight: <b>{formatRM(savings.tonightRM)}</b></div>
                      <div>This week: <b>{formatRM(savings.thisWeekRM)}</b></div>
                      <div>This month: <b>{formatRM(savings.thisMonthRM)}</b></div>
                      <div>CO₂ avoided: <b>{savings.co2Tonnes.toFixed(2)} t</b></div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <StatusPill
              ok={bmsOnline}
              okLabel="BMS"
              okIcon={Server}
              badLabel="BMS off"
              badIcon={Server}
            />
            <StatusPill
              ok={realtimeConnected}
              okLabel="Live"
              okIcon={Radio}
              badLabel="Offline"
              badIcon={Radio}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export function StatusPill({ ok, okLabel, okIcon, badLabel, badIcon }: { ok: boolean; okLabel: string; okIcon: any; badLabel: string; badIcon: any }) {
  const Icon = ok ? okIcon : badIcon
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-300 text-zinc-500'}`}>
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{ok ? okLabel : badLabel}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/50">
      <div className="container mx-auto px-4 py-4 max-w-[1600px]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Snowflake className="h-3.5 w-3.5 text-primary" />
            <span><b className="text-foreground">ColdOps</b> v1.0 · White-label SaaS by Double Dot Solutions Sdn Bhd</span>
          </div>
          <div className="flex items-center gap-3">
            <span>TNB Tariff: RM 0.509/kWh</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">CO₂ factor: 0.583 kg/kWh</span>
            <span className="hidden sm:inline">·</span>
            <span>ap-southeast-1 (SG)</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function LoadingState() {
  return (
    <div className="grid place-items-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm text-muted-foreground">Loading ColdOps dashboard…</div>
      </div>
    </div>
  )
}

export function KpiCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: 'ghost' | 'optimized' | 'active' | 'consolidation' }) {
  const tones = {
    ghost: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: 'text-red-500' },
    optimized: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
    active: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: 'text-sky-500' },
    consolidation: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  }
  const t = tones[tone]
  return (
    <Card className={`${t.bg} ${t.border} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`grid place-items-center h-8 w-8 rounded-lg bg-card/80 ${t.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className={`text-2xl font-bold tracking-tight ${t.text}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
        <Separator className="my-2" />
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}

export function RoiCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: 'ghost' | 'optimized' | 'active' | 'consolidation' }) {
  const tones = {
    ghost: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: 'text-red-500' },
    optimized: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
    active: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: 'text-sky-500' },
    consolidation: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  }
  const t = tones[tone]
  return (
    <Card className={`${t.bg} ${t.border} border`}>
      <CardContent className="p-4">
        <div className={`grid place-items-center h-8 w-8 rounded-lg bg-card/80 ${t.icon} mb-2`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className={`text-2xl font-bold tracking-tight ${t.text}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
        <Separator className="my-2" />
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}

export function Legend() {
  const items: { label: string; cls: string }[] = [
    { label: 'Ghost Load', cls: 'bg-red-500' },
    { label: 'Consolidate', cls: 'bg-amber-500' },
    { label: 'Optimized', cls: 'bg-emerald-500' },
    { label: 'Active', cls: 'bg-sky-500' },
    { label: 'Idle', cls: 'bg-zinc-400' },
  ]
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={`h-2.5 w-2.5 rounded-sm ${i.cls}`} />
          {i.label}
        </div>
      ))}
    </div>
  )
}

export function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-md bg-card/60 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-mono font-semibold text-sm ${ok === false ? 'text-red-600' : ''}`}>{value}</div>
    </div>
  )
}

export function SeverityTabs({ counts, active, onChange }: { counts: Record<string, number>; active: Severity | 'ALL'; onChange: (s: Severity | 'ALL') => void }) {
  const tabs: { key: Severity | 'ALL'; label: string; color: string }[] = [
    { key: 'ALL', label: 'All', color: 'bg-zinc-500' },
    { key: 'CRITICAL', label: 'Critical', color: 'bg-red-500' },
    { key: 'HIGH', label: 'High', color: 'bg-orange-500' },
    { key: 'MEDIUM', label: 'Medium', color: 'bg-amber-400' },
    { key: 'LOW', label: 'Low', color: 'bg-sky-400' },
  ]
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      {tabs.map(t => {
        const count = t.key === 'ALL' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[t.key] || 0
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${active === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${t.color}`} />
            {t.label}
            <span className="text-[10px] text-muted-foreground">({count})</span>
          </button>
        )
      })}
    </div>
  )
}

export function ChannelIcon({ ch }: { ch: string }) {
  const map: Record<string, { icon: any; label: string }> = {
    DASHBOARD: { icon: Activity, label: 'Dashboard' },
    SMS: { icon: Smartphone, label: 'SMS' },
    WHATSAPP: { icon: MessageSquare, label: 'WhatsApp' },
    EMAIL: { icon: Mail, label: 'Email' },
  }
  const m = map[ch]
  if (!m) return null
  const Icon = m.icon
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex"><Icon className="h-3 w-3" /></span>
        </TooltipTrigger>
        <TooltipContent side="top">{m.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ActiveSetbackCard({ setback }: { setback: ActiveSetback }) {
  const pct = (setback.currentStep / setback.totalSteps) * 100
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ThermometerSun className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-sm">{setback.roomCode}</span>
          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Ramping</Badge>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{setback.setbackId}</span>
      </div>
      <div className="flex items-center gap-2 text-xs mb-2">
        <span className="font-mono">{setback.startSetpoint.toFixed(1)}°C</span>
        <ArrowRight className="h-3 w-3 text-amber-600" />
        <span className="font-mono font-semibold">{setback.endSetpoint.toFixed(1)}°C</span>
        {setback.bms && (
          <span className="ml-auto text-muted-foreground">Now: <b className="text-foreground">{setback.bms.currentTemp.toFixed(1)}°C</b></span>
        )}
      </div>
      <Progress value={pct} className="h-1.5 mb-2" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Step {setback.currentStep}/{setback.totalSteps}</span>
        <span>{setback.bms ? formatKW(setback.bms.powerKW) : '—'}</span>
      </div>
    </div>
  )
}
