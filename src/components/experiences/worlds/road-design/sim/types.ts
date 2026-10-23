/** All geometry is metres in a right-handed, Y-up coordinate system. */
export interface Vec3 { x: number; y: number; z: number }
export type Turn = 'left' | 'straight' | 'right'
export interface Interval { start: number; end: number }
export interface Lane {
  id: string
  points: Vec3[]
  length: number
  speedLimit: number
  level: number
  width: number
  kind: 'main' | 'ramp' | 'connector' | 'urban'
  next: string[]
  left?: string
  right?: string
  solid?: Interval[]
  entry?: string
  exit?: string
  stopLine?: number
  cumulative?: number[]
  /** A lane ending in a merge has a physical end; it is never teleported downstream. */
  merge?: boolean
}
export interface Carriageway {
  id: string
  points: Vec3[]
  laneCount: number
  laneWidth: number
  speedLimit: number
  level: number
  bridge: boolean
  kind?: 'main' | 'ramp' | 'urban'
  shoulder?: number
  superelevation?: number
}
export interface Movement {
  id: string
  name: string
  from: string
  to: string
  turn: Turn
  lanes: string[]
  weight?: number
  priority?: number
  signalGroup?: string
}
export interface SchematicMovement {
  id: string
  name: string
  from: string
  to: string
  turn: Turn
  points: Vec3[]
  level?: number
  signalGroup?: string
}
export interface WeavingSection { id: string; points: Vec3[]; width: number; lanes?: string[] }
export interface SignalPhase { id: string; groups: string[]; green: number; yellow?: number; allRed?: number }
export interface ControlSpec {
  kind: 'free' | 'yield' | 'signal'
  phases?: SignalPhase[]
  majorApproaches?: string[]
}
export interface Network {
  id: string
  lanes: Lane[]
  movements: Movement[]
  carriageways: Carriageway[]
  schematicMovements: SchematicMovement[]
  weaving: WeavingSection[]
  control: ControlSpec
}
export interface DesignSpec {
  id: string
  name: string
  nameEn: string
  chapter: number
  description: string
  defaultDemand: number
  camera: { position: Vec3; target: Vec3; fov?: number }
  build: () => Network
}
export interface IDMParameters { v0: number; T: number; s0: number; a: number; b: number }
export interface LaneChange {
  fromLaneId: string
  toLaneId: string
  startedAt: number
  duration: number
  direction: 'left' | 'right'
  /** Offset aligns longitudinal coordinates of adjacent lane centre lines. */
  fromRoute?: string[]
  fromRouteIndex?: number
  fromS: number
  toS: number
}
export interface Vehicle {
  id: number
  laneId: string
  s: number
  v: number
  a: number
  length: number
  width: number
  heavy: boolean
  parameters: IDMParameters
  movementId: string
  intendedMovementId?: string
  route: string[]
  routeIndex: number
  bornAt: number
  enteredAt: number
  freeFlowTime: number
  distance: number
  stoppedTime: number
  stops: number
  laneChanges: number
  laneChange?: LaneChange
  waitingSince?: number
  admitted?: boolean
  permissiveWaiting?: boolean
  lastLaneChangeAt: number
}
export interface SimulationMetrics {
  throughput: number
  throughputByMovement: Record<string, number>
  averageDelay: number
  averageSpeed: number
  vehicles: number
  outsideQueue: number
  /** Longest measured stopped-queue extent across tagged upstream entry lanes, metres. */
  queueByApproach: Record<string, number>
  averageStops: number
  laneChangesPerKm: number
  completed: number
  missedExits: number
}
export type ConflictType = 'crossing' | 'merge' | 'diverge'
export interface ConflictPoint {
  id: string
  type: ConflictType
  position: Vec3
  movements: [string, string]
  separatedBySignal: boolean
}
