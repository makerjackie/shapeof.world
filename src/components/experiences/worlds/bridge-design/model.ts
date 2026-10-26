/** Quasi-static teaching models. Units: metres and kN. See SOURCES.md. */
export type BridgeKind = 'beam' | 'arch' | 'suspension' | 'stayed'
export type Point = [number, number, number]
export type Member = { id: string; a: Point; b: Point; force: number; family: 'deck' | 'arch' | 'cable' | 'hanger' | 'tower' | 'anchor'; reverse?: boolean }
export const SPAN = 120
export const DEAD_LOAD = 12
export const DECK = 28
export const RISE = 24
export const SAG = 18
const PANELS = 20

export function beamResponse(position: number, truck: number, span = SPAN, dead = DEAD_LOAD) {
  const a = Math.max(0, Math.min(1, position)) * span
  const left = dead * span / 2 + truck * (span - a) / span
  const right = dead * span + truck - left
  const moment = (x: number) => left * x - dead * x * x / 2 - truck * Math.max(0, x - a)
  const shear = (x: number) => left - dead * x - (x > a ? truck : 0)
  const candidates = [0, span, a, Math.min(a, left / dead), Math.max(a, (left - truck) / dead)].filter(Number.isFinite)
  const maxMoment = Math.max(...candidates.map(x => moment(Math.max(0, Math.min(span, x)))))
  return { left, right, moment, shear, a, maxMoment }
}

/** Linear weights preserve both resultant and first moment at panel nodes. */
export function deckLoads(position: number, truck: number) {
  const dx = SPAN / PANELS
  const loads = Array.from({ length: PANELS + 1 }, (_, i) => DEAD_LOAD * dx * (i === 0 || i === PANELS ? .5 : 1))
  const p = Math.max(0, Math.min(PANELS, position * PANELS))
  const i = Math.min(PANELS - 1, Math.floor(p))
  loads[i] += truck * (1 - (p - i))
  loads[i + 1] += truck * (p - i)
  return loads
}

export function bridgeResponse(kind: BridgeKind, position: number, truck: number) {
  const beam = beamResponse(position, truck)
  const members: Member[] = []
  const add = (id: string, a: Point, b: Point, force: number, family: Member['family'], reverse = false) => members.push({ id, a, b, force, family, reverse })
  let horizontal = 0
  let towerLeft = beam.left
  let towerRight = beam.right
  let anchorUplift = 0
  const loads = deckLoads(position, truck)
  const dx = SPAN / PANELS
  const moment = (x: number) => beam.left * x - loads.reduce((sum, p, i) => sum + p * Math.max(0, x - i * dx), 0)
  const sample = (i: number, y: number): Point => [i * dx - SPAN / 2, y, 0]
  if (kind === 'beam') {
    // A force couple M/h, not axial force of the entire beam.
    for (let i = 0; i < PANELS; i++) {
      const force = beam.moment((i + .5) * dx) / 4
      add(`upper-${i}`, sample(i, DECK), sample(i + 1, DECK), -force, 'deck', i < PANELS / 2)
      add(`lower-${i}`, sample(i, DECK - 4), sample(i + 1, DECK - 4), force, 'deck', i < PANELS / 2)
    }
  } else if (kind === 'arch') {
    // Three hinges, parabolic centreline. H = M_beam(L/2) / rise.
    horizontal = moment(SPAN / 2) / RISE
    const y = (x: number) => 4 * RISE * x * (SPAN - x) / (SPAN * SPAN)
    for (let i = 0; i < PANELS; i++) {
      const x = (i + .5) * dx
      const angle = Math.atan(4 * RISE * (SPAN - 2 * x) / (SPAN * SPAN))
      const vertical = beam.left - loads.slice(0, i + 1).reduce((sum, load) => sum + load, 0)
      const axial = horizontal * Math.cos(angle) + vertical * Math.sin(angle)
      add(`arch-${i}`, sample(i, y(i * dx)), sample(i + 1, y((i + 1) * dx)), -axial, 'arch', i < PANELS / 2)
      if (i > 0) add(`post-${i}`, sample(i, DECK), sample(i, y(i * dx)), -loads[i], 'hanger')
    }
    add('thrust-left', [-60, 0, 0], [-77, 0, 0], -horizontal, 'anchor')
    add('thrust-right', [60, 0, 0], [77, 0, 0], -horizontal, 'anchor')
  } else if (kind === 'suspension') {
    // Funicular polygon under discrete hanger loads, with prescribed midspan sag.
    // This is a flexible, unstiffened deck limit, not an elastic suspension bridge.
    horizontal = moment(SPAN / 2) / SAG
    const y = (i: number) => 60 - moment(i * dx) / horizontal
    for (let i = 0; i < PANELS; i++) {
      const dy = y(i + 1) - y(i)
      add(`cable-${i}`, sample(i, y(i)), sample(i + 1, y(i + 1)), horizontal * Math.hypot(1, dy / dx), 'cable', i < PANELS / 2)
      if (i > 0) add(`hanger-${i}`, sample(i, DECK), sample(i, y(i)), loads[i], 'hanger')
    }
    const tailSlope = (60 - 24) / 32
    anchorUplift = horizontal * tailSlope
    towerLeft += anchorUplift
    towerRight += anchorUplift
    const tailTension = Math.hypot(horizontal, anchorUplift)
    add('backstay-left', [-60, 60, 0], [-92, 24, 0], tailTension, 'anchor')
    add('backstay-right', [60, 60, 0], [92, 24, 0], tailTension, 'anchor')
  } else {
    // A fan with ideal independent deck panels. Stays carry vertical tributary loads.
    // Foundation takes the unbalanced moment; not a continuous deck FE solution.
    for (let i = 0; i <= PANELS; i++) {
      if (i === PANELS / 2) continue
      const x = i * dx - SPAN / 2
      const force = loads[i] * Math.hypot(x, 36) / 36
      add(`stay-${i}`, [x, DECK, 0], [0, 64, 0], force, 'cable')
      const deckCompression = loads.reduce((sum, p, j) => {
        const xx = j * dx - SPAN / 2
        return sum + (Math.sign(xx) === Math.sign(x) && Math.abs(xx) >= Math.abs(x) ? p * Math.abs(xx) / 36 : 0)
      }, 0)
      add(`deck-${i}`, [x, DECK - 1.2, 0], [x - Math.sign(x) * dx, DECK - 1.2, 0], -deckCompression, 'deck')
    }
    towerLeft = DEAD_LOAD * SPAN + truck
    towerRight = 0
    add('tower-middle', [0, 64, 0], [0, -5, 0], -towerLeft, 'tower')
  }
  if (kind !== 'stayed') {
    for (const [x, force] of [[-60, towerLeft], [60, towerRight]]) {
      add(`tower-${x}`, [x, kind === 'suspension' ? 60 : kind === 'arch' ? 0 : DECK, 0], [x, -7, 0], -force, 'tower')
    }
  }
  return { members, left: beam.left, right: beam.right, horizontal, towerLeft, towerRight, anchorUplift, loads, foundationMoment: truck * (beam.a - SPAN / 2), maxMoment: beam.maxMoment }
}
