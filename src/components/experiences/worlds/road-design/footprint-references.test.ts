import { describe, expect, it } from 'vitest'
import references from './data/footprint-references.json'
import { DESIGNS } from './designs'
import { measureGeometry } from './sim/geometry-costs'
import { LAND_METHOD } from './sim/land-footprint'
const area=(id:string)=>measureGeometry(DESIGNS.find(d=>d.id===id)!.build()).landArea/10000

describe('same-method OSM reference intervals',()=>{
 it('retains three individually identified, reproducible examples of each requested type',()=>{
  expect(references.method).toEqual(LAND_METHOD)
  expect(references.sites).toHaveLength(18)
  for(const [type,range] of Object.entries(references.intervals)){
   const sites=references.sites.filter(site=>site.type===type)
   expect(sites.length).toBeGreaterThanOrEqual(3)
   expect(range.minHa).toBe(Math.min(...sites.map(site=>site.area))/10000)
   expect(range.maxHa).toBe(Math.max(...sites.map(site=>site.area))/10000)
   for(const site of sites){
    expect(site.rampWayIds.length).toBeGreaterThan(0)
    expect(Object.keys(site.mainWaySegments).length).toBeGreaterThan(0)
    expect(site.query).toContain('out body geom')
    expect(site.area).toBe(site.roadArea+site.enclosedArea)
    expect(Math.abs(site.area-site.gridSensitivity.oneMetre)/site.area).toBeLessThan(.03)
   }
  }
 })
 for(const id of ['cloverleaf','stack','turbine','trumpet','parclo'] as const)it(`${id} lies within its measured sample interval`,()=>{
  const range=references.intervals[id]
  expect(area(id)).toBeGreaterThanOrEqual(range.minHa)
  expect(area(id)).toBeLessThanOrEqual(range.maxHa)
 })
 it('documents the wider motorway/2-lane arterial diamond above the sample interval',()=>{
  // Model 15.5048 ha, sample maximum about 12.41 ha; no claim that three
  // sampled diamonds exhaust the population. Do not tune ramps to the sample.
  const excess=area('diamond')/references.intervals.diamond.maxHa-1
  expect(excess).toBeGreaterThan(.24);expect(excess).toBeLessThan(.26)
 })
 it('checks only supported conditional area comparisons, not a universal type ranking',()=>{
  // MassDOT: full cloverleaf typically needs more ROW than a diamond.
  // WSDOT 940-3: semidirectional more area than directional, same basis here.
  expect(area('cloverleaf')).toBeGreaterThan(area('diamond'))
  expect(area('turbine')).toBeGreaterThan(area('stack'))
  // DDI and Huangjuewan have no three-site reference sample in this study;
  // the six requested type intervals cannot legitimately validate them.
  expect(area('ddi')).toBeGreaterThan(0);expect(area('huangjuewan')).toBeGreaterThan(0)
 })
})
