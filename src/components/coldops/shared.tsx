'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Snowflake, TrendingDown, ArrowRight, ThermometerSun,
  Loader2, Zap, CheckCircle2, Circle, ChevronRight,
  UploadCloud, ClipboardCheck, BarChart2, Bell
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Savings, Severity, ViewKey, ActiveSetback } from '@/lib/coldops/types'
import { formatRM, formatKW } from '@/lib/coldops/ui'

export type { ViewKey } from '@/lib/coldops/types'

export const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-white/50 rounded-[20px] shadow-sm hover:-translate-y-1 hover:shadow-md hover:bg-white/90 transition-all duration-300 ${className}`}>
    {children}
  </div>
)

// ============================================================================
// TOP NAV — 3-step stepper navigation
// ============================================================================

const STEPS: { key: ViewKey; step: number; label: string; description: string; icon: any }[] = [
  { key: 'ingestion', step: 1, label: 'Configure', description: 'Schedule & WMS upload', icon: UploadCloud },
  { key: 'workorders', step: 2, label: 'Actions', description: 'Review AI recommendations', icon: ClipboardCheck },
  { key: 'command', step: 3, label: 'Dashboard', description: 'Savings & overview', icon: BarChart2 },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function TopNavBell() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open && events.length === 0) {
      setLoading(true)
      fetch('/api/activity')
        .then(r => r.json())
        .then(d => setEvents(d.events ?? []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [open, events.length])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex items-center justify-center h-9 w-9 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-[8px] right-[10px] h-1.5 w-1.5 rounded-full bg-[#EF4444] border border-white" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-white/90 backdrop-blur-[12px] border border-[rgba(255,255,255,0.9)] rounded-[16px] shadow-[0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden" align="end" sideOffset={8}>
        <div className="px-4 py-3 border-b border-[#F3F4F6] bg-white">
          <h3 className="text-[13px] font-[600] text-[#111827]">Notifications</h3>
        </div>
        <div className="flex flex-col max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-[#9CA3AF]" /></div>
          ) : events.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-[#9CA3AF]">No notifications</div>
          ) : (
            events.slice(0, 3).map((ev, i) => {
              const isLast = i === Math.min(3, events.length) - 1
              return (
                <div key={ev.id} className={`flex items-start gap-3 px-4 py-3 bg-white/50 hover:bg-[#F9FAFB] transition-colors cursor-pointer ${!isLast ? 'border-b border-[#F3F4F6]' : ''}`}>
                  <div className="flex-shrink-0 h-[24px] w-[24px] rounded-full bg-[#F0FDF4] flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-[600] text-[#111827] truncate">{ev.title}</div>
                      <div className="text-[10px] text-[#9CA3AF] flex-shrink-0">{timeAgo(ev.timestamp)}</div>
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-[1px] line-clamp-2 leading-tight">{ev.description}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="px-4 py-2 bg-[#F9FAFB] border-t border-[#F3F4F6] text-center">
          <button className="text-[11px] font-[600] text-[#0EA5E9] hover:text-[#0284C7] transition-colors">
            View all activity
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

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
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < 10) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false) // Scrolling down
      } else {
        setIsVisible(true) // Scrolling up
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <header 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white/80 backdrop-blur-[16px] border border-[rgba(255,255,255,0.9)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-3 h-[52px] flex items-center gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-1 flex-shrink-0 pl-3">
          <span className="text-[14px] font-[800] text-[#111827]">Cold</span>
          <span className="text-[14px] font-[800] text-[#0EA5E9]">Ops</span>
        </div>

        {/* Stepper */}
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full text-[13px] font-[600] transition-all duration-200 text-[#6B7280] hover:bg-black/5 hover:text-[#111827]"
          >
            Home
          </Link>
          {STEPS.map((s) => {
            const isActive = s.key === view
            return (
              <button
                key={s.key}
                onClick={() => {
                  onView(s.key)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`px-5 py-2.5 rounded-full text-[13px] font-[600] transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0EA5E9] text-white shadow-sm'
                    : 'text-[#6B7280] hover:bg-black/5 hover:text-[#111827]'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </nav>

        {/* Bell Notification */}
        <div className="pr-1">
          <TopNavBell />
        </div>
      </div>
    </header>
  )
}

// ============================================================================
// FOOTER
// ============================================================================

export function Footer() {
  return (
    <footer className="mt-auto bg-white/40 border-t border-white/50 backdrop-blur-md px-[32px] py-[32px] mt-12">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4 text-[12px] text-[#9CA3AF]">
        <div className="flex items-center gap-2">
          <span>&copy; 2026 ColdOp Solutions Sdn Bhd</span>
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
