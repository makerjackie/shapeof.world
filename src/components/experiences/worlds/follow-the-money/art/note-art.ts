import { strokeBand, strokeRosette, ROSETTES } from './guilloche'
import { INK, NOTE_INK, mix, rgba, type ProfileId } from './palette'

/**
 * An original note design: not a replica of any currency. It keeps only the
 * vocabulary every banknote shares — guilloché frame, medallion, engraved
 * numerals, microtext, a security thread and a serial number.
 */
export const NOTE_ASPECT = 2.01
export const NUMERAL_FONT = '"Didot", "Bodoni 72", "Bodoni MT", "Playfair Display", Georgia, "Times New Roman", serif'
export const SERIF_CN = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", "Noto Serif CJK SC", serif'
export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

export type NoteFace = 'front' | 'back'

type Variant = { ink: string; deep: string; paper: string; tint: string }

const cache = new Map<string, HTMLCanvasElement>()

function variantFor(profile: ProfileId, inkOverride?: string): Variant {
  const base = NOTE_INK[profile]
  if (!inkOverride) return { ink: base.ink, deep: base.deep, paper: INK.paper, tint: base.tint }
  return {
    ink: mix(inkOverride, '#000000', 0.12),
    deep: mix(inkOverride, '#000000', 0.5),
    paper: mix(INK.paper, inkOverride, 0.14),
    tint: mix(INK.paper, inkOverride, 0.5),
  }
}

function seeded(seed: number) {
  let s = 1234567 + seed * 9973
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/** Engraved numerals: the glyph is filled with diagonal hatching and outlined. */
export function hatchText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign,
  spacing: number,
  font = NUMERAL_FONT,
  weight = 700,
) {
  const w = Math.ceil(size * text.length * 0.9 + size)
  const h = Math.ceil(size * 1.4)
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const t = tmp.getContext('2d')
  if (!t) return
  t.font = `${weight} ${size}px ${font}`
  t.textBaseline = 'alphabetic'
  t.fillStyle = '#000'
  t.fillText(text, size * 0.2, size * 1.08)
  const measured = t.measureText(text).width
  // One path: source-in clears everything outside the shape being drawn.
  t.globalCompositeOperation = 'source-in'
  t.strokeStyle = color
  t.lineWidth = Math.max(1, spacing * 0.52)
  t.beginPath()
  for (let yy = -spacing; yy < h + spacing; yy += spacing) {
    t.moveTo(0, yy)
    t.lineTo(w, yy + spacing * 0.7)
  }
  t.stroke()
  t.globalCompositeOperation = 'source-over'
  t.lineWidth = Math.max(1, size * 0.014)
  t.strokeText(text, size * 0.2, size * 1.08)
  const left = align === 'right' ? x - measured - size * 0.2 : align === 'center' ? x - measured / 2 - size * 0.2 : x - size * 0.2
  ctx.drawImage(tmp, left, y - size * 1.08)
}

function microtext(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size: number, color: string) {
  ctx.save()
  ctx.font = `600 ${size}px ${MONO}`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  let line = ''
  while (ctx.measureText(line + text).width < width) line += text
  ctx.fillText(line, x, y)
  ctx.restore()
}

function paper(ctx: CanvasRenderingContext2D, w: number, h: number, v: Variant, seed: number) {
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, mix(v.paper, v.tint, 0.55))
  g.addColorStop(0.42, v.paper)
  g.addColorStop(0.75, mix(v.paper, '#ffffff', 0.25))
  g.addColorStop(1, mix(v.paper, v.tint, 0.35))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // Underprint: fine wavy lines that print under everything.
  ctx.save()
  ctx.strokeStyle = rgba(mix(v.tint, v.ink, 0.25), 0.5)
  ctx.lineWidth = Math.max(0.6, h * 0.0015)
  const rows = 84
  ctx.beginPath()
  for (let r = 0; r < rows; r++) {
    const y0 = (r / rows) * h
    for (let i = 0; i <= 140; i++) {
      const x = (i / 140) * w
      const y = y0 + Math.sin(i * 0.19 + r * 0.37 + seed) * h * 0.011 + Math.sin(i * 0.045 + r * 0.09) * h * 0.024
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
  ctx.restore()
  const rand = seeded(seed)
  ctx.save()
  ctx.lineWidth = Math.max(0.5, h * 0.0012)
  for (let i = 0; i < 1100; i++) {
    const x = rand() * w
    const y = rand() * h
    const len = h * (0.01 + rand() * 0.03)
    const ang = rand() * Math.PI
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(110, 80, 40, 0.07)' : 'rgba(255, 255, 255, 0.14)'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
    ctx.stroke()
  }
  ctx.restore()
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, v: Variant) {
  const m = h * 0.045
  const band = h * 0.07
  ctx.save()
  ctx.strokeStyle = rgba(v.ink, 0.78)
  ctx.lineWidth = Math.max(0.7, h * 0.0017)
  strokeBand(ctx, m, m, w - 2 * m, band, 40, 8)
  strokeBand(ctx, m, h - m - band, w - 2 * m, band, 40, 8)
  strokeBand(ctx, m, m + band, h - 2 * m - 2 * band, band, 9, 8, true)
  strokeBand(ctx, w - m - band, m + band, h - 2 * m - 2 * band, band, 9, 8, true)
  ctx.strokeStyle = rgba(v.deep, 0.9)
  ctx.lineWidth = Math.max(1, h * 0.004)
  ctx.strokeRect(m, m, w - 2 * m, h - 2 * m)
  ctx.lineWidth = Math.max(0.6, h * 0.0015)
  ctx.strokeRect(m + band, m + band, w - 2 * (m + band), h - 2 * (m + band))
  ctx.restore()
}

function securityThread(ctx: CanvasRenderingContext2D, x: number, h: number, v: Variant) {
  const width = h * 0.022
  ctx.save()
  for (let y = h * 0.045; y < h * 0.955; y += h * 0.07) {
    const g = ctx.createLinearGradient(x - width, 0, x + width, 0)
    g.addColorStop(0, rgba(v.deep, 0.15))
    g.addColorStop(0.5, rgba(v.deep, 0.75))
    g.addColorStop(1, rgba(v.deep, 0.15))
    ctx.fillStyle = g
    ctx.fillRect(x - width / 2, y, width, h * 0.042)
  }
  ctx.restore()
}

function foil(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(x, y, r * 0.78, r, 0, 0, Math.PI * 2)
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
  g.addColorStop(0, '#f7e7b0')
  g.addColorStop(0.3, '#c9e6e0')
  g.addColorStop(0.55, '#e6c8e6')
  g.addColorStop(0.8, '#f1d79a')
  g.addColorStop(1, '#bcd4ea')
  ctx.fillStyle = g
  ctx.globalAlpha = 0.92
  ctx.fill()
  ctx.clip()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = Math.max(0.5, r * 0.012)
  ctx.beginPath()
  for (let i = 1; i < 16; i++) {
    ctx.moveTo(x + r * i * 0.07, y)
    ctx.ellipse(x, y, r * i * 0.055, r * i * 0.07, 0, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.restore()
}

function front(ctx: CanvasRenderingContext2D, w: number, h: number, profile: ProfileId, v: Variant) {
  paper(ctx, w, h, v, profile === 'cn' ? 3 : 7)
  // A wide faint rosette fills the right field behind the numerals.
  ctx.save()
  ctx.globalAlpha = 0.18
  strokeRosette(ctx, w * 0.7, h * 0.5, h * 0.62, ROSETTES.watermark, v.ink, Math.max(0.5, h * 0.0014))
  ctx.restore()
  // Watermark window.
  const wm = ctx.createRadialGradient(w * 0.6, h * 0.46, 0, w * 0.6, h * 0.46, h * 0.3)
  wm.addColorStop(0, 'rgba(255, 252, 240, 0.7)')
  wm.addColorStop(1, 'rgba(255, 252, 240, 0)')
  ctx.fillStyle = wm
  ctx.fillRect(0, 0, w, h)
  securityThread(ctx, w * 0.47, h, v)
  frame(ctx, w, h, v)
  // Medallion with a plain centre for the currency sign.
  const mx = w * 0.255
  const my = h * 0.5
  const mr = h * 0.32
  const halo = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 1.1)
  halo.addColorStop(0, rgba(v.tint, 0.65))
  halo.addColorStop(1, rgba(v.tint, 0))
  ctx.fillStyle = halo
  ctx.fillRect(mx - mr * 1.2, my - mr * 1.2, mr * 2.4, mr * 2.4)
  strokeRosette(ctx, mx, my, mr, ROSETTES.medallion, v.ink, Math.max(0.6, h * 0.0019))
  ctx.save()
  ctx.fillStyle = v.paper
  ctx.beginPath()
  ctx.arc(mx, my, mr * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = v.deep
  ctx.lineWidth = Math.max(1, h * 0.0045)
  ctx.stroke()
  ctx.lineWidth = Math.max(0.6, h * 0.0015)
  ctx.beginPath()
  ctx.arc(mx, my, mr * 0.34, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  hatchText(ctx, profile === 'cn' ? '¥' : '$', mx, my + h * 0.07, h * 0.19, v.deep, 'center', Math.max(2, h * 0.0085))
  // Numerals.
  hatchText(ctx, '100', w * 0.905, h * 0.76, h * 0.43, v.deep, 'right', Math.max(2.2, h * 0.0095))
  hatchText(ctx, '100', w * 0.16, h * 0.215, h * 0.1, v.ink, 'center', Math.max(1.5, h * 0.0055))
  hatchText(ctx, '100', w * 0.87, h * 0.215, h * 0.1, v.ink, 'center', Math.max(1.5, h * 0.0055))
  foil(ctx, w * 0.61, h * 0.3, h * 0.075)
  microtext(ctx, 'SHAPE OF THE WORLD · ONE LIFETIME · ', w * 0.52, h * 0.865, w * 0.36, Math.max(6, h * 0.022), rgba(v.deep, 0.75))
  microtext(ctx, '100 · ', w * 0.52, h * 0.15, w * 0.24, Math.max(5, h * 0.02), rgba(v.ink, 0.7))
  ctx.save()
  ctx.font = `600 ${Math.max(8, h * 0.048)}px ${MONO}`
  ctx.fillStyle = profile === 'cn' ? '#9a1a26' : '#1d3a2a'
  ctx.textBaseline = 'middle'
  ctx.fillText(profile === 'cn' ? 'FM 0284 2618' : 'FM 0253 1007', w * 0.12, h * 0.865)
  ctx.restore()
}

function back(ctx: CanvasRenderingContext2D, w: number, h: number, profile: ProfileId, v: Variant) {
  paper(ctx, w, h, v, profile === 'cn' ? 11 : 13)
  frame(ctx, w, h, v)
  ctx.save()
  ctx.globalAlpha = 0.95
  strokeRosette(ctx, w * 0.5, h * 0.5, h * 0.36, ROSETTES.watermark, v.ink, Math.max(0.6, h * 0.0018))
  ctx.restore()
  hatchText(ctx, '100', w * 0.18, h * 0.62, h * 0.24, v.deep, 'center', Math.max(2, h * 0.008))
  hatchText(ctx, '100', w * 0.82, h * 0.62, h * 0.24, v.deep, 'center', Math.max(2, h * 0.008))
}

/**
 * Note bitmap at the requested pixel width. `inkOverride` repaints the same
 * engraving in a destination ink for reassembled bands.
 */
export function noteBitmap(profile: ProfileId, face: NoteFace, pixelWidth: number, inkOverride?: string): HTMLCanvasElement {
  const width = Math.max(128, Math.min(1600, Math.round(pixelWidth / 64) * 64))
  const key = `${profile}|${face}|${width}|${inkOverride ?? ''}`
  const hit = cache.get(key)
  if (hit) return hit
  const height = Math.round(width / NOTE_ASPECT)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const v = variantFor(profile, inkOverride)
    if (face === 'front') front(ctx, width, height, profile, v)
    else back(ctx, width, height, profile, v)
  }
  if (cache.size > 48) cache.clear()
  cache.set(key, canvas)
  return canvas
}
