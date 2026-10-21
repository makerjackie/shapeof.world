import { describe, expect, it } from 'vitest'

import { createWarmupGate } from '~/lib/world-prefetch'

function harness(options?: { settleMs?: number; maxHoldMs?: number }) {
  const timers: Array<{ run: () => void; delayMs: number }> = []
  const warmed: string[] = []
  const gate = createWarmupGate((run, delayMs) => { timers.push({ run, delayMs }) }, options)
  const warm = (id: string) => { warmed.push(id) }
  const runTimers = (delayMs: number) => {
    for (const timer of timers.splice(0).filter((item) => item.delayMs === delayMs)) timer.run()
  }
  return { gate, warm, warmed, timers, runTimers }
}

describe('world warm-up gate', () => {
  it('warms immediately when no world is loading', () => {
    const { gate, warm, warmed } = harness()
    gate.request('aurora', warm)
    expect(warmed).toEqual(['aurora'])
  })

  it('queues other worlds while a renderer loads and starts them after it paints', () => {
    const { gate, warm, warmed, runTimers } = harness({ settleMs: 3000 })
    gate.hold('periodic-table')
    gate.request('electron-clouds', warm)
    gate.request('periodic-table', warm)
    expect(warmed).toEqual(['periodic-table'])
    gate.release('periodic-table')
    expect(warmed).toEqual(['periodic-table'])
    runTimers(3000)
    expect(warmed).toEqual(['periodic-table', 'electron-clouds'])
  })

  it('re-queues a flushed warm-up when another world started loading meanwhile', () => {
    const { gate, warm, warmed, timers } = harness({ settleMs: 3000 })
    gate.hold('a')
    gate.request('c', warm)
    gate.release('a')
    gate.hold('b')
    timers.find((timer) => timer.delayMs === 3000)!.run()
    expect(warmed).toEqual([])
    gate.release('b')
    timers.filter((timer) => timer.delayMs === 3000).at(-1)!.run()
    expect(warmed).toEqual(['c'])
  })

  it('expires a hold that is never released and ignores stale releases', () => {
    const { gate, warm, warmed, timers } = harness({ settleMs: 10, maxHoldMs: 20000 })
    gate.hold('a')
    gate.request('b', warm)
    gate.release('other')
    expect(warmed).toEqual([])
    timers.find((timer) => timer.delayMs === 20000)!.run()
    timers.filter((timer) => timer.delayMs === 10).at(-1)!.run()
    expect(warmed).toEqual(['b'])
  })
})
