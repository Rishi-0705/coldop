'use client'

import { useState, useEffect } from 'react'
import {
  UploadCloud, FileText, Loader2, CheckCircle2, ArrowRight, Calendar, Table2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { RoomWithBms } from '@/lib/coldops/types'
import { GlassCard } from '@/components/coldops/shared'

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
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[12px] font-medium text-[#374151] uppercase tracking-wide">{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-[#D1D5DB] rounded-[10px] px-[14px] py-[10px] text-[14px] text-[#111827] focus:outline-none focus:border-[#0EA5E9] focus:ring-[3px] focus:ring-[#0EA5E9]/15 transition-all bg-white"
      />
      {helper && <p className="text-[11px] text-[#9CA3AF] mt-1">{helper}</p>}
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
    <div>
      <div className="max-w-[720px] mx-auto space-y-6 px-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#111827]">Step 1 — Configure</h1>
          <p className="text-[14px] text-[#6B7280] max-w-[520px] leading-[1.6] mt-2">
            Tell the system when your facility operates and upload your current stock data.
            The AI will use this to generate energy-saving temperature and consolidation recommendations.
          </p>
        </div>

        {/* Section A: Company Schedule */}
        <GlassCard className="p-[28px] sm:px-[32px] space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-[36px] w-[36px] rounded-[10px] bg-[#EFF6FF] text-[#0EA5E9] flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">Company Schedule</h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                The smart engine uses this to know when to warm up or cool down each cooler.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <TimeInput label="Work Start" value={schedule.workStart} onChange={v => updateField('workStart', v)} helper="Earliest time staff begin operations" />
            <TimeInput label="Work End" value={schedule.workEnd} onChange={v => updateField('workEnd', v)} helper="Latest time operations are active" />
            <TimeInput label="Peak Hours — Start" value={schedule.peakStart} onChange={v => updateField('peakStart', v)} helper="When energy demand is highest" />
            <TimeInput label="Peak Hours — End" value={schedule.peakEnd} onChange={v => updateField('peakEnd', v)} helper="When peak demand subsides" />
            <TimeInput label="Shutdown / Idle From" value={schedule.shutdownTime} onChange={v => updateField('shutdownTime', v)} helper="Coolers can enter low-power mode after this time" />
          </div>

          <div className="pt-2">
            <button 
              onClick={saveSchedule} 
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-[10px] px-[20px] py-[10px] font-semibold text-[14px] transition-colors flex items-center justify-center w-full sm:w-auto"
            >
              {scheduleSaved ? (
                <><CheckCircle2 className="h-4 w-4 mr-2 text-white" />Schedule Saved</>
              ) : 'Save Schedule'}
            </button>
          </div>
        </GlassCard>

        {/* Section B: WMS Upload */}
        <GlassCard className="p-[28px] sm:px-[32px] space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-[36px] w-[36px] rounded-[10px] bg-[#EFF6FF] text-[#0EA5E9] flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">WMS Data Upload</h2>
              <p className="text-[13px] text-[#6B7280] mt-0.5">
                Upload your stock CSV. The smart engine uses stock type and quantity to compute
                the optimal temperature for each cooler.
              </p>
            </div>
          </div>

          {/* Format spec */}
          <div className="bg-[#F9FAFB] rounded-[10px] p-[16px] text-[12px] font-mono border border-[#E5E7EB]">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[#6B7280] font-medium border-b border-[#E5E7EB]">
                  <th className="py-2 pr-4">cooler_id</th>
                  <th className="py-2 pr-4">stock_type</th>
                  <th className="py-2 pr-4">stock_count</th>
                  <th className="py-2">max_capacity</th>
                </tr>
              </thead>
              <tbody className="text-[#111827]">
                <tr>
                  <td className="pr-4 py-2">CR-01</td>
                  <td className="pr-4 py-2"><span className="bg-[#EFF6FF] text-[#0EA5E9] rounded-[6px] px-[8px] py-[2px] text-[11px] font-medium">DAIRY</span></td>
                  <td className="pr-4 py-2">12</td>
                  <td className="py-2">50</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">CR-02</td>
                  <td className="pr-4 py-2"><span className="bg-[#EFF6FF] text-[#0EA5E9] rounded-[6px] px-[8px] py-[2px] text-[11px] font-medium">JUICE</span></td>
                  <td className="pr-4 py-2">3</td>
                  <td className="py-2">50</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">CR-03</td>
                  <td className="pr-4 py-2"><span className="bg-[#EFF6FF] text-[#0EA5E9] rounded-[6px] px-[8px] py-[2px] text-[11px] font-medium">BLAST_FROZEN</span></td>
                  <td className="pr-4 py-2">18</td>
                  <td className="py-2">20</td>
                </tr>
              </tbody>
            </table>
          </div>

          {wmsSuccess ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <CheckCircle2 className="h-12 w-12 text-[#059669]" />
              <div className="text-center">
                <p className="text-[15px] font-semibold text-[#111827]">WMS Data Processed</p>
                <p className="text-[13px] text-[#6B7280] mt-1">Smart engine has generated temperature & consolidation actions.</p>
              </div>
            </div>
          ) : wmsLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-[#0EA5E9]" />
              <p className="text-[14px] font-medium text-[#374151] animate-pulse">Computing temperature recommendations…</p>
            </div>
          ) : (
            <div className="relative">
              <input type="file" accept=".csv,.txt" onChange={handleWmsUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="flex flex-col items-center justify-center gap-4 py-[40px] border-2 border-dashed border-[#CBD5E1] rounded-[12px] bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors">
                <UploadCloud className="h-10 w-10 text-[#0EA5E9]" />
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-[#111827]">Click or drag your WMS CSV here</p>
                  <p className="text-[12px] text-[#9CA3AF] mt-1">4-column format preferred · 7-column legacy also accepted</p>
                </div>
                <div className="border border-[#D1D5DB] bg-white rounded-[8px] px-[16px] py-[8px] text-[13px] text-[#374151] font-medium pointer-events-none shadow-sm">
                  Browse file
                </div>
              </div>
            </div>
          )}

          {/* Parsed preview table */}
          {preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
                <Table2 className="h-4 w-4 text-[#0EA5E9]" />
                Parsed {preview.length} cooler{preview.length > 1 ? 's' : ''}
              </div>
              <div className="rounded-[10px] border border-[#E5E7EB] overflow-hidden bg-white">
                <table className="w-full text-[12px]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Cooler</th>
                      <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Stock Type</th>
                      <th className="text-right px-4 py-3 font-medium text-[#6B7280]">Count</th>
                      <th className="text-right px-4 py-3 font-medium text-[#6B7280]">Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-[#E5E7EB]">
                        <td className="px-4 py-2 font-mono font-medium text-[#111827]">{r.coolerCode}</td>
                        <td className="px-4 py-2">
                          <span className="bg-[#EFF6FF] text-[#0EA5E9] rounded-[6px] px-[8px] py-[2px] text-[11px] font-medium">
                            {r.stockType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-[#111827]">{r.stockCount}</td>
                        <td className="px-4 py-2 text-right text-[#111827]">{r.maxCapacity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-[12px] text-[#9CA3AF]">
            Don't have a file? Try <span className="bg-[#F3F4F6] text-[#6B7280] px-1.5 py-0.5 rounded-[4px] font-mono text-[11px]">public/sample-wms.csv</span> — or generate a new one.
          </p>
        </GlassCard>
      </div>

      {/* Bottom CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/50 py-[20px] px-[32px] z-30 shadow-[0_-4px_32px_rgba(0,0,0,0.08)]">
        <div className="max-w-[720px] mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-[#111827]">Ready to review AI recommendations?</p>
            <p className="text-[13px] text-[#6B7280] mt-0.5">Upload your WMS data above to unlock Step 2.</p>
          </div>
          <button 
            disabled={!wmsSuccess} 
            onClick={onAction} 
            className={`flex items-center justify-center rounded-[10px] px-6 py-3 font-semibold text-[14px] transition-all flex-shrink-0 ${
              wmsSuccess 
                ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm' 
                : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
            }`}
          >
            Go to Actions <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  )
}
