// Release covers: two designs (A the opening question, B the bill), each laid
// out for 4:3 (1600×1200; B站、抖音、视频号) and 16:9 (1920×1080; YouTube);
// A also as 3:4 (1200×1600), the main cover 抖音 asks for.
// Landscape only; the film's own type, colours and blocks.
import { C, NUM, txt, hero, line, rect } from './lib.js'
import * as B from './blocks.js'
import { bigHouse, priced } from './scenes/s6_end.js'

await Promise.all(['900 64px NotoSC', '700 64px NotoSC', '400 64px Anton'].map((f) => document.fonts.load(f, '房子的形状万盖楼年要付钱0123456789')))
await document.fonts.ready

const SIZES = { '4x3': [1600, 1200], '16x9': [1920, 1080], '3x4': [1200, 1600] }
const BUILD = 33

function band(ctx, w, h, y, s, size) {
  rect(ctx, 0, y, w, h - y, C.ink)
  line(ctx, s, w / 2, y + (h - y) / 2 + size * 0.36, { size, color: C.bg, align: 'center' })
}
const brand = (ctx, x, y, size) => txt(ctx, '房子的形状', x, y, { size, color: C.dim })

function coverA(ctx, w, h, k) {
  rect(ctx, 0, 0, w, h, C.bg)
  const L = B.house({ cx: w * (k.hx || 0.72), base: k.base, s: k.s, gap: k.gap }).map((b, i) => ({ ...b, c: i < BUILD ? C.build : C.gold }))
  B.draw(ctx, L)
  brand(ctx, k.m, k.top, 48)
  txt(ctx, '一套 100 万的房子', k.m, k.top + 130, { size: k.l1, alpha: 1 })
  txt(ctx, '真正盖楼只花了', k.m, k.top + 130 + k.l1 * 1.3, { size: k.l1 })
  hero(ctx, '33', '万', k.m, k.top + 130 + k.l1 * 1.3 + k.hero * 0.95, { size: k.hero, color: C.build })
  band(ctx, w, h, k.bandY, '剩下 67 万，去哪了？', k.band)
}
function coverB(ctx, w, h, k) {
  rect(ctx, 0, 0, w, h, C.bg)
  B.draw(ctx, priced(bigHouse({ cx: w * 0.73, base: k.base, s: k.s2, gap: k.gap2 })))
  brand(ctx, k.m, k.top, 48)
  txt(ctx, '100 万的房子', k.m, k.top + 130, { size: k.l1 })
  txt(ctx, '30 年一共要付', k.m, k.top + 130 + k.l1 * 1.3, { size: k.l1 })
  hero(ctx, '145', '万', k.m, k.top + 130 + k.l1 * 1.3 + k.hero * 0.95, { size: k.hero, color: C.hi })
  band(ctx, w, h, k.bandY, '钱都去哪了？一块一块算给你看', k.band * 0.82)
}

const K = {
  '4x3': { m: 90, top: 110, l1: 84, hero: 330, base: 860, s: 46, gap: 8, s2: 34, gap2: 6, bandY: 930, band: 112 },
  '16x9': { m: 100, top: 110, l1: 80, hero: 300, base: 800, s: 44, gap: 8, s2: 32, gap2: 6, bandY: 860, band: 104 },
  '3x4': { m: 90, top: 110, l1: 84, hero: 330, base: 1290, s: 44, gap: 8, s2: 34, gap2: 6, bandY: 1350, band: 100, hx: 0.5 },
}
const DRAW = { A: coverA, B: coverB }

window.renderCover = (id, fmt) => {
  const [w, h] = SIZES[fmt]
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')
  DRAW[id](ctx, w, h, K[fmt])
  return cv.toDataURL('image/png')
}
window.ready = true
