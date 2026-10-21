import { describe, expect, it } from 'vitest'
import { getPathContext } from '~/data/content-graph'
import astronomyPath from '~/data/content-graph/paths/earth-to-solar-system'
import { loadWorldPathNavigation } from './world-path-navigation'

const loadWorld = async (id: string) => ({ title: id, translations: { en: { title: id } } })

describe('world series discovery', () => {
  it('keeps the astronomy sequence bidirectional and ends without wrapping', async () => {
    const [path] = await loadWorldPathNavigation('eclipses', [astronomyPath], loadWorld)
    expect(path.stops.map((stop) => stop.worldId)).toEqual(['earth-spin-orbit', 'eclipses', 'solar-system', 'galaxy-collision'])
    expect(path.stops[1]).toMatchObject({ title: '日食与月食', titleEn: 'Eclipses' })
    expect(getPathContext(path.id, 'eclipses')).toMatchObject({ prevWorldId: 'earth-spin-orbit', nextWorldId: 'solar-system' })
    expect(getPathContext(path.id, 'solar-system')?.nextWorldId).toBe('galaxy-collision')
    expect(getPathContext(path.id, 'galaxy-collision')).toMatchObject({ prevWorldId: 'solar-system' })
    expect(getPathContext(path.id, 'galaxy-collision')?.nextWorldId).toBeUndefined()
    expect(getPathContext(path.id, 'unrelated')).toBeUndefined()
  })
  it('does not expose a series with a missing or nonpublic member', async () => {
    expect(await loadWorldPathNavigation('eclipses', [astronomyPath], async (id) => id === 'solar-system' ? undefined : loadWorld(id))).toEqual([])
  })
  it('does not expose draft or unrelated routes', async () => {
    expect(await loadWorldPathNavigation('eclipses', [{ ...astronomyPath, publication: 'draft' }], loadWorld)).toEqual([])
    expect(await loadWorldPathNavigation('unrelated', [astronomyPath], loadWorld)).toEqual([])
  })
})
