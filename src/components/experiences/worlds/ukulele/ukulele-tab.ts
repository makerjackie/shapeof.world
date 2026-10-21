// 2D canvases: the scrolling tablature at the bottom of the stage and the chord box at the top.
// Both are drawn from the same note events the scene and the audio use. Nothing here contains words:
// only chord names, string letters and fret numbers.
import type { Arrangement } from './ukulele-arranger'
import { CHORDS } from './ukulele-arranger'
import { hexRgb, type Theme } from './ukulele-theme'

const ROW_STRING = [3, 2, 1, 0] // top row = A string ... bottom row = G string
const LETTERS = ['A', 'E', 'C', 'G']

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/** Size the backing store to the element's CSS size and device pixel ratio. Returns CSS pixels. */
function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  return { w, h, dpr }
}

/** The tab panel is designed at 668 px wide; everything scales from that. */
export const TAB_DESIGN_WIDTH = 668
export const TAB_PROGRESS_INSET = 14
export const TAB_PROGRESS_BAND = 22

export function drawTab(canvas: HTMLCanvasElement, arr: Arrangement | null, time: number, theme: Theme) {
  const { w: W, h: H, dpr } = fit(canvas)
  if (!W || !H) return
  const g = canvas.getContext('2d')!
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, W, H)
  if (!arr) return

  const P = theme.hud
  const AMBER = P.accent
  const sc = theme.strings.map(hexRgb) // per-string colour (G C E A)
  const colOf = (i: number) => (P.perString ? sc[i] : AMBER)

  const k = W / TAB_DESIGN_WIDTH
  const padL = 30 * k
  const playX = 0.27 * W
  const pxPerSec = 112 * k
  const top = 44 * k
  const bottom = H - 34 * k
  const gap = (bottom - top) / 3
  const rowY = (r: number) => top + r * gap
  const xOf = (t: number) => playX + (t - time) * pxPerSec
  const tMin = time - (playX - padL) / pxPerSec - 0.3
  const tMax = time + (W - playX) / pxPerSec + 0.3
  const spb = arr.spb
  const bpb = arr.song.beatsPerBar

  g.save()
  g.beginPath()
  g.rect(padL - 6 * k, 0, W - padL + 6 * k, H)
  g.clip()

  // bar lines
  const b0 = Math.floor(tMin / (spb * bpb))
  const b1 = Math.ceil(tMax / (spb * bpb))
  g.strokeStyle = `rgba(${P.ink},0.10)`
  g.lineWidth = 1
  for (let b = b0; b <= b1; b++) {
    const x = xOf(b * spb * bpb)
    g.beginPath()
    g.moveTo(x, top - 10 * k)
    g.lineTo(x, bottom + 10 * k)
    g.stroke()
  }

  // chord names at their change points
  g.font = P.chordFont.replace('{s}', String(Math.round((P.perString ? 15 : 22) * k)))
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  arr.chordList.forEach(([beat, name], i) => {
    const t = beat * spb
    const x = xOf(t)
    if (t < tMin || t > tMax) return
    if (i > 0 && arr.chordList[i - 1][1] === name && arr.chordList[i - 1][0] > beat - 0.01) return
    const past = t < time - 0.05
    g.fillStyle = past ? `rgba(${P.ink},0.35)` : `rgba(${P.ink},0.95)`
    g.fillText(name, x + 4 * k, 20 * k)
  })

  // string lines
  for (let r = 0; r < 4; r++) {
    g.strokeStyle = P.perString ? `rgba(${sc[ROW_STRING[r]]},0.28)` : `rgba(${P.ink},0.22)`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(padL - 6 * k, rowY(r))
    g.lineTo(W, rowY(r))
    g.stroke()
  }

  // notes
  const size = Math.min(22 * k, gap * 0.84)
  g.font = `600 ${Math.round(12.5 * k)}px Manrope, system-ui, sans-serif`
  g.textAlign = 'center'
  for (let i = 0; i < 4; i++) {
    const list = arr.perString[i]
    const r = ROW_STRING.indexOf(i)
    // the notes are sorted by time: start at the first one that can be on screen
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (list[mid].t < tMin) lo = mid + 1
      else hi = mid
    }
    for (let j = lo; j < list.length; j++) {
      const e = list[j]
      if (e.t > tMax) break
      const x = xOf(e.t)
      const y = rowY(r)
      const age = time - e.t
      const alpha = age > 0 ? Math.max(0.18, 1 - age * 0.55) : 1
      const hot = age >= -0.02 && age < 0.35 ? 1 - age / 0.35 : 0
      const isComp = e.kind !== 'melody'
      const C = colOf(i)
      g.globalAlpha = alpha * (isComp ? 0.72 : 1)
      roundRect(g, x - size / 2, y - size / 2, size, size, (P.perString ? 4 : 6) * k)
      if (P.perString && hot > 0) {
        g.shadowColor = `rgba(${C},${hot})`
        g.shadowBlur = 16 * k * hot
      }
      g.fillStyle = hot > 0 ? `rgba(${C},${0.35 + 0.65 * hot})` : `rgba(${P.note},0.92)`
      g.fill()
      g.shadowBlur = 0
      g.lineWidth = P.perString ? 1.4 : 1
      g.strokeStyle = hot > 0 ? `rgba(${P.perString ? C : '255,214,160'},${0.5 + hot * 0.5})` : P.perString ? `rgba(${C},0.55)` : `rgba(${P.ink},0.22)`
      g.stroke()
      g.fillStyle = hot > 0.4 ? P.hotInk : P.noteInk
      g.fillText(String(e.f), x, y + 0.5 * k)
      g.globalAlpha = 1
    }
  }

  // playhead
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, `rgba(${AMBER},0)`)
  grad.addColorStop(0.2, `rgba(${AMBER},0.95)`)
  grad.addColorStop(1, `rgba(${AMBER},0.55)`)
  g.fillStyle = `rgba(${AMBER},0.12)`
  g.fillRect(playX - 7 * k, 0, 14 * k, H)
  g.fillStyle = grad
  g.fillRect(playX - 1 * k, 0, 2 * k, H)
  g.restore()

  // string letters
  g.font = `600 ${Math.round(12 * k)}px Manrope, system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (let r = 0; r < 4; r++) {
    g.fillStyle = P.perString ? `rgba(${sc[ROW_STRING[r]]},0.9)` : `rgba(${P.ink},0.7)`
    g.fillText(LETTERS[r], 14 * k, rowY(r))
  }

  // progress
  const px0 = TAB_PROGRESS_INSET * k
  const px1 = W - TAB_PROGRESS_INSET * k
  const py = H - 10 * k
  const frac = Math.max(0, Math.min(1, time / arr.duration))
  g.strokeStyle = 'rgba(255,255,255,0.1)'
  g.lineWidth = 2 * k
  g.beginPath()
  g.moveTo(px0, py)
  g.lineTo(px1, py)
  g.stroke()
  g.strokeStyle = `rgba(${AMBER},0.95)`
  g.beginPath()
  g.moveTo(px0, py)
  g.lineTo(px0 + (px1 - px0) * frac, py)
  g.stroke()
  g.fillStyle = `rgba(${AMBER},1)`
  g.beginPath()
  g.arc(px0 + (px1 - px0) * frac, py, 3 * k, 0, 6.2832)
  g.fill()
}

/** Chord box, strings G C E A from left to right. */
export function drawChordBox(canvas: HTMLCanvasElement, name: string, theme: Theme) {
  const shape = CHORDS[name]
  const W = canvas.width
  const H = canvas.height
  const g = canvas.getContext('2d')!
  g.clearRect(0, 0, W, H)
  if (!shape) return
  const P = theme.hud
  const ink = (a: number) => `rgba(${P.ink},${a})`
  const strCol = theme.strings
  const x0 = 34
  const x1 = W - 22
  const y0 = 48
  const rows = 5
  const rh = (H - y0 - 14) / rows
  const sx = (x1 - x0) / 3
  const frets = shape.frets
  const pressed = frets.filter((f) => f > 0)
  const base = pressed.length && Math.max(...pressed) > 5 ? Math.min(...pressed) : 1
  g.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = P.perString ? `${strCol[i]}aa` : ink(0.55)
    g.beginPath()
    g.moveTo(x0 + i * sx, y0)
    g.lineTo(x0 + i * sx, y0 + rows * rh)
    g.stroke()
  }
  g.strokeStyle = ink(0.55)
  for (let r = 0; r <= rows; r++) {
    g.lineWidth = r === 0 && base === 1 ? 6 : 1.5
    g.beginPath()
    g.moveTo(x0, y0 + r * rh)
    g.lineTo(x1, y0 + r * rh)
    g.stroke()
  }
  if (base > 1) {
    g.fillStyle = ink(0.8)
    g.font = '600 20px Manrope, system-ui, sans-serif'
    g.textAlign = 'right'
    g.fillText(String(base), x0 - 8, y0 + rh * 0.65)
  }
  frets.forEach((f, i) => {
    const x = x0 + i * sx
    if (f === 0) {
      g.strokeStyle = P.perString ? strCol[i] : ink(0.85)
      g.lineWidth = 2.5
      g.beginPath()
      g.arc(x, y0 - 16, 7, 0, 7)
      g.stroke()
      return
    }
    const y = y0 + (f - base + 0.5) * rh
    const gr = g.createRadialGradient(x, y, 1, x, y, 14)
    gr.addColorStop(0, P.perString ? '#ffffff' : '#fff0d4')
    gr.addColorStop(1, P.perString ? strCol[i] : '#f0a050')
    if (P.perString) {
      g.shadowColor = strCol[i]
      g.shadowBlur = 14
    }
    g.fillStyle = gr
    g.beginPath()
    g.arc(x, y, 12, 0, 7)
    g.fill()
    g.shadowBlur = 0
  })
  g.fillStyle = ink(0.55)
  g.font = '600 17px Manrope, system-ui, sans-serif'
  g.textAlign = 'center'
  ;['G', 'C', 'E', 'A'].forEach((n, i) => g.fillText(n, x0 + i * sx, H - 1))
}
