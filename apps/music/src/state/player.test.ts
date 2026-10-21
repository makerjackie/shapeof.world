// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { tracks } from '~/data/catalog'
import { PlayerProvider, usePlayer } from './player'

class TestAudio extends EventTarget {
  static latest: TestAudio
  constructor() { super(); TestAudio.latest = this }
  src = ''
  currentTime = 0
  duration = 1
  volume = 1
  preload = 'none'
  loop = false
  paused = true
  play = vi.fn(async () => { this.paused = false; this.dispatchEvent(new Event('play')) })
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  load() {}
  getAttribute(name: string) { return name === 'src' ? this.src : null }
  removeAttribute() { this.src = '' }
}

const host = document.createElement('div')
const root = createRoot(host)
let player: ReturnType<typeof usePlayer>
function Probe() { player = usePlayer(); return null }
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('Audio', TestAudio)
  await act(async () => root.render(createElement(PlayerProvider, {children:createElement(Probe)})))
})
afterEach(async () => { await act(async () => root.render(null)); vi.unstubAllGlobals() })

it('stops a single sound effect at its end instead of repeating it', async () => {
  const effect = {...tracks[0], id:'effect', kind:'sfx' as const}
  await act(async () => player.playTrack(effect))
  await act(async () => TestAudio.latest.dispatchEvent(new Event('ended')))
  expect(player.playing).toBe(false)
  expect(TestAudio.latest.play).toHaveBeenCalledTimes(1)
})

it('switches the same track between its original and verified loop asset', async () => {
  const original = {...tracks[0], id:'loop-test', assets:{preview:'https://example.com/preview.mp3',master:'https://example.com/master.mp3',loop:'https://example.com/loop.wav'}, loop:{seamless:true,asset:'loop' as const}}
  await act(async () => player.playTrack(original))
  expect(TestAudio.latest.loop).toBe(false)
  const derivative = {...original, assets:{...original.assets,preview:original.assets.loop}}
  await act(async () => player.playTrack(derivative))
  expect(TestAudio.latest.src).toBe(original.assets.loop)
  expect(TestAudio.latest.loop).toBe(true)
  await act(async () => player.playTrack(original))
  expect(TestAudio.latest.src).toBe(original.assets.preview)
  expect(TestAudio.latest.loop).toBe(false)
})

it('still advances an explicitly requested multi-track queue', async () => {
  const first = {...tracks[0], id:'first'}
  const second = {...tracks[0], id:'second'}
  await act(async () => player.playTrack(first, [first, second]))
  await act(async () => TestAudio.latest.dispatchEvent(new Event('ended')))
  expect(player.current?.id).toBe('second')
  expect(player.playing).toBe(true)
})
