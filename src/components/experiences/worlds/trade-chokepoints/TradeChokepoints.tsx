import './styles/TradeChokepoints.css'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Pause, Play, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import {
  SAMPLES,
  approach,
  blendLane,
  buildModel,
  clamp,
  pathHeading,
  resolveLane,
  samplePath,
  summarise,
  type CargoId,
  type GateId,
  type LaneState,
  type RawGate,
  type RawPayload,
  type Summary,
  type WorldModel,
} from './trade-chokepoints-model'

const TAU = Math.PI * 2
const GATE_ORDER: Array<GateId> = ['suez', 'panama', 'malacca', 'hormuz', 'bab', 'bosporus', 'danish']
const CARGO_ORDER: Array<CargoId> = ['container', 'crude', 'lng', 'grain']

/** Ink on a night chart: amber sea-lanes, brass gates, one cold blue for gas. */
const INK: Record<CargoId | 'brass' | 'closed' | 'cape' | 'coast', string> = {
  container: '236, 178, 79',
  crude: '226, 108, 58',
  lng: '108, 208, 214',
  grain: '204, 206, 136',
  brass: '221, 186, 138',
  closed: '229, 86, 66',
  cape: '255, 208, 138',
  coast: '132, 170, 190',
}

function rgba(channel: string, alpha: number) {
  return `rgba(${channel}, ${alpha})`
}

/**
 * Immersive view hides overlays with display:none, the poster grab uses opacity:0 —
 * both land on an ancestor, so visibility has to be checked all the way up.
 */
function isVisible(element: Element | null | undefined) {
  let node: Element | null = element ?? null
  if (!node) return false
  while (node) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0.02) return false
    node = node.parentElement
  }
  return true
}

type CanvasLabels = {
  gates: Record<GateId, string>
  gatesShort: Record<GateId, string>
  detour: Record<string, string>
  cape: string
  mbd: string
  alternative: string
  everGivenTitle: string
  everGivenDays: string
  everGivenValue: string
  capeShift: string
  projection: string
  schematic: string
  pipelineEastWest: string
  pipelineAdcop: string
  pipelineNote: string
}

type Scene = {
  lanes: number
  ships: number
  spotlight: number
  everGiven: number
  capeStat: number
}

type Camera = { lon0: number; lat0: number; zoom: number }

type View = {
  w: number
  h: number
  mobile: boolean
  scale: number
  lon0: number
  lat0: number
  cx: number
  cy: number
  stageTop: number
  stageBottom: number
  worldW: number
}

type Ship = { lane: number; s: number; speed: number; jitter: number }

type LaneRuntime = {
  variant: number
  previous: number
  morph: number
  severed: boolean
  blockAt: number
}

type RingMeta = { minLon: number; maxLon: number; minLat: number; maxLat: number }

/** Height of the caption band that story chapters use on a phone. */
const PHONE_STORY_CAPTION_RESERVE = 272

function computeView(
  w: number,
  h: number,
  storyMode: boolean,
  reserve: number,
  plateShown: boolean,
  camera: Camera,
): View {
  const mobile = w < 720
  const stageTop = storyMode ? (mobile ? PHONE_STORY_CAPTION_RESERVE : 68) : mobile ? (plateShown ? 126 : 58) : 86
  const bottomReserve = clamp(reserve, 22, h * 0.5)
  const stageBottom = Math.max(stageTop + 180, h - bottomReserve)
  const stageH = stageBottom - stageTop
  // Desktop frames the whole world; a phone frames the chokepoint belt and only pulls
  // back when the traffic actually moves somewhere else.
  const fit = mobile ? Math.min(w / 132, stageH / 118) : Math.min(w / 336, stageH / 114)
  const scale = fit * camera.zoom
  return {
    w,
    h,
    mobile,
    scale,
    lon0: camera.lon0,
    lat0: camera.lat0,
    cx: w / 2,
    cy: (stageTop + stageBottom) / 2,
    stageTop,
    stageBottom,
    worldW: 360 * scale,
  }
}

const projectX = (view: View, lon: number) => view.cx + (lon - view.lon0) * view.scale
const projectY = (view: View, lat: number) => view.cy - (lat - view.lat0) * view.scale

/** Pixel offsets at which a ±360° copy of the given longitude span is still on screen. */
function wrapShifts(view: View, minLon: number, maxLon: number) {
  const left = view.lon0 - view.w / (2 * view.scale) - 4
  const right = view.lon0 + view.w / (2 * view.scale) + 4
  const shifts: Array<number> = []
  for (let turn = -1; turn <= 1; turn += 1) {
    const offset = turn * 360
    if (maxLon + offset < left || minLon + offset > right) continue
    shifts.push(offset * view.scale)
  }
  return shifts
}

/* ------------------------------------------------------------------ layers -- */

let seaStrip: HTMLCanvasElement | null = null
let seaStripHeight = 0

function getSeaStrip(h: number) {
  const height = Math.max(1, Math.round(h))
  if (seaStrip && seaStripHeight === height) return seaStrip
  const strip = document.createElement('canvas')
  strip.width = 1
  strip.height = height
  const ctx = strip.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#02060a')
  gradient.addColorStop(0.42, '#061219')
  gradient.addColorStop(0.74, '#040d13')
  gradient.addColorStop(1, '#02060a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1, height)
  seaStrip = strip
  seaStripHeight = height
  return strip
}

function drawSea(ctx: CanvasRenderingContext2D, view: View) {
  ctx.drawImage(getSeaStrip(view.h), 0, 0, 1, Math.max(1, Math.round(view.h)), 0, 0, view.w, view.h)
}

function drawGraticule(ctx: CanvasRenderingContext2D, view: View) {
  ctx.save()
  ctx.strokeStyle = 'rgba(126, 166, 188, 0.05)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const top = Math.max(view.stageTop, projectY(view, 84))
  const bottom = Math.min(view.stageBottom, projectY(view, -78))
  for (let lon = -180; lon <= 180; lon += 30) {
    for (const shift of wrapShifts(view, lon, lon)) {
      const x = projectX(view, lon) + shift
      if (x < -2 || x > view.w + 2) continue
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
    }
  }
  for (let lat = -60; lat <= 80; lat += 20) {
    const y = projectY(view, lat)
    if (y < view.stageTop || y > view.stageBottom) continue
    ctx.moveTo(0, y)
    ctx.lineTo(view.w, y)
  }
  ctx.stroke()

  const equator = projectY(view, 0)
  if (equator > view.stageTop && equator < view.stageBottom) {
    ctx.strokeStyle = 'rgba(150, 190, 210, 0.1)'
    ctx.beginPath()
    ctx.moveTo(0, equator)
    ctx.lineTo(view.w, equator)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * The coastline is ~7,000 points across 266 rings. Rebuilding that path every frame
 * is pure waste while the camera sits still, so it is painted once per camera pose
 * into an offscreen buffer and blitted afterwards.
 */
let landCache: { canvas: HTMLCanvasElement; key: string } | null = null

function drawLand(
  ctx: CanvasRenderingContext2D,
  view: View,
  land: Array<Float64Array>,
  meta: Array<RingMeta>,
  dpr: number,
) {
  const key = `${view.w}|${view.h}|${dpr}|${view.scale.toFixed(3)}|${view.lon0.toFixed(2)}|${view.lat0.toFixed(2)}`
  if (!landCache || landCache.key !== key) {
    const canvas = landCache?.canvas ?? document.createElement('canvas')
    const pixelW = Math.max(1, Math.round(view.w * dpr))
    const pixelH = Math.max(1, Math.round(view.h * dpr))
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW
      canvas.height = pixelH
    }
    const land2d = canvas.getContext('2d')!
    land2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    land2d.clearRect(0, 0, view.w, view.h)
    land2d.beginPath()
    for (let index = 0; index < land.length; index += 1) {
      const ring = land[index]
      const box = meta[index]
      if (projectY(view, box.minLat) < -20 || projectY(view, box.maxLat) > view.h + 20) continue
      for (const shift of wrapShifts(view, box.minLon, box.maxLon)) {
        const count = ring.length / 2
        land2d.moveTo(projectX(view, ring[0]) + shift, projectY(view, ring[1]))
        for (let point = 1; point < count; point += 1) {
          land2d.lineTo(projectX(view, ring[point * 2]) + shift, projectY(view, ring[point * 2 + 1]))
        }
        land2d.closePath()
      }
    }
    land2d.fillStyle = '#0b1219'
    land2d.fill()
    land2d.strokeStyle = rgba(INK.coast, 0.32)
    land2d.lineWidth = 0.8
    land2d.stroke()
    landCache = { canvas, key }
  }
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(landCache.canvas, 0, 0)
  ctx.restore()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawLanes(
  ctx: CanvasRenderingContext2D,
  view: View,
  model: WorldModel,
  runtime: Array<LaneRuntime>,
  blended: Array<Float64Array>,
  scene: Scene,
  cargoFilter: CargoId | 'all',
) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const dimByStory = 1 - scene.spotlight * 0.72

  for (let index = 0; index < model.lanes.length; index += 1) {
    const lane = model.lanes[index]
    const state = runtime[index]
    const points = blended[index]
    const focus = cargoFilter === 'all' || cargoFilter === lane.cargo ? 1 : 0.16
    const alpha = scene.lanes * focus * dimByStory
    if (alpha <= 0.01) continue

    let minLon = Infinity
    let maxLon = -Infinity
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const lon = points[sample * 2]
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
    }
    const shifts = wrapShifts(view, minLon, maxLon)
    if (shifts.length === 0) continue

    const channel = INK[lane.cargo]
    const cut = state.severed ? clamp(state.blockAt, 0.02, 0.98) : 1
    const cutIndex = Math.floor(cut * (SAMPLES - 1))

    for (const shift of shifts) {
      // Corridor glow. Where several lanes pile onto the same water — the Cape above
      // all — `lighter` adds them together and that stretch visibly heats up.
      ctx.beginPath()
      for (let sample = 0; sample <= cutIndex; sample += 1) {
        const x = projectX(view, points[sample * 2]) + shift
        const y = projectY(view, points[sample * 2 + 1])
        if (sample === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = rgba(channel, 0.05 * alpha)
      ctx.lineWidth = 4.5 + lane.weight * 9
      ctx.stroke()
      ctx.strokeStyle = rgba(channel, 0.34 * alpha)
      ctx.lineWidth = 0.8 + lane.weight * 1.6
      ctx.stroke()

      if (state.severed) {
        ctx.setLineDash([2.5, 5])
        ctx.beginPath()
        for (let sample = cutIndex; sample < SAMPLES; sample += 1) {
          const x = projectX(view, points[sample * 2]) + shift
          const y = projectY(view, points[sample * 2 + 1])
          if (sample === cutIndex) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = rgba(INK.closed, 0.22 * alpha)
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }
  ctx.restore()
}

const sampleOut = { lon: 0, lat: 0 }
type ShipBucket = { heads: Array<number>; tails: Array<number>; channel: string; alpha: number }
const shipBuckets = new Map<string, ShipBucket>()

function drawShips(
  ctx: CanvasRenderingContext2D,
  view: View,
  model: WorldModel,
  blended: Array<Float64Array>,
  ships: Array<Ship>,
  scene: Scene,
  cargoFilter: CargoId | 'all',
  reducedMotion: boolean,
) {
  if (scene.ships <= 0.02) return
  const dimByStory = 1 - scene.spotlight * 0.66
  const size = view.mobile ? 1.3 : 1.6
  const tail = reducedMotion ? 0 : view.mobile ? 5 : 7

  // Buckets are reused between frames: a few hundred ships × 60 fps would otherwise
  // churn thousands of short-lived arrays a second.
  for (const bucket of shipBuckets.values()) {
    bucket.heads.length = 0
    bucket.tails.length = 0
  }

  for (const ship of ships) {
    const lane = model.lanes[ship.lane]
    const active = cargoFilter === 'all' || cargoFilter === lane.cargo
    const alpha = scene.ships * (active ? 1 : 0.13) * dimByStory
    if (alpha <= 0.02) continue

    const points = blended[ship.lane]
    samplePath(points, ship.s, sampleOut)
    const lon = sampleOut.lon
    const lat = sampleOut.lat
    const y = projectY(view, lat)
    if (y < view.stageTop - 12 || y > view.stageBottom + 12) continue
    const baseX = projectX(view, lon)

    const key = `${lane.cargo}-${active ? 'a' : 'd'}`
    let bucket = shipBuckets.get(key)
    if (!bucket) {
      bucket = { heads: [], tails: [], channel: INK[lane.cargo], alpha }
      shipBuckets.set(key, bucket)
    }
    bucket.channel = INK[lane.cargo]
    bucket.alpha = alpha
    let heading = 0
    let headed = false
    for (let turn = -1; turn <= 1; turn += 1) {
      const x = baseX + turn * view.worldW
      if (x < -12 || x > view.w + 12) continue
      if (tail > 0 && !headed) {
        heading = pathHeading(points, ship.s)
        headed = true
      }
      bucket.heads.push(x, y)
      if (tail > 0) bucket.tails.push(x, y, x - Math.cos(heading) * tail, y + Math.sin(heading) * tail)
    }
  }
  const buckets = shipBuckets

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const bucket of buckets.values()) {
    if (bucket.tails.length > 0) {
      ctx.beginPath()
      for (let index = 0; index < bucket.tails.length; index += 4) {
        ctx.moveTo(bucket.tails[index], bucket.tails[index + 1])
        ctx.lineTo(bucket.tails[index + 2], bucket.tails[index + 3])
      }
      ctx.strokeStyle = rgba(bucket.channel, 0.2 * bucket.alpha)
      ctx.lineWidth = size * 1.15
      ctx.stroke()
    }
    ctx.beginPath()
    for (let index = 0; index < bucket.heads.length; index += 2) {
      ctx.moveTo(bucket.heads[index] + size, bucket.heads[index + 1])
      ctx.arc(bucket.heads[index], bucket.heads[index + 1], size, 0, TAU)
    }
    ctx.fillStyle = rgba(bucket.channel, 0.88 * bucket.alpha)
    ctx.fill()
  }
  ctx.restore()
}

function drawQueues(
  ctx: CanvasRenderingContext2D,
  view: View,
  model: WorldModel,
  runtime: Array<LaneRuntime>,
  blended: Array<Float64Array>,
  time: number,
) {
  ctx.save()
  for (let index = 0; index < model.lanes.length; index += 1) {
    const state = runtime[index]
    if (!state.severed) continue
    samplePath(blended[index], state.blockAt, sampleOut)
    const x = projectX(view, sampleOut.lon)
    const y = projectY(view, sampleOut.lat)
    if (x < -40 || x > view.w + 40) continue
    const phase = (time * 0.55 + index * 0.31) % 1
    ctx.strokeStyle = rgba(INK.closed, 0.34 * (1 - phase))
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.arc(x, y, 4 + phase * 18, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

function drawPipelines(
  ctx: CanvasRenderingContext2D,
  view: View,
  model: WorldModel,
  reveal: number,
  labels: CanvasLabels,
) {
  if (reveal <= 0.02) return
  ctx.save()
  ctx.globalAlpha = reveal
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = rgba(INK.brass, 0.55)
  ctx.lineWidth = 1.2
  for (const pipeline of model.pipelines) {
    const count = pipeline.length / 2
    ctx.beginPath()
    for (let index = 0; index < count; index += 1) {
      const x = projectX(view, pipeline[index * 2])
      const y = projectY(view, pipeline[index * 2 + 1])
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.font = '500 9.5px system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  if (!view.mobile) {
    ctx.fillStyle = rgba(INK.brass, 0.66)
    ctx.textAlign = 'right'
    ctx.fillText(labels.pipelineEastWest, projectX(view, 38.05) - 6, projectY(view, 24.09))
    ctx.textAlign = 'left'
    ctx.fillText(labels.pipelineAdcop, projectX(view, 56.35) + 8, projectY(view, 25.12) + 11)
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = rgba(INK.brass, 0.5)
  ctx.fillText(labels.pipelineNote, projectX(view, 47), projectY(view, 17))
  ctx.restore()
}

function drawCape(
  ctx: CanvasRenderingContext2D,
  view: View,
  model: WorldModel,
  load: number,
  labels: CanvasLabels,
  capeStat: number,
) {
  const x = projectX(view, model.capeOfGoodHope.lon)
  const y = projectY(view, model.capeOfGoodHope.lat)
  if (x < -110 || x > view.w + 110) return
  const heat = clamp(load, 0, 1)
  ctx.save()

  if (heat > 0.01) {
    const radius = (view.mobile ? 30 : 48) * (0.6 + heat * 0.8)
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
    for (let step = 0; step <= 6; step += 1) {
      const t = step / 6
      glow.addColorStop(t, rgba(INK.cape, 0.26 * heat * (1 - t) ** 2.2))
    }
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = glow
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    ctx.globalCompositeOperation = 'source-over'
  }

  ctx.fillStyle = rgba(INK.cape, 0.42 + heat * 0.55)
  ctx.beginPath()
  ctx.arc(x, y, 2.4, 0, TAU)
  ctx.fill()

  ctx.font = `500 ${view.mobile ? 9 : 10}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 6
  ctx.fillStyle = rgba(INK.cape, 0.44 + heat * 0.5)
  ctx.fillText(labels.cape, x, y + 7)

  // The real EIA rows: as Suez and Bab el-Mandeb collapsed in 2024, the Cape took it.
  if (capeStat > 0.02) {
    ctx.globalAlpha = capeStat
    const before = model.capeOfGoodHope.eia['2023'] ?? 0
    const after = model.capeOfGoodHope.eia['2024'] ?? 0
    ctx.font = `600 ${view.mobile ? 12 : 14}px ui-monospace, "SF Mono", monospace`
    ctx.fillStyle = rgba(INK.cape, 0.96)
    ctx.fillText(`${before.toFixed(1)} → ${after.toFixed(1)}`, x, y + (view.mobile ? 20 : 23))
    ctx.font = `500 ${view.mobile ? 8.5 : 9.5}px system-ui, sans-serif`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillText(labels.capeShift, x, y + (view.mobile ? 35 : 41))
    ctx.globalAlpha = 1
  }
  ctx.shadowBlur = 0
  ctx.restore()
}

type LabelBox = { left: number; right: number; top: number; bottom: number }
const placedLabels: Array<LabelBox> = []

function overlaps(a: LabelBox, b: LabelBox) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function drawGates(
  ctx: CanvasRenderingContext2D,
  view: View,
  model: WorldModel,
  closeAnim: Record<string, number>,
  pulse: Record<string, number>,
  labels: CanvasLabels,
  scene: Scene,
  hovered: GateId | null,
  suppressLabel: GateId | null,
) {
  const radius = view.mobile ? 10 : 14
  const lineStep = view.mobile ? 11 : 12.5
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  placedLabels.length = 0

  const visible: Array<{ gate: RawGate; x: number; y: number; shut: number }> = []
  for (const gate of model.gates) {
    const x = projectX(view, gate.lon)
    const y = projectY(view, gate.lat)
    if (x < -90 || x > view.w + 90 || y < view.stageTop - 60 || y > view.stageBottom + 60) continue
    visible.push({ gate, x, y, shut: closeAnim[gate.id] ?? 0 })
    // Reserve every ring up front: a caption must never be printed over a neighbour's
    // gate. Suez and the Bosphorus sit close enough that this happens on a world view.
    placedLabels.push({ left: x - radius - 4, right: x + radius + 4, top: y - radius - 4, bottom: y + radius + 4 })
  }

  for (const { gate, x, y, shut } of visible) {
    const glow = clamp((pulse[gate.id] ?? 0) + scene.spotlight * 0.6 + (hovered === gate.id ? 0.5 : 0), 0, 1)
    const channel = shut > 0.5 ? INK.closed : INK.brass

    if (glow > 0.02) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const reach = radius * 3.4
      const halo = ctx.createRadialGradient(x, y, 0, x, y, reach)
      for (let step = 0; step <= 5; step += 1) {
        const t = step / 5
        halo.addColorStop(t, rgba(channel, 0.34 * glow * (1 - t) ** 2))
      }
      ctx.fillStyle = halo
      ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2)
      ctx.restore()
    }

    ctx.strokeStyle = rgba(channel, 0.5 + shut * 0.4)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, TAU)
    ctx.stroke()

    // Two lock leaves swinging shut; at shut = 1 they meet as one solid bar.
    const gap = radius * (1 - shut)
    ctx.lineCap = 'round'
    ctx.lineWidth = 2.6
    ctx.strokeStyle = rgba(channel, 0.34 + shut * 0.62)
    ctx.beginPath()
    ctx.moveTo(x - radius, y)
    ctx.lineTo(x - gap * 0.16, y)
    ctx.moveTo(x + gap * 0.16, y)
    ctx.lineTo(x + radius, y)
    ctx.stroke()

    if (shut > 0.02) {
      ctx.strokeStyle = rgba(INK.closed, 0.9 * shut)
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(x, y - radius * 0.64 * shut)
      ctx.lineTo(x, y + radius * 0.64 * shut)
      ctx.stroke()
    }
  }

  for (const { gate, x, y, shut } of visible) {
    const channel = shut > 0.5 ? INK.closed : INK.brass
    const volume = gate.eia['2023'] ?? 0
    if (suppressLabel === gate.id) continue
    // A phone cannot carry seven label stacks; small gates stay quiet until touched.
    if (view.mobile && shut < 0.3 && hovered !== gate.id && volume < 8) continue

    const rows: Array<{ text: string; font: string; fill: string }> = [
      {
        text: view.mobile ? labels.gatesShort[gate.id] : labels.gates[gate.id],
        font: `600 ${view.mobile ? 9.5 : 11}px system-ui, sans-serif`,
        fill: rgba(channel, 0.94),
      },
      {
        text: `${volume.toFixed(1)} ${labels.mbd}`,
        font: `600 ${view.mobile ? 9 : 10}px ui-monospace, "SF Mono", monospace`,
        fill: 'rgba(255, 255, 255, 0.6)',
      },
    ]
    if (shut > 0.3) {
      rows.push({
        text: `${labels.alternative} · ${labels.detour[gate.detour]}`,
        font: `500 ${view.mobile ? 8.5 : 9.5}px system-ui, sans-serif`,
        fill: rgba(INK.closed, 0.92),
      })
    }

    let width = 0
    for (const row of rows) {
      ctx.font = row.font
      width = Math.max(width, ctx.measureText(row.text).width)
    }
    const angle = (gate.labelAngle * Math.PI) / 180
    const distance = radius + (view.mobile ? 17 : 19)
    const labelX = clamp(x + Math.cos(angle) * distance, width / 2 + 8, view.w - width / 2 - 8)
    const direction = Math.sin(angle) < 0 ? -1 : 1
    const anchor = y + Math.sin(angle) * distance
    const height = rows.length * lineStep

    /*
     * The gates crowd together — four of them share the eastern Mediterranean and the
     * Gulf. Rather than hand-tuning angles that break at the next zoom level, each
     * stack is pushed away from the ring until it clears every reserved box.
     */
    const first = direction < 0 ? anchor - (rows.length - 1) * lineStep : anchor
    let startY = first
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const box: LabelBox = {
        left: labelX - width / 2 - 3,
        right: labelX + width / 2 + 3,
        top: startY - lineStep * 0.6,
        bottom: startY - lineStep * 0.6 + height,
      }
      if (!placedLabels.some((placed) => overlaps(box, placed))) {
        placedLabels.push(box)
        break
      }
      // Alternate outwards on the label's own side before trying the far side.
      const step = Math.ceil((attempt + 1) / 2) * (height + 6)
      startY = first + direction * step * (attempt % 2 === 0 ? 1 : -1)
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 7
    rows.forEach((row, index) => {
      ctx.font = row.font
      ctx.fillStyle = row.fill
      ctx.fillText(row.text, labelX, startY + index * lineStep)
    })
    ctx.shadowBlur = 0
  }
  ctx.restore()
}

function drawEverGiven(
  ctx: CanvasRenderingContext2D,
  view: View,
  model: WorldModel,
  reveal: number,
  labels: CanvasLabels,
  time: number,
  dpr: number,
) {
  if (reveal <= 0.02) return
  const suez = model.gates.find((gate) => gate.id === 'suez')
  if (!suez) return
  const x = projectX(view, suez.lon)
  const y = projectY(view, suez.lat)
  ctx.save()
  ctx.globalAlpha = reveal

  // A schematic slice of the canal: two banks running north–south, and a hull lying
  // across them. Not to scale — a 400 m ship in a 193 km canal would be invisible.
  const channelHalf = view.mobile ? 9 : 13
  const reach = view.mobile ? 34 : 48
  ctx.strokeStyle = rgba(INK.brass, 0.42)
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.moveTo(x - channelHalf, y - reach)
  ctx.lineTo(x - channelHalf, y + reach)
  ctx.moveTo(x + channelHalf, y - reach)
  ctx.lineTo(x + channelHalf, y + reach)
  ctx.stroke()

  const half = channelHalf * 1.45
  ctx.translate(x, y)
  ctx.rotate(-0.5 + Math.sin(time * 0.6) * 0.016)
  ctx.fillStyle = rgba(INK.closed, 0.94)
  ctx.beginPath()
  ctx.moveTo(-half, -2.8)
  ctx.lineTo(half - 3, -2.8)
  ctx.lineTo(half, 0)
  ctx.lineTo(half - 3, 2.8)
  ctx.lineTo(-half, 2.8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 228, 202, 0.85)'
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // The caption goes below the gate: that water is empty, the Mediterranean is not.
  const boxX = clamp(x, view.mobile ? 104 : 150, view.w - (view.mobile ? 104 : 150))
  const boxY = Math.min(view.stageBottom - 30, y + reach + (view.mobile ? 20 : 26))
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.92)'
  ctx.shadowBlur = 9
  ctx.font = `600 ${view.mobile ? 11.5 : 14}px system-ui, sans-serif`
  ctx.fillStyle = rgba(INK.closed, 0.96)
  ctx.fillText(labels.everGivenTitle, boxX, boxY)
  ctx.font = `600 ${view.mobile ? 10 : 11.5}px ui-monospace, "SF Mono", monospace`
  ctx.fillStyle = 'rgba(255, 240, 220, 0.88)'
  ctx.fillText(
    `${model.meta.everGiven.days} ${labels.everGivenDays} · ${labels.everGivenValue}`,
    boxX,
    boxY + (view.mobile ? 15 : 18),
  )
  ctx.shadowBlur = 0
  ctx.restore()
}

function drawFootnote(ctx: CanvasRenderingContext2D, view: View, labels: CanvasLabels) {
  ctx.save()
  ctx.font = '500 9px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText(labels.schematic, view.w - 16, view.stageBottom - 2)
  if (!view.mobile) ctx.fillText(labels.projection, view.w - 16, view.stageBottom - 14)
  ctx.restore()
}

/* --------------------------------------------------------------- component -- */

export function TradeChokepoints({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('trade-chokepoints')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLElement>(null)

  const [model, setModel] = useState<WorldModel | null>(null)
  const [failed, setFailed] = useState(false)
  const [closed, setClosed] = useState<ReadonlySet<GateId>>(() => new Set())
  const [cargo, setCargo] = useState<CargoId | 'all'>('all')
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState<GateId | null>(null)

  const labels: CanvasLabels = {
    gates: {
      suez: tx('苏伊士运河'),
      panama: tx('巴拿马运河'),
      malacca: tx('马六甲海峡'),
      hormuz: tx('霍尔木兹海峡'),
      bab: tx('曼德海峡'),
      bosporus: tx('博斯普鲁斯海峡'),
      danish: tx('丹麦海峡'),
    },
    gatesShort: {
      suez: tx('苏伊士'),
      panama: tx('巴拿马'),
      malacca: tx('马六甲'),
      hormuz: tx('霍尔木兹'),
      bab: tx('曼德海峡'),
      bosporus: tx('博斯普鲁斯'),
      danish: tx('丹麦海峡'),
    },
    detour: {
      cape: tx('绕好望角'),
      lombok: tx('改走龙目海峡'),
      kiel: tx('基尔运河 · 限中小型船'),
      pipeline: tx('只剩陆上管道'),
      long: tx('绕苏伊士或好望角'),
      none: tx('没有海上替代'),
    },
    cape: tx('好望角'),
    mbd: tx('百万桶/日'),
    alternative: tx('替代'),
    everGivenTitle: tx('2021 长赐号搁浅'),
    everGivenDays: tx('天不通'),
    everGivenValue: tx('每天约 96 亿美元货值受阻'),
    capeShift: tx('好望角石油通过量 2023 → 2024'),
    projection: tx('等距圆柱投影'),
    schematic: tx('主干航道示意 · 非逐船 AIS 轨迹'),
    pipelineEastWest: tx('东西输油管 → 延布'),
    pipelineAdcop: tx('阿布扎比输油管 → 富查伊拉'),
    pipelineNote: tx('陆上管道只能旁通一部分'),
  }
  const labelsRef = useRef(labels)
  labelsRef.current = labels

  const laneNames = useMemo<Record<string, string>>(() => ({
    'cn-nwe': tx('东亚—西北欧'),
    'sg-nwe': tx('东南亚—西北欧'),
    'cn-med': tx('东亚—地中海'),
    'cn-usec': tx('东亚—美东'),
    'cn-uswc': tx('东亚—美西'),
    'usec-nwe': tx('美东—西北欧'),
    'gulf-cn': tx('波斯湾—东亚'),
    'gulf-nwe': tx('波斯湾—西北欧'),
    'baltic-nwe': tx('波罗的海—西北欧'),
    'waf-cn': tx('西非—东亚'),
    'usg-nwe': tx('美湾—西北欧'),
    'qatar-cn': tx('卡塔尔—东亚'),
    'qatar-nwe': tx('卡塔尔—西北欧'),
    'usg-jp': tx('美湾—日本'),
    'blacksea-med': tx('黑海—地中海'),
    'blacksea-cn': tx('黑海—东亚'),
    'br-cn': tx('巴西—东亚'),
    'usg-cn': tx('美湾—东亚'),
    'aus-cn': tx('澳洲西北—东亚'),
  }), [tx])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/assets/trade-chokepoints/world.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<RawPayload>
      })
      .then((payload) => setModel(buildModel(payload)))
      .catch((error) => {
        if ((error as Error).name === 'AbortError') return
        console.error('[trade-chokepoints] failed to load world payload', error)
        setFailed(true)
      })
    return () => controller.abort()
  }, [])

  const laneStates: Array<LaneState> = useMemo(
    () => (model ? model.lanes.map((lane) => resolveLane(lane, closed)) : []),
    [model, closed],
  )
  const summary: Summary | null = useMemo(
    () => (model ? summarise(model, laneStates, closed) : null),
    [model, laneStates, closed],
  )
  const worstLane = useMemo(() => {
    if (!model) return null
    let best: { name: string; km: number } | null = null
    for (let index = 0; index < laneStates.length; index += 1) {
      const state = laneStates[index]
      if (state.severed || state.extraKm <= 0) continue
      if (!best || state.extraKm > best.km) {
        best = { name: laneNames[model.lanes[index].id] ?? model.lanes[index].id, km: state.extraKm }
      }
    }
    return best
  }, [model, laneStates, laneNames])
  const capeLanes = useMemo(() => {
    if (!model) return 0
    return laneStates.reduce((total, state, index) => {
      if (state.variant < 0) return total
      return total + (model.lanes[index].variants[state.variant].viaCape ? 1 : 0)
    }, 0)
  }, [model, laneStates])

  /* ---------------------------------------------------------- render state -- */

  const freeScene: Scene = { lanes: 1, ships: 1, spotlight: 0, everGiven: 0, capeStat: 0 }
  const sceneRef = useRef<Scene>(
    storyMode ? { lanes: 0.18, ships: 0, spotlight: 0, everGiven: 0, capeStat: 0 } : { ...freeScene },
  )
  const animRef = useRef<Scene>({ ...sceneRef.current })
  const cameraRef = useRef<Camera>({ lon0: 40, lat0: 8, zoom: 1 })
  const cameraTargetRef = useRef<Camera | null>(null)
  const storyRef = useRef(storyMode)
  storyRef.current = storyMode
  const playingRef = useRef(playing)
  playingRef.current = playing
  const cargoRef = useRef<CargoId | 'all'>(cargo)
  cargoRef.current = cargo
  const hoveredRef = useRef<GateId | null>(hovered)
  hoveredRef.current = hovered
  const capeLanesRef = useRef(0)
  capeLanesRef.current = capeLanes
  const capeLoadRef = useRef(0)
  capeLoadRef.current = model ? clamp(capeLanes / Math.max(3, model.lanes.length * 0.42), 0, 1) : 0

  const modelRef = useRef<WorldModel | null>(null)
  const runtimeRef = useRef<Array<LaneRuntime>>([])
  const blendedRef = useRef<Array<Float64Array>>([])
  const shipsRef = useRef<Array<Ship>>([])
  const ringMetaRef = useRef<Array<RingMeta>>([])
  const closeAnimRef = useRef<Record<string, number>>({})
  const pulseRef = useRef<Record<string, number>>({})
  const closedRef = useRef<ReadonlySet<GateId>>(closed)
  const gateScreenRef = useRef<{ worldW: number; gates: Array<{ id: GateId; x: number; y: number }> }>({
    worldW: 360,
    gates: [],
  })
  const timersRef = useRef<Array<number>>([])
  const reserveRef = useRef(180)
  const plateRef = useRef(true)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    reducedMotionRef.current = false
  }, [])

  useEffect(() => {
    if (!model) return
    modelRef.current = model
    ringMetaRef.current = model.land.map((ring) => {
      let minLon = Infinity
      let maxLon = -Infinity
      let minLat = Infinity
      let maxLat = -Infinity
      for (let index = 0; index < ring.length; index += 2) {
        if (ring[index] < minLon) minLon = ring[index]
        if (ring[index] > maxLon) maxLon = ring[index]
        if (ring[index + 1] < minLat) minLat = ring[index + 1]
        if (ring[index + 1] > maxLat) maxLat = ring[index + 1]
      }
      return { minLon, maxLon, minLat, maxLat }
    })
    runtimeRef.current = model.lanes.map(() => ({
      variant: 0,
      previous: 0,
      morph: 1,
      severed: false,
      blockAt: 1,
    }))
    blendedRef.current = model.lanes.map((lane) => Float64Array.from(lane.variants[0].points))

    const budget = window.innerWidth < 720 ? 430 : 760
    const totalWeight = model.lanes.reduce((total, lane) => total + lane.weight, 0)
    const ships: Array<Ship> = []
    model.lanes.forEach((lane, index) => {
      const count = Math.max(6, Math.round((lane.weight / totalWeight) * budget))
      for (let ship = 0; ship < count; ship += 1) {
        ships.push({
          lane: index,
          s: (ship + Math.random() * 0.6) / count,
          // One water speed for everyone, so a longer route genuinely takes longer.
          speed: 0.105 / lane.variants[0].km,
          jitter: Math.random(),
        })
      }
    })
    shipsRef.current = ships
    closeAnimRef.current = Object.fromEntries(model.gates.map((gate) => [gate.id, 0]))
    pulseRef.current = Object.fromEntries(model.gates.map((gate) => [gate.id, 0]))
  }, [model])

  useEffect(() => {
    closedRef.current = closed
    if (!modelRef.current) return
    laneStates.forEach((state, index) => {
      const runtime = runtimeRef.current[index]
      if (!runtime) return
      const nextVariant = state.variant < 0 ? runtime.variant : state.variant
      if (nextVariant !== runtime.variant) {
        runtime.previous = runtime.variant
        runtime.variant = nextVariant
        runtime.morph = 0
      }
      runtime.severed = state.severed
      runtime.blockAt = state.blockAt
    })
  }, [closed, laneStates])

  function clearTimers() {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }

  function after(ms: number, run: () => void) {
    timersRef.current.push(window.setTimeout(run, ms))
  }

  useEffect(() => () => clearTimers(), [])

  /**
   * The dock (subtitle rail or freebar) and the readout band both change height with
   * content and screen width, so measure them instead of guessing: the chart trims to
   * fit, and gets the space back the moment immersive view hides them.
   */
  function measureDock() {
    const root = rootRef.current
    if (!root) return
    const rootRect = root.getBoundingClientRect()
    const dockElement = root.querySelector('.experience-freebar-main') ?? root.querySelector('.guide-card')
    const dockRect = dockElement?.getBoundingClientRect()
    const dockShown = Boolean(dockRect) && dockRect!.height > 4 && isVisible(dockElement)
    // Phone story chapters: the caption owns the top band and the readout sits above the slim story bar.
    const phoneStory = storyRef.current && rootRect.width < 720
    const dockHeight = phoneStory ? 72 : dockShown ? Math.max(0, rootRect.bottom - dockRect!.top) + 12 : 18
    root.style.setProperty('--choke-dock', `${Math.round(dockHeight)}px`)
    const readout = readoutRef.current
    const readoutHeight = readout && readout.offsetHeight > 0 && isVisible(readout) ? readout.offsetHeight + 14 : 0
    reserveRef.current = dockHeight + readoutHeight
    plateRef.current = !storyRef.current && isVisible(root.querySelector('.choke-plate'))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId = 0
    let previous = performance.now()
    let clock = 0
    let frames = 0

    const frame = (now: number) => {
      frameId = window.requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1_000))
      previous = now

      try {
        const currentModel = modelRef.current
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        if (frames % 12 === 1) measureDock()
        frames += 1

        const scene = sceneRef.current
        const anim = animRef.current
        anim.lanes = approach(anim.lanes, scene.lanes, dt, 0.5)
        anim.ships = approach(anim.ships, scene.ships, dt, 0.6)
        anim.spotlight = approach(anim.spotlight, scene.spotlight, dt, 0.34)
        anim.everGiven = approach(anim.everGiven, scene.everGiven, dt, 0.4)
        anim.capeStat = approach(anim.capeStat, scene.capeStat, dt, 0.42)

        const mobile = width < 720
        const base: Camera = mobile ? { lon0: 56, lat0: 12, zoom: 1 } : { lon0: 40, lat0: 8, zoom: 1 }

        if (!currentModel) {
          const emptyView = computeView(width, height, storyRef.current, reserveRef.current, plateRef.current, base)
          drawSea(ctx, emptyView)
          drawGraticule(ctx, emptyView)
          return
        }

        clock += playingRef.current ? dt : dt * 0.06

        // Camera: story beats steer it. Otherwise a phone pulls back far enough to
        // frame whatever the reader just shut; a desktop already sees the whole world.
        let target = cameraTargetRef.current ?? base
        if (!cameraTargetRef.current && mobile && closedRef.current.size > 0) {
          let minLon = Infinity
          let maxLon = -Infinity
          let sumLat = 0
          let points = 0
          const include = (lon: number, lat: number) => {
            if (lon < minLon) minLon = lon
            if (lon > maxLon) maxLon = lon
            sumLat += lat
            points += 1
          }
          include(32.55, 30.2)
          include(100.9, 2.9)
          for (const gate of currentModel.gates) {
            if (closedRef.current.has(gate.id)) include(gate.lon, gate.lat)
          }
          if (capeLanesRef.current > 0) include(currentModel.capeOfGoodHope.lon, currentModel.capeOfGoodHope.lat)
          const span = Math.max(60, maxLon - minLon + 44)
          target = {
            lon0: (minLon + maxLon) / 2,
            lat0: clamp(sumLat / points, -6, 24),
            zoom: clamp(132 / span, 0.4, 1.1),
          }
        }

        const camera = cameraRef.current
        const tau = 0.55
        camera.lon0 = approach(camera.lon0, target.lon0, dt, tau)
        camera.lat0 = approach(camera.lat0, target.lat0, dt, tau)
        camera.zoom = Math.exp(approach(Math.log(camera.zoom), Math.log(target.zoom), dt, tau))

        const view = computeView(width, height, storyRef.current, reserveRef.current, plateRef.current, camera)

        for (const gate of currentModel.gates) {
          const shut = closedRef.current.has(gate.id) ? 1 : 0
          closeAnimRef.current[gate.id] = approach(closeAnimRef.current[gate.id] ?? 0, shut, dt, 0.24)
          pulseRef.current[gate.id] = Math.max(0, (pulseRef.current[gate.id] ?? 0) - dt / 1.1)
        }

        const runtime = runtimeRef.current
        const blended = blendedRef.current
        for (let index = 0; index < currentModel.lanes.length; index += 1) {
          const state = runtime[index]
          if (state.morph < 1) state.morph = Math.min(1, state.morph + dt / 1.45)
          const eased = state.morph * state.morph * (3 - 2 * state.morph)
          blendLane(currentModel.lanes[index], state.previous, state.variant, eased, blended[index])
        }

        if (playingRef.current) {
          const rate = reducedMotionRef.current ? 0.2 : 1
          for (const ship of shipsRef.current) {
            const state = runtime[ship.lane]
            ship.s += ship.speed * dt * rate
            if (ship.s > 1) ship.s -= 1
            if (state.severed) {
              // Ships pile up short of a shut gate instead of sailing through it.
              const stop = Math.max(0.02, state.blockAt - 0.012 - ship.jitter * 0.05)
              if (ship.s > stop) ship.s = stop
            }
          }
        }

        drawSea(ctx, view)
        drawGraticule(ctx, view)
        drawLand(ctx, view, currentModel.land, ringMetaRef.current, dpr)
        drawLanes(ctx, view, currentModel, runtime, blended, anim, cargoRef.current)
        drawShips(ctx, view, currentModel, blended, shipsRef.current, anim, cargoRef.current, reducedMotionRef.current)
        drawQueues(ctx, view, currentModel, runtime, blended, clock)
        drawPipelines(ctx, view, currentModel, closeAnimRef.current.hormuz ?? 0, labelsRef.current)
        drawCape(ctx, view, currentModel, capeLoadRef.current, labelsRef.current, anim.capeStat)
        drawGates(
          ctx,
          view,
          currentModel,
          closeAnimRef.current,
          pulseRef.current,
          labelsRef.current,
          anim,
          hoveredRef.current,
          anim.everGiven > 0.25 ? 'suez' : null,
        )
        drawEverGiven(ctx, view, currentModel, anim.everGiven, labelsRef.current, clock, dpr)
        drawFootnote(ctx, view, labelsRef.current)

        gateScreenRef.current = {
          worldW: view.worldW,
          gates: currentModel.gates.map((gate) => ({
            id: gate.id,
            x: projectX(view, gate.lon),
            y: projectY(view, gate.lat),
          })),
        }
      } catch (error) {
        window.cancelAnimationFrame(frameId)
        console.error('[trade-chokepoints] render stopped', error)
      }
    }

    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  /* --------------------------------------------------------------- actions -- */

  function toggleGate(id: GateId) {
    controls.registerInteraction()
    pulseRef.current[id] = 1
    setClosed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openAll() {
    controls.registerInteraction()
    setClosed(new Set())
    cameraTargetRef.current = null
  }

  /** Gate hit-test in screen space, aware of the ±360° copies of the chart. */
  function pickGate(px: number, py: number, mobile: boolean) {
    const { worldW, gates } = gateScreenRef.current
    let best: GateId | null = null
    let bestDistance = mobile ? 30 : 26
    for (const gate of gates) {
      for (const turn of [-1, 0, 1]) {
        const distance = Math.hypot(px - (gate.x + turn * worldW), py - gate.y)
        if (distance < bestDistance) {
          bestDistance = distance
          best = gate.id
        }
      }
    }
    return best
  }

  function handleCanvasPointer(event: ReactPointerEvent<HTMLCanvasElement>, commit: boolean) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const picked = pickGate(event.clientX - rect.left, event.clientY - rect.top, canvas.clientWidth < 720)
    if (commit) {
      if (picked) toggleGate(picked)
      return
    }
    setHovered((current) => (current === picked ? current : picked))
  }

  const guideSteps: Array<GuideStep> = [
    {
      title: '你买的东西，八成走过海',
      body: '按 UNCTAD 的统计，国际贸易约八成的货物量靠海运。看着它出现：几百个光点亮起来，铺满全球干线航道。',
      durationMs: 6_400,
      action: () => {
        clearTimers()
        cameraTargetRef.current = null
        setClosed(new Set())
        sceneRef.current = { lanes: 0.16, ships: 0, spotlight: 0, everGiven: 0, capeStat: 0 }
        after(420, () => { sceneRef.current = { ...sceneRef.current, lanes: 1 } })
        after(1_000, () => { sceneRef.current = { ...sceneRef.current, ships: 1 } })
      },
    },
    {
      title: '它们只穿过几个针眼',
      body: '大洋很宽，干线却全挤在七处针眼上。逐个亮起来：马六甲、霍尔木兹、苏伊士、曼德、丹麦、博斯普鲁斯、巴拿马。环上是真实的石油通过量。',
      durationMs: 7_600,
      action: () => {
        clearTimers()
        cameraTargetRef.current = null
        setClosed(new Set())
        sceneRef.current = { lanes: 1, ships: 1, spotlight: 1, everGiven: 0, capeStat: 0 }
        GATE_ORDER.forEach((gate, index) => {
          after(320 + index * 460, () => { pulseRef.current[gate] = 1 })
        })
      },
    },
    {
      title: '关掉苏伊士',
      body: '闸门合拢，亚欧干线当场改道好望角：多绕约 6,700 公里、多走十天上下。船流是滑过去的，不是换了一张图。',
      durationMs: 8_400,
      action: () => {
        clearTimers()
        setClosed(new Set())
        sceneRef.current = { lanes: 1, ships: 1, spotlight: 0, everGiven: 0, capeStat: 0 }
        cameraTargetRef.current = { lon0: 36, lat0: 4, zoom: 1.3 }
        after(1_100, () => {
          pulseRef.current.suez = 1
          setClosed(new Set<GateId>(['suez']))
        })
      },
    },
    {
      title: '2021 年真的堵过六天',
      body: '长赐号横在河道里，苏伊士停摆六天，Lloyd’s List 估每天约 96 亿美元货值被拦在两头。这不是假设。',
      durationMs: 9_200,
      action: () => {
        clearTimers()
        setClosed(new Set<GateId>(['suez']))
        sceneRef.current = { lanes: 1, ships: 1, spotlight: 0, everGiven: 0, capeStat: 0 }
        cameraTargetRef.current = { lon0: 34, lat0: 26, zoom: 2.4 }
        after(800, () => { sceneRef.current = { ...sceneRef.current, everGiven: 1 } })
        after(4_500, () => {
          cameraTargetRef.current = { lon0: 30, lat0: -4, zoom: 1.12 }
          sceneRef.current = { ...sceneRef.current, everGiven: 0, capeStat: 1 }
        })
      },
    },
    {
      title: '亲手关掉一条海峡',
      body: '全部打开，控制权交还给你。点地图上的环，或者用底栏芯片，一个一个关，看世界怎样被逐步掐断。',
      durationMs: 7_000,
      action: () => {
        clearTimers()
        setClosed(new Set())
        cameraTargetRef.current = null
        sceneRef.current = { ...freeScene }
      },
    },
  ]

  function returnToFree() {
    clearTimers()
    cameraTargetRef.current = null
    sceneRef.current = { ...freeScene }
  }

  const formatKm = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value))
  const cargoLabel = (id: CargoId) =>
    id === 'container' ? tx('集装箱') : id === 'crude' ? tx('原油') : id === 'lng' ? tx('天然气') : tx('粮食')

  return (
    <div ref={rootRef} className={`oss-experience choke-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="choke-canvas"
        aria-label={tx('全球海运航道与七处咽喉要道地图')}
        onPointerDown={(event) => handleCanvasPointer(event, true)}
        onPointerMove={(event) => handleCanvasPointer(event, false)}
        onPointerLeave={() => setHovered(null)}
      />

      {failed && <p className="choke-status" data-experience-overlay="true">{tx('航道数据没有加载成功')}</p>}
      {!failed && !model && <p className="choke-status" data-experience-overlay="true">{tx('正在载入全球航道…')}</p>}

      {!storyMode && (
        <header className="choke-plate" data-experience-overlay="true">
          <span>{tx('海运与咽喉要道')}</span>
          <h1>{tx('关掉一条海峡，世界要多绕多远？')}</h1>
        </header>
      )}

      <aside ref={readoutRef} className="choke-readout" data-experience-overlay="true">
        <div className="choke-readout-row is-key">
          <small>{tx('已关闭咽喉')}</small>
          <b>{summary ? summary.closedCount : 0} / {GATE_ORDER.length}</b>
        </div>
        <div className="choke-readout-row is-key">
          <small>{tx('受影响航线')}</small>
          <b>{summary ? summary.affected : 0} / {summary ? summary.laneTotal : 0}</b>
        </div>
        <div className="choke-readout-row is-key">
          <small>{tx('平均绕行')}</small>
          <b>+{summary ? formatKm(summary.averageExtraKm) : 0} km</b>
        </div>
        <div className="choke-readout-row is-key">
          <small>{tx('平均多走（天）')}</small>
          <b>+{summary ? summary.averageExtraDays.toFixed(1) : '0.0'}</b>
        </div>
        <div className="choke-readout-row">
          <small>{tx('受阻通过量')}</small>
          <b>
            {summary ? summary.blockedMbd.toFixed(1) : '0.0'} {labels.mbd}
            <i>{summary ? `${Math.round(summary.blockedShare * 100)}%` : '0%'}</i>
          </b>
        </div>
        <div className="choke-readout-row">
          <small>{tx('断航（没有海上替代）')}</small>
          <b>{summary ? summary.severed : 0}</b>
        </div>
        <div className="choke-readout-row">
          <small>{tx('绕行好望角')}</small>
          <b>{capeLanes}</b>
        </div>
        <p>
          <span>{tx('最长绕行')}{worstLane ? ` ${worstLane.name} +${formatKm(worstLane.km)} km` : ' —'}</span>
          <span>{tx('通过量为 EIA 2023 石油海运量 · 同时关闭多处会重复计入')}</span>
          <span>{tx('天数按 14 节均速估算 · 不含排队与靠港')}</span>
        </p>
      </aside>

      {!storyMode && (
        <Freebar
          className="choke-freebar"
          mainClassName="choke-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondary={(
            <div className="choke-tray">
              <div className="choke-layer-chips choke-chip-rail experience-freebar-chips" role="group" aria-label={tx('货种图层')}>
                <button
                  type="button"
                  className={`choke-layer${cargo === 'all' ? ' is-on' : ''}`}
                  onClick={() => {
                    controls.registerInteraction()
                    setCargo('all')
                  }}
                >
                  {tx('全部')}
                </button>
                {CARGO_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`choke-layer choke-layer-${id}${cargo === id ? ' is-on' : ''}`}
                    onClick={() => {
                      controls.registerInteraction()
                      setCargo(id)
                    }}
                  >
                    {cargoLabel(id)}
                  </button>
                ))}
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('trade-chokepoints')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <div className="choke-gate-chips choke-chip-rail experience-freebar-rail" role="group" aria-label={tx('七处咽喉要道开关')}>
            {GATE_ORDER.map((id) => {
              const shut = closed.has(id)
              return (
                <button
                  key={id}
                  type="button"
                  className={`choke-gate${shut ? ' is-shut' : ''}`}
                  aria-pressed={shut}
                  onClick={() => toggleGate(id)}
                  onPointerEnter={() => setHovered(id)}
                  onPointerLeave={() => setHovered(null)}
                >
                  <i aria-hidden="true" />
                  {labels.gatesShort[id]}
                </button>
              )
            })}
          </div>

          <div className="experience-freebar-actions choke-main-actions">
            <button type="button" className="choke-action" onClick={openAll} disabled={closed.size === 0}>
              {tx('全开')}
            </button>
            <button
              type="button"
              className="experience-freebar-play"
              data-playing={playing ? 'true' : 'false'}
              onClick={() => {
                controls.registerInteraction()
                setPlaying((current) => !current)
              }}
              aria-label={playing ? tx('暂停船流') : tx('播放船流')}
            >
              {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
            </button>
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="trade-chokepoints"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'monumental', width: 'wide' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'top-left', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'top-left', treatment: 'editorial', cue: 'up' },
          { position: 'top-center', mobilePosition: 'top-center', treatment: 'annotation' },
        ]}
        showReplayChip={false}
        onExit={() => {
          returnToFree()
          enterFree()
        }}
      />
      {!storyMode && (
        <GhostHint
          worldId="trade-chokepoints"
          gesture={{ type: 'tap', target: '.choke-gate', label: '关掉一条海峡' }}
        />
      )}
    </div>
  )
}
