import { describe, expect, it } from 'vitest'

import { getPublicWorldSummary } from '~/data/world-summaries'
import { worldMatchesSearch } from './world-search'

describe('worldMatchesSearch', () => {
  const blackHole = getPublicWorldSummary('black-hole-flyby')!

  it('matches Chinese and English catalogue copy', () => {
    expect(worldMatchesSearch(blackHole, '黑洞')).toBe(true)
    expect(worldMatchesSearch(blackHole, 'hover')).toBe(true)
  })

  it('does not broaden a keyword through the domain tagline', () => {
    const skyAtlas = getPublicWorldSummary('eclipses')!
    expect(worldMatchesSearch(skyAtlas, '黑洞')).toBe(false)
  })

  it('matches route-style names with natural spacing', () => {
    expect(worldMatchesSearch(blackHole, 'black hole flyby')).toBe(true)
  })

  it('treats slug punctuation and spacing as equivalent', () => {
    expect(worldMatchesSearch(blackHole, 'black-hole-flyby')).toBe(true)
    expect(worldMatchesSearch(blackHole, 'blackholeflyby')).toBe(true)
  })

  it('extracts world names from paths and shared URLs', () => {
    expect(worldMatchesSearch(blackHole, '/explore/black-hole-flyby')).toBe(true)
    expect(worldMatchesSearch(blackHole, 'https://shapeof.world/explore/black-hole-flyby?shared=1')).toBe(true)
  })

  it('finds another world by its URL name', () => {
    const solarSystem = getPublicWorldSummary('solar-system')!
    expect(worldMatchesSearch(solarSystem, 'solar system')).toBe(true)
    expect(worldMatchesSearch(solarSystem, 'solar-system')).toBe(true)
  })

  it('ignores compatibility and case differences', () => {
    expect(worldMatchesSearch(blackHole, '  ＧＲＡＶＩＴＹ  ')).toBe(true)
  })

  it('rejects unrelated queries', () => {
    expect(worldMatchesSearch(blackHole, 'ferrofluid')).toBe(false)
  })

  it('finds recent public worlds by Chinese keywords', () => {
    const chemicalGarden = getPublicWorldSummary('periodic-table')!
    const entanglement = getPublicWorldSummary('standard-model')!
    const butterfly = getPublicWorldSummary('butterfly-effect')!

    expect(worldMatchesSearch(chemicalGarden, '元素')).toBe(true)
    expect(worldMatchesSearch(chemicalGarden, 'periodic')).toBe(true)
    expect(worldMatchesSearch(entanglement, '量子')).toBe(true)
    expect(worldMatchesSearch(entanglement, '粒子')).toBe(true)
    expect(worldMatchesSearch(butterfly, '蝴蝶')).toBe(true)
  })
})
