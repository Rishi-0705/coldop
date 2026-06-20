'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type ReactNode, useState, useEffect, useRef } from 'react'

/**
 * Animated view wrapper — fade + slide in on view change.
 */
export function ViewTransition({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Animated card — subtle hover lift + shadow.
 */
export function MotionCard({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered list item entrance.
 */
export function MotionListItem({ children, index, className }: { children: ReactNode; index: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Animated number — counts up when value changes.
 */
export function AnimatedNumber({ value, format = (v: number) => v.toFixed(0), duration = 0.8 }: { value: number; format?: (v: number) => string; duration?: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.5, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {format(value)}
    </motion.span>
  )
}

/**
 * Pulsing dot for live indicators.
 */
export function LiveDot({ color = 'bg-emerald-500', size = 'h-2 w-2' }: { color?: string; size?: string }) {
  return (
    <motion.span
      className={`inline-block rounded-full ${color} ${size}`}
      animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

/**
 * Animated count-up number — smoothly transitions from previous to new value.
 */
export function CountUp({ value, format = (v: number) => v.toFixed(0), duration = 1.2 }: { value: number; format?: (v: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  useEffect(() => {
    const start = prevRef.current
    const end = value
    const startTime = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000
      const t = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(start + (end - start) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else prevRef.current = end
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span>{format(display)}</span>
}

/**
 * Circular progress gauge — animated SVG ring.
 */
export function CircularGauge({ value, max, size = 120, label, unit, color = '#10b981', track = '#e5e7eb' }: {
  value: number
  max: number
  size?: number
  label?: string
  unit?: string
  color?: string
  track?: string
}) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)
  const center = size / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={track} strokeWidth={6} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{value.toFixed(1)}</span>
        {unit && <span className="text-[9px] text-muted-foreground">{unit}</span>}
        {label && <span className="text-[8px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</span>}
      </div>
    </div>
  )
}
