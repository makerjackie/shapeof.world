import { describe, expect, it } from 'vitest'
import { chapterIndex, chapters, FILM_DURATION, narrativeScene, POSTER_TIME, sceneTimeAt, story, storyIndex } from './light-speed-story'
import { lightClockLegGeometry } from './light-speed-model'

describe('light-speed narrative synchronization', () => {
  it('introduces measurement and units before using them in the chase', () => {
    expect(narrativeScene(15).lesson).toBe('speed')
    expect(narrativeScene(30).lesson).toBe('ball')
    expect(narrativeScene(46).lesson).toBe('unit')
    expect(narrativeScene(62).lesson).toBe('light')
    expect(narrativeScene(62).beta).toBe(.8)
    expect(narrativeScene(76).lesson).toBeUndefined()
  })

  it('keeps the 3–4–5 proof and actual mirrors synchronized after the longer introduction', () => {
    expect(narrativeScene(101).beta).toBe(0)
    for (const time of [128, 139, 145.9]) {
      const state = narrativeScene(time)
      expect(state.beta).toBe(.8)
      expect(state.showGeometry).toBe(true)
      expect(story[storyIndex(time)].proof).toBe('clock')
      const leg = lightClockLegGeometry(state.beta)
      expect(leg.horizontal).toBeCloseTo(4)
      expect(leg.tLab).toBeCloseTo(5)
    }
  })

  it('keeps relative velocity and scene geometry continuous at chapter changes', () => {
    for (const chapter of chapters.slice(1)) {
      const before = narrativeScene(chapter.start - 1e-5)
      const after = narrativeScene(chapter.start + 1e-5)
      expect(after.beta).toBeCloseTo(before.beta, 4)
      expect(after.chapter).toBeCloseTo(before.chapter, 4)
    }
  })

  it('seeks deterministically and keeps each lesson timer local to its own beat', () => {
    const snapshot = narrativeScene(29)
    narrativeScene(420)
    narrativeScene(0)
    expect(narrativeScene(29)).toEqual(snapshot)
    expect(snapshot.lessonTime).toBe(1)
    expect(narrativeScene(28).lessonTime).toBe(0)
    expect(chapterIndex(FILM_DURATION)).toBe(6)
    expect(chapterIndex(POSTER_TIME)).toBe(3)
  })

  it('uses identical events for the 0.6c measurement proof and the rendered ship frame', () => {
    for (const time of [230, 235, 249.9]) {
      const state = narrativeScene(time)
      expect(state.beta).toBeCloseTo(.6)
      expect(state.frame).toBe('ship')
      expect(state.showMeasurements).toBe(true)
      expect(story[storyIndex(time)].proof).toBe('measurements')
      expect(Math.sqrt((1 - state.beta) / (1 + state.beta))).toBeCloseTo(.5)
    }
  })

  it('preserves monotone physical choreography with slower reading time', () => {
    let previous = -1
    for (let t = 0; t <= FILM_DURATION; t += .25) {
      const state = narrativeScene(t)
      expect(state.sceneTime).toBeGreaterThanOrEqual(previous)
      expect(Math.abs(state.beta)).toBeLessThan(1)
      expect(state.chapter).toBeGreaterThanOrEqual(0)
      expect(state.chapter).toBeLessThanOrEqual(6)
      previous = state.sceneTime
    }
    expect(sceneTimeAt(-20)).toBe(0)
    expect(sceneTimeAt(900)).toBe(240)
    expect(narrativeScene(350).refractiveIndex).toBe(1.5)
  })
})
