'use client'

import {
  Activity, Camera, Map as MapIcon, ClipboardList, ScrollText, Settings as SettingsIcon,
  Snowflake, TrendingDown, Server, Radio, RefreshCw, ArrowRight, ThermometerSun,
  Loader2, Zap, Package, AlertTriangle, Leaf, Target, BadgeHelp
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
// SIDEBAR — replaces the old TopBar. Left-side navigation with 5 views + settings.
// ============================================================================

export function Sidebar({
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

  const nav: { key: ViewKey; label: string; description: string; icon: any; flagship?: string }[] = [
    { key: 'command', label: 'Command Center', description: 'Ghost load detection & live KPIs', icon: Activity, flagship: 'Main Detection' },
    { key: 'camera', label: 'Camera Scan', description: 'Real webcam + AI product detection', icon: Camera },
    { key: 'map', label: 'Cold Room Map', description: 'Consolidation & floor plan', icon: MapIcon, flagship: 'Fill the Gap' },
    { key: 'workorders', label: 'Work Orders', description: 'Execution & approvals', icon: ClipboardList },
    { key: 'logs', label: 'Detection Logs', description: 'Audit trail & scenario results', icon: ScrollText },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 z-40 flex flex-col">
      {/* Logo + brand */}
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Snowflake className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">ColdOps</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Marigold PJ Factory</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {nav.map(n => {
          const Icon = n.icon
          const active = view === n.key
          const badge = n.key === 'workorders' && totalOpen > 0 ? totalOpen : null
          return (
            <button
              key={n.key}
              onClick={() => onView(n.key)}
              className={`w-full text-left rounded-lg p-2.5 transition-all group ${
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/60 text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="text-sm font-medium flex-1">{n.label}</span>
                {badge !== null && (
                  <span className="min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold rounded-full bg-red-500 text-white">
                    {badge}
                  </span>
                )}
                {n.flagship && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary-foreground/60' : 'bg-emerald-500'}`} />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <div className="font-semibold">Flagship Feature</div>
                        <div>{n.flagship}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className={`text-[10px] mt-0.5 ml-6 ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {n.description}
              </div>
            </button>
          )
        })}
      </nav>

      {/* 3 Flagship highlights */}
      <div className="p-3 border-t border-border/60 space-y-1.5">
        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide px-1">3 Flagship Features</div>
        <FlagshipBadge icon={Zap} label="Main Detection" description="Cross-references smart meter data with production schedules to detect compressors running at full power during non-production hours. Deterministic rules for explainability." />
        <FlagshipBadge icon={Package} label="Fill the Gap" description="Identifies underutilized cold rooms (<25%) and generates FEFO-sequenced consolidation plans with allergen checks + net benefit calculation." />
        <FlagshipBadge icon={ThermometerSun} label="Progressive Setback" description="Ramps temperature gradually (4°C→8°C) via real BMS API commands with readback confirmations + safety auto-abort." />
      </div>

      {/* Status indicators */}
      <div className="p-3 border-t border-border/60 space-y-1.5">
        <div className="flex items-center justify-between">
          <StatusPill ok={bmsOnline} label="BMS" />
          <StatusPill ok={realtimeConnected} label="Live" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRefresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {savings && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
            <TrendingDown className="h-3 w-3" />
            {formatRM(savings.tonightRM)} saved tonight
          </div>
        )}
      </div>

      {/* Settings gear */}
      <div className="p-2 border-t border-border/60">
        <Button
          variant={view === 'settings' ? 'default' : 'ghost'}
          size="sm"
          className="w-full justify-start gap-2 h-9"
          onClick={() => onView('settings')}
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="text-sm">Settings</span>
        </Button>
      </div>
    </aside>
  )
}

function FlagshipBadge({ icon: Icon, label, description }: { icon: any; label: string; description: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/40 cursor-help transition-colors">
            <Icon className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="text-[10px] font-medium">{label}</span>
            <BadgeHelp className="h-2.5 w-2.5 text-muted-foreground/50 ml-auto" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[260px] text-xs">
          <div className="font-semibold mb-1">{label}</div>
          <div className="text-[10px] leading-relaxed">{description}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${ok ? 'text-emerald-700' : 'text-zinc-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
      {label}
    </div>
  )
}

// ============================================================================
// FOOTER
// ============================================================================

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/50">
      <div className="px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Snowflake className="h-3.5 w-3.5 text-primary" />
            <span><b className="text-foreground">ColdOps</b> v2.0 · White-label SaaS by Double Dot Solutions Sdn Bhd</span>
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

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================

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
  return <KpiCard icon={Icon} label={label} value={value} sub={sub} tone={tone} />
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
    SMS: { icon: Server, label: 'SMS' },
    WHATSAPP: { icon: Radio, label: 'WhatsApp' },
    EMAIL: { icon: Radio, label: 'Email' },
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

export function SectionHeader({ icon: Icon, title, description, flagship }: { icon: any; title: string; description: string; flagship?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">{title}</h3>
        {flagship && (
          <Badge className="text-[9px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <Target className="h-2.5 w-2.5 mr-1" />
            {flagship}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 ml-6">{description}</p>
    </div>
  )
}
