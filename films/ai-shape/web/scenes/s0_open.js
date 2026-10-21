// Bars 1, 2 and 5 (bars 3–4 and 6 were cut in v4.1): two numbers collide,
// the film starts counting, then the title.
import { W, H, M, C, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, lerp, measure, NUM, clock } from '../lib.js'
import { F } from '../facts.js'

const S16 = BEAT / 4

// Bar 2: the tokens Google has handled since you pressed play, at its average 2026 rate. The same count runs in the corner later and
// is totted up on the end card.
function live(ctx, t) {
  rect(ctx, 0, 0, W, H, C.bg)
  // The full number, every frame: the low digits spin like a meter.
  const n = Math.floor(F.googlePerSec.value * Math.max(0, clock.frame ?? t))
  const settle = 1.06 - 0.06 * spring(t, bt(2), 2.4, 0.6)
  txt(ctx, '你点开这条视频后，Google 已经处理了', W / 2, 330, { size: 64, align: 'center' })
  scaled(ctx, settle, W / 2, 600, () => txt(ctx, n.toLocaleString('en-US'), W / 2, 660, { size: 260, color: C.hi, align: 'center', family: NUM, weight: 400 }))
  txt(ctx, '个 token', W / 2, 790, { size: 72, align: 'center' })
  const g = clamp(spring(t, bt(2, 2), 3.4, 0.6) * 1.5)
  txt(ctx, 'token：AI 读写文字的基本单位', W / 2, 900, { size: 44, color: C.dim, align: 'center', alpha: g })
}

// Bar 1 (+1), from the first frame: the whole question in one image. Left
// falls, right climbs, the question lands on beat 3, and the frame holds for a
// second bar so it can be read; the arrows keep drifting.
function clash(ctx, t) {
  const t0 = bt(1)
  const split = W / 2 + 40 * Math.sin((t - t0) * 2)
  const drift = 14 * Math.sin((t - t0) * 2.6)
  rect(ctx, 0, 0, split, H, C.bg)
  rect(ctx, split, 0, W - split, H, C.hi)
  // Already in place on the first frame; only the last of the settle shows.
  const l = spring(t, t0 - 0.28, 3, 0.55), r = spring(t, t0 - 0.22, 3, 0.55)
  txt(ctx, '同样聪明的 AI，每年', W / 4, 220, { size: 56, color: C.dim, align: 'center' })
  txt(ctx, '↓', W / 4, 360 + (1 - l) * -60 + drift, { size: 130, color: C.cyan, align: 'center', family: NUM, weight: 400 })
  hero(ctx, '13', '倍', W / 4, 600 + (1 - l) * -60, { size: 230, color: C.cyan, align: 'center' })
  txt(ctx, '更便宜', W / 4, 700, { size: 64, color: C.ink, align: 'center' })
  txt(ctx, '四家巨头今年还要砸', W * 3 / 4, 220, { size: 56, color: C.bg, align: 'center' })
  txt(ctx, '↑', W * 3 / 4, 360 + (1 - r) * 60 - drift, { size: 130, color: C.bg, align: 'center', family: NUM, weight: 400 })
  hero(ctx, '7325', '亿美元', W * 3 / 4, 600 + (1 - r) * 60, { size: 230, color: C.bg, align: 'center', unitScale: 0.3 })
  txt(ctx, '更烧钱', W * 3 / 4, 700, { size: 64, color: C.bg, align: 'center' })
  const q = spring(t, bt(1, 3), 3.2, 0.55)
  if (q > 0) {
    rect(ctx, 0, 770, W, 200, C.ink, clamp(q * 2) * 0.96)
    scaled(ctx, 1.12 - 0.12 * q, W / 2, 900, () => {
      txt(ctx, '越便宜，越烧钱？', W / 2, 912, { size: 120, color: C.bg, align: 'center', alpha: clamp(q * 2) })
    })
  }
}

// Bar 5: title and promise together, then straight into chapter 1.
function title(ctx, t) {
  const t0 = bt(5)
  rect(ctx, 0, 0, W, H, C.bg)
  const cols = 20, size = 46, gap = 12
  const gw = cols * (size + gap) - gap, x0 = (W - gw) / 2, y0 = 112
  for (let i = 0; i < 100; i++) {
    const ti = t0 + BEAT * 0.25 + i * (BAR * 0.7 / 100)
    const a = clamp((t - ti) / 0.12)
    const x = x0 + (i % cols) * (size + gap), y = y0 + Math.floor(i / cols) * (size + gap)
    rect(ctx, x, y, size, size, C.faint, 0.9)
    if (a > 0) rect(ctx, x, y, size, size, C.hi, a * 0.22)
  }
  const s = 1.22 - 0.22 * spring(t, t0, 2.4, 0.55)
  scaled(ctx, s, W / 2, 560, () => txt(ctx, 'AI 的形状', W / 2, 640, { size: 230, align: 'center' }))
  const u = easeOut(prog(t, bt(5, 1.5), bt(5, 1.5) + 0.35))
  rect(ctx, W / 2 - 340 * u, 686, 680 * u, 10, C.hi)
  const a = clamp(spring(t, bt(5, 1.5), 3.4, 0.6) * 1.5)
  txt(ctx, '上百个数字，看懂 2026 年的 AI 世界', W / 2, 800, { size: 64, align: 'center', alpha: a })
  txt(ctx, '数据截至 2026 年 10 月 19 日', W / 2, 875, { size: 38, color: C.dim, align: 'center', alpha: a })
  // Leave on the last half-beat: everything drops away for chapter 1.
  const out = easeIn(prog(t, bt(5, 4.4), bt(7)))
  if (out > 0) rect(ctx, 0, 0, W, H, C.bg, out)
}

export const SHOTS = [
  { from: 1, to: 1, src: 'Epoch AI 2026-09-22（同等能力的成本）· 四家公司 2026 年 7 月财报会', draw: clash },
  { from: 2, to: 2, push: false, src: `${F.googlePerSec.src} · 按平均速度估算`, draw: live },
  { from: 5, to: 6, push: false, draw: title },
]
