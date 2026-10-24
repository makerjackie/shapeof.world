import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { decodeMoleculeSurface, type MoleculeMetadata } from './molecule-data'
import { describe, expect, it } from 'vitest'
import { ATP_GROUPS, MOTOR_STOICHIOMETRY, advanceMotor, canOccupyMembrane, createMotorState, getMolecularReadings, isRotorGroup, createAppressedPatch, molecularFootprint, measureAppressedCoverage, type MembranePdb, type ProteinFootprint } from './molecular-model'

describe('molecular stoichiometry and light response', () => {
  it('advances c14 through exactly fourteen protons and three ATP per revolution', () => {
    const end = advanceMotor(createMotorState(), 4, 0.25)
    expect(end.revolutions).toBe(1)
    expect(end.protons).toBe(14)
    expect(end.atp).toBe(3)
    expect(end.angle).toBeCloseTo(Math.PI * 2)
    expect(MOTOR_STOICHIOMETRY.protonsPerATP).toBeCloseTo(4.6666666667)
    expect(advanceMotor(createMotorState(), 4 / 3, 0.25).atp).toBe(1)
  })
  it('rotates only the gamma/epsilon/c-ring group and leaves the stator fixed', () => {
    expect(isRotorGroup(ATP_GROUPS.rotor)).toBe(true)
    for (const group of [ATP_GROUPS.alpha, ATP_GROUPS.beta, ATP_GROUPS.statorArm, ATP_GROUPS.subunitA, ATP_GROUPS.ligand]) expect(isRotorGroup(group)).toBe(false)
    expect(advanceMotor(createMotorState(), 0.2, 0.25).angle).toBeGreaterThan(0)
  })
  it('locks the motor in darkness and also freezes it when paused', () => {
    const state = advanceMotor(createMotorState(), 0.5, 0.25)
    expect(getMolecularReadings(0).darkLocked).toBe(true)
    expect(getMolecularReadings(0).actualRps).toBe(0)
    expect(advanceMotor(state, 60, getMolecularReadings(0).displayRps)).toBe(state)
    expect(advanceMotor(state, 60, getMolecularReadings(400, -7.5, 0.001, false).displayRps)).toBe(state)
  })
  it('reports the actual local motor slowdown rather than conflating it with electron playback', () => {
    for (const light of [20, 100, 400, 1800, 2000]) {
      const reading = getMolecularReadings(light)
      expect(1 / reading.displayRps).toBeGreaterThanOrEqual(3)
      expect(1 / reading.displayRps).toBeLessThanOrEqual(6)
      expect(reading.displayRps * reading.slowdown).toBeCloseTo(reading.actualRps)
      expect(reading.electronSlowdown).toBe(1000)
    }
    expect(getMolecularReadings(2000).actualRps).toBe(100)
  })
  it('preserves the paired bilayers, light-dependent lumen and measured repeat', () => {
    const dark = getMolecularReadings(0), light = getMolecularReadings(500)
    expect(dark.lumenNm).toBeCloseTo(4.7)
    expect(light.lumenNm).toBeCloseTo(9.2)
    expect(dark.repeatNm).toBeCloseTo(16.3)
    expect(light.repeatNm).toBeCloseTo(19.1)
    for (const value of [dark, light]) expect(value.repeatNm).toBeCloseTo(value.membraneNm * 2 + value.lumenNm + value.partitionNm)
  })
  it('excludes bulky stromal heads from appressed membrane gaps', () => {
    for (const pdb of ['5L8R', '6FKF']) {
      expect(canOccupyMembrane(pdb, 'appressed')).toBe(false)
      for (const zone of ['margin', 'lamella', 'outer-face'] as const) expect(canOccupyMembrane(pdb, zone)).toBe(true)
    }
    for (const pdb of ['3JCU', '1RWT', '6RQF']) expect(canOccupyMembrane(pdb, 'appressed')).toBe(true)
  })
})


describe('rendered membrane occupancy', () => {
  it('measures roughly seven-tenths protein coverage from actual molecular surfaces', () => {
    const footprints = {} as Record<MembranePdb, ProteinFootprint>
    for (const id of ['3JCU', '1RWT', '6RQF'] as const) {
      const root = resolve(process.cwd(), 'public/assets/plant-cell/molecules', id)
      const metadata = JSON.parse(readFileSync(`${root}.json`, 'utf8')) as MoleculeMetadata
      const surface = decodeMoleculeSurface(readFileSync(`${root}.surface.bin.gz`), metadata)
      footprints[id] = molecularFootprint(surface.positions, surface.indices)
    }
    const measured = measureAppressedCoverage(footprints)
    console.info('PDB projected protein coverage', measured)
    expect(measured.coverage).toBeGreaterThan(.65)
    expect(measured.coverage).toBeLessThan(.76)
    expect(measured.overlap).toBeLessThan(.05)
    expect(Object.values(createAppressedPatch()).flat().every(pose => pose.zone === 'appressed')).toBe(true)
  })
})

import { clusterMoleculeSurface } from './molecule-lod'
describe('repeated-protein display LOD', () => {
  it('reduces vertex work while retaining membrane occupancy and finite geometry', () => {
    const footprints = {} as Record<MembranePdb, ProteinFootprint>
    let before = 0, after = 0
    for (const id of ['3JCU', '1RWT', '6RQF'] as const) {
      const path = resolve('public/assets/plant-cell/molecules', id)
      const original = decodeMoleculeSurface(readFileSync(`${path}.surface.bin.gz`), JSON.parse(readFileSync(`${path}.json`, 'utf8')))
      const lod = clusterMoleculeSurface(original)
      before += original.indices.length; after += lod.indices.length
      expect([...lod.positions, ...lod.normals].every(Number.isFinite)).toBe(true)
      expect(Math.max(...lod.indices)).toBeLessThan(lod.positions.length / 3)
      footprints[id] = molecularFootprint(lod.positions, lod.indices)
    }
    const occupancy = measureAppressedCoverage(footprints)
    console.log('Repeated-protein LOD', { triangleRatio: after / before, ...occupancy })
    expect(after / before).toBeLessThan(.55)
    expect(occupancy.coverage).toBeGreaterThan(.63)
    expect(occupancy.coverage).toBeLessThan(.74)
  })
})
