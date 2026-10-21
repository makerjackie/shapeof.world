// Frame scheduler: draws every shot active at time t, then the shared finish
// (camera push, impact flash and shake, grain, vignette, source line).
import { W, H, M, C, bt, bend, BAR, clamp, prog, easeInOut, rng, source, chapter, chapterOpen, life, clock, line, txt, rect, lineWidth, measure, quiet } from './lib.js'
import { DURATION, CUES } from './timeline.js'
import { SHOTS, setup, BILL } from './scenes/index.js'

const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
const params = new URLSearchParams(location.search)
if (params.has('render')) document.body.classList.add('render')

await Promise.all([
  '900 64px NotoSC', '700 64px NotoSC', '400 64px NotoSC', '400 64px Anton', '500 20px Mono', '700 20px Mono',
].map((f) => document.fonts.load(f, '房子万元钱0123456789ABCabc')))
await document.fonts.ready
await setup()

// Shot window: [start - pre, end + post). A shot spans bars from..to (in play
// order, holds included), or, when it lives inside held bars, [bar, beat]
// marks `start` and `end`.
const span = (s) => [s.start ? bt(...s.start) : bt(s.from), s.end ? bt(...s.end) : bend(s.to)]
const win = (s) => { const [a, b] = span(s); return [a - (s.pre || 0), b + (s.post || 0)] }

// Grain: a few tiles of seeded noise, picked by frame number.
const grain = [0, 1, 2, 3].map((k) => {
  const g = new OffscreenCanvas(256, 256), gc = g.getContext('2d'), r = rng(99 + k)
  const img = gc.createImageData(256, 256)
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255 }
  gc.putImageData(img, 0, 0)
  return g
})

const CUTS = [...new Set(SHOTS.flatMap(span))]
const HITS = CUES.filter((c) => c[2] === 'impact' || c[2] === 'boom').map(([b, beat, type]) => ({ t: bt(b, beat), big: type === 'boom' }))
const FLASHES = HITS.filter((h) => h.big) // only the big hits flash; small ones would read as flicker

function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  // Impact shake: a few pixels, decaying over 0.25 s.
  let sx = 0, sy = 0
  for (const h of HITS) {
    const d = (clock.frame ?? t) - h.t
    if (d < 0 || d > 0.25) continue
    const a = (h.big ? 8 : 3) * (1 - d / 0.25)
    sx += Math.sin(d * 95) * a; sy += Math.cos(d * 77) * a
  }

  const active = SHOTS.filter((s) => { const [a, b] = win(s); return t >= a && t < b })
  for (const s of active) {
    const [a, b] = win(s)
    // Slow camera push across the shot so the frame never stands still.
    const push = s.push === false || globalThis.__still ? 1 : 1 + 0.035 * easeInOut(prog(t, a, b))
    ctx.save()
    ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2)
    s.draw(ctx, t, s)
    ctx.restore()
  }

  // Furniture is not pushed, so it stays pinned to the frame.
  for (const s of active) {
    const [a, b] = win(s)
    const al = life(t, a, b, 0.15, 0.08)
    if (s.src) source(ctx, typeof s.src === 'function' ? s.src(t) : s.src, al, s.srcColor)
    if (s.chapter) {
      // The first shot of a chapter opens with the big title flying into the corner.
      const done = s.open ? chapterOpen(ctx, t, span(s)[0], s.chapter[0], s.chapter[1]) : true
      if (done) chapter(ctx, s.chapter[0], s.chapter[1], s.open ? 1 : al)
    }
  }

  // The running bill, top-right: everything this home costs you, counted up
  // as each new cost lands. It leaves when the bill takes the full frame.
  if (t >= BILL.from && t < BILL.to) {
    const a = clamp((t - BILL.from) / 0.3) * (1 - clamp((t - (BILL.to - 0.2)) / 0.2))
    const v = BILL.value(clock.frame ?? t)
    const label = '账单累计', num = `${v.toFixed(1)} 万`
    const nw = lineWidth(ctx, num, 40), lw = measure(ctx, label, 30, 700)
    const bump = BILL.bump(clock.frame ?? t)
    rect(ctx, W - M - nw - lw - 48, 46, nw + lw + 48, 66, C.bg, a * 0.88, 10)
    rect(ctx, W - M - nw - lw - 48, 46, nw + lw + 48, 66, C.hi, a * 0.25 * bump, 10)
    quiet(() => {
      line(ctx, num, W - M - 14, 96, { size: 40, color: C.hi, align: 'right', alpha: a })
      txt(ctx, label, W - M - 14 - nw - 14, 93, { size: 30, weight: 700, color: C.dim, align: 'right', alpha: a })
    })
  }

  // Flash on hits.
  for (const h of FLASHES) {
    const d = t - h.t
    if (d < 0 || d > 0.18) continue
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.06 * (1 - d / 0.18)
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
  }

  // Grain and vignette. tools/holds.mjs turns grain and push off (__still) to see real motion.
  const f = globalThis.__still ? 0 : Math.floor(t * 60)
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.07
  const tile = grain[((f % 4) + 4) % 4]
  const ox = (f * 37) % 256, oy = (f * 59) % 256
  for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(tile, x, y)
  ctx.restore()
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, H * 1.1)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

let now = Number(params.get('t') || 0)
window.DURATION = DURATION
window.seek = (t) => { now = t; draw(t) }
// Motion blur for the final render: average `n` subframes across a 180° shutter.
const acc = new OffscreenCanvas(W, H), ac = acc.getContext('2d')
window.seekBlur = (t, n = 3, fps = 60) => {
  now = t
  if (n <= 1) return draw(t)
  // A cut inside the shutter would blend two shots into one frame: skip blur there.
  const half = 0.25 / fps
  if (CUTS.some((c) => c > t - half && c <= t + half)) return draw(t)
  clock.frame = t
  const shutter = 0.5 / fps
  for (let i = 0; i < n; i++) {
    draw(Math.max(0, t - shutter / 2 + (shutter * i) / (n - 1)))
    ac.globalAlpha = 1 / (i + 1)
    ac.drawImage(canvas, 0, 0)
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(acc, 0, 0)
  clock.frame = null
}
window.ready = true
draw(now)

// Preview: play with the score, scrub, jump to a bar.
const audio = new Audio('../music/score.wav')
const scrub = document.getElementById('scrub'), time = document.getElementById('time')
let playing = false
document.getElementById('play').onclick = () => {
  playing = !playing
  if (playing) { audio.currentTime = now; audio.play() } else audio.pause()
}
scrub.oninput = () => { now = (scrub.value / 1000) * DURATION; audio.currentTime = now; draw(now) }
function loop() {
  if (playing) { now = audio.currentTime; draw(now) }
  scrub.value = (now / DURATION) * 1000
  time.textContent = `${now.toFixed(2)}s · 第 ${Math.floor(now / BAR) + 1} 小节`
  requestAnimationFrame(loop)
}
if (!params.has('render')) requestAnimationFrame(loop)
