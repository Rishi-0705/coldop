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
        setIsVisible(false) 
      } else {
        setIsVisible(true) 
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
      <div className="bg-white/80 backdrop-blur-[16px] border border-[rgba(255,255,255,0.9)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-8 h-[56px] flex items-center gap-10">
        
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 mr-4">
          <img src="/logo.svg" alt="ColdOps Logo" className="h-7 w-7 mr-2" />
          <span className="text-[16px] font-[900] text-[#111827]">Cold</span>
          <span className="text-[16px] font-[900] text-[#0EA5E9]">Ops</span>
        </div>

        {}
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

        {}
        <div className="pr-1">
          <TopNavBell />
        </div>
      </div>
    </header>
  )
}





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



