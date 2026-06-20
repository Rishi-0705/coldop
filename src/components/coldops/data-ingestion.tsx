'use client'

import { useState } from 'react'
import { UploadCloud, Camera, FileText, Loader2, CheckCircle2, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RoomWithBms } from '@/lib/coldops/types'

export function DataIngestionView({ rooms, onAction }: { rooms: RoomWithBms[]; onAction: () => void }) {
  const [mode, setMode] = useState<'wms' | 'camera' | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.code || 'RM-C')

  const handleWmsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/ingest/wms', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ok) {
        toast.success('Successful! Check Action Center to view the anomaly and fixes needed.')
        setSuccess(true)
        onAction()
        setTimeout(() => { setSuccess(false); setMode(null) }, 2000)
      } else {
        toast.error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCameraUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('roomCode', selectedRoom)

    try {
      const res = await fetch('/api/ingest/camera', { method: 'POST', body: formData })
      const data = await res.json()
      
      // Simulate a slightly longer "AI scan"
      await new Promise(r => setTimeout(r, 2000))

      if (data.ok) {
        toast.success('Successful! Check Action Center to view the anomaly and fixes needed.')
        setSuccess(true)
        onAction()
        setTimeout(() => { setSuccess(false); setMode(null) }, 2000)
      } else {
        toast.error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold tracking-tight">Live Data Ingestion Engine</h2>
          <p className="text-sm text-muted-foreground">Inject real data (CSV or Camera snaps) to instantly trigger the ColdOps detection models.</p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 min-h-[400px] flex flex-col justify-center">

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
            <div className="text-lg font-semibold">Ingestion Successful</div>
            <div className="text-sm text-muted-foreground">Notifications have been generated.</div>
          </div>
        ) : loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              {mode === 'camera' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-full border-2 border-primary/50 border-t-primary rounded-md animate-[spin_2s_linear_infinite_reverse]" />
                </div>
              )}
            </div>
            <div className="text-sm font-medium animate-pulse">
              {mode === 'camera' ? 'Computer Vision scanning cooler...' : 'Parsing WMS data & recalculating routes...'}
            </div>
          </div>
        ) : !mode ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => setMode('wms')}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm">WMS Data CSV</div>
                <div className="text-xs text-muted-foreground mt-1">Updates live pallet counts</div>
              </div>
            </button>
            <button
              onClick={() => setMode('camera')}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm">Camera Snapshot</div>
                <div className="text-xs text-muted-foreground mt-1">AI stock level detection</div>
              </div>
            </button>
          </div>
        ) : mode === 'wms' ? (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Upload a CSV with <code>RoomCode, PalletCount</code> to update the factory floor stock levels. This triggers the Utilization Optimizer.
            </div>
            <div className="relative">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleWmsUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click or Drag CSV here</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setMode(null)}>Back</Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Select which room the camera is in, then upload an image. The AI will count the visible pallets and cross-reference BMS telemetry.
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Select Camera Location:</label>
              <select 
                className="w-full text-sm rounded-md border border-border p-2 bg-background"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                {rooms.map(r => <option key={r.code} value={r.code}>{r.code} - {r.name}</option>)}
              </select>
            </div>
            <div className="relative mt-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleCameraUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click to upload Camera Snapshot</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setMode(null)}>Back</Button>
          </div>
        )}
      </div>
    </div>
  )
}
