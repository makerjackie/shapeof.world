import { describe, expect, it } from 'vitest'
import { journeyPositionAt, missionTimeAt, TIME_KEYS, JOURNEY_DURATION } from './journey'
import { sampleMission, MISSION_EVENTS, T_TLI_START, T_TLI_END, T_LOI_START, T_LOI_END, T_CIRC, T_STABLE, T_COAST_END, R_E, R_M, sampleTrajectory, KM_PER_UNIT } from './moon-voyage/mission'
const distance=(a:number[],b:number[])=>Math.hypot(...a.map((x,i)=>x-b[i]))
describe('reversible lunar journey',()=>{
  it('preserves all anchors and is strictly monotone with a reversible clock',()=>{
    for(const [x,t] of TIME_KEYS) expect(missionTimeAt(x)).toBeCloseTo(t,6)
    for(let x=0;x<JOURNEY_DURATION;x+=.1){
      expect(missionTimeAt(x+.05)).toBeGreaterThan(missionTimeAt(x))
      expect(journeyPositionAt(missionTimeAt(x))).toBeCloseTo(x,8)
    }
  })
  it('does not teleport at burns, orbit insertion or the conic blend',()=>{
    for(const t of [...MISSION_EVENTS.map(e=>e.t),T_COAST_END-4800,T_COAST_END+4800]){
      const a=sampleMission(t-.01),b=sampleMission(t+.01)
      expect(distance(a.pos,b.pos),`position at ${t}`).toBeLessThan(.25)
      expect(distance(a.vel,b.vel),`velocity at ${t}`).toBeLessThan(.02)
    }
  })
  it('keeps the full sampled journey above both surfaces with finite speeds',()=>{
    for(let x=0;x<=100;x+=.025){
      const s=sampleMission(missionTimeAt(x))
      expect(s.distEarthKm).toBeGreaterThanOrEqual(R_E-0.01)
      expect(s.distMoonKm).toBeGreaterThan(R_M)
      expect(s.speedKms).toBeGreaterThanOrEqual(0)
      expect(s.speedKms).toBeLessThan(12)
    }
  })
  it('shows third-stage ascent thrust, coasting and lunar braking in the right order',()=>{
    expect(sampleMission(600).burn).toBe('tli')
    expect(sampleMission(T_TLI_START+10).burn).toBe('tli')
    expect(sampleMission(T_TLI_END+100).burn).toBe('none')
    expect(sampleMission(T_LOI_START+10).burn).toBe('loi')
    expect(sampleMission(T_LOI_END+10).burn).toBe('none')
    expect(sampleMission(T_CIRC+10).burn).toBe('puff')
    expect(sampleMission(T_STABLE+100).altKm).toBeCloseTo(110,5)
  })
  it('draws the same trajectory that the ship samples, independent of seek history',()=>{
    const {points,times}=sampleTrajectory()
    for(let i=0;i<times.length;i+=37){
      const s=sampleMission(times[i])
      expect(distance(s.pos,Array.from(points.slice(i*3,i*3+3)).map(x=>x*KM_PER_UNIT))).toBeLessThan(.1)
    }
  })
})

import { journeyCamera } from './journey-camera'
it('keeps camera outside both bodies through all transitions at every supported aspect',()=>{
  for(const aspect of [1440/900,950/900,390/397,390/844]) for(let x=0;x<=100;x+=.05){
    const s=sampleMission(missionTimeAt(x)), camera=journeyCamera(s,x,aspect)
    expect(camera.position.length()*KM_PER_UNIT).toBeGreaterThan(R_E)
    expect(distance(camera.position.toArray().map(v=>v*KM_PER_UNIT),s.moonPos)).toBeGreaterThan(R_M)
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true)
  }
})

it('follows the spacecraft independently of the journey camera in free exploration',()=>{
  for(const position of [28,50,75,95]) {
    const sample=sampleMission(missionTimeAt(position))
    const follow=journeyCamera(sample,position,1,'craft',false)
    const story=journeyCamera(sample,position,1,'journey',false)
    expect(distance(follow.target.toArray().map(v=>v*KM_PER_UNIT),sample.pos)).toBeLessThan(1e-6)
    expect(follow.position.distanceTo(story.position)).toBeGreaterThan(1)
  }
})
