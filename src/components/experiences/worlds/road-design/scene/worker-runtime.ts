import type { ConflictPoint, Network, SimulationMetrics } from '../sim/types'
import { packetBuffers, type RenderPacket } from './frame-packet'
import type { TrafficRuntime } from './runtime'
import type { Lamp } from './lights-data'
import {primeContextLayout} from './context-layout'
import {primeCityLayout} from './city-layout'
import type { PackedRoadGeometry } from './road-geometry'
import type {PackedBlueprint} from './blueprint-data'

/** Main-thread view of a worker-owned model. No model integration or warmup runs
 * here. One request in flight prevents message queues from growing unbounded. */
export class WorkerTrafficRuntime {
  readonly worker: Worker
  readonly ready: Promise<void>
  lighting:ImageBitmap|null=null
  lamps!:Lamp[]
  geometry!:PackedRoadGeometry
  blueprint!:PackedBlueprint
  roof!:Float32Array
  network!: Network
  conflicts: ConflictPoint[] = []
  frame!: RenderPacket
  revision = 0
  frameMs = 0
  stepMs = 0
  warmupMs = 0
  pressure: TrafficRuntime['pressure'] = null
  private busy = true
  private pendingSeconds = 0
  private sinceRequest = 0
  private recycle?: RenderPacket
  private disposed = false
  private epoch = 0
  private warming = false
  private pressureStopped = false
  private frozen=false
  private deferred?:RenderPacket
  simulation = {
    time:0, vehicles:{length:0}, metrics:{} as SimulationMetrics, demandMultiplier:1,
    setDemandMultiplier:(value:number)=>{this.simulation.demandMultiplier=value;this.simulation.metrics.demand=(this.network.defaultOD??[]).reduce((sum,row)=>sum+row.vehiclesPerHour,0)*value;this.worker.postMessage({type:'demand',value})},
    refreshMetrics:()=>this.simulation.metrics,
  }
  constructor(id:string,demand=1,onFailure?:(error:Error)=>void) {
    this.worker=new Worker(new URL('./traffic.worker.ts',import.meta.url),{type:'module'})
    this.ready=new Promise((resolve,reject)=>{
      const fail=(error:Error)=>{this.busy=true;reject(error);onFailure?.(error)}
      this.worker.onerror=event=>fail(new Error(event.message))
      this.worker.onmessage=event=>{
        if(this.disposed)return
        const message=event.data
        if(message.type==='error'){fail(new Error(message.message));return}
        if(message.type==='ready'){this.network=message.network;this.conflicts=message.conflicts;this.lamps=message.lamps;this.geometry=message.geometry;this.blueprint=message.blueprint;this.roof=message.roof;this.lighting=message.lighting;if(message.context)primeContextLayout(this.network,message.context);if(message.city)primeCityLayout(this.network,message.city)}
        if(message.packet&&(message.epoch??0)!==this.epoch)return
        if(message.packet){this.receive(message.packet);this.busy=false;this.warming=false;resolve()}
      }
    })
    this.worker.postMessage({type:'init',id,demand})
  }
  private receive(packet:RenderPacket) {
    if(this.frame&&this.frozen){this.deferred=packet;return}
    if(this.frame)this.recycle=this.frame
    this.frame=packet;this.revision++
    this.simulation.vehicles.length=packet.carCount
    this.simulation.time=packet.time;this.simulation.metrics=packet.metrics;this.simulation.demandMultiplier=packet.demandMultiplier
    if(this.pressureStopped&&packet.pressure)packet.pressure.status='stopped'
    this.stepMs=packet.stepMs;this.warmupMs=packet.warmupMs;this.pressure=packet.pressure
  }
  advance(seconds:number) {
    if(this.warming)return
    this.pendingSeconds+=seconds
    this.sinceRequest+=seconds
    if(this.busy || this.sinceRequest<1/30)return
    // Retain the fractional interval: 16.6/16.7 ms RAF jitter must not turn a
    // 30 Hz pose stream into one update every three display frames (20 Hz).
    const recycle=this.recycle;this.recycle=undefined;this.busy=true;this.sinceRequest%=1/30
    // Keep every fixed step. If CPU is busy, the wall-clock catch-up happens in
    // subsequent worker packets, never as an unlimited main-thread while loop.
    const elapsed=Math.min(this.pendingSeconds,1.6);this.pendingSeconds-=elapsed
    this.worker.postMessage({type:'advance',seconds:elapsed,recycle,epoch:this.epoch},recycle?packetBuffers(recycle):[])
  }
  get pendingSimSeconds(){return this.pendingSeconds}
  setFrozen(value:boolean){this.frozen=value;if(!value&&this.deferred){const next=this.deferred;this.deferred=undefined;this.receive(next)}}
  startPressure(to=2.5) {this.pendingSeconds=0;this.sinceRequest=0;this.warming=true;this.pressureStopped=false;this.epoch++;this.deferred=undefined;this.pressure={startedAt:this.simulation.time,from:.25,to,duration:1200,lastSample:this.simulation.time,status:'running',samples:[]};this.worker.postMessage({type:'pressure',to,epoch:this.epoch});this.busy=true}
  stopPressure(){this.pressureStopped=true;if(this.pressure)this.pressure.status='stopped';this.worker.postMessage({type:'stop-pressure'})}
  dispose(){this.disposed=true;this.worker.terminate();this.lighting?.close()}
}
