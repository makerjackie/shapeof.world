/**
 * FireflySync — deep Canvas 2D adaptation of Nicky Case's fireflies (CC0).
 * Upstream: https://github.com/ncase/fireflies · https://ncase.me/fireflies/
 *
 * Core pulse-coupling (not Kuramoto continuous pull):
 *   each fly has clock 0..1; when clock > 1 → flash, reset, pull neighbors by FLY_PULL.
 * Visuals: Canvas 2D (no PIXI). Audio: ncase forest ambience (CC0 Félix Blume), singleton loop.
 */
import './styles/FireflySync.css'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { SpeakerHigh, SpeakerSlash, WaveSine, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { cancelWorldFrame, requestWorldFrame } from '~/lib/world-playback'
import { FireflyTreeScene } from './FireflyTreeScene'

/* ── ncase-inspired defaults (tuned for clear 10–20s re-sync) ── */
const FLY_LOOP = 40
const FLY_SWERVE = 0.1
const MOUSE_RADIUS = 160
const DEFAULT_CLOCK_SPEED = 0.32
const DEFAULT_PULL = 0.05
const DEFAULT_RADIUS = 200
const FLASH_DECAY = 0.9 // per 60fps frame, like ncase

/** ncase/fireflies forest loop — Félix Blume CC0, singleton (Agents: pausable, no stacked tracks). */
const FOREST_SRC = '/assets/experiences/firefly-sync/forest.mp3'
const FOREST_VOLUME = 0.55
let forestAudio: HTMLAudioElement | null = null

function getForestAudio(): HTMLAudioElement {
  if (!forestAudio) {
    const el = new Audio(FOREST_SRC)
    el.loop = true
    el.preload = 'auto'
    el.volume = FOREST_VOLUME
    forestAudio = el
  }
  return forestAudio
}

async function setForestPlaying(wantPlay: boolean) {
  const el = getForestAudio()
  if (!wantPlay) {
    el.pause()
    return
  }
  try {
    await el.play()
  } catch {
    // Autoplay blocked until a user gesture — freebar / canvas interaction will retry.
  }
}

type StoryBeat = 0 | 1 | 2 | 3 | 4 | 5

type SimParams = {
  sync: boolean
  pull: number
  radius: number
  clockSpeed: number
  showClocks: boolean
}

type Firefly = {
  x: number
  y: number
  angle: number
  speed: number
  swerve: number
  clock: number
  flash: number
  depth: number
  hue: number // 0 gold-ish, 1 lime-ish
  chaos: number
  wing: number // 0|1 flap state (ncase frames 3/4)
}

/** ncase sprite atlas frames (350×350 cells in firefly.png). */
const SPRITE_SRC = '/assets/experiences/firefly-sync/firefly.png'
const SPRITE_CELL = 350
// Atlas layout from firefly.json: 2 columns, frames 0–9
const SPRITE_BODY = { col: 0, row: 0 } // firefly0000 — body
const SPRITE_LIT = { col: 1, row: 0 } // firefly0001 — lit abdomen / flash body
const SPRITE_WING_A = { col: 1, row: 1 } // firefly0003
const SPRITE_WING_B = { col: 0, row: 2 } // firefly0004

type PointerState = {
  down: boolean
  x: number
  y: number
}

function seeded(index: number) {
  const value = Math.sin(index * 92.317 + 18.731) * 43_758.5453
  return value - Math.floor(value)
}

function flyCountForArea(width: number, height: number) {
  // Slightly fewer than pure-dot version — each fly draws sprite body + wings
  const area = Math.max(1, width * height)
  const n = Math.round((area * 120) / (1280 * 600))
  return Math.min(180, Math.max(80, n))
}

function makeGlowSprite(inner: string, mid: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const c = 64
  const g = ctx.createRadialGradient(c, c, 0.5, c, c, 62)
  g.addColorStop(0, '#fffef5')
  g.addColorStop(0.05, inner)
  g.addColorStop(0.16, mid)
  g.addColorStop(0.38, `${mid}88`)
  g.addColorStop(0.62, `${mid}28`)
  g.addColorStop(0.85, `${mid}08`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return canvas
}

function makeFireflies(count: number, width: number, height: number): Array<Firefly> {
  return Array.from({ length: count }, (_, i) => ({
    x: seeded(i + 1) * width,
    y: (0.08 + seeded(i + 2_001) * 0.84) * height,
    angle: seeded(i + 3_001) * Math.PI * 2,
    speed: 0.45 + seeded(i + 4_001) * 1.05,
    swerve: (seeded(i + 5_001) - 0.5) * FLY_SWERVE,
    clock: seeded(i + 6_001),
    flash: 0,
    depth: 0.35 + seeded(i + 7_001) * 0.65,
    hue: seeded(i + 8_001),
    chaos: 0,
    wing: i % 2,
  }))
}

function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cell: { col: number; row: number },
  x: number,
  y: number,
  size: number,
  rotation: number,
  alpha: number,
) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.globalAlpha = Math.min(1, alpha)
  const sx = cell.col * SPRITE_CELL
  const sy = cell.row * SPRITE_CELL
  ctx.drawImage(img, sx, sy, SPRITE_CELL, SPRITE_CELL, -size / 2, -size / 2, size, size)
  ctx.restore()
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function FireflyField({
  beat,
  params,
  controls,
  reducedMotion,
  onOrderChange,
  onInteract,
  onUserGesture,
}: {
  beat: StoryBeat
  params: SimParams
  controls: ExperienceControls
  reducedMotion: boolean
  onOrderChange: (value: number) => void
  onInteract: () => void
  /** Unlock forest ambience after browser gesture when sound is wanted. */
  onUserGesture?: () => void
}) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const beatRef = useRef(beat)
  const paramsRef = useRef(params)
  const pointerRef = useRef<PointerState>({ down: false, x: 0, y: 0 })
  const scrambleRef = useRef(0)
  const focusFlashRef = useRef(0) // story: force one flash center

  beatRef.current = beat
  paramsRef.current = params

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 1
    let height = 1
    let dpr = 1
    let frame = 0
    let frameCount = 0
    let lastTime = performance.now()
    let lastOrderEmit = 0
    let smoothedOrder = 0
    let flies = makeFireflies(120, 800, 600)
    let lastBeat: StoryBeat = beatRef.current
    let storyHighlight = -1

    // ncase sprite sheet (CC0) — body + wings, not just light blobs
    const spriteImg = new Image()
    spriteImg.decoding = 'async'
    spriteImg.src = SPRITE_SRC
    let spriteReady = false
    spriteImg.onload = () => {
      spriteReady = true
    }

    const limeGlow = makeGlowSprite('#e8ff9a', '#b8ff4a')
    const goldGlow = makeGlowSprite('#fff0a8', '#ffc857')
    const softGlow = makeGlowSprite('#d0ffe0', '#6ad4a0')

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = flyCountForArea(width, height)
      if (Math.abs(target - flies.length) > 18 || flies.length < 80) {
        // preserve phases when count changes modestly by remaking only if needed
        const old = flies
        flies = makeFireflies(target, width, height)
        for (let i = 0; i < Math.min(old.length, flies.length); i += 1) {
          flies[i].clock = old[i].clock
          flies[i].flash = old[i].flash
        }
      } else {
        // clamp positions into new bounds
        for (const f of flies) {
          if (f.x < -FLY_LOOP) f.x = width + FLY_LOOP
          if (f.x > width + FLY_LOOP) f.x = -FLY_LOOP
          if (f.y < -FLY_LOOP) f.y = height + FLY_LOOP
          if (f.y > height + FLY_LOOP) f.y = -FLY_LOOP
        }
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const scrambleAll = (strength = 1) => {
      for (const f of flies) {
        f.clock = Math.random()
        f.flash = 0
        f.chaos = strength
      }
    }

    const paintForest = (time: number) => {
      // deep dusk: teal → purple night
      const sky = ctx.createLinearGradient(0, 0, 0, height)
      sky.addColorStop(0, '#050814')
      sky.addColorStop(0.28, '#0a1520')
      sky.addColorStop(0.55, '#0b1a1c')
      sky.addColorStop(0.78, '#071412')
      sky.addColorStop(1, '#030806')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, width, height)

      // cool moon haze (upper right)
      const moon = ctx.createRadialGradient(width * 0.78, height * 0.18, 0, width * 0.78, height * 0.18, width * 0.5)
      moon.addColorStop(0, 'rgba(120, 160, 200, 0.12)')
      moon.addColorStop(0.35, 'rgba(70, 110, 150, 0.05)')
      moon.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = moon
      ctx.fillRect(0, 0, width, height)

      // warm canopy glow from firefly field
      const canopy = ctx.createRadialGradient(width * 0.48, height * 0.58, 0, width * 0.48, height * 0.58, width * 0.55)
      canopy.addColorStop(0, 'rgba(90, 140, 50, 0.04)')
      canopy.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = canopy
      ctx.fillRect(0, 0, width, height)

      // distant tree silhouettes
      ctx.save()
      for (let i = 0; i < 28; i += 1) {
        const x = seeded(i + 150) * width
        const trunkW = 2.5 + seeded(i + 280) * 12
        const sway = Math.sin(time * 0.00007 + i) * 2.4
        const top = height * (0.02 + seeded(i + 490) * 0.28)
        const layer = seeded(i + 600)
        ctx.globalAlpha = 0.35 + layer * 0.45
        ctx.fillStyle = layer > 0.55 ? '#030a0c' : '#020608'
        ctx.beginPath()
        ctx.moveTo(x - trunkW, height)
        ctx.lineTo(x - trunkW * 0.2 + sway, top)
        ctx.lineTo(x + trunkW * 0.28 + sway, top)
        ctx.lineTo(x + trunkW, height)
        ctx.closePath()
        ctx.fill()

        // canopy blob
        if (layer > 0.3) {
          const cy = top + height * 0.04
          const cr = trunkW * (4 + layer * 5)
          const leaf = ctx.createRadialGradient(x + sway, cy, 0, x + sway, cy, cr)
          leaf.addColorStop(0, 'rgba(8, 22, 18, 0.55)')
          leaf.addColorStop(1, 'rgba(4, 10, 10, 0)')
          ctx.fillStyle = leaf
          ctx.beginPath()
          ctx.arc(x + sway, cy, cr, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()

      // ground mist
      const mist = ctx.createLinearGradient(0, height * 0.5, 0, height)
      mist.addColorStop(0, 'rgba(20, 50, 48, 0)')
      mist.addColorStop(0.45, 'rgba(12, 36, 34, 0.14)')
      mist.addColorStop(1, 'rgba(2, 6, 6, 0.82)')
      ctx.fillStyle = mist
      ctx.fillRect(0, height * 0.48, width, height * 0.52)

      // faint stars
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < 40; i += 1) {
        const sx = seeded(i + 900) * width
        const sy = seeded(i + 1_100) * height * 0.42
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.0015 + i))
        ctx.globalAlpha = 0.15 + tw * 0.25
        ctx.fillStyle = '#c8d8ff'
        ctx.beginPath()
        ctx.arc(sx, sy, 0.5 + seeded(i + 1_200) * 0.9, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const effectiveParams = (): SimParams & { pullBoost: number } => {
      const p = paramsRef.current
      const b = beatRef.current
      // Story drives sync path; free mode uses freebar params.
      if (b === 0 || b === 1) {
        // chaos: sync off
        return { ...p, sync: false, pullBoost: 1 }
      }
      if (b === 2) {
        // one flash / neighbor intro: mild sync
        return { ...p, sync: true, pull: Math.max(p.pull, 0.06), radius: Math.max(p.radius, 180), pullBoost: 1.2 }
      }
      if (b === 3) {
        // neighbor pull accumulating
        return { ...p, sync: true, pull: Math.max(p.pull, 0.07), radius: Math.max(p.radius, 220), pullBoost: 1.4 }
      }
      if (b === 4) {
        // whole field heading to lock
        return { ...p, sync: true, pull: Math.max(p.pull, 0.09), radius: Math.max(p.radius, 260), pullBoost: 1.6 }
      }
      return { ...p, pullBoost: 1 }
    }

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1_000
      const dt = Math.min(0.05, Math.max(0.001, rawDt))
      lastTime = now
      // ncase PIXI delta ≈ frames at 60fps
      const frameDelta = dt * 60

      const currentBeat = beatRef.current
      if (currentBeat !== lastBeat) {
        if (currentBeat === 1) {
          scrambleAll(1)
          storyHighlight = -1
        }
        if (currentBeat === 2) {
          // pick a central fly and force a near-flash so user sees the pull wave
          let best = 0
          let bestScore = Infinity
          for (let i = 0; i < flies.length; i += 1) {
            const dx = flies[i].x - width * 0.5
            const dy = flies[i].y - height * 0.52
            const s = dx * dx + dy * dy
            if (s < bestScore) {
              bestScore = s
              best = i
            }
          }
          storyHighlight = best
          flies[best].clock = 0.97
          focusFlashRef.current = now
        }
        if (currentBeat === 3 || currentBeat === 4) {
          // leave clocks as-is so pull can accumulate from previous step
          storyHighlight = -1
        }
        if (currentBeat === 5) {
          storyHighlight = -1
        }
        lastBeat = currentBeat
      }

      // external scramble request (reset chaos button)
      if (scrambleRef.current > 0) {
        scrambleAll(scrambleRef.current)
        scrambleRef.current = 0
      }

      const ep = effectiveParams()
      const pointer = pointerRef.current
      const radius2 = ep.radius * ep.radius
      const mouseR2 = MOUSE_RADIUS * MOUSE_RADIUS
      const flashDecay = Math.pow(FLASH_DECAY, frameDelta)

      // order parameter from clocks as phases
      let sumCos = 0
      let sumSin = 0

      for (let i = 0; i < flies.length; i += 1) {
        const f = flies[i]

        // ── motion (swerve flight) ──
        if (!reducedMotion) {
          f.x += f.speed * frameDelta * Math.cos(f.angle)
          f.y += f.speed * frameDelta * Math.sin(f.angle)
          if (f.x < -FLY_LOOP) f.x = width + FLY_LOOP
          if (f.x > width + FLY_LOOP) f.x = -FLY_LOOP
          if (f.y < -FLY_LOOP) f.y = height + FLY_LOOP
          if (f.y > height + FLY_LOOP) f.y = -FLY_LOOP
          f.angle += f.swerve
          if (Math.random() < 0.05) f.swerve = (Math.random() - 0.5) * FLY_SWERVE
        }

        // ── flash decay ──
        f.flash *= flashDecay

        // ── clock advance ──
        f.clock += dt * ep.clockSpeed

        // ── mouse chaos (press/hold near fly) ──
        if (pointer.down) f.chaos = 1
        if (f.chaos > 0.01 && dist2(f.x, f.y, pointer.x, pointer.y) < mouseR2) {
          f.clock += Math.random() * 0.15
        }
        f.chaos *= Math.pow(0.8, frameDelta)

        // ── flash + neighbor pull (ncase core) ──
        if (f.clock > 1) {
          f.flash = 1
          f.clock = 0

          if (ep.sync) {
            const pullAmt = ep.pull * ep.pullBoost
            for (let j = 0; j < flies.length; j += 1) {
              if (j === i) continue
              const other = flies[j]
              if (dist2(f.x, f.y, other.x, other.y) <= radius2) {
                // pull proportional to other.clock prevents double-pulling (ncase)
                const pull = other.clock
                other.clock += pull * pullAmt
                if (other.clock > 1) other.clock = 1
              }
            }
          }
        }

        const phase = f.clock * Math.PI * 2
        sumCos += Math.cos(phase)
        sumSin += Math.sin(phase)
      }

      const order = Math.hypot(sumCos, sumSin) / Math.max(1, flies.length)
      smoothedOrder += (order - smoothedOrder) * Math.min(1, dt * 3.5)
      if (now - lastOrderEmit > 160) {
        lastOrderEmit = now
        onOrderChange(smoothedOrder)
      }

      // ── paint ──
      paintForest(now)

      // ambient sync breath
      const magic = Math.pow(Math.max(0, smoothedOrder - 0.4) / 0.6, 1.3)
      if (magic > 0.02) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        const breath = 0.55 + 0.45 * Math.sin(now * 0.0038)
        const amb = ctx.createRadialGradient(
          width * 0.5,
          height * 0.52,
          0,
          width * 0.5,
          height * 0.52,
          width * (0.5 + magic * 0.1),
        )
        amb.addColorStop(0, `rgba(190, 255, 120, ${0.04 + magic * 0.08 * breath})`)
        amb.addColorStop(0.5, `rgba(255, 210, 100, ${0.015 + magic * 0.04 * breath})`)
        amb.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = amb
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
      }

      // pointer chaos ring while holding
      if (pointer.down) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        const ring = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, MOUSE_RADIUS)
        ring.addColorStop(0, 'rgba(255, 180, 90, 0.12)')
        ring.addColorStop(0.55, 'rgba(255, 120, 60, 0.05)')
        ring.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = ring
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, MOUSE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 200, 120, 0.22)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, MOUSE_RADIUS * 0.92, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }

      // draw fireflies depth-sorted (ncase-style body + wings + flash glow)
      const indices = flies.map((_, i) => i)
      indices.sort((a, b) => flies[a].depth - flies[b].depth)

      for (const i of indices) {
        const f = flies[i]
        const isHL = i === storyHighlight && currentBeat === 2
        const flash = Math.max(f.flash, isHL ? Math.max(0, 1 - (now - focusFlashRef.current) / 900) * 0.4 : 0)
        // Flap wings every other paint (ncase alternates wing frames 3/4)
        if (!reducedMotion && frameCount % 2 === 0) f.wing = f.wing ? 0 : 1
        const bodySize = (18 + f.depth * 22) * (0.92 + flash * 0.12)
        const rot = f.angle + Math.PI / 2
        const dim = 0.35 + f.depth * 0.35

        // Soft glow under the bug (bloom of the flash)
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        const glowSize = (10 + f.depth * 18) * (0.35 + flash * 1.15)
        const glowAlpha = Math.min(1, 0.08 + flash * 0.95 + magic * 0.06)
        const glowSprite = f.hue > 0.62 ? limeGlow : f.hue < 0.28 ? goldGlow : softGlow
        ctx.globalAlpha = glowAlpha
        ctx.drawImage(glowSprite, f.x - glowSize, f.y - glowSize, glowSize * 2, glowSize * 2)
        ctx.restore()

        if (spriteReady) {
          // Body dark silhouette, lit abdomen when flashing (ncase body / body2)
          const bodyAlpha = Math.min(1, dim + flash * 0.55)
          drawSpriteFrame(ctx, spriteImg, flash > 0.35 ? SPRITE_LIT : SPRITE_BODY, f.x, f.y, bodySize, rot, bodyAlpha)
          const wingCell = f.wing ? SPRITE_WING_B : SPRITE_WING_A
          drawSpriteFrame(ctx, spriteImg, wingCell, f.x, f.y, bodySize * 1.05, rot, Math.min(1, 0.55 + dim * 0.35 + flash * 0.2))
        } else {
          // Fallback while sprite loads
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          ctx.globalAlpha = Math.min(1, 0.15 + flash * 0.9)
          ctx.drawImage(glowSprite, f.x - bodySize * 0.45, f.y - bodySize * 0.45, bodySize * 0.9, bodySize * 0.9)
          ctx.restore()
        }

        // optional phase rings (ncase clocks)
        if (ep.showClocks) {
          ctx.save()
          const r = 8 + f.depth * 6
          ctx.globalAlpha = 0.22 + flash * 0.35
          ctx.strokeStyle = flash > 0.3 ? 'rgba(255, 245, 180, 0.7)' : 'rgba(160, 210, 190, 0.45)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(f.x, f.y, r, 0, Math.PI * 2)
          ctx.stroke()
          const handAngle = f.clock * Math.PI * 2 - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(f.x, f.y)
          ctx.lineTo(f.x + Math.cos(handAngle) * r * 0.85, f.y + Math.sin(handAngle) * r * 0.85)
          ctx.stroke()
          ctx.restore()
        }
      }

      // vignette
      const vig = ctx.createRadialGradient(
        width * 0.5,
        height * 0.48,
        width * 0.16,
        width * 0.5,
        height * 0.5,
        width * 0.78,
      )
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(0.7, 'rgba(0,0,0,0)')
      vig.addColorStop(1, `rgba(0,0,0,${0.45 - magic * 0.15})`)
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, width, height)

      frameCount += 1
      if (!reducedMotion) frame = requestWorldFrame(render)
    }

    frame = requestWorldFrame(render)

    // expose scramble via custom event on canvas element
    const onScramble = (ev: Event) => {
      const detail = (ev as CustomEvent<{ strength?: number }>).detail
      scrambleRef.current = detail?.strength ?? 1
    }
    canvas.addEventListener('firefly-scramble', onScramble)

    return () => {
      observer.disconnect()
      cancelWorldFrame(frame)
      canvas.removeEventListener('firefly-scramble', onScramble)
    }
  }, [onOrderChange, reducedMotion])

  const setPointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, down?: boolean) => {
      const bounds = event.currentTarget.getBoundingClientRect()
      pointerRef.current.x = event.clientX - bounds.left
      pointerRef.current.y = event.clientY - bounds.top
      if (down !== undefined) pointerRef.current.down = down
    },
    [],
  )

  return (
    <canvas
      ref={canvasRef}
      className="firefly-canvas"
      aria-label={tx('按住画面打乱附近萤火虫的节拍，松手后看它们如何重新同步')}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        setPointer(event, true)
        controls.registerInteraction()
        onInteract()
        onUserGesture?.()
      }}
      onPointerMove={(event) => setPointer(event)}
      onPointerUp={(event) => setPointer(event, false)}
      onPointerCancel={(event) => setPointer(event, false)}
      onPointerLeave={(event) => {
        if (!event.buttons) pointerRef.current.down = false
      }}
    />
  )
}

export function FireflySync({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reducedMotion = false
  const [beat, setBeat] = useState<StoryBeat>(0)
  const [sync, setSync] = useState(true)
  const [pull, setPull] = useState(DEFAULT_PULL)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  const [clockSpeed, setClockSpeed] = useState(DEFAULT_CLOCK_SPEED)
  const [showClocks, setShowClocks] = useState(false)
  /** Default on like ncase; browsers may block until first gesture. */
  const [soundOn, setSoundOn] = useState(true)
  const [order, setOrder] = useState(0)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('firefly-sync')

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // Forest ambience: start when world mounts (after gesture may still need retry)
  useEffect(() => {
    if (soundOn) void setForestPlaying(true)
    else void setForestPlaying(false)
    return () => {
      // Pause when leaving this world — singleton must not keep playing elsewhere
      void setForestPlaying(false)
    }
  }, [soundOn])

  const unlockForestIfWanted = useCallback(() => {
    if (soundOnRef.current) void setForestPlaying(true)
  }, [])

  const params = useMemo<SimParams>(
    () => ({ sync, pull, radius, clockSpeed, showClocks }),
    [sync, pull, radius, clockSpeed, showClocks],
  )

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(5)
  }, [enterFree])

  const handleOrder = useCallback((value: number) => setOrder(value), [])

  const scrambleChaos = useCallback(() => {
    controls.registerInteraction()
    const canvas = canvasHostRef.current?.querySelector('canvas')
    canvas?.dispatchEvent(new CustomEvent('firefly-scramble', { detail: { strength: 1 } }))
  }, [controls])

  // 故事只点「下一步」；按住打乱留给结束后的 GhostHint
  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: '每一盏微光，都有自己的拍子',
        body: '刚开始，没有谁在听谁。每只萤火虫都按自己的内在时钟发光——整片森林像散乱的星雨。',
        action: () => setBeat(1),
        durationMs: 5500,
      },
      {
        title: '看见别人亮，它会挪动下一拍',
        body: '当一只萤火虫闪光时，附近的同伴会把时钟往前拨一点。不是立刻照抄，而是轻轻靠近。',
        action: () => setBeat(2),
        durationMs: 6000,
      },
      {
        title: '微小的让步，会一轮轮累积',
        body: '邻居把邻居再拨快一点。局部小群先对齐，共同节奏渐渐清晰——没有领队，同步是长出来的。',
        action: () => setBeat(3),
        durationMs: 6000,
      },
      {
        title: '整片森林一起呼吸',
        body: '足够多的彼此影响之后，混乱会跨过门槛，突然变成同拍。这是脉冲耦合：闪光本身就是信号。',
        action: () => setBeat(4),
        durationMs: 6500,
      }
    ],
    [],
  )

  return (
    <div
      ref={canvasHostRef}
      className={`oss-experience firefly-experience firefly-beat-${beat}${storyMode ? ' is-story' : ' is-free'}`}
    >
      <FireflyTreeScene
        beat={storyMode ? beat : 5}
        params={params}
        controls={controls}
        reducedMotion={reducedMotion}
        onOrderChange={handleOrder}
        onInteract={returnToFree}
        onUserGesture={unlockForestIfWanted}
      />

      {!storyMode && (
        <header className="firefly-plaque" data-experience-overlay="true">
          <span>{tx('RHYTHM / NIGHT')}</span>
          <h1>{tx('萤火虫')}</h1>
          <p>{tx('一整片微光，怎么突然一起亮？')}</p>
        </header>
      )}

      {!storyMode && (
        <div className="firefly-order" aria-live="polite" data-experience-overlay="true" data-freebar-clearance="true">
          <WaveSine weight="duotone" aria-hidden="true" />
          <div className="firefly-order-copy">
            <span>{tx('共同节奏')}</span>
            <i>
              <b style={{ width: `${Math.max(4, order * 100)}%` }} />
            </i>
          </div>
          <strong>{Math.round(order * 100)}%</strong>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="firefly-freebar"
          mainClassName="firefly-freebar-main"
          ariaLabel={tx('同步开关')}
          primaryControlBudget={4}
          secondaryDefault="closed"
          secondary={(
            <div className="firefly-tray">
              <div className="firefly-secondary-fields">
                <label className="firefly-freebar-field experience-freebar-field">
                  <span>{tx('牵引强度')}</span>
                  <input
                    className="firefly-slider"
                    type="range"
                    min="0.01"
                    max="0.14"
                    step="0.005"
                    value={pull}
                    disabled={!sync}
                    aria-label={tx('邻居闪光时拨快时钟的强度')}
                    onChange={(event) => {
                      controls.registerInteraction()
                      setPull(Number(event.target.value))
                    }}
                  />
                  <b>{(pull * 100).toFixed(0)}</b>
                </label>
                <label className="firefly-freebar-field experience-freebar-field">
                  <span>{tx('邻居半径')}</span>
                  <input
                    className="firefly-slider"
                    type="range"
                    min="60"
                    max="360"
                    step="10"
                    value={radius}
                    disabled={!sync}
                    aria-label={tx('能被闪光影响的距离')}
                    onChange={(event) => {
                      controls.registerInteraction()
                      setRadius(Number(event.target.value))
                    }}
                  />
                  <b>{Math.round(radius)}</b>
                </label>
                <label className="firefly-freebar-field experience-freebar-field">
                  <span>{tx('时钟速度')}</span>
                  <input
                    className="firefly-slider"
                    type="range"
                    min="0.12"
                    max="0.7"
                    step="0.02"
                    value={clockSpeed}
                    aria-label={tx('内在时钟走速')}
                    onChange={(event) => {
                      controls.registerInteraction()
                      setClockSpeed(Number(event.target.value))
                    }}
                  />
                  <b>{clockSpeed.toFixed(2)}</b>
                </label>
              </div>
            </div>
          )}
        >
            <div className="firefly-freebar-chips experience-freebar-chips" role="group" aria-label={tx('同步开关')}>
              <button
                type="button"
                className={`firefly-chip${sync ? ' is-active' : ''}`}
                aria-pressed={sync}
                onClick={() => {
                  controls.registerInteraction()
                  setSync((v) => !v)
                }}
              >
                {sync ? tx('同步') : tx('不同步')}
              </button>
              <button
                type="button"
                className={`firefly-chip${showClocks ? ' is-active' : ''}`}
                aria-pressed={showClocks}
                onClick={() => {
                  controls.registerInteraction()
                  setShowClocks((v) => !v)
                }}
              >
                {tx('相位环')}
              </button>
              <button
                type="button"
                className="firefly-chip firefly-chip-action"
                onClick={scrambleChaos}
              >
                {tx('打乱')}
              </button>
              <button
                type="button"
                className={`firefly-chip${soundOn ? ' is-active' : ''}`}
                aria-pressed={soundOn}
                aria-label={soundOn ? tx('关闭环境音') : tx('打开环境音')}
                onClick={() => {
                  controls.registerInteraction()
                  setSoundOn((v) => {
                    const next = !v
                    void setForestPlaying(next)
                    return next
                  })
                }}
              >
                {soundOn ? <SpeakerHigh weight="fill" aria-hidden="true" /> : <SpeakerSlash weight="fill" aria-hidden="true" />}
              </button>
              <button
                type="button"
                className="experience-freebar-story"
                onClick={() => {
                  controls.registerInteraction()
                  enterStory()
                  setBeat(0)
                  replayGuide('firefly-sync')
                }}
                aria-label={tx('重播故事')}
              >
                <FilmStrip weight="fill" aria-hidden="true" />
                <span>{tx('故事')}</span>
              </button>
            </div>
        </Freebar>
      )}

      <GuideTour
        worldId="firefly-sync"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-center', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'caption', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-center', motion: 'fade', tone: 'light', width: 'narrow', treatment: 'annotation', cue: 'right' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'scale', tone: 'light', width: 'wide', treatment: 'monumental', cue: 'up' },
        ]}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="firefly-sync"
          gesture={{ type: 'tap', target: '.firefly-canvas', label: tx('按住打乱，松手再同步') }}
        />
      )}
    </div>
  )
}
