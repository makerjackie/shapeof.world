import { describe, expect, it } from 'vitest'
import { DESIGNS } from '../designs'
import { calculateConflicts } from '../sim/conflicts'
import { buildExploreRoutes } from './routes'
import { recordDemo, replayAt } from './replay'

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
