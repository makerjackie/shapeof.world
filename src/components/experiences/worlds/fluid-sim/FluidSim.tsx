import './styles/FluidSim.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowClockwise, ArrowRight, Coffee, FilmStrip, Question, X } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

import { cupGeometry, type Cup, insideCup, liquidKind, type SpoonMode, type SpoonPoint, spoonPosition, SPOON_DURATION } from './cup-model'

/* ============================================================
   A cup of coffee, seen from above.
   WebGL fluid — Navier-Stokes Stable Fluids (Jos Stam), masked to a
   round cup. Milk is a passive dye; the spoon (your finger, or the demo
   stroke) only pushes the water.
   ============================================================ */

type FBO = {
  texture: WebGLTexture
  fbo: WebGLFramebuffer
  width: number
  height: number
  texelSizeX: number
  texelSizeY: number
  attach: (id: number) => number
}

type DoubleFBO = {
  width: number
  height: number
  texelSizeX: number
  texelSizeY: number
  read: FBO
  write: FBO
  swap: () => void
}

type Pointer = {
  id: number
  texcoordX: number
  texcoordY: number
  prevTexcoordX: number
  prevTexcoordY: number
  deltaX: number
  deltaY: number
  down: boolean
  moved: boolean
  travelled: number
}


type Command =
  | { type: 'stir'; fresh: boolean; delay?: number }
  | { type: 'push'; fresh: boolean }
  | { type: 'fresh' }

type Caption = 'idle' | 'stir' | 'push' | 'thick' | 'fresh'

type CupBox = { x: number; y: number; r: number; width: number; height: number }

const SIM_RESOLUTION = 128
const DYE_RESOLUTION = 1024
const PRESSURE_ITERATIONS = 20
const CURL_DEFAULT = 20
const VISCOSITY_DEFAULT = 0.3
const VISCOSITY_HONEY = 2
/** milk fades very slowly: it is mixed, not removed */
const DYE_DISSIPATION = 0.05
const SPOON_GAIN = 1.5
/** how hard a stir spins the whole cup up, rad/s per second */
const STIR_SPIN = 2.6
const MILK: [number, number, number] = [1.0, 0.9, 0.76]
const CREAM: [number, number, number] = [0.96, 0.74, 0.5]

function getWebGLContext(canvas: HTMLCanvasElement) {
  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  }
  let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null
  const isWebGL2 = !!gl
  if (!gl) {
    gl = (canvas.getContext('webgl', params) ||
      canvas.getContext('experimental-webgl', params)) as unknown as WebGL2RenderingContext
  }
  if (!gl) return null

  let halfFloat: unknown = null
  let supportLinearFiltering = false

  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float')
    supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear')
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float')
    supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear')
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0)

  const halfFloatTexType = isWebGL2
    ? (gl as WebGL2RenderingContext).HALF_FLOAT
    : (halfFloat as { HALF_FLOAT_OES: number })?.HALF_FLOAT_OES ?? gl.UNSIGNED_BYTE

  let formatRGBA: { internalFormat: number; format: number }
  let formatRG: { internalFormat: number; format: number }
  let formatR: { internalFormat: number; format: number }

  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext
    formatRGBA = { internalFormat: gl2.RGBA16F, format: gl2.RGBA }
    formatRG = { internalFormat: gl2.RG16F, format: gl2.RG }
    formatR = { internalFormat: gl2.R16F, format: gl2.RED }
  } else {
    formatRGBA = { internalFormat: gl.RGBA, format: gl.RGBA }
    formatRG = { internalFormat: gl.RGBA, format: gl.RGBA }
    formatR = { internalFormat: gl.RGBA, format: gl.RGBA }
  }

  return {
    gl,
    ext: {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering,
    },
  }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return null
  }
  return program
}

function getUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): Record<string, WebGLUniformLocation | null> {
  const uniforms: Record<string, WebGLUniformLocation | null> = {}
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)
    if (info) {
      uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
  }
  return uniforms
}

const baseVertexShader = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const clearShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`

const splatShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`

const advectionShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;
  uniform vec3 cup;
  uniform float aspect;
  vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }
  void main () {
    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
    vec4 result = bilerp(uSource, coord, dyeTexelSize);
    float decay = 1.0 + dissipation * dt;
    // Nothing flows outside the cup: the wall holds the water back.
    vec2 p = vUv - cup.xy;
    p.x *= aspect;
    float inside = 1.0 - smoothstep(cup.z * 0.975, cup.z, length(p));
    gl_FragColor = inside * result / decay;
  }
`

const swirlShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec3 cup;
  uniform float aspect;
  uniform float strength;
  uniform float scale;
  void main () {
    // The spoon drags the whole cup round with it (clockwise, seen from above).
    vec2 p = vUv - cup.xy;
    p.x *= aspect;
    // Spins fastest near the middle, slowest at the wall: that shear is what draws the spiral.
    float d = length(p) / cup.z;
    float profile = clamp(1.0 - d, 0.0, 1.0) * 1.7;
    vec2 v = texture2D(uVelocity, vUv).xy;
    v += strength * scale * profile * vec2(p.y, -p.x);
    gl_FragColor = vec4(v, 0.0, 1.0);
  }
`

const divergenceShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`

const curlShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`

const vorticityShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = min(max(velocity, -1000.0), 1000.0);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

const pressureShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`

const gradientSubtractShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

const displayShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec3 cup;
  uniform float aspect;
  uniform vec3 spoon;
  uniform float px;
  void main () {
    vec2 p = vUv - cup.xy;
    p.x *= aspect;
    float d = length(p);
    float R = cup.z;
    vec2 n = p / max(d, 1e-5);
    vec2 lightDir = normalize(vec2(-0.55, 0.83));

    // Table: near-black, a soft pool of light under the cup.
    vec2 q = vUv - 0.5;
    q.x *= aspect;
    vec3 table = mix(vec3(0.045, 0.04, 0.038), vec3(0.008, 0.009, 0.012), smoothstep(0.0, 0.9, length(q)));
    float rimOuter = R * 1.085;
    vec2 sp0 = p - vec2(0.018, -0.026) * R / 0.3;
    float shadow = 1.0 - smoothstep(rimOuter * 0.98, rimOuter * 1.28, length(sp0));
    table *= 1.0 - 0.75 * shadow;

    // Coffee with milk. Milk is dye; mapped softly so it never clips.
    vec3 dye = texture2D(uTexture, vUv).rgb;
    vec3 milk = vec3(1.0) - exp(-dye * 2.3);
    float amount = clamp(max(milk.r, max(milk.g, milk.b)), 0.0, 1.0);
    vec3 coffee = mix(vec3(0.20, 0.105, 0.055), vec3(0.075, 0.036, 0.02), smoothstep(0.0, R, d));
    vec3 liquid = coffee * (1.0 - amount) + milk * mix(0.86, 1.0, amount);
    // A faint sheen on the surface, and the inner wall's shadow.
    float sheen = pow(max(0.0, dot(-n, lightDir)), 6.0) * smoothstep(R * 0.55, R * 0.95, d) * (1.0 - smoothstep(R * 0.95, R, d));
    liquid += sheen * 0.08;
    liquid *= 0.5 + 0.5 * smoothstep(R, R * 0.86, d);

    // Ceramic rim.
    float across = clamp((d - R) / (rimOuter - R), 0.0, 1.0);
    float facing = 0.5 + 0.5 * dot(n, lightDir);
    vec3 ceramic = vec3(0.90, 0.885, 0.86) * (0.42 + 0.58 * facing) * (0.72 + 0.28 * sin(across * 3.14159));
    float aa = px * 1.5;
    float inLiquid = 1.0 - smoothstep(R - aa, R + aa, d);
    float inRim = smoothstep(R - aa, R + aa, d) * (1.0 - smoothstep(rimOuter - aa, rimOuter + aa, d));

    vec3 col = table;
    col = mix(col, ceramic, inRim);
    col = mix(col, liquid, inLiquid);

    // You: a soft ring where the spoon / finger touches the coffee.
    vec2 s = vUv - spoon.xy;
    s.x *= aspect;
    float sd = length(s);
    float ringR = R * 0.085;
    float ring = (1.0 - smoothstep(px * 1.5, px * 3.0, abs(sd - ringR))) * spoon.z;
    float glow = exp(-sd * sd / (ringR * ringR * 0.6)) * spoon.z * 0.18;
    col += vec3(1.0, 0.86, 0.62) * (ring * 0.75 + glow);

    gl_FragColor = vec4(col, 1.0);
  }
`


export function FluidSim({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('fluid-sim')
  const [whyOpen, setWhyOpen] = useState(false)
  const [viscosity, setViscosity] = useState(VISCOSITY_DEFAULT)
  const [curl, setCurl] = useState(CURL_DEFAULT)
  const [caption, setCaption] = useState<Caption>('stir')
  const [cupBox, setCupBox] = useState<CupBox | null>(null)
  const [glStatus, setGlStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  const interactedRef = useRef(false)
  const viscosityRef = useRef(viscosity)
  const curlRef = useRef(curl)
  const commandsRef = useRef<Command[]>([])
  // The shell may hand us a new controls object after the first interaction;
  // keep the simulation alive instead of rebuilding it.
  const controlsRef = useRef(controls)
  controlsRef.current = controls

  viscosityRef.current = viscosity
  curlRef.current = curl

  const send = useCallback((command: Command) => {
    commandsRef.current.push(command)
    if (command.type === 'stir') setCaption('stir')
    else if (command.type === 'push') setCaption(viscosityRef.current >= 1.2 ? 'thick' : 'push')
    else setCaption('fresh')
  }, [])

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = getWebGLContext(canvas)
    if (!ctx) {
      setGlStatus('failed')
      return
    }

    const { gl, ext } = ctx

    const quadVB = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVB)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const quadIB = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIB)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)

    const vs = compileShader(gl, gl.VERTEX_SHADER, baseVertexShader)
    if (!vs) {
      setGlStatus('failed')
      return
    }
    const programs: Record<string, { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> }> = {}
    let compiled = true
    const createProg = (fragSrc: string, name: string) => {
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
      const prog = fs ? createProgram(gl, vs, fs) : null
      if (!prog) {
        compiled = false
        return
      }
      programs[name] = { program: prog, uniforms: getUniforms(gl, prog) }
    }

    createProg(clearShader, 'clear')
    createProg(splatShader, 'splat')
    createProg(advectionShader, 'advection')
    createProg(swirlShader, 'swirl')
    createProg(divergenceShader, 'divergence')
    createProg(curlShader, 'curl')
    createProg(vorticityShader, 'vorticity')
    createProg(pressureShader, 'pressure')
    createProg(gradientSubtractShader, 'gradientSubtract')
    createProg(displayShader, 'display')
    if (!compiled) {
      setGlStatus('failed')
      return
    }

    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
      gl.activeTexture(gl.TEXTURE0)
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)

      const fbo = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1.0 / w,
        texelSizeY: 1.0 / h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id)
          gl.bindTexture(gl.TEXTURE_2D, texture)
          return id
        },
      }
    }

    function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param)
      let fbo2 = createFBO(w, h, internalFormat, format, type, param)
      return {
        width: w,
        height: h,
        texelSizeX: 1.0 / w,
        texelSizeY: 1.0 / h,
        get read() { return fbo1 },
        set read(v) { fbo1 = v },
        get write() { return fbo2 },
        set write(v) { fbo2 = v },
        swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t },
      } as DoubleFBO
    }

    function getResolution(resolution: number) {
      let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
      if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio
      const min = Math.round(resolution)
      const max = Math.round(resolution * aspectRatio)
      if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min }
      return { width: min, height: max }
    }

    const texType = ext.halfFloatTexType
    const rgba = ext.formatRGBA
    const rg = ext.formatRG
    const r = ext.formatR
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST

    let velocity: DoubleFBO
    let dye: DoubleFBO
    let divergenceFBO: FBO
    let curlFBO: FBO
    let pressure: DoubleFBO
    let cup: Cup = { cx: 0.5, cy: 0.5, r: 0.3 }
    let aspect = 1

    function initFramebuffers() {
      const simRes = getResolution(SIM_RESOLUTION)
      const dyeRes = getResolution(DYE_RESOLUTION)
      velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
      dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
      divergenceFBO = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
      curlFBO = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
      pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST)
    }

    function measureCup() {
      aspect = canvas!.width / canvas!.height
      cup = cupGeometry(canvas!.width, canvas!.height)
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      setCupBox({ x: cup.cx * w, y: (1 - cup.cy) * h, r: cup.r * h, width: w, height: h })
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.floor(canvas!.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas!.clientHeight * dpr))
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w
        canvas!.height = h
        return true
      }
      return false
    }

    resizeCanvas()
    initFramebuffers()
    measureCup()

    const blitVAO = gl.createVertexArray ? gl.createVertexArray() : null
    if (blitVAO) gl.bindVertexArray(blitVAO)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVB)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIB)

    function blit(target: FBO | null) {
      if (target) {
        gl.viewport(0, 0, target.width, target.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }

    /** add a gaussian blob to a field; radius is in canvas-height units */
    function splatInto(target: DoubleFBO, x: number, y: number, value: [number, number, number], radius: number) {
      const prog = programs['splat']
      gl.useProgram(prog.program)
      gl.uniform1i(prog.uniforms['uTarget'], target.read.attach(0))
      gl.uniform1f(prog.uniforms['aspectRatio'], aspect)
      gl.uniform2f(prog.uniforms['point'], x, y)
      gl.uniform3f(prog.uniforms['color'], value[0], value[1], value[2])
      gl.uniform1f(prog.uniforms['radius'], radius * radius)
      blit(target.write)
      target.swap()
    }

    function scaleField(target: DoubleFBO, value: number) {
      const prog = programs['clear']
      gl.useProgram(prog.program)
      gl.uniform1i(prog.uniforms['uTexture'], target.read.attach(0))
      gl.uniform1f(prog.uniforms['value'], value)
      blit(target.write)
      target.swap()
    }

    /** the spoon pushes the water; it leaves only a whisper of milk */
    function push(x: number, y: number, dx: number, dy: number, trail: number) {
      const radius = cup.r * 0.085
      splatInto(velocity, x, y, [dx, dy, 0], radius)
      if (trail > 0) splatInto(dye, x, y, [MILK[0] * trail, MILK[1] * trail, MILK[2] * trail], radius * 0.8)
    }

    /** pour a spoonful of milk centred at (x, y) */
    function pour(x: number, y: number, size = 1) {
      const base = cup.r * 0.2 * size
      splatInto(dye, x, y, [MILK[0] * 0.9, MILK[1] * 0.9, MILK[2] * 0.9], base)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + Math.random() * 0.8
        const off = base * (0.55 + Math.random() * 0.5)
        const tone = i % 2 === 0 ? CREAM : MILK
        const k = 0.35 + Math.random() * 0.25
        splatInto(dye, x + (Math.cos(a) * off) / aspect, y + Math.sin(a) * off, [tone[0] * k, tone[1] * k, tone[2] * k], base * (0.45 + Math.random() * 0.25))
      }
    }

    /** spin the whole cup a little faster (rad/s added this frame) */
    function swirl(amount: number) {
      const prog = programs['swirl']
      gl.useProgram(prog.program)
      gl.uniform1i(prog.uniforms['uVelocity'], velocity.read.attach(0))
      gl.uniform3f(prog.uniforms['cup'], cup.cx, cup.cy, cup.r)
      gl.uniform1f(prog.uniforms['aspect'], aspect)
      gl.uniform1f(prog.uniforms['strength'], amount)
      gl.uniform1f(prog.uniforms['scale'], 1 / velocity.texelSizeY)
      blit(velocity.write)
      velocity.swap()
    }

    function correctDelta(dx: number, dy: number): [number, number] {
      if (aspect < 1) dx *= aspect
      else if (aspect > 1) dy /= aspect
      return [dx, dy]
    }

    function step(dt: number) {
      gl.disable(gl.BLEND)

      const curlProg = programs['curl']
      gl.useProgram(curlProg.program)
      gl.uniform2f(curlProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(curlProg.uniforms['uVelocity'], velocity.read.attach(0))
      blit(curlFBO)

      const vortProg = programs['vorticity']
      gl.useProgram(vortProg.program)
      gl.uniform2f(vortProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(vortProg.uniforms['uVelocity'], velocity.read.attach(0))
      gl.uniform1i(vortProg.uniforms['uCurl'], curlFBO.attach(1))
      // Thick liquids smear out the finest swirls, so fewer get topped up.
      gl.uniform1f(vortProg.uniforms['curl'], curlRef.current * Math.max(0.12, 1 - viscosityRef.current * 0.45))
      gl.uniform1f(vortProg.uniforms['dt'], dt)
      blit(velocity.write)
      velocity.swap()

      const divProg = programs['divergence']
      gl.useProgram(divProg.program)
      gl.uniform2f(divProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(divProg.uniforms['uVelocity'], velocity.read.attach(0))
      blit(divergenceFBO)

      scaleField(pressure, 0.8)

      const pressProg = programs['pressure']
      gl.useProgram(pressProg.program)
      gl.uniform2f(pressProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(pressProg.uniforms['uDivergence'], divergenceFBO.attach(0))
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressProg.uniforms['uPressure'], pressure.read.attach(1))
        blit(pressure.write)
        pressure.swap()
      }

      const gradProg = programs['gradientSubtract']
      gl.useProgram(gradProg.program)
      gl.uniform2f(gradProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(gradProg.uniforms['uPressure'], pressure.read.attach(0))
      gl.uniform1i(gradProg.uniforms['uVelocity'], velocity.read.attach(1))
      blit(velocity.write)
      velocity.swap()

      const advProg = programs['advection']
      gl.useProgram(advProg.program)
      gl.uniform3f(advProg.uniforms['cup'], cup.cx, cup.cy, cup.r)
      gl.uniform1f(advProg.uniforms['aspect'], aspect)
      gl.uniform2f(advProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform2f(advProg.uniforms['dyeTexelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(advProg.uniforms['uVelocity'], velocity.read.attach(0))
      gl.uniform1i(advProg.uniforms['uSource'], velocity.read.attach(0))
      gl.uniform1f(advProg.uniforms['dt'], dt)
      gl.uniform1f(advProg.uniforms['dissipation'], viscosityRef.current)
      blit(velocity.write)
      velocity.swap()

      gl.uniform2f(advProg.uniforms['dyeTexelSize'], dye.texelSizeX, dye.texelSizeY)
      gl.uniform1i(advProg.uniforms['uVelocity'], velocity.read.attach(0))
      gl.uniform1i(advProg.uniforms['uSource'], dye.read.attach(1))
      gl.uniform1f(advProg.uniforms['dissipation'], DYE_DISSIPATION)
      blit(dye.write)
      dye.swap()
    }

    // The ring that shows where "you" (finger or spoon) touch the coffee.
    const marker = { x: cup.cx, y: cup.cy, alpha: 0, target: 0 }

    function render() {
      gl.disable(gl.BLEND)
      const dispProg = programs['display']
      gl.useProgram(dispProg.program)
      gl.uniform1i(dispProg.uniforms['uTexture'], dye.read.attach(0))
      gl.uniform3f(dispProg.uniforms['cup'], cup.cx, cup.cy, cup.r)
      gl.uniform1f(dispProg.uniforms['aspect'], aspect)
      gl.uniform3f(dispProg.uniforms['spoon'], marker.x, marker.y, marker.alpha)
      gl.uniform1f(dispProg.uniforms['px'], 1 / canvas!.height)
      blit(null)
    }

    // Demo spoon strokes
    let spoon: { mode: SpoonMode; t: number; prev: SpoonPoint | null; auto: boolean } | null = null

    // Pointers (one finger is enough; extra fingers also stir)
    const pointers: Pointer[] = []

    function toUv(e: PointerEvent): [number, number] {
      const rect = canvas!.getBoundingClientRect()
      return [(e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height]
    }

    function onPointerDown(e: PointerEvent) {
      const [x, y] = toUv(e)
      spoon = null
      if (!interactedRef.current) {
        interactedRef.current = true
        controlsRef.current.registerInteraction()
      }
      let pointer = pointers.find((p) => p.id === e.pointerId)
      if (!pointer) {
        pointer = { id: e.pointerId, texcoordX: x, texcoordY: y, prevTexcoordX: x, prevTexcoordY: y, deltaX: 0, deltaY: 0, down: false, moved: false, travelled: 0 }
        pointers.push(pointer)
      }
      pointer.down = true
      pointer.moved = false
      pointer.travelled = 0
      pointer.texcoordX = pointer.prevTexcoordX = x
      pointer.texcoordY = pointer.prevTexcoordY = y
      pointer.deltaX = pointer.deltaY = 0
    }

    function onPointerMove(e: PointerEvent) {
      const pointer = pointers.find((p) => p.id === e.pointerId)
      if (!pointer || !pointer.down) return
      const [x, y] = toUv(e)
      const [dx, dy] = correctDelta(x - pointer.texcoordX, y - pointer.texcoordY)
      pointer.travelled += Math.hypot(dx, dy)
      pointer.texcoordX = x
      pointer.texcoordY = y
      pointer.moved = true
    }

    function onPointerUp(e: PointerEvent) {
      const pointer = pointers.find((p) => p.id === e.pointerId)
      if (!pointer || !pointer.down) return
      pointer.down = false
      if (pointer.travelled > cup.r * 0.35) {
        setCaption(viscosityRef.current >= 1.2 ? 'thick' : 'push')
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    // Capture phase: overlays above the canvas must not swallow the finger lifting.
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('pointercancel', onPointerUp, true)

    function runCommand(command: Command) {
      for (const p of pointers) p.down = false
      if (command.type === 'fresh' || command.fresh) {
        scaleField(dye, 0)
        scaleField(velocity, 0)
        scaleField(pressure, 0)
      }
      if (command.type === 'fresh') {
        pour(cup.cx + (cup.r * 0.18) / aspect, cup.cy + cup.r * 0.12)
        spoon = null
        return
      }
      if (command.type === 'stir') {
        if (command.fresh) pour(cup.cx + (cup.r * 0.25) / aspect, cup.cy + cup.r * 0.1)
        spoon = { mode: 'stir', t: -(command.delay ?? 0.4), prev: null, auto: false }
        return
      }
      // push: calm the cup first so the new pair of swirls is easy to see
      if (!command.fresh) scaleField(velocity, 0.15)
      pour(cup.cx - (cup.r * 0.42) / aspect, cup.cy - cup.r * 0.04, command.fresh ? 0.85 : 0.6)
      spoon = { mode: 'push', t: -0.35, prev: null, auto: false }
    }

    // On entry: milk is poured, then one gentle stir (unless the story takes over).
    pour(cup.cx + (cup.r * 0.25) / aspect, cup.cy + cup.r * 0.1)
    spoon = { mode: 'stir', t: -0.8, prev: null, auto: true }

    let lastTime = performance.now()
    let raf = 0
    let firstFrame = true

    function frame() {
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 1 / 60)
      lastTime = now

      if (resizeCanvas()) {
        initFramebuffers()
        measureCup()
        pour(cup.cx, cup.cy)
      }

      while (commandsRef.current.length > 0) runCommand(commandsRef.current.shift()!)

      marker.target = 0
      if (spoon) {
        spoon.t += dt
        const pos = spoonPosition(spoon.mode, spoon.t, cup, aspect)
        if (pos) {
          if (spoon.prev) {
            const [dx, dy] = correctDelta(pos.x - spoon.prev.x, pos.y - spoon.prev.y)
            const gain = spoon.mode === 'stir' ? SPOON_GAIN * 0.45 : SPOON_GAIN
            push(pos.x, pos.y, dx * 5000 * gain, dy * 5000 * gain, 0)
          }
          spoon.prev = pos
          if (spoon.mode === 'stir') swirl(STIR_SPIN * dt)
          marker.x = pos.x
          marker.y = pos.y
          marker.target = 1
        } else if (spoon.t > SPOON_DURATION[spoon.mode]) {
          if (spoon.auto) setCaption('idle')
          spoon = null
        }
      }

      for (const pointer of pointers) {
        if (!pointer.down) continue
        marker.x = pointer.texcoordX
        marker.y = pointer.texcoordY
        marker.target = 1
        if (!pointer.moved) continue
        pointer.moved = false
        const [dx, dy] = correctDelta(pointer.texcoordX - pointer.prevTexcoordX, pointer.texcoordY - pointer.prevTexcoordY)
        pointer.prevTexcoordX = pointer.texcoordX
        pointer.prevTexcoordY = pointer.texcoordY
        if (insideCup(cup, aspect, pointer.texcoordX, pointer.texcoordY)) {
          push(pointer.texcoordX, pointer.texcoordY, dx * 5000, dy * 5000, 0.012)
        }
      }
      marker.alpha += (marker.target - marker.alpha) * 0.18

      step(dt)
      render()
      if (firstFrame) {
        firstFrame = false
        setGlStatus('ready')
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerUp, true)
    }
  }, [])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('先搅一圈'),
      body: tx('勺子绕着杯子走两圈，整杯咖啡跟着转起来。奶被拉长、拉细，卷成一条螺旋。'),
      action: () => {
        setViscosity(VISCOSITY_DEFAULT)
        setCurl(CURL_DEFAULT)
        send({ type: 'stir', fresh: true, delay: 0.6 })
      },
      durationMs: 6_400,
    },
    {
      title: tx('快慢交界处，长出旋涡'),
      body: tx('这次勺子只直直推一下。被推的那股水跑得比两边快，快水把慢水卷进来，两侧各卷出一个旋涡，转向相反。'),
      action: () => {
        setViscosity(VISCOSITY_DEFAULT)
        viscosityRef.current = VISCOSITY_DEFAULT
        send({ type: 'push', fresh: true })
      },
      durationMs: 6_400,
    },
    {
      title: tx('换成蜂蜜，旋涡就长不大'),
      body: tx('同样推一下。液体越黏，快慢的差别被抹平得越快，旋涡刚冒头就停了。'),
      action: () => {
        setViscosity(VISCOSITY_HONEY)
        viscosityRef.current = VISCOSITY_HONEY
        send({ type: 'push', fresh: true })
      },
      durationMs: 6_000,
    },
    {
      title: tx('现在轮到你'),
      body: tx('用一根手指在杯里划。不管怎么划，旋涡总出现在快水擦过慢水的地方。'),
      action: () => {
        setViscosity(VISCOSITY_DEFAULT)
        viscosityRef.current = VISCOSITY_DEFAULT
        setCurl(CURL_DEFAULT)
        send({ type: 'fresh' })
      },
      durationMs: 5_600,
    },
  ]

  const captionText: Record<Caption, string> = {
    idle: tx('用一根手指在杯里划一下，就像拿勺子搅咖啡。'),
    stir: tx('勺子带着整杯咖啡转起来，奶被拉成越来越细的螺旋。'),
    push: tx('看勺子走过的两侧：跑得快的那股水，把旁边没动的水卷了进去，一边一个旋涡，转向相反。'),
    thick: tx('黏得像蜂蜜：快慢的差别还没来得及卷起来，就被抹平了。'),
    fresh: tx('新的一杯：奶刚倒进去，还没被搅开。'),
  }

  const liquid = liquidKind(viscosity)
  const liquidLabel = liquid === 'water' ? tx('清水') : liquid === 'oil' ? tx('油') : tx('蜂蜜')
  const detailLabel = curl < 12 ? tx('平滑') : curl < 36 ? tx('适中') : tx('丰富')
  const wide = (cupBox?.width ?? 0) >= 900
  const legendStyle = cupBox
    ? wide
      ? { left: `${cupBox.x + cupBox.r * 1.12 + 32}px`, top: `${cupBox.y}px`, transform: 'translateY(-50%)' }
      : { left: '50%', top: `${cupBox.y + cupBox.r * 1.1 + 14}px`, transform: 'translateX(-50%)' }
    : undefined

  return (
    <div className={`oss-experience fl-experience${storyMode ? ' is-story' : ' is-free'}${glStatus === 'ready' ? ' is-ready' : ''}`}>
      <canvas
        ref={canvasRef}
        className="fl-canvas"
        aria-label={tx('一杯从上往下看的咖啡，白色是奶。用手指在杯里划动来搅拌。')}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
      />

      {glStatus === 'loading' && (
        <div className="fl-loading" aria-live="polite">
          <span className="fl-loading-cup" aria-hidden="true" />
          <span>{tx('正在倒咖啡…')}</span>
        </div>
      )}

      {glStatus === 'failed' && (
        <div className="fl-fallback" role="note">
          <Coffee weight="duotone" aria-hidden="true" />
          <p>{tx('这台设备打不开 WebGL，看不到实时的咖啡。')}</p>
          <p>{captionText.push}</p>
        </div>
      )}

      {!storyMode && (
        <header className="fl-header" data-experience-overlay="true" data-experience-plaque="true">
          <p className="fl-eyebrow">{tx('一杯咖啡 · 从上往下看')}</p>
          <h1 className="fl-title">{tx('搅一杯咖啡，为什么会出现旋涡？')}</h1>
          <p className="fl-caption" key={caption} aria-live="polite">{captionText[caption]}</p>
          <button type="button" className="fl-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" aria-hidden="true" /> {tx('为什么')}
          </button>
        </header>
      )}

      {glStatus === 'ready' && legendStyle && (
        <ul className={`fl-legend${wide ? ' is-side' : ''}`} style={legendStyle} aria-label={tx('图例')} data-experience-overlay="true">
          <li><i className="fl-dot is-milk" aria-hidden="true" />{tx('奶')}</li>
          <li><i className="fl-dot is-coffee" aria-hidden="true" />{tx('咖啡')}</li>
          <li><i className="fl-dot is-you" aria-hidden="true" />{tx('你的手指')}</li>
        </ul>
      )}

      {!storyMode && (
        <Freebar
          className="fl-freebar"
          mainClassName="fl-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={3}
          secondaryDefault="auto"
          secondary={(
            <div className="fl-tray">
              <div className="fl-chip-rail experience-freebar-chips" role="group" aria-label={tx('次级工具')}>
                <button
                  type="button"
                  className="fl-freebar-replay experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('fluid-sim')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
              <div className="fl-secondary-fields">
                <label className="experience-freebar-field fl-slider-group">
                  <span className="fl-slider-head">
                    <span className="fl-slider-label">{tx('液体有多黏')}</span>
                    <strong className="fl-slider-value is-yellow">{liquidLabel}</strong>
                  </span>
                  <input
                    type="range"
                    className="fl-range fl-range-yellow"
                    min="0"
                    max="2"
                    step="0.01"
                    value={viscosity}
                    aria-label={tx('液体有多黏')}
                    aria-valuetext={liquidLabel}
                    onChange={(e) => {
                      controls.registerInteraction()
                      setViscosity(Number(e.target.value))
                      enterFree()
                    }}
                  />
                </label>
                <label className="experience-freebar-field fl-slider-group">
                  <span className="fl-slider-head">
                    <span className="fl-slider-label">{tx('细碎旋涡')}</span>
                    <strong className="fl-slider-value is-purple">{detailLabel}</strong>
                  </span>
                  <input
                    type="range"
                    className="fl-range fl-range-purple"
                    min="0"
                    max="60"
                    step="1"
                    value={curl}
                    aria-label={tx('细碎旋涡')}
                    aria-valuetext={detailLabel}
                    onChange={(e) => {
                      controls.registerInteraction()
                      setCurl(Number(e.target.value))
                      enterFree()
                    }}
                  />
                </label>
              </div>
            </div>
          )}
        >
          <div className="fl-presets experience-freebar-chips experience-freebar-actions" role="group" aria-label={tx('试试看')}>
            <button
              type="button"
              className="fl-preset-btn"
              onClick={() => {
                controls.registerInteraction()
                send({ type: 'stir', fresh: false, delay: 0 })
                enterFree()
              }}
            >
              <ArrowClockwise weight="bold" aria-hidden="true" /> {tx('搅一圈')}
            </button>
            <button
              type="button"
              className="fl-preset-btn"
              onClick={() => {
                controls.registerInteraction()
                send({ type: 'push', fresh: false })
                enterFree()
              }}
            >
              <ArrowRight weight="bold" aria-hidden="true" /> {tx('推一下')}
            </button>
            <button
              type="button"
              className="fl-preset-btn"
              onClick={() => {
                controls.registerInteraction()
                send({ type: 'fresh' })
                enterFree()
              }}
            >
              <Coffee weight="bold" aria-hidden="true" /> {tx('换一杯')}
            </button>
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div
          className="fl-why"
          role="dialog"
          aria-modal="true"
          aria-label={tx('为什么搅一下就有旋涡？')}
          data-experience-overlay="true"
          onClick={(e) => { if (e.target === e.currentTarget) setWhyOpen(false) }}
        >
          <div className="fl-why-card">
            <button type="button" className="fl-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <p className="fl-eyebrow">{tx('为什么搅一下就有旋涡？')}</p>
            <h2>{tx('快水擦过慢水，就会卷起来。')}</h2>
            <p>{tx('勺子推着一股水往前跑，旁边的水还没动。两股速度不同的水贴在一起，交界处就被搓成一个个旋转的卷，就像手掌在桌上搓一根面条。')}</p>
            <p>{tx('杯壁也在帮忙：贴着杯壁的水被拖住，中间的水还在转，那里又是一道快慢交界。')}</p>
            <p>{tx('黏性会把快慢的差别慢慢抹平，所以细小的旋涡先消失，最后整杯咖啡停下来。液体越黏，停得越快。画面里的奶只是被水带着走，它不改变水怎么流。')}</p>
            <h3>{tx('画面背后的方程')}</h3>
            <p>
              {tx('每一帧画面都在求解')}<strong>{tx('纳维-斯托克斯方程')}</strong>{tx('——描述黏性流体运动的偏微分方程。它同时守恒质量（不可压缩）和动量（牛顿第二定律的流体版本），是千禧年七大数学难题之一：我们至今无法证明其三维解是否总存在。')}
            </p>
            <p>
              {tx('本页使用 Jos Stam 的')}<span className="fl-is-purple">{tx('稳定流体法')}</span>{tx('：先平流（把速度场沿自身搬运），再扩散（黏度耗散），最后投影（用压力泊松方程去除散度，保证不可压缩）。涡度约束则把数值耗散丢失的小旋涡补回来，让画面保持丝绸般的卷曲细节。')}
            </p>
            <p>
              <span className="fl-is-red">{tx('边界与假设：')}</span>{tx('本模拟是二维、不可压缩、无重力。真实三维流体还有拉伸涡管、能量级联（Kolmogorov -5/3 律）等丰富结构。这里的“液体有多黏”滑块用速度衰减来近似黏性，“细碎旋涡”滑块对应涡度约束强度 ε。')}
            </p>
            <small>{tx('延伸阅读：Stam 1999 "Stable Fluids" · Fedkiw 2002 涡度约束 · Wikipedia Navier-Stokes existence and smoothness')}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="fluid-sim"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-center', motion: 'rise', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'top-left', mobilePosition: 'top-center', motion: 'fade', width: 'normal', treatment: 'caption', cue: 'right' },
          { position: 'top-left', mobilePosition: 'top-center', motion: 'fade', width: 'normal', treatment: 'caption', cue: 'right' },
          { position: 'top-left', mobilePosition: 'top-center', motion: 'scale', width: 'normal', treatment: 'editorial', cue: 'right' },
        ]}
        onExit={enterFree}
      />
      {!storyMode && glStatus === 'ready' && (
        <GhostHint worldId="fluid-sim" gesture={{ type: 'drag', target: '.fl-canvas', dx: 80, dy: -40, label: tx('用一根手指在杯里划一下') }} />
      )}
    </div>
  )
}
