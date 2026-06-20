'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, X, ChevronRight, ChevronLeft, Check, Zap, Map,
  ClipboardList, Bell, BarChart3, Calendar, Package, Settings,
  TrendingDown, Leaf, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface TourStep {
  title: string
  description: string
  icon: any
  highlight?: string
  color: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to ColdOps',
    description: 'A cold-chain energy intelligence platform for F&B manufacturing. This tour will walk you through the key features that detect ghost loads, optimize cold room utilization, and drive progressive temperature setbacks — saving factories thousands of Ringgit per month.',
    icon: Sparkles,
    color: 'emerald',
  },
  {
    title: 'Command Center',
    description: 'Your real-time dashboard showing ghost load RM waste, monthly savings, CO₂ avoided, and worst offending rooms. The live energy timeline chart shows actual power draw vs idle baseline from smart meter data.',
    icon: Zap,
    color: 'red',
    highlight: 'Command Center',
  },
  {
    title: 'Ghost Load Detection',
    description: 'The system ingests 15-minute interval smart meter data + production schedules, then flags windows where compressors run at full load with zero production activity. Each ghost load is quantified in RM using the TNB commercial tariff of RM 0.509/kWh.',
    icon: TrendingDown,
    color: 'orange',
    highlight: 'Active Ghost Loads',
  },
  {
    title: 'Cold Room Map',
    description: 'Factory floor plan with 8 cold rooms color-coded by status: red = ghost load, amber = consolidation candidate, emerald = optimized, sky = active. Click any room to see live BMS telemetry, pallet inventory, and temperature history.',
    icon: Map,
    color: 'sky',
    highlight: 'Cold Room Map',
  },
  {
    title: 'Consolidation Planner',
    description: 'When multiple rooms fall below 25% utilization, ColdOps generates a consolidation plan with FEFO-sequenced pallet moves, allergen checks, and net benefit calculation. One click creates a work order dispatched to warehouse staff.',
    icon: ArrowRight,
    color: 'amber',
    highlight: 'Consolidation Plan',
  },
  {
    title: 'Progressive Setback Engine',
    description: 'Upon approval, the system sends real HTTP setpoint commands to the BMS simulator, ramping temperature gradually (4°C → 5°C → 6°C → 7°C → 8°C) with readback confirmations at each step. Safety guardrails auto-abort if temps leave safe range.',
    icon: Check,
    color: 'violet',
    highlight: 'Active Setbacks',
  },
  {
    title: 'Work Orders',
    description: 'Consolidation tasks with exact pallet move instructions: source bay → destination bay, FEFO-ordered, allergen-checked. Complete button triggers WMS pallet updates + auto-setbacks on emptied rooms.',
    icon: ClipboardList,
    color: 'emerald',
    highlight: 'Work Orders',
  },
  {
    title: 'Notifications & Quick Actions',
    description: 'Severity-sorted alerts (CRITICAL → LOW) with approve/defer/dismiss actions. The floating Quick Actions panel on the bottom-right gives one-tap access to the top critical alerts from any view.',
    icon: Bell,
    color: 'red',
    highlight: 'Notifications',
  },
  {
    title: 'Analytics & ROI',
    description: '24-hour ghost load heatmap, 30-day savings trend, multi-zone power comparison, and ROI calculator showing payback period. Export savings + work order reports as CSV for stakeholder reporting.',
    icon: BarChart3,
    color: 'sky',
    highlight: 'Analytics',
  },
  {
    title: 'ESG & Sustainability',
    description: 'CO₂ avoided in tonnes, equivalent trees planted, UN SDG alignment (Goals 7, 9, 12, 13), and ESG performance score. Investor-ready sustainability metrics for ESG reporting.',
    icon: Leaf,
    color: 'emerald',
    highlight: 'ESG Dashboard',
  },
  {
    title: 'Ready to Explore',
    description: 'That\'s the tour! Click any nav tab to explore each feature in depth. Try approving a ghost load alert to see the progressive setback engine execute against the BMS simulator in real time.',
    icon: Sparkles,
    color: 'emerald',
  },
]

const colorMap: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-500' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: 'text-sky-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: 'text-violet-500' },
}

export function DemoTour({ onViewChange }: { onViewChange?: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)

  // Auto-open on first visit
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('coldops-tour-seen')) {
      const t = setTimeout(() => setIsOpen(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  const close = () => {
    setIsOpen(false)
    localStorage.setItem('coldops-tour-seen', '1')
  }

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
      // Navigate to the relevant view if specified
      const highlight = TOUR_STEPS[step + 1].highlight
      if (highlight && onViewChange) {
        const viewMap: Record<string, string> = {
          'Command Center': 'command',
          'Cold Room Map': 'map',
          'Work Orders': 'workorders',
          'Notifications': 'notifications',
          'Analytics': 'analytics',
          'Schedule': 'schedule',
          'WMS Stock': 'wms',
          'Settings': 'settings',
        }
        const view = viewMap[highlight]
        if (view) onViewChange(view)
      }
    } else {
      close()
    }
  }

  const prev = () => step > 0 && setStep(step - 1)

  const current = TOUR_STEPS[step]
  const c = colorMap[current.color] || colorMap.emerald
  const Icon = current.icon
  const isLast = step === TOUR_STEPS.length - 1

  return (
    <>
      {/* Tour trigger button (always visible) */}
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 left-4 z-40 h-9 gap-1.5 bg-card/80 backdrop-blur shadow-md"
        onClick={() => { setStep(0); setIsOpen(true) }}
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs">Take Tour</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={close}
            />

            {/* Tour card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
            >
              <Card className={`border-2 ${c.border} shadow-2xl overflow-hidden`}>
                {/* Header with gradient */}
                <div className={`relative ${c.bg} px-5 py-4 border-b ${c.border}`}>
                  <div className="flex items-start gap-3">
                    <div className={`grid place-items-center h-11 w-11 rounded-xl bg-card ${c.icon} flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                          Step {step + 1} of {TOUR_STEPS.length}
                        </span>
                        {current.highlight && (
                          <Badge variant="outline" className={`text-[9px] ${c.text} border-current`}>
                            {current.highlight}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold">{current.title}</h3>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={close}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>

                  {/* Progress dots */}
                  <div className="flex items-center justify-center gap-1.5 mt-5 mb-4">
                    {TOUR_STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === step ? `w-6 ${c.icon.replace('text-', 'bg-')}` : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={prev} disabled={step === 0} className="text-xs">
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={close} className="text-xs text-muted-foreground">
                        Skip tour
                      </Button>
                      <Button size="sm" onClick={next} className={`gap-1 ${c.icon.replace('text-', 'bg-')} hover:opacity-90`}>
                        {isLast ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Got it
                          </>
                        ) : (
                          <>
                            Next <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
