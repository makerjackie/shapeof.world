// Procedural textures and the studio environment. Everything is generated at start-up, so the world
// ships no image files: wood grain, binding, rosette and light sprites are all drawn on canvases.
import * as THREE from 'three'

// ---- noise -----------------------------------------------------------------------------------
function hash2(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export function vnoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let v = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    v += a * vnoise(x * f, y * f, seed + i * 17)
    a *= 0.5
    f *= 2.03
  }
  return v
}

export function rng(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

function canvasTexture(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: boolean; srgb?: boolean } = {},
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.wrapS = t.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  return t
}

// ---- spruce top ------------------------------------------------------------------------------
// Canvas covers x in [-0.095, 0.095] (190 mm) and y (distance from saddle) in [-0.075, 0.18] (255 mm),
// with y growing upward in texture space (canvas row 0 = y 0.18).
export const TOP = { x0: -0.095, x1: 0.095, y0: -0.075, y1: 0.18 }

export function spruceTexture(o: { outline: Array<[number, number]>; holeY: number; holeR: number }): THREE.CanvasTexture {
  const W = 1024
  const H = Math.round((W * (TOP.y1 - TOP.y0)) / (TOP.x1 - TOP.x0))
  return canvasTexture(W, H, (g, w, h) => {
    const img = g.createImageData(w, h)
    const d = img.data
    for (let py = 0; py < h; py++) {
      const Y = (py / h) * 255 // mm along the grain
      for (let px = 0; px < w; px++) {
        const X = (px / w - 0.5) * 190 // mm across
        const wob = 1.0 * Math.sin(Y * 0.05 + X * 0.25) + 1.6 * (fbm(Y * 0.018, X * 0.045, 3, 3) - 0.5) * 2
        const period = 0.92 + 0.004 * Math.abs(X) + 0.22 * fbm(X * 0.03, 11, 9, 2)
        const s = (X + wob) / period
        const f = s - Math.floor(s)
        const late = f ** 7 // thin dark latewood line at the end of each ring
        const mott = fbm(X * 0.09, Y * 0.015, 21, 4)
        const sheen = 0.5 + 0.5 * Math.sin(X * 0.55 + fbm(X * 0.02, Y * 0.01, 5, 2) * 9)
        const lum = 1 - 0.05 * (1 - Math.sin(f * Math.PI)) + 0.16 * (mott - 0.5) + 0.03 * sheen
        const k = Math.min(0.6, late * 0.62)
        // honey-gold spruce: early wood light, latewood a deep amber
        const r = mix(222, 150, k) * lum
        const gC = mix(176, 96, k) * lum
        const b = mix(112, 48, k) * lum
        const o4 = (py * w + px) * 4
        d[o4] = r
        d[o4 + 1] = gC
        d[o4 + 2] = b
        d[o4 + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)

    const sx = w / (TOP.x1 - TOP.x0)
    const sy = h / (TOP.y1 - TOP.y0)
    const cx = (x: number) => (x - TOP.x0) * sx
    const cy = (y: number) => (TOP.y1 - y) * sy

    // bookmatch seam
    g.fillStyle = 'rgba(90,50,20,0.10)'
    g.fillRect(w / 2 - 0.8, 0, 1.6, h)

    // soft darkening around the hole
    const hole = (cx0: number, cy0: number, r0: number, r1: number, a: number) => {
      const gr = g.createRadialGradient(cx0, cy0, r0, cx0, cy0, r1)
      gr.addColorStop(0, `rgba(30,12,2,${a})`)
      gr.addColorStop(1, 'rgba(30,12,2,0)')
      g.fillStyle = gr
      g.beginPath()
      g.arc(cx0, cy0, r1, 0, 7)
      g.fill()
    }
    hole(cx(0), cy(o.holeY), o.holeR * sx, (o.holeR + 0.014) * sx, 0.42)

    // top edge: lacquer-darkened rim + binding following the outline
    g.save()
    g.lineJoin = 'round'
    const path = () => {
      g.beginPath()
      o.outline.forEach(([x, y], i) => (i ? g.lineTo(cx(x), cy(y)) : g.moveTo(cx(x), cy(y))))
      g.closePath()
    }
    g.strokeStyle = 'rgba(40,18,4,0.55)'
    g.lineWidth = 0.02 * sx
    path()
    g.stroke()
    g.strokeStyle = 'rgba(70,34,10,0.35)'
    g.lineWidth = 0.011 * sx
    path()
    g.stroke()
    g.strokeStyle = '#efe6cf'
    g.lineWidth = 0.0042 * sx
    path()
    g.stroke() // binding
    g.restore()

    // purfling: scaled copies (cheap inset) - black / white / black
    const cxm = 0
    const cym = 0.05
    const inset = (k: number, col: string, lw: number) => {
      g.strokeStyle = col
      g.lineWidth = lw * sx
      g.beginPath()
      o.outline.forEach(([x, y], i) => {
        const px = cxm + (x - cxm) * k
        const py = cym + (y - cym) * k
        if (i) g.lineTo(cx(px), cy(py))
        else g.moveTo(cx(px), cy(py))
      })
      g.closePath()
      g.stroke()
    }
    inset(0.972, '#1a1009', 0.0014)
    inset(0.964, '#f0e6cf', 0.0008)
    inset(0.958, '#1a1009', 0.0012)

    // darker lacquer pooling in front of the bridge
    const bg = g.createLinearGradient(0, cy(0.032), 0, cy(-0.026))
    bg.addColorStop(0, 'rgba(25,10,2,0)')
    bg.addColorStop(0.55, 'rgba(25,10,2,0.30)')
    bg.addColorStop(1, 'rgba(25,10,2,0.05)')
    g.fillStyle = bg
    g.fillRect(cx(-0.045), cy(0.032), 0.09 * sx, 0.058 * sy)

    // top-plate vignette towards the corners so it never reads as a flat sheet
    const vg = g.createRadialGradient(cx(0), cy(0.045), 0.03 * sx, cx(0), cy(0.045), 0.16 * sx)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(20,8,0,0.22)')
    g.fillStyle = vg
    g.fillRect(0, 0, w, h)
  })
}

// ---- rosewood / ebony fretboard ----------------------------------------------------------------
export function fretboardTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 1203, (g, w, h) => {
    const img = g.createImageData(w, h)
    const d = img.data
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const X = (px / w) * 50
        const Y = (py / h) * 235
        const streak = fbm(X * 0.9, Y * 0.045, 31, 4)
        const stripe = 0.5 + 0.5 * Math.sin(X * 3.1 + fbm(X * 0.15, Y * 0.02, 4, 3) * 14)
        const pores = vnoise(X * 5.5, Y * 1.3, 8)
        let lum = 0.6 + 0.55 * (streak - 0.5) + 0.22 * (stripe - 0.5) - (pores > 0.84 ? 0.2 : 0)
        lum = Math.max(0.15, lum)
        const o4 = (py * w + px) * 4
        d[o4] = 66 * lum
        d[o4 + 1] = 38 * lum
        d[o4 + 2] = 26 * lum
        d[o4 + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
  })
}

export function mahoganyTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 512, (g, w, h) => {
    const img = g.createImageData(w, h)
    const d = img.data
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const s = fbm(px * 0.05, py * 0.004, 5, 4)
        const t = 0.5 + 0.5 * Math.sin(px * 0.5 + s * 12)
        const lum = 0.55 + 0.5 * (s - 0.5) + 0.2 * (t - 0.5)
        const o4 = (py * w + px) * 4
        d[o4] = 118 * lum
        d[o4 + 1] = 58 * lum
        d[o4 + 2] = 34 * lum
        d[o4 + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
  })
}

// ---- rosette -----------------------------------------------------------------------------------
// A polar strip: u = angle, v = radius across the ring (inner edge at the bottom). Drawn at high
// resolution and wrapped onto a ring mesh around the soundhole so the mosaic stays crisp.
export function rosetteTexture(): THREE.CanvasTexture {
  return canvasTexture(
    4096,
    256,
    (g, w, h) => {
      const rr = rng(91)
      const band = (v0: number, v1: number, col: string) => {
        g.fillStyle = col
        g.fillRect(0, h * (1 - v1), w, h * (v1 - v0))
      }
      band(0, 1, '#241711')
      band(0.0, 0.22, '#130b06')
      band(0.22, 0.34, '#f0e4c8')
      band(0.34, 0.8, '#2a1b12')
      band(0.8, 0.9, '#f0e4c8')
      band(0.9, 1.0, '#130b06')
      // shell mosaic between the white lines: little rectangles in muted sea-shell tones
      const y0 = h * (1 - 0.8)
      const y1 = h * (1 - 0.34)
      const hues = [24, 190, 205, 34, 12, 165]
      for (let i = 0; i < 2400; i++) {
        const x = rr() * w
        const y = y0 + rr() * (y1 - y0)
        const hue = hues[Math.floor(rr() * hues.length)]
        g.fillStyle = `hsla(${hue},${22 + rr() * 26}%,${36 + rr() * 30}%,${0.55 + rr() * 0.4})`
        const ww = 6 + rr() * 12
        const hh = 6 + rr() * 9
        g.fillRect(x, y, ww, hh)
        if (x + ww > w) g.fillRect(x - w, y, ww, hh)
      }
      // fine pinstripes
      g.fillStyle = 'rgba(255,240,210,0.35)'
      g.fillRect(0, h * (1 - 0.34) - 2, w, 2)
      g.fillRect(0, h * (1 - 0.8), w, 2)
    },
    { repeat: true },
  )
}

// ---- sprites -----------------------------------------------------------------------------------
export function softSprite(stops: ReadonlyArray<readonly [number, string]>, size = 128): THREE.CanvasTexture {
  return canvasTexture(size, size, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    stops.forEach((s) => gr.addColorStop(s[0], s[1]))
    g.fillStyle = gr
    g.fillRect(0, 0, w, w)
  })
}

/**
 * A glowing eighth note drawn with paths (no font dependency). `neutral` draws it in white so a sprite
 * colour can tint it.
 */
export function noteGlyph(beamed: boolean, neutral = false): THREE.CanvasTexture {
  return canvasTexture(128, 128, (g, w) => {
    const glow = g.createRadialGradient(64, 64, 6, 64, 64, 62)
    glow.addColorStop(0, neutral ? 'rgba(255,255,255,0.3)' : 'rgba(255,214,150,0.35)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = glow
    g.fillRect(0, 0, w, w)
    const ink = neutral ? '#ffffff' : '#fff2d8'
    g.fillStyle = ink
    g.strokeStyle = ink
    g.shadowColor = neutral ? 'rgba(255,255,255,0.9)' : 'rgba(255,190,110,0.9)'
    g.shadowBlur = 8
    const head = (x: number, y: number) => {
      g.save()
      g.translate(x, y)
      g.rotate(-0.4)
      g.beginPath()
      g.ellipse(0, 0, 11, 8, 0, 0, 7)
      g.fill()
      g.restore()
    }
    g.lineWidth = 5
    g.lineCap = 'round'
    if (beamed) {
      head(40, 90)
      head(84, 82)
      g.beginPath()
      g.moveTo(50, 88)
      g.lineTo(50, 34)
      g.lineTo(94, 26)
      g.lineTo(94, 80)
      g.stroke()
      g.lineWidth = 8
      g.beginPath()
      g.moveTo(50, 36)
      g.lineTo(94, 28)
      g.stroke()
    } else {
      head(48, 92)
      g.beginPath()
      g.moveTo(58, 90)
      g.lineTo(58, 28)
      g.quadraticCurveTo(70, 44, 88, 52)
      g.stroke()
    }
  })
}

// ---- studio environment --------------------------------------------------------------------------
// A small dark room with a big softbox, a rim strip and a dim bounce, baked to a PMREM so the lacquer,
// frets and strings have something to reflect.
export type EnvSpec = { key: readonly [number, number]; rim: readonly [number, number]; top: readonly [number, number]; bounce: readonly [number, number]; bg: number }

export function makeEnvironment(renderer: THREE.WebGLRenderer, e: EnvSpec): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(e.bg)
  const box = (w: number, h: number, color: number, intensity: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false }),
    )
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    scene.add(m)
  }
  box(5.2, 3.4, e.key[0], e.key[1], [-3.6, 3.4, 1.4]) // key softbox, upper left
  box(1.2, 4.6, e.rim[0], e.rim[1], [3.2, 1.6, -3.8]) // rim strip, right behind
  box(4.0, 4.0, e.top[0], e.top[1], [0.0, 4.6, -1.0]) // dim overhead
  box(6.0, 2.0, e.bounce[0], e.bounce[1], [0, -2.2, 2.0]) // bounce from the floor
  const pm = new THREE.PMREMGenerator(renderer)
  const rt = pm.fromScene(scene, 0.04)
  pm.dispose()
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    mesh.geometry?.dispose()
    ;(mesh.material as THREE.Material | undefined)?.dispose()
  })
  return rt
}
