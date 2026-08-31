import equalMassCatalog from './data/equal-mass-695.json'
import unequalMassCatalog from './data/unequal-mass-1349.json'
import spatialCatalog from './data/spatial-orbits.json'
import {
  EULER_PERIOD,
  LAGRANGE_PERIOD,
  collinearStars,
  eulerStars,
  figureEightStars,
  lagrangeStars,
  spatialStars,
  type Star,
} from './three-body-model'

type EqualRow = [cls: string, n: number, v1: number, v2: number, T: number, Tstar: number | null, Lf: number | null]
type UnequalRow = [cls: string, n: number, m3: number, v1: number, v2: number, T: number, Tstar: number | null, Lf: number | null]
type SpatialRow = [n: number, m3: number, z0: number, vx: number, vy: number, vz: number, T: number, stability: string, pianoTrio: number]

export type OrbitFamily = 'named' | 'equal' | 'unequal' | 'spatial'
export type OrbitKind = 'collinear' | 'lagrange' | 'euler' | 'choreography' | 'spatial'

export const PAGE_SIZE = 8

export type PeriodicOrbit = {
  id: string
  family: OrbitFamily
  kind: OrbitKind
  cls?: string
  n?: number
  m3: number
  v1?: number
  v2?: number
  z0?: number
  vz?: number
  period: number
  Tstar?: number
  Lf?: number
  pianoTrio?: boolean
  stable?: boolean
  nameZh: string
  nameEn: string
  featured?: boolean
  source: string
}

const EQUAL_ROWS = equalMassCatalog.orbits as Array<EqualRow>
const UNEQUAL_ROWS = unequalMassCatalog.orbits as Array<UnequalRow>

function clsToken(cls: string) {
  return cls.replaceAll('.', '')
}

export function equalId(cls: string, n: number) {
  return `eq-${clsToken(cls)}-${n}`
}

export function unequalId(cls: string, n: number, m3: number) {
  return `uneq-${clsToken(cls)}-${n}-m${m3}`
}

function catalogName(cls: string, n: number, m3?: number) {
  const body = `${cls}${n}`
  if (m3 === undefined) return { nameZh: body, nameEn: body }
  return { nameZh: `${body} · m₃=${m3}`, nameEn: `${body} · m₃=${m3}` }
}

const equalById = new Map<string, PeriodicOrbit>()
export const EQUAL_ORBITS: Array<PeriodicOrbit> = EQUAL_ROWS.map((row) => {
  const [cls, n, v1, v2, period, Tstar, Lf] = row
  const names = catalogName(cls, n)
  const orbit: PeriodicOrbit = {
    id: equalId(cls, n),
    family: 'equal',
    kind: 'collinear',
    cls,
    n,
    m3: 1,
    v1,
    v2,
    period,
    Tstar: Tstar ?? undefined,
    Lf: Lf ?? undefined,
    nameZh: names.nameZh,
    nameEn: names.nameEn,
    source: 'Li & Liao 2017',
  }
  equalById.set(orbit.id, orbit)
  return orbit
})

const unequalById = new Map<string, PeriodicOrbit>()
export const UNEQUAL_ORBITS: Array<PeriodicOrbit> = UNEQUAL_ROWS.map((row) => {
  const [cls, n, m3, v1, v2, period, Tstar, Lf] = row
  const names = catalogName(cls, n, m3)
  const orbit: PeriodicOrbit = {
    id: unequalId(cls, n, m3),
    family: 'unequal',
    kind: 'collinear',
    cls,
    n,
    m3,
    v1,
    v2,
    period,
    Tstar: Tstar ?? undefined,
    Lf: Lf ?? undefined,
    nameZh: names.nameZh,
    nameEn: names.nameEn,
    source: 'Li, Jing & Liao 2018',
  }
  unequalById.set(orbit.id, orbit)
  return orbit
})

export const UNEQUAL_MASSES = [0.5, 0.75, 2, 4, 5, 8, 10] as const

const SPATIAL_ROWS = spatialCatalog.orbits as Array<SpatialRow>
export const SPATIAL_ORBITS: Array<PeriodicOrbit> = SPATIAL_ROWS.map((row) => {
  const [n, m3, z0, vx, vy, vz, period, stability, pianoTrio] = row
  const piano = pianoTrio === 1
  const name = piano ? `O${n}(${m3}) 三重奏` : `O${n}(${m3})`
  const nameEn = piano ? `O${n}(${m3}) piano trio` : `O${n}(${m3})`
  return {
    id: `sp-O${n}-m${m3}`,
    family: 'spatial',
    kind: 'spatial',
    n,
    m3,
    v1: vx,
    v2: vy,
    z0,
    vz,
    period,
    pianoTrio: piano,
    stable: stability === 'S',
    nameZh: name,
    nameEn,
    source: 'Li & Liao 2025',
  }
})

export const SPATIAL_MASSES = [0.1, 0.5, 0.6, 1, 1.2, 2] as const

type NamedSpec = {
  id: string
  nameZh: string
  nameEn: string
  featured?: boolean
  kind?: OrbitKind
  equalId?: string
  /** Šuvakov 2013 Table I, used when the family is not a Li–Liao singleton. */
  suvakov?: { v1: number; v2: number; period: number }
}

const NAMED_SPECS: Array<NamedSpec> = [
  { id: 'named-euler', nameZh: '欧拉直线', nameEn: 'Euler collinear', kind: 'euler' },
  { id: 'named-lagrange', nameZh: '拉格朗日正三角', nameEn: 'Lagrange triangle', kind: 'lagrange' },
  { id: 'named-figure-eight', nameZh: '8 字舞', nameEn: 'Figure-eight', kind: 'choreography', featured: true },
  { id: 'named-butterfly-i', nameZh: '蝴蝶 I', nameEn: 'Butterfly I', equalId: equalId('I.A', 2), featured: true },
  { id: 'named-butterfly-ii', nameZh: '蝴蝶 II', nameEn: 'Butterfly II', suvakov: { v1: 0.39295, v2: 0.09758, period: 7.0039 } },
  { id: 'named-bumblebee', nameZh: '熊蜂', nameEn: 'Bumblebee', equalId: equalId('I.A', 17), featured: true },
  { id: 'named-moth-i', nameZh: '蛾 I', nameEn: 'Moth I', equalId: equalId('I.B', 1), featured: true },
  { id: 'named-moth-ii', nameZh: '蛾 II', nameEn: 'Moth II', equalId: equalId('I.B', 5) },
  { id: 'named-moth-iii', nameZh: '蛾 III', nameEn: 'Moth III', equalId: equalId('I.B', 6) },
  { id: 'named-butterfly-iii', nameZh: '蝴蝶 III', nameEn: 'Butterfly III', equalId: equalId('I.B', 2) },
  { id: 'named-goggles', nameZh: '护目镜', nameEn: 'Goggles', equalId: equalId('I.B', 3), featured: true },
  { id: 'named-dragonfly', nameZh: '蜻蜓', nameEn: 'Dragonfly', equalId: equalId('I.B', 4), featured: true },
  { id: 'named-butterfly-iv', nameZh: '蝴蝶 IV', nameEn: 'Butterfly IV', equalId: equalId('I.B', 49) },
  { id: 'named-yarn', nameZh: '毛线', nameEn: 'Yarn', featured: true, suvakov: { v1: 0.55906, v2: 0.34919, period: 55.5018 } },
  { id: 'named-yin-yang-i', nameZh: '阴阳 I', nameEn: 'Yin-yang I', equalId: equalId('II.C', 1), featured: true },
  { id: 'named-yin-yang-ii', nameZh: '阴阳 II', nameEn: 'Yin-yang II', equalId: equalId('II.C', 27) },
]

function namedFromSpec(spec: NamedSpec): PeriodicOrbit {
  if (spec.kind === 'euler') {
    return {
      id: spec.id,
      family: 'named',
      kind: 'euler',
      m3: 1,
      period: EULER_PERIOD,
      nameZh: spec.nameZh,
      nameEn: spec.nameEn,
      source: 'Euler 1767',
    }
  }
  if (spec.kind === 'lagrange') {
    return {
      id: spec.id,
      family: 'named',
      kind: 'lagrange',
      m3: 1,
      period: LAGRANGE_PERIOD,
      nameZh: spec.nameZh,
      nameEn: spec.nameEn,
      source: 'Lagrange 1772',
    }
  }
  if (spec.kind === 'choreography') {
    return {
      id: spec.id,
      family: 'named',
      kind: 'choreography',
      m3: 1,
      period: 6.3259,
      nameZh: spec.nameZh,
      nameEn: spec.nameEn,
      featured: spec.featured,
      source: 'Moore 1993; Chenciner & Montgomery 2000',
    }
  }
  if (spec.suvakov) {
    return {
      id: spec.id,
      family: 'named',
      kind: 'collinear',
      m3: 1,
      v1: spec.suvakov.v1,
      v2: spec.suvakov.v2,
      period: spec.suvakov.period,
      nameZh: spec.nameZh,
      nameEn: spec.nameEn,
      featured: spec.featured,
      source: 'Šuvakov & Dmitrašinović 2013',
    }
  }
  const base = spec.equalId ? equalById.get(spec.equalId) : undefined
  if (!base) throw new Error(`Missing equal-mass orbit for ${spec.id}`)
  return {
    ...base,
    id: spec.id,
    family: 'named',
    nameZh: spec.nameZh,
    nameEn: spec.nameEn,
    featured: spec.featured,
    source: `${base.source}; Šuvakov & Dmitrašinović 2013`,
  }
}

export const NAMED_ORBITS: Array<PeriodicOrbit> = NAMED_SPECS.map(namedFromSpec)
export const FEATURED_ORBITS = NAMED_ORBITS.filter((orbit) => orbit.featured)

const byId = new Map<string, PeriodicOrbit>()
for (const orbit of [...NAMED_ORBITS, ...EQUAL_ORBITS, ...UNEQUAL_ORBITS, ...SPATIAL_ORBITS]) byId.set(orbit.id, orbit)

export const ORBIT_COUNTS = {
  named: NAMED_ORBITS.length,
  equal: EQUAL_ORBITS.length,
  unequal: UNEQUAL_ORBITS.length,
  spatial: SPATIAL_ORBITS.length,
  spatialDiscovered: spatialCatalog.totalDiscovered as number,
  all: NAMED_ORBITS.length + EQUAL_ORBITS.length + UNEQUAL_ORBITS.length + SPATIAL_ORBITS.length,
} as const

export function getOrbit(id: string): PeriodicOrbit {
  return byId.get(id) ?? NAMED_ORBITS[2]
}

/** Prefer short, high-amplitude, stable spatial orbits on the first atlas page. */
export function spatialShowScore(orbit: PeriodicOrbit) {
  const amplitude = Math.abs(orbit.z0 ?? 0) + 2 * Math.abs(orbit.vz ?? 0)
  const tempo = orbit.period < 8 ? 1.25 : orbit.period < 14 ? 1 : orbit.period < 24 ? 0.55 : 0.25
  const stableBoost = orbit.stable ? 1.85 : 1
  const pianoBoost = orbit.pianoTrio ? 1.1 : 1
  return amplitude * tempo * stableBoost * pianoBoost
}

export function listOrbits(family: OrbitFamily, m3?: number): Array<PeriodicOrbit> {
  if (family === 'named') {
    const extra = NAMED_ORBITS.filter((item) => !item.featured)
    return [...FEATURED_ORBITS, ...extra]
  }
  if (family === 'equal') return EQUAL_ORBITS
  if (family === 'spatial') {
    const rows = m3 === undefined ? SPATIAL_ORBITS : SPATIAL_ORBITS.filter((orbit) => orbit.m3 === m3)
    return [...rows].sort((left, right) => spatialShowScore(right) - spatialShowScore(left))
  }
  if (m3 === undefined) return UNEQUAL_ORBITS
  return UNEQUAL_ORBITS.filter((orbit) => orbit.m3 === m3)
}

export const DEFAULT_FAMILY: OrbitFamily = 'spatial'
export const DEFAULT_SPATIAL_MASS = 0.6
export const DEFAULT_ORBIT_ID = listOrbits('spatial', DEFAULT_SPATIAL_MASS)[0]?.id ?? 'named-figure-eight'

export function starsForOrbit(orbit: PeriodicOrbit, nudge = 0): Array<Star> {
  if (orbit.kind === 'euler') return eulerStars()
  if (orbit.kind === 'lagrange') return lagrangeStars()
  if (orbit.kind === 'choreography') return figureEightStars(nudge)
  if (orbit.kind === 'spatial') {
    return spatialStars(orbit.z0 ?? 0.5, orbit.v1 ?? 0, orbit.v2 ?? 0, orbit.vz ?? 0, orbit.m3)
  }
  const stars = collinearStars(orbit.v1 ?? 0, orbit.v2 ?? 0, orbit.m3)
  if (nudge !== 0) {
    stars[2].vx += nudge
    stars[0].vx -= nudge / 2
    stars[1].vx -= nudge / 2
  }
  return stars
}

export function displayName(orbit: PeriodicOrbit, english: boolean) {
  return english ? orbit.nameEn : orbit.nameZh
}

export function familyCaption(family: OrbitFamily, english: boolean) {
  if (family === 'named') return english ? 'Named dances' : '名解'
  if (family === 'equal') return english ? 'Equal mass · 695' : '等质量 · 695'
  if (family === 'spatial') return english ? 'Spatial 3D' : '三维空间'
  return english ? 'Unequal mass · 1349' : '不等质量 · 1349'
}
