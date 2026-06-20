'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Scan, AlertTriangle, CheckCircle2, Loader2, X, Thermometer,
  Package, Zap, ArrowRight, Check, RotateCcw, List, Image as ImageIcon,
  Upload, Trash2, ChevronRight, BadgeHelp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { SectionHeader } from './shared'
import { severityColor, formatRM } from '@/lib/coldops/ui'

interface ScanResult {
  id: string
  timestamp: string
  vlm: {
    productName: string
    estimatedCount: number
    category: string
    visibleText: string
    temperatureReading: number | null
    confidence: string
  }
  matchedProduct: any
  isUnknown: boolean
  temperature: number | null
  count: number
  issues: any[]
  severityScore: number
  severity: string
  roomCode: string | null
  recommendation: any
}

export function CameraScan() {
  const [mode, setMode] = useState<'single' | 'batch'>('batch')
  const [cameraActive, setCameraActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null)
  const [manualTemp, setManualTemp] = useState('')
  const [roomCode, setRoomCode] = useState('CR-01')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Start camera
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play()
      }
      setCameraActive(true)
      toast.success('Camera connected')
    } catch (e: any) {
      toast.error(`Camera access denied: ${e.message}`)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()) }
  }, [stream])

  // Capture frame + scan
  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setScanning(true)

    // Capture frame to canvas
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

    try {
      const res = await fetch('/api/vlm-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          manualTemp: manualTemp || undefined,
          roomCode,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setCurrentResult(data)
        if (mode === 'batch') {
          setScanResults(prev => [data, ...prev])
          toast.success(`Scan ${data.severity}: ${data.vlm.productName || 'Unknown'}`)
        } else {
          toast.success(`Scan complete: ${data.severity}`)
        }
      }
    } catch (e: any) {
      toast.error(`Scan failed: ${e.message}`)
    } finally {
      setScanning(false)
    }
  }

  // Upload image file instead of camera
  const uploadImage = async (file: File) => {
    setScanning(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/vlm-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: reader.result,
            manualTemp: manualTemp || undefined,
            roomCode,
          }),
        })
        const data = await res.json()
        if (data.error) {
          toast.error(data.error)
        } else {
          setCurrentResult(data)
          if (mode === 'batch') {
            setScanResults(prev => [data, ...prev])
          }
          toast.success(`Scan complete: ${data.severity}`)
        }
      } catch (e: any) {
        toast.error(`Upload scan failed: ${e.message}`)
      } finally {
        setScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const clearBatch = () => {
    setScanResults([])
    setCurrentResult(null)
  }

  // Sort batch results by severity
  const sortedBatch = [...scanResults].sort((a, b) => b.severityScore - a.severityScore)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Camera Scan — Detect → Recommend → Approve → Execute
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Real webcam + VLM AI identifies products, counts amounts, and detects temperature/spec anomalies. System ranks issues by severity and generates actionable recommendations.
        </p>
      </div>

      {/* Mode selector + controls */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <Button
                variant={mode === 'batch' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setMode('batch')}
              >
                <List className="h-3.5 w-3.5" /> Batch Mode
              </Button>
              <Button
                variant={mode === 'single' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setMode('single')}
              >
                <Scan className="h-3.5 w-3.5" /> Single Scan
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground">Room:</Label>
              <select
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                className="h-7 text-xs border rounded px-2 bg-card"
              >
                {['CR-01','CR-02','CR-03','CR-04','CR-05','CR-06','CR-07','CR-08'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground">Temp (°C):</Label>
              <Input
                type="number"
                step="0.1"
                value={manualTemp}
                onChange={e => setManualTemp(e.target.value)}
                placeholder="Manual"
                className="h-7 w-20 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {!cameraActive ? (
                <Button size="sm" className="h-7 text-xs gap-1.5" onClick={startCamera}>
                  <Camera className="h-3.5 w-3.5" /> Start Camera
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={stopCamera}>
                  <X className="h-3.5 w-3.5" /> Stop Camera
                </Button>
              )}
              <Button size="sm" className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={captureAndScan} disabled={!cameraActive || scanning}>
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scan className="h-3.5 w-3.5" />}
                {scanning ? 'Scanning...' : 'Capture & Scan'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Camera feed */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <SectionHeader icon={Camera} title="Live Camera Feed" description="Real webcam stream — capture a frame to send to VLM for product identification" />
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden">
              {cameraActive ? (
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-zinc-600 mx-auto mb-2" />
                    <div className="text-sm text-zinc-400">Camera not started</div>
                    <Button size="sm" className="mt-3" onClick={startCamera}>
                      <Camera className="h-3.5 w-3.5 mr-1.5" /> Start Camera
                    </Button>
                  </div>
                </div>
              )}
              {scanning && (
                <div className="absolute inset-0 bg-black/50 grid place-items-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
                    <div className="text-xs text-white">VLM analyzing image...</div>
                  </div>
                </div>
              )}
              {/* Scan overlay */}
              {cameraActive && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 text-white text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE · {roomCode}
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {/* Upload alternative */}
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground">Or upload an image:</Label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/60 text-xs hover:bg-muted/30 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" /> Upload Image
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Current scan result */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <SectionHeader icon={Scan} title="Detection Result" description="VLM product identification + system recommendation ranked by severity" />
          </CardHeader>
          <CardContent>
            {!currentResult ? (
              <div className="grid place-items-center h-[300px]">
                <div className="text-center">
                  <Scan className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">No scan yet. Capture a frame or upload an image.</div>
                </div>
              </div>
            ) : (
              <ScanResultView result={currentResult} onApprove={() => {
                toast.success(`Recommendation approved — ${currentResult.recommendation.actionType} dispatched`)
                // In a real system, this would trigger the work order or setback
              }} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Batch results */}
      {mode === 'batch' && scanResults.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SectionHeader icon={List} title={`Batch Scan Results — ${scanResults.length} items scanned`} description="Sorted by severity score (highest first) — tackle the most critical issues first" />
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearBatch}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {sortedBatch.map((result, i) => (
                    <BatchScanRow key={result.id} result={result} rank={i + 1} onClick={() => setCurrentResult(result)} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// SCAN RESULT VIEW — shows VLM detection + recommendation
// ============================================================================

function ScanResultView({ result, onApprove }: { result: ScanResult; onApprove: () => void }) {
  const c = severityColor(result.severity as any)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* VLM detection */}
      <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">VLM Detection (Vision AI)</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-[10px] text-muted-foreground">Product</div>
            <div className="font-medium">{result.vlm.productName || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Category</div>
            <div className="font-medium">{result.vlm.category}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Count</div>
            <div className="font-medium">{result.vlm.estimatedCount} units</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Confidence</div>
            <Badge variant="outline" className="text-[9px]">{result.vlm.confidence}</Badge>
          </div>
        </div>
        {result.vlm.visibleText && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            <span className="font-medium">Visible text:</span> {result.vlm.visibleText.slice(0, 100)}
          </div>
        )}
      </div>

      {/* Matched product spec */}
      {result.matchedProduct ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">Matched Product Spec</div>
          <div className="text-xs font-medium">{result.matchedProduct.productName}</div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
            <div>
              <div className="text-muted-foreground">Safe temp</div>
              <div className="font-mono">{result.matchedProduct.minTemp}°C - {result.matchedProduct.maxTemp}°C</div>
            </div>
            <div>
              <div className="text-muted-foreground">Shelf life</div>
              <div className="font-mono">{result.matchedProduct.shelfLifeDays} days</div>
            </div>
            <div>
              <div className="text-muted-foreground">Allergens</div>
              <div className="font-mono">{result.matchedProduct.allergenTags || 'None'}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Unknown Product</div>
          <div className="text-xs text-amber-700">Not in catalog — manual verification needed</div>
        </div>
      )}

      {/* Temperature reading */}
      {result.temperature !== null && !isNaN(result.temperature) && (
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Temperature Reading</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{result.temperature}°C</span>
            {result.matchedProduct && (
              <div className="text-[10px]">
                <div className="text-muted-foreground">Safe range: {result.matchedProduct.minTemp}°C - {result.matchedProduct.maxTemp}°C</div>
                <div className={`font-medium ${result.temperature > result.matchedProduct.maxTemp ? 'text-red-600' : result.temperature < result.matchedProduct.minTemp ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {result.temperature > result.matchedProduct.maxTemp ? 'TOO HIGH' : result.temperature < result.matchedProduct.minTemp ? 'TOO LOW' : 'IN RANGE'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issues detected */}
      {result.issues.length > 0 && (
        <div className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`h-3.5 w-3.5 ${c.text}`} />
            <span className={`text-[10px] font-semibold ${c.text} uppercase tracking-wide`}>{result.issues.length} Issue(s) Detected</span>
            <Badge variant="outline" className={`text-[9px] ${c.text} border-current ml-auto`}>{result.severity} · Score {result.severityScore}</Badge>
          </div>
          <div className="space-y-1.5">
            {result.issues.map((issue, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[9px] ${severityColor(issue.severity).text} border-current`}>{issue.severity}</Badge>
                  <span className="font-medium">{issue.type.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 ml-7">{issue.message}</div>
                <div className="text-[10px] text-foreground mt-0.5 ml-7">→ {issue.recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary recommendation + approve */}
      <div className="rounded-lg border-2 border-primary/30 p-3 bg-primary/5">
        <div className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">System Recommendation</div>
        <div className="text-sm font-medium">{result.recommendation.recommendation}</div>
        {result.recommendation.actionType !== 'NONE' && (
          <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={onApprove}>
            <Check className="h-3.5 w-3.5" /> Approve & Execute ({result.recommendation.actionType.replace(/_/g, ' ')})
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// BATCH SCAN ROW — one row per scan in batch mode
// ============================================================================

function BatchScanRow({ result, rank, onClick }: { result: ScanResult; rank: number; onClick: () => void }) {
  const c = severityColor(result.severity as any)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className={`flex items-center gap-3 rounded-lg border ${c.border} ${c.bg} p-2.5 cursor-pointer hover:shadow-sm transition-shadow`}
      onClick={onClick}
    >
      <span className={`grid place-items-center h-7 w-7 rounded-full text-[10px] font-bold flex-shrink-0 ${
        rank === 1 ? 'bg-red-500 text-white' : rank === 2 ? 'bg-orange-500 text-white' : rank === 3 ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-medium text-xs truncate">{result.vlm.productName || 'Unknown Product'}</span>
          <Badge variant="outline" className={`text-[9px] ${c.text} border-current`}>{result.severity}</Badge>
          {result.issues.map((issue, i) => (
            <Badge key={i} variant="outline" className="text-[8px]">{issue.type.replace(/_/g, ' ')}</Badge>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {result.count} units · {result.temperature !== null ? `${result.temperature}°C` : 'no temp'} · {result.roomCode || 'no room'}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-xs font-bold ${c.text}`}>{result.severityScore}</div>
        <div className="text-[9px] text-muted-foreground">score</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </motion.div>
  )
}
