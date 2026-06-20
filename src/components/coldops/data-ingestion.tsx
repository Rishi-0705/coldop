'use client'

import { useState, useEffect } from 'react'
import {
  UploadCloud, FileText, Loader2, CheckCircle2, ArrowRight, Calendar, Table2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { RoomWithBms } from '@/lib/coldops/types'

const SCHEDULE_KEY = 'coldops_schedule'

export interface ScheduleConfig {
  peakStart: string
  peakEnd: string
  workStart: string
  workEnd: string
  shutdownTime: string
}

const DEFAULT_SCHEDULE: ScheduleConfig = {
  peakStart: '08:00',
  peakEnd: '18:00',
  workStart: '07:00',
  workEnd: '22:00',
  shutdownTime: '23:00',
}

function loadSchedule(): ScheduleConfig {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    if (raw) return { ...DEFAULT_SCHEDULE, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_SCHEDULE
}

function TimeInput({
  label,
  value,
  onChange,
  helper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  helper?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {helper && <p className="text-[10px] text-muted-foreground">{helper}</p>}
    </div>
  )
}

interface ParsedRow { coolerCode: string; stockType: string; stockCount: number; maxCapacity: number }

function parsePreview(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase()
  const isNew = header.includes('stock_type') || header.includes('cooler_id')
  const rows: ParsedRow[] = []

  // Aggregate by cooler code
  const agg: Record<string, ParsedRow> = {}

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim())
    if (isNew) {
      if (parts.length < 4) continue
      const code = parts[0].toUpperCase()
      if (!agg[code]) agg[code] = { coolerCode: code, stockType: parts[1].toUpperCase(), stockCount: 0, maxCapacity: 0 }
      agg[code].stockCount += parseInt(parts[2], 10) || 0
      agg[code].maxCapacity = Math.max(agg[code].maxCapacity, parseInt(parts[3], 10) || 0)
    } else {
      if (parts.length < 5) continue
      const match = parts[0].match(/^(CR-[0-9]+|RM-[A-Z]|WH[0-9]+)/i)
      if (!match) continue
      const code = match[0].toUpperCase()
      if (!agg[code]) agg[code] = { coolerCode: code, stockType: parts[1].toUpperCase(), stockCount: 0, maxCapacity: 0 }
      agg[code].stockCount += parseInt(parts[4], 10) || 0
      agg[code].maxCapacity += parseInt(parts[3], 10) || 0
    }
  }
  return Object.values(agg).slice(0, 10)
}

export function DataIngestionView({ rooms, onAction }: { rooms: RoomWithBms[]; onAction: () => void }) {
  const [schedule, setSchedule] = useState<ScheduleConfig>(DEFAULT_SCHEDULE)
  const [scheduleSaved, setScheduleSaved] = useState(false)
  const [wmsLoading, setWmsLoading] = useState(false)
  const [wmsSuccess, setWmsSuccess] = useState(false)
  const [preview, setPreview] = useState<ParsedRow[]>([])

  useEffect(() => {
    setSchedule(loadSchedule())
  }, [])

  const updateField = (field: keyof ScheduleConfig, value: string) => {
    setSchedule(prev => ({ ...prev, [field]: value }))
    setScheduleSaved(false)
  }

  const saveSchedule = () => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule))
    setScheduleSaved(true)
    toast.success('Company schedule saved.')
  }

  const handleWmsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setWmsLoading(true)
    setPreview([])

    // Parse locally for instant preview
    const text = await file.text()
    const parsed = parsePreview(text)
    setPreview(parsed)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('schedule', JSON.stringify(schedule))

    try {
      const res = await fetch('/api/ingest/wms', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ok) {
        const msg = data.engineResult
          ? `${data.engineResult.actionableCount} AI actions generated (${data.engineResult.timeWindow} window). Click "Go to Actions" to review.`
          : 'WMS data ingested.'
        toast.success(msg)
        setWmsSuccess(true)
      } else {
        toast.error(data.error || 'Upload failed.')
        setPreview([])
      }
    } catch (err: any) {
      toast.error(err.message)
      setPreview([])
    } finally {
      setWmsLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Step 1 — Configure</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tell the system when your facility operates and upload your current stock data.
          The AI will use this to generate energy-saving temperature and consolidation recommendations.
        </p>
      </div>

      {/* Section A: Company Schedule */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Company Schedule</h2>
            <p className="text-xs text-muted-foreground">
              The smart engine uses this to know when to warm up or cool down each cooler.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TimeInput label="Work Start" value={schedule.workStart} onChange={v => updateField('workStart', v)} helper="Earliest time staff begin operations" />
          <TimeInput label="Work End" value={schedule.workEnd} onChange={v => updateField('workEnd', v)} helper="Latest time operations are active" />
          <TimeInput label="Peak Hours — Start" value={schedule.peakStart} onChange={v => updateField('peakStart', v)} helper="When energy demand is highest" />
          <TimeInput label="Peak Hours — End" value={schedule.peakEnd} onChange={v => updateField('peakEnd', v)} helper="When peak demand subsides" />
          <TimeInput label="Shutdown / Idle From" value={schedule.shutdownTime} onChange={v => updateField('shutdownTime', v)} helper="Coolers can enter low-power mode after this time" />
        </div>

        <Button onClick={saveSchedule} className="w-full sm:w-auto">
          {scheduleSaved ? (
            <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />Schedule Saved</>
          ) : 'Save Schedule'}
        </Button>
      </div>

      {/* Section B: WMS Upload */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">WMS Data Upload</h2>
            <p className="text-xs text-muted-foreground">
              Upload your stock CSV. The smart engine uses stock type and quantity to compute
              the optimal temperature for each cooler.
            </p>
          </div>
        </div>

        {/* Format spec */}
        <div className="rounded-lg bg-muted/40 border border-border/60 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Expected CSV format (4 columns):</p>
          <code className="block text-[11px] text-muted-foreground font-mono">
            cooler_id, stock_type, stock_count, max_capacity
          </code>
          <div className="overflow-x-auto">
            <table className="text-[11px] w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-1 pr-4 font-semibold">cooler_id</th>
                  <th className="text-left py-1 pr-4 font-semibold">stock_type</th>
                  <th className="text-left py-1 pr-4 font-semibold">stock_count</th>
                  <th className="text-left py-1 font-semibold">max_capacity</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr><td className="pr-4 py-0.5">CR-01</td><td className="pr-4">DAIRY</td><td className="pr-4">12</td><td>50</td></tr>
                <tr><td className="pr-4 py-0.5">CR-02</td><td className="pr-4">JUICE</td><td className="pr-4">3</td><td>50</td></tr>
                <tr><td className="pr-4 py-0.5">CR-03</td><td className="pr-4">BLAST_FROZEN</td><td className="pr-4">18</td><td>20</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Valid stock_type values: <code>DAIRY · RAW_MILK · JUICE · BLAST_FROZEN · FINISHED_GOODS · CHILLED_STORAGE · DRY_GOODS · DAIRY_WIP</code>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Also accepts the old 7-column format for backward compatibility.
          </p>
        </div>

        {wmsSuccess ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold">WMS Data Processed</p>
            <p className="text-xs text-muted-foreground text-center">Smart engine has generated temperature & consolidation actions.</p>
          </div>
        ) : wmsLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium animate-pulse">Running smart engine — computing temperature recommendations…</p>
          </div>
        ) : (
          <div className="relative">
            <input type="file" accept=".csv,.txt" onChange={handleWmsUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all">
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-semibold">Click or drag your WMS CSV here</p>
                <p className="text-xs text-muted-foreground mt-1">4-column format preferred · 7-column legacy also accepted</p>
              </div>
              <Button variant="outline" size="sm" className="pointer-events-none">Browse file</Button>
            </div>
          </div>
        )}

        {/* Parsed preview table */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Table2 className="h-3.5 w-3.5 text-primary" />
              Parsed {preview.length} cooler{preview.length > 1 ? 's' : ''}
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Cooler</th>
                    <th className="text-left px-3 py-2 font-semibold">Stock Type</th>
                    <th className="text-right px-3 py-2 font-semibold">Count</th>
                    <th className="text-right px-3 py-2 font-semibold">Capacity</th>
                    <th className="text-right px-3 py-2 font-semibold">Utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => {
                    const util = r.maxCapacity > 0 ? Math.round((r.stockCount / r.maxCapacity) * 100) : 0
                    return (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-3 py-1.5 font-mono font-semibold">{r.coolerCode}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.stockType.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-1.5 text-right">{r.stockCount}</td>
                        <td className="px-3 py-1.5 text-right">{r.maxCapacity}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${util < 25 ? 'text-amber-600' : util > 75 ? 'text-emerald-600' : ''}`}>
                          {util}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Don't have a file? Try <code className="bg-muted px-1 rounded">public/sample-wms.csv</code> — or generate a new one with the 4-column format above.
        </p>
      </div>

      {/* CTA */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors ${
        wmsSuccess ? 'border-primary/30 bg-primary/5' : 'border-border bg-card opacity-60'
      }`}>
        <div>
          <p className="text-sm font-semibold">Ready to review AI recommendations?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Upload your WMS data above to unlock Step 2.</p>
        </div>
        <Button disabled={!wmsSuccess} onClick={onAction} className="flex-shrink-0">
          Go to Actions <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
