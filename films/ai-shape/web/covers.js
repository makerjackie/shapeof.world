// Release covers: three designs (A paradox, B scale, C US–China), each laid
// out separately for 4:3 (1600×1200; B站、抖音、视频号) and 16:9 (1920×1080;
// YouTube). The film is landscape only; A also has a 3:4 card (1200×1600) for
// the portrait cover 抖音 shows on profiles and in search. Same type and colours as the film; B reuses the
// film's own parameter chart.
import { C, NUM, bt, txt, hero, line, rect } from './lib.js'
import { SHOTS } from './scenes/s3_scale.js'

await Promise.all(['900 64px NotoSC', '700 64px NotoSC', '400 64px Anton'].map((f) => document.fonts.load(f, '数据人亿美元0123456789')))
await document.fonts.ready

const SIZES = { '4x3': [1600, 1200], '16x9': [1920, 1080], '3x4': [1200, 1600] }

// The film's parameter chart in its final state, without tags or caption.
function chart() {
  const off = new OffscreenCanvas(1920, 1080), c = off.getContext('2d')
  c.fillStyle = C.bg; c.fillRect(0, 0, 1920, 1080)
  SHOTS.find((s) => s.draw.name === 'params').draw(c, bt(31, 7.9), null, true)
  return off
}
const CROP = [160, 230, 1640, 770] // x, y, w, h of the chart in the film frame

const brand = (ctx, x, y, size, color = C.ink, align = 'left') => {
  const w = txt(ctx, 'AI 的形状', x, y, { size, color, align })
  return w
}

const DRAW = {
  A: {
    '4x3'(ctx, w, h) {
      rect(ctx, 0, 0, w / 2, h, C.bg); rect(ctx, w / 2, 0, w / 2, h, C.hi)
      brand(ctx, 80, 120, 52)
      txt(ctx, '2026', 80 + 290, 120, { size: 56, color: C.hi, family: NUM, weight: 400 })
      txt(ctx, '3 分钟 · 100 多个数字', w - 80, 120, { size: 46, color: C.bg, align: 'right' })
      txt(ctx, '↓', w / 4, 330, { size: 150, color: C.cyan, align: 'center', family: NUM, weight: 400 })
      hero(ctx, '13', '倍', w / 4, 640, { size: 300, color: C.cyan, align: 'center', unitScale: 0.34 })
      txt(ctx, '更便宜', w / 4, 790, { size: 100, align: 'center' })
      txt(ctx, '↑', w * 3 / 4, 330, { size: 150, color: C.bg, align: 'center', family: NUM, weight: 400 })
      hero(ctx, '7325', '亿美元', w * 3 / 4, 640, { size: 230, color: C.bg, align: 'center', unitScale: 0.3 })
      txt(ctx, '更烧钱', w * 3 / 4, 790, { size: 100, color: C.bg, align: 'center' })
      rect(ctx, 0, 880, w, h - 880, C.ink)
      txt(ctx, 'AI 越便宜，巨头越烧钱？', w / 2, 1080, { size: 112, color: C.bg, align: 'center' })
    },
    '16x9'(ctx, w, h) {
      rect(ctx, 0, 0, w / 2, h, C.bg); rect(ctx, w / 2, 0, w / 2, h, C.hi)
      brand(ctx, 90, 110, 52)
      txt(ctx, '2026', 90 + 290, 110, { size: 56, color: C.hi, family: NUM, weight: 400 })
      txt(ctx, '3 分钟 · 100 多个数字', w - 90, 110, { size: 46, color: C.bg, align: 'right' })
      txt(ctx, '↓', w / 4, 290, { size: 130, color: C.cyan, align: 'center', family: NUM, weight: 400 })
      hero(ctx, '13', '倍', w / 4, 560, { size: 280, color: C.cyan, align: 'center', unitScale: 0.34 })
      txt(ctx, '更便宜', w / 4, 690, { size: 96, align: 'center' })
      txt(ctx, '↑', w * 3 / 4, 290, { size: 130, color: C.bg, align: 'center', family: NUM, weight: 400 })
      hero(ctx, '7325', '亿美元', w * 3 / 4, 560, { size: 240, color: C.bg, align: 'center', unitScale: 0.3 })
      txt(ctx, '更烧钱', w * 3 / 4, 690, { size: 96, color: C.bg, align: 'center' })
      rect(ctx, 0, 780, w, h - 780, C.ink)
      txt(ctx, 'AI 越便宜，巨头越烧钱？', w / 2, 975, { size: 124, color: C.bg, align: 'center' })
    },
    // Portrait: the two halves stack, the question takes two lines.
    '3x4'(ctx, w, h) {
      rect(ctx, 0, 0, w, 600, C.bg); rect(ctx, 0, 600, w, 600, C.hi)
      brand(ctx, 72, 110, 52)
      txt(ctx, '2026', 72 + 290, 110, { size: 56, color: C.hi, family: NUM, weight: 400 })
      txt(ctx, '↓', 230, 420, { size: 150, color: C.cyan, align: 'center', family: NUM, weight: 400 })
      hero(ctx, '13', '倍', 640, 430, { size: 260, color: C.cyan, align: 'center', unitScale: 0.34 })
      txt(ctx, '更便宜', 640, 540, { size: 84, align: 'center' })
      txt(ctx, '↑', 150, 1000, { size: 150, color: C.bg, align: 'center', family: NUM, weight: 400 })
      hero(ctx, '7325', '亿美元', 680, 1000, { size: 220, color: C.bg, align: 'center', unitScale: 0.3 })
      txt(ctx, '更烧钱', 680, 1120, { size: 84, color: C.bg, align: 'center' })
      rect(ctx, 0, 1200, w, h - 1200, C.ink)
      txt(ctx, 'AI 越便宜，', w / 2, 1355, { size: 116, color: C.bg, align: 'center' })
      txt(ctx, '巨头越烧钱？', w / 2, 1500, { size: 116, color: C.bg, align: 'center' })
    },
  },
  B: {
    '4x3'(ctx, w, h) {
      rect(ctx, 0, 0, w, h, C.bg)
      const k = w / CROP[2]
      ctx.drawImage(chart(), ...CROP, 0, h - CROP[3] * k, w, CROP[3] * k)
      txt(ctx, '8 年，AI 大了', 80, 200, { size: 100 })
      hero(ctx, '2.4', '万倍', 80, 450, { size: 250, color: C.hi, unitScale: 0.36 })
      brand(ctx, w - 80, 120, 46, C.dim, 'right')
      line(ctx, '参数量 · 线性刻度', w - 80, 190, { size: 44, color: C.dim, align: 'right' })
    },
    '16x9'(ctx, w, h) {
      rect(ctx, 0, 0, w, h, C.bg)
      // Chart on the right two-thirds, words on the left.
      const cw = 1240, k = cw / CROP[2]
      ctx.drawImage(chart(), ...CROP, w - cw - 20, h - CROP[3] * k - 30, cw, CROP[3] * k)
      txt(ctx, '8 年，', 90, 330, { size: 110 })
      txt(ctx, 'AI 大了', 90, 470, { size: 110 })
      hero(ctx, '2.4', '万倍', 90, 760, { size: 250, color: C.hi, unitScale: 0.36 })
      txt(ctx, '参数量 · 线性刻度', 90, 860, { size: 44, color: C.dim })
      brand(ctx, 90, 130, 46, C.dim)
    },
  },
  C: {
    // The US clearly ahead; China's cards are people, power and open models.
    '4x3'(ctx, w, h) {
      rect(ctx, 0, 0, w, h, C.bg)
      txt(ctx, '中美 AI，谁领先？', w / 2, 190, { size: 116, align: 'center' })
      rect(ctx, 0, 280, w * 0.64, 640, C.us); rect(ctx, w * 0.64, 280, w * 0.36, 640, C.cn)
      txt(ctx, '美国', w * 0.32, 520, { size: 120, align: 'center' })
      txt(ctx, '明显领先', w * 0.32, 680, { size: 140, align: 'center' })
      txt(ctx, '模型、钱、芯片、算力', w * 0.32, 790, { size: 52, align: 'center' })
      txt(ctx, '中国', w * 0.82, 560, { size: 96, align: 'center' })
      txt(ctx, '人、电、开源', w * 0.82, 680, { size: 60, align: 'center' })
      line(ctx, '能力上，中国平均晚约 7 个月', w / 2, 1080, { size: 76, color: C.hi, align: 'center' })
      txt(ctx, 'AI 的形状', 80, h - 40, { size: 36, color: C.dim })
    },
    '16x9'(ctx, w, h) {
      rect(ctx, 0, 0, w, h, C.bg)
      txt(ctx, '中美 AI，谁领先？', w / 2, 170, { size: 116, align: 'center' })
      rect(ctx, 0, 240, w * 0.64, 600, C.us); rect(ctx, w * 0.64, 240, w * 0.36, 600, C.cn)
      txt(ctx, '美国明显领先', w * 0.32, 560, { size: 150, align: 'center' })
      txt(ctx, '最强的模型、钱、芯片、算力', w * 0.32, 680, { size: 56, align: 'center' })
      txt(ctx, '中国', w * 0.82, 500, { size: 104, align: 'center' })
      txt(ctx, '人、电、开源', w * 0.82, 630, { size: 64, align: 'center' })
      line(ctx, '能力上，中国平均晚约 7 个月', w / 2, 990, { size: 84, color: C.hi, align: 'center' })
      txt(ctx, 'AI 的形状', 90, h - 40, { size: 34, color: C.dim })
    },
  },
}

window.renderCover = (id, fmt) => {
  const [w, h] = SIZES[fmt]
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')
  DRAW[id][fmt](ctx, w, h)
  return cv.toDataURL('image/png')
}
window.ready = true
