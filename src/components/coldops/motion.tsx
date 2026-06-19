'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type ReactNode } from 'react'

/**
 * Animated view wrapper — fade + slide in on view change.
 */
export function ViewTransition({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
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
