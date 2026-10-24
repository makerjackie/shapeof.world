import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  ATP_GROUPS, MOLECULE_IDS, decodeATPAtoms, decodeMoleculeSurface,
  type MoleculeId, type MoleculeMetadata,
} from './molecule-data'

const assets = resolve(process.cwd(), 'public/assets/plant-cell/molecules')
const meta = (id: MoleculeId) => JSON.parse(readFileSync(resolve(assets, `${id}.json`), 'utf8')) as MoleculeMetadata
const surface = (id: MoleculeId) => decodeMoleculeSurface(readFileSync(resolve(assets, `${id}.surface.bin.gz`)), meta(id))
const atomic = () => decodeATPAtoms(readFileSync(resolve(assets, '6FKF.atoms.bin.gz')), meta('6FKF'))

describe('deposited molecular assets', () => {
  it('accepts gzip files and browser-decoded Content-Encoding responses identically', () => {
    const atomGzip = readFileSync(resolve(assets, '6FKF.atoms.bin.gz'))
    const atomFile = decodeATPAtoms(atomGzip, meta('6FKF'))
    const atomHTTP = decodeATPAtoms(gunzipSync(atomGzip), meta('6FKF'))
    expect(atomHTTP.positions).toEqual(atomFile.positions)
    expect(atomHTTP.groups).toEqual(atomFile.groups)
    expect(atomHTTP.elements).toEqual(atomFile.elements)
    const meshGzip = readFileSync(resolve(assets, '3JCU.surface.bin.gz'))
    const meshFile = decodeMoleculeSurface(meshGzip, meta('3JCU'))
    const meshHTTP = decodeMoleculeSurface(gunzipSync(meshGzip), meta('3JCU'))
    expect(meshHTTP.positions).toEqual(meshFile.positions)
    expect(meshHTTP.indices).toEqual(meshFile.indices)
    expect(() => decodeATPAtoms(new Uint8Array(8), meta('6FKF'))).toThrow('Truncated')
    expect(() => decodeMoleculeSurface(gunzipSync(atomGzip), meta('6FKF'))).toThrow('Invalid PCMS')
  })

  it('decodes all nine finite, indexed surfaces with provenance and compact resources', () => {
    for (const id of MOLECULE_IDS) {
      const data = surface(id)
      expect(data.metadata.license).toBe('CC0-1.0')
      expect(data.metadata.citationDOI).toMatch(/^10\./)
      expect(data.metadata.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(data.metadata.organism.length).toBeGreaterThan(4)
      expect(data.metadata.resolutionAngstrom).toBeGreaterThan(0)
      expect(data.indices.length / 3).toBeGreaterThan(2000)
      expect(data.indices.length / 3).toBeLessThan(15000)
      expect(data.positions.length).toBe(data.normals.length)
      expect(data.positions.length).toBe(data.colors.length)
      expect([...data.positions].every(Number.isFinite)).toBe(true)
      expect([...data.normals].every(Number.isFinite)).toBe(true)
      expect(Math.max(...data.indices)).toBeLessThan(data.positions.length / 3)
      // Real molecular meshes must occupy all three dimensions.
      expect(data.metadata.spansNm.every(s => s > 1)).toBe(true)
    }
    const total = readdirSync(assets).reduce((sum, file) => sum + statSync(resolve(assets, file)).size, 0)
    expect(total).toBeLessThan(5_000_000)
  })

  it('places independently identifiable PSII, PSI and b6f domains on the correct membrane side', () => {
    // These coordinates are computed from actual deposited atom subsets before
    // surface reduction; testing labels like "lumen:-Y" alone would be tautological.
    const psii = meta('3JCU').orientation.landmarksNm
    expect(psii.oxygenEvolvingMn[1]).toBeLessThan(-2)
    expect(psii.oxygenEvolvingProteins[1]).toBeLessThan(-3)
    const psi = meta('5L8R').orientation.landmarksNm
    for (const name of ['PsaC', 'PsaD', 'PsaE']) expect(psi[name][1]).toBeGreaterThan(2)
    const b6f = meta('6RQF').orientation.landmarksNm
    expect(b6f.cytochromeFHead[1]).toBeLessThan(-2)
    expect(b6f.rieskeHead[1]).toBeLessThan(-2)

    // Also inspect the delivered geometry, rather than passing when only its
    // metadata says the right thing. The large extrinsic PSII/b6f heads extend
    // towards the lumen; PSI's stromal docking subunits extend the other way.
    const extent = (id: MoleculeId) => {
      const positions = surface(id).positions
      const y = Array.from({ length: positions.length / 3 }, (_, i) => positions[i * 3 + 1])
      return { min: Math.min(...y), max: Math.max(...y) }
    }
    for (const id of ['3JCU', '6RQF'] as const) {
      const { min, max } = extent(id)
      expect(min).toBeLessThan(-6)
      expect(-min).toBeGreaterThan(max + 2)
    }
    const psiExtent = extent('5L8R')
    expect(psiExtent.max).toBeGreaterThan(5)
    expect(psiExtent.max).toBeGreaterThan(-psiExtent.min + 1)
  })

  it('keeps the c14 ring centred on the rotor axis, and the CF1 head in the stroma', () => {
    const data = atomic(), m = data.metadata
    expect(m.orientation.landmarksNm.cRing).toEqual([0, 0, 0])
    expect(m.orientation.landmarksNm.CF1[1]).toBeGreaterThan(10)
    expect(m.orientation.landmarksNm.gamma[1]).toBeGreaterThan(5)
    const cChains = m.chains.flatMap((chain, index) => /subunit c,/i.test(chain.description) ? [index] : [])
    expect(cChains).toHaveLength(14)
    let x = 0, y = 0, z = 0, count = 0
    for (let i = 0; i < data.elements.length; i++) if (cChains.includes(data.chains[i])) {
      x += data.positions[i * 3]; y += data.positions[i * 3 + 1]; z += data.positions[i * 3 + 2]; count++
      expect(data.groups[i]).toBe(ATP_GROUPS.rotor)
    }
    expect(Math.hypot(x / count, y / count, z / count)).toBeLessThan(0.002)

    const centroid = (predicate: (index: number) => boolean) => {
      const sum = [0, 0, 0]; let count = 0
      for (let i = 0; i < data.elements.length; i++) if (predicate(i)) {
        for (let axis = 0; axis < 3; axis++) sum[axis] += data.positions[i * 3 + axis]
        count++
      }
      expect(count).toBeGreaterThan(0)
      return sum.map(value => value / count)
    }
    const head = centroid(i => data.groups[i] === ATP_GROUPS.alpha || data.groups[i] === ATP_GROUPS.beta)
    const gammaChains = m.chains.flatMap((chain, index) => /gamma/i.test(chain.description) ? [index] : [])
    const gamma = centroid(i => gammaChains.includes(data.chains[i]))
    expect(head[1]).toBeGreaterThan(10)
    expect(gamma[1]).toBeGreaterThan(5)
    expect(Math.hypot(gamma[0], gamma[2])).toBeLessThan(0.002)
    for (let axis = 0; axis < 3; axis++) {
      expect(head[axis]).toBeCloseTo(m.orientation.landmarksNm.CF1[axis], 3)
      expect(gamma[axis]).toBeCloseTo(m.orientation.landmarksNm.gamma[axis], 3)
    }
  })

  it('assigns every resolved atom to its entity-derived rotor or stationary component', () => {
    const data = atomic(), m = data.metadata
    expect(data.elements.length).toBe(39_204)
    expect(data.elements.includes(1)).toBe(false)
    const c = (pattern: RegExp) => m.chains.filter(chain => pattern.test(chain.description))
    expect(c(/subunit alpha/i)).toHaveLength(3)
    expect(c(/subunit beta/i)).toHaveLength(3)
    expect(c(/gamma|epsilon|subunit c,/i)).toHaveLength(16)
    expect(c(/delta|subunit b(?:'|,)/i)).toHaveLength(3)
    expect(c(/subunit a,/i)).toHaveLength(1)
    for (let i = 0; i < data.groups.length; i++) {
      expect(data.groups[i]).toBe(m.chains[data.chains[i]].group)
      // Match the binary group against entity descriptions independently of the
      // exported group field, so a wrong rotor/stator annotation cannot self-pass.
      const description = m.chains[data.chains[i]].description
      const rotor = /gamma|epsilon|subunit c,/i.test(description)
      expect(data.groups[i] === ATP_GROUPS.rotor).toBe(rotor)
      expect(data.occlusion[i]).toBeGreaterThanOrEqual(0)
      expect(data.occlusion[i]).toBeLessThanOrEqual(1)
    }
    expect(Math.max(...data.occlusion) - Math.min(...data.occlusion)).toBeGreaterThan(0.5)
  })

  it('uses actual CCD ideal atoms and bonds for ATP, ADP and phosphate', () => {
    for (const [id, atomCount, phosphorus] of [['ATP', 31, 3], ['ADP', 27, 2], ['PO4', 5, 1]] as const) {
      const ligand = JSON.parse(readFileSync(resolve(assets, `${id}.ligand.json`), 'utf8'))
      expect(ligand.license).toBe('CC0-1.0')
      expect(ligand.elements).toHaveLength(atomCount)
      expect(ligand.positions).toHaveLength(atomCount * 3)
      expect(ligand.elements.filter((e: number) => e === 15)).toHaveLength(phosphorus)
      const bonded = new Set<number>()
      for (const [a, b, order] of ligand.bonds as [number, number, number][]) {
        expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(atomCount)
        expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(atomCount)
        expect(order).toBeGreaterThanOrEqual(1); expect(order).toBeLessThanOrEqual(3)
        bonded.add(a); bonded.add(b)
      }
      expect(bonded.size).toBe(atomCount)
    }
  })

  it('renders native LHCII trimer and complete L8S8 Rubisco rather than crystal asymmetric units', () => {
    const lhcii = meta('1RWT'), rubisco = meta('8RUC')
    expect(lhcii.chains.filter(c => /chlorophyll a-b binding/i.test(c.description))).toHaveLength(3)
    expect(lhcii.assembly).toContain('60-mer')
    expect(lhcii.spansNm[0]).toBeLessThan(12)
    expect(lhcii.spansNm[2]).toBeLessThan(12)
    expect(rubisco.chains.filter(c => c.entity === '1')).toHaveLength(8)
    expect(rubisco.chains.filter(c => c.entity === '2')).toHaveLength(8)
    expect(rubisco.spansNm.every(s => s > 9 && s < 14)).toBe(true)
    expect(meta('5L8R').warnings.join(' ')).toContain('not spinach')
    expect(meta('1A70').warnings.join(' ')).toContain('E92K')
  })
})
