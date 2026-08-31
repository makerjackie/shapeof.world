import './styles/FluidSim.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Question, Wind, Drop, Spiral, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

/* ============================================================
   WebGL Fluid Simulation — Navier-Stokes Stable Fluids (Jos Stam)
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
  color: [number, number, number]
}

type PresetMode = 'smoke-ring' | 'jet-fountain' | 'vortex-pair'

const SIM_RESOLUTION = 128
const DYE_RESOLUTION = 1024
const PRESSURE_ITERATIONS = 20
const CURL_DEFAULT = 30
const VISCOSITY_DEFAULT = 0.3

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

const copyShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
    gl_FragColor = texture2D(uTexture, vUv);
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
    gl_FragColor = result / decay;
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
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform vec2 texelSize;
  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    // subtle bloom via neighbor sampling
    vec3 lc = texture2D(uTexture, vL).rgb;
    vec3 rc = texture2D(uTexture, vR).rgb;
    vec3 tc = texture2D(uTexture, vT).rgb;
    vec3 bc = texture2D(uTexture, vB).rgb;
    vec3 bloom = (lc + rc + tc + bc) * 0.06;
    c += bloom;
    // Peak-based Reinhard mapping keeps accumulated dye in gamut while
    // preserving its hue instead of clipping bright channels to white.
    float peak = max(c.r, max(c.g, c.b));
    c = c / (1.0 + peak);

    float a = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c, a);
  }
`

function HSVtoRGB(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return [r, g, b]
}

function generateColor(): [number, number, number] {
  const c = HSVtoRGB(Math.random(), 1.0, 1.0)
  return [c[0] * 0.15, c[1] * 0.15, c[2] * 0.15]
}

export function FluidSim({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('fluid-sim')
  const [whyOpen, setWhyOpen] = useState(false)
  const [viscosity, setViscosity] = useState(VISCOSITY_DEFAULT)
  const [curl, setCurl] = useState(CURL_DEFAULT)
  const [preset, setPreset] = useState<PresetMode | null>(null)
  const [fps, setFps] = useState(60)

  const interactedRef = useRef(false)
  const viscosityRef = useRef(viscosity)
  const curlRef = useRef(curl)
  const presetRef = useRef<PresetMode | null>(null)

  viscosityRef.current = viscosity
  curlRef.current = curl

  const applyPreset = useCallback((mode: PresetMode) => {
    presetRef.current = mode
    setPreset(mode)
  }, [])

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = getWebGLContext(canvas)
    if (!ctx) return

    const { gl, ext } = ctx

    // Create quad
    const quadVB = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVB)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const quadIB = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIB)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)

    // Compile shaders
    const vs = compileShader(gl, gl.VERTEX_SHADER, baseVertexShader)!
    const programs: Record<string, { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> }> = {}

    const createProg = (fragSrc: string, name: string) => {
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)!
      const prog = createProgram(gl, vs, fs)!
      programs[name] = { program: prog, uniforms: getUniforms(gl, prog) }
    }

    createProg(copyShader, 'copy')
    createProg(clearShader, 'clear')
    createProg(splatShader, 'splat')
    createProg(advectionShader, 'advection')
    createProg(divergenceShader, 'divergence')
    createProg(curlShader, 'curl')
    createProg(vorticityShader, 'vorticity')
    createProg(pressureShader, 'pressure')
    createProg(gradientSubtractShader, 'gradientSubtract')
    createProg(displayShader, 'display')

    // FBO helpers
    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
      gl!.activeTexture(gl!.TEXTURE0)
      const texture = gl!.createTexture()!
      gl!.bindTexture(gl!.TEXTURE_2D, texture)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, param)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, param)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
      gl!.texImage2D(gl!.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)

      const fbo = gl!.createFramebuffer()!
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo)
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0)
      gl!.viewport(0, 0, w, h)
      gl!.clear(gl!.COLOR_BUFFER_BIT)

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1.0 / w,
        texelSizeY: 1.0 / h,
        attach(id: number) {
          gl!.activeTexture(gl!.TEXTURE0 + id)
          gl!.bindTexture(gl!.TEXTURE_2D, texture)
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
      let aspectRatio = gl!.drawingBufferWidth / gl!.drawingBufferHeight
      if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio
      const min = Math.round(resolution)
      const max = Math.round(resolution * aspectRatio)
      if (gl!.drawingBufferWidth > gl!.drawingBufferHeight) {
        return { width: max, height: min }
      }
      return { width: min, height: max }
    }

    const texType = ext.halfFloatTexType
    const rgba = ext.formatRGBA
    const rg = ext.formatRG
    const r = ext.formatR
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST

    let simWidth = 0, simHeight = 0, dyeWidth = 0, dyeHeight = 0
    let velocity: DoubleFBO
    let dye: DoubleFBO
    let divergenceFBO: FBO
    let curlFBO: FBO
    let pressure: DoubleFBO

    function initFramebuffers() {
      const simRes = getResolution(SIM_RESOLUTION)
      const dyeRes = getResolution(DYE_RESOLUTION)
      simWidth = simRes.width
      simHeight = simRes.height
      dyeWidth = dyeRes.width
      dyeHeight = dyeRes.height

      velocity = createDoubleFBO(simWidth, simHeight, rg.internalFormat, rg.format, texType, filtering)
      dye = createDoubleFBO(dyeWidth, dyeHeight, rgba.internalFormat, rgba.format, texType, filtering)
      divergenceFBO = createFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl.NEAREST)
      curlFBO = createFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl.NEAREST)
      pressure = createDoubleFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl.NEAREST)
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.floor(canvas!.clientWidth * dpr)
      const h = Math.floor(canvas!.clientHeight * dpr)
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w
        canvas!.height = h
        return true
      }
      return false
    }

    resizeCanvas()
    initFramebuffers()

    // Blit helper
    const blitVAO = gl.createVertexArray ? gl.createVertexArray() : null
    if (blitVAO) {
      gl.bindVertexArray(blitVAO)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVB)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIB)

    function blit(target: FBO | null) {
      if (target) {
        gl!.viewport(0, 0, target.width, target.height)
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo)
      } else {
        gl!.viewport(0, 0, gl!.drawingBufferWidth, gl!.drawingBufferHeight)
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
      }
      gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0)
    }

    // Splat function
    function splat(x: number, y: number, dx: number, dy: number, color: [number, number, number]) {
      const prog = programs['splat']
      gl!.useProgram(prog.program)
      gl!.uniform1i(prog.uniforms['uTarget'], velocity.read.attach(0))
      gl!.uniform1f(prog.uniforms['aspectRatio'], canvas!.width / canvas!.height)
      gl!.uniform2f(prog.uniforms['point'], x, y)
      gl!.uniform3f(prog.uniforms['color'], dx, dy, 0.0)
      gl!.uniform1f(prog.uniforms['radius'], correctRadius(0.25 / 100.0))
      blit(velocity.write)
      velocity.swap()

      gl!.uniform1i(prog.uniforms['uTarget'], dye.read.attach(0))
      gl!.uniform3f(prog.uniforms['color'], color[0], color[1], color[2])
      blit(dye.write)
      dye.swap()
    }

    function correctRadius(radius: number) {
      const aspectRatio = canvas!.width / canvas!.height
      if (aspectRatio > 1) radius *= aspectRatio
      return radius
    }

    // Simulation step
    function step(dt: number) {
      gl!.disable(gl!.BLEND)

      // Curl
      const curlProg = programs['curl']
      gl!.useProgram(curlProg.program)
      gl!.uniform2f(curlProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl!.uniform1i(curlProg.uniforms['uVelocity'], velocity.read.attach(0))
      blit(curlFBO)

      // Vorticity confinement
      const vortProg = programs['vorticity']
      gl!.useProgram(vortProg.program)
      gl!.uniform2f(vortProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl!.uniform1i(vortProg.uniforms['uVelocity'], velocity.read.attach(0))
      gl!.uniform1i(vortProg.uniforms['uCurl'], curlFBO.attach(1))
      gl!.uniform1f(vortProg.uniforms['curl'], curlRef.current)
      gl!.uniform1f(vortProg.uniforms['dt'], dt)
      blit(velocity.write)
      velocity.swap()

      // Divergence
      const divProg = programs['divergence']
      gl!.useProgram(divProg.program)
      gl!.uniform2f(divProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl!.uniform1i(divProg.uniforms['uVelocity'], velocity.read.attach(0))
      blit(divergenceFBO)

      // Clear pressure
      const clearProg = programs['clear']
      gl!.useProgram(clearProg.program)
      gl!.uniform1i(clearProg.uniforms['uTexture'], pressure.read.attach(0))
      gl!.uniform1f(clearProg.uniforms['value'], 0.8)
      blit(pressure.write)
      pressure.swap()

      // Pressure solve (Jacobi iteration)
      const pressProg = programs['pressure']
      gl!.useProgram(pressProg.program)
      gl!.uniform2f(pressProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl!.uniform1i(pressProg.uniforms['uDivergence'], divergenceFBO.attach(0))
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        gl!.uniform1i(pressProg.uniforms['uPressure'], pressure.read.attach(1))
        blit(pressure.write)
        pressure.swap()
      }

      // Gradient subtract
      const gradProg = programs['gradientSubtract']
      gl!.useProgram(gradProg.program)
      gl!.uniform2f(gradProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl!.uniform1i(gradProg.uniforms['uPressure'], pressure.read.attach(0))
      gl!.uniform1i(gradProg.uniforms['uVelocity'], velocity.read.attach(1))
      blit(velocity.write)
      velocity.swap()

      // Advect velocity
      const advProg = programs['advection']
      gl!.useProgram(advProg.program)
      gl!.uniform2f(advProg.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl!.uniform2f(advProg.uniforms['dyeTexelSize'], velocity.texelSizeX, velocity.texelSizeY)
      gl!.uniform1i(advProg.uniforms['uVelocity'], velocity.read.attach(0))
      gl!.uniform1i(advProg.uniforms['uSource'], velocity.read.attach(0))
      gl!.uniform1f(advProg.uniforms['dt'], dt)
      gl!.uniform1f(advProg.uniforms['dissipation'], viscosityRef.current)
      blit(velocity.write)
      velocity.swap()

      // Advect dye
      gl!.uniform2f(advProg.uniforms['dyeTexelSize'], dye.texelSizeX, dye.texelSizeY)
      gl!.uniform1i(advProg.uniforms['uVelocity'], velocity.read.attach(0))
      gl!.uniform1i(advProg.uniforms['uSource'], dye.read.attach(1))
      gl!.uniform1f(advProg.uniforms['dissipation'], 0.97 + viscosityRef.current * 0.02)
      blit(dye.write)
      dye.swap()
    }

    function render() {
      gl!.enable(gl!.BLEND)
      gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA)

      const dispProg = programs['display']
      gl!.useProgram(dispProg.program)
      gl!.uniform2f(dispProg.uniforms['texelSize'], 1.0 / canvas!.width, 1.0 / canvas!.height)
      gl!.uniform1i(dispProg.uniforms['uTexture'], dye.read.attach(0))
      blit(null)
    }

    // Pointers
    const pointers: Pointer[] = [
      {
        id: -1, texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0,
        deltaX: 0, deltaY: 0, down: false, moved: false, color: [0.3, 0, 0],
      },
    ]

    function updatePointerDownData(pointer: Pointer, id: number, posX: number, posY: number) {
      pointer.id = id
      pointer.down = true
      pointer.moved = false
      pointer.texcoordX = posX / canvas!.width
      pointer.texcoordY = 1.0 - posY / canvas!.height
      pointer.prevTexcoordX = pointer.texcoordX
      pointer.prevTexcoordY = pointer.texcoordY
      pointer.deltaX = 0
      pointer.deltaY = 0
      pointer.color = generateColor()
    }

    function updatePointerMoveData(pointer: Pointer, posX: number, posY: number) {
      pointer.prevTexcoordX = pointer.texcoordX
      pointer.prevTexcoordY = pointer.texcoordY
      pointer.texcoordX = posX / canvas!.width
      pointer.texcoordY = 1.0 - posY / canvas!.height
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX)
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY)
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0
    }

    function correctDeltaX(delta: number) {
      const aspectRatio = canvas!.width / canvas!.height
      if (aspectRatio < 1) delta *= aspectRatio
      return delta
    }

    function correctDeltaY(delta: number) {
      const aspectRatio = canvas!.width / canvas!.height
      if (aspectRatio > 1) delta /= aspectRatio
      return delta
    }

    function splatPointer(pointer: Pointer) {
      const dx = pointer.deltaX * 5000
      const dy = pointer.deltaY * 5000
      splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color)
    }

    // Preset animations
    const DEMO_SPLAT_INTERVAL = 1 / 30
    let presetTimer = 0
    let presetSplatAccumulator = 0
    function runPreset(mode: PresetMode, time: number) {
      const cx = 0.5
      const cy = 0.5
      if (mode === 'smoke-ring') {
        const count = 12
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + time * 2
          const r = 0.15
          const px = cx + Math.cos(angle) * r
          const py = cy + Math.sin(angle) * r
          const dx = Math.cos(angle) * 300
          const dy = Math.sin(angle) * 300
          const color = HSVtoRGB(i / count, 0.9, 0.8)
          splat(px, py, dx, dy, [color[0] * 0.12, color[1] * 0.12, color[2] * 0.12])
        }
      } else if (mode === 'jet-fountain') {
        const spread = Math.sin(time * 3) * 0.1
        const color = HSVtoRGB((time * 0.1) % 1, 1.0, 1.0)
        splat(cx + spread, 0.15, spread * 200, 800, [color[0] * 0.15, color[1] * 0.15, color[2] * 0.15])
        splat(cx - spread * 0.5, 0.12, -spread * 100, 600, [color[0] * 0.1, color[1] * 0.1, color[2] * 0.12])
      } else if (mode === 'vortex-pair') {
        const offset = 0.18
        const strength = 400
        const c1 = HSVtoRGB(0.55, 1.0, 1.0)
        const c2 = HSVtoRGB(0.85, 1.0, 1.0)
        splat(cx - offset, cy, 0, strength, [c1[0] * 0.12, c1[1] * 0.12, c1[2] * 0.12])
        splat(cx + offset, cy, 0, -strength, [c2[0] * 0.12, c2[1] * 0.12, c2[2] * 0.12])
        // rotational component
        const angle = time * 4
        splat(cx - offset + Math.cos(angle) * 0.05, cy + Math.sin(angle) * 0.05,
          -Math.sin(angle) * 200, Math.cos(angle) * 200,
          [c1[0] * 0.08, c1[1] * 0.08, c1[2] * 0.08])
        splat(cx + offset + Math.cos(angle + Math.PI) * 0.05, cy + Math.sin(angle + Math.PI) * 0.05,
          Math.sin(angle) * 200, -Math.cos(angle) * 200,
          [c2[0] * 0.08, c2[1] * 0.08, c2[2] * 0.08])
      }
    }

    // Auto-demo on entry
    let autoDemoTime = 0
    let autoDemoSplatAccumulator = 0
    let autoDemoActive = true
    function runAutoDemo(dt: number) {
      autoDemoTime += dt
      if (autoDemoTime > 6.0) {
        autoDemoActive = false
        return
      }
      autoDemoSplatAccumulator += dt
      if (autoDemoSplatAccumulator < DEMO_SPLAT_INTERVAL) return
      autoDemoSplatAccumulator %= DEMO_SPLAT_INTERVAL
      const t = autoDemoTime
      const count = 6
      for (let i = 0; i < count; i++) {
        const angle = t * 2.5 + (i / count) * Math.PI * 2
        const r = 0.15 + Math.sin(t * 1.5 + i) * 0.08
        const px = 0.5 + Math.cos(angle) * r
        const py = 0.5 + Math.sin(angle) * r
        const speed = 400 + Math.sin(t * 3 + i * 2) * 150
        const dx = Math.cos(angle + Math.PI * 0.5) * speed
        const dy = Math.sin(angle + Math.PI * 0.5) * speed
        const color = HSVtoRGB((t * 0.12 + i / count) % 1, 1.0, 1.0)
        splat(px, py, dx, dy, [color[0] * 0.2, color[1] * 0.2, color[2] * 0.2])
      }
      // Central vortex burst
      if (t < 1.5) {
        const burstAngle = t * 8
        const burstR = 0.05
        splat(0.5 + Math.cos(burstAngle) * burstR, 0.5 + Math.sin(burstAngle) * burstR,
          Math.cos(burstAngle) * 600, Math.sin(burstAngle) * 600,
          [0.15, 0.08, 0.2])
      }
    }

    // Event handlers
    function onPointerDown(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      const posX = (e.clientX - rect.left) * (canvas!.width / rect.width)
      const posY = (e.clientY - rect.top) * (canvas!.height / rect.height)

      autoDemoActive = false
      presetRef.current = null
      setPreset(null)

      if (!interactedRef.current) {
        interactedRef.current = true
        controls.registerInteraction()
      }

      let pointer = pointers.find((p) => p.id === e.pointerId)
      if (!pointer) {
        pointer = {
          id: e.pointerId, texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0,
          deltaX: 0, deltaY: 0, down: false, moved: false, color: [0.3, 0, 0],
        }
        pointers.push(pointer)
      }
      updatePointerDownData(pointer, e.pointerId, posX, posY)
    }

    function onPointerMove(e: PointerEvent) {
      const pointer = pointers.find((p) => p.id === e.pointerId)
      if (!pointer || !pointer.down) return

      const rect = canvas!.getBoundingClientRect()
      const posX = (e.clientX - rect.left) * (canvas!.width / rect.width)
      const posY = (e.clientY - rect.top) * (canvas!.height / rect.height)
      updatePointerMoveData(pointer, posX, posY)
    }

    function onPointerUp(e: PointerEvent) {
      const pointer = pointers.find((p) => p.id === e.pointerId)
      if (pointer) pointer.down = false
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    // Animation loop
    let lastTime = performance.now()
    let frameCount = 0
    let fpsAccum = 0
    let raf = 0

    function frame() {
      const now = performance.now()
      let dt = (now - lastTime) / 1000
      dt = Math.min(dt, 0.016666)
      lastTime = now

      // FPS counter
      frameCount++
      fpsAccum += dt
      if (fpsAccum >= 1.0) {
        setFps(Math.round(frameCount / fpsAccum))
        frameCount = 0
        fpsAccum = 0
      }

      if (resizeCanvas()) {
        initFramebuffers()
      }

      // Auto demo
      if (autoDemoActive && !presetRef.current) {
        runAutoDemo(dt)
      }

      // Preset
      if (presetRef.current) {
        presetTimer += dt
        presetSplatAccumulator += dt
        if (presetSplatAccumulator >= DEMO_SPLAT_INTERVAL) {
          presetSplatAccumulator %= DEMO_SPLAT_INTERVAL
          runPreset(presetRef.current, presetTimer)
        }
      }

      // Apply pointer splats
      for (const pointer of pointers) {
        if (pointer.moved && pointer.down) {
          pointer.moved = false
          splatPointer(pointer)
        }
      }

      step(dt)
      render()
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('先看一团烟怎样卷成圆环'),
      body: tx('流体向前冲时，会把旁边较慢的部分卷回来。一个旋转的烟圈就这样长出来。'),
      action: () => {
        setViscosity(0.08)
        setCurl(34)
        applyPreset('smoke-ring')
      },
      durationMs: 5_600,
    },
    {
      title: tx('漩涡会推着另一个漩涡走'),
      body: tx('两个反向旋转的涡旋会互相带动，成对向前移动。你在咖啡、云层和飞机尾流里都能看到类似结构。'),
      action: () => applyPreset('vortex-pair'),
      durationMs: 5_800,
    },
    {
      title: tx('黏稠，会让流动慢下来'),
      body: tx('把流体从清水变得像蜂蜜，细小旋转会更快消失，边缘也不再那么锋利。'),
      action: () => {
        setViscosity(1.55)
        setCurl(16)
        applyPreset('jet-fountain')
      },
      durationMs: 5_800,
    },
    {
      title: tx('现在轮到你留下自己的水痕'),
      body: tx('这些变化可以用纳维－斯托克斯方程描述。先记住一句人话：速度会被带着走，也会被黏性慢慢抹平。'),
      action: () => {
        setViscosity(VISCOSITY_DEFAULT)
        setCurl(CURL_DEFAULT)
        applyPreset('smoke-ring')
      },
      durationMs: 5_600,
    },
  ]

  return (
    <div className={`oss-experience fl-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="fl-canvas"
        style={{ touchAction: 'none', cursor: 'crosshair' }}
      />

      {!storyMode && (
        <header className="fl-header" data-experience-overlay="true" data-experience-plaque="true">
          <h1 className="fl-title">{tx('为什么流体总能形成优美的漩涡？')}</h1>
          <p className="fl-subtitle">{tx('拖一下，看水痕怎样被带走、卷起，再慢慢散开。')}</p>
          <button type="button" className="fl-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx('为什么')}
          </button>
        </header>
      )}

      <aside className="fl-readout" data-experience-overlay="true" data-freebar-clearance="true">
        <div className="fl-readout-row">
          <small>{tx('帧率')}</small>
          <strong className="fl-val-cyan">{fps} FPS</strong>
        </div>
        <div className="fl-readout-row">
          <small>{tx('黏度')}</small>
          <strong className="fl-val-yellow">{viscosity.toFixed(2)}</strong>
        </div>
        <div className="fl-readout-row">
          <small>{tx('涡度')}</small>
          <strong className="fl-val-purple">{curl.toFixed(0)}</strong>
        </div>
      </aside>

      {!storyMode && (
        <Freebar
          className="fl-freebar"
          mainClassName="fl-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={3}
          secondaryDefault="open"
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
                <div className="experience-freebar-field fl-slider-group">
                  <div>
                    <span className="fl-slider-label">{tx('黏度')}</span>
                    <strong>{viscosity < 0.5 ? tx('清水') : viscosity < 1.2 ? tx('油') : tx('蜂蜜')}</strong>
                  </div>
                  <input
                    type="range"
                    className="fl-range fl-range-yellow"
                    min="0"
                    max="2"
                    step="0.01"
                    value={viscosity}
                    aria-label={tx('黏度')}
                    onChange={(e) => {
                      controls.registerInteraction()
                      setViscosity(Number(e.target.value))
                      enterFree()
                    }}
                  />
                </div>
                <div className="experience-freebar-field fl-slider-group">
                  <div>
                    <span className="fl-slider-label">{tx('涡度')}</span>
                    <strong>{curl < 15 ? tx('层流') : curl < 35 ? tx('过渡') : tx('湍流')}</strong>
                  </div>
                  <input
                    type="range"
                    className="fl-range fl-range-purple"
                    min="0"
                    max="60"
                    step="1"
                    value={curl}
                    aria-label={tx('涡度')}
                    onChange={(e) => {
                      controls.registerInteraction()
                      setCurl(Number(e.target.value))
                      enterFree()
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        >
          <div className="fl-presets experience-freebar-chips experience-freebar-actions" role="group" aria-label={tx('流体预设')}>
            <button
              type="button"
              className={`fl-preset-btn ${preset === 'smoke-ring' ? 'is-active' : ''}`}
              onClick={() => {
                controls.registerInteraction()
                applyPreset('smoke-ring')
                enterFree()
              }}
            >
              <Wind weight="bold" /> {tx('烟圈')}
            </button>
            <button
              type="button"
              className={`fl-preset-btn ${preset === 'jet-fountain' ? 'is-active' : ''}`}
              onClick={() => {
                controls.registerInteraction()
                applyPreset('jet-fountain')
                enterFree()
              }}
            >
              <Drop weight="bold" /> {tx('喷泉')}
            </button>
            <button
              type="button"
              className={`fl-preset-btn ${preset === 'vortex-pair' ? 'is-active' : ''}`}
              onClick={() => {
                controls.registerInteraction()
                applyPreset('vortex-pair')
                enterFree()
              }}
            >
              <Spiral weight="bold" /> {tx('双涡')}
            </button>
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="fl-why" role="dialog" aria-label={tx('流体力学原理解释')} data-experience-overlay="true">
          <div className="fl-why-card">
            <button type="button" className="fl-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <h2>{tx('纳维-斯托克斯方程：流体为何如此优美？')}</h2>
            <p>
              {tx('每一帧画面都在求解')}<strong>{tx('纳维-斯托克斯方程')}</strong>{tx('——描述黏性流体运动的偏微分方程。它同时守恒质量（不可压缩）和动量（牛顿第二定律的流体版本），是千禧年七大数学难题之一：我们至今无法证明其三维解是否总存在。')}
            </p>
            <p>
              {tx('本页使用 Jos Stam 的')}<span className="fl-is-purple">{tx('稳定流体法')}</span>{tx('：先平流（把速度场沿自身搬运），再扩散（黏度耗散），最后投影（用压力泊松方程去除散度，保证不可压缩）。涡度约束则把数值耗散丢失的小旋涡补回来，让画面保持丝绸般的卷曲细节。')}
            </p>
            <p>
              <span className="fl-is-red">{tx('边界与假设：')}</span>{tx('本模拟是二维、不可压缩、无重力场。真实三维流体还有拉伸涡管、能量级联（Kolmogorov -5/3 律）等丰富结构。黏度滑块对应运动黏度 ν，涡度滑块对应涡度约束强度 ε。')}
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
          { position: 'top-right', mobilePosition: 'top-center', motion: 'drift-left', width: 'normal', treatment: 'caption', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-center', motion: 'fade', width: 'narrow', treatment: 'annotation', cue: 'right' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'scale', width: 'wide', treatment: 'monumental', cue: 'up' },
        ]}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint worldId="fluid-sim" gesture={{ type: 'drag', target: '.fl-canvas', dx: 80, dy: -40, label: tx('按住拖动，注入流体') }} />
      )}
    </div>
  )
}
