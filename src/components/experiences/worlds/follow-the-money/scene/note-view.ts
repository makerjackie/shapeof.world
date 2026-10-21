import { DEST_INK, INK, rgba, type Dest } from '../art/palette'
import { rosetteBitmap, ROSETTES } from '../art/guilloche'
import { noteBitmap, NOTE_ASPECT, NUMERAL_FONT } from '../art/note-art'
import { formatPer100, type Flow, type Locale, type Profile } from '../money-model'
import { clamp01, easeIn, easeInOut, easeOut, hash01, lerp, smooth, window01 } from './anim'

export type Rect = { x: number; y: number; w: number; h: number }

export type NoteLabels = {
  dest: Record<Dest, string>
  hop: (index: number) => string
  firstHop: string
  everyCent: string
  tapToCut: string
  sans: string
  serif: string
  /** Text-free rendering for language-neutral preview posters. */
  quiet?: boolean
}

type Strip = {
  hop: number
  dest: number
  amount: number
  /** Texture range on the note, 0..1. */
  u0: number
  u1: number
  /** Screen x-range inside the piece at the moment of the cut, relative to piece centre in note units (0..100). */
  a0: number
  a1: number
  launch: number
  land: number
  seed: number
}

type Band = { dest: number; share: number; offset: number }

const SEPARATE = 0.22
const SLIDE = 0.45
/** The first cut is the lesson: slower, staggered flights that can be followed by eye. */
const flightFor = (hop: number) => (hop === 0 ? 1.55 : hop === 1 ? 1.1 : 0.9)
const staggerFor = (hop: number) => (hop === 0 ? 0.17 : 0.05)

const rosetteKey = (dest: Dest): keyof typeof ROSETTES => (dest === 'surplus' ? 'profit' : dest)

export class NoteView {
  profile: Profile
  flow: Flow | null = null
  startAt = 0
  entryFrom: Rect | null = null
  cuts: Array<number> = []
  tailAt: number | null = null
  assembleAt: number | null = null
  shown = 0
  strips: Array<Strip> = []
  /** Texture window [u0, u1] of the remaining piece after each cut. */
  windows: Array<readonly [number, number]> = [[0, 1]]
  tailAmounts: Array<number> = []
  bands: Array<Band> = []

  constructor(profile: Profile) {
    this.profile = profile
  }

  load(profile: Profile, flow: Flow, now: number, entryFrom: Rect | null = null) {
    this.profile = profile
    this.flow = flow
    this.startAt = now
    this.entryFrom = entryFrom
    this.cuts = []
    this.tailAt = null
    this.assembleAt = null
    this.strips = []
    this.windows = [[0, 1]]
    let shown = flow.hops.length
    for (let k = 0; k < flow.hops.length; k++) {
      if (flow.hops[k].pass < 2.2) {
        shown = k + 1
        break
      }
    }
    this.shown = Math.max(3, shown)
    const kept = profile.dests.map((_, i) => flow.hops.slice(0, this.shown).reduce((sum, h) => sum + h.keep[i], 0))
    this.tailAmounts = profile.dests.map((_, i) => flow.total[i] - kept[i])
    const positive = flow.total.map((v) => Math.max(0, v))
    const sum = positive.reduce((a, b) => a + b, 0)
    let offset = 0
    this.bands = positive.map((v, i) => {
      const band = { dest: i, share: v / sum, offset }
      offset += v / sum
      return band
    })
  }

  /** Amount still on the table after `count` cuts. */
  remainingAfter(count: number): number {
    if (!this.flow || count === 0) return 100
    return this.flow.hops[count - 1].pass
  }

  cutsDone(now: number): number {
    return this.cuts.filter((t) => t <= now).length
  }

  canCut(now: number): boolean {
    return Boolean(this.flow) && this.cuts.length < this.shown && now >= this.startAt + 0.8
  }

  /** Schedule cut `k` at time `at`; builds the strips it releases. */
  cut(at: number) {
    const flow = this.flow
    if (!flow || this.cuts.length >= this.shown) return
    const k = this.cuts.length
    const lastCut = this.cuts[k - 1]
    const earliest = Math.max(this.startAt + 0.8, lastCut === undefined ? 0 : lastCut + SEPARATE + 0.08)
    const time = Math.max(at, earliest)
    this.cuts.push(time)
    const hop = flow.hops[k]
    const arriving = this.remainingAfter(k)
    const positives = hop.keep.map((v) => Math.max(0, v))
    const geometryTotal = positives.reduce((a, b) => a + b, 0) + hop.pass
    const scale = arriving / geometryTotal
    const [u0, u1] = this.windows[k]
    let cursor = -arriving / 2
    let order = 0
    positives.forEach((amount, dest) => {
      if (amount <= 0) return
      const width = amount * scale
      const a0 = cursor
      const a1 = cursor + width
      const t0 = u0 + ((a0 + arriving / 2) / arriving) * (u1 - u0)
      const t1 = u0 + ((a1 + arriving / 2) / arriving) * (u1 - u0)
      const launch = time + SEPARATE + order * staggerFor(k)
      this.strips.push({ hop: k, dest, amount: hop.keep[dest], u0: t0, u1: t1, a0, a1, launch, land: launch + flightFor(k), seed: k * 7.31 + dest * 1.97 })
      cursor = a1
      order++
    })
    const passStart = u0 + ((cursor + arriving / 2) / arriving) * (u1 - u0)
    this.windows.push([passStart, u1])
  }

  /** Cut every remaining hop on a schedule that speeds up as the piece shrinks. */
  autoCut(start: number, first = 1.3, decay = 0.8, floor = 0.55) {
    let t = start
    let gap = first
    while (this.cuts.length < this.shown) {
      this.cut(t)
      t = this.cuts[this.cuts.length - 1] + gap
      gap = Math.max(floor, gap * decay)
    }
    this.tailAt = t + 0.1
  }

  finishTail(at: number) {
    if (this.cuts.length >= this.shown && this.tailAt === null) this.tailAt = at
  }

  assemble(at: number) {
    this.assembleAt = at
  }

  /** Jump to the final state immediately (reduced motion or chapter jumps). */
  complete(now: number, assembled: boolean) {
    if (!this.flow) return
    this.startAt = now - 10
    this.entryFrom = null
    while (this.cuts.length < this.shown) this.cut(now - 9)
    this.strips.forEach((s) => {
      s.launch = now - 8
      s.land = now - 7
    })
    this.tailAt = now - 6
    this.assembleAt = assembled ? now - 4 : null
  }

  get finishedAt(): number {
    if (this.tailAt === null) return Infinity
    return this.tailAt + 1.3
  }

  // -------------------------------------------------------------- layout
  layout(focus: Rect) {
    const n = this.profile.dests.length
    const rosetteBand = Math.min(190, Math.max(112, focus.h * 0.27))
    const spacing = Math.min(focus.w / n, 200)
    const rosetteR = Math.max(22, Math.min(spacing * 0.32, rosetteBand * 0.3, 60))
    const top = focus.y + 46
    const avail = focus.h - rosetteBand - 56
    const w = Math.max(160, Math.min(focus.w * 0.84, avail * NOTE_ASPECT * 0.95, 760))
    const h = w / NOTE_ASPECT
    const cx = focus.x + focus.w / 2
    const cy = top + Math.max(h / 2 + 10, avail * 0.52)
    const rosetteY = focus.y + focus.h - rosetteBand + rosetteR + 2
    const xs = Array.from({ length: n }, (_, i) => cx + (i - (n - 1) / 2) * spacing)
    const ui = Math.max(0.9, Math.min(1.3, focus.h / 640))
    return { cx, cy, w, h, unit: w / 100, rosetteR, rosetteY, xs, labelY: cy - h / 2 - 18, ui }
  }

  /** Where the note rests (for camera hand-offs). */
  restRect(focus: Rect): Rect {
    const l = this.layout(focus)
    return { x: l.cx - l.w / 2, y: l.cy - l.h / 2, w: l.w, h: l.h }
  }

  // -------------------------------------------------------------- amounts
  received(t: number): Array<number> {
    const out = this.profile.dests.map(() => 0)
    if (!this.flow) return out
    this.cuts.forEach((time, k) => {
      if (t < time + SEPARATE) return
      this.flow!.hops[k].keep.forEach((v, i) => {
        if (v >= 0) return
        out[i] += v * smooth((t - time - SEPARATE) / 0.5)
      })
    })
    for (const s of this.strips) out[s.dest] += s.amount * smooth((t - s.land + 0.15) / 0.3)
    if (this.tailAt !== null) {
      const p = smooth((t - this.tailAt - 0.25) / 0.9)
      this.tailAmounts.forEach((v, i) => (out[i] += v * p))
    }
    return out
  }

  // -------------------------------------------------------------- render
  render(ctx: CanvasRenderingContext2D, t: number, focus: Rect, labels: NoteLabels, locale: Locale, alpha: number, dpr: number) {
    const flow = this.flow
    if (!flow || alpha <= 0.01) return
    const L = this.layout(focus)
    const profile = this.profile
    ctx.save()
    ctx.globalAlpha = alpha
    const entry = easeInOut(window01(t, this.startAt, 0.9))
    const assembling = this.assembleAt !== null ? window01(t, this.assembleAt, 1.5) : 0
    const settled = this.assembleAt !== null && t >= this.assembleAt + 1.2

    // Warm light pooled behind the note.
    const pool = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, L.w * 0.95)
    pool.addColorStop(0, 'rgba(255, 214, 150, 0.13)')
    pool.addColorStop(0.5, 'rgba(255, 214, 150, 0.05)')
    pool.addColorStop(1, 'rgba(255, 214, 150, 0)')
    ctx.fillStyle = pool
    ctx.fillRect(L.cx - L.w, L.cy - L.w, L.w * 2, L.w * 2)
    this.drawRosettes(ctx, t, L, labels, dpr)

    // Remaining piece.
    const done = this.cutsDone(t)
    const lastCut = this.cuts[done - 1]
    const pieceAmount = done === 0 ? 100 : this.remainingAfter(done)
    const window = this.windows[done]
    let pieceCenter = 0
    if (done > 0 && lastCut !== undefined) {
      const hop = flow.hops[done - 1]
      const arriving = this.remainingAfter(done - 1)
      const positives = hop.keep.reduce((sum, v) => sum + Math.max(0, v), 0)
      const scale = arriving / (positives + hop.pass)
      const startCenter = -arriving / 2 + positives * scale + (hop.pass * scale) / 2
      pieceCenter = lerp(startCenter, 0, easeInOut(window01(t, lastCut + SEPARATE + 0.05, SLIDE)))
    }
    const tailP = this.tailAt !== null ? window01(t, this.tailAt, 0.5) : 0
    const breathe = Math.sin(t * 1.1) * 2
    const tilt = Math.sin(t * 0.7) * 0.01

    if (this.assembleAt === null || assembling < 0.05) {
      if (tailP < 1) {
        const from = this.entryFrom
        let cx = L.cx + pieceCenter * L.unit
        let cy = L.cy + breathe
        let w = pieceAmount * L.unit * (1 - tailP * 0.2)
        let h = L.h
        let rot = tilt
        let flip = 1
        if (entry < 1) {
          if (from) {
            cx = lerp(from.x + from.w / 2, cx, entry)
            cy = lerp(from.y + from.h / 2, cy, entry)
            w = lerp(from.w, w, entry)
            h = lerp(from.h, h, entry)
            flip = Math.cos((1 - entry) * Math.PI)
            rot = lerp(-0.05, tilt, entry)
          } else {
            cy += (1 - entry) * 40
            ctx.globalAlpha = alpha * entry
          }
        }
        this.drawShadow(ctx, cx, L.cy + L.h * 0.62, w, alpha * (1 - tailP))
        ctx.globalAlpha = alpha * (1 - tailP) * (entry < 1 && !from ? entry : 1)
        this.drawPiece(ctx, cx, cy, w, h, window, rot, flip, dpr)
        ctx.globalAlpha = alpha
        // Cut flashes.
        this.cuts.forEach((time, k) => {
          const p = window01(t, time - 0.08, 0.32)
          if (p <= 0 || p >= 1) return
          const arriving = this.remainingAfter(k)
          const hop = flow.hops[k]
          const positives = hop.keep.map((v) => Math.max(0, v))
          const scale = arriving / (positives.reduce((a, b) => a + b, 0) + hop.pass)
          let cursor = -arriving / 2
          ctx.save()
          ctx.strokeStyle = rgba('#fff6dc', (1 - p) * 0.95)
          ctx.shadowColor = INK.gold
          ctx.shadowBlur = 14
          ctx.lineWidth = 1.6
          for (const v of positives) {
            if (v <= 0) continue
            cursor += v * scale
            const x = L.cx + cursor * L.unit
            const reach = easeOut(p * 1.6)
            ctx.beginPath()
            ctx.moveTo(x, L.cy - L.h / 2 - 8)
            ctx.lineTo(x, L.cy - L.h / 2 - 8 + (L.h + 16) * reach)
            ctx.stroke()
          }
          ctx.restore()
        })
      }
      if (this.tailAt !== null) this.drawDust(ctx, t, L)
    }

    // Flying strips.
    for (const s of this.strips) this.drawStrip(ctx, s, t, L, dpr, labels)

    // Hop caption above the note.
    if (this.assembleAt === null) this.drawHopCaption(ctx, t, L, labels, locale)

    if (this.assembleAt !== null) this.drawAssembly(ctx, t, L, labels, dpr, settled)
    ctx.restore()
  }

  private drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, alpha: number) {
    if (w < 2) return
    ctx.save()
    ctx.globalAlpha = alpha * 0.55
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.6)
    g.addColorStop(0, 'rgba(0, 0, 0, 0.7)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.scale(1, 0.18)
    ctx.beginPath()
    ctx.arc(cx, cy / 0.18, w * 0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawPiece(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    window: readonly [number, number],
    rot: number,
    flip: number,
    dpr: number,
  ) {
    if (w < 0.6) return
    const fullW = (w / Math.max(1e-6, window[1] - window[0]))
    const face = flip >= 0 ? 'front' : 'back'
    const bmp = noteBitmap(this.profile.id, face, Math.min(1600, fullW * dpr * 1.1))
    const sx = window[0] * bmp.width
    const sw = Math.max(1, (window[1] - window[0]) * bmp.width)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.scale(Math.max(0.02, Math.abs(flip)), 1)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 8
    ctx.drawImage(bmp, sx, 0, sw, bmp.height, -w / 2, -h / 2, w, h)
    ctx.shadowColor = 'transparent'
    // Paper light: a soft sheen that drifts with the tilt.
    const sheen = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2)
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0)')
    sheen.addColorStop(clamp01(0.5 + rot * 20), 'rgba(255, 255, 255, 0.13)')
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = sheen
    ctx.fillRect(-w / 2, -h / 2, w, h)
    if (Math.abs(flip) < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(1 - Math.abs(flip)) * 0.45})`
      ctx.fillRect(-w / 2, -h / 2, w, h)
    }
    ctx.restore()
  }

  private stripPose(s: Strip, t: number, L: ReturnType<NoteView['layout']>) {
    const startX = L.cx + ((s.a0 + s.a1) / 2) * L.unit
    const startY = L.cy + 10
    const endX = L.xs[s.dest]
    const endY = L.rosetteY
    const p = window01(t, s.launch, s.land - s.launch)
    const e = easeInOut(p)
    const inv = 1 - e
    const y1 = startY + (endY - startY) * 0.55
    const y2 = endY - (endY - startY) * 0.3
    const x = inv * inv * inv * startX + 3 * inv * inv * e * startX + 3 * inv * e * e * endX + e * e * e * endX
    const y = inv * inv * inv * startY + 3 * inv * inv * e * y1 + 3 * inv * e * e * y2 + e * e * e * endY
    return { x, y, p }
  }

  private drawStrip(ctx: CanvasRenderingContext2D, s: Strip, t: number, L: ReturnType<NoteView['layout']>, dpr: number, labels?: NoteLabels) {
    if (t < s.launch - SEPARATE || t > s.land + 0.05) return
    const width = (s.a1 - s.a0) * L.unit
    if (width < 0.25) return
    const ink = DEST_INK[this.profile.dests[s.dest]]
    let x: number
    let y: number
    let p = 0
    if (t < s.launch) {
      const sep = easeOut(window01(t, s.launch - SEPARATE, SEPARATE))
      x = L.cx + ((s.a0 + s.a1) / 2) * L.unit
      y = L.cy + sep * 10
    } else {
      const pose = this.stripPose(s, t, L)
      x = pose.x
      y = pose.y
      p = pose.p
    }
    const r = hash01(s.seed)
    const flip = Math.cos(p * Math.PI * (1 + Math.round(r * 3)))
    const rot = (r - 0.5) * 1.4 * Math.sin(p * Math.PI) + Math.sin(p * 9 + r * 6) * 0.12 * p
    const scale = lerp(1, 0.22, easeIn(p))
    const bmp = noteBitmap(this.profile.id, flip >= 0 ? 'front' : 'back', Math.min(1600, L.w * dpr * 1.1))
    const u0 = flip >= 0 ? s.u0 : 1 - s.u1
    const sw = Math.max(1, (s.u1 - s.u0) * bmp.width)
    ctx.save()
    ctx.globalAlpha *= 1 - smooth((p - 0.86) / 0.14)
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(scale * Math.max(0.08, Math.abs(flip)), scale)
    ctx.drawImage(bmp, u0 * bmp.width, 0, sw, bmp.height, -width / 2, -L.h / 2, width, L.h)
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = rgba(ink, 0.15 + 0.6 * smooth(p * 1.4))
    ctx.fillRect(-width / 2, -L.h / 2, width, L.h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = rgba(ink, 0.5 + 0.5 * p)
    ctx.lineWidth = 1 / Math.max(0.2, scale)
    ctx.strokeRect(-width / 2, -L.h / 2, width, L.h)
    ctx.restore()
    // Name the pieces of the first cut while they fly.
    if (s.hop === 0 && s.amount >= 1 && labels) {
      const tag = smooth(window01(t, s.launch - 0.1, 0.3)) * (1 - smooth(window01(t, s.land - 0.45, 0.35)))
      if (tag > 0.02) {
        ctx.save()
        ctx.globalAlpha *= tag
        ctx.fillStyle = ink
        ctx.font = `600 ${Math.round(13 * L.ui)}px ${labels.sans}`
        const tagText = `${labels.dest[this.profile.dests[s.dest]]} ${formatPer100(s.amount, this.profile)}`
        const offset = Math.max(12, width * scale * 0.5 + 8)
        const fitsRight = x + offset + ctx.measureText(tagText).width < ctx.canvas.width / Math.max(1, dpr) - 8
        ctx.textAlign = fitsRight ? 'left' : 'right'
        ctx.fillText(tagText, fitsRight ? x + offset : x - offset, y + 4)
        ctx.restore()
      }
    }
  }

  private drawDust(ctx: CanvasRenderingContext2D, t: number, L: ReturnType<NoteView['layout']>) {
    const start = this.tailAt!
    const p = window01(t, start, 1.2)
    if (p <= 0 || p >= 1) return
    const total = this.tailAmounts.reduce((a, b) => a + Math.max(0, b), 0)
    if (total <= 0) return
    const count = 46
    const piece = this.remainingAfter(this.cuts.length) * L.unit
    ctx.save()
    for (let i = 0; i < count; i++) {
      const r = hash01(i * 3.17 + 0.5)
      let acc = 0
      let dest = 0
      for (let d = 0; d < this.tailAmounts.length; d++) {
        acc += Math.max(0, this.tailAmounts[d]) / total
        if (r <= acc) {
          dest = d
          break
        }
      }
      const delay = hash01(i * 1.7) * 0.3
      const q = easeInOut(clamp01((p * 1.2 - delay) / 0.9))
      const sx = L.cx + (hash01(i * 5.1) - 0.5) * piece
      const sy = L.cy + (hash01(i * 2.3) - 0.5) * L.h
      const ex = L.xs[dest]
      const ey = L.rosetteY
      const x = lerp(sx, ex, q) + Math.sin(q * Math.PI) * (hash01(i) - 0.5) * 60
      const y = lerp(sy, ey, q) - Math.sin(q * Math.PI) * 30
      ctx.fillStyle = rgba(DEST_INK[this.profile.dests[dest]], 1 - q * 0.6)
      ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4)
    }
    ctx.restore()
  }

  private drawRosettes(ctx: CanvasRenderingContext2D, t: number, L: ReturnType<NoteView['layout']>, labels: NoteLabels, dpr: number) {
    const amounts = this.received(t)
    const entry = smooth(window01(t, this.startAt + 0.3, 0.8))
    this.profile.dests.forEach((dest, i) => {
      const x = L.xs[i]
      const y = L.rosetteY
      const amount = amounts[i]
      let pulse = 0
      for (const s of this.strips) if (s.dest === i && t >= s.land - 0.1) pulse += Math.exp(-(t - s.land + 0.1) / 0.28) * Math.min(1, s.amount / 6 + 0.25)
      if (this.tailAt !== null && t > this.tailAt) pulse += Math.exp(-(t - this.tailAt - 1.1) * (t - this.tailAt - 1.1) * 6) * 0.5
      const grow = 0.62 + 0.38 * Math.min(1, Math.sqrt(Math.max(0, amount) / 45))
      const r = L.rosetteR * grow * (1 + Math.min(0.2, pulse * 0.12)) * (0.6 + 0.4 * entry)
      const ink = DEST_INK[dest]
      const bmp = rosetteBitmap(rosetteKey(dest), ink, Math.min(260, L.rosetteR * 2.2 * dpr), Math.max(0.8, dpr * 0.7))
      ctx.save()
      ctx.globalAlpha *= entry
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8)
      glow.addColorStop(0, rgba(ink, 0.2 + Math.min(0.12, Math.max(0, amount) / 300) + Math.min(0.4, pulse * 0.3)))
      glow.addColorStop(1, rgba(ink, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.translate(x, y)
      ctx.rotate(t * 0.06 * (i % 2 ? -1 : 1) + i)
      ctx.globalAlpha *= 0.72 + 0.28 * Math.min(1, Math.max(0, amount) / 25)
      ctx.drawImage(bmp, -r, -r, r * 2, r * 2)
      ctx.restore()
      ctx.save()
      ctx.globalAlpha *= entry
      ctx.textAlign = 'center'
      ctx.fillStyle = rgba(ink, 0.95)
      ctx.font = `600 ${Math.round(12 * L.ui)}px ${labels.sans}`
      ctx.fillText(labels.dest[dest], x, y + L.rosetteR + 18 * L.ui)
      ctx.fillStyle = INK.cream
      ctx.font = `500 ${Math.round(Math.max(18, Math.min(28, L.rosetteR * 0.5)))}px ${NUMERAL_FONT}`
      const shown = Math.abs(amount) < 0.05 ? 0 : amount
      ctx.fillText(formatPer100(shown, this.profile), x, y + L.rosetteR + 44 * L.ui)
      ctx.restore()
    })
  }

  private drawHopCaption(ctx: CanvasRenderingContext2D, t: number, L: ReturnType<NoteView['layout']>, labels: NoteLabels, locale: Locale) {
    const flow = this.flow!
    const done = this.cutsDone(t)
    const k = Math.min(done, this.shown - 1)
    const lastCut = this.cuts[done - 1] ?? this.startAt
    const appear = done === 0 ? smooth(window01(t, this.startAt + 0.5, 0.5)) : smooth(window01(t, lastCut + SEPARATE + SLIDE * 0.6, 0.35))
    const fadeOut = this.tailAt !== null ? 1 - smooth(window01(t, this.tailAt, 0.4)) : 1
    const nextCut = this.cuts[done]
    const leaving = nextCut !== undefined ? 1 - smooth(window01(t, nextCut + 0.05, 0.25)) : 1
    const alpha = appear * fadeOut * Math.max(leaving, done === 0 ? 1 : 0)
    if (alpha <= 0.01 || done >= this.shown) return
    const hop = flow.hops[k]
    const who = hop.who.slice(0, 3).map(([code, value]) => {
      const name = this.profile.sectors[code]?.[locale] ?? code
      return `${name} ${formatPer100(value, this.profile)}`
    })
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.textAlign = 'center'
    ctx.font = `500 ${Math.round(15 * L.ui)}px ${labels.sans}`
    // Narrow screens keep the largest receivers that fit on one line.
    const maxWidth = Math.min(L.w * 1.15, L.cx * 2 - 24)
    while (who.length > 1 && ctx.measureText(who.join('  ·  ')).width > maxWidth) who.pop()
    ctx.fillStyle = rgba(INK.gold, 0.9)
    ctx.font = `600 ${Math.round(11 * L.ui)}px ${labels.sans}`
    const kicker = k === 0 ? labels.firstHop : labels.hop(k + 1)
    ctx.fillText(kicker.toUpperCase(), L.cx, L.labelY - 24 * L.ui)
    ctx.fillStyle = INK.cream
    ctx.font = `500 ${Math.round(15 * L.ui)}px ${labels.sans}`
    ctx.fillText(who.join('  ·  '), L.cx, L.labelY)
    ctx.restore()
  }

  private drawAssembly(
    ctx: CanvasRenderingContext2D,
    t: number,
    L: ReturnType<NoteView['layout']>,
    labels: NoteLabels,
    dpr: number,
    settled: boolean,
  ) {
    const start = this.assembleAt!
    const flow = this.flow!
    const left = L.cx - L.w / 2
    ctx.save()
    // Ghost outline of where the note was.
    ctx.strokeStyle = rgba(INK.cream, 0.18 * (1 - smooth(window01(t, start + 1.0, 0.4))))
    ctx.setLineDash([4, 5])
    ctx.strokeRect(left, L.cy - L.h / 2, L.w, L.h)
    ctx.setLineDash([])
    ctx.restore()
    this.bands.forEach((band, order) => {
      if (band.share <= 0) return
      const dest = this.profile.dests[band.dest]
      const ink = DEST_INK[dest]
      const p = easeInOut(window01(t, start + order * 0.1, 0.9))
      const q = clamp01(p)
      const targetX = left + band.offset * L.w
      const width = band.share * L.w
      const fromX = L.xs[band.dest] - width * 0.1
      const fromY = L.rosetteY - L.h * 0.1
      const x = lerp(fromX, targetX, p)
      const y = lerp(fromY, L.cy - L.h / 2, p)
      const s = lerp(0.2, 1, q)
      const bmp = noteBitmap(this.profile.id, 'front', Math.min(1600, L.w * dpr * 1.1), ink)
      ctx.save()
      ctx.globalAlpha *= smooth(q * 3)
      ctx.translate(x + (width * s) / 2, y + (L.h * s) / 2)
      ctx.scale(s, s)
      ctx.drawImage(bmp, band.offset * bmp.width, 0, Math.max(1, band.share * bmp.width), bmp.height, -width / 2, -L.h / 2, width, L.h)
      ctx.strokeStyle = rgba(ink, 0.9)
      ctx.lineWidth = 1
      ctx.strokeRect(-width / 2, -L.h / 2, width, L.h)
      ctx.restore()
    })
    // Labels after landing.
    const lp = labels.quiet ? 0 : smooth(window01(t, start + 1.15, 0.5))
    if (lp > 0) {
      ctx.save()
      ctx.globalAlpha *= lp
      ctx.textAlign = 'center'
      let lastRight = -Infinity
      let row = 0
      this.bands.forEach((band) => {
        if (band.share <= 0.004) return
        const dest = this.profile.dests[band.dest]
        const centre = left + (band.offset + band.share / 2) * L.w
        const text = `${labels.dest[dest]} ${formatPer100(flow.total[band.dest], this.profile)}`
        ctx.font = `600 ${Math.round(13 * L.ui)}px ${labels.sans}`
        const tw = ctx.measureText(text).width
        row = centre - tw / 2 < lastRight + 6 ? row + 1 : 0
        lastRight = centre + tw / 2
        const y = L.cy + L.h / 2 + 22 * L.ui + row * 18 * L.ui
        ctx.strokeStyle = rgba(DEST_INK[dest], 0.6)
        ctx.beginPath()
        ctx.moveTo(centre, L.cy + L.h / 2 + 3)
        ctx.lineTo(centre, y - 12)
        ctx.stroke()
        ctx.fillStyle = DEST_INK[dest]
        ctx.fillText(text, centre, y)
      })
      if (settled) {
        ctx.fillStyle = INK.cream
        ctx.font = `600 ${Math.round(12 * L.ui)}px ${labels.sans}`
        ctx.fillText(labels.everyCent.toUpperCase(), L.cx, L.cy - L.h / 2 - 16)
      }
      ctx.restore()
    }
  }
}
