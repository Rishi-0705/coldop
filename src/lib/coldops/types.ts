/**
 * Shared types between client and server for ColdOps.
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type RoomStatus = 'GHOST_LOAD' | 'CONSOLIDATION' | 'OPTIMIZED' | 'ACTIVE' | 'IDLE'
export type ViewKey = 'command' | 'map' | 'workorders' | 'notifications'

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
