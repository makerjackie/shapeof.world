import { DEST_INK, INK, NOTE_INK, mix, rgba, type Dest } from '../art/palette'
import { NUMERAL_FONT } from '../art/note-art'
import {
  formatLength,
  formatLifetimes,
  formatMoney,
  hiddenTax,
  lifetimeByDest,
  lifetimeSpend,
  lifetimesIn,
  stackHeight,
  type Locale,
  type Profile,
  type RulerTarget,
} from '../money-model'
import { clamp01, easeInOut, hash01, lerp, smooth, Tween } from './anim'
import { drawGlobe, drawMountain, drawPerson, drawStation, drawTower } from './figures'
import type { Rect } from './note-view'

export type StackLabels = {
  dest: Record<Dest, string>
  defense: string
  hiddenTax: string
  year: (n: number) => string
  landmarks: { tower: string; everest: string; karman: string; station: string; geo: string; moon: string }
  sans: string
  serif: string
  revenue: string
  profit: string
}

const EARTH_R = 6371e3
const MOON_ALT = 378000e3
const NOTE_W = 0.155
const NOTE_D = 0.077

const CATEGORY_INKS = ['#e9c98d', '#d9a47a', '#c5b38a', '#b8c49a', '#a8b7c9', '#c7a6b8', '#d6c0a0', '#9fa7a0']

const edgeCache = new Map<string, HTMLCanvasElement>()
/** Side of a stack of notes: thousands of paper edges, one per device pixel row. */
function edgeTexture(tint: string, ink: string): HTMLCanvasElement {
  const key = `${tint}|${ink}`
  const hit = edgeCache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 1024
  const c = canvas.getContext('2d')
  if (c) {
    for (let y = 0; y < canvas.height; y++) {
      const n = hash01(y * 1.7)
      const tone = n < 0.08 ? mix(tint, ink, 0.55) : n < 0.5 ? mix(tint, '#ffffff', 0.12 + 0.2 * hash01(y)) : mix(tint, '#5a4535', 0.08 + 0.18 * hash01(y * 3.1))
      c.fillStyle = tone
      c.fillRect(0, y, canvas.width, 1)
    }
    const shade = c.createLinearGradient(0, 0, canvas.width, 0)
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.18)')
    shade.addColorStop(0.15, 'rgba(255, 255, 255, 0)')
    shade.addColorStop(0.75, 'rgba(0, 0, 0, 0.06)')
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.32)')
    c.fillStyle = shade
    c.fillRect(0, 0, canvas.width, canvas.height)
  }
  edgeCache.set(key, canvas)
  return canvas
}

type BandSpec = { key: string; label: string; amount: number; ink: string }

export class StackView {
  profile: Profile
  /** log of metres visible vertically. */
  logH = new Tween(Math.log(3.6))
  colFrac = new Tween(0.5)
  build = new Tween(1)
  bands = new Tween(0)
  bandMode: 'dest' | 'category' = 'dest'
  morph = new Tween(0)
  highlight: string | null = null
  highlightT = new Tween(0)
  defenseT = new Tween(0)
  column = new Tween(0)
  columnLabel = new Tween(0)
  target: RulerTarget | null = null
  /** Ruler stops passed so far; each leaves a labelled tick. */
  stops: Array<RulerTarget> = []
  pairT = new Tween(0)
  yearCounter = new Tween(0)
  /** Build window for the falling-note cascade. */
  buildFrom: number | null = null
  buildTo = 0
  /** Screen rectangle of the top note, refreshed every frame for hand-offs. */
  lastTop = { x: 0, y: 0, w: 30, h: 15 }
  stars: Array<readonly [number, number, number]>

  constructor(profile: Profile) {
    this.profile = profile
    this.stars = Array.from({ length: 320 }, (_, i) => [hash01(i * 1.31), hash01(i * 7.77 + 3), hash01(i * 2.9 + 1)] as const)
  }

  lifeHeight() {
    return stackHeight(lifetimeSpend(this.profile))
  }

  /** Camera view height that frames a column of `h` metres. */
  static frameFor(h: number) {
    return Math.max(3.5, h * 1.32)
  }

  private bandsFor(labels: StackLabels, locale: Locale, mode: 'dest' | 'category'): Array<BandSpec> {
    if (mode === 'dest') {
      return lifetimeByDest(this.profile).map(({ dest, amount }) => ({ key: dest, label: labels.dest[dest], amount, ink: DEST_INK[dest] }))
    }
    return this.profile.categories.map((c, i) => ({
      key: c.id,
      label: c.label[locale],
      amount: c.annual * this.profile.lifeExpectancy,
      ink: CATEGORY_INKS[i % CATEGORY_INKS.length],
    }))
  }

  render(ctx: CanvasRenderingContext2D, t: number, focus: Rect, labels: StackLabels, locale: Locale, alpha: number, zoomIn = 0) {
    if (alpha <= 0.01) return
    const viewH = Math.exp(this.logH.value(t)) * (1 - zoomIn * 0.82)
    const usable = focus.h
    const s0 = (usable * 0.8) / viewH
    const earthPx = EARTH_R * s0
    const pad = usable * 0.08 + Math.min(2 * earthPx, usable * 0.16)
    const s = (usable - pad - usable * 0.06) / viewH
    const ui = Math.max(0.9, Math.min(1.3, focus.h / 640))
    const groundY = focus.y + usable - pad + zoomIn * usable * 0.9
    const colX = focus.x + focus.w * this.colFrac.value(t)
    const py = (m: number) => groundY - m * s
    const lifeH = this.lifeHeight()
    const ink = NOTE_INK[this.profile.id]
    ctx.save()
    ctx.globalAlpha = alpha

    // Stars at altitude.
    const space = smooth((Math.log10(viewH) - 4.3) / 1.6)
    if (space > 0.01) {
      ctx.save()
      for (const [fx, fy, m] of this.stars) {
        ctx.globalAlpha = alpha * space * (0.25 + m * 0.6)
        ctx.fillStyle = m > 0.8 ? INK.gold : INK.cream
        const size = m > 0.92 ? 1.6 : 0.9
        ctx.fillRect(focus.x + fx * focus.w, focus.y + fy * focus.h * 0.95, size, size)
      }
      ctx.restore()
    }

    // Ground or Earth.
    const rPx = EARTH_R * s
    if (rPx < 4e5) {
      if (rPx < 40) {
        const halo = ctx.createRadialGradient(colX, groundY + rPx, 0, colX, groundY + rPx, 26)
        halo.addColorStop(0, 'rgba(120, 180, 230, 0.4)')
        halo.addColorStop(1, 'rgba(120, 180, 230, 0)')
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(colX, groundY + rPx, 26, 0, Math.PI * 2)
        ctx.fill()
      }
      const halo = Math.max(5, Math.min(60e3 * s, focus.h * 0.08, Math.max(4, rPx) * 0.22))
      drawGlobe(ctx, colX, groundY + rPx, Math.max(4, rPx), rgba(INK.cream, 0.6), 'rgba(110, 170, 220, 0.28)', alpha, false, halo)
    } else {
      ctx.save()
      const floor = ctx.createLinearGradient(0, groundY, 0, groundY + 80)
      floor.addColorStop(0, 'rgba(244, 236, 218, 0.08)')
      floor.addColorStop(1, 'rgba(244, 236, 218, 0)')
      ctx.fillStyle = floor
      ctx.fillRect(0, groundY, focus.x + focus.w + 2000, 80)
      ctx.strokeStyle = rgba(INK.cream, 0.35)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, groundY + 0.5)
      ctx.lineTo(focus.x + focus.w + 2000, groundY + 0.5)
      ctx.stroke()
      ctx.restore()
    }

    // Landmarks.
    const vis = (h: number) => {
      const r = h / viewH
      return smooth((r - 0.01) / 0.05) * (1 - smooth((r - 1.15) / 0.3))
    }
    const lmInk = rgba(INK.cream, 0.7)
    const quietLandmarks = this.pairT.value(t) > 0.5
    const lmLabel = (text: string, x: number, y: number, a: number, align: CanvasTextAlign = 'left') => {
      if (a <= 0.02 || quietLandmarks) return
      ctx.save()
      ctx.globalAlpha = alpha * a
      ctx.fillStyle = rgba(INK.cream, 0.72)
      ctx.font = `500 ${Math.round(12 * ui)}px ${labels.sans}`
      ctx.textAlign = align
      ctx.fillText(text, x, y)
      ctx.restore()
    }
    const towerA = vis(828)
    const towerX = colX + Math.max(70, 0.2 * focus.w)
    drawTower(ctx, towerX, groundY, 828 * s, lmInk, towerA)
    lmLabel(`${labels.landmarks.tower} · ${formatLength(828, locale)}`, towerX + 828 * s * 0.08 + 6, py(828) + 4, towerA)
    const everestA = vis(8849)
    const mountainX = colX + Math.max(150, 0.32 * focus.w)
    if (rPx > 2e3) {
      drawMountain(ctx, mountainX, groundY, 8849 * s, lmInk, everestA)
      lmLabel(`${labels.landmarks.everest} · ${formatLength(8849, locale)}`, mountainX + 8849 * s * 0.2, py(8849) - 6, everestA)
    }
    const labelTop = this.columnLabel.value(t) > 0.05 && this.target ? py(this.column.value(t)) : null
    const horizon = (h: number, text: string) => {
      const a = vis(h)
      if (a <= 0.02) return
      const y = py(h)
      // The ruler's own label wins when they would touch.
      const clear = labelTop === null || Math.abs(y - labelTop) > 46 * ui
      ctx.save()
      ctx.globalAlpha = alpha * a * 0.6
      ctx.strokeStyle = rgba(INK.cream, 0.5)
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.moveTo(focus.x + 10, y)
      ctx.lineTo(focus.x + focus.w - 10, y)
      ctx.stroke()
      ctx.restore()
      // Horizon names sit left of the column so they never collide with the ruler label.
      if (clear) lmLabel(`${text} · ${formatLength(h, locale)}`, focus.x + 12, y - 6, a, 'left')
    }
    horizon(100e3, labels.landmarks.karman)
    const stationA = vis(400e3)
    const stationX = colX + Math.max(90, 0.24 * focus.w)
    drawStation(ctx, stationX, py(400e3), 7, rgba(INK.cream, 0.85), stationA)
    lmLabel(`${labels.landmarks.station} · ${formatLength(400e3, locale)}`, stationX + 14, py(400e3) + 4, stationA)
    horizon(35786e3, labels.landmarks.geo)
    const moonA = vis(MOON_ALT)
    if (moonA > 0.02) {
      ctx.save()
      ctx.globalAlpha = alpha * moonA * 0.5
      ctx.strokeStyle = rgba(INK.cream, 0.45)
      ctx.setLineDash([2, 7])
      ctx.beginPath()
      ctx.moveTo(focus.x + 10, py(MOON_ALT))
      ctx.lineTo(focus.x + focus.w - 10, py(MOON_ALT))
      ctx.stroke()
      ctx.restore()
    }
    const moonR = Math.max(5, 1737e3 * s)
    const moonX = colX + Math.max(60, focus.w * 0.18)
    drawGlobe(ctx, moonX, py(MOON_ALT), moonR, rgba(INK.cream, 0.8), 'rgba(240, 230, 200, 0.12)', moonA, true)
    lmLabel(`${labels.landmarks.moon} · ${formatLength(MOON_ALT + 6371e3, locale)}`, moonX + moonR + 10, py(MOON_ALT) + 4, moonA)

    // Person beside the stack.
    const personPx = 1.7 * s
    const personA = smooth((personPx - 8) / 30)
    drawPerson(ctx, colX - Math.max(0.55 * s, 14), groundY, personPx, rgba(INK.cream, 0.78), personA)

    // Column beyond the lifetime stack.
    const colH = this.column.value(t)
    if (colH > lifeH * 1.001 && this.pairT.value(t) < 0.99) {
      const top = py(colH)
      const w = Math.max(2.2, NOTE_W * s)
      ctx.save()
      const g = ctx.createLinearGradient(0, top, 0, groundY)
      g.addColorStop(0, rgba(INK.gold, 0.95))
      g.addColorStop(1, rgba(mix(INK.gold, ink.ink, 0.35), 0.9))
      ctx.shadowColor = rgba(INK.gold, 0.8)
      ctx.shadowBlur = 16
      ctx.fillStyle = g
      ctx.fillRect(colX - w / 2, top, w, groundY - top)
      ctx.restore()
    }

    const pairA = this.pairT.value(t)
    if (pairA < 0.99) {
      ctx.save()
      ctx.globalAlpha = alpha * (1 - pairA)
      this.drawStack(ctx, t, colX, groundY, s, labels, locale, alpha * (1 - pairA), focus, ui)
      this.drawRulerLabels(ctx, t, colX, py, labels, locale, alpha * (1 - pairA), focus, ui)
      ctx.restore()
    }
    if (pairA > 0.01) this.drawPair(ctx, colX, groundY, py, labels, locale, alpha * pairA, focus, ui)
    ctx.restore()
  }

  private drawStack(
    ctx: CanvasRenderingContext2D,
    t: number,
    colX: number,
    groundY: number,
    s: number,
    labels: StackLabels,
    locale: Locale,
    alpha: number,
    focus: Rect,
    ui: number,
  ) {
    const lifeH = this.lifeHeight()
    const h = lifeH * this.build.value(t)
    const hw = (NOTE_W * s) / 2
    if (hw < 1.2) {
      if (h * s > 1) {
        ctx.save()
        ctx.fillStyle = rgba(INK.paper, 0.9)
        ctx.fillRect(colX - 1.1, groundY - h * s, 2.2, h * s)
        ctx.restore()
      }
      return
    }
    const ink = NOTE_INK[this.profile.id]
    const top = groundY - h * s
    this.lastTop = { x: colX - hw, y: top - hw, w: hw * 2, h: hw }
    const dx = NOTE_D * 0.62 * s
    const dy = -NOTE_D * 0.42 * s
    const edge = mix(INK.paper, ink.tint, 0.5)
    ctx.save()
    // Side face.
    ctx.beginPath()
    ctx.moveTo(colX + hw, groundY)
    ctx.lineTo(colX + hw + dx, groundY + dy)
    ctx.lineTo(colX + hw + dx, top + dy)
    ctx.lineTo(colX + hw, top)
    ctx.closePath()
    ctx.fillStyle = mix(edge, '#000000', 0.42)
    ctx.fill()
    // Front face: paper edges, a rim light, and bundle seams when they resolve.
    const bundlePx = 0.01 * s
    const texture = edgeTexture(edge, ink.ink)
    const tileH = Math.max(64, Math.min(1024, 0.6 * s))
    ctx.save()
    ctx.beginPath()
    ctx.rect(colX - hw, top, hw * 2, groundY - top)
    ctx.clip()
    for (let y = groundY; y > top - tileH; y -= tileH) ctx.drawImage(texture, colX - hw, y - tileH, hw * 2, tileH)
    ctx.restore()
    const glow = ctx.createLinearGradient(colX - hw, 0, colX + hw, 0)
    glow.addColorStop(0, 'rgba(255, 240, 210, 0.35)')
    glow.addColorStop(0.08, 'rgba(255, 240, 210, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(colX - hw, top, hw * 2, groundY - top)
    if (bundlePx >= 2.2) {
      const count = Math.floor(h / 0.01)
      ctx.lineWidth = 1
      for (let i = 0; i < count; i++) {
        const y = groundY - (i + 1) * bundlePx
        const jitter = (hash01(i * 3.3) - 0.5) * 0.004 * s
        ctx.strokeStyle = i % 10 === 9 ? 'rgba(60, 40, 30, 0.38)' : 'rgba(70, 50, 35, 0.16)'
        ctx.beginPath()
        ctx.moveTo(colX - hw + jitter, y + 0.5)
        ctx.lineTo(colX + hw + jitter, y + 0.5)
        ctx.stroke()
      }
    }
    // Top face: the face of the top note.
    ctx.beginPath()
    ctx.moveTo(colX - hw, top)
    ctx.lineTo(colX + hw, top)
    ctx.lineTo(colX + hw + dx, top + dy)
    ctx.lineTo(colX - hw + dx, top + dy)
    ctx.closePath()
    ctx.fillStyle = mix(INK.paper, ink.ink, 0.35)
    ctx.fill()
    ctx.strokeStyle = rgba(ink.deep, 0.7)
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
    // Soft light pooling on the floor around the stack.
    const pool = ctx.createRadialGradient(colX, groundY, 0, colX, groundY, Math.max(40, h * s * 0.45))
    pool.addColorStop(0, rgba(INK.gold, 0.14))
    pool.addColorStop(1, rgba(INK.gold, 0))
    ctx.save()
    ctx.fillStyle = pool
    ctx.scale(1, 0.22)
    ctx.beginPath()
    ctx.arc(colX, groundY / 0.22, Math.max(40, h * s * 0.45), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    this.drawCascade(ctx, t, colX, top, hw, s, focus)

    // Bands.
    const bandsA = this.bands.value(t)
    if (bandsA > 0.01 && h > 0) {
      const morph = this.morph.value(t)
      const destBands = this.bandsFor(labels, locale, 'dest')
      const catBands = this.bandsFor(labels, locale, 'category')
      const active = this.bandMode === 'dest' ? destBands : catBands
      const total = active.reduce((a, b) => a + Math.max(0, b.amount), 0)
      const hl = this.highlightT.value(t)
      let cursor = 0
      const placed: Array<{ band: BandSpec; y0: number; y1: number }> = []
      ctx.save()
      ctx.globalAlpha = alpha * bandsA
      active.forEach((band) => {
        const frac = Math.max(0, band.amount) / total
        const y0 = groundY - cursor * h * s
        const y1 = groundY - (cursor + frac) * h * s
        cursor += frac
        placed.push({ band, y0, y1 })
        const dim = this.highlight && this.highlight !== band.key ? 1 - hl * 0.72 : 1
        ctx.globalAlpha = alpha * bandsA * dim * (0.55 + 0.4 * (1 - morph))
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = band.ink
        ctx.fillRect(colX - hw, y1, hw * 2, y0 - y1)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = alpha * bandsA * dim * 0.85
        ctx.fillStyle = rgba(band.ink, 0.35)
        ctx.fillRect(colX - hw, y1, hw * 2, y0 - y1)
        ctx.strokeStyle = rgba(INK.groundDeep, 0.6)
        ctx.beginPath()
        ctx.moveTo(colX - hw, y1)
        ctx.lineTo(colX + hw + dx, y1 + dy)
        ctx.stroke()
      })
      ctx.restore()
      // Labels with leader lines, pushed apart vertically.
      const labelX = colX + hw + dx + 26
      const minGap = 36 * ui
      const entries = placed.map((p) => ({ ...p, y: (p.y0 + p.y1) / 2 }))
      for (let i = 1; i < entries.length; i++) entries[i].y = Math.min(entries[i].y, entries[i - 1].y - minGap)
      const lowest = focus.y + focus.h - 6
      const overflow = entries.length ? Math.max(0, entries[0].y - lowest) : 0
      entries.forEach((e) => (e.y -= overflow))
      ctx.save()
      entries.forEach(({ band, y0, y1, y }) => {
        const dim = this.highlight && this.highlight !== band.key ? 1 - hl * 0.7 : 1
        ctx.globalAlpha = alpha * bandsA * dim
        ctx.strokeStyle = rgba(band.ink, 0.7)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(colX + hw + dx * 0.5 + 4, (y0 + y1) / 2)
        ctx.lineTo(labelX - 6, y)
        ctx.stroke()
        ctx.fillStyle = band.ink
        ctx.font = `600 ${Math.round(13 * ui)}px ${labels.sans}`
        ctx.textAlign = 'left'
        ctx.fillText(band.label, labelX, y - 3 * ui)
        ctx.fillStyle = rgba(INK.cream, 0.85)
        ctx.font = `500 ${Math.round(13 * ui)}px ${labels.sans}`
        const metres = stackHeight(band.amount)
        ctx.fillText(`${formatMoney(band.amount, this.profile, locale)} · ${formatLength(metres, locale)}`, labelX, y + 14 * ui)
      })
      ctx.restore()

      // Defense slice inside the tax band.
      const def = this.defenseT.value(t)
      const taxBand = placed.find((p) => p.band.key === 'tax')
      if (def > 0.01 && taxBand && this.bandMode === 'dest' && this.profile.id === 'cn') {
        const tax = hiddenTax(this.profile)
        const thick = Math.max(1.5, stackHeight(tax.defenseFromHiddenTax) * s)
        const yTop = taxBand.y1
        ctx.save()
        ctx.globalAlpha = alpha * def
        ctx.fillStyle = '#ffdf9a'
        ctx.shadowColor = '#ffcf6a'
        ctx.shadowBlur = 12
        ctx.fillRect(colX - hw - 2, yTop, hw * 2 + 4, thick)
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(255, 223, 154, 0.8)'
        ctx.beginPath()
        ctx.moveTo(colX - hw - 6, yTop + thick / 2)
        ctx.lineTo(colX - hw - 40, yTop + thick / 2 - 26)
        ctx.stroke()
        ctx.textAlign = 'right'
        const amountText = `${formatMoney(tax.defenseFromHiddenTax, this.profile, locale)} · ${formatLength(stackHeight(tax.defenseFromHiddenTax), locale)}`
        ctx.font = `500 ${Math.round(13 * ui)}px ${labels.sans}`
        const widest = Math.max(ctx.measureText(amountText).width, ctx.measureText(labels.defense).width + 4)
        // Keep the label on screen on narrow phones.
        const rightEdge = Math.max(colX - hw - 44, focus.x + 6 + widest)
        ctx.fillStyle = '#ffdf9a'
        ctx.font = `600 ${Math.round(13 * ui)}px ${labels.sans}`
        ctx.fillText(labels.defense, rightEdge, yTop - 30)
        ctx.fillStyle = rgba(INK.cream, 0.9)
        ctx.font = `500 ${Math.round(13 * ui)}px ${labels.sans}`
        ctx.fillText(amountText, rightEdge, yTop - 14)
        ctx.restore()
      }
    }

    // Lifetime label while building.
    const yc = this.yearCounter.value(t)
    if (yc > 0.01) {
      const years = this.profile.lifeExpectancy * this.build.value(t)
      ctx.save()
      ctx.globalAlpha = alpha * yc * (1 - bandsA)
      ctx.textAlign = 'left'
      const x = colX + hw + dx + 22
      ctx.strokeStyle = rgba(INK.gold, 0.5)
      ctx.beginPath()
      ctx.moveTo(colX + hw + dx + 4, top + dy / 2)
      ctx.lineTo(x - 6, top + dy / 2)
      ctx.stroke()
      ctx.fillStyle = INK.cream
      ctx.font = `500 ${Math.round(Math.min(34, Math.max(22, focus.h * 0.045)))}px ${NUMERAL_FONT}`
      ctx.fillText(formatMoney(lifetimeSpend(this.profile) * this.build.value(t), this.profile, locale), x, top + dy / 2 + 8)
      ctx.fillStyle = rgba(INK.gold, 0.9)
      ctx.font = `600 ${Math.round(12 * ui)}px ${labels.sans}`
      ctx.fillText(`${labels.year(Math.round(years))} · ${formatLength(h, locale)}`, x, top + dy / 2 + 28)
      ctx.restore()
    }
  }

  /** Revenue against profit for two companies: outlined revenue, solid profit. */
  private drawPair(
    ctx: CanvasRenderingContext2D,
    colX: number,
    groundY: number,
    py: (m: number) => number,
    labels: StackLabels,
    locale: Locale,
    alpha: number,
    focus: Rect,
    ui: number,
  ) {
    const pair = this.profile.pair
    const sides = [pair.left, pair.right]
    const gap = Math.max(124, Math.min(240, focus.w * 0.18))
    const centre = focus.x + focus.w * 0.5
    ctx.save()
    ctx.globalAlpha = alpha
    sides.forEach((company, i) => {
      const x = centre + (i === 0 ? -gap / 2 : gap / 2)
      const w = 14
      const revTop = Math.max(focus.y - 40, py(stackHeight(company.revenue)))
      const profTop = py(stackHeight(company.profit))
      ctx.fillStyle = rgba(INK.cream, 0.08)
      ctx.fillRect(x - w / 2, revTop, w, groundY - revTop)
      ctx.strokeStyle = rgba(INK.cream, 0.55)
      ctx.lineWidth = 1
      ctx.strokeRect(x - w / 2 + 0.5, revTop, w - 1, groundY - revTop)
      const g = ctx.createLinearGradient(0, profTop, 0, groundY)
      g.addColorStop(0, '#ffe2a0')
      g.addColorStop(1, rgba(INK.gold, 0.9))
      ctx.shadowColor = rgba(INK.gold, 0.8)
      ctx.shadowBlur = 14
      ctx.fillStyle = g
      ctx.fillRect(x - w / 2, profTop, w, groundY - profTop)
      ctx.shadowBlur = 0
      // A legend under each column keeps every figure on screen at any zoom.
      ctx.textAlign = 'center'
      ctx.fillStyle = INK.cream
      ctx.font = `600 ${Math.round(14 * ui)}px ${labels.sans}`
      ctx.fillText(company.name[locale], x, groundY + 20 * ui)
      ctx.fillStyle = rgba(INK.cream, 0.72)
      ctx.font = `500 ${Math.round(12 * ui)}px ${labels.sans}`
      ctx.fillText(`${labels.revenue} ${formatMoney(company.revenue, this.profile, locale)}${revTop <= focus.y - 39 ? ' ↑' : ''}`, x, groundY + 37 * ui)
      ctx.fillStyle = '#ffe2a0'
      ctx.font = `600 ${Math.round(12 * ui)}px ${labels.sans}`
      ctx.fillText(`${labels.profit} ${formatMoney(company.profit, this.profile, locale)}`, x, groundY + 53 * ui)
    })
    ctx.textAlign = 'center'
    ctx.fillStyle = INK.gold
    ctx.font = `600 ${Math.round(12 * ui)}px ${labels.sans}`
    ctx.fillText(pair.label[locale].toUpperCase(), centre, groundY + 74 * ui)
    ctx.restore()
  }

  /** Notes falling onto the stack while a lifetime builds up. */
  private drawCascade(ctx: CanvasRenderingContext2D, t: number, colX: number, top: number, hw: number, s: number, focus: Rect) {
    const from = this.buildFrom
    if (from === null || t < from || t > this.buildTo + 1.4) return
    const ink = NOTE_INK[this.profile.id]
    const fall = 1.3
    const gap = 0.034
    const first = Math.max(0, Math.floor((t - fall - from) / gap))
    const last = Math.floor((Math.min(t, this.buildTo) - from) / gap)
    const noteW = Math.max(16, hw * 2)
    for (let i = first; i <= last; i++) {
      const launch = from + i * gap
      const p = (t - launch) / fall
      if (p < 0 || p > 1) continue
      const r = hash01(i * 2.17)
      // Notes enter from the top of the scene, below any caption.
      const startY = focus.y + 4 + r * 30
      const sway = (1 - p) * (1 - p)
      const x = colX + Math.sin(p * 6 + r * 9) * sway * 46 + (r - 0.5) * 80 * sway
      const y = lerp(startY, top - 2, p * p)
      const flip = Math.cos(p * Math.PI * (1.5 + r * 2.5) + r)
      const faceH = (noteW / 2.01) * Math.max(0.1, Math.abs(flip))
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((r - 0.5) * 1.8 * sway)
      ctx.globalAlpha *= 0.9 * smooth(p * 8)
      ctx.fillStyle = flip > 0 ? mix(INK.paper, ink.ink, 0.22) : mix(INK.paper, ink.deep, 0.42)
      ctx.fillRect(-noteW / 2, -faceH / 2, noteW, faceH)
      ctx.strokeStyle = rgba(ink.ink, 0.85)
      ctx.lineWidth = 0.8
      ctx.strokeRect(-noteW / 2 + 1.5, -faceH / 2 + 1, noteW - 3, Math.max(0.5, faceH - 2))
      if (faceH > 5) {
        ctx.fillStyle = rgba(ink.deep, 0.75)
        ctx.beginPath()
        ctx.arc(-noteW * 0.24, 0, Math.min(faceH * 0.3, noteW * 0.12), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  private drawRulerLabels(
    ctx: CanvasRenderingContext2D,
    t: number,
    colX: number,
    py: (m: number) => number,
    labels: StackLabels,
    locale: Locale,
    alpha: number,
    focus: Rect,
    ui: number,
  ) {
    const a = this.columnLabel.value(t)
    const target = this.target
    if (!target || a <= 0.01) return
    const amount = target.amount
    const h = stackHeight(amount)
    const colH = this.column.value(t)
    const reach = clamp01((colH - this.lifeHeight()) / Math.max(1e-9, h - this.lifeHeight()))
    const shownAmount = lerp(lifetimeSpend(this.profile), amount, easeInOut(reach))
    const y = Math.max(focus.y + 70, py(colH))
    const x = colX + 18
    ctx.save()
    ctx.globalAlpha = alpha * a
    ctx.strokeStyle = rgba(INK.gold, 0.8)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(colX - 10, py(colH))
    ctx.lineTo(x + 6, py(colH))
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.fillStyle = INK.gold
    ctx.font = `600 ${Math.round(12 * ui)}px ${labels.sans}`
    ctx.fillText(target.label[locale].toUpperCase(), x + 12, y - 40)
    ctx.fillStyle = INK.cream
    ctx.font = `500 ${Math.round(Math.min(40, Math.max(26, focus.h * 0.05)))}px ${NUMERAL_FONT}`
    ctx.fillText(formatLength(stackHeight(shownAmount), locale), x + 12, y - 6)
    ctx.fillStyle = rgba(INK.cream, 0.82)
    ctx.font = `500 ${Math.round(14 * ui)}px ${labels.sans}`
    ctx.fillText(`${formatMoney(shownAmount, this.profile, locale)} = ${formatLifetimes(lifetimesIn(this.profile, shownAmount), locale)}`, x + 12, y + 16)
    ctx.restore()
  }
}
