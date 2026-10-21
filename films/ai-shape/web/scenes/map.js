// Shared world map: the dot matrix, country anchors on the tilted plane, and
// the lit prisms used for the US/China/Europe columns.
import { C } from '../lib.js'
import { buildMap, drawMap, place, ISO } from '../worldmap.js'
export { drawMap, place, ISO }

export const EUROPE = [40, 56, 100, 191, 196, 203, 208, 233, 246, 250, 276, 300, 348, 372, 380, 428, 440, 442,
  470, 528, 616, 620, 642, 703, 705, 724, 752, 826, 578, 756]
export const GROUPS = { us: [ISO.US], cn: [ISO.CN], eu: EUROPE }
export const GROUP_COLOR = { us: C.us, cn: C.cn, eu: C.rest }

export let map = null
export let anchors = null
let ready = null
const shapes = new Map() // detailed outlines (Path2D) for the four small places, 1:50m atlas
let land = null           // coastlines only, for zoomed-in context: no borders, so no disputed lines

export function setupMap() {
  if (ready) return ready
  ready = (async () => {
    map = await buildMap()
    const topo50 = await (await fetch('../node_modules/world-atlas/countries-50m.json')).json()
    const gp = d3.geoPath(map.projection)
    for (const f of topojson.feature(topo50, topo50.objects.countries).features) {
      if ([158, 528, 410, 392].includes(Number(f.id))) shapes.set(Number(f.id), new Path2D(gp(f)))
    }
    const land50 = await (await fetch('../node_modules/world-atlas/land-50m.json')).json()
    const polys = topojson.feature(land50, land50.objects.land).features
      .flatMap(({ geometry: g }) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates))
    // Antarctica stays out, as in the dot map.
    land = new Path2D(gp({ type: 'MultiPolygon', coordinates: polys.filter((poly) => poly[0].some(([, lat]) => lat > -60)) }))
    anchors = {}
    for (const [k, ids] of Object.entries(GROUPS)) {
      const set = new Set(ids), xs = [], ys = []
      for (const d of map.dots) {
        if (!set.has(d.id)) continue
        const [sx, sy] = place(d.x, d.y, 1)
        xs.push(sx); ys.push(sy)
      }
      const med = (a) => a.sort((p, q) => p - q)[a.length >> 1]
      anchors[k] = { bx: med(xs), by: med(ys) }
    }
  })()
  return ready
}

export const groupColors = () => {
  const m = new Map()
  for (const [k, ids] of Object.entries(GROUPS)) for (const id of ids) m.set(id, GROUP_COLOR[k])
  return m
}

// A lit box: glowing front face, lighter top, darker side.
export function prism(ctx, bx, by, w, h, color, alpha = 1) {
  if (h <= 0.5) return
  const dx = w * 0.32, dy = -w * 0.2, x0 = bx - w / 2, top = by - h
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = color; ctx.shadowBlur = 60
  const g = ctx.createLinearGradient(0, top, 0, by)
  g.addColorStop(0, color); g.addColorStop(1, color + '99')
  ctx.fillStyle = g; ctx.fillRect(x0, top, w, h)
  ctx.shadowBlur = 0
  ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.55
  ctx.beginPath(); ctx.moveTo(x0 + w, top); ctx.lineTo(x0 + w + dx, top + dy); ctx.lineTo(x0 + w + dx, by + dy); ctx.lineTo(x0 + w, by); ctx.fill()
  ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + dx, top + dy); ctx.lineTo(x0 + w + dx, top + dy); ctx.lineTo(x0 + w, top); ctx.fill()
  ctx.restore()
}

// Tilted map with the three groups standing as columns of the given heights.
export function drawTowers(ctx, { heights, grow = 1, alpha = 1, wob = () => 1 }) {
  drawMap(ctx, map, { tilt: 1, colors: groupColors(), alpha: alpha * 0.9, reveal: 1, dotAlpha: 0.6 })
  for (const k of ['eu', 'cn', 'us']) {
    const a = anchors[k]
    prism(ctx, a.bx, a.by, k === 'us' ? 150 : 110, heights[k] * grow * wob(k), GROUP_COLOR[k], alpha)
  }
}

// Fill a country's detailed outline in map (flat) coordinates.
export function drawCountry(ctx, id, color, alpha = 1, lineWidth = 0) {
  const path = shapes.get(id)
  if (!path) return
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 30; ctx.fill(path)
  if (lineWidth) { ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke(path) }
  ctx.restore()
}

// All land as faint filled outlines, for close-ups where the dots get sparse.
export function drawLand(ctx, lineWidth = 1) {
  ctx.save(); ctx.fillStyle = '#17171d'; ctx.strokeStyle = 'rgba(244,241,234,0.22)'; ctx.lineWidth = lineWidth
  if (land) { ctx.fill(land); ctx.stroke(land) }
  ctx.restore()
}
