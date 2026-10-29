import {describe,expect,it} from 'vitest'
import {ACTUATOR,addByte,advanceCell,bpsk,cameraOptics,CELL,displayLight,hapticMotion,phonePower,radioLink,srgbToLinear} from './model'

describe('phone subsystem calculations',()=>{
 it('adds every possible pair of unsigned bytes, including the ninth carry bit',()=>{
  for(let a=0;a<256;a++)for(let b=0;b<256;b++){
   const v=addByte(a,b),reconstructed=v.stages.reduce((s,bit,i)=>s+(bit.sum<<i),v.carry<<8)
   if(v.total!==a+b||reconstructed!==a+b)throw new Error(`Invalid ripple carry for ${a}+${b}`)
  }
 })
 it('decodes sRGB before mixing light rather than averaging encoded values',()=>{
  expect(srgbToLinear(0)).toBe(0);expect(srgbToLinear(255)).toBe(1)
  expect(srgbToLinear(128)).toBeCloseTo(.21586,4)
  expect(displayLight([0,255,0]).luminance).toBeCloseTo(.7152)
  expect(displayLight([255,255,255]).luminance).toBeCloseTo(1)
 })
 it('places the sensor at the image plane when focused, with increasing blur on defocus',()=>{
  expect(cameraOptics(.65,.65).blurMm).toBe(0)
  expect(cameraOptics(.2,3).blurMm).toBeGreaterThan(cameraOptics(.65,3).blurMm)
  expect(cameraOptics(.2,.2).image).toBeGreaterThan(cameraOptics(3,3).image)
 })
 it('conserves cell energy under a steady load and reverses it when charging',()=>{
  const settings={brightness:.5,workload:.3,radio:.2,charging:false},state={soc:.7,temperature:23,seconds:0}
  const p=phonePower(settings,state.soc),next=advanceCell(state,5,settings)
  expect((state.soc-next.soc)*CELL.energyWh*3600).toBeCloseTo(p.batteryW*5,9)
  expect(advanceCell(state,5,{...settings,charging:true}).soc).toBeGreaterThan(state.soc)
  expect(phonePower({...settings,charging:true},.98).batteryW).toBeGreaterThan(phonePower({...settings,charging:true},.7).batteryW)
 })
 it('keeps charge bounded over hours of charging and discharging',()=>{
  let s={soc:.5,temperature:23,seconds:0}
  for(let i=0;i<10000;i++)s=advanceCell(s,5,{brightness:1,workload:1,radio:1,charging:i>5000})
  expect(s.soc).toBeGreaterThanOrEqual(0);expect(s.soc).toBeLessThanOrEqual(1);expect(s.temperature).toBeLessThan(50)
 })
 it('stops drawing power from an exhausted cell and can restart on external power',()=>{
  const settings={brightness:1,workload:1,radio:1,charging:false}
  expect(phonePower(settings,0).batteryW).toBe(0)
  expect(phonePower(settings,0).hours).toBe(0)
  expect(phonePower({...settings,charging:true},0).batteryW).toBeLessThan(0)
 })
 it('loses 6.02 dB when free-space distance or carrier frequency doubles',()=>{
  const baseline=radioLink(1,1)
  expect(radioLink(1,2).loss-baseline.loss).toBeCloseTo(6.0206,4)
  expect(radioLink(2,1).loss-baseline.loss).toBeCloseTo(6.0206,4)
  expect(radioLink(1,2).capacityMbps).toBeLessThan(baseline.capacityMbps)
 })
 it('flips carrier phase by pi when a BPSK bit changes',()=>{
  const a=bpsk(101,[0]),b=bpsk(101,[1]);a.forEach((v,i)=>expect(v.y).toBeCloseTo(-b[i].y,10))
 })
 it('shows finite resonant displacement, proportional force and zero response to zero force',()=>{
  const peak=hapticMotion(ACTUATOR.resonanceHz,.02,0)
  expect(peak.amplitudeMm).toBeGreaterThan(hapticMotion(100,.02,0).amplitudeMm)
  expect(hapticMotion(175,.04,0).amplitudeMm).toBeCloseTo(peak.amplitudeMm*2)
  expect(hapticMotion(175,0,1).displacementMm).toBeCloseTo(0)
 })
})
