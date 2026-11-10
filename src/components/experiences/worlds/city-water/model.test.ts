import {describe, expect, it} from 'vitest'
import {advanceSimulation, createSimulation, DEFAULTS, deliveredDemand, demandPattern, pipeFlow, solveHydraulics, supplyFraction, treatment} from './model'
import {NODES, PIPES, TANK_NODE, pipeResistance} from './network'

describe('city-water hydraulics', () => {
  it('uses the Darcy–Weisbach geometry and reverses flow with head', () => {
    expect(pipeResistance(600,.2) / pipeResistance(300,.2)).toBeCloseTo(2,10)
    expect(pipeResistance(300,.2) / pipeResistance(300,.4)).toBeCloseTo(32,10)
    const [q,dq] = pipeFlow(4,10000)
    expect(q).toBeCloseTo(.02,6)
    expect(pipeFlow(-4,10000)[0]).toBeCloseTo(-q,10)
    expect(dq).toBeGreaterThan(0)
  })
  it('balances every junction including closed-main, leak and fire cases', () => {
    for(const changes of [{}, {leak:.001}, {isolation:true}, {fire:true, pumpSpeed:.7}, {power:false}]) {
      const s=createSimulation(), settings={...DEFAULTS,...changes}, h=solveHydraulics(s,settings)
      expect(h.residual).toBeLessThan(1e-7)
      expect(h.heads.every(Number.isFinite)).toBe(true)
      NODES.forEach((node,j)=>{
        if(node.kind!=='junction')return
        const net=PIPES.reduce((sum,p,i)=>sum+(p.from===j?h.flows[i]:p.to===j?-h.flows[i]:0),0)
        expect(net+h.delivered[j]+(j===8?h.leak:0)).toBeCloseTo(0,6)
      })
      expect(h.pumpFlow-h.towerFlow-h.delivered.reduce((a,b)=>a+b,0)-h.leak).toBeCloseTo(0,6)
    }
  })
  it('a power outage draws from elevated storage, then supply runs out', () => {
    const s=createSimulation(), config={...DEFAULTS,power:false}
    const initial=solveHydraulics(s,config)
    expect(initial.pumpFlow).toBe(0)
    expect(initial.towerFlow).toBeLessThan(0)
    expect(supplyFraction(initial)).toBeGreaterThan(.99)
    advanceSimulation(s,config,6*3600)
    expect(s.tower).toBeLessThan(1e-6)
    expect(supplyFraction(s.hydraulic)).toBeLessThan(.001)
    expect(s.hydraulic.heads.every(Number.isFinite)).toBe(true)
  })
  it('can fill an empty tower without drawing imaginary water out of it', () => {
    const s=createSimulation(); s.tower=0
    const config={...DEFAULTS,pumpSpeed:1.15,automatic:false}
    expect(solveHydraulics(s,config).towerFlow).toBeGreaterThan(0)
    advanceSimulation(s,config,120)
    expect(s.tower).toBeGreaterThan(0)
    expect(s.nodeAge[TANK_NODE]).toBeGreaterThanOrEqual(0)
  })
  it('keeps arbitrary user valve closures and disconnected districts finite', () => {
    for(let seed=0;seed<30;seed++){
      const s=createSimulation(), closedPipes=PIPES.flatMap((_,i)=>i>0&&((i*17+seed*13)%11)<4?[i]:[])
      const h=solveHydraulics(s,{...DEFAULTS,closedPipes,power:seed%3!==0})
      expect(h.heads.every(Number.isFinite)).toBe(true)
      expect(h.residual,JSON.stringify({seed,closedPipes,heads:h.heads,flows:h.flows})).toBeLessThan(1e-7)
      closedPipes.forEach(i=>expect(h.flows[i]).toBe(0))
      NODES.forEach((n,i)=>{if(!h.connected[i])expect(h.delivered[i]).toBe(0)})
    }
  })
  it('conserves all source and storage water over a changing day', () => {
    const s=createSimulation(), initial=s.reservoir+s.clearwell+s.tower
    advanceSimulation(s,DEFAULTS,6*3600)
    advanceSimulation(s,{...DEFAULTS,leak:.001,fire:true},3600)
    advanceSimulation(s,{...DEFAULTS,power:false},3600)
    const final=s.reservoir+s.clearwell+s.tower
    expect(final-initial).toBeCloseTo(s.inflow-s.delivered-s.leaked-s.overflowed,3)
    expect(s.leaked).toBeGreaterThan(0)
    expect(s.hydraulic.residual).toBeLessThan(1e-7)
  })
  it('distinguishes pressure-dependent requested and delivered water', () => {
    expect(deliveredDemand(1,-5)).toBe(0)
    expect(deliveredDemand(1,5)).toBe(.5)
    expect(deliveredDemand(1,30)).toBe(1)
    expect(demandPattern(3.7*3600)).toBeGreaterThan(demandPattern(23*3600))
  })
  it('advects bounded chlorine, ages stagnant water, and backwash restores filter load', () => {
    const s=createSimulation(); s.filterLoad=.8; s.backwash=900
    const before=treatment(s,DEFAULTS).filtered
    advanceSimulation(s,DEFAULTS,900)
    expect(s.filterLoad).toBeLessThan(.02)
    expect(treatment(s,DEFAULTS).filtered).toBeLessThan(before)
    expect(s.nodeChlorine.every(c=>c>=0&&c<=DEFAULTS.disinfectant)).toBe(true)
    const stopped={...DEFAULTS,power:false}; s.tower=0
    const age=s.pipes[5].age[0], chlorine=s.pipes[5].chlorine[0]
    advanceSimulation(s,stopped,120)
    expect(s.pipes[5].age[0]).toBeGreaterThanOrEqual(age+119)
    expect(s.pipes[5].chlorine[0]).toBeLessThan(chlorine)
  })
})
