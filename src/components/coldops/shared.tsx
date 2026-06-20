'use client'

import {
  Snowflake, TrendingDown, ArrowRight, ThermometerSun,
  Loader2, Zap, CheckCircle2, Circle, ChevronRight,
  UploadCloud, ClipboardCheck, BarChart2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { Savings, Severity, ViewKey, ActiveSetback } from '@/lib/coldops/types'
import { formatRM, formatKW } from '@/lib/coldops/ui'

export type { ViewKey } from '@/lib/coldops/types'

// ============================================================================
// TOP NAV — 3-step stepper navigation
// ============================================================================

const STEPS: { key: ViewKey; step: number; label: string; description: string; icon: any }[] = [
  { key: 'ingestion', step: 1, label: 'Configure', description: 'Schedule & WMS upload', icon: UploadCloud },
  { key: 'workorders', step: 2, label: 'Actions', description: 'Review AI recommendations', icon: ClipboardCheck },
  { key: 'command', step: 3, label: 'Dashboard', description: 'Savings & overview', icon: BarChart2 },
]

export function TopNav({
  view,
  onView,
  pendingCount,
  savings,
}: {
  view: ViewKey
  onView: (v: ViewKey) => void
  pendingCount: number
  savings?: Savings
}) {
  const activeStep = STEPS.find(s => s.key === view)?.step ?? 1

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Snowflake className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">ColdOps</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Marigold PJ Factory</div>
          </div>
        </div>

        {/* Stepper */}
        <nav className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = s.key === view
            const isDone = s.step < activeStep
            return (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => onView(s.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isDone
                      ? 'text-foreground hover:bg-muted/60'
                      : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className={`flex-shrink-0 h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : isDone
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : s.step}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 mx-1" />
                )}
              </div>
            )
          })}
        </nav>

        {/* Savings pill */}
        {savings && savings.tonightRM > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex-shrink-0">
            <TrendingDown className="h-3.5 w-3.5" />
            {formatRM(savings.tonightRM)} saved tonight
          </div>
        )}
      </div>
    </header>
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

export function SectionHeader({ icon: Icon, title, description, flagship, detailed }: { icon: any; title: string; description: string; flagship?: string; detailed?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">{title}</h3>
        {flagship && (
          <Badge className="text-[9px] bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200">
            <Target className="h-2.5 w-2.5 mr-1" />
            {flagship}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1 ml-6 leading-relaxed">{description}</p>
      {detailed && (
        <p 
          className="text-[11px] text-muted-foreground/80 mt-1.5 ml-6 leading-relaxed [&_b]:font-semibold [&_b]:text-foreground"
          dangerouslySetInnerHTML={{ __html: detailed }}
        />
      )}
    </div>
  )
}
