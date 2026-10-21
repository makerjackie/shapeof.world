import { describe, expect, it } from 'vitest'

import { archivedWorldIds, getAdjacentWorld, getPublicWorld, getRelatedWorlds, getTodayWorlds, getWorld, indexedWorlds, rightsBlockedWorldIds, worlds } from './worlds'

describe('world catalogue', () => {
  it('keeps every route id unique', () => {
    expect(new Set(worlds.map((world) => world.id)).size).toBe(worlds.length)
  })

  it('keeps the retired tectonic explorer out of the public catalogue', () => {
    expect(worlds.some((world) => world.id === 'tectonic-explorer')).toBe(false)
  })

  it('keeps archived worlds out of discovery while preserving their direct records', () => {
    expect(worlds.length).toBeGreaterThan(0)
    expect(worlds.some((world) => archivedWorldIds.has(world.id))).toBe(false)
    expect([...archivedWorldIds]
      .filter((id) => !rightsBlockedWorldIds.has(id))
      .every((id) => Boolean(getWorld(id)))).toBe(true)
    expect([...archivedWorldIds].every((id) => getPublicWorld(id) === undefined)).toBe(true)
    expect(worlds.map((world) => world.index)).toEqual(
      Array.from({length: worlds.length}, (_, index) => String(index + 1).padStart(2, '0')),
    )
  })

  it('does not keep rights-blocked world records in the catalogue', () => {
    expect([...rightsBlockedWorldIds]).toEqual([])
    for (const id of [
      'armstrong-suit',
      'cassiopeia-a',
      'triceratops-reconstruction',
      'wright-flyer',
      'cosmic-buddha',
      'woolly-mammoth',
      'organ-atlas',
      'cell-architecture',
      'human-anatomy',
    ]) {
      expect(archivedWorldIds.has(id), id).toBe(false)
      expect(worlds.some((world) => world.id === id), id).toBe(false)
      expect(getPublicWorld(id), id).toBeUndefined()
      expect(getWorld(id), id).toBeUndefined()
    }
  })

  it('keeps rebuilt cosmic worlds public', () => {
    for (const id of ['aurora', 'galaxy-collision']) {
      expect(archivedWorldIds.has(id), id).toBe(false)
      expect(worlds.some((world) => world.id === id), id).toBe(true)
    }
  })

  it('removed the 2026-10-16 archived worlds from the catalogue entirely', () => {
    const removedIds = [
      'comet',
      'exoplanet-atmosphere',
      'lagrange-points',
      'saturn-rings',
      'voyager',
      'n-body-gravity',
      'additive-synthesis',
      'crystal-structure',
      'quantum-tunneling',
      'tectonic-plates',
      'greenhouse-effect',
      'gravity-and-orbits',
      'neuron-signal',
      'projectile-motion',
      'gene-expression',
      'circuit-lab',
      'natural-selection',
      'energy-skate-park',
      'wave-interference',
      'molecule-shapes',
      'molecules-and-light',
      'two-mynas',
      'global-quake-pulse',
      'density-volume',
      'force-network',
      'soft-drops',
      'slight-preference',
      'lissajous',
      'tower-stack',
      'parallax-window',
      'impact-fracture',
      'impossible-path',
      'stereographic',
      'evolution-of-trust',
      'systems-loop',
      'illusion-lilac-chaser',
      'illusion-rotating-snakes',
      'illusion-motion-blindness',
      'illusion-checker-shadow',
      'illusion-simultaneous-contrast',
      'illusion-color-dove',
      'illusion-cornsweet',
      'illusion-white',
      'illusion-ebbinghaus',
      'illusion-muller-lyer',
      'illusion-cafe-wall',
      'illusion-shepard-tables',
      'illusion-kanizsa',
      'illusion-penrose',
      'illusion-hollow-mask',
      'illusion-ames-window',
      'illusion-necker',
      'illusion-phi-motion',
      'illusion-colour-adaptation',
      'entropy-box',
      'monte-carlo-pi',
      'building-sunlight',
      'protein-shape-atlas',
      'pi-collision',
      'cadre-ladder',
      'beef-hotpot',
      'beaker-reactions',
      'la-intro',
      'la-01-solution-count',
      'la-why',
      'la-proto-lab',
      'la-first-lecture',
      'stock-market-map',
      'dark-universe',
      'cosmic-dark',
    ]

    for (const id of removedIds) {
      expect(getWorld(id), id).toBeUndefined()
      expect(getPublicWorld(id), id).toBeUndefined()
    }
  })

  it('retires every PhET lab and the low-value two-mynas world', () => {
    expect(worlds.some((world) => world.renderer.startsWith('phet-'))).toBe(false)
    expect(worlds.some((world) => world.id === 'two-mynas')).toBe(false)
  })

  it('produces three distinct daily discoveries deterministically', () => {
    const date = new Date('2026-07-11T12:00:00Z')
    const first = getTodayWorlds(date)
    const second = getTodayWorlds(date)

    expect(first.map((world) => world.id)).toEqual(
      second.map((world) => world.id),
    )
    expect(new Set(first.map((world) => world.id)).size).toBe(3)
  })

  it('resolves every related world', () => {
    for (const world of worlds) {
      expect(getWorld(world.id)).toBe(world)
      expect(getRelatedWorlds(world)).toHaveLength(world.related.length)
    }
  })

  it('moves through the numbered catalogue in ascending order and wraps cleanly', () => {
    expect(indexedWorlds.map((world) => world.index)).toEqual(
      worlds.map((world) => world.index).sort((left, right) => Number(left) - Number(right)),
    )

    for (const [index, world] of indexedWorlds.entries()) {
      expect(getAdjacentWorld(world)).toBe(indexedWorlds[(index + 1) % indexedWorlds.length])
      expect(getAdjacentWorld(world, -1)).toBe(
        indexedWorlds[(index - 1 + indexedWorlds.length) % indexedWorlds.length],
      )
    }
  })
})
