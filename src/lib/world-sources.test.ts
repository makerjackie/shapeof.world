import { describe, expect, it } from 'vitest'

import { isEngineOnlyPosterSource, isEngineOnlySource, userFacingSources } from './world-sources'

describe('world-sources', () => {
  it('drops React Three Fiber / Three.js source rows', () => {
    expect(
      isEngineOnlySource({
        label: 'React Three Fiber（MIT）',
        labelEn: 'React Three Fiber (MIT)',
        url: 'https://github.com/pmndrs/react-three-fiber',
      }),
    ).toBe(true)
    expect(
      isEngineOnlySource({
        label: 'Three.js（MIT）',
        labelEn: 'Three.js (MIT)',
        url: 'https://github.com/mrdoob/three.js',
      }),
    ).toBe(true)
  })

  it('keeps scientific sources even when the stack is mentioned in passing elsewhere', () => {
    expect(
      isEngineOnlySource({
        label: 'NASA Exoplanet Archive',
        labelEn: 'NASA Exoplanet Archive',
        url: 'https://exoplanetarchive.ipac.caltech.edu/',
      }),
    ).toBe(false)
  })

  it('filters the visitor-facing list but never returns empty when only engines existed', () => {
    const engines = [
      {
        label: 'React Three Fiber（MIT）',
        labelEn: 'React Three Fiber (MIT)',
        url: 'https://github.com/pmndrs/react-three-fiber',
      },
    ]
    expect(userFacingSources({ sources: engines })).toEqual(engines)

    const mixed = [
      ...engines,
      {
        label: '挂谷问题（Wikipedia）',
        labelEn: 'Kakeya problem (Wikipedia)',
        url: 'https://en.wikipedia.org/wiki/Kakeya_set',
      },
    ]
    expect(userFacingSources({ sources: mixed })).toHaveLength(1)
    expect(userFacingSources({ sources: mixed })[0].url).toContain('wikipedia')
  })

  it('flags posterSource lines that only credit the stack', () => {
    expect(isEngineOnlyPosterSource('React Three Fiber · Three.js · 本地构建')).toBe(true)
    expect(isEngineOnlyPosterSource('日影几何 · 本影 / 半影示意')).toBe(false)
  })
})
