import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import { MIXED_FORMULAS, type FormulaSubject } from './equation-wormhole-data'
import { createLensingPass, lensRadius, lensSource } from './equation-wormhole-lensing'
import { buildBlackholeExtras } from './equation-wormhole-blackhole'
import {
  RAIN,
  RUSH,
  WORMHOLE,
  buildPortraitTiles,
  buildRainInstances,
  buildRushInstances,
  buildWormholeInstances,
  portraitFrame,
  rainFrame,
  rushFrame,
  wormholeFrame,
  type CameraPreset,
  type InstanceParams,
  type SceneId,
} from './equation-wormhole-model'
import { buildShapeInstances, isShape, shapeFrame, type LensView } from './equation-wormhole-shapes'
import { PORTRAITS } from './equation-wormhole-portraits'
import {
  createCanvasMeasurer,
  paintLayoutToCanvas,
  typeset,
  type Measurer,
} from './equation-wormhole-typeset'

const MAX_DPR = 2
const SCENE_IDS: SceneId[] = ['wormhole', 'rush', 'rain', 'portrait', 'blackhole', 'mobius']

/* ------------------------------------------------------------------ */
/* 图集                                                                */
/* ------------------------------------------------------------------ */

export type AtlasRect = { u0: number; v0: number; u1: number; v1: number; wEm: number; hEm: number }

export type FormulaAtlas = {
  texture: THREE.CanvasTexture
  rects: Array<AtlasRect>
  canvas: HTMLCanvasElement
}

export function buildFormulaAtlas(
  subject: FormulaSubject,
  anisotropy: number,
  measure?: Measurer,
): FormulaAtlas {
  const m = measure ?? createCanvasMeasurer()
  const W = 2048
  let fontPx = 92
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const pad = Math.round(fontPx * 0.22)
    const cells = subject.formulas.map((f) => {
      const layout = typeset(f.tex, m)
      return {
        layout,
        w: Math.ceil(layout.width * fontPx) + pad * 2,
        h: Math.ceil((layout.height + layout.depth) * fontPx) + pad * 2,
        pad,
      }
    })
    // 简单的书架式装箱：按高度降序
    const order = cells.map((c, i) => ({ c, i })).sort((a, b) => b.c.h - a.c.h)
    const rects: Array<AtlasRect & { x: number; y: number; w: number; h: number }> = []
    let x = 0
    let y = 0
    let rowH = 0
    let overflow = false
    for (const { c, i } of order) {
      if (x + c.w > W) {
        x = 0
        y += rowH
        rowH = 0
      }
      if (y + c.h > 4096) {
        overflow = true
        break
      }
      rects[i] = { x, y, w: c.w, h: c.h, u0: 0, v0: 0, u1: 0, v1: 0, wEm: c.w / fontPx, hEm: c.h / fontPx }
      x += c.w
      rowH = Math.max(rowH, c.h)
    }
    if (overflow) {
      fontPx -= 14
      continue
    }
    const H = Math.min(4096, Math.max(256, 2 ** Math.ceil(Math.log2(y + rowH))))
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    for (let i = 0; i < cells.length; i += 1) {
      const r = rects[i]
      const { layout } = cells[i]
      // 公式视觉中心对齐单元格中心
      const ox = r.x + (r.w - layout.width * fontPx) / 2
      const oy = r.y + (r.h - (layout.height + layout.depth) * fontPx) / 2 + layout.height * fontPx
      paintLayoutToCanvas(layout, ctx, ox, oy, fontPx, '#ffffff')
      rects[i] = { ...r, u0: r.x / W, v0: 1 - (r.y + r.h) / H, u1: (r.x + r.w) / W, v1: 1 - r.y / H }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = anisotropy
    texture.colorSpace = THREE.NoColorSpace
    return { texture, rects: rects.map(({ u0, v0, u1, v1, wEm, hEm }) => ({ u0, v0, u1, v1, wEm, hEm })), canvas }
  }
  throw new Error('formula atlas overflow')
}

/* ------------------------------------------------------------------ */
/* 小工具                                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* 公式实例着色器                                                      */
/* ------------------------------------------------------------------ */

const INSTANCE_COMMON_VS = /* glsl */ `
attribute vec4 aParam;   // 场景参数（见 model.ts）
attribute vec4 aUV;      // 图集 uv 矩形
attribute vec3 aDim;     // x: 宽 y: 高（em）z: 基础亮度
attribute float aHot;    // 高亮
uniform float uTime;
uniform float uFlight;
uniform float uSpin;
varying vec2 vUv;
varying vec4 vRect;
varying float vBright;
varying float vLayerOpacity;
varying float vViewZ;
varying float vHot;
varying vec3 vWorld;
varying float vGlow;
`

const WORMHOLE_VS = /* glsl */ `
${INSTANCE_COMMON_VS}
void main() {
  float throatZ = ${WORMHOLE.throatZ.toFixed(2)};
  float throatR = ${WORMHOLE.throatR.toFixed(2)};
  float flare = ${WORMHOLE.flare.toFixed(2)};
  float zMin = ${WORMHOLE.zMin.toFixed(2)};
  float zMax = ${WORMHOLE.zMax.toFixed(2)};
  float twist = ${WORMHOLE.twist.toFixed(3)};
  float span = zMax - zMin;
  float z = zMin + mod(aParam.y + uFlight - zMin, span);
  float u = (z - throatZ) / flare;
  float r = throatR * pow(1.0 + u * u, 0.72);
  float rp = throatR * 0.72 * pow(1.0 + u * u, -0.28) * 2.0 * u / flare;
  float theta = aParam.x + uSpin + z * twist;
  vGlow = 0.0;
  vec3 pos = vec3(cos(theta) * r, sin(theta) * r, z);
  // 螺旋车道切线：∂pos/∂z + twist·∂pos/∂θ
  vec3 dir = vec3(rp * cos(theta) - twist * r * sin(theta), rp * sin(theta) + twist * r * cos(theta), 1.0);
  vec3 bu = normalize(dir);
  vec3 t2 = normalize(vec3(rp * cos(theta), rp * sin(theta), 1.0));
  vec3 bv = normalize(t2 - bu * dot(t2, bu));
  float scale = aParam.w;
  vec3 world = pos + bu * (position.x * aDim.x * scale) + bv * (position.y * aDim.y * scale);
  vUv = mix(aUV.xy, aUV.zw, position.xy + 0.5);
  vRect = aUV;
  vBright = aDim.z * smoothstep(zMin, zMin + 9.0, z) * (1.0 - smoothstep(zMax - 9.0, zMax, z));
  vHot = aHot;
  vWorld = world;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const RAIN_VS = /* glsl */ `
${INSTANCE_COMMON_VS}
void main() {
  float top = ${RAIN.top.toFixed(1)};
  float bottom = ${RAIN.bottom.toFixed(1)};
  float span = top - bottom;
  float speed = 3.6 + fract(sin(aParam.x * 12.9898 + aParam.z * 78.233) * 43758.5453) * 4.6;
  float y = bottom + mod(aParam.y - uTime * speed - bottom, span);
  float gust = 0.5 + 0.5 * sin(uTime * 0.13) * sin(uTime * 0.071 + 1.7);
  float x = aParam.x + sin(uTime * 0.3 + aParam.z * 6.283) * (0.5 + gust * 1.6) + gust * (y - 2.0) * 0.16;
  vec3 pos = vec3(x, y, aParam.z);
  vGlow = 0.0;
  // 面向镜头 + 随阵风微斜
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float tilt = gust * 0.14;
  vec3 bu = camRight * cos(tilt) - camUp * sin(tilt);
  vec3 bv = camRight * sin(tilt) + camUp * cos(tilt);
  float scale = aParam.w;
  vec3 world = pos + bu * (position.x * aDim.x * scale) + bv * (position.y * aDim.y * scale);
  // 顶部淡入、底部淡出
  float fade = smoothstep(bottom, bottom + 5.0, y) * (1.0 - smoothstep(top - 5.0, top, y));
  vUv = mix(aUV.xy, aUV.zw, position.xy + 0.5);
  vRect = aUV;
  vBright = aDim.z * fade;
  vHot = aHot;
  vWorld = world;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const RUSH_VS = /* glsl */ `
${INSTANCE_COMMON_VS}
void main() {
  float zFar = ${RUSH.zFar.toFixed(1)};
  float zNear = ${RUSH.zNear.toFixed(1)};
  float span = zNear - zFar;
  bool isTrail = aParam.w < 0.0;
  float y0 = aParam.y;
  float z = zFar + mod(aParam.z + uFlight * 3.4 - zFar, span);
  float drift = sin(uTime * 0.5 + aParam.z * 0.13) * 0.7;
  vec3 pos = vec3(aParam.x + drift, y0 + cos(uTime * 0.4 + aParam.z * 0.1) * 0.5, z);
  // 拖尾副本沿来向回拉
  if (isTrail) pos.z -= 5.2 + 2.4 * sin(aParam.z * 0.37);
  vGlow = 0.0;
  float nearFade = 1.0 - smoothstep(-4.0, 2.5, z);
  float scale = abs(aParam.w) * (0.4 + 0.6 * nearFade);
  // 用视图矩阵的右/上向量做公告板
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 world = pos + camRight * (position.x * aDim.x * scale) + camUp * (position.y * aDim.y * scale);
  vUv = mix(aUV.xy, aUV.zw, position.xy + 0.5);
  vRect = aUV;
  float farFade = smoothstep(zFar + 6.0, zFar + 40.0, z);
  vBright = aDim.z * farFade * nearFade;
  vHot = aHot;
  vWorld = world;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const PORTRAIT_VS = /* glsl */ `
${INSTANCE_COMMON_VS}
uniform float uAssemble;
void main() {
  vGlow = 0.0;
  float ease = 1.0 - pow(1.0 - uAssemble, 3.0);
  float z = 0.0;
  vec3 target = vec3(aParam.x, aParam.y, z);
  float l = max(0.6, length(target.xy));
  vec3 scatter = vec3(target.xy * 3.4 + normalize(target.xy + vec2(1e-4)) * 26.0, -34.0);
  vec3 pos = mix(scatter, target, ease);
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float scale = aParam.w;
  vec3 world = pos + camRight * (position.x * aDim.x * scale) + camUp * (position.y * aDim.y * scale);
  vUv = mix(aUV.xy, aUV.zw, position.xy + 0.5);
  vRect = aUV;
  vBright = aDim.z * (0.25 + 0.75 * ease);
  vHot = aHot;
  vWorld = target + camRight * (position.x * aDim.x * scale) + camUp * (position.y * aDim.y * scale);
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

/* ------------------------------------------------------------------ */
/* 片元着色器（三场景共用，靠 uniform 换雾色）                         */
/* ------------------------------------------------------------------ */

const SHAPE_VS = /* glsl */ `
${INSTANCE_COMMON_VS}
attribute vec3 aCenter;
attribute vec3 aU;
attribute vec3 aV;
attribute float aOpacity;
void main() {
  vec3 world = aCenter + aU * position.x * aDim.x * aParam.w + aV * position.y * aDim.y * aParam.w;
  vUv = mix(aUV.xy, aUV.zw, position.xy + 0.5);
  vRect = aUV;
  vBright = aDim.z;
  vLayerOpacity = aOpacity;
  vHot = aHot;
  vGlow = 0.0;
  vWorld = world;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const INSTANCE_FS = /* glsl */ `
uniform sampler2D uAtlas;
uniform sampler2D uPortrait;
uniform float uPortraitMode;
uniform float uSolidMode;
uniform vec3 uNear;
uniform vec3 uFar;
uniform float uFogK;
uniform float uFade;
uniform float uTime;
varying vec2 vUv;
varying vec4 vRect;
varying float vBright;
varying float vLayerOpacity;
varying float vViewZ;
varying float vHot;
varying vec3 vWorld;
varying float vGlow;
void main() {
  vec2 uv = vUv;
  // 双面渲染时把背面镜像翻正，保证从内侧看文字不是反的
  if (!gl_FrontFacing) {
    uv.x = vRect.x + vRect.z - vUv.x;
  }
  vec4 tex = texture2D(uAtlas, uv);
  float a = tex.a * smoothstep(1.5, 8.0, vViewZ);
  if (uSolidMode > 0.5) a *= vLayerOpacity;
  if (uPortraitMode > 0.5) {
    vec2 portraitUV = vec2(vWorld.x / 20.0 + 0.5, vWorld.y / 25.0 + 0.5);
    float ink = texture2D(uPortrait, clamp(portraitUV, 0.0, 1.0)).r;
    a *= smoothstep(0.03, 0.94, pow(ink, 0.72));
  }
  if (a <= 0.0 || (uSolidMode > 0.5 && a * uFade < 0.12)) discard;
  float fog = 1.0 - exp(-vViewZ * uFogK);
  vec3 color = mix(uNear, uFar, fog * 0.9);
  float bright = (min(vBright, 1.0)) * uFade;
  gl_FragColor = vec4(color * bright, a * uFade);
}
`

/* ------------------------------------------------------------------ */
/* 背景球与配饰                                                        */
/* ------------------------------------------------------------------ */

const BG_VS = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w;
}
`

// Fixed screen-space stars: no time input, rotation, twinkling, or subpixel point rasterization.
const BG_STILL_FS = /* glsl */ `
uniform float uFade, uPixelRatio;
uniform vec2 uResolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main() {
  vec2 grid=gl_FragCoord.xy/uResolution.y*24.;
  vec2 cell=floor(grid), local=fract(grid);
  float seed=hash(cell);
  vec2 center=.2+.6*vec2(hash(cell+3.1),hash(cell+9.7));
  float radius=1.5*uPixelRatio*24./uResolution.y;
  float star=(1.-smoothstep(radius*.25,radius,length(local-center)))*step(.78,seed);
  vec3 color=vec3(.0015,.0018,.0025)+vec3(.065,.07,.08)*star;
  gl_FragColor=vec4(color,uFade);
}
`

function backgroundSphere(fs: string): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    vertexShader: BG_VS,
    fragmentShader: fs,
    uniforms: { uFade: { value: 1 }, uResolution: { value: new THREE.Vector2(1, 1) }, uPixelRatio: { value: 1 } },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    transparent: true,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(420, 40, 24), mat)
  mesh.renderOrder = -10
  mesh.frustumCulled = false
  return mesh
}

/** 虫洞：纯隧道，无配饰 */
function buildWormholeExtras(): { group: THREE.Group; timedMaterials: Array<THREE.ShaderMaterial> } {
  return { group: new THREE.Group(), timedMaterials: [] }
}

/** 雨：无配饰（雨夜虚空） */
function buildRainExtras(): { group: THREE.Group; timedMaterials: Array<THREE.ShaderMaterial> } {
  return { group: new THREE.Group(), timedMaterials: [] }
}

/** 穿越：无配饰（开阔虚空） */
function buildRushExtras(): { group: THREE.Group; timedMaterials: Array<THREE.ShaderMaterial> } {
  return { group: new THREE.Group(), timedMaterials: [] }
}

/** 画像：无配饰（纯暗背景） */
function buildPortraitExtras(): { group: THREE.Group; timedMaterials: Array<THREE.ShaderMaterial> } {
  return { group: new THREE.Group(), timedMaterials: [] }
}

/* ------------------------------------------------------------------ */
/* 场景管理器                                                          */
/* ------------------------------------------------------------------ */

type SceneBundle = {
  id: SceneId
  group: THREE.Group
  extras: THREE.Group
  bgMat: THREE.ShaderMaterial
  mesh: THREE.Mesh | null
  geo: THREE.InstancedBufferGeometry | null
  mat: THREE.ShaderMaterial | null
  params: Array<InstanceParams>
  assemble: number
  timed: Array<THREE.ShaderMaterial>
  near: THREE.Color
  far: THREE.Color
  fogK: number
}

export type FormulaPick = { formula: number; instance: number }

const SCENE_TINTS: Record<SceneId, { near: number; far: number; fogK: number }> = {
  wormhole: { near: 0xffffff, far: 0x361a06, fogK: 0.042 },
  rush: { near: 0xf4fbff, far: 0x3f7fae, fogK: 0.01 },
  rain: { near: 0xf2f9ff, far: 0x1e3a5c, fogK: 0.015 },
  portrait: { near: 0xfff4e2, far: 0xfff4e2, fogK: 0 },
  blackhole: { near: 0xffdca1, far: 0xbc591b, fogK: 0.006 },
  mobius: { near: 0xc6f4ff, far: 0x327ba5, fogK: 0.008 },


}

export class EquationSceneManager {
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private lensing = createLensingPass()
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private bundles: Record<SceneId, SceneBundle>
  private subject: FormulaSubject | null = null
  private atlas: FormulaAtlas | null = null
  private atlasPixels: Uint8ClampedArray | null = null
  private portraitTexture: THREE.DataTexture | null = null
  private lensView: LensView = { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1], inclination: 0 }
  private current: SceneId = 'wormhole'
  private raf = 0
  private lastNow = 0
  private disposed = false

  private time = 0
  private flight = 0
  private spin = 0
  private camT = 0
  private timeScale = 1
  private playing = true
  private cardOpen = false
  private reducedMotion = false
  private preset: CameraPreset = { hug: 0.32, speed: 1, fov: 74, sway: 1 }
  private fov = 74
  private exposure = 1.0
  private dragX = 0
  private dragY = 0
  private dragTX = 0
  private dragTY = 0
  private boost = 0
  private zoomT = 0
  private zoom = 0
  private transition: { from: SceneId; to: SceneId; t: number } | null = null
  private speedFovKick = 0
  private speedMult = 1
  private hotMesh: THREE.Mesh | null = null
  private hotIndex = -1

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = this.exposure
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.1, 900)
    this.camera.position.set(0, 0, 9.5)

    const size = new THREE.Vector2()
    this.renderer.getSize(size)
    const rt = new THREE.WebGLRenderTarget(Math.max(2, size.x), Math.max(2, size.y), {
      type: THREE.HalfFloatType,
      samples: 2,
    })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.composer.addPass(this.lensing)
    this.composer.addPass(new OutputPass())

    this.bundles = {
      wormhole: this.makeBundle('wormhole', BG_STILL_FS, buildWormholeExtras),
      rush: this.makeBundle('rush', BG_STILL_FS, buildRushExtras),
      rain: this.makeBundle('rain', BG_STILL_FS, buildRainExtras),
      portrait: this.makeBundle('portrait', BG_STILL_FS, buildPortraitExtras),

      blackhole: this.makeBundle('blackhole', BG_STILL_FS, buildBlackholeExtras),
      mobius: this.makeBundle('mobius', BG_STILL_FS, buildWormholeExtras),

    }
    for (const id of SCENE_IDS) this.bundles[id].group.visible = id === 'wormhole'

    this.raf = requestAnimationFrame(this.frame)
  }

  private makeBundle(
    id: SceneId,
    bgFs: string,
    extras: () => { group: THREE.Group; timedMaterials: Array<THREE.ShaderMaterial> },
  ): SceneBundle {
    const group = new THREE.Group()
    const bg = backgroundSphere(bgFs)
    const ex = extras()
    group.add(bg, ex.group)
    this.scene.add(group)
    const tint = SCENE_TINTS[id]
    return {
      id,
      group,
      extras: ex.group,
      bgMat: bg.material as THREE.ShaderMaterial,
      mesh: null,
      geo: null,
      mat: null,
      params: [],
      assemble: 1,
      timed: ex.timedMaterials,
      near: new THREE.Color(tint.near),
      far: new THREE.Color(tint.far),
      fogK: tint.fogK,
    }
  }

  setSubject(subject: FormulaSubject): void {
    if (this.subject?.id === subject.id) return
    this.subject = subject
    if (!this.atlas) {
      this.atlas = buildFormulaAtlas({ ...subject, formulas: MIXED_FORMULAS }, this.renderer.capabilities.getMaxAnisotropy())
      for (const id of SCENE_IDS) this.rebuildInstances(id)
    } else {
      this.rebuildInstances('portrait')
    }
  }

  private rebuildInstances(id: SceneId): void {
    const bundle = this.bundles[id]
    const subject = this.subject
    const atlas = this.atlas
    if (!subject || !atlas) return
    const widthsEm = atlas.rects.map((r) => r.wEm)
    if (id === 'wormhole') bundle.params = buildWormholeInstances(widthsEm)
    else if (id === 'rush') bundle.params = buildRushInstances(widthsEm.length)
    else if (id === 'rain') bundle.params = buildRainInstances(widthsEm.length)
    else if (id === 'portrait') {
      this.portraitTexture?.dispose()
      const points = PORTRAITS[subject.id].points
      const pixels = new Uint8Array(points.length * 4)
      for (let i = 0; i < points.length; i++) pixels.set([points[i][2], points[i][2], points[i][2], 255], i * 4)
      this.portraitTexture = new THREE.DataTexture(pixels, 80, 100)
      this.portraitTexture.flipY = true
      this.portraitTexture.magFilter = THREE.LinearFilter
      this.portraitTexture.minFilter = THREE.LinearFilter
      this.portraitTexture.needsUpdate = true
      bundle.params = buildPortraitTiles(atlas.rects)
      bundle.assemble = this.reducedMotion || !this.playing ? 1 : 0
    }
    else if (isShape(id)) bundle.params = buildShapeInstances(id, widthsEm)

    const n = bundle.params.length
    const aParam = new Float32Array(n * 4)
    const aUV = new Float32Array(n * 4)
    const aDim = new Float32Array(n * 3)
    const aHot = new Float32Array(n)
    for (let i = 0; i < n; i += 1) {
      const p = bundle.params[i]
      const rect = atlas.rects[p.formula]
      aParam.set([p.a, p.b, p.c, p.size], i * 4)
      aUV.set([rect.u0, rect.v0, rect.u1, rect.v1], i * 4)
      aDim.set([rect.wEm, rect.hEm, p.bright], i * 3)
    }
    const base = new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry()
    geo.setIndex(base.getIndex())
    geo.setAttribute('position', base.getAttribute('position'))
    geo.setAttribute('aParam', new THREE.InstancedBufferAttribute(aParam, 4))
    geo.setAttribute('aUV', new THREE.InstancedBufferAttribute(aUV, 4))
    geo.setAttribute('aDim', new THREE.InstancedBufferAttribute(aDim, 3))
    geo.setAttribute('aHot', new THREE.InstancedBufferAttribute(aHot, 1))
    geo.instanceCount = n
    if (isShape(id)) {
      for (const key of ['aCenter', 'aU', 'aV']) geo.setAttribute(key, new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
      geo.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage))
    }
    const vs = isShape(id) ? SHAPE_VS : id === 'wormhole' ? WORMHOLE_VS : id === 'rush' ? RUSH_VS : id === 'portrait' ? PORTRAIT_VS : RAIN_VS
    const mat = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: INSTANCE_FS,
      uniforms: {
        uAtlas: { value: atlas.texture },
        uPortrait: { value: id === 'portrait' ? this.portraitTexture : null },
        uPortraitMode: { value: id === 'portrait' ? 1 : 0 },
        uSolidMode: { value: id === 'blackhole' ? 1 : 0 },
        uTime: { value: this.time },
        uFlight: { value: 0 },
        uSpin: { value: 0 },
        uFade: { value: id === this.current ? 1 : 0 },
        uNear: { value: bundle.near },
        uFar: { value: bundle.far },
        uFogK: { value: bundle.fogK },
        uAssemble: { value: 1 },
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: id === 'blackhole',
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.renderOrder = 2
    if (bundle.mesh) {
      bundle.group.remove(bundle.mesh)
      bundle.geo?.dispose()
      bundle.mat?.dispose()
    }
    bundle.mesh = mesh
    bundle.geo = geo
    bundle.mat = mat
    bundle.group.add(mesh)

    this.clearHot()
  }

  setScene(id: SceneId, instant = false): void {
    if (id === this.current && !this.transition) return
    if (this.transition) this.finishTransition()
    if (id === 'portrait') this.bundles.portrait.assemble = this.reducedMotion || !this.playing ? 1 : 0
    if (instant || this.reducedMotion) {
      this.bundles[this.current].group.visible = false
      this.setFade(this.current, 0)
      this.current = id
      this.bundles[id].group.visible = true
      this.bundles[id].extras.visible = true
      this.setFade(id, 1)
      this.resetMotion(id)
      return
    }
    this.transition = { from: this.current, to: id, t: 0 }
    this.bundles[id].group.visible = true
    this.bundles[id].extras.visible = false
    this.resetMotion(id)
  }

  private resetMotion(_id: SceneId): void {
    this.zoom = 0
    this.zoomT = 0
    this.boost = 0
    this.dragTX = 0
    this.dragTY = 0
  }

  private finishTransition(): void {
    const tr = this.transition
    if (!tr) return
    this.setFade(tr.from, 0)
    this.bundles[tr.from].group.visible = false
    this.setFade(tr.to, 1)
    this.bundles[tr.to].extras.visible = true
    this.current = tr.to
    this.transition = null
    this.exposure = 1.0
    this.renderer.toneMappingExposure = this.exposure
  }

  private setFade(id: SceneId, k: number): void {
    const b = this.bundles[id]
    if (b.mat) b.mat.uniforms.uFade.value = k
    b.bgMat.uniforms.uFade.value = k
    for (const m of b.timed) m.uniforms.uFade.value = k
  }

  reset(): void {
    if (this.transition) this.finishTransition()
    this.time = this.flight = this.spin = this.camT = 0
    this.dragX = this.dragY = 0
    this.resetMotion(this.current)
    this.clearHot()
  }

  setPlaying(v: boolean): void {
    this.playing = v
  }

  setCardOpen(v: boolean): void {
    this.cardOpen = v
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v
    if (v) {
      this.timeScale = 0
      this.boost = 0
      if (this.transition) this.finishTransition()
      this.bundles.portrait.assemble = 1
    }
  }

  setPreset(p: CameraPreset): void {
    this.preset = { ...p }
  }

  /** 全局速度倍率（Freebar 滑杆） */
  setSpeed(mult: number): void {
    this.speedMult = THREE.MathUtils.clamp(mult, 0.2, 2.5)
  }

  addDrag(dx: number, dy: number): void {
    this.dragTX = isShape(this.current) ? this.dragTX + dx : THREE.MathUtils.clamp(this.dragTX + dx, -1, 1)
    this.dragTY = THREE.MathUtils.clamp(this.dragTY + dy, -1, 1)
  }

  addWheel(deltaY: number): void {
    if (this.current === 'wormhole') {
      this.boost = THREE.MathUtils.clamp(this.boost + deltaY * 0.006, -1.6, 7)
    } else if (this.current === 'rush') {
      this.boost = THREE.MathUtils.clamp(this.boost + deltaY * 0.01, -3, 10)
    } else if (this.current === 'rain') {
      this.zoomT = THREE.MathUtils.clamp(this.zoomT + deltaY * 0.02, -4, 7)
    } else if (this.current === 'portrait') {
      this.zoomT = THREE.MathUtils.clamp(this.zoomT + deltaY * 0.03, -10, 14)
    } else if (this.current === 'blackhole') {
      this.zoomT = THREE.MathUtils.clamp(this.zoomT + deltaY * 0.045, -30, 35)
    } else {
      this.zoomT = THREE.MathUtils.clamp(this.zoomT + deltaY * 0.03, -16, 14)
    }
  }

  /** Nearest visible glyph intersection, matching the solid formula depth buffer. */
  private pickBlackhole(sx: number, sy: number, width: number, height: number): FormulaPick | null {
    const atlas = this.atlas
    if (!atlas) return null
    this.atlasPixels ??= atlas.canvas.getContext('2d')!.getImageData(0, 0, atlas.canvas.width, atlas.canvas.height).data
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(sx / width * 2 - 1, 1 - sy / height * 2), this.camera)
    const ray = raycaster.ray
    const viewCosine = ray.direction.dot(this.camera.getWorldDirection(new THREE.Vector3()))
    const sphereHit = ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), 5.8), new THREE.Vector3())
    let nearest = sphereHit ? sphereHit.distanceTo(ray.origin) : Infinity
    let pick: FormulaPick | null = null
    const center = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), normal = new THREE.Vector3(), delta = new THREE.Vector3()
    for (const [instance, p] of this.bundles.blackhole.params.entries()) {
      const frame = shapeFrame('blackhole', p, this.time, this.lensView)
      if (frame.opacity < 0.12) continue
      center.set(...frame.pos); u.set(...frame.u); v.set(...frame.v); normal.crossVectors(u, v)
      const denominator = normal.dot(ray.direction)
      if (Math.abs(denominator) < 1e-6) continue
      const distance = delta.copy(center).sub(ray.origin).dot(normal) / denominator
      if (distance <= 0 || distance >= nearest) continue
      ray.at(distance, delta).sub(center)
      const uv = u.dot(v), determinant = 1 - uv * uv
      if (determinant < 1e-6) continue
      const du = delta.dot(u), dv = delta.dot(v), rect = atlas.rects[p.formula]
      let x = (du - uv * dv) / determinant / (rect.wEm * p.size) + 0.5
      const y = (dv - uv * du) / determinant / (rect.hEm * p.size) + 0.5
      if (x < 0 || x > 1 || y < 0 || y > 1) continue
      if (denominator > 0) x = 1 - x
      const ix = Math.min(atlas.canvas.width - 1, Math.floor((rect.u0 + (rect.u1 - rect.u0) * x) * atlas.canvas.width))
      const iy = Math.min(atlas.canvas.height - 1, Math.floor((1 - rect.v0 - (rect.v1 - rect.v0) * y) * atlas.canvas.height))
      const alpha = this.atlasPixels[(iy * atlas.canvas.width + ix) * 4 + 3] / 255
      const nearFade = THREE.MathUtils.smoothstep(distance * viewCosine, 1.5, 8)
      if (alpha * frame.opacity * nearFade < 0.12) continue
      nearest = distance
      pick = { formula: p.formula, instance }
    }
    return pick
  }

  /** 指针拾取：sx/sy 为 CSS 像素（相对画布） */
  pickAt(sx: number, sy: number): FormulaPick | null {
    const bundle = this.bundles[this.current]
    if (!bundle.mesh || !this.subject) return null
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return null
    if (this.current === 'blackhole') {
      const [x, y] = lensSource((sx - w / 2) / h, (h / 2 - sy) / h, lensRadius(this.camera), this.lensView.inclination, this.camera.aspect)
      sx = w / 2 + x * h
      sy = h / 2 - y * h
      return this.pickBlackhole(sx, sy, w, h)
    }
    const v = new THREE.Vector3()
    const v2 = new THREE.Vector3()
    let best: FormulaPick | null = null
    let bestScore = Infinity
    for (let i = 0; i < bundle.params.length; i += 1) {
      const p = bundle.params[i]
      // 远景碎光不参与拾取
      if (p.c === -2 || p.bright < 0.045 || p.size < 0) continue
      const frame = this.frameOf(this.current, p)
      v.set(frame.pos[0], frame.pos[1], frame.pos[2])
      if (this.current === 'portrait') {
        const ix = Math.max(0, Math.min(79, Math.floor((p.a / 20 + 0.5) * 80)))
        const iy = Math.max(0, Math.min(99, Math.floor((0.5 - p.b / 25) * 100)))
        if (PORTRAITS[this.subject.id].points[iy * 80 + ix][2] < 20) continue
      }
      const worldW = this.atlas!.rects[p.formula].wEm * p.size
      const fu = 'u' in frame ? (frame as { u: [number, number, number] }).u : ([1, 0, 0] as [number, number, number])
      v2.copy(v).addScaledVector(new THREE.Vector3(fu[0], fu[1], fu[2]), worldW * 0.5)
      v.project(this.camera)
      if (v.z > 1 || v.z < -1) continue
      v2.project(this.camera)
      const px = (v.x * 0.5 + 0.5) * w
      const py = (-v.y * 0.5 + 0.5) * h
      const px2 = (v2.x * 0.5 + 0.5) * w
      const py2 = (-v2.y * 0.5 + 0.5) * h
      const accept = THREE.MathUtils.clamp(Math.hypot(px2 - px, py2 - py) * 0.9, 22, 70)
      const d = Math.hypot(px - sx, py - sy)
      const score = d / accept
      if (d < accept && score < bestScore) {
        bestScore = score
        best = { formula: p.formula, instance: i }
      }
    }
    return best
  }

  private frameOf(scene: SceneId, p: InstanceParams) {
    if (isShape(scene)) return shapeFrame(scene, p, this.time, this.lensView)
    if (scene === 'wormhole') return wormholeFrame(p.a, p.b, this.flight, this.spin)
    if (scene === 'rush') return rushFrame(p.a, p.b, p.c, p.size, this.flight * 3.4, this.time)
    if (scene === 'rain') {
      const f = rainFrame(p.a, p.b, p.c, p.c, this.time)
      return { pos: f.pos, u: [1, 0, 0] as [number, number, number], v: [0, 1, 0] as [number, number, number] }
    }
    if (scene === 'portrait') {
      const b = this.bundles.portrait
      const f = portraitFrame(p.a, p.b, p.c, b.assemble, this.time)
      return { pos: f.pos, u: [1, 0, 0] as [number, number, number], v: [0, 1, 0] as [number, number, number] }
    }
    return { pos: [0, 0, 0] as [number, number, number] }
  }

  /** GuideTour 用：把某条公式里最靠近画面视觉中心的实例点亮 */
  highlightFormula(formulaId: string): boolean {
    const subject = this.subject
    const bundle = this.bundles[this.current]
    if (!subject || !bundle.mesh) return false
    const fi = MIXED_FORMULAS.findIndex((f) => f.id === formulaId)
    if (fi < 0) return false
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const v = new THREE.Vector3()
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < bundle.params.length; i += 1) {
      const p = bundle.params[i]
      if (p.formula !== fi || p.c === -2) continue
      const frame = this.frameOf(this.current, p)
      v.set(frame.pos[0], frame.pos[1], frame.pos[2]).project(this.camera)
      if (v.z > 1 || v.z < -1) continue
      const px = (v.x * 0.5 + 0.5) * w
      const py = (-v.y * 0.5 + 0.5) * h
      const d = Math.hypot(px - w * 0.62, py - h * 0.42)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (best < 0) return false
    this.setHot(best)
    return true
  }

  /** 当前实例的屏幕位置与投影宽度（公式飞出动画的起点） */
  screenPosOf(instance: number): { x: number; y: number; w: number } | null {
    const bundle = this.bundles[this.current]
    const p = bundle.params[instance]
    if (!p || !this.atlas) return null
    const frame = this.frameOf(this.current, p)
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const v = new THREE.Vector3(frame.pos[0], frame.pos[1], frame.pos[2])
    const worldW = this.atlas.rects[p.formula].wEm * p.size
    const fu = 'u' in frame ? (frame as { u: [number, number, number] }).u : ([1, 0, 0] as [number, number, number])
    const v2 = v.clone().addScaledVector(new THREE.Vector3(fu[0], fu[1], fu[2]), worldW * 0.5)
    v.project(this.camera)
    v2.project(this.camera)
    return {
      x: (v.x * 0.5 + 0.5) * w,
      y: (-v.y * 0.5 + 0.5) * h,
      w: Math.hypot((v2.x - v.x) * 0.5 * w, (v2.y - v.y) * 0.5 * h) * 2,
    }
  }

  setHot(instance: number | null): void {
    if (this.hotMesh && this.hotIndex >= 0) {
      const attr = this.hotMesh.geometry.getAttribute('aHot') as THREE.InstancedBufferAttribute
      attr.array[this.hotIndex] = 0
      attr.needsUpdate = true
    }
    this.hotMesh = null
    this.hotIndex = -1
    if (instance === null || instance < 0) return
    const bundle = this.bundles[this.current]
    if (!bundle.mesh) return
    const attr = bundle.mesh.geometry.getAttribute('aHot') as THREE.InstancedBufferAttribute
    attr.array[instance] = 1
    attr.needsUpdate = true
    this.hotMesh = bundle.mesh
    this.hotIndex = instance
  }

  clearHot(): void {
    this.setHot(null)
  }

  private frame = (now: number): void => {
    if (this.disposed) return
    const s = this
    const elapsed = s.lastNow ? Math.min((now - s.lastNow) / 1000, 1) : 0
    const dt = Math.min(elapsed, 0.08)
    s.lastNow = now

    // 画布尺寸
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const w = s.canvas.clientWidth
    const h = s.canvas.clientHeight
    if (w > 0 && h > 0 && (s.canvas.width !== Math.round(w * dpr) || s.canvas.height !== Math.round(h * dpr))) {
      s.renderer.setPixelRatio(dpr)
      s.renderer.setSize(w, h, false)
      s.composer.setPixelRatio(dpr)
      s.composer.setSize(w, h)
      s.camera.aspect = w / h
      s.camera.updateProjectionMatrix()
    }

    // 时间流速：卡片/暂停冻结，悬停减速，reduced-motion 全停
    const target = s.reducedMotion || s.cardOpen || !s.playing ? 0 : 1
    s.timeScale = target === 0 ? 0 : s.timeScale + (target - s.timeScale) * Math.min(1, dt * 5)
    const speed = s.preset.speed ?? 1
    s.time += dt * s.timeScale * speed * s.speedMult
    s.spin += dt * 0.022 * s.timeScale * s.speedMult
    s.boost *= Math.exp(-dt * 1.7)
    s.flight += dt * (4.6 * s.speedMult * speed * s.timeScale + s.boost * s.timeScale)
    s.speedFovKick = 0
    s.camT += dt * (s.timeScale)
    s.zoom += (s.zoomT - s.zoom) * Math.min(1, dt * 4)
    s.dragX += (s.dragTX - s.dragX) * Math.min(1, dt * 6)
    s.dragY += (s.dragTY - s.dragY) * Math.min(1, dt * 6)

    // 转场
    const fovPunch = 0
    if (s.transition) {
      const tr = s.transition
      tr.t += elapsed / 1.05
      const k = Math.min(1, tr.t)
      const ease = k * k * (3 - 2 * k)
      // Different camera scales must not expose the incoming geometry before its camera is active.
      s.setFade(tr.from, 1 - Math.min(1, ease * 2))
      s.setFade(tr.to, Math.max(0, ease * 2 - 1))
      if (k >= 0.5 && !s.bundles[tr.to].extras.visible) {
        s.bundles[tr.to].extras.visible = true
        s.bundles[tr.from].extras.visible = false
        s.current = tr.to
      }
      s.renderer.toneMappingExposure = s.exposure
      if (k >= 1) s.finishTransition()
    }

    // 相机
    const t = s.camT
    const sway = s.preset.sway ?? 1
    const fovTarget = (s.preset.fov ?? 70) + fovPunch + s.speedFovKick
    s.fov += (fovTarget - s.fov) * Math.min(1, dt * 4)
    if (Math.abs(s.fov - s.camera.fov) > 0.01) {
      s.camera.fov = Math.max(38, Math.min(86, s.fov))
      s.camera.updateProjectionMatrix()
    }
    if (s.current === 'wormhole') {
      const hug = s.preset.hug ?? 0.32
      const camR = 1.1 + hug * 3.4
      const weave = 0.5 + 0.42 * Math.sin(t * 0.047 + 1.3)
      s.camera.position.set(
        Math.cos(t * 0.1) * camR * weave + s.dragX * 3.2,
        -0.6 + Math.sin(t * 0.073) * 0.6 * sway - s.dragY * 2.4 + hug * -0.8 + Math.sin(t * 0.06) * camR * 0.18,
        9.5,
      )
      s.camera.up.set(Math.sin(t * 0.043) * 0.06, 1, 0)
      s.camera.up.normalize()
      s.camera.lookAt(10.5 + s.dragX * 9, 7.6 - s.dragY * 7, -36)
    } else if (s.current === 'rush') {
      s.camera.up.set(Math.sin(t * 0.05) * 0.04, 1, 0)
      s.camera.up.normalize()
      s.camera.position.set(
        Math.sin(t * 0.06) * 1.6 + s.dragX * 4,
        Math.sin(t * 0.045) * 1.1 - s.dragY * 2.4,
        6,
      )
      s.camera.lookAt(s.dragX * 10, -s.dragY * 6, -70)
    } else if (isShape(s.current)) {
      const fit = Math.max(1, 1 / s.camera.aspect)
      s.camera.up.set(0, 1, 0)
      if (s.current === 'blackhole') {
        const az = 0.3 + s.dragX * 2.7 + t * 0.022
        const elevation = THREE.MathUtils.clamp(0.2 + s.dragY * 1.65 + Math.sin(t * 0.16) * 0.035, -1.45, 1.45)
        const d = Math.max(10, (38 + s.zoom) * Math.max(1, 0.7 / s.camera.aspect))
        s.camera.position.set(Math.sin(az) * Math.cos(elevation) * d, Math.sin(elevation) * d, Math.cos(az) * Math.cos(elevation) * d)
      } else if (s.current === 'mobius') {
        const az = 0.4 + s.dragX * 2 + t * 0.025
        const d = 42 * fit + s.zoom
        s.camera.position.set(Math.sin(az) * d * 0.7, d * (0.57 - s.dragY * 0.45), Math.cos(az) * d * 0.7)
      } else {
        s.camera.position.set(s.dragX * 25, 3 - s.dragY * 15, 55 * fit + s.zoom)
      }
      s.camera.lookAt(0, 0, 0)
      if (s.current === 'blackhole') s.camera.rotateZ(-0.18)
    } else if (s.current === 'portrait') {
      s.camera.up.set(0, 1, 0)
      s.camera.position.set(s.dragX * 2, -s.dragY * 2, 41 * Math.max(1, 0.79 / s.camera.aspect) + s.zoom)
      s.camera.lookAt(0, 0, 0)
    } else if (s.current === 'rain') {
      s.camera.up.set(0, 1, 0)
      s.camera.position.set(
        Math.sin(t * 0.05) * 2.5 + s.dragX * 4,
        1.5 + Math.sin(t * 0.04) * 0.8 - s.dragY * 3,
        10 + s.zoom,
      )
      s.camera.lookAt(s.dragX * 6, -2 - s.dragY * 3, -40)
    } else {
      const az = t * 0.025 + s.dragX * 0.8
      s.camera.up.set(0, 1, 0)
      s.camera.position.set(Math.cos(az) * 11, 27 + s.zoom, Math.sin(az) * 11 + 6)
      s.camera.lookAt(0, 0, 3 + s.dragY * 6)
    }

    for (const id of SCENE_IDS) {
      s.bundles[id].bgMat.uniforms.uResolution.value.set(s.canvas.width, s.canvas.height)
      s.bundles[id].bgMat.uniforms.uPixelRatio.value = s.renderer.getPixelRatio()
    }
    s.camera.updateMatrixWorld()
    if (s.current === 'blackhole') {
      const e = s.camera.matrixWorld.elements
      s.lensView = { right: [e[0], e[1], e[2]], up: [e[4], e[5], e[6]], forward: [e[8], e[9], e[10]], inclination: Math.abs(s.camera.position.y) / s.camera.position.length() }
      const lens = s.bundles.blackhole.extras.getObjectByName('optical-lens') as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
      lens.quaternion.copy(s.camera.quaternion)
      lens.material.uniforms.uInclination.value = s.lensView.inclination
    }

    // uniform 同步
    for (const id of SCENE_IDS) {
      const b = s.bundles[id]
      if (!b.mat) continue
      if (isShape(id) && b.group.visible && b.geo) {
        const center = b.geo.getAttribute('aCenter') as THREE.InstancedBufferAttribute
        const bu = b.geo.getAttribute('aU') as THREE.InstancedBufferAttribute
        const bv = b.geo.getAttribute('aV') as THREE.InstancedBufferAttribute
        const opacity = b.geo.getAttribute('aOpacity') as THREE.InstancedBufferAttribute
        for (let i = 0; i < b.params.length; i++) {
          const f = shapeFrame(id, b.params[i], s.time, s.lensView)
          center.setXYZ(i, ...f.pos); bu.setXYZ(i, ...f.u); bv.setXYZ(i, ...f.v); opacity.setX(i, f.opacity)
        }
        center.needsUpdate = bu.needsUpdate = bv.needsUpdate = opacity.needsUpdate = true
      }
      b.mat.uniforms.uTime.value = s.time
      b.mat.uniforms.uFlight.value = s.flight
      b.mat.uniforms.uSpin.value = s.spin
      for (const m of b.timed) m.uniforms.uTime.value = s.time
    }
    if (s.current === 'portrait') {
      const b = s.bundles.portrait
      if (b.assemble < 1) {
        b.assemble = Math.min(1, b.assemble + elapsed * s.timeScale / 1.7)
      }
      if (b.mat) b.mat.uniforms.uAssemble.value = b.assemble
    }

    s.lensing.enabled = s.current === 'blackhole' && !s.transition
    s.lensing.uniforms.uRadius.value = lensRadius(s.camera)
    s.lensing.uniforms.uAspect.value = s.camera.aspect
    s.lensing.uniforms.uInclination.value = s.lensView.inclination
    s.composer.render()
    s.raf = requestAnimationFrame(s.frame)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    for (const id of SCENE_IDS) {
      const b = this.bundles[id]
      b.geo?.dispose()
      b.mat?.dispose()
      b.bgMat.dispose()
      for (const m of b.timed) m.dispose()
      b.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite || obj instanceof THREE.Line) {
          const material = obj.material as THREE.Material | undefined
          const geometry = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined
          geometry?.dispose()
          if (material && material !== b.mat && material !== b.bgMat) material.dispose()
        }
      })
      this.scene.remove(b.group)
    }
    this.atlas?.texture.dispose()
    this.portraitTexture?.dispose()
    for (const pass of this.composer.passes) pass.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
