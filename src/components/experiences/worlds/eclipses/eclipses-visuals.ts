import * as THREE from 'three'

/*
 * 食 · 三维舞台的视觉层（纯渲染表现，不含玩法逻辑）
 *
 * 舞台上的主角是**影锥**，不是天体：月球那根 58 个地球半径长的黑针，
 * 和地球那根更长更粗的黑针。所以这里的工具都围绕「把影子画得可读」：
 * 渐隐的影锥、母线虚线、黄道参考面、地面影斑。
 *
 * 太阳必须看得见，否则影子无从理解——但它真实在 2.3 万个地球半径外。
 * 折中：太阳画在 −X 轴 88 个地球半径处（距离压缩约 267 倍），半径按
 * 「地球本影锥反向延长恰好与之相切」取约 1.4 个地球半径，光线方向与
 * 影锥角度保持真实；界面里明确披露这是示意距离。
 * 「站在影子里看见什么」交给 eclipses-sky.ts 的天空之窗。
 *
 * 所有程序纹理用确定性随机，保证每次渲染一致。
 */

function seededRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCanvas(width: number, height = width) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d')! }
}

function toTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/* ---------------------------------------------------------------- */
/* 影锥                                                             */
/* ---------------------------------------------------------------- */

/**
 * 沿长度方向渐隐的圆锥（本影 / 半影），顶点色携带 alpha。
 * 局部坐标：底面在 y=−len/2（天体那一端），锥尖在 y=+len/2。
 *
 * `tipFloor` 是锥尖那端保留的最低不透明度。影子本来是均匀的，
 * 完全渐隐只是为了不在暗场里拍一根死黑的棒子；但月球本影的**锥尖**
 * 正是戏眼所在（它点在地球上），那一端不能淡到看不见。
 */
export function createFadeCone(
  rBase: number,
  rTip: number,
  len: number,
  hex: string,
  alpha: number,
  fade = 1.4,
  tipFloor = 0,
) {
  const geo = new THREE.CylinderGeometry(rTip, rBase, len, 56, 1, true)
  const color = new THREE.Color(hex)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 4)
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + len / 2) / len // 0 = 天体表面，1 = 锥尖
    colors[i * 4] = color.r
    colors[i * 4 + 1] = color.g
    colors[i * 4 + 2] = color.b
    colors[i * 4 + 3] = alpha * (tipFloor + (1 - tipFloor) * Math.pow(1 - t, fade))
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4))
  return geo
}

/** 影锥材质：不写深度，靠天体的不透明遮挡来正确藏住背面 */
export function createConeMaterial() {
  return new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

/**
 * 影锥母线：本影 / 半影各四条，黄道面两条、垂直面两条。
 */
export function createConeEdges(radius: number, len: number, rTip = 0) {
  const points: Array<number> = []
  for (const sign of [1, -1]) {
    for (const axis of [0, 1]) {
      const bx = axis === 0 ? sign * radius : 0
      const bz = axis === 0 ? 0 : sign * radius
      const tx = axis === 0 ? sign * rTip : 0
      const tz = axis === 0 ? 0 : sign * rTip
      points.push(bx, -len / 2, bz, tx, len / 2, tz)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
  return geo
}

/* ---------------------------------------------------------------- */
/* 参考几何：黄道面 · 轨道 · 阳光                                       */
/* ---------------------------------------------------------------- */

/**
 * 黄道参考面：同心圆 + 一条日地连线。
 * 没有参考面，5.1° 的轨道倾角在暗场里根本看不出来。
 */
export function createEclipticGrid(radii: Array<number>, segments = 128) {
  const points: Array<number> = []
  for (const r of radii) {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2
      const a1 = ((i + 1) / segments) * Math.PI * 2
      points.push(Math.cos(a0) * r, 0, Math.sin(a0) * r)
      points.push(Math.cos(a1) * r, 0, Math.sin(a1) * r)
    }
  }
  const span = Math.max(...radii)
  points.push(-span, 0, 0, span, 0, 0) // 日地连线
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
  return geo
}

/** 一条空的轨道线，逐帧写入位置（倾角与交点会变） */
export function createOrbitLine(segments: number, color: string, opacity: number) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segments + 1) * 3), 3))
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
  return new THREE.Line(geo, mat)
}

const WEDGE_ARC = 16

/** 黄道与白道之间那 5.1°：两条辐线 + 一段弧。位置每帧写入。 */
export function createInclinationWedge() {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((4 + WEDGE_ARC * 2) * 3), 3))
  const mat = new THREE.LineBasicMaterial({
    color: '#ffd58a',
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  })
  const line = new THREE.LineSegments(geo, mat)
  line.frustumCulled = false
  line.visible = false
  return line
}

const _ecl = new THREE.Vector3()
const _orb = new THREE.Vector3()
const _a0 = new THREE.Vector3()
const _a1 = new THREE.Vector3()

export function writeInclinationWedge(line: THREE.LineSegments, moonPos: THREE.Vector3) {
  const attr = line.geometry.attributes.position as THREE.BufferAttribute
  const r = moonPos.length()
  _ecl.copy(moonPos)
  _ecl.y = 0
  if (_ecl.lengthSq() < 1e-8) _ecl.set(-1, 0, 0)
  _ecl.setLength(r)
  _orb.copy(moonPos).setLength(r)
  let i = 0
  attr.setXYZ(i++, 0, 0, 0)
  attr.setXYZ(i++, _ecl.x, _ecl.y, _ecl.z)
  attr.setXYZ(i++, 0, 0, 0)
  attr.setXYZ(i++, _orb.x, _orb.y, _orb.z)
  for (let k = 0; k < WEDGE_ARC; k++) {
    const t0 = k / WEDGE_ARC
    const t1 = (k + 1) / WEDGE_ARC
    _a0.copy(_ecl).lerp(_orb, t0).setLength(r)
    _a1.copy(_ecl).lerp(_orb, t1).setLength(r)
    attr.setXYZ(i++, _a0.x, _a0.y, _a0.z)
    attr.setXYZ(i++, _a1.x, _a1.y, _a1.z)
  }
  attr.needsUpdate = true
}

/* ---------------------------------------------------------------- */
/* 程序纹理                                                          */
/* ---------------------------------------------------------------- */

/** 月面：噪点 + 月海 + 环形山（朝光亮缘、背光暗缘） */
export function createMoonTexture() {
  const size = 512
  const { canvas, ctx } = makeCanvas(size)
  const rng = seededRng(19940207)
  ctx.fillStyle = '#b3b1ac'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 5200; i++) {
    const v = 150 + Math.floor(rng() * 60)
    ctx.fillStyle = `rgba(${v},${v},${v - 4},${0.05 + rng() * 0.08})`
    ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 2, 1 + rng() * 2)
  }
  for (let i = 0; i < 9; i++) {
    const x = size * (0.2 + rng() * 0.6)
    const y = size * (0.2 + rng() * 0.6)
    const r = size * (0.08 + rng() * 0.16)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(110,108,104,0.55)')
    g.addColorStop(1, 'rgba(110,108,104,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 150; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = 2 + rng() * (rng() > 0.92 ? 16 : 7)
    ctx.fillStyle = `rgba(72,70,66,${0.22 + rng() * 0.28})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = `rgba(232,230,224,${0.25 + rng() * 0.35})`
    ctx.lineWidth = Math.max(1, r * 0.22)
    ctx.beginPath()
    ctx.arc(x, y, r * 0.92, Math.PI * 0.75, Math.PI * 1.75)
    ctx.stroke()
    ctx.strokeStyle = `rgba(50,48,46,${0.3 + rng() * 0.3})`
    ctx.beginPath()
    ctx.arc(x, y, r * 0.96, Math.PI * -0.25, Math.PI * 0.75)
    ctx.stroke()
  }
  return toTexture(canvas)
}

/** 地面影斑：中心实、边缘化开的软圆 */
export function createSpotTexture(coreAlpha: number, softness: number) {
  const size = 128
  const { canvas, ctx } = makeCanvas(size)
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, `rgba(2,3,8,${coreAlpha})`)
  g.addColorStop(softness, `rgba(2,3,8,${coreAlpha * 0.55})`)
  g.addColorStop(1, 'rgba(2,3,8,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

/** 远处阳光的方向性辉光：大而软、没有清晰边缘，避免被读成「太阳就在那儿」 */
export function createSunWashTexture() {
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,238,206,0.20)')
  g.addColorStop(0.25, 'rgba(255,220,164,0.11)')
  g.addColorStop(0.6, 'rgba(255,196,124,0.035)')
  g.addColorStop(1, 'rgba(255,180,110,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

/** 日面：热白核 + 米粒组织 + 临边昏暗 —— 画面里那颗真的在发光的太阳 */
export function createSunSurfaceTexture() {
  const size = 512
  const { canvas, ctx } = makeCanvas(size)
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, '#fffdf4')
  g.addColorStop(0.45, '#ffedbe')
  g.addColorStop(0.78, '#ffcf7e')
  g.addColorStop(0.94, '#ff9e4e')
  g.addColorStop(1, '#f97f2e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  // 米粒组织：确定性噪点，只在圆盘内
  const rng = seededRng(0x5eED50)
  for (let i = 0; i < 4200; i++) {
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(rng()) * c * 0.96
    const x = c + Math.cos(a) * d
    const y = c + Math.sin(a) * d
    const limb = d / c
    ctx.fillStyle = `rgba(196,110,32,${(0.05 + rng() * 0.1) * (0.35 + limb)})`
    ctx.beginPath()
    ctx.arc(x, y, 1 + rng() * 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  return toTexture(canvas)
}

/** 太阳外层辉光：小而亮的核 + 暖黄中晕 + 长橙拖尾 */
export function createSunGlowTexture() {
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,252,238,0.95)')
  g.addColorStop(0.12, 'rgba(255,238,190,0.55)')
  g.addColorStop(0.32, 'rgba(255,206,120,0.2)')
  g.addColorStop(0.62, 'rgba(255,164,80,0.06)')
  g.addColorStop(1, 'rgba(255,140,60,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

/**
 * 阳光柱的几何模板：单位细圆柱（半径 1、长 1、沿 Y），顶点色携带 alpha，
 * 亮端在 y=+0.5 —— 用四元数把 +Y 转到 −X 后，亮端正好朝向太阳。
 * 真实的阳光几近平行（张角 0.27°），所以画成平行柱是诚实的；
 * 它同时回答了原来最致命的问题：光从哪来、往哪去。
 */
export function createRayGeometry() {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 5, 24, true)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 4)
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) + 0.5 // 0 = 远离太阳的一端，1 = 靠太阳的一端
    const a = Math.pow(t, 1.7) * 0.5
    colors[i * 4] = 1
    colors[i * 4 + 1] = 0.9
    colors[i * 4 + 2] = 0.72
    colors[i * 4 + 3] = a
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4))
  return geo
}

/** 阳光柱材质：加法混色、不写深度，整体 opacity 由舞台呼吸控制 */
export function createRayMaterial() {
  return new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

/** 深空背景：暗蓝紫渐变 + 银河带 + 微弱星云（消除大片死黑，保持暗场通透） */
export function createBackdropTexture() {
  const w = 1024
  const h = 512
  const { canvas, ctx } = makeCanvas(w, h)
  const rng = seededRng(20260718)
  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#05060f')
  base.addColorStop(0.5, '#080a18')
  base.addColorStop(1, '#04050c')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 260; i++) {
    const x = rng() * w
    const bandY = h * 0.5 + Math.sin((x / w) * Math.PI * 2 + 0.8) * h * 0.09
    const y = bandY + (rng() - 0.5) * h * 0.16
    const r = 12 + rng() * 46
    const a = 0.016 + rng() * 0.035
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(126,140,196,${a})`)
    g.addColorStop(1, 'rgba(126,140,196,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (x < r) { ctx.beginPath(); ctx.arc(x + w, y, r, 0, Math.PI * 2); ctx.fill() }
    if (x > w - r) { ctx.beginPath(); ctx.arc(x - w, y, r, 0, Math.PI * 2); ctx.fill() }
  }
  for (let i = 0; i < 26; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = 30 + rng() * 90
    const a = 0.012 + rng() * 0.02
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(96,74,148,${a})`)
    g.addColorStop(1, 'rgba(96,74,148,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (x < r) { ctx.beginPath(); ctx.arc(x + w, y, r, 0, Math.PI * 2); ctx.fill() }
    if (x > w - r) { ctx.beginPath(); ctx.arc(x - w, y, r, 0, Math.PI * 2); ctx.fill() }
  }
  const texture = toTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  return texture
}

/** 星空点云：画在背景球内侧，避免贴图像素被放大成方块 */
export function createStarGeometry(count = 4200, radius = 250) {
  const rng = seededRng(20260813)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = rng() * 2 - 1
    const a = rng() * Math.PI * 2
    const r = radius * (0.86 + rng() * 0.14)
    const s = Math.sqrt(1 - u * u)
    positions[i * 3] = r * s * Math.cos(a)
    positions[i * 3 + 1] = r * u
    positions[i * 3 + 2] = r * s * Math.sin(a)
    const warm = rng()
    const bright = 0.42 + rng() * rng() * 0.58
    colors[i * 3] = bright * (0.82 + 0.18 * warm)
    colors[i * 3 + 1] = bright * (0.86 + 0.1 * warm)
    colors[i * 3 + 2] = bright * (1 - 0.14 * warm)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export function createStarSprite() {
  const { canvas, ctx } = makeCanvas(32)
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  const tex = toTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** 地球临边大气辉光：只在日照侧亮，避免全周蓝圈 */
export function createAtmosphereMaterial(sunDir: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#5fb4ff') },
      uStrength: { value: 0.6 },
      uSunDir: { value: sunDir.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vNW;
      void main() {
        vN = normalize(normalMatrix * normal);
        vNW = normalize(mat3(modelMatrix) * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength; uniform vec3 uSunDir;
      varying vec3 vN; varying vec3 vV; varying vec3 vNW;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.2);
        float day = clamp(dot(normalize(vNW), uSunDir) * 0.6 + 0.5, 0.05, 1.0);
        gl_FragColor = vec4(uColor, f * uStrength * day);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  })
}

function dummyEarthTexture(r: number, g: number, b: number) {
  const data = new Uint8Array([r, g, b, 255])
  const tex = new THREE.DataTexture(data, 1, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

type EarthEclipseUniforms = {
  uDayMap: { value: THREE.Texture }
  uNightMap: { value: THREE.Texture }
  uSunDir: { value: THREE.Vector3 }
  uMoonPos: { value: THREE.Vector3 }
  uShadowAxis: { value: THREE.Vector3 }
  uUmbraR: { value: number }
  uPenumbraR: { value: number }
  uShadowOn: { value: number }
  uAnnular: { value: number }
  uMoonR: { value: number }
  uUmbraSlope: { value: number }
  uPenumbraSlope: { value: number }
}

export type EarthEclipseMaterial = THREE.ShaderMaterial & { uniforms: EarthEclipseUniforms }

/** 地球：白昼贴图 + 半影偏食带 / 本影全食带 / 伪本影环食带，本影里透出城市灯光 */
export function createEarthEclipseMaterial(): EarthEclipseMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDayMap: { value: dummyEarthTexture(47, 79, 117) },
      uNightMap: { value: dummyEarthTexture(0, 0, 0) },
      uSunDir: { value: new THREE.Vector3(-1, 0, 0) },
      uMoonPos: { value: new THREE.Vector3() },
      uShadowAxis: { value: new THREE.Vector3(1, 0, 0) },
      uUmbraR: { value: 0 },
      uPenumbraR: { value: 0 },
      uShadowOn: { value: 0 },
      uAnnular: { value: 0 },
      uMoonR: { value: 0.2727 },
      uUmbraSlope: { value: (696_000 - 1737.4) / 149_597_870.7 },
      uPenumbraSlope: { value: (696_000 + 1737.4) / 149_597_870.7 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDayMap;
      uniform sampler2D uNightMap;
      uniform vec3 uSunDir;
      uniform vec3 uMoonPos;
      uniform vec3 uShadowAxis;
      uniform float uUmbraR;
      uniform float uPenumbraR;
      uniform float uShadowOn;
      uniform float uAnnular;
      uniform float uMoonR;
      uniform float uUmbraSlope;
      uniform float uPenumbraSlope;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 sunDir = normalize(uSunDir);
        float ndl = dot(n, sunDir);
        vec3 dayTex = texture2D(uDayMap, vUv).rgb;
        vec3 nightTex = texture2D(uNightMap, vUv).rgb;
        vec3 col = dayTex * (vec3(1.10, 1.02, 0.93) * max(ndl, 0.0) * 1.32 + vec3(0.018, 0.034, 0.07));
        float nightF = smoothstep(0.06, -0.14, ndl);
        col += nightTex * vec3(1.30, 0.98, 0.55) * 1.2 * nightF;

        if (uShadowOn > 0.5 && uPenumbraR > 0.0001) {
          vec3 axis = normalize(uShadowAxis);
          vec3 rel = vWorldPos - uMoonPos;
          float along = max(dot(rel, axis), 0.001);
          float axisDist = length(rel - axis * along);
          float dayside = smoothstep(-0.04, 0.22, ndl);
          // 沿轴走得越远本影越细，锥尖没入地球时近侧全食、远侧环食。
          float localU = uMoonR - along * uUmbraSlope;
          float localP = max(uMoonR + along * uPenumbraSlope, uPenumbraR);
          float uR = localU > 0.0005 ? max(localU * 2.2, 0.012) : 0.0;
          float pR = max(localP, uR + 0.04);
          float penumbra = (1.0 - smoothstep(uR * 1.05, pR, axisDist)) * dayside;
          float umbra = uR > 0.001 ? (1.0 - smoothstep(uR * 0.28, uR * 1.02, axisDist)) * dayside : 0.0;
          float goldRim = uR > 0.001 ? (1.0 - smoothstep(uR * 0.88, uR * 1.22, abs(axisDist - uR))) * dayside : 0.0;
          float antumbra = localU < 0.0005
            ? (1.0 - smoothstep(0.0, max(0.012, -localU * 2.4), axisDist)) * dayside
            : 0.0;

          col = mix(col, col * vec3(0.78, 0.36, 0.52), penumbra * 0.72);
          col *= 1.0 - umbra * 0.9;
          col += nightTex * vec3(1.62, 1.18, 0.58) * umbra * 3.4;
          col += vec3(1.0, 0.72, 0.28) * goldRim * 0.62;
          col = mix(col, col * vec3(1.18, 0.68, 0.28), antumbra * 0.78);
        }

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float rim = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 2.4);
        float dayF = smoothstep(-0.08, 0.28, ndl);
        col += rim * vec3(0.10, 0.28, 0.55) * (0.22 + 0.78 * dayF);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }) as EarthEclipseMaterial
}
