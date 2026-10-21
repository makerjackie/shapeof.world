import { describe, expect, it } from 'vitest'
import { DoubleSide, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import { BRIDGE, FLIGHT_DISTANCE, FLIGHT_SECONDS, PANORAMA_START, sampleFlight } from './flight'
import { GATE, HOUSES, MOUNTAINS, PAVILION } from './songxi-layout'
import { DOWNSTREAM } from './songxi-landmarks'
import { createMountainGeometry } from './songxi-mountains'

describe('Songxi continuous flight', () => {
  it('clears the bridge and real gatehouse passage', () => {
    let bridge=0,gate=0
    for(let t=0;t<=FLIGHT_SECONDS;t+=.01){const p=sampleFlight(t).position
      if(Math.abs(p.z-BRIDGE.z)<BRIDGE.depth/2+.1){bridge++;expect(Math.abs(p.x)).toBeLessThan(8);expect(p.y).toBeLessThan(BRIDGE.height*Math.sqrt(1-(p.x/BRIDGE.halfOpening)**2)-1)}
      if(Math.abs(p.z-GATE.z)<GATE.halfDepth){gate++;expect(Math.abs(p.x-GATE.x)).toBeLessThan(GATE.halfWidth-1);expect(p.y).toBeGreaterThan(GATE.floor+1);expect(p.y).toBeLessThan(GATE.ceiling-1)}
    }
    expect(bridge).toBeGreaterThan(10);expect(gate).toBeGreaterThan(10)
  })
  it('passes through the open pavilion and covered bridge with a safety margin',()=>{
    let pavilion=0,covered=0
    for(let t=0;t<=FLIGHT_SECONDS;t+=.01){const p=sampleFlight(t).position
      if(Math.abs(p.z-PAVILION.z)<PAVILION.halfDepth){
        pavilion++;expect(Math.abs(p.x-PAVILION.x)).toBeLessThan(PAVILION.halfOpening-.5)
        expect(p.y).toBeGreaterThan(PAVILION.floor+.9);expect(p.y).toBeLessThan(PAVILION.ceiling-1)
      }
      const b=DOWNSTREAM.bridge
      if(Math.abs(p.z-b.z)<b.halfDepth){covered++;expect(Math.abs(p.x-b.x)).toBeLessThan(b.halfOpening-1);expect(p.y).toBeLessThan(b.underside-1)}
      for(const building of [DOWNSTREAM.teahouse,DOWNSTREAM.shrine]){
        // Both are shore-side: the flight stays outside their closest roof edge.
        if(Math.abs(p.z-building.z)<building.halfDepth)expect(p.x).toBeLessThan(building.x-8.3-1)
      }
    }
    expect(pavilion).toBeGreaterThan(10);expect(covered).toBeGreaterThan(10)
  })
  it('does not enter house walls along the interpolated route',()=>{
    for(let t=0;t<=FLIGHT_SECONDS;t+=.025){const p=sampleFlight(t).position
      for(const[x,z,s]of HOUSES){const inside=Math.abs(p.x-x)<4*s+.65&&Math.abs(p.z-z)<3.3*s+.65&&p.y<2.2+11*s;expect(inside,`house ${x},${z} at ${t}`).toBe(false)}
    }
  })
  it('clears the rendered mountain geometry, including its near side',()=>{
    const material=new MeshBasicMaterial({side:DoubleSide}),ray=new Raycaster(),down=new Vector3(0,-1,0)
    const meshes=MOUNTAINS.map(m=>new Mesh(createMountainGeometry(m),material))
    try {for(let t=0;t<=FLIGHT_SECONDS;t+=.075){const p=sampleFlight(t).position
      MOUNTAINS.forEach(([x,z,w,h,d],i)=>{
        if(Math.abs(p.x-x)>w*1.5||Math.abs(p.z-z)>d*1.5)return
        // Check the flight and a small safety envelope against actual triangles.
        for(const dx of [-1.2,0,1.2])for(const dz of [-1.2,0,1.2]){
          ray.set(new Vector3(p.x+dx,h+20,p.z+dz),down)
          const hit=ray.intersectObject(meshes[i],false)[0]
          if(hit)expect(p.y-hit.point.y,`mountain ${i}, time ${t}`).toBeGreaterThan(1.2)
        }
      })
    }} finally {meshes.forEach(m=>m.geometry.dispose());material.dispose()}
  })
  it('keeps a steady horizon and continuous translation through the return arc',()=>{
    expect(FLIGHT_SECONDS + 1.8).toBeLessThan(27)
    expect(FLIGHT_DISTANCE).toBeGreaterThan(470)
    let previousYawRate:number|undefined,previousPitchRate:number|undefined,previousSpeed:number|undefined
    for(let i=1;i<FLIGHT_SECONDS*120;i++){
      const a=sampleFlight((i-1)/120),b=sampleFlight(i/120)
      const u=a.target.clone().sub(a.position).normalize(),v=b.target.clone().sub(b.position).normalize()
      const yawDelta=Math.atan2(v.x,-v.z)-Math.atan2(u.x,-u.z)
      const yawRate=Math.atan2(Math.sin(yawDelta),Math.cos(yawDelta))*120
      const pitchRate=(Math.asin(v.y)-Math.asin(u.y))*120
      expect(b.bank).toBe(0)
      expect(Math.abs(yawRate)).toBeLessThan(.67)
      expect(Math.abs(pitchRate)).toBeLessThan(.10)
      if(previousYawRate!==undefined)expect(Math.abs(yawRate-previousYawRate)*120).toBeLessThan(.60)
      if(previousPitchRate!==undefined)expect(Math.abs(pitchRate-previousPitchRate)*120).toBeLessThan(.22)
      const speed=b.position.distanceTo(a.position)*120
      expect(speed).toBeGreaterThan(1.9)
      expect(speed).toBeLessThan(36)
      if(i/120<9.5)expect(speed).toBeGreaterThan(34.7)
      if(previousSpeed!==undefined)expect(Math.abs(speed-previousSpeed)*120).toBeLessThan(7)
      previousYawRate=yawRate;previousPitchRate=pitchRate;previousSpeed=speed
      // Rise in space while keeping the gimbal on the scenery, not empty sky.
      expect(Math.asin(v.y)).toBeLessThan(.10)
    }
    expect(sampleFlight(2.5).position.y).toBeLessThan(2)
  })
  it('takes one short right turn and leaves at least four seconds to read the panorama',()=>{
    const direction=(t:number)=>{const s=sampleFlight(t);return s.target.sub(s.position).normalize()}
    let swept=0
    for(let t=9.2;t<PANORAMA_START;t+=1/120){
      const a=direction(t),b=direction(t+1/120)
      const delta=Math.atan2(b.x,-b.z)-Math.atan2(a.x,-a.z)
      const angle=Math.atan2(Math.sin(delta),Math.cos(delta))
      expect(angle).toBeGreaterThanOrEqual(-1e-8)
      swept+=angle
    }
    expect(swept).toBeGreaterThan(2.5)
    expect(swept).toBeLessThan(Math.PI)
    expect(FLIGHT_SECONDS-PANORAMA_START).toBeGreaterThanOrEqual(4)
    const finalDirection=direction(FLIGHT_SECONDS)
    for(let t=PANORAMA_START;t<=FLIGHT_SECONDS;t+=.05){
      expect(direction(t).angleTo(finalDirection)).toBeLessThan(.001)
      const a=sampleFlight(t),b=sampleFlight(t+.01)
      expect(b.position.distanceTo(a.position)/.01).toBeLessThan(2.2)
    }
  })
  it('ends looking back across both bridges and the village in either orientation',()=>{
    const end=sampleFlight(FLIGHT_SECONDS)
    expect(end.position.y).toBeGreaterThan(30)
    expect(end.position.y).toBeLessThan(60)
    expect(end.target.z).toBeGreaterThan(end.position.z)
    expect(end.target.y).toBeLessThan(end.position.y)
    for(const aspect of [16/9,9/16]){
      const camera=new PerspectiveCamera(aspect<1?96:65,aspect,.075,2300)
      camera.position.copy(end.position);camera.lookAt(end.target);camera.updateMatrixWorld()
      for(const p of [new Vector3(0,4,22),new Vector3(GATE.x,5,GATE.z),new Vector3(DOWNSTREAM.bridge.x,11,DOWNSTREAM.bridge.z),new Vector3(PAVILION.x,5,PAVILION.z)]){
        const screen=p.project(camera)
        expect(Math.abs(screen.x)).toBeLessThan(.85)
        expect(Math.abs(screen.y)).toBeLessThan(.92)
        expect(screen.z).toBeGreaterThan(-1);expect(screen.z).toBeLessThan(1)
      }
    }
  })
  it('is deterministic for seeking and has the same stable view on mobile',()=>{
    expect(sampleFlight(-1).position).toEqual(sampleFlight(0).position)
    expect(sampleFlight(NaN).position).toEqual(sampleFlight(0).position)
    expect(sampleFlight(100).position).toEqual(sampleFlight(FLIGHT_SECONDS).position)
    expect(sampleFlight(13,.5625,true)).toEqual(sampleFlight(13,16/9,false))
  })
})
