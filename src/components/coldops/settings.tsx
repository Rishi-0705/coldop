'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Settings as SettingsIcon, Server, Shield, Users, DollarSign, Zap,
  Loader2, RefreshCw, Save, Check, AlertTriangle, ThermometerSun, Clock,
  Bell, Smartphone, Mail, MessageSquare
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import type { SettingsData, AppConfig } from '@/lib/coldops/types'
import { formatRM, timeAgo } from '@/lib/coldops/ui'
import { BmsAdapterPanel } from './bms-adapters'

export function SettingsView() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<AppConfig>>({})
  const [dirty, setDirty] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/settings')
      const d = await r.json()
      setData(d)
      setForm(d.config)
      setDirty(false)
    } catch (e) {
      console.error('Settings fetch failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const update = (field: keyof AppConfig, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) && value !== '') return
    setForm(prev => ({ ...prev, [field]: value === '' ? undefined : num }))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload: any = {}
      for (const [k, v] of Object.entries(form)) {
        if (v !== undefined && v !== null && !isNaN(v as number)) payload[k] = v
      }
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (d.config) {
        setData(prev => prev ? { ...prev, config: d.config } : prev)
        setForm(d.config)
        setDirty(false)
        toast.success('Settings saved — detection rules updated')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (data) {
      setForm(data.config)
      setDirty(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="grid place-items-center h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground">Loading settings…</div>
        </div>
      </div>
    )
  }

  const { config, bms, roles } = data

  return (
    <div className="space-y-4 max-w-[1000px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            System Settings
          </h2>
          <p className="text-sm text-muted-foreground">Detection thresholds · BMS integration · Role-based access</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="outline" size="sm" onClick={reset}>
              Reset
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tariff & Cost Settings */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Tariff & Cost Configuration
          </CardTitle>
          <CardDescription className="text-xs">These values drive all RM calculations across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingField
              label="TNB Commercial Tariff"
              unit="RM/kWh"
              value={form.tnbTariffRM}
              onChange={v => update('tnbTariffRM', v)}
              defaultValue={config.tnbTariffRM}
              hint="Malaysia commercial electricity rate"
            />
            <SettingField
              label="Labor Cost"
              unit="RM/min"
              value={form.laborCostPerMinuteRM}
              onChange={v => update('laborCostPerMinuteRM', v)}
              defaultValue={config.laborCostPerMinuteRM}
              hint="Warehouse staff cost for consolidation moves"
            />
            <SettingField
              label="CO₂ Grid Factor"
              unit="kg/kWh"
              value={form.co2PerKgRM}
              onChange={v => update('co2PerKgRM', v)}
              defaultValue={config.co2PerKgRM}
              hint="TNB grid carbon intensity"
            />
          </div>
        </CardContent>
      </Card>

      {/* Detection Rules */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-500" />
            Ghost Load Detection Rules
          </CardTitle>
          <CardDescription className="text-xs">Deterministic thresholds — explainable, not ML-based</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingField
              label="Idle Threshold"
              unit="% above baseline"
              value={form.idleThresholdPct !== undefined ? form.idleThresholdPct * 100 : undefined}
              onChange={v => update('idleThresholdPct', v ? (parseFloat(v) / 100).toString() : '')}
              defaultValue={config.idleThresholdPct * 100}
              hint="Power must exceed idle baseline by this % to flag ghost load"
              isPercent
            />
            <SettingField
              label="Minimum Duration"
              unit="hours"
              value={form.minIdleDurationHours}
              onChange={v => update('minIdleDurationHours', v)}
              defaultValue={config.minIdleDurationHours}
              hint="Idle period must exceed this to trigger alert"
            />
            <SettingField
              label="Consolidation Threshold"
              unit="% utilization"
              value={form.consolidationThresholdPct !== undefined ? form.consolidationThresholdPct * 100 : undefined}
              onChange={v => update('consolidationThresholdPct', v ? (parseFloat(v) / 100).toString() : '')}
              defaultValue={config.consolidationThresholdPct * 100}
              hint="Rooms below this % are consolidation candidates"
              isPercent
            />
          </div>
          <Separator className="my-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingField
              label="Setback Ramp Step"
              unit="seconds"
              value={form.rampStepSeconds}
              onChange={v => update('rampStepSeconds', v)}
              defaultValue={config.rampStepSeconds}
              hint="Time between setpoint steps (4s = demo, 900s = 15min production)"
            />
          </div>
        </CardContent>
      </Card>

      {/* BMS Integration */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            BMS Integration
          </CardTitle>
          <CardDescription className="text-xs">Building Management System adapter status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBox label="Adapter Type" value={bms.adapter} icon={Server} tone="primary" />
            <InfoBox label="Vendor" value={bms.vendor} icon={Server} tone="default" />
            <InfoBox label="Status" value={bms.online ? 'Online' : 'Offline'} icon={bms.online ? Check : AlertTriangle} tone={bms.online ? 'emerald' : 'red'} />
            <InfoBox label="Rooms Connected" value={String(bms.roomsConnected)} icon={ThermometerSun} tone="default" />
          </div>
          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">
            <p className="mb-1"><b>Supported adapters (production-ready):</b></p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">REST API (current)</Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">BACnet/IP (Siemens, Honeywell)</Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Modbus TCP (legacy PLCs)</Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">MQTT (IoT gateways)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles & Permissions */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Role-Based Access Control
          </CardTitle>
          <CardDescription className="text-xs">JWT-secured · 4 roles · permission-scoped</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map(r => (
              <div key={r.role} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm capitalize">{r.role}</span>
                  <Badge variant="outline" className="text-[10px]">{r.permissions.length} perms</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mb-2">{r.description}</div>
                <div className="flex flex-wrap gap-1">
                  {r.permissions.map(p => (
                    <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current impact summary */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-sm mb-1">Configuration Active</div>
              <div className="text-xs text-muted-foreground">
                At {formatRM(form.tnbTariffRM ?? config.tnbTariffRM)}/kWh tariff with {(form.idleThresholdPct ?? config.idleThresholdPct) * 100}% idle threshold,
                the system detects ghost loads ≥ {form.minIdleDurationHours ?? config.minIdleDurationHours}h and flags rooms below
                {' '}{(form.consolidationThresholdPct ?? config.consolidationThresholdPct) * 100}% utilization for consolidation.
                Savings accumulate at ~{formatRM(((form.tnbTariffRM ?? config.tnbTariffRM)) * 18)}/hr per resolved ghost load.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BMS Protocol Adapters */}
      <BmsAdapterPanel />

      {/* Notification Dispatch Log */}
      <DispatchLogPanel />
    </div>
  )
}

// ============================================================================
// NOTIFICATION DISPATCH LOG
// ============================================================================

function DispatchLogPanel() {
  const [data, setData] = useState<{ log: any[]; stats: any } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dispatch-log')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error('dispatch log fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  const channelIcon = (ch: string) => {
    switch (ch) {
      case 'SMS': return <Smartphone className="h-3.5 w-3.5 text-sky-500" />
      case 'WHATSAPP': return <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
      case 'EMAIL': return <Mail className="h-3.5 w-3.5 text-amber-500" />
      default: return <Bell className="h-3.5 w-3.5" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'SENT': return 'bg-sky-100 text-sky-700 border-sky-200'
      case 'ACKNOWLEDGED': return 'bg-zinc-100 text-zinc-600 border-zinc-200'
      case 'FAILED': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notification Dispatch Log
            </CardTitle>
            <CardDescription className="text-xs">
              {loading ? 'Loading...' : `${data?.stats.total || 0} dispatches · ${data?.stats.criticalDispatched || 0} critical · SMS/WhatsApp/Email simulation`}
            </CardDescription>
          </div>
          {!loading && data && (
            <div className="flex gap-1.5">
              <Badge variant="outline" className="text-[10px]"><Smartphone className="h-3 w-3 mr-1 text-sky-500" />{data.stats.byChannel.SMS || 0}</Badge>
              <Badge variant="outline" className="text-[10px]"><MessageSquare className="h-3 w-3 mr-1 text-emerald-500" />{data.stats.byChannel.WHATSAPP || 0}</Badge>
              <Badge variant="outline" className="text-[10px]"><Mail className="h-3 w-3 mr-1 text-amber-500" />{data.stats.byChannel.EMAIL || 0}</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid place-items-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.log.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">No dispatches recorded.</div>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-1.5">
              {data.log.map((entry, i) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs rounded-md border border-border/60 p-2.5 hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5">{channelIcon(entry.channel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-medium truncate">{entry.subject}</span>
                      <Badge variant="outline" className={`text-[9px] ${entry.severity === 'CRITICAL' ? 'text-red-700 border-red-300' : entry.severity === 'HIGH' ? 'text-orange-700 border-orange-300' : ''}`}>
                        {entry.severity}
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] ${statusColor(entry.status)}`}>
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{entry.message}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                      → {entry.recipient} ({entry.recipientName}) · {entry.channel} · {timeAgo(entry.sentAt)}
                      {entry.roomCode && ` · ${entry.roomCode}`}
                      {entry.rmImpact > 0 && ` · ${formatRM(entry.rmImpact)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function SettingField({
  label, unit, value, onChange, defaultValue, hint, isPercent
}: {
  label: string
  unit: string
  value: number | undefined
  onChange: (v: string) => void
  defaultValue: number
  hint?: string
  isPercent?: boolean
}) {
  const displayValue = value !== undefined ? (isPercent ? value.toFixed(0) : value) : ''
  const isChanged = value !== undefined && value !== defaultValue
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium flex items-center justify-between">
        <span>{label}</span>
        {isChanged && <span className="text-[9px] text-amber-600 font-normal">modified</span>}
      </Label>
      <div className="relative">
        <Input
          type="number"
          step={isPercent ? '1' : '0.001'}
          value={displayValue}
          onChange={e => onChange(e.target.value)}
          className={`h-8 text-sm pr-16 ${isChanged ? 'border-amber-400 bg-amber-50/30' : ''}`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">{unit}</span>
      </div>
      {hint && <div className="text-[10px] text-muted-foreground leading-tight">{hint}</div>}
    </div>
  )
}

function InfoBox({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: 'primary' | 'emerald' | 'red' | 'default' }) {
  const tones = {
    primary: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    default: { bg: 'bg-muted/50', text: 'text-foreground', border: 'border-border/60' },
  }
  const t = tones[tone]
  return (
    <div className={`rounded-lg border ${t.border} ${t.bg} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3 w-3 ${t.text}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${t.text}`}>{value}</div>
    </div>
  )
}
