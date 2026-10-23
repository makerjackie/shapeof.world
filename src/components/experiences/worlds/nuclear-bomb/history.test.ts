import {describe, expect, it} from 'vitest'

import {HISTORY_EVENTS, parseHistoryDate, TEST_INTERVALS, wholeCalendarMonths} from './history'

describe('public historical chronology', () => {
  it('contains valid chronological dates, preserving month-only precision', () => {
    const times = HISTORY_EVENTS.map((event) => parseHistoryDate(event.date).getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(new Set(HISTORY_EVENTS.map((event) => event.id)).size).toBe(HISTORY_EVENTS.length)
    expect(HISTORY_EVENTS[0].date).toBe('1938-12')
    expect(HISTORY_EVENTS.at(-1)?.date).toBe('1996-09-24')
    for (const event of HISTORY_EVENTS) {
      expect(event.title.zh && event.title.en && event.description.zh && event.description.en).toBeTruthy()
      expect(new URL(event.sourceUrl).hostname).toBe('en.wikipedia.org')
      if (event.secondDate) expect(parseHistoryDate(event.secondDate).getTime()).toBeGreaterThan(parseHistoryDate(event.date).getTime())
    }
  })

  it('rejects invalid dates rather than allowing calendar rollover', () => {
    for (const value of ['1964-13-01', '1967-02-29', '1967-06-31', '1967-00', '1967-06-00', '1967/06/17', '1967-6-17']) {
      expect(() => parseHistoryDate(value)).toThrow(RangeError)
    }
    expect(parseHistoryDate('1964-02-29').toISOString()).toBe('1964-02-29T00:00:00.000Z')
    expect(parseHistoryDate('1938-12').toISOString()).toBe('1938-12-01T00:00:00.000Z')
  })
})

describe('elapsed whole calendar months', () => {
  it('computes the five historical intervals from the source dates', () => {
    expect(TEST_INTERVALS.map(({first, later}) => wholeCalendarMonths(first.date, later.date))).toEqual([87, 74, 61, 102, 32])
    for (const interval of TEST_INTERVALS) {
      expect(parseHistoryDate(interval.first.date).getTime()).toBeLessThan(parseHistoryDate(interval.later.date).getTime())
      expect(new URL(interval.first.sourceUrl).hostname).toBe('en.wikipedia.org')
      expect(new URL(interval.later.sourceUrl).hostname).toBe('en.wikipedia.org')
    }
  })

  it('keeps the Chinese interval at 32 months without rounding the additional day', () => {
    expect(wholeCalendarMonths('1964-10-16', '1967-06-17')).toBe(32)
    expect(wholeCalendarMonths('1964-10-16', '1967-06-15')).toBe(31)
    expect(wholeCalendarMonths('1964-10-16', '1967-06-16')).toBe(32)
    expect(wholeCalendarMonths('1964-10-16', '1964-10-16')).toBe(0)
  })

  it('requires full dates and forward intervals', () => {
    expect(() => wholeCalendarMonths('1964-10', '1967-06-17')).toThrow(RangeError)
    expect(() => wholeCalendarMonths('1967-06-17', '1964-10-16')).toThrow(RangeError)
  })
})
