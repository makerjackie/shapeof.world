import { CanvasTexture, Path, RepeatWrapping, Shape, SRGBColorSpace } from 'three'

/** Small procedural textures drawn in code. Nothing is downloaded; nothing depicts a real product. */
function canvas(width: number, height = width) {
  const element = document.createElement('canvas')
  element.width = width; element.height = height
  return [element, element.getContext('2d')!] as const
}
function texture(element: HTMLCanvasElement, color = true) {
  const map = new CanvasTexture(element)
  if (color) map.colorSpace = SRGBColorSpace
  map.anisotropy = 4
  return map
}
function random(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
}

export function roundedRect<T extends Path = Shape>(width: number, height: number, radius: number, target?: T): T {
  const path = target ?? (new Shape() as unknown as T)
  const x = -width / 2, y = -height / 2, r = Math.min(radius, width / 2, height / 2)
  path.moveTo(x + r, y)
  path.lineTo(x + width - r, y); path.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false)
  path.lineTo(x + width, y + height - r); path.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false)
  path.lineTo(x + r, y + height); path.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(x, y + r); path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return path
}

/** A pool of light under each specimen: transparent at the rim, so the canvas never shows a box. */
export function floorTexture() {
  const [element, g] = canvas(512)
  const glow = g.createRadialGradient(256, 256, 0, 256, 256, 256)
  glow.addColorStop(0, 'rgba(22,30,38,0.9)'); glow.addColorStop(.4, 'rgba(16,22,29,0.6)'); glow.addColorStop(.75, 'rgba(12,17,23,0.18)'); glow.addColorStop(1, 'rgba(12,17,23,0)')
  g.fillStyle = glow; g.fillRect(0, 0, 512, 512)
  g.globalCompositeOperation = 'source-atop'
  g.strokeStyle = 'rgba(150,178,196,0.055)'; g.lineWidth = 1
  for (let i = 16; i < 512; i += 32) { g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 512); g.moveTo(0, i + .5); g.lineTo(512, i + .5); g.stroke() }
  return texture(element)
}

/** Blurred contact shadow for a rounded footprint. */
export function shadowTexture(aspect = 1) {
  const width = 256, height = Math.round(256 * aspect)
  const [element, g] = canvas(width, height)
  g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 26; g.shadowOffsetX = 4000
  g.fillStyle = '#000'
  g.beginPath(); g.roundRect(44 - 4000, 44, width - 88, height - 88, 22); g.fill()
  return texture(element)
}

/** Dark solder mask with copper traces, pads and vias for the phone board and package substrate. */
export function boardTexture(seed = 7, size = 1024) {
  const [element, g] = canvas(size)
  const rand = random(seed)
  g.fillStyle = '#0d2622'; g.fillRect(0, 0, size, size)
  const unit = size / 64
  g.lineCap = 'round'; g.lineJoin = 'round'
  for (let i = 0; i < 150; i++) {
    let x = Math.floor(rand() * 64) * unit, y = Math.floor(rand() * 64) * unit
    g.strokeStyle = rand() < .7 ? 'rgba(52,104,90,0.9)' : 'rgba(150,118,64,0.55)'
    g.lineWidth = rand() < .8 ? unit * .28 : unit * .6
    g.beginPath(); g.moveTo(x, y)
    for (let k = 0; k < 4; k++) {
      const d = Math.floor(rand() * 8), length = (2 + Math.floor(rand() * 9)) * unit
      const dx = [1, 1, 0, -1, -1, -1, 0, 1][d], dy = [0, 1, 1, 1, 0, -1, -1, -1][d]
      x += dx * length; y += dy * length; g.lineTo(x, y)
    }
    g.stroke()
    g.fillStyle = '#b89452'; g.beginPath(); g.arc(x, y, unit * .45, 0, Math.PI * 2); g.fill()
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = rand() < .5 ? '#0a1a17' : '#3b6157'; g.beginPath(); g.arc(rand() * size, rand() * size, unit * .22, 0, Math.PI * 2); g.fill() }
  g.fillStyle = 'rgba(199,163,96,0.9)'
  for (let i = 0; i < 40; i++) { const x = rand() * size, y = rand() * size; g.fillRect(x, y, unit * .9, unit * .5) }
  return texture(element)
}

/** An abstract, unbranded lock screen: a dim gradient so the glass reads as a display. */
export function screenTexture() {
  const [element, g] = canvas(256, 576)
  const base = g.createLinearGradient(0, 0, 0, 576)
  base.addColorStop(0, '#05080c'); base.addColorStop(.55, '#08131b'); base.addColorStop(1, '#0d2a2f')
  g.fillStyle = base; g.fillRect(0, 0, 256, 576)
  const aurora = g.createRadialGradient(170, 470, 10, 170, 470, 300)
  aurora.addColorStop(0, 'rgba(70,190,176,0.55)'); aurora.addColorStop(.5, 'rgba(46,92,140,0.22)'); aurora.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = aurora; g.fillRect(0, 0, 256, 576)
  g.fillStyle = 'rgba(232,240,240,0.55)'; g.beginPath(); g.roundRect(98, 548, 60, 5, 3); g.fill()
  g.fillStyle = 'rgba(232,240,240,0.42)'
  g.fillRect(24, 16, 26, 6); g.fillRect(200, 16, 32, 6)
  return texture(element)
}

/** The back of the display module: graphite sheet, copper shielding foil, blank stickers. */
export function displayBackTexture() {
  const [element, g] = canvas(256, 564)
  const base = g.createLinearGradient(0, 0, 256, 564)
  base.addColorStop(0, '#202429'); base.addColorStop(1, '#16191d')
  g.fillStyle = base; g.fillRect(0, 0, 256, 564)
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; g.strokeRect(10, 10, 236, 544)
  const copper = g.createLinearGradient(40, 120, 220, 420)
  copper.addColorStop(0, '#8d5f3b'); copper.addColorStop(.5, '#a8744a'); copper.addColorStop(1, '#7a5134')
  g.fillStyle = copper; g.fillRect(46, 150, 164, 250)
  const rand = random(5)
  g.strokeStyle = 'rgba(40,22,10,0.16)'; g.lineWidth = 1
  for (let i = 0; i < 7; i++) { const y = 160 + rand() * 230; g.beginPath(); g.moveTo(48, y); g.bezierCurveTo(100, y + rand() * 16 - 8, 150, y + rand() * 16 - 8, 208, y + rand() * 10 - 5); g.stroke() }
  g.fillStyle = 'rgba(208,212,214,0.55)'; g.fillRect(62, 430, 70, 34); g.fillRect(150, 440, 40, 18)
  g.fillStyle = '#0c0e10'; g.fillRect(30, 480, 196, 54)
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(40, 492, 70, 6); g.fillRect(40, 506, 50, 6)
  return texture(element)
}

/** An unmarked battery pouch: a foil wrap with a blank label and a strip of tape. */
export function batteryTexture() {
  const [element, g] = canvas(256, 266)
  const base = g.createLinearGradient(0, 0, 256, 266)
  base.addColorStop(0, '#22282f'); base.addColorStop(.6, '#1a1f25'); base.addColorStop(1, '#20262d')
  g.fillStyle = base; g.fillRect(0, 0, 256, 266)
  g.fillStyle = '#272e36'; g.beginPath(); g.roundRect(22, 22, 212, 196, 10); g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2; g.stroke()
  g.fillStyle = 'rgba(214,220,226,0.22)'
  g.fillRect(40, 44, 92, 8); g.fillRect(40, 60, 60, 6); g.fillRect(40, 190, 120, 5); g.fillRect(40, 200, 80, 5)
  g.strokeStyle = 'rgba(214,220,226,0.22)'; g.lineWidth = 3; g.beginPath(); g.arc(196, 76, 16, 0, Math.PI * 2); g.stroke()
  g.fillStyle = '#0f1215'; g.fillRect(0, 236, 256, 22)
  return texture(element)
}

/** The top of the bare die inside the package: the same four schematic regions as the next scale, faintly. */
export function dieTexture() {
  const [element, g] = canvas(256)
  g.fillStyle = '#161b2a'; g.fillRect(0, 0, 256, 256)
  const k = 25.6
  for (const [x, z, w, h, color] of [[-2.9, -2.2, 3.5, 4.3, '31,110,104'], [1.4, -2.2, 4.5, 4.3, '74,68,137'], [-2, 2.7, 5.3, 3.5, '41,80,122'], [2.8, 2.7, 3.2, 3.5, '122,62,108']] as const) {
    g.fillStyle = `rgba(${color},0.75)`; g.fillRect((x - w / 2 + 5) * k, (z - h / 2 + 5) * k, w * k, h * k)
  }
  g.strokeStyle = 'rgba(200,215,235,0.07)'; g.lineWidth = 1
  for (let i = 4; i < 256; i += 8) { g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 256); g.stroke() }
  g.fillStyle = 'rgba(210,216,222,0.8)'
  for (let i = 0; i < 10; i++) { g.fillRect(8 + i * 26.9, 2, 7, 4); g.fillRect(8 + i * 26.9, 250, 7, 4) }
  return texture(element)
}

/** Grey grain for aluminium: varies roughness and bump so flat wiring still glints. Tiles seamlessly. */
export function grainTexture() {
  const [element, g] = canvas(256)
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 256, 256)
  const rand = random(19)
  for (let i = 0; i < 700; i++) {
    const x = rand() * 256, y = rand() * 256, r = 3 + rand() * 9, v = Math.round(90 + rand() * 150)
    g.fillStyle = `rgb(${v},${v},${v})`
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill() }
  }
  const map = texture(element, false)
  map.wrapS = map.wrapT = RepeatWrapping
  return map
}
