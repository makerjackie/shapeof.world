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
  /** Explicit local signal gate; several groups allow a waiting-bay entry in both phases. */
  signalGroups?: string[]
  controlPoint?: string
  protectedTurn?: boolean
  /** The turn at this connector, which can differ from a multi-junction O-D turn. */
  turn?: Turn
  waitingArea?: boolean
  circulating?: boolean
  roundaboutEntry?: boolean
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
  oneWay?: boolean
  medianWidth?: number
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
  roundabout?: boolean
}
/** Axis-aligned core detector rectangle, in world metres; excludes the long leads. */
export interface MeasurementArea { minX: number; maxX: number; minZ: number; maxZ: number }
/** Assumed origin-destination arrivals, veh/h; this is scenario input, not observed traffic. */
export interface DemandOD { movementId: string; vehiclesPerHour: number }
export interface TerrainGrid { originX: number; originZ: number; step: number; width: number; height: number; values: number[]; sourceElevation?: number }
export interface Network {
  id: string
  lanes: Lane[]
  movements: Movement[]
  carriageways: Carriageway[]
  schematicMovements: SchematicMovement[]
  weaving: WeavingSection[]
  control: ControlSpec
  defaultOD?: DemandOD[]
  terrain?: TerrainGrid
  /** Optional override for irregular / real-world junctions. Otherwise derived from connector and ramp geometry. */
  measurementArea?: MeasurementArea
  urbanJunctions?: { id: string; position: Vec3; arms: { direction: 'north' | 'east' | 'south' | 'west'; halfWidth: number; reach?: number }[]; cornerRadius?: number; layout?: 'junction' | 'roundabout'; islandRadius?: number }[]
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
  admittedControlPoint?: string
  permissiveWaiting?: boolean
  lastLaneChangeAt: number
  corePassage?: { enteredAt: number; elapsed: number; freeFlowTime: number; distance: number; stopsAtEntry: number; laneChangesAtEntry: number; exitedAt?: number }
}
export interface SimulationMetrics {
  /** Requested arrivals summed across the network's distinct approaches, veh/h. */
  demand: number
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
