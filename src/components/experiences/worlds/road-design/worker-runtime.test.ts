import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkerTrafficRuntime } from './scene/worker-runtime'
import type { RenderPacket } from './scene/frame-packet'
import type { Network, SimulationMetrics } from './sim/types'

class FakeWorker {
  static last:FakeWorker
  onmessage:((event:MessageEvent)=>void)|null=null
  onerror:((event:ErrorEvent)=>void)|null=null
  messages:{type:string;seconds?:number;value?:number;recycle?:RenderPacket}[]=[]
  terminated=false
  constructor(){FakeWorker.last=this}
  postMessage(message:FakeWorker['messages'][number],transfer:Transferable[]=[]){this.messages.push(structuredClone(message,{transfer}))}
  terminate(){this.terminated=true}
  send(data:unknown){this.onmessage?.({data} as MessageEvent)}
}
const metrics:SimulationMetrics={demand:600,throughput:600,throughputByMovement:{},averageDelay:8,averageSpeed:12,vehicles:1,outsideQueue:0,queueByApproach:{},averageStops:1,laneChangesPerKm:0,completed:20,missedExits:0}
const packet=(time=240):RenderPacket=>({time,cars:new Float32Array(14),carCount:1,trails:{start:new Float32Array(3),end:new Float32Array(3),directionA:new Float32Array(3),directionB:new Float32Array(3),times:new Float32Array(2),properties:new Float32Array(4)},segments:1,exposureCounts:new Uint32Array(451),metrics:{...metrics},demandMultiplier:1,stepMs:.3,warmupMs:120,pressure:null})
const ready=async()=>{
  vi.stubGlobal('Worker',FakeWorker)
  const runtime=new WorkerTrafficRuntime('t-junction'),worker=FakeWorker.last
  worker.send({type:'ready',network:{id:'t-junction',defaultOD:[{movementId:'x',vehiclesPerHour:600}]} as Network,conflicts:[],lamps:[],geometry:{},roof:new Float32Array(1),lighting:null,packet:packet()})
  await runtime.ready;return {runtime,worker}
}
afterEach(()=>vi.unstubAllGlobals())
describe('worker transport and control semantics',()=>{
  it('maintains 30 Hz poses despite alternating RAF intervals and conserves model time',async()=>{
    const {runtime,worker}=await ready()
    let total=0,time=240
    for(let i=0;i<120;i++){
      const delta=i%2?.0167:.0166
      total+=delta;const count=worker.messages.length
      runtime.advance(delta)
      if(worker.messages.length>count){time+=worker.messages.at(-1)!.seconds!;worker.send({type:'frame',packet:packet(time)})}
    }
    const sent=worker.messages.filter(m=>m.type==='advance')
    expect(sent).toHaveLength(Math.floor(total*30))
    expect(sent.reduce((sum,m)=>sum+m.seconds!,0)+runtime.pendingSimSeconds).toBeCloseTo(total,12)
    runtime.dispose()
  })
  it('keeps simulation time pending while a packet is in flight, without blocking the caller',async()=>{
    const {runtime,worker}=await ready()
    runtime.advance(1/60);runtime.advance(1/60)
    expect(worker.messages.filter(m=>m.type==='advance')).toHaveLength(1)
    runtime.advance(.5)
    expect(worker.messages.filter(m=>m.type==='advance')).toHaveLength(1)
    worker.send({type:'frame',packet:packet(240+1/30)})
    runtime.advance(0)
    const sent=worker.messages.filter(m=>m.type==='advance')
    expect(sent).toHaveLength(2);expect(sent.reduce((sum,m)=>sum+m.seconds!,0)).toBeCloseTo(.5+1/30,12)
    runtime.dispose();expect(worker.terminated).toBe(true)
  })
  it('returns the superseded transfer buffers while retaining the displayed frame',async()=>{
    const {runtime,worker}=await ready(),old=runtime.frame
    runtime.advance(1/30);worker.send({type:'frame',packet:packet(241)})
    const current=runtime.frame
    runtime.advance(1/30)
    expect(old.cars.byteLength).toBe(0)
    expect(current.cars.byteLength).toBe(56)
    expect(worker.messages.at(-1)?.recycle?.time).toBe(240)
    runtime.dispose()
  })
  it('updates demand while paused and exposes pressure controls immediately',async()=>{
    const {runtime,worker}=await ready()
    runtime.simulation.setDemandMultiplier(2.5)
    expect(runtime.simulation.refreshMetrics().demand).toBe(1500)
    runtime.startPressure();expect(runtime.pressure?.status).toBe('running')
    runtime.stopPressure();expect(runtime.pressure?.status).toBe('stopped')
    expect(worker.messages.at(-1)?.type).toBe('stop-pressure')
    runtime.dispose()
  })
  it('freezes the displayed frame even when an outstanding worker result arrives',async()=>{
    const {runtime,worker}=await ready()
    runtime.advance(1/30);runtime.setFrozen(true)
    worker.send({type:'frame',packet:packet(240.3)})
    expect(runtime.simulation.time).toBe(240)
    runtime.setFrozen(false);expect(runtime.simulation.time).toBe(240.3)
    runtime.dispose()
  })
  it('does not let an old advance overwrite a newly started pressure run',async()=>{
    const {runtime,worker}=await ready()
    runtime.advance(1/30);runtime.startPressure()
    worker.send({type:'frame',epoch:0,packet:packet(241)})
    expect(runtime.simulation.time).toBe(240)
    expect(runtime.pressure?.status).toBe('running')
    runtime.advance(16)
    expect(runtime.pendingSimSeconds).toBe(0)
    const next=packet(240);next.pressure=runtime.pressure
    worker.send({type:'frame',epoch:1,packet:next})
    expect(runtime.pressure?.status).toBe('running')
    runtime.dispose()
  })
  it('keeps a pressure stop visible if the warmup response was already in flight',async()=>{
    const {runtime,worker}=await ready()
    runtime.startPressure();const run=structuredClone(runtime.pressure)
    runtime.stopPressure();const next=packet(240);next.pressure=run
    worker.send({type:'frame',epoch:1,packet:next})
    expect(runtime.pressure?.status).toBe('stopped')
    runtime.dispose()
  })
  it('surfaces an initialization failure to the world error boundary',async()=>{
    vi.stubGlobal('Worker',FakeWorker)
    const runtime=new WorkerTrafficRuntime('unknown')
    FakeWorker.last.send({type:'error',message:'Unknown road design'})
    await expect(runtime.ready).rejects.toThrow('Unknown road design')
    runtime.dispose()
  })
})
