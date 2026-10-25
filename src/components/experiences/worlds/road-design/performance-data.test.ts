import { describe, expect, it } from 'vitest'
import sourceRoads from './data/huangjuewan-roads.json'
import sourceTerrain from './data/huangjuewan-terrain.json'
import capacity from './data/capacity.json'
import displayCapacity from './data/capacity-display.json'
import catalogue from './data/presentation.json'
import { decodeHuangjuewan } from './designs/packed-data'
import packed from './data/huangjuewan-runtime.json'
const {terrainData:HUANGJUEWAN_GRID,nodes:HUANGJUEWAN_POINTS,roadData:HUANGJUEWAN_RUNTIME}=decodeHuangjuewan(packed)
import { DESIGNS } from './designs'
import { measureGeometry } from './sim/geometry-costs'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { TrafficRuntime } from './scene/runtime'
import { CAR_STRIDE, packFrame, packetBuffers } from './scene/frame-packet'
import {buildBlueprintData,packBlueprint,unpackBlueprint,blueprintBuffers} from './scene/blueprint-data'

describe('performance data preserves the physical model',()=>{
  it('decodes every road coordinate and terrain sample without changing source precision',()=>{
    expect(HUANGJUEWAN_POINTS).toEqual(sourceRoads.nodes.map(p=>({x:p[1],y:p[2],z:p[3]})))
    expect(HUANGJUEWAN_GRID.values).toEqual(sourceTerrain.values)
    expect(HUANGJUEWAN_RUNTIME.roads).toEqual(sourceRoads.roads)
    expect(HUANGJUEWAN_RUNTIME.metadata).toEqual(sourceRoads.metadata)
  })
  it('keeps the lightweight catalogue and capacity table tied to the audited inputs',()=>{
    expect(catalogue).toHaveLength(DESIGNS.length)
    for(const design of DESIGNS){
      const row=catalogue.find(row=>row.id===design.id)!,network=design.build()
      expect(row.name).toBe(design.name);expect(row.description).toBe(design.description)
      expect(row.cost).toEqual(measureGeometry(network))
      expect(row.conflicts).toEqual(summarizeConflicts(calculateConflicts(network)))
      const measured=capacity.designs[design.id as keyof typeof capacity.designs]
      expect(displayCapacity.designs[design.id as keyof typeof displayCapacity.designs]).toEqual({vehiclesPerHour:measured.vehiclesPerHour,turningVehiclesPerHour:measured.turningVehiclesPerHour,status:measured.status})
    }
  })
  it('transfers drafting vertices, colours and indices without loss',()=>{
    for(const id of ['roundabout','huangjuewan']){
      const built=buildBlueprintData(DESIGNS.find(d=>d.id===id)!.build()),packed=packBlueprint(built)
      const expected=structuredClone(packed)
      const moved=structuredClone(packed,{transfer:blueprintBuffers(packed)}),restored=unpackBlueprint(moved)
      expect(restored.labels).toEqual(expected.labels)
      const actual=[...restored.lines,...restored.surfaces],original=[...expected.lines,...expected.surfaces]
      actual.forEach((geometry,i)=>{
        for(const [name,attribute]of Object.entries(original[i].attributes)){
          expect(geometry.getAttribute(name).array).toEqual(attribute.array)
          expect(geometry.getAttribute(name).itemSize).toBe(attribute.itemSize)
        }
        expect(geometry.index?.array??null).toEqual(original[i].index?.array??null)
        geometry.dispose()
      })
      for(const geometry of [...built.lines,...built.surfaces])geometry.dispose()
    }
  })
  it('packs every visible car and recycles transfer buffers without mutating simulation',()=>{
    const runtime=new TrafficRuntime(DESIGNS.find(d=>d.id==='t-junction')!.build())
    const time=runtime.simulation.time,first=packFrame(runtime,15)
    expect(first.carCount).toBe(runtime.simulation.vehicles.length)
    expect(first.segments).toBeGreaterThan(0)
    expect(first.exposureCounts[450]).toBe(first.segments)
    for(let i=1;i<451;i++)expect(first.exposureCounts[i]).toBeGreaterThanOrEqual(first.exposureCounts[i-1])
    const ids=new Set<number>()
    runtime.simulation.vehicles.forEach((car,i)=>{
      const pose=runtime.simulation.sampleVehicle(car),k=i*CAR_STRIDE
      ids.add(first.cars[k]);expect(first.cars[k]).toBe(car.id)
      expect(first.cars[k+1]).toBeCloseTo(pose.position.x,3)
      expect(first.cars[k+2]).toBeCloseTo(pose.position.y,3)
      expect(first.cars[k+3]).toBeCloseTo(pose.position.z,3)
    })
    expect(ids.size).toBe(first.carCount)
    expect(runtime.simulation.time).toBe(time)
    const second=packFrame(runtime,6,first)
    expect(second.cars.buffer).toBe(first.cars.buffer)
    expect(second.trails.start.buffer).toBe(first.trails.start.buffer)
    expect(second.segments).toBeLessThanOrEqual(first.segments)
    const cloned=structuredClone(second,{transfer:packetBuffers(second)})
    expect(second.cars.byteLength).toBe(0)
    expect(cloned.cars.length).toBeGreaterThan(0)
    expect(cloned.metrics).toEqual(runtime.simulation.metrics)
  })
})
