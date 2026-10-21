import { rosetteBitmap } from '../art/guilloche'
import { INK, NOTE_INK } from '../art/palette'
import { PROFILES, stackHeight, type Locale, type Profile } from '../money-model'
import { easeInOut, easeOut, smooth, Tween } from './anim'
import { NoteView, type NoteLabels, type Rect } from './note-view'
import { StackView, type StackLabels } from './stack-view'

export type SceneLabels = NoteLabels & StackLabels

export type SceneMode = 'note' | 'life' | 'ruler'

export type SceneStatus = {
  mode: SceneMode
  itemId: string | null
  cutsDone: number
  hops: number
  finished: boolean
  targetId: string | null
}

/** Story act ids in order; the component maps them to GuideTour steps. */
export const ACTS = ['lifetime', 'cut', 'every-cent', 'tax', 'ruler', 'another'] as const
export type ActId = (typeof ACTS)[number]

/** Which ruler stops the story visits for each profile. */
export const STORY_STOPS: Record<Profile['id'], ReadonlyArray<string>> = {
  cn: ['tencent-day', 'defense', 'gdp'],
  us: ['apple-day', 'defense', 'gdp'],
}
export const STORY_ITEMS: Record<Profile['id'], { first: string; second: string }> = {
  cn: { first: 'meal', second: 'fuel' },
  us: { first: 'meal', second: 'phone' },
}

const LIFE_VIEW = Math.log(3.3)

export type MoneyScene = ReturnType<typeof createMoneyScene>

export function createMoneyScene(
  canvas: HTMLCanvasElement,
  init: { profile: Profile; locale: Locale; labels: SceneLabels; onStatus?: (status: SceneStatus) => void },
) {
  const ctx = canvas.getContext('2d')
  let profile = init.profile
  let locale = init.locale
  let labels = init.labels
  let width = 0
  let height = 0
  let dpr = 1
  let now = 0
  let last = 0
  let frame = 0
  let disposed = false
  let reduced = false
  let focus: Rect = { x: 0, y: 0, w: 1, h: 1 }
  const focusX = new Tween(0)
  const focusY = new Tween(0)
  const focusW = new Tween(1)
  const focusH = new Tween(1)
  let focusReady = false

  const note = new NoteView(profile)
  const stack = new StackView(profile)
  const noteness = new Tween(0)
  const zoomIn = new Tween(0)
  let mode: SceneMode = 'life'
  let itemId: string | null = null
  let pendingAssemble = false
  let manualZoom = false
  let lastStatus = ''
  let timers: Array<{ at: number; run: () => void }> = []
  /** The last scene command, replayed when the data profile changes. */
  let replay: (() => void) | null = null

  const at = (delay: number, run: () => void) => timers.push({ at: now + delay, run })
  const clearTimers = () => {
    timers = []
  }

  function currentFocus(): Rect {
    if (!focusReady) return focus
    return { x: focusX.value(now), y: focusY.value(now), w: focusW.value(now), h: focusH.value(now) }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    dpr = Math.min(2, window.devicePixelRatio || 1)
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }

  function flowFor(id: string) {
    if (id === 'average') return profile.basket
    return profile.items.find((item) => item.id === id) ?? profile.items[0]
  }

  function stackTopRect(): Rect {
    return { ...stack.lastTop }
  }

  function toNote(id: string, entry: 'stack' | 'below', autoStart: number, pace = { first: 1.4, decay: 0.8, floor: 0.6 }) {
    mode = 'note'
    itemId = id
    pendingAssemble = false
    const from = entry === 'stack' && noteness.value(now) < 0.5 ? stackTopRect() : null
    note.load(profile, flowFor(id), now + (from ? 0.35 : 0), from)
    noteness.go(now, 1, from ? 0.9 : 0.5, easeInOut)
    zoomIn.go(now, from ? 1 : zoomIn.value(now), 1.1, easeInOut)
    if (reduced) {
      noteness.set(1)
      note.complete(now, false)
      return
    }
    if (autoStart >= 0) note.autoCut(now + autoStart, pace.first, pace.decay, pace.floor)
  }

  function toStack(nextMode: SceneMode) {
    mode = nextMode
    noteness.go(now, 0, reduced ? 0 : 0.9, easeInOut)
    zoomIn.go(now, 0, reduced ? 0 : 1.1, easeInOut)
  }

  function frameColumn(h: number, duration: number, extra = 1) {
    const view = Math.log(StackView.frameFor(h) * extra)
    stack.logH.go(now, view, reduced ? 0 : duration, easeInOut)
  }

  function goPair() {
    const pair = profile.pair
    stack.target = null
    stack.columnLabel.go(now, 0, 0.3)
    stack.pairT.go(now, 1, reduced ? 0 : 0.7)
    const tall = stackHeight(Math.max(pair.left.revenue, pair.right.revenue))
    const short = stackHeight(Math.max(pair.left.profit, pair.right.profit, Math.min(pair.left.revenue, pair.right.revenue)))
    frameColumn(tall, reduced ? 0 : 2.4)
    // Then drop to profit level, where the smaller company stands taller.
    at(reduced ? 0 : 3.4, () => frameColumn(short, 2.4, 1.15))
    manualZoom = false
  }

  function goRuler(targetId: string, duration = 3.2) {
    stack.pairT.go(now, 0, reduced ? 0 : 0.5)
    if (targetId === 'pair') {
      goPair()
      return
    }
    const target = profile.ruler.find((r) => r.id === targetId) ?? profile.ruler[0]
    stack.target = target.id === 'life' ? null : target
    const h = target.id === 'life' ? stack.lifeHeight() : stackHeight(target.amount)
    stack.column.go(now, Math.max(stack.lifeHeight(), h), reduced ? 0 : duration, easeInOut)
    const toMoon = target.id === 'gdp' && h > 3e7 ? (384400e3 * 1.06) / (h * 1.32) : 1
    frameColumn(h, duration, Math.max(1, toMoon))
    stack.columnLabel.go(now, target.id === 'life' ? 0 : 1, 0.5, easeOut, reduced ? 0 : 0.2)
    manualZoom = false
  }

  function resetStack() {
    stack.buildFrom = null
    stack.bands.go(now, 0, 0.5)
    stack.highlight = null
    stack.highlightT.go(now, 0, 0.4)
    stack.defenseT.go(now, 0, 0.3)
    stack.columnLabel.go(now, 0, 0.3)
    stack.yearCounter.go(now, 0, 0.3)
  }

  function act(id: ActId) {
    replay = () => act(id)
    clearTimers()
    const stops = STORY_STOPS[profile.id]
    const items = STORY_ITEMS[profile.id]
    const narrow = width < 720
    stack.colFrac.go(now, narrow ? 0.38 : 0.42, 0.6)
    if (id === 'lifetime') {
      toStack('life')
      resetStack()
      stack.target = null
      stack.column.go(now, stack.lifeHeight(), 0.6)
      stack.logH.go(now, LIFE_VIEW, 0.9)
      stack.build.set(reduced ? 1 : 0)
      stack.buildFrom = null
      if (!reduced) {
        stack.build.go(now, 1, 5.4, easeInOut, 0.5)
        stack.buildFrom = now + 0.5 - 1.0
        stack.buildTo = now + 5.9 - 1.0
      }
      stack.yearCounter.go(now, 1, 0.6, easeOut, 0.3)
    } else if (id === 'cut') {
      stack.build.set(1)
      stack.logH.go(now, LIFE_VIEW, 0.4)
      resetStack()
      toNote(items.first, 'stack', 1.7, { first: 2.6, decay: 0.62, floor: 0.6 })
    } else if (id === 'every-cent') {
      if (mode !== 'note' || itemId !== items.first) {
        toNote(items.first, 'below', -1)
        note.complete(now, false)
      } else if (note.tailAt === null || note.finishedAt > now + 0.6) {
        note.complete(now, false)
      }
      note.assemble(now + (reduced ? -3 : 0.25))
    } else if (id === 'tax') {
      toStack('life')
      stack.buildFrom = null
      stack.target = null
      stack.build.set(1)
      stack.column.go(now, stack.lifeHeight(), 0.5)
      stack.logH.go(now, LIFE_VIEW, 0.8)
      stack.columnLabel.go(now, 0, 0.3)
      stack.yearCounter.go(now, 0, 0.3)
      stack.bandMode = 'dest'
      stack.morph.set(0)
      const d = reduced ? 0 : 1
      stack.bands.go(now, 1, 1.2 * d, easeInOut, 0.8 * d)
      stack.highlight = 'tax'
      stack.highlightT.go(now, 1, 0.8 * d, easeInOut, 2.4 * d)
      stack.defenseT.go(now, 1, 0.8 * d, easeOut, 3.6 * d)
    } else if (id === 'ruler') {
      toStack('ruler')
      resetStack()
      stack.build.set(1)
      if (reduced) {
        goRuler(stops[stops.length - 1], 0)
      } else {
        stack.column.set(stack.lifeHeight())
        stack.logH.go(now, LIFE_VIEW, 0.5)
        stops.forEach((stop, i) => at(0.6 + i * 4.4, () => goRuler(stop, i === stops.length - 1 ? 3.6 : 3)))
      }
    } else if (id === 'another') {
      resetStack()
      toNote(items.second, 'below', 0.9, { first: 2.0, decay: 0.55, floor: 0.45 })
      pendingAssemble = true
    }
  }

  function status(): SceneStatus {
    return {
      mode,
      itemId,
      cutsDone: note.cutsDone(now),
      hops: note.shown,
      finished: mode === 'note' && note.tailAt !== null && now >= note.finishedAt,
      targetId: stack.target?.id ?? (mode === 'ruler' ? 'life' : null),
    }
  }

  function drawBackground(f: Rect) {
    if (!ctx) return
    ctx.fillStyle = INK.ground
    ctx.fillRect(0, 0, width, height)
    const g = ctx.createRadialGradient(f.x + f.w / 2, f.y + f.h * 0.45, 0, f.x + f.w / 2, f.y + f.h * 0.45, Math.max(width, height) * 0.75)
    g.addColorStop(0, 'rgba(32, 44, 38, 0.55)')
    g.addColorStop(0.55, 'rgba(12, 18, 15, 0.2)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
    const size = Math.min(1600, Math.max(width, height) * 1.1)
    const bmp = rosetteBitmap('watermark', NOTE_INK[profile.id].glow, Math.min(1400, size), 1)
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.translate(f.x + f.w / 2, f.y + f.h * 0.48)
    ctx.rotate(now * 0.012)
    ctx.drawImage(bmp, -size / 2, -size / 2, size, size)
    ctx.restore()
  }

  function render() {
    if (!ctx) return
    ctx.globalAlpha = 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const f = currentFocus()
    drawBackground(f)
    const n = noteness.value(now)
    const z = zoomIn.value(now)
    stack.render(ctx, now, f, labels, locale, 1 - smooth(n * 1.25), z)
    note.render(ctx, now, f, posterMode ? { ...labels, quiet: true } : labels, locale, smooth(n), dpr)
    // Edge vignette keeps overlays readable.
    const v = ctx.createLinearGradient(0, 0, 0, height)
    v.addColorStop(0, 'rgba(4, 7, 6, 0.55)')
    v.addColorStop(0.12, 'rgba(4, 7, 6, 0)')
    v.addColorStop(0.86, 'rgba(4, 7, 6, 0)')
    v.addColorStop(1, 'rgba(4, 7, 6, 0.5)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, width, height)
  }

  function tick(ts: number) {
    if (disposed) return
    frame = requestAnimationFrame(tick)
    if (document.hidden) {
      last = ts
      return
    }
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0
    last = ts
    now += dt
    if (timers.length) {
      const due = timers.filter((x) => x.at <= now)
      timers = timers.filter((x) => x.at > now)
      due.forEach((x) => x.run())
    }
    if (pendingAssemble && mode === 'note' && note.tailAt !== null && now >= note.finishedAt) {
      pendingAssemble = false
      note.assemble(now + 0.2)
    }
    render()
    const s = status()
    const key = JSON.stringify(s)
    if (key !== lastStatus) {
      lastStatus = key
      init.onStatus?.(s)
    }
  }

  // `?poster=1` renders a text-free frame for language-neutral preview posters.
  const posterMode = new URLSearchParams(window.location.search).get('poster') === '1'
  if (ctx && posterMode) ctx.fillText = () => {}

  resize()
  stack.build.set(1)
  stack.column.set(stack.lifeHeight())
  frame = requestAnimationFrame(tick)

  return {
    resize,
    setFocus(rect: Rect, immediate = false) {
      focus = rect
      const d = immediate || !focusReady ? 0 : 0.6
      focusX.go(now, rect.x, d)
      focusY.go(now, rect.y, d)
      focusW.go(now, rect.w, d)
      focusH.go(now, rect.h, d)
      focusReady = true
    },
    setLocale(nextLocale: Locale, nextLabels: SceneLabels) {
      locale = nextLocale
      labels = nextLabels
    },
    setReduced(value: boolean) {
      reduced = value
    },
    setProfile(id: Profile['id']) {
      if (profile.id === id) return
      profile = PROFILES[id]
      note.profile = profile
      stack.profile = profile
      stack.column.set(stack.lifeHeight())
      stack.target = null
      // Never draw one country's flow with the other's destinations.
      if (note.flow) note.load(profile, flowFor(note.flow.id), now)
      replay?.()
    },
    act,
    spend(id: string) {
      replay = () => this.spend(profile.items.some((item) => item.id === id) || id === 'average' ? id : STORY_ITEMS[profile.id].first)
      clearTimers()
      resetStack()
      toNote(id, mode === 'note' ? 'below' : 'stack', 0.9, { first: 2.2, decay: 0.55, floor: 0.5 })
      pendingAssemble = true
    },
    life(layering: 'dest' | 'category') {
      replay = () => this.life(layering)
      clearTimers()
      toStack('life')
      stack.target = null
      stack.build.set(1)
      stack.column.go(now, stack.lifeHeight(), 0.6)
      stack.logH.go(now, LIFE_VIEW, reduced ? 0 : 1)
      stack.columnLabel.go(now, 0, 0.3)
      stack.yearCounter.go(now, 0, 0.3)
      stack.colFrac.go(now, width < 720 ? 0.3 : 0.42, 0.6)
      if (stack.bandMode !== layering) {
        stack.bandMode = layering
        stack.morph.set(1)
        stack.morph.go(now, 0, 0.6)
      }
      stack.bands.go(now, 1, reduced ? 0 : 0.8, easeInOut, 0.2)
      stack.highlight = layering === 'dest' ? 'tax' : null
      stack.highlightT.go(now, layering === 'dest' ? 1 : 0, 0.6, easeInOut, 0.8)
      stack.defenseT.go(now, layering === 'dest' ? 1 : 0, 0.6, easeOut, 1.2)
    },
    highlight(key: string | null) {
      stack.highlight = key
      stack.highlightT.go(now, key ? 1 : 0, 0.4)
    },
    ruler(targetId: string) {
      replay = () => this.ruler(targetId === 'pair' || profile.ruler.some((r) => r.id === targetId) ? targetId : 'gdp')
      clearTimers()
      if (mode !== 'ruler') {
        toStack('ruler')
        resetStack()
        stack.build.set(1)
      }
      stack.colFrac.go(now, width < 720 ? 0.3 : 0.4, 0.6)
      goRuler(targetId)
    },
    /** Wheel / drag zoom in the ruler: positive zooms out. */
    zoom(delta: number) {
      if (mode !== 'ruler') return
      manualZoom = true
      const current = stack.logH.value(now)
      const next = Math.max(Math.log(2.8), Math.min(Math.log(4.6e8), current + delta))
      stack.logH.go(now, next, 0.25, easeOut)
    },
    /** Canvas tap: cuts the note or picks a band. Returns true when consumed. */
    tap(x: number, y: number): boolean {
      if (mode === 'note') {
        const r = note.restRect(currentFocus())
        const inside = x > r.x - 30 && x < r.x + r.w + 30 && y > r.y - 40 && y < r.y + r.h + 40
        if (!inside) return false
        if (note.assembleAt !== null && now > note.assembleAt + 1) {
          const id = itemId ?? 'meal'
          toNote(id, 'below', 0.6, { first: 2.2, decay: 0.55, floor: 0.5 })
          pendingAssemble = true
          return true
        }
        if (note.canCut(now)) {
          // Pull the next scheduled cut forward to now.
          const k = note.cutsDone(now)
          if (k < note.cuts.length) {
            const shift = note.cuts[k] - now
            if (shift > 0.05) {
              note.cuts = note.cuts.map((c, i) => (i >= k ? c - shift : c))
              note.strips.forEach((s) => {
                if (s.hop >= k) {
                  s.launch -= shift
                  s.land -= shift
                }
              })
              if (note.tailAt !== null) note.tailAt -= shift
            }
          } else {
            note.cut(now)
          }
          return true
        }
        return true
      }
      return false
    },
    /** Keyboard equivalent of tapping the note. */
    tapNote(): boolean {
      if (mode !== 'note') return false
      const r = note.restRect(currentFocus())
      return this.tap(r.x + r.w / 2, r.y + r.h / 2)
    },
    status,
    /** Scene clock in seconds (for deterministic capture checks). */
    clock: () => now,
    get manualZoom() {
      return manualZoom
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
    },
  }
}
