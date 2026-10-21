/**
 * 「如果月球只有一个像素」的比例常量、行星数据、沿途字幕与著名天体对比带。
 *
 * 比例基准：月球平均直径 3,474.8 km = 1 CSS 像素。
 * 所有天体直径与轨道半长轴（NASA Planetary Fact Sheet）按同一把尺子换算，
 * 因此 1 px 在画面上始终等于 3,474.8 km。
 *
 * 第二段「大小对比」不再按距离（比邻星在这把尺子上远在 3,060 公里之外），
 * 只把经典天体的真实直径肩并肩排在同一把尺子上：中子星 0.006 px，
 * 参宿四 305,925 px。
 */

export const MOON_DIAMETER_KM = 3474.8
/** 1 像素对应的真实公里数 */
export const KM_PER_PX = MOON_DIAMETER_KM
export const AU_KM = 149_600_000

/** 太阳中心在轨道条上的 x 坐标（px） */
export const SUN_X = 280
/** 最大滚动距离（px），末尾留一段纯黑作为情绪缓冲 */
export const MAX_SCROLL_PX = 1_362_000

/** 比邻星：4.2465 光年；在这把尺子上约 115.6 亿 px，按 96dpi 屏幕约 3,060 km */
export const PROXIMA_KM = 4.2465 * 9.4607e12
export const PROXIMA_PX = PROXIMA_KM / KM_PER_PX
export const PROXIMA_SCREEN_KM = (PROXIMA_PX * 0.264583) / 1_000_000

export function kmToPx(km: number): number {
  return km / KM_PER_PX
}

export type PixelBody = {
  id: string
  name: string
  /** 直径（km，NASA 实测均值） */
  diameterKm: number
  /** 轨道半长轴（km，距日）；月球为距地 */
  distanceKm: number
  color: string
  /** 名牌下方的一行小字 */
  tagline: string
  /** 展开卡片里的一句事实 */
  fact: string
  ring?: boolean
}

export const SUN = {
  id: 'sun',
  name: '太阳',
  diameterKm: 1_392_700,
  color: '#f2d090',
  tagline: '400.8 像素宽',
  fact: '它占太阳系总质量的 99.86%——太阳系几乎是「太阳 + 一点碎屑」。',
} as const

export const BODIES: Array<PixelBody> = [
  {
    id: 'mercury',
    name: '水星',
    diameterKm: 4_879,
    distanceKm: 57_910_000,
    color: '#9c8e85',
    tagline: '1.4 像素 · 0.387 AU',
    fact: '水星上的一天（176 个地球日）比它的一年（88 天）还长。',
  },
  {
    id: 'venus',
    name: '金星',
    diameterKm: 12_104,
    distanceKm: 108_210_000,
    color: '#d9b382',
    tagline: '3.5 像素 · 0.723 AU',
    fact: '它反着自转：在金星上，太阳从西边升起。',
  },
  {
    id: 'earth',
    name: '地球',
    diameterKm: 12_742,
    distanceKm: 149_600_000,
    color: '#6a93d4',
    tagline: '3.7 像素 · 1.000 AU',
    fact: '目前已知唯一有生命的地方——全部生命都在这 3.7 个像素上。',
  },
  {
    id: 'mars',
    name: '火星',
    diameterKm: 6_779,
    distanceKm: 227_940_000,
    color: '#c1572f',
    tagline: '2 像素 · 1.524 AU',
    fact: '奥林帕斯山高 21.9 km，在这把尺子上只有 0.006 像素。',
  },
  {
    id: 'jupiter',
    name: '木星',
    diameterKm: 139_820,
    distanceKm: 778_570_000,
    color: '#c8a27a',
    tagline: '40 像素 · 5.203 AU',
    fact: '大红斑是一场刮了几百年的风暴，最宽时比地球直径还大。',
  },
  {
    id: 'saturn',
    name: '土星',
    diameterKm: 116_460,
    distanceKm: 1_433_530_000,
    color: '#d8c08d',
    tagline: '33.5 像素 · 9.582 AU',
    fact: '光环宽 27 万多公里，厚度却往往只有几十米。',
    ring: true,
  },
  {
    id: 'uranus',
    name: '天王星',
    diameterKm: 50_724,
    distanceKm: 2_872_460_000,
    color: '#9fd8d8',
    tagline: '14.6 像素 · 19.19 AU',
    fact: '它几乎躺着自转，自转轴倾角约 98°。',
  },
  {
    id: 'neptune',
    name: '海王星',
    diameterKm: 49_244,
    distanceKm: 4_495_060_000,
    color: '#4b70dd',
    tagline: '14.2 像素 · 30.07 AU',
    fact: '这里有太阳系最快的风，时速可达 2,100 公里。',
  },
]

export const MOON = {
  id: 'moon',
  name: '月球',
  diameterKm: MOON_DIAMETER_KM,
  distanceKm: 384_400,
  color: '#a8a8a8',
  tagline: '1 像素 — 这把尺子本身',
  fact: '它正以每年 3.8 cm 的速度远离地球；在这把尺子上，是每年十亿分之一像素。',
} as const

/** 天体在轨道条上的 x 坐标（px，从太阳中心起算） */
export function bodyX(distanceKm: number): number {
  return SUN_X + kmToPx(distanceKm)
}

export type PixelCaption = {
  /** 距太阳中心的 px 偏移 */
  x: number
  /** 垂直位置（舞台高度百分比） */
  y: number
  text: string
  /** beat = 更大的衬线字，用于开场与结尾的重拍 */
  beat?: boolean
}

export const CAPTIONS: Array<PixelCaption> = [
  { x: 760, y: 50, beat: true, text: '如果月球只有一个像素——' },
  { x: 3_000, y: 40, text: '这是太阳。在这把尺子上，它的直径是 400 像素。' },
  { x: 5_900, y: 60, text: '约定一把尺子：月球直径 = 1 个像素。' },
  { x: 11_000, y: 44, text: '所有行星的大小和距离，都按它严格排开。从这里向右。' },
  { x: 14_200, y: 58, text: '飞了 4,900 多万公里，才遇见第一颗行星。' },
  { x: 23_500, y: 50, text: '这里什么都没有。' },
  { x: 37_500, y: 46, text: '还是什么都没有。' },
  { x: 45_000, y: 64, text: '我们全部的历史，就在这两粒灰尘上。' },
  { x: 54_000, y: 42, text: '教科书把行星画在同一页纸上。那是一种善意的谎言。' },
  { x: 88_000, y: 56, text: '从现在开始，是真正的空旷。' },
  { x: 112_000, y: 44, text: '你正穿过小行星带——相邻两块岩石之间，平均隔着 100 多万公里。' },
  { x: 150_000, y: 60, text: '我们习惯叫它「太空」。因为它真的太空了。' },
  { x: 196_000, y: 46, text: '快到了。前面是全程第一个「大东西」。' },
  { x: 232_000, y: 58, text: '40 像素宽，能装下 1,300 个地球——却仍然几乎不占什么地方。' },
  { x: 290_000, y: 44, text: '你已经走过的距离，是地月距离的 2,600 倍。' },
  { x: 356_000, y: 56, text: '光从太阳走到这里，也要一个多小时。' },
  { x: 421_000, y: 60, text: '这圈光环在这里宽 79 像素，厚度却往往只有几十米。' },
  { x: 650_000, y: 46, text: '旅程过半。你并没有错过什么——本来就没有什么。' },
  { x: 760_000, y: 56, text: '天王星之前，再没有什么可看的了。' },
  { x: 847_000, y: 60, text: '天王星到海王星，比天王星到土星还要远。' },
  { x: 980_000, y: 44, text: '在这里，太阳缩成了背景里一粒刺眼的亮点。' },
  { x: 1_130_000, y: 56, text: '继续。最后一颗行星快到了。' },
  { x: 1_303_000, y: 62, text: '冥王星还在更远的柯伊伯带里，直径 0.7 个像素。这次就不去了。' },
  { x: 1_318_000, y: 46, text: '到这里，太阳系的主要成员就都见过了。' },
  { x: 1_332_000, y: 52, beat: true, text: '但你大概已经明白：太阳系的主体，从来不是行星。' },
  { x: 1_347_000, y: 50, beat: true, text: '是空。' },
]

/* ------------------------------------------------------------------
 * 第二段：著名天体大小对比（同一把尺子，只比直径，不比距离）
 * 半径来源：比邻星 0.154 R☉（VLTI/PIONIER，Kervella et al. 2017）、
 * 天狼星 A 1.714 R☉（CHARA，Bond et al. 2017）、大角星 25.4 R☉、
 * 参宿四 764 R☉（红超巨星，文献区间约 640–1020 R☉）、
 * 人马座A* 史瓦西直径 ≈ 0.17 AU（M = 4.3×10⁶ M☉，GRAVITY / EHT 2022）、
 * 中子星取典型直径 20 km。R☉ = 695,700 km。
 * ------------------------------------------------------------------ */

export type GalleryGroup = 'anchor' | 'star' | 'extreme'

export type GalleryBody = {
  id: string
  name: string
  /** 直径（km） */
  diameterKm: number
  color: string
  /** 名牌下方的一行小字 */
  tagline: string
  /** 卡片里的「对比」一行 */
  compare: string
  /** 展开卡片里的一句事实 */
  fact: string
  group: GalleryGroup
  visual: 'star' | 'moon' | 'earth' | 'blackhole' | 'neutron'
}

export type GalleryPlaced = GalleryBody & {
  /** 圆心在对比条上的 x（px） */
  x: number
  /** 半径（px，按月球尺子换算，可远小于 1） */
  radiusPx: number
  /** 直径（px） */
  widthPx: number
}

export const GALLERY_BODIES: Array<GalleryBody> = [
  {
    id: 'neutron-star',
    name: '中子星',
    diameterKm: 20,
    color: '#d6ecff',
    tagline: '0.006 像素 · 城市大小的恒星残骸',
    compare: '直径 ≈ 一座大城市，质量却超过太阳',
    fact: '一勺中子星物质就有几亿吨重。它是大质量恒星超新星爆发后留下的核，致密到原子都被压垮。',
    group: 'extreme',
    visual: 'neutron',
  },
  {
    id: 'moon',
    name: MOON.name,
    diameterKm: MOON.diameterKm,
    color: MOON.color,
    tagline: MOON.tagline,
    compare: '3,474.8 公里 = 1 像素',
    fact: MOON.fact,
    group: 'anchor',
    visual: 'moon',
  },
  {
    id: 'earth',
    name: '地球',
    diameterKm: 12_742,
    color: '#6a93d4',
    tagline: '3.7 像素 · 已知的全部生命',
    compare: '12,742 公里 ≈ 3.7 像素',
    fact: '目前已知唯一有生命的地方——全部生命都在这 3.7 个像素上。',
    group: 'anchor',
    visual: 'earth',
  },
  {
    id: 'proxima',
    name: '比邻星',
    diameterKm: 214_276,
    color: '#e08a63',
    tagline: '61.7 像素 · 离太阳最近的恒星',
    compare: '直径 ≈ 太阳的 15%',
    fact: '一颗安静的红矮星：只有太阳的 15% 宽，却能安稳燃烧数万亿年——比宇宙的现年龄还长几百倍。',
    group: 'star',
    visual: 'star',
  },
  {
    id: 'sun',
    name: SUN.name,
    diameterKm: SUN.diameterKm,
    color: SUN.color,
    tagline: SUN.tagline,
    compare: '参照：太阳直径 = 400.8 像素',
    fact: SUN.fact,
    group: 'anchor',
    visual: 'star',
  },
  {
    id: 'sirius',
    name: '天狼星',
    diameterKm: 2_384_860,
    color: '#cfe0ff',
    tagline: '686 像素 · 夜空最亮的恒星',
    compare: '直径 ≈ 1.7 个太阳',
    fact: '夜空中最亮的恒星，直径约 1.7 个太阳；古埃及人曾按它黎明前升起的日子标记新年的开始。',
    group: 'star',
    visual: 'star',
  },
  {
    id: 'sgra',
    name: '人马座A*',
    diameterKm: 25_384_600,
    color: '#0b0b0e',
    tagline: '7,305 像素 · 银河系中心黑洞',
    compare: '事件视界直径 ≈ 18 个太阳并排',
    fact: '430 万个太阳的质量压在这里。这个圆不是表面，是事件视界——连光都有去无回的边界；2022 年，事件视界望远镜拍到了它。',
    group: 'extreme',
    visual: 'blackhole',
  },
  {
    id: 'arcturus',
    name: '大角星',
    diameterKm: 35_341_560,
    color: '#f0a05f',
    tagline: '10,171 像素 · 橙色巨星',
    compare: '直径 ≈ 25 个太阳并排',
    fact: '一颗烧到暮年的橙色巨星：核心的氢烧完后，它膨胀成太阳的 25 倍宽。几十亿年后，太阳也会走上同一条路。',
    group: 'star',
    visual: 'star',
  },
  {
    id: 'betelgeuse',
    name: '参宿四',
    diameterKm: 1_063_029_600,
    color: '#d96b4a',
    tagline: '305,925 像素 · 红超巨星',
    compare: '直径 ≈ 764 个太阳并排',
    fact: '把它放到太阳的位置，水星、金星、地球、火星都会在它肚子里。它随时可能以超新星谢幕——按天文的日程，「随时」是未来十万年内。',
    group: 'star',
    visual: 'star',
  },
]

const GALLERY_START_X = 700
const GALLERY_END_MARGIN = 2_400

function layoutGallery(): Array<GalleryPlaced> {
  let cursor = GALLERY_START_X
  return GALLERY_BODIES.map((body, index) => {
    const radiusPx = kmToPx(body.diameterKm) / 2
    const x = cursor + radiusPx
    const next = GALLERY_BODIES[index + 1]
    const nextRadius = next ? kmToPx(next.diameterKm) / 2 : 0
    const gap = next
      ? Math.min(2_400, Math.max(460, Math.max(radiusPx, nextRadius) * 0.55))
      : GALLERY_END_MARGIN
    cursor = x + radiusPx + gap
    return { ...body, x, radiusPx, widthPx: radiusPx * 2 }
  })
}

/** 对比条：按真实直径肩并肩排开的名人堂 */
export const GALLERY: Array<GalleryPlaced> = layoutGallery()

/** 大小对比条的最大滚动距离（px），末尾是参宿四的右缘 + 余韵 */
export const GALLERY_MAX_SCROLL_PX = Math.ceil(
  GALLERY[GALLERY.length - 1].x + GALLERY[GALLERY.length - 1].radiusPx + GALLERY_END_MARGIN,
)

/** 参宿四的「内部」停靠点：飞进它肚子里再停一次（位于盘面偏内侧的深红区，字幕可读） */
export const BETELGEUSE_INTERIOR_STOP_X = 60_000

/** 对比带字幕：都停在停靠点附近，停下时正好可读 */
export const GALLERY_CAPTIONS: Array<PixelCaption> = [
  { x: 320, y: 42, beat: true, text: '同一把尺子，接着量宇宙里的名人。' },
  { x: 700, y: 22, text: '这一颗连 1 像素都不到——它是恒星烧尽后剩下的核。' },
  { x: 2_460, y: 30, text: '距离在这把尺子上排不下，这一段只比大小。' },
  { x: 3_600, y: 64, text: '下一个不是星，是一个洞。' },
  { x: 28_554, y: 40, text: '最后这位，你得飞一会儿才能看完。' },
  { x: BETELGEUSE_INTERIOR_STOP_X, y: 58, text: '你还在参宿四的「里面」。' },
]

export function formatKm(km: number): string {
  if (km >= 1e8) return `${(km / 1e8).toFixed(3)} 亿公里`
  if (km >= 1e4) return `${(km / 1e4).toFixed(1)} 万公里`
  return `${Math.round(km).toLocaleString('zh-CN')} 公里`
}

export function formatAu(km: number): string {
  return `${(km / AU_KM).toFixed(3)} AU`
}

/** 像素宽度读数：亚像素保留三位小数，其余取整 */
export function formatPx(px: number): string {
  if (px < 1) return `${px.toFixed(3)} 像素`
  if (px < 10) return `${px.toFixed(1)} 像素`
  return `${Math.round(px).toLocaleString('zh-CN')} 像素`
}
