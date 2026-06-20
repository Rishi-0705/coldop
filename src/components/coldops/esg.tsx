'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Leaf, TreePine, Car, Home, Zap, Award, TrendingUp,
  RefreshCw, Loader2, Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts'
import type { EsgData } from '@/lib/coldops/types'
import { formatRM, formatKW } from '@/lib/coldops/ui'
import { CountUp, CircularGauge } from './motion'


export function EsgDashboard() {
  const [data, setData] = useState<EsgData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/esg')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('esg fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 grid place-items-center h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const { co2, energy, esgScore, monthlyTrend, sdg } = data

  return (
    <div className="space-y-4">
      {}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 via-card to-sky-50/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-4 w-4 text-blue-500" />
                Sustainability & ESG Dashboard
              </CardTitle>
              <CardDescription className="text-xs">
                Environmental impact · UN SDG alignment · ESG performance score
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">ESG Score</div>
                <CountUp value={esgScore.score} format={(v) => Math.round(v).toString()} className="text-2xl font-bold text-blue-600" />
              </div>
              <div className={`grid place-items-center h-14 w-14 rounded-xl font-bold text-2xl ${
                esgScore.grade.startsWith('A') ? 'bg-blue-100 text-blue-700' :
                esgScore.grade.startsWith('B') ? 'bg-amber-100 text-amber-700' :
                'bg-zinc-100 text-zinc-600'
              }`}>
                {esgScore.grade}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ScoreBar label="Environmental" score={esgScore.breakdown.environmental} color="blue" />
            <ScoreBar label="Social" score={esgScore.breakdown.social} color="sky" />
            <ScoreBar label="Governance" score={esgScore.breakdown.governance} color="violet" />
          </div>

          {}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ImpactCard
              icon={Leaf}
              value={co2.avoidedTonnes}
              unit="tonnes CO₂"
              label="Avoided"
              color="blue"
              format={(v) => v.toFixed(2)}
            />
            <ImpactCard
              icon={TreePine}
              value={co2.equivalentTrees}
              unit="trees/yr"
              label="Equivalent"
              color="blue"
            />
            <ImpactCard
              icon={Car}
              value={co2.equivalentCarsOff}
              unit="cars off road"
              label="Equivalent"
              color="amber"
              format={(v) => v.toFixed(1)}
            />
            <ImpactCard
              icon={Home}
              value={co2.equivalentHomesPowered}
              unit="homes/mo"
              label="Powered by savings"
              color="sky"
              format={(v) => v.toFixed(1)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              6-Month CO₂ Avoided Trend
            </CardTitle>
            <CardDescription className="text-xs">Monthly CO₂ reduction in tonnes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" unit=" t" />
                <RTooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v: any, name: string) => {
                    if (name === 'co2Tonnes') return [`${v} t CO₂`, 'CO₂ Avoided']
                    return [v, name]
                  }}
                />
                <Area type="monotone" dataKey="co2Tonnes" stroke="#10b981" strokeWidth={2} fill="url(#co2Grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              UN SDG Alignment
            </CardTitle>
            <CardDescription className="text-xs">ColdOps contributes to 4 Sustainable Development Goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sdg.map((goal, i) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className="grid place-items-center h-10 w-10 rounded-lg text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: goal.color }}
                  >
                    {goal.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{goal.name}</div>
                    <div className="text-[10px] text-muted-foreground">{goal.contribution}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Energy Savings Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <CircularGauge
                value={energy.totalKwhSaved / 100}
                max={10}
                size={100}
                label="kWh × 100"
                color="#f59e0b"
              />
              <div className="text-xs text-muted-foreground mt-1">Total kWh Saved</div>
              <div className="text-sm font-bold">{energy.totalKwhSaved.toLocaleString()} kWh</div>
            </div>
            <div className="text-center">
              <CircularGauge
                value={energy.peakDemandReductionKW}
                max={80}
                size={100}
                unit="kW"
                label="Peak"
                color="#ef4444"
              />
              <div className="text-xs text-muted-foreground mt-1">Peak Demand Reduction</div>
              <div className="text-sm font-bold">{formatKW(energy.peakDemandReductionKW)}</div>
            </div>
            <div className="text-center">
              <CircularGauge
                value={co2.avoidedTonnes}
                max={10}
                size={100}
                unit="t CO₂"
                label="Avoided"
                color="#10b981"
              />
              <div className="text-xs text-muted-foreground mt-1">CO₂ Avoided</div>
              <div className="text-sm font-bold">{co2.avoidedTonnes.toFixed(2)} tonnes</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: 'blue' | 'sky' | 'violet' }) {
  const colors = {
    blue: { bar: 'bg-blue-500', text: 'text-blue-600' },
    sky: { bar: 'bg-sky-500', text: 'text-sky-600' },
    violet: { bar: 'bg-violet-500', text: 'text-violet-600' },
  }
  const c = colors[color]
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`text-sm font-bold ${c.text}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${c.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function ImpactCard({ icon: Icon, value, unit, label, color, format = (v: number) => Math.round(v).toString() }: {
  icon: any
  value: number
  unit: string
  label: string
  color: 'blue' | 'amber' | 'sky'
  format?: (v: number) => string
}) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', icon: 'text-sky-500' },
  }
  const c = colors[color]
  return (
    <div className={`rounded-lg border border-border/60 ${c.bg} p-3`}>
      <div className={`grid place-items-center h-8 w-8 rounded-lg bg-card/80 ${c.icon} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className={`text-xl font-bold ${c.text}`}>
        <CountUp value={value} format={format} duration={1.5} />
      </div>
      <div className="text-[10px] text-muted-foreground">{unit}</div>
      <Separator className="my-1.5" />
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
