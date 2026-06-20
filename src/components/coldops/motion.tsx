'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type ReactNode, useState, useEffect, useRef } from 'react'


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
