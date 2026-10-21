import { describe, expect, it } from 'vitest'

import * as THREE from 'three'

import {
  D_MOON_MAX,
  D_MOON_MEAN,
  D_MOON_MIN,
  EARTH_UMBRA_LEN,
  KM_PER_UNIT,
  MOON_UMBRA_MEAN,
  SEASON_LIMIT_DEG,
  SYNODIC_MONTH,
  computeEclipse,
  createEclipseState,
  findScenario,
  nodeSunOffset,
  orbitLookAtShadow,
  seasonWindows,
  type SimState,
} from './eclipses-model'

/*
 * 这个世界的科普价值全靠几何是真的：影锥长度、地面影斑宽度、
 * 全食 / 环食的分界、食季的稀有度都不能是「画上去的」。
 * 下面的期望值全部来自公开天文数值，任何一条挂掉都说明模型被改坏了。
 */

const state = createEclipseState()
function sim(day: number, moonDist = D_MOON_MEAN, tilted = true): SimState {
  return { day, moonDist, speed: 1, playing: false, tilted }
}

describe('eclipse geometry stays true to scale', () => {
  it('puts the Moon’s umbra tip right around Earth’s distance', () => {
    // 月球本影长约 374 000 km；月地距离 356 500 – 406 700 km。
    // 锥尖恰好落在这个区间内，才会有「有时全食、有时环食」。
    expect(MOON_UMBRA_MEAN * KM_PER_UNIT).toBeCloseTo(374_300, -3)
    expect(MOON_UMBRA_MEAN).toBeGreaterThan(D_MOON_MIN)
    expect(MOON_UMBRA_MEAN).toBeLessThan(D_MOON_MAX)
  })

  it('gives Earth a shadow long enough to swallow the Moon', () => {
    // 地球本影长约 1.38e6 km，远超月地距离
    expect(EARTH_UMBRA_LEN * KM_PER_UNIT).toBeCloseTo(1_382_000, -4)
    expect(EARTH_UMBRA_LEN).toBeGreaterThan(D_MOON_MAX * 3)
  })

  it('turns a near Moon into a total eclipse and a far Moon into an annular one', () => {
    const total = findScenario('total-solar')
    computeEclipse(sim(total.day, total.moonDist), state)
    expect(state.kind).toBe('total-solar')
    expect(state.angRatio).toBeGreaterThan(1)

    const annular = findScenario('annular')
    computeEclipse(sim(annular.day, annular.moonDist), state)
    expect(state.kind).toBe('annular')
    expect(state.angRatio).toBeLessThan(1)
  })

  it('keeps the Sun and Moon within a few percent of the same apparent size', () => {
    // 「大 400 倍、远 400 倍」的巧合：角径比全程在 0.90 – 1.08 之间
    for (const dist of [D_MOON_MIN, D_MOON_MEAN, D_MOON_MAX]) {
      computeEclipse(sim(findScenario('total-solar').day, dist), state)
      expect(state.angRatio).toBeGreaterThan(0.9)
      expect(state.angRatio).toBeLessThan(1.08)
    }
  })

  it('makes the totality band a sliver and the penumbra continental', () => {
    const total = findScenario('total-solar')
    computeEclipse(sim(total.day, total.moonDist), state)
    const umbraKm = state.groundUmbraR * KM_PER_UNIT * 2
    const penumbraKm = state.groundPenumbraR * KM_PER_UNIT * 2
    expect(umbraKm).toBeGreaterThan(60)
    expect(umbraKm).toBeLessThan(280) // 真实全食带最宽约 270 km
    expect(penumbraKm).toBeGreaterThan(6_000)
    expect(penumbraKm).toBeLessThan(8_000) // 真实半影约 7 000 km
    expect(penumbraKm / umbraKm).toBeGreaterThan(25)
  })

  it('sizes Earth’s shadow at the Moon the way observers measure it', () => {
    const lunar = findScenario('total-lunar')
    computeEclipse(sim(lunar.day, lunar.moonDist), state)
    expect(state.earthUmbraR * KM_PER_UNIT).toBeCloseTo(4_600, -3)
    expect(state.earthPenumbraR * KM_PER_UNIT).toBeCloseTo(8_200, -3)
    expect(state.kind).toBe('total-lunar')
    expect(state.umbralCoverage).toBeCloseTo(1, 3)
  })
})

describe('eclipses stay rare because the orbit is tilted', () => {
  it('misses on most new moons', () => {
    let newMoons = 0
    let solarEclipses = 0
    let wasNew = false
    for (let day = 0; day < 365.25 * 3; day += 0.02) {
      computeEclipse(sim(day), state)
      // 用黄经月相判断朔：有倾角时真实角距永远到不了 0
      const isNew = Math.min(state.phase, Math.PI * 2 - state.phase) < 0.01
      if (isNew && !wasNew) {
        newMoons++
        if (state.obscuration > 0.004) solarEclipses++
      }
      wasNew = isNew
    }
    // 三年约 37 个朔；其中只有少数能对上。若倾角被去掉，这条会立刻挂。
    expect(newMoons).toBeGreaterThan(30)
    expect(solarEclipses).toBeGreaterThan(0)
    expect(solarEclipses / newMoons).toBeLessThan(0.45)
  })

  it('gives every new moon an eclipse once the tilt is switched off', () => {
    let newMoons = 0
    let solarEclipses = 0
    let wasNew = false
    for (let day = 0; day < SYNODIC_MONTH * 6; day += 0.01) {
      computeEclipse(sim(day, D_MOON_MEAN, false), state)
      const isNew = Math.min(state.phase, Math.PI * 2 - state.phase) < 0.01
      if (isNew && !wasNew) {
        newMoons++
        if (state.obscuration > 0.004) solarEclipses++
      }
      wasNew = isNew
    }
    expect(newMoons).toBeGreaterThan(3)
    expect(solarEclipses).toBe(newMoons)
  })

  it('marks a couple of narrow eclipse seasons per year', () => {
    // 食季每 173.3 天回来一次，一年放得下 2 段完整的 + 边上可能露出一小段
    const windows = seasonWindows(0, 365.25)
    expect(windows.length).toBeGreaterThanOrEqual(2)
    expect(windows.length).toBeLessThanOrEqual(3)
    const covered = windows.reduce((sum, [a, b]) => sum + (b - a), 0)
    expect(covered / 365.25).toBeLessThan(0.27)
  })

  it('sends the shadow cone far off Earth on an ordinary new moon', () => {
    const miss = findScenario('miss')
    computeEclipse(sim(miss.day, miss.moonDist), state)
    // 黄经上是标准的朔，但真实角距有 5° 上下 —— 是日面直径的十倍开外
    expect(Math.min(state.phase, Math.PI * 2 - state.phase)).toBeLessThan(0.03)
    expect(state.elongation).toBeGreaterThan(state.sunAngRadius * 10)
    expect(state.obscuration).toBe(0)
    expect(Math.abs(state.latitudeOffset)).toBeGreaterThan(2)
  })

  it('aligns the node line with the Sun at the start of an eclipse season', () => {
    expect(nodeSunOffset(0)).toBeCloseTo(0, 5)
    computeEclipse(sim(0), state)
    expect(state.inSeason).toBe(true)
  })

  it('puts a new moon one synodic month later outside the eclipse season', () => {
    const offsetDeg = THREE.MathUtils.radToDeg(nodeSunOffset(SYNODIC_MONTH))
    expect(offsetDeg).toBeGreaterThan(SEASON_LIMIT_DEG)
    computeEclipse(sim(SYNODIC_MONTH), state)
    expect(state.inSeason).toBe(false)
  })

  it('flags a hybrid geometry when the umbra tip sits inside Earth', () => {
    const total = findScenario('total-solar')
    computeEclipse(sim(total.day, MOON_UMBRA_MEAN), state)
    expect(state.tipInsideEarth).toBe(true)
  })
})

describe('orbit camera looks down on the umbra from the dayside', () => {
  it('sits above the sunlit hemisphere and keeps Earth in frame', () => {
    const total = findScenario('total-solar')
    computeEclipse(sim(total.day, total.moonDist), state)
    const pos = new THREE.Vector3()
    const target = new THREE.Vector3()
    orbitLookAtShadow(state.shadowSpot, state.moonShadowAxis, pos, target)
    expect(pos.length()).toBeGreaterThan(2.6)
    expect(pos.length()).toBeLessThan(4.2)
    expect(pos.dot(state.shadowSpot)).toBeGreaterThan(0)
    expect(pos.x).toBeLessThan(0)
    expect(target.distanceTo(state.shadowSpot)).toBeLessThan(1.1)
    expect(pos.distanceTo(target)).toBeGreaterThan(2.2)
  })
})

describe('perceived daylight hides the eclipse until the very end', () => {
  it('stays bright at 90% obscuration and collapses only at totality', () => {
    const total = findScenario('total-solar')
    // 遮住 90% 时天光仍有近一半，这是真实观测感受
    const sample = createEclipseState()
    computeEclipse(sim(total.day, total.moonDist), sample)
    expect(sample.daylight).toBeLessThan(0.2)

    let brightAt90 = 0
    for (let d = total.day - 0.12; d < total.day; d += 0.0005) {
      computeEclipse(sim(d, total.moonDist), sample)
      if (sample.obscuration > 0.88 && sample.obscuration < 0.92) {
        brightAt90 = sample.daylight
        break
      }
    }
    expect(brightAt90).toBeGreaterThan(0.4)
  })
})
