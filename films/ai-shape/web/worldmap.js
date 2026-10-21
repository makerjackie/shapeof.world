// Dot-matrix world map that can tilt into a ground plane and extrude countries
// into columns. Land comes from Natural Earth via world-atlas (public domain).
import { W, H, C, lerp, clamp } from './lib.js'

export const ISO = { US: 840, CN: 156, GB: 826, FR: 250, DE: 276, CA: 124, KR: 410, JP: 392, IN: 356, AE: 784, IL: 376, SG: 702 }

export async function buildMap({ spacing = 9 } = {}) {
  const topo = await (await fetch('../node_modules/world-atlas/countries-110m.json')).json()
  const countries = topojson.feature(topo, topo.objects.countries).features
    .filter((f) => f.id !== '010') // Antarctica takes space without information here.
  const projection = d3.geoEqualEarth().fitExtent([[120, 150], [W - 120, H - 110]], { type: 'FeatureCollection', features: countries })
  const path = d3.geoPath(projection)
  // Paint each country with its index encoded in the red/green channels.
  const off = new OffscreenCanvas(W, H)
  const o = off.getContext('2d', { willReadFrequently: true })
  countries.forEach((f, i) => {
    o.fillStyle = `rgb(${(i + 1) & 255}, ${(i + 1) >> 8}, 0)`
    o.beginPath(); path.context(o)(f); o.fill()
  })
  const pixels = o.getImageData(0, 0, W, H).data
  const dots = []
  for (let row = 0, y = 0; y < H; row++, y += spacing * 0.866) {
    for (let x = (row % 2) * spacing / 2; x < W; x += spacing) {
      // Antialiased borders blend two indices into a third; keep a dot only
      // where it and its neighbours agree.
      const at = (dx, dy) => { const p = (Math.round(y + dy) * W + Math.round(x + dx)) * 4; return pixels[p] + (pixels[p + 1] << 8) }
      const idx = at(0, 0)
      if (!idx || at(-2, 0) !== idx || at(2, 0) !== idx || at(0, -2) !== idx || at(0, 2) !== idx) continue
      dots.push({ x, y, id: Number(countries[idx - 1].id) })
    }
  }
  // China as Chinese maps draw it. Natural Earth gives 藏南 to India; Taiwan is
  // too small at 1:110m to keep a dot, so it gets the one nearest its centre.
  for (const d of dots) {
    if (d.id !== ISO.IN) continue
    const [lon, lat] = projection.invert([d.x, d.y])
    if (lon > 91.6 && lat > 27.5) d.id = ISO.CN
  }
  const [tx, ty] = projection([121, 23.7]), row = Math.round(ty / (spacing * 0.866)), x0 = (row % 2) * spacing / 2
  dots.push({ x: x0 + Math.round((tx - x0) / spacing) * spacing, y: row * spacing * 0.866, id: ISO.CN })
  return { dots, projection }
}

// tilt 0: flat map; tilt 1: ground plane seen from above at an angle.
export function place(x, y, tilt) {
  const z = clamp((y - 150) / (H - 260)) // 0 far (north), 1 near (south)
  const sx = W / 2 + (x - W / 2) * lerp(1, lerp(0.62, 1.04, z), tilt)
  const sy = lerp(y, 470 + z * 520, tilt)
  return [sx, sy, lerp(1, lerp(0.6, 1.05, z), tilt)]
}

// heights: Map(countryId -> pixels). colors: Map(countryId -> css color).
export function drawMap(ctx, map, { tilt = 0, heights = new Map(), colors = new Map(), alpha = 1, reveal = 1, dotAlpha = 0.55 }) {
  const items = map.dots.map((d) => {
    const [sx, sy, s] = place(d.x, d.y, tilt)
    return { d, sx, sy, s }
  })
  items.sort((a, b) => a.sy - b.sy)
  ctx.save()
  ctx.globalAlpha = alpha
  for (const { d, sx, sy, s } of items) {
    // Reveal sweeps from west to east.
    const r = clamp((reveal * 1.25 - d.x / W) * 4)
    if (r <= 0) continue
    const h = (heights.get(d.id) || 0) * s
    const col = colors.get(d.id) || C.ink
    if (h > 1) {
      const g = ctx.createLinearGradient(0, sy, 0, sy - h)
      g.addColorStop(0, col + '00')
      g.addColorStop(0.5, col + '22')
      g.addColorStop(1, col + '66')
      ctx.strokeStyle = g
      ctx.lineWidth = 1.4 * s
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - h); ctx.stroke()
      // The lifted country keeps its outline as a bright lid of dots.
      ctx.fillStyle = col
      ctx.globalAlpha = alpha * r
      ctx.fillRect(sx - 1.5 * s, sy - h - 1.5 * s, 3 * s, 3 * s)
      ctx.globalAlpha = alpha * r * 0.8
      ctx.fillRect(sx - 1.2 * s, sy - 1.2 * s, 2.4 * s, 2.4 * s)
    } else {
      const hot = colors.has(d.id)
      const k = hot ? 1.9 : 1.3
      ctx.globalAlpha = alpha * r * (hot ? 1 : dotAlpha)
      ctx.fillStyle = hot ? col : C.dim
      ctx.fillRect(sx - k * s, sy - k * s, 2 * k * s, 2 * k * s)
    }
    ctx.globalAlpha = alpha
  }
  ctx.restore()
}
