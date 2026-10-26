import { describe, expect, it } from 'vitest'
import { DESIGNS } from '../designs'
import { calculateConflicts } from '../sim/conflicts'
import { buildExploreRoutes } from './routes'
import { recordDemo, replayAt } from './replay'
import { explanationPins, DESIGN_SUMMARY, DESIGN_SUMMARY_EN, COMPARISONS } from './explanations'

describe('route explorer',()=>{
  for(const design of DESIGNS) it(`${design.id}: every O-D can be selected and measured`,()=>{
    const network=design.build(),routes=buildExploreRoutes(network,calculateConflicts(network))
    expect(routes.length).toBeGreaterThan(0)
    for(const m of network.movements)expect(routes.some(r=>r.movement.from===m.from&&r.movement.to===m.to&&r.movement.turn===m.turn)).toBe(true)
    for(const route of routes){expect(route.path.points.length).toBeGreaterThan(2);expect(route.reading.length+1e-6).toBeGreaterThanOrEqual(route.reading.direct);expect(Number.isFinite(route.reading.length)).toBe(true);expect(route.reading.detour).toBeGreaterThanOrEqual(0)}
    const selected=routes.find(r=>r.movement.from==='north'&&r.movement.turn==='left')??[...routes].sort((a,b)=>b.reading.detour-a.reading.detour)[0]
    const replay=recordDemo(network,selected.movement.id)
    expect(replay.complete,JSON.stringify({design:design.id,route:selected.movement.id,last:replay.samples.at(-1)})).toBe(true)
    expect(replayAt(replay,replay.duration).status).toBe('done')
    if(design.id==='cloverleaf'){
      expect(selected.reading.conflicts.filter(c=>c.type==='crossing')).toHaveLength(0)
      expect(selected.reading.conflicts.filter(c=>c.type==='merge')).toHaveLength(3)
      expect(selected.reading.conflicts.filter(c=>c.type==='diverge')).toHaveLength(3)
      expect(selected.reading.radius).toBeCloseTo(60,0)
      expect(selected.reading.weaving).toHaveLength(2)
      expect(replay.samples.some(s=>s.laneId==='loop-1')).toBe(true)
      // A lateral transfer never adds an entire backwards pass through a weave.
      for(let i=1;i<selected.path.points.length;i++)expect(Math.hypot(selected.path.points[i].x-selected.path.points[i-1].x,selected.path.points[i].z-selected.path.points[i-1].z)).toBeLessThan(30)
    }
    if(design.id==='crossroads-signal'){expect(replay.samples.some(s=>s.status==='red')).toBe(true);expect(replay.samples.some(s=>s.status==='yield')).toBe(true)}
    for(const r of routes){if(r===selected)continue;const other=recordDemo(network,r.movement.id);expect(other.complete,`${design.id}:${r.movement.id}`).toBe(true)}
    console.log(design.id,selected.movement.id,Math.round(selected.reading.length),Math.round(selected.reading.detour),replay.duration.toFixed(1),[...new Set(replay.samples.map(s=>s.status))])
  },60000)
})

it('offers 3–5 anchored explanations and neighbouring tradeoffs for all 14 designs',()=>{
 for(const design of DESIGNS){
  const network=design.build(),routes=buildExploreRoutes(network,calculateConflicts(network)),pins=explanationPins(network,undefined)
  expect(pins.length,design.id).toBeGreaterThanOrEqual(3);expect(pins.length,design.id).toBeLessThanOrEqual(5)
  expect(DESIGN_SUMMARY[design.id],design.id).toBeTruthy();expect(DESIGN_SUMMARY_EN[design.id],design.id).toBeTruthy();expect(COMPARISONS[design.id]?.length,design.id).toBeGreaterThan(0)
  for(const p of pins){expect(p.titleEn,`${design.id}:${p.id}`).toBeTruthy();expect(p.bodyEn,`${design.id}:${p.id}`).toBeTruthy();expect([p.position.x,p.position.y,p.position.z].every(Number.isFinite)).toBe(true);expect(p.laneIds.every(id=>network.lanes.some(l=>l.id===id))).toBe(true)}
  if(design.id==='trumpet'){
   const loop=pins[0].position
   // The loop lane also contains a long straight tail: the label belongs on
   // its circular part, not at the midpoint of that combined lane.
   expect(Math.hypot(loop.x+80,loop.z+80)).toBeCloseTo(66.125,0)
   expect(network.lanes.find(l=>l.id===pins[3].laneIds[0])?.merge).toBe(true)
  }
  if(design.id==='crossroads-channelized')expect(pins[0].laneIds[0]).toMatch(/-left-pocket$/)
  if(design.id==='ddi')expect(pins[1].laneIds[0]).toMatch(/-er$/)
  if(design.id==='roundabout')expect(pins[2].laneIds[0]).toMatch(/^round-exit-/)
  for(const route of routes)expect(explanationPins(network,route).filter(p=>p.laneIds.some(id=>route.laneIds.includes(id))).length,`${design.id}:${route.movement.id}`).toBeGreaterThan(0)
 }
})

it('keeps unrelated nearby conflicts out of a selected route',()=>{
  const network=DESIGNS.find(d=>d.id==='crossroads-signal')!.build()
  const conflicts=calculateConflicts(network)
  const route=buildExploreRoutes(network,conflicts).find(r=>r.movement.from==='north'&&r.movement.turn==='left')!
  expect(route.reading.conflicts).toHaveLength(6)
  const p=route.path.points[0]
  const unrelated={id:'near-another-lane',position:{...p,x:p.x+5},type:'crossing' as const,movements:['unrelated-a','unrelated-b'] as [string,string],separatedBySignal:false}
  const measured=buildExploreRoutes(network,[...conflicts,unrelated]).find(r=>r.movement.id===route.movement.id)!
  expect(measured.reading.conflicts.map(c=>c.id)).not.toContain(unrelated.id)
})
