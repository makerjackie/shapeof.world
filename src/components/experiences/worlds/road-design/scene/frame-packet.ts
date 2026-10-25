import type { SimulationMetrics } from '../sim/types'
import type { TrafficRuntime } from './runtime'

export const CAR_STRIDE = 14
export const TRAIL_WIDTHS = { start: 3, end: 3, directionA: 3, directionB: 3, times: 2, properties: 4 } as const
export type TrailArrays = { [K in keyof typeof TRAIL_WIDTHS]: Float32Array }
export interface RenderPacket {
  time: number
  cars: Float32Array
  carCount: number
  trails: TrailArrays
  exposureCounts: Uint32Array
  segments: number
  metrics: SimulationMetrics
  demandMultiplier: number
  stepMs: number
  warmupMs: number
  pressure: TrafficRuntime['pressure']
}
/** Only visual poses cross the worker boundary; routes, IDM/MOBIL and queues stay
 * with the authoritative fixed-step model. Transfer buffers are recycled. */
export function packFrame(runtime: TrafficRuntime, shutter: number, reusable?: RenderPacket): RenderPacket {
  const sim = runtime.simulation, count = sim.vehicles.length
  const cars = reusable && reusable.cars.length >= count * CAR_STRIDE ? reusable.cars : new Float32Array(Math.max(1024, 2 ** Math.ceil(Math.log2(Math.max(1, count)))) * CAR_STRIDE)
  for (let i = 0; i < count; i++) {
    const car = sim.vehicles[i], tip = runtime.trails.get(car.id)?.tip
    const pose = tip?.time === sim.time ? tip : sim.sampleVehicle(car), k = i * CAR_STRIDE
    cars[k] = car.id; cars[k+1] = pose.position.x; cars[k+2] = pose.position.y; cars[k+3] = pose.position.z
    cars[k+4] = pose.tangent.x; cars[k+5] = pose.tangent.y; cars[k+6] = pose.tangent.z
    cars[k+7] = car.length; cars[k+8] = car.width; cars[k+9] = +car.heavy; cars[k+10] = car.a
    cars[k+11] = car.laneChange ? car.laneChange.direction === 'left' ? -1 : 1 : 0
    cars[k+12] = car.v; cars[k+13] = 0
  }
  let segments = 0
  const bins=new Uint32Array(450)
  const ageBin=(time:number)=>Math.min(449,Math.max(0,Math.floor((sim.time-time)*30)))
  for (const history of runtime.trails.values()) {
    const samples = history.samples
    for (let i = 0; i < samples.length; i++) {
      const a = samples[i], b = samples[i+1] ?? history.tip
      if (b && b.time > a.time && b.time >= sim.time-shutter && (b.position.x-a.position.x)**2+(b.position.z-a.position.z)**2 <= 1225) {segments++;bins[ageBin(b.time)]++}
    }
  }
  const capacity = Math.max(1024, 2 ** Math.ceil(Math.log2(Math.max(1, segments))))
  const trails = reusable && reusable.trails.times.length >= segments*2 ? reusable.trails : Object.fromEntries(Object.entries(TRAIL_WIDTHS).map(([key,width]) => [key,new Float32Array(capacity*width)])) as TrailArrays
  const exposureCounts=new Uint32Array(451)
  for(let i=0;i<450;i++)exposureCounts[i+1]=exposureCounts[i]+bins[i]
  const cursors=exposureCounts.slice(0,450)
  for (const history of runtime.trails.values()) {
    const samples = history.samples
    for (let i = 0; i < samples.length; i++) {
      const a = samples[i], b = samples[i+1] ?? history.tip
      if (!b || b.time <= a.time || b.time < sim.time-shutter || (b.position.x-a.position.x)**2+(b.position.z-a.position.z)**2 > 1225) continue
      const cursor=cursors[ageBin(b.time)]++
      const k=cursor*3, j=cursor*2, q=cursor*4
      trails.start[k]=a.position.x; trails.start[k+1]=a.position.y; trails.start[k+2]=a.position.z
      trails.end[k]=b.position.x; trails.end[k+1]=b.position.y; trails.end[k+2]=b.position.z
      trails.directionA[k]=a.tangent.x; trails.directionA[k+1]=a.tangent.y; trails.directionA[k+2]=a.tangent.z
      trails.directionB[k]=b.tangent.x; trails.directionB[k+1]=b.tangent.y; trails.directionB[k+2]=b.tangent.z
      trails.times[j]=a.time; trails.times[j+1]=b.time
      trails.properties[q]=+a.braking; trails.properties[q+1]=+b.braking; trails.properties[q+2]=b.length; trails.properties[q+3]=history.turn
    }
  }
  return {time:sim.time,cars,carCount:count,trails,exposureCounts,segments,metrics:sim.metrics,demandMultiplier:sim.demandMultiplier,stepMs:runtime.stepMs,warmupMs:runtime.warmupMs,pressure:runtime.pressure}
}
export function packetBuffers(packet: RenderPacket): ArrayBuffer[] {
  return [packet.cars.buffer,packet.exposureCounts.buffer,...Object.values(packet.trails).map(array=>array.buffer)] as ArrayBuffer[]
}
