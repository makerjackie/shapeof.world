import { describe, expect, it } from 'vitest'
import { advanceWater, createWater, getWaterReadings, pressureVolume, SALT_PSI, TLP_PSI, TLP_VOLUME, WATER, waterStomatalFactor } from './water-model'
import { advancePhysiology, createPhysiology, DEFAULT_INPUTS } from './model'
import { parseCaptureParams } from './capture-params'

describe('water potential and osmotic volume', () => {
  it('solves Psi=P+pi and the Boyle–van’t Hoff relation on either side of turgor loss', () => {
    expect(TLP_PSI).toBeCloseTo(-1.363636, 5)
    expect(TLP_VOLUME).toBeCloseTo(.88)
    expect(pressureVolume(TLP_PSI).pressure).toBeCloseTo(0)
    for (let psi=-.4;psi>=-2.5;psi-=.01) {
      const p=pressureVolume(psi)
      expect(p.pressure+p.osmotic).toBeCloseTo(psi,10)
      expect(p.osmotic*p.volume).toBeCloseTo(-1.2,10)
      expect(p.pressure).toBeGreaterThanOrEqual(0)
    }
  })
  it('loses volume and pressure monotonically during the three-hour drought', () => {
    let state=createWater(), last=getWaterReadings(state)
    for(let i=0;i<180;i++) {
      state=advanceWater(state,'drought',60)
      const next=getWaterReadings(state)
      expect(next.relativeVolume).toBeLessThanOrEqual(last.relativeVolume+1e-12)
      expect(next.pressure).toBeLessThanOrEqual(last.pressure+1e-12)
      expect(next.wallRadial).toBe(next.radial) // no fluid-filled gap in air
      last=next
    }
    expect(state.psi).toBeCloseTo(-1.8)
    expect(last.pressure).toBe(0)
    expect(last.relativeVolume).toBeCloseTo(.6912,3)
    expect(last.wrinkles).toBeGreaterThan(0)
  })
  it('equilibrates 0.5 M NaCl at 20 C without shrinking the wall', () => {
    expect(SALT_PSI).toBeCloseTo(-2.4374,3)
    const salt=advanceWater(createWater(),'saltwater',WATER.saltSeconds)
    const r=getWaterReadings(salt)
    expect(r.pressure).toBe(0)
    expect(r.volume).toBeCloseTo(-1.2/SALT_PSI,10)
    expect(r.wallRadial).toBe(1)
    expect(r.relativeVolume).toBeLessThan(.52)
    expect(r.immersion).toBe(1)
  })
  it('reverses continuously and recovers on different drought/salt timescales', () => {
    for (const mode of ['drought','saltwater'] as const) {
      const stressed=createWater(mode), switched=advanceWater(stressed,'normal',0)
      expect(switched.psi).toBe(stressed.psi)
      expect(switched.immersion).toBe(stressed.immersion)
      const seconds=mode==='drought'?1800:300
      const halfway=advanceWater(switched,'normal',seconds/2), recovered=advanceWater(halfway,'normal',seconds/2)
      expect(halfway.psi).toBeGreaterThan(stressed.psi)
      expect(recovered.psi).toBeCloseTo(-.4)
      expect(getWaterReadings(recovered).relativeVolume).toBeCloseTo(1)
      expect(recovered.immersion).toBe(0)
    }
  })
  it('is timestep-independent, pauses and closes stomata between -1 and the TLP', () => {
    let split=createWater()
    for(let i=0;i<100;i++)split=advanceWater(split,'drought',50)
    expect(split).toEqual(advanceWater(createWater(),'drought',5000))
    expect(advanceWater(split,'drought',0)).toEqual(split)
    expect(waterStomatalFactor(-1)).toBe(1)
    expect(waterStomatalFactor(-1.2)).toBeLessThan(.5)
    expect(waterStomatalFactor(TLP_PSI)).toBe(0)
  })
  it('reduces actual assimilation and starch storage with water-limited stomata', () => {
    const input={...DEFAULT_INPUTS,water:'saltwater' as const,timeScale:60 as const}
    const state=createPhysiology(), hydrated=state.netAssimilation
    advancePhysiology(state,input,10)
    expect(state.stomatalOpening).toBeLessThan(.01)
    expect(state.netAssimilation).toBeLessThan(0)
    expect(state.netAssimilation).toBeLessThan(hydrated)
    const stress=createPhysiology(input)
    expect(stress.netAssimilation).toBe(-1)
  })
  it('initializes reproducible water/wt snapshots without changing the simulation clock', () => {
    for (const mode of ['drought','saltwater'] as const) {
      const url=parseCaptureParams(`?water=${mode}&wt=.5&speed=0`)
      const state=createPhysiology(url.inputs,url.daySeconds,url.waterProgress)
      expect(state.water.psi).toBeCloseTo((-.4+(mode==='drought'?-1.8:SALT_PSI))/2)
      expect(state.simulationSeconds).toBe(0)
      expect(parseCaptureParams(`?water=${mode}`).waterProgress).toBe(1)
    }
    expect(parseCaptureParams('?water=nope&wt=NaN').inputs.water).toBe('normal')
    expect(parseCaptureParams('?water=drought&wt=-1').waterProgress).toBe(0)
    expect(parseCaptureParams('?water=saltwater&wt=2').waterProgress).toBe(1)
  })
})
