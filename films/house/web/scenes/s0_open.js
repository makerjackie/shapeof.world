// Bars 1–3: a house of 100 blocks, the one number that doesn't add up, the
// title.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, lerp, enter, shown } from '../lib.js'
import { F } from '../facts.js'
import * as B from '../blocks.js'

export const HOUSE = B.house({ cx: 1340, base: 800, s: 40, gap: 7 })
const BUILD = F.split.groups.find((g) => g.key === 'build').n // 33

// Bars 1–2 (+1 held), from the first frame: 100 万 = 100 blocks = a 100 ㎡
// home. On bar 2 the blocks that pay for the building itself turn cyan and
// the number counts down to them; on beat 3 the question lands and holds
// through the inserted bar, with a promise of what the film will do.
function hook(ctx, t) {
  const t0 = bt(1), t2 = bt(2)
  // The house builds from the ground up over the first second; on the first
  // frame the bottom rows already stand, so the frame is never empty.
  const L = HOUSE.map((b, i) => {
    const ti = t0 - 0.35 + i * 0.012, p = spring(t, ti, 4, 0.6)
    const cyan = i < BUILD && t >= t2 + i * 0.012
    // The other 67 pulse together while the question stands.
    const breathe = t >= bt(2, 3) && !cyan ? 0.6 + 0.4 * Math.cos((t - bt(2, 3)) * 7) : 1
    return { ...b, y: b.y - (1 - p) * 60, c: cyan ? C.build : C.gold, a: clamp(p * 3) * breathe }
  })
  B.draw(ctx, L)

  // "每一块 = 1 万元", over the roof, pointing at its top block.
  const tag = enter(t, bt(1, 2.6), 20)
  const pick = HOUSE[96]
  if (t < t2 + 0.3) {
    const a = tag.a * (1 - clamp((t - t2) / 0.3))
    rect(ctx, pick.x - 6, pick.y - 6, pick.s + 12, pick.s + 12, C.hi, a * 0.9, 6)
    rect(ctx, pick.x, pick.y, pick.s, pick.s, C.gold, a)
    txt(ctx, '每一块 = 1 万元', pick.x + pick.s / 2, pick.y - 34 + tag.dy, { size: 44, color: C.hi, align: 'center', alpha: a })
  }

  // Left column: one reading zone, the number in the middle.
  // The old line leaves before the new one arrives, so they never overlap.
  const out = 1 - clamp((t - t2) / 0.12), swap = clamp((t - t2 - 0.12) / 0.18)
  txt(ctx, '全国新房，平均每平方米约 1 万元', M, 300, { size: 46, color: C.dim, alpha: out })
  txt(ctx, '其中真正花在盖楼上的', M, 300, { size: 46, color: C.dim, alpha: swap })
  const n = t < t2 ? 100 : Math.round(count(t, t2 + 0.1, 0.7, BUILD, 100))
  const col = t < t2 + 0.1 ? C.gold : C.build
  scaled(ctx, t < t2 ? 1 : 1.08 - 0.08 * spring(t, t2 + 0.1, 3, 0.5), M, 560, () => hero(ctx, String(n), '万', M, 600, { size: 300, color: col }))
  txt(ctx, '一套 100 平的房子', M, 700, { size: 60, alpha: out })
  txt(ctx, '钢筋、水泥、工人，只占三分之一', M, 700, { size: 60, alpha: swap })

  const pr = enter(t, bt(2, 5), 20)
  txt(ctx, '接下来，一块一块算给你看', M, 790 + pr.dy, { size: 44, color: C.hi, alpha: pr.a })

  // Bar 2, beat 3: the question, on an ink band.
  const q = spring(t, bt(2, 3), 3.2, 0.55)
  if (q > 0) {
    rect(ctx, 0, 836, W, 150, C.ink, clamp(q * 2) * 0.97)
    scaled(ctx, 1.12 - 0.12 * q, W / 2, 930, () => {
      line(ctx, '剩下 67 万，去哪了？', W / 2, 944, { size: 104, color: C.bg, align: 'center', alpha: clamp(q * 2) })
    })
  }
}

// Bar 3: the house shrinks into the title card.
const TITLE_HOUSE = B.house({ cx: W / 2, base: 470, s: 24, gap: 5 })
function title(ctx, t) {
  const t0 = bt(3)
  const L = B.move(t, B.tint(HOUSE, (i) => (i < BUILD ? C.build : null)), TITLE_HOUSE, t0, 0.5, 0.002)
  B.draw(ctx, L)
  // The title waits until the house has passed over it.
  const s = 1.2 - 0.2 * spring(t, t0 + 0.45, 2.4, 0.55)
  scaled(ctx, s, W / 2, 600, () => txt(ctx, '房子的形状', W / 2, 670, { size: 190, align: 'center', alpha: clamp(spring(t, t0 + 0.45, 3, 0.6) * 2) }))
  const u = easeOut(prog(t, bt(3, 1.6), bt(3, 1.6) + 0.35))
  rect(ctx, W / 2 - 330 * u, 712, 660 * u, 10, C.hi)
  const a = enter(t, bt(3, 2))
  txt(ctx, '钱去了哪，从哪来，最后要付多少', W / 2, 810 + a.dy, { size: 56, align: 'center', alpha: a.a })
  const b = enter(t, bt(3, 2.5))
  txt(ctx, '数据截至 2026 年 10 月', W / 2, 880 + b.dy, { size: 34, color: C.dim, align: 'center', alpha: b.a })
  const out = easeIn(prog(t, bt(3, 4.4), bt(4)))
  if (out > 0) rect(ctx, 0, 0, W, H, C.bg, out)
}

export const SHOTS = [
  { from: 1, to: 2, src: `${F.price.src} · 盖楼的钱为估算，见第 2 章`, draw: hook },
  { from: 3, to: 3, push: false, draw: title },
]
