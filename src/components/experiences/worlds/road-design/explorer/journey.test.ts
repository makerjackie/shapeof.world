import {expect,it} from 'vitest'
import {DESIGNS} from '../designs'
import {buildExploreRoutes} from './routes'
import {buildJourney,LEFT_GROUPS,signatureRoute} from './journey'
import {explanationPins} from './explanations'
import {projectToLane} from '../sim/geometry'

it('groups every design exactly once and selects a real left turn',()=>{
 expect(LEFT_GROUPS.flatMap(g=>g.ids).sort()).toEqual(DESIGNS.map(d=>d.id).sort())
 for(const d of DESIGNS){
  const n=d.build(),r=signatureRoute(buildExploreRoutes(n,[]),d.id);expect(r.movement.turn,d.id).toBe('left')
  const j=buildJourney(n,r,explanationPins(n,r))
  expect(j.steps.length,d.id).toBeGreaterThanOrEqual(3);expect(j.steps.length,d.id).toBeLessThanOrEqual(5)
  expect(j.steps.flatMap(s=>s.groups.flatMap(g=>g.items))).toHaveLength(j.crossings.length)
  if(d.id==='roundabout'){
   const turn=j.steps.find(s=>s.title==='沿环岛转向')!
   for(const lane of n.lanes.filter(l=>l.circulating&&r.laneIds.includes(l.id))){const s=projectToLane(r.path,lane.points[Math.floor(lane.points.length/2)]);expect(s).toBeGreaterThanOrEqual(turn.start);expect(s).toBeLessThanOrEqual(turn.end)}
  }
 }
})
it('summarises repeated stack ramps without removing physical profile events',()=>{
 const n=DESIGNS.find(d=>d.id==='stack')!.build(),r=signatureRoute(buildExploreRoutes(n,[]),n.id),j=buildJourney(n,r,[])
 const step=j.steps.find(s=>s.crossings.filter(c=>!c.main).length>=2)!
 expect(step.title).toContain('2 条匝道')
 expect(step.title).toContain('东西主线')
 expect(step.groups).toHaveLength(1)
 expect(step.groups[0].items.length).toBeGreaterThanOrEqual(4)
})
it('names Huangjuewan crossings from the imported named roads and their connections',()=>{
 const n=DESIGNS.find(d=>d.id==='huangjuewan')!.build()
 for(const r of buildExploreRoutes(n,[])){
  const j=buildJourney(n,r,[])
  for(const c of j.crossings){expect(c.name).toMatch(/包茂高速|峡江路|渝航大道/);expect(c.title).not.toMatch(/另一条匝道|东西主线|南北主线/)}
 }
})
for(const id of ['cloverleaf','stack','crossroads-signal','crossroads-channelized','continuous-flow','ddi','diamond','trumpet'])it(`${id}: partitions every route and preserves all anchors and distance`,()=>{
 const n=DESIGNS.find(d=>d.id===id)!.build()
 for(const r of buildExploreRoutes(n,[])){
  const pins=explanationPins(n,r),j=buildJourney(n,r,pins)
  expect(j.steps.length,r.movement.id).toBeGreaterThanOrEqual(3);expect(j.steps.length,r.movement.id).toBeLessThanOrEqual(5)
  expect(j.steps[0].start).toBe(0);expect(j.steps.at(-1)!.end).toBe(r.path.length)
  expect(j.steps.reduce((s,p)=>s+p.end-p.start,0)).toBeCloseTo(r.path.length,5)
  expect(j.steps.every(s=>s.end>s.start),r.movement.id).toBe(true)
  expect(j.steps.flatMap(s=>s.pins)).toHaveLength(pins.length)
  expect(j.steps.flatMap(s=>s.crossings)).toHaveLength(j.crossings.length)
  expect(j.heights.every(p=>Number.isFinite(p.h)&&p.h>=0)).toBe(true)
 }
})
it('teaches the real pocket, waiting area and protected turn before the channelized exit',()=>{
 const n=DESIGNS.find(d=>d.id==='crossroads-channelized')!.build(),r=signatureRoute(buildExploreRoutes(n,[]),n.id),j=buildJourney(n,r,[])
 const waiting=n.lanes.find(l=>l.waitingArea&&r.laneIds.includes(l.id))!
 const s=projectToLane(r.path,waiting.points[Math.floor(waiting.points.length/2)])
 expect(j.steps[1].title).toContain('专用车道')
 expect(j.steps.find(step=>s>=step.start&&s<step.end)!.title).toContain('待转区')
 expect(j.steps[3].title).toContain('左转绿灯')
 expect(j.steps.at(-1)!.title).toBe('汇入出口方向')
})
it('shows crossover before the main left turn, and the DDI left-side ramp',()=>{
 for(const id of ['continuous-flow','ddi']){
  const n=DESIGNS.find(d=>d.id===id)!.build(),r=signatureRoute(buildExploreRoutes(n,[]),n.id),j=buildJourney(n,r,[])
  const crossing=j.steps.findIndex(s=>/提前穿过对向|道路另一侧/.test(s.title))
  const turning=j.steps.findIndex(s=>/主路口信号左转|左侧驶入高速/.test(s.title))
  expect(crossing).toBeGreaterThan(0);expect(turning).toBeGreaterThan(crossing)
  expect(j.steps[crossing].end).toBeLessThanOrEqual(j.steps[turning].start)
 }
})
it('does not repeat the trumpet loop instruction on its straight ramp tail',()=>{
 const n=DESIGNS.find(d=>d.id==='trumpet')!.build(),r=signatureRoute(buildExploreRoutes(n,[]),n.id),j=buildJourney(n,r,[])
 expect(j.steps.filter(s=>s.title.includes('270°'))).toHaveLength(1)
 expect(j.steps.at(-2)!.title).toMatch(/沿匝道/)
 expect(j.steps.at(-1)!.title).toBe('汇入出口方向')
})
it('reads both grade separations of the north cloverleaf, not at-grade conflicts',()=>{
 const n=DESIGNS.find(d=>d.id==='cloverleaf')!.build(),r=signatureRoute(buildExploreRoutes(n,[]),n.id),j=buildJourney(n,r,explanationPins(n,r))
 expect(j.crossings.map(c=>c.title)).toEqual(['从下方穿过 东西主线','从上方跨过 南北主线'])
 expect(j.crossings.every(c=>Math.abs(c.position.y-c.other.y)>7)).toBe(true)
 console.log(j.steps.map(s=>({title:s.title,start:s.start,end:s.end,crossings:s.crossings.map(c=>c.title)})))
})
it('signal crossroads has no grade-separated crossings',()=>{
 const n=DESIGNS.find(d=>d.id==='crossroads-signal')!.build(),r=signatureRoute(buildExploreRoutes(n,[]),n.id)
 expect(buildJourney(n,r,[]).crossings).toEqual([])
})
it('describes unsignalised surface left turns without inventing a ramp',()=>{
 for(const id of ['t-junction','crossroads-yield']){
  const n=DESIGNS.find(d=>d.id===id)!.build(),r=signatureRoute(buildExploreRoutes(n,[]),n.id)
  const j=buildJourney(n,r,[])
  expect(j.steps.some(s=>s.title==='让行后左转')).toBe(true)
  expect(j.steps.some(s=>s.title.includes('匝道'))).toBe(false)
 }
})
