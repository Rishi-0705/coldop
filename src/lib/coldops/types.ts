/**
 * Shared types between client and server for ColdOps.
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type RoomStatus = 'GHOST_LOAD' | 'CONSOLIDATION' | 'OPTIMIZED' | 'ACTIVE' | 'IDLE'
export type ViewKey = 'command' | 'map' | 'workorders' | 'notifications' | 'analytics' | 'schedule' | 'wms' | 'settings'

export interface Savings {
  tonightRM: number
  thisWeekRM: number
  thisMonthRM: number
  co2Tonnes: number
  ghostLoadHours: number
}

export interface GhostLoadDetection {
  roomId: string
  roomCode: string
  roomName: string
  actualKW: number
  expectedIdleKW: number
  durationHours: number
  rmWaste: number
  rmPerHour: number
  severity: Severity
  severityScore: number
  rule: string
}

export interface RoomUtilization {
  roomId: string
  roomCode: string
  roomName: string
  zone: string
  targetTemp: number
  capacityPallets: number
  palletCount: number
  utilizationPct: number
  status: RoomStatus
  hasGhostLoad: boolean
}

export interface RoomWithBms extends RoomUtilization {
  id: string
  code: string
  name: string
  floorX: number
  floorY: number
  floorW: number
  floorH: number
  minSafeTemp: number
  maxSafeTemp: number
  maxPowerKW: number
  bms: {
    currentTemp: number
    setpoint: number
    compressorLoad: number
    powerKW: number
    doorOpen: boolean
    status: string
  } | null
}

export interface Notification {
  id: string
  type: string
  severity: Severity
  severityScore: number
  title: string
  message: string
  roomId: string | null
  rmImpact: number
  rmPerHour: number
  durationHours: number
  actionType: string | null
  refId: string | null
  status: 'OPEN' | 'APPROVED' | 'DEFERRED' | 'DISMISSED' | 'RESOLVED'
  channels: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  room?: { code: string; name: string; zone: string } | null
}

export interface WorkOrderMove {
  id: string
  workOrderId: string
  palletId: string
  lotNo: string
  productName: string
  fromRoomCode: string
  fromBayCode: string
  toRoomCode: string
  toBayCode: string
  sequence: number
  fefoRank: number
  allergenOk: boolean
  confirmedAt: string | null
}

export interface WorkOrder {
  id: string
  type: string
  roomId: string | null
  title: string
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  assignedTo: string | null
  totalMoves: number
  completedMoves: number
  estLaborMinutes: number
  rmSavedPerHour: number
  rmSaved: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  room?: { code: string; name: string } | null
  moves?: WorkOrderMove[]
}

export interface ConsolidationMove {
  palletId: string
  lotNo: string
  productName: string
  fromRoomCode: string
  fromBayCode: string
  toRoomCode: string
  toBayCode: string
  sequence: number
  fefoRank: number
  allergenOk: boolean
}

export interface ConsolidationPlan {
  sourceRoomIds: string[]
  sourceRoomCodes: string[]
  destRoomId: string
  destRoomCode: string
  palletCount: number
  estLaborMinutes: number
  energySavingRM: number
  laborCostRM: number
  netBenefitRM: number
  idleWindowHours: number
  moves: ConsolidationMove[]
}

export interface DashboardData {
  savings: Savings
  activeGhosts: GhostLoadDetection[]
  rooms: RoomUtilization[]
  topNotifications: Notification[]
  recentWorkOrders: WorkOrder[]
  config: {
    tnbTariffRM: number
    idleThresholdPct: number
    consolidationThresholdPct: number
  } | null
  kpis: {
    ghostLoadRM: number
    ghostLoadCount: number
    ghostLoadHours: number
    worstOffender: GhostLoadDetection | null
    consolidationCandidateCount: number
  }
}

export interface SetbackStep {
  step: number
  setpoint: number
  atSec: number
  confirmed: boolean
}

export interface ActiveSetback {
  setbackId: string
  roomId: string
  roomCode: string
  startSetpoint: number
  endSetpoint: number
  currentStep: number
  totalSteps: number
  steps: SetbackStep[]
  aborted: boolean
  bms: {
    currentTemp: number
    compressorLoad: number
    powerKW: number
    status: string
  } | null
}

// ===== Analytics types =====

export interface HeatmapRoom {
  roomCode: string
  roomName: string
  zone: string
  hours: { hour: number; kw: number; isGhost: boolean; isProd: boolean }[]
}

export interface SavingsTrendPoint {
  day: string
  rm: number
  co2: number
}

export interface ROI {
  saasMonthlyCost: number
  monthlySavings: number
  roiMonths: number
  annualSavings: number
  annualSaaS: number
  netAnnualBenefit: number
  roiPercent: number
}

export interface TopGhostRoom {
  roomCode: string
  roomName: string
  zone: string
  totalRM: number
  totalHours: number
  eventCount: number
}

export interface EnergyMixItem {
  zone: string
  kw: number
  rooms: number
  ghostRooms: number
}

export interface AnalyticsData {
  heatmap: HeatmapRoom[]
  trend: SavingsTrendPoint[]
  roi: ROI
  topRooms: TopGhostRoom[]
  energyMix: EnergyMixItem[]
  tariff: number
}

export interface MeterTimelinePoint {
  t: string
  iso: string
  kw: number
  idle: number
  isGhost: boolean
  isProd: boolean
}

export interface MeterRoomCurrent {
  code: string
  name: string
  currentKW: number
  idleKW: number
  isGhost: boolean
}

export interface MeterData {
  timeline: MeterTimelinePoint[]
  rooms: MeterRoomCurrent[]
  hours: number
}

export interface SetbackHistoryItem {
  id: string
  roomCode: string | null
  roomName: string | null
  zone: string | null
  type: string
  startSetpoint: number
  endSetpoint: number
  status: string
  reason: string
  currentStep: number
  totalSteps: number
  steps: { step: number; setpoint: number; atSec: number; confirmed: boolean }[]
  startedAt: string | null
  completedAt: string | null
  abortedAt: string | null
  abortReason: string | null
  workOrderId: string | null
  maxPowerKW: number | null
  estRmSaved: number
}

export interface ProductionBatch {
  id: string
  line: string
  batchId: string
  startTime: string
  endTime: string
  shift: string
  active: boolean
}

export interface GhostWindow {
  line: string
  start: string
  end: string
  durationHours: number
}

export interface ProductionScheduleData {
  schedules: ProductionBatch[]
  lines: any[]
  ghostWindows: GhostWindow[]
  now: string
}

// ===== WMS Stock Browser types =====

export interface WmsPallet {
  id: string
  lotNo: string
  productCode: string
  productName: string
  roomCode: string
  roomName: string
  bayCode: string
  quantity: number
  expiryDate: string
  receivedAt: string
  allergenTags: string
  quarantine: boolean
  daysToExpiry: number
  fefoRank: number
  category: string
}

export interface WmsStats {
  total: number
  byCategory: Record<string, number>
  byRoom: Record<string, number>
  expiringSoon: number
  quarantineCount: number
  allergenBreakdown: Record<string, number>
}

export interface WmsFilters {
  rooms: { code: string; name: string; count: number }[]
  categories: string[]
  allergens: string[]
}

export interface WmsData {
  pallets: WmsPallet[]
  stats: WmsStats
  filters: WmsFilters
}

// ===== Settings types =====

export interface AppConfig {
  id: number
  tnbTariffRM: number
  idleThresholdPct: number
  minIdleDurationHours: number
  consolidationThresholdPct: number
  laborCostPerMinuteRM: number
  co2PerKgRM: number
  rampStepSeconds: number
}

export interface BmsInfo {
  adapter: string
  vendor: string
  online: boolean
  roomsConnected: number
}

export interface Role {
  role: string
  description: string
  permissions: string[]
}

export interface SettingsData {
  config: AppConfig
  bms: BmsInfo
  roles: Role[]
}

// ===== Room Detail types =====

export interface RoomDetail {
  room: {
    id: string
    code: string
    name: string
    zone: string
    targetTemp: number
    minSafeTemp: number
    maxSafeTemp: number
    maxPowerKW: number
    capacityPallets: number
    floorX: number
    floorY: number
    floorW: number
    floorH: number
  }
  bms: {
    currentTemp: number
    setpoint: number
    compressorLoad: number
    powerKW: number
    doorOpen: boolean
    status: string
  } | null
  pallets: WmsPallet[]
  recentReadings: { timestamp: string; powerKW: number; isGhostLoad: boolean; isProductionActive: boolean }[]
  stats: {
    utilizationPct: number
    palletCount: number
    capacityPallets: number
    currentPowerKW: number
    idleBaselineKW: number
    isGhostLoad: boolean
    allergensPresent: string[]
    earliestExpiry: string | null
    latestExpiry: string | null
  }
}
