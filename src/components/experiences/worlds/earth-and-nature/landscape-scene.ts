import * as THREE from 'three'

import { CELL_M, HARD_ROCK_FACTOR, RIVER_AREA_M2, type Landscape } from './landscape-model'

/** 场景里一个单位等于 1 公里。地块宽度 = 格子数 × 格子边长。 */
const KM = 1 / 1000
/** 垂直夸张：45 公里宽的地块上，2 公里的山要拉高才看得出起伏。 */
export const VERTICAL_EXAGGERATION = 2.6
const SLAB_DEPTH = 3.2
const RAIN_STREAKS = 1400

type Rgb = [number, number, number]

/** 顶点颜色按线性空间解释，所以把 sRGB 色值先换算过去。 */
function hex(value: string): Rgb {
  const colour = new THREE.Color(value)
  return [colour.r, colour.g, colour.b]
}

/** 海拔色阶（米）：海滩、低地草木、山林、裸岩、高山碎石、积雪。 */
const ELEVATION_RAMP: Array<[number, Rgb]> = [
  [0, hex('#c9b98c')],
  [3, hex('#6f9c4c')],
  [120, hex('#5a8c45')],
  [500, hex('#4e7d3f')],
  [1100, hex('#80724f')],
  [1700, hex('#9a958a')],
  [2100, hex('#eef2f4')],
]
const RIVER = hex('#4aa8e0')
const RIVER_GLOW = hex('#8be8ff')
const HARD_ROCK = hex('#9b8fb8')
const LOG_RIVER = Math.log10(RIVER_AREA_M2)
const LOG_TRUNK = Math.log10(4e8)
/** 河流功率 √A·S（米）达到这个值时河道画成全蓝；稳态山脉里约为 U/K = 400。 */
const STREAM_POWER_FULL = 120

function elevationColour(h: number, out: Rgb) {
  for (let k = 1; k < ELEVATION_RAMP.length; k += 1) {
    const [h1, c1] = ELEVATION_RAMP[k]
    if (h <= h1 || k === ELEVATION_RAMP.length - 1) {
      const [h0, c0] = ELEVATION_RAMP[k - 1]
      const t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)))
      out[0] = c0[0] + (c1[0] - c0[0]) * t
      out[1] = c0[1] + (c1[1] - c0[1]) * t
      out[2] = c0[2] + (c1[2] - c0[2]) * t
      return
    }
  }
}

/** 侧面的岩层：一张小画布做的条纹纹理，颜色由深到浅。 */
function strataTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    const bands = ['#5b4634', '#6d5640', '#4a3a2c', '#7a6249', '#5f4a37', '#3f3226', '#6a5341', '#4d3d2f']
    let y = 0
    let k = 0
    while (y < 128) {
      const height = 6 + ((k * 37) % 13)
      context.fillStyle = bands[k % bands.length]
      context.fillRect(0, y, 4, height)
      y += height
      k += 1
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export type SceneView = {
  /** 0–1：河网高亮程度（“看”这一拍把河点亮）。 */
  riverGlow: number
  /** 0–1：镜头往前推近的程度（“看”这一拍凑近看河网）。 */
  focus: number
  /** 降雨倍数，决定雨线的数量和速度。 */
  rain: number
  /** 底部卡片占掉的高度（CSS 像素），画面相应上移。 */
  bottomInset: number
  /** 顶部问题占掉的高度。 */
  topInset: number
  reducedMotion: boolean
}

export class LandscapeScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600)
  private terrain: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  private sides: THREE.Mesh
  private sea: THREE.Mesh
  private rain: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private rainDrops: Float32Array
  private raycaster = new THREE.Raycaster()
  private size: number
  private width: number
  private colourScratch: Rgb = [0, 0, 0]
  private viewport = { width: 1, height: 1 }
  private disposables: Array<{ dispose: () => void }> = []
  /** 卡片高度变化时镜头慢慢跟过去，而不是跳一下。 */
  private insets: { top: number; bottom: number } | null = null

  constructor(canvas: HTMLCanvasElement, size: number) {
    this.size = size
    this.width = (size - 1) * CELL_M * KM
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.95
    this.scene.background = new THREE.Color('#0b1218')
    this.scene.fog = new THREE.Fog('#0b1218', 120, 260)

    this.scene.add(new THREE.HemisphereLight('#d8ecff', '#3a3024', 1.5))
    const sun = new THREE.DirectionalLight('#fff1d6', 2.4)
    sun.position.set(-34, 42, 14)
    this.scene.add(sun)

    // 地表：自己建索引网格，格点 (x, y) 对应场景的 (x, z)。
    const count = size * size
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colours = new Float32Array(count * 3)
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = y * size + x
        positions[i * 3] = (x / (size - 1) - 0.5) * this.width
        positions[i * 3 + 2] = (y / (size - 1) - 0.5) * this.width
      }
    }
    const index: Array<number> = []
    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const a = y * size + x
        index.push(a, a + size, a + 1, a + 1, a + size, a + size + 1)
      }
    }
    geometry.setIndex(index)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })
    // 包围球固定成能装下最高的山，每帧就不用重算。
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), this.width)
    this.terrain = new THREE.Mesh(geometry, material)
    this.scene.add(this.terrain)

    // 地块下面的岩层：只画四个侧面，顶面被地表盖住。
    const texture = strataTexture()
    const sideMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })
    const slab = new THREE.BoxGeometry(this.width, SLAB_DEPTH, this.width)
    this.sides = new THREE.Mesh(slab, sideMaterial)
    this.sides.position.y = -SLAB_DEPTH / 2 - 0.01
    this.scene.add(this.sides)

    // 海：边界格点都是 0 米，海面略高一点，海岸线会随地形变化。
    const seaGeometry = new THREE.PlaneGeometry(this.width, this.width)
    seaGeometry.rotateX(-Math.PI / 2)
    const seaMaterial = new THREE.MeshStandardMaterial({ color: '#2a6f93', transparent: true, opacity: 0.78, roughness: 0.35 })
    this.sea = new THREE.Mesh(seaGeometry, seaMaterial)
    this.sea.position.y = 0.012
    this.scene.add(this.sea)

    // 雨：一根根短线，循环下落。
    this.rainDrops = new Float32Array(RAIN_STREAKS * 6)
    for (let k = 0; k < RAIN_STREAKS; k += 1) {
      const x = (Math.random() - 0.5) * this.width
      const z = (Math.random() - 0.5) * this.width
      const y = Math.random() * 22
      this.rainDrops.set([x, y, z, x - 0.12, y + 0.9, z], k * 6)
    }
    const rainGeometry = new THREE.BufferGeometry()
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainDrops, 3))
    this.rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#bcd6ea', transparent: true, opacity: 0.32 }))
    this.scene.add(this.rain)

    this.disposables.push(geometry, material, texture, sideMaterial, slab, seaGeometry, seaMaterial, rainGeometry, this.rain.material)
  }

  resize(width: number, height: number) {
    this.viewport = { width, height }
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
  }

  /** 让整块地落在问题和底部卡片之间：斜 45° 看过去，像桌上的一块沙盘。 */
  private frame(view: SceneView) {
    const { width, height } = this.viewport
    const want = { top: view.topInset, bottom: view.bottomInset }
    if (!this.insets) this.insets = want
    else {
      this.insets.top += (want.top - this.insets.top) * 0.08
      this.insets.bottom += (want.bottom - this.insets.bottom) * 0.08
    }
    const { top, bottom } = this.insets
    const usable = Math.max(120, height - bottom - top)
    const vertical = THREE.MathUtils.degToRad(this.camera.fov)
    const portrait = width / height < 0.8
    const elevation = THREE.MathUtils.degToRad(portrait ? 40 : 32)
    const azimuth = THREE.MathUtils.degToRad(38)
    // 转了角度以后，地块在屏幕上的宽度接近对角线；高度约为宽度的 sin(仰角) 加上山高。
    const screenWidth = this.width * 1.42 * (portrait ? 1.32 : 0.92)
    const screenHeight = this.width * 1.42 * Math.sin(elevation) * 0.82 + 4
    const tan = Math.tan(vertical / 2)
    const distance = Math.max(
      screenWidth / (2 * tan * (width / height)),
      (screenHeight / (2 * tan)) * (height / usable),
    ) * (1 - 0.2 * view.focus)
    this.camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance,
    )
    this.camera.lookAt(0, 0.8, 0)
    // 雾只用来让远处的海和背景接上，跟着镜头距离走，竖屏离得远也不会变暗。
    const fog = this.scene.fog as THREE.Fog
    fog.near = distance * 1.1
    fog.far = distance * 2.6
    // 把画面中心挪到可用区域中间。
    const shift = (bottom - top) / 2
    this.camera.setViewOffset(width, height, 0, shift, width, height)
    this.camera.updateProjectionMatrix()
  }

  render(landscape: Landscape, view: SceneView, frameSeconds: number) {
    const { size, height, area, rock, receiver } = landscape
    const position = this.terrain.geometry.getAttribute('position') as THREE.BufferAttribute
    const colour = this.terrain.geometry.getAttribute('color') as THREE.BufferAttribute
    const positions = position.array as Float32Array
    const colours = colour.array as Float32Array
    const out = this.colourScratch
    const glow = view.riverGlow
    const river: Rgb = [
      RIVER[0] + (RIVER_GLOW[0] - RIVER[0]) * glow,
      RIVER[1] + (RIVER_GLOW[1] - RIVER[1]) * glow,
      RIVER[2] + (RIVER_GLOW[2] - RIVER[2]) * glow,
    ]
    for (let i = 0; i < size * size; i += 1) {
      const h = height[i]
      positions[i * 3 + 1] = h * KM * VERTICAL_EXAGGERATION
      elevationColour(h, out)
      if (rock[i] < 1) {
        const t = 0.4 * (1 - rock[i]) / (1 - HARD_ROCK_FACTOR)
        out[0] += (HARD_ROCK[0] - out[0]) * t
        out[1] += (HARD_ROCK[1] - out[1]) * t
        out[2] += (HARD_ROCK[2] - out[2]) * t
      }
      // 河只画在“正在下切”的地方：河流功率 √A·S 越大越蓝。低地上水流得慢，颜色就淡。
      // “看”的时候河更宽、更亮：细一些的支流也画出来，树枝的形状才看得清。
      const logArea = Math.log10(area[i])
      const r = receiver[i]
      const logRiver = LOG_RIVER - 0.3 * glow
      if (logArea > logRiver && h > 0.5 && r !== i) {
        const run = (Math.abs((i % size) - (r % size)) + Math.abs(((i / size) | 0) - ((r / size) | 0))) === 2 ? CELL_M * Math.SQRT2 : CELL_M
        const power = Math.sqrt(area[i]) * Math.max(0, h - height[r]) / run
        const cutting = Math.min(1, (power / STREAM_POWER_FULL) * (1 + 1.2 * glow))
        const width = Math.min(1, (logArea - logRiver) / (LOG_TRUNK - logRiver))
        const mix = Math.min(1, cutting * (0.45 + 0.55 * width) * (1 + 0.5 * glow))
        out[0] += (river[0] - out[0]) * mix
        out[1] += (river[1] - out[1]) * mix
        out[2] += (river[2] - out[2]) * mix
      }
      colours[i * 3] = out[0]
      colours[i * 3 + 1] = out[1]
      colours[i * 3 + 2] = out[2]
    }
    position.needsUpdate = true
    colour.needsUpdate = true
    this.terrain.geometry.computeVertexNormals()

    // 雨：数量和速度跟着降雨倍数走。
    const visible = Math.round(RAIN_STREAKS * Math.min(1, 0.18 + view.rain * 0.32))
    this.rain.geometry.setDrawRange(0, visible * 2)
    this.rain.material.opacity = 0.18 + Math.min(0.3, view.rain * 0.1)
    if (!view.reducedMotion) {
      const fall = frameSeconds * (16 + view.rain * 4)
      for (let k = 0; k < visible; k += 1) {
        const o = k * 6
        let y = this.rainDrops[o + 1] - fall
        if (y < 0) y += 22
        this.rainDrops[o + 1] = y
        this.rainDrops[o + 4] = y + 0.9
      }
      ;(this.rain.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    }

    this.frame(view)
    this.renderer.render(this.scene, this.camera)
  }

  /** 屏幕坐标（相对画布）→ 格点坐标；没点到地块时返回 null。 */
  pick(x: number, y: number): { gx: number; gy: number } | null {
    const { width, height } = this.viewport
    const ndc = new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    const hit = this.raycaster.intersectObject(this.terrain, false)[0]
    let point = hit?.point
    if (!point) {
      // 点在地块外沿时，退回到海平面上取最近的格点，手指不会“打滑”。
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const target = new THREE.Vector3()
      if (!this.raycaster.ray.intersectPlane(plane, target)) return null
      const half = this.width / 2
      if (Math.abs(target.x) > half * 1.15 || Math.abs(target.z) > half * 1.15) return null
      point = target
    }
    const gx = (point.x / this.width + 0.5) * (this.size - 1)
    const gy = (point.z / this.width + 0.5) * (this.size - 1)
    return {
      gx: Math.max(1, Math.min(this.size - 2, gx)),
      gy: Math.max(1, Math.min(this.size - 2, gy)),
    }
  }

  /** 格点 → 屏幕坐标，用来放“按住这里”的提示。 */
  project(gx: number, gy: number, heightM: number): { x: number; y: number } {
    const point = new THREE.Vector3(
      (gx / (this.size - 1) - 0.5) * this.width,
      heightM * KM * VERTICAL_EXAGGERATION,
      (gy / (this.size - 1) - 0.5) * this.width,
    ).project(this.camera)
    return {
      x: ((point.x + 1) / 2) * this.viewport.width,
      y: ((1 - point.y) / 2) * this.viewport.height,
    }
  }

  dispose() {
    for (const item of this.disposables) item.dispose()
    this.renderer.dispose()
  }
}
