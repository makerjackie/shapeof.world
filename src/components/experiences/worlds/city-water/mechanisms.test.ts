import {describe,expect,it} from 'vitest'
import {advanceDrive} from './mechanisms'

describe('waterworks mechanical drives',()=>{
 it('stops in a blackout and resumes without accumulating hidden rotation',()=>{
  let drive=advanceDrive({time:0,angle:0},10,true,false,.045)
  expect(drive.angle).toBeCloseTo(.45)
  drive=advanceDrive(drive,100,false,false,.045)
  expect(drive.angle).toBeCloseTo(.45)
  drive=advanceDrive(drive,110,true,false,.045)
  expect(drive.angle).toBeCloseTo(.9)
 })
 it('freezes at reduced motion and resets when the simulation rewinds',()=>{
  const drive=advanceDrive({time:0,angle:0},20,true,false,.008)
  expect(advanceDrive(drive,25,true,true,.008).angle).toBe(drive.angle)
  expect(advanceDrive(drive,20,true,false,.008).angle).toBe(drive.angle)
  expect(advanceDrive(drive,0,true,false,.008)).toEqual({time:0,angle:0})
 })
})
