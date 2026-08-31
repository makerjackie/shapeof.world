import './styles/MandelbrotZoom.css'

import { useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwise, Palette, Pause, Play, Question, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/**
 * Famous boundary landmarks. Auto-zoom cycles through these when the
 * double-single GPU path hits its practical precision ceiling (~1e14).
 * The math is infinite; the renderer hops to the next valley so the
 * journey still feels endless.
 */
const LANDMARKS = [
  {
    id: 'seahorse',
    label: '海马谷',
    cx: -0.7435168,
    cy: 0.1314002,
  },
  {
    id: 'elephant',
    label: '象限谷',
    cx: -0.745428,
    cy: 0.113009,
  },
  {
    id: 'mini',
    label: '迷你曼德博',
    cx: -1.749,
    cy: 0.0,
  },
  {
    id: 'spiral',
    label: '螺旋',
    cx: -0.16,
    cy: 1.0407,
  },
  {
    id: 'antenna',
    label: '天线',
    cx: -1.9855,
    cy: 0.0,
  },
  {
    id: 'julia-gate',
    label: 'Julia 门',
    cx: -0.4,
    cy: 0.6,
  },
] as const

const AUTO_ZOOM_SPEED = 0.35 // zoom multiplier per second (exponential)
const MAX_ZOOM = 1e14
const MIN_ZOOM = 0.8
/** When auto-zoom reaches this, hop to the next landmark instead of stopping. */
const HOP_ZOOM = MAX_ZOOM * 0.5
/** After a hop, resume auto-zoom from this modest magnification. */
const HOP_RESUME_ZOOM = 2.5
const HOP_NOTE_MS = 2800

const PALETTES = [
  { label: '星云配色', swatch: '#4dd0e1' },
  { label: '深海配色', swatch: '#1a5276' },
  { label: '熔岩配色', swatch: '#ff6b6b' },
  { label: '极光配色', swatch: '#34d399' },
] as const

/* ------------------------------------------------------------------ */
/* WebGL Shaders                                                       */
/* ------------------------------------------------------------------ */

const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

/**
 * Fragment shader using emulated double-single precision (ds_add, ds_mul)
 * for deep zoom beyond float32 limits. Smooth coloring via continuous
 * escape time algorithm.
 */
const FRAGMENT_SRC = `
precision highp float;

uniform vec2 u_resolution;
// Center in double-single: (hi, lo) for real and imaginary
uniform vec2 u_centerRe;
uniform vec2 u_centerIm;
// Zoom: half-height of the view in complex plane (double-single)
uniform vec2 u_scale;
uniform float u_maxIter;
uniform float u_palette;
uniform float u_time;
// Julia mode: if u_juliaMode > 0.5, use u_juliaC as the constant
uniform float u_juliaMode;
uniform vec2 u_juliaC;

/* --- double-single arithmetic (Kahan-style) --- */
vec2 ds_add(vec2 a, vec2 b) {
  float t1 = a.x + b.x;
  float e = t1 - a.x;
  float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
  float hi = t1 + t2;
  float lo = t2 - (hi - t1);
  return vec2(hi, lo);
}

vec2 ds_mul(vec2 a, vec2 b) {
  float c11 = a.x * b.x;
  float c21 = a.x * b.y + a.y * b.x;
  float t1 = c11 + c21;
  float e = t1 - c11;
  float t2 = ((c21 - e) + (c11 - (t1 - e))) + (a.y * b.y);
  float hi = t1 + t2;
  float lo = t2 - (hi - t1);
  return vec2(hi, lo);
}

vec2 ds_sub(vec2 a, vec2 b) {
  return ds_add(a, vec2(-b.x, -b.y));
}

/* --- color palettes --- */
vec3 palette0(float t) {
  // Nebula: cyan -> purple -> gold
  vec3 a = vec3(0.02, 0.01, 0.04);
  vec3 b = vec3(0.6, 0.85, 0.9);
  vec3 c = vec3(0.7, 0.35, 1.0);
  vec3 d = vec3(1.0, 0.82, 0.4);
  float s = fract(t);
  if (s < 0.33) return mix(a, b, s / 0.33);
  if (s < 0.66) return mix(b, c, (s - 0.33) / 0.33);
  return mix(c, d, (s - 0.66) / 0.34);
}

vec3 palette1(float t) {
  // Deep sea: dark blue -> teal -> white foam
  vec3 a = vec3(0.01, 0.02, 0.06);
  vec3 b = vec3(0.05, 0.2, 0.45);
  vec3 c = vec3(0.1, 0.7, 0.75);
  vec3 d = vec3(0.85, 0.95, 1.0);
  float s = fract(t);
  if (s < 0.33) return mix(a, b, s / 0.33);
  if (s < 0.66) return mix(b, c, (s - 0.33) / 0.33);
  return mix(c, d, (s - 0.66) / 0.34);
}

vec3 palette2(float t) {
  // Lava: black -> deep red -> orange -> yellow
  vec3 a = vec3(0.02, 0.0, 0.0);
  vec3 b = vec3(0.5, 0.05, 0.02);
  vec3 c = vec3(0.95, 0.35, 0.05);
  vec3 d = vec3(1.0, 0.9, 0.3);
  float s = fract(t);
  if (s < 0.33) return mix(a, b, s / 0.33);
  if (s < 0.66) return mix(b, c, (s - 0.33) / 0.33);
  return mix(c, d, (s - 0.66) / 0.34);
}

vec3 palette3(float t) {
  // Aurora: dark -> green -> cyan -> magenta
  vec3 a = vec3(0.01, 0.02, 0.03);
  vec3 b = vec3(0.1, 0.75, 0.35);
  vec3 c = vec3(0.2, 0.85, 0.8);
  vec3 d = vec3(0.75, 0.2, 0.9);
  float s = fract(t);
  if (s < 0.33) return mix(a, b, s / 0.33);
  if (s < 0.66) return mix(b, c, (s - 0.33) / 0.33);
  return mix(c, d, (s - 0.66) / 0.34);
}

vec3 getColor(float t, float pal) {
  if (pal < 0.5) return palette0(t);
  if (pal < 1.5) return palette1(t);
  if (pal < 2.5) return palette2(t);
  return palette3(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Map pixel to complex plane using double-single
  vec2 px = ds_mul(vec2(uv.x, 0.0), u_scale);
  vec2 py = ds_mul(vec2(uv.y, 0.0), u_scale);
  vec2 cr = ds_add(u_centerRe, px);
  vec2 ci = ds_add(u_centerIm, py);

  // For Julia mode, c is fixed and z starts at pixel
  vec2 zr, zi, cR, cI;
  if (u_juliaMode > 0.5) {
    zr = cr;
    zi = ci;
    cR = vec2(u_juliaC.x, 0.0);
    cI = vec2(u_juliaC.y, 0.0);
  } else {
    zr = vec2(0.0, 0.0);
    zi = vec2(0.0, 0.0);
    cR = cr;
    cI = ci;
  }

  float iter = 0.0;
  float zr2, zi2;
  const float BAILOUT = 256.0;

  for (float i = 0.0; i < 2500.0; i += 1.0) {
    if (i >= u_maxIter) break;

    // z = z^2 + c using double-single
    vec2 zr_new = ds_add(ds_sub(ds_mul(zr, zr), ds_mul(zi, zi)), cR);
    vec2 zi_new = ds_add(ds_add(ds_mul(zr, zi), ds_mul(zi, zr)), cI);
    zr = zr_new;
    zi = zi_new;

    zr2 = zr.x * zr.x;
    zi2 = zi.x * zi.x;
    if (zr2 + zi2 > BAILOUT * BAILOUT) {
      // Smooth coloring: continuous escape time
      float log_zn = log(zr2 + zi2) * 0.5;
      float nu = log(log_zn / log(BAILOUT)) / log(2.0);
      iter = i + 1.0 - nu;
      break;
    }
    iter = i + 1.0;
  }

  // Interior: deep black with subtle purple glow
  if (iter >= u_maxIter - 1.0) {
    float glow = 0.03 + 0.02 * sin(u_time * 0.5);
    gl_FragColor = vec4(glow * 0.4, glow * 0.1, glow * 0.8, 1.0);
    return;
  }

  // Color mapping with palette cycling based on zoom depth
  float t = iter * 0.02 + u_time * 0.01;
  vec3 col = getColor(t, u_palette);

  // Subtle anti-aliasing: darken based on iteration density
  float aa = 1.0 - 0.08 * fract(iter);
  col *= aa;

  // Vignette
  vec2 vuv = gl_FragCoord.xy / u_resolution;
  float vig = 1.0 - 0.3 * length((vuv - 0.5) * 1.4);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Split a JS number into double-single (hi, lo) pair */
function toDS(value: number): [number, number] {
  const hi = Math.fround(value)
  const lo = value - hi
  return [hi, lo]
}

function readDeepLink(): { cx: number; cy: number; zoom: number } | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const cx = Number(q.get('cx'))
  const cy = Number(q.get('cy'))
  const zoom = Number(q.get('zoom'))
  if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(zoom) && zoom > 0) {
    return { cx, cy, zoom }
  }
  return null
}

function formatZoom(zoom: number): string {
  if (zoom < 1000) return `${zoom.toFixed(1)}×`
  const exp = Math.log10(zoom)
  return `10^${exp.toFixed(1)}×`
}

function nearestLandmarkIndex(cx: number, cy: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < LANDMARKS.length; i++) {
    const dx = LANDMARKS[i].cx - cx
    const dy = LANDMARKS[i].cy - cy
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function MandelbrotZoom({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('mandelbrot-zoom')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [whyOpen, setWhyOpen] = useState(false)
  const [juliaMode, setJuliaMode] = useState(false)
  const [paletteIdx, setPaletteIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hud, setHud] = useState({ zoom: 1, cx: -0.5, cy: 0 })
  const [glReady, setGlReady] = useState(false)
  const [activeLandmark, setActiveLandmark] = useState(0)
  /** Passive HUD label after a precision-limit hop; null when hidden. */
  const [hopNoteLabel, setHopNoteLabel] = useState<string | null>(null)

  const st = useRef({
    cx: -0.5,
    cy: 0.0,
    zoom: 1.0, // magnification factor
    playing: true,
    juliaMode: false,
    juliaAngle: 0,
    palette: 0,
    landmarkIndex: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCx: 0,
    dragCy: 0,
    pinchDist: 0,
    userInteracted: false,
    lastNow: 0,
    motionTime: 0,
    hudAt: 0,
    hopNoteUntil: 0,
    hopNoteActive: false,
    needsRender: true,
  })

  // Initialize from deep link
  useEffect(() => {
    const deep = readDeepLink()
    if (deep) {
      st.current.cx = deep.cx
      st.current.cy = deep.cy
      st.current.zoom = deep.zoom
      st.current.playing = false
      st.current.landmarkIndex = nearestLandmarkIndex(deep.cx, deep.cy)
      setPlaying(false)
      setActiveLandmark(st.current.landmarkIndex)
      setHud((h) => ({ ...h, zoom: deep.zoom, cx: deep.cx, cy: deep.cy }))
    }
    controls.completeOnboarding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])

  // Sync React state to ref
  useEffect(() => {
    st.current.juliaMode = juliaMode
  }, [juliaMode])
  useEffect(() => {
    st.current.palette = paletteIdx
  }, [paletteIdx])
  useEffect(() => {
    st.current.playing = playing
  }, [playing])

  /* ---- WebGL setup and render loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
    if (!gl) return

    // Compile shaders
    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader))
        return null
      }
      return shader
    }
    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    if (!vs || !fs) return

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    // Full-screen quad
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Uniforms
    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uCenterRe = gl.getUniformLocation(program, 'u_centerRe')
    const uCenterIm = gl.getUniformLocation(program, 'u_centerIm')
    const uScale = gl.getUniformLocation(program, 'u_scale')
    const uMaxIter = gl.getUniformLocation(program, 'u_maxIter')
    const uPalette = gl.getUniformLocation(program, 'u_palette')
    const uTime = gl.getUniformLocation(program, 'u_time')
    const uJuliaMode = gl.getUniformLocation(program, 'u_juliaMode')
    const uJuliaC = gl.getUniformLocation(program, 'u_juliaC')

    setGlReady(true)
    let raf = 0

    const render = (now: number) => {
      const s = st.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const pw = Math.round(w * dpr)
      const ph = Math.round(h * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      gl.viewport(0, 0, pw, ph)

      const dt = s.lastNow ? Math.min((now - s.lastNow) / 1000, 0.05) : 0
      s.lastNow = now

      // Keep rendering while paused so manual pan/zoom remains responsive,
      // but freeze every time-driven part of the image.
      if (s.playing) {
        s.motionTime += dt
      }

      // Auto-zoom animation through landmarks (Mandelbrot mode only)
      if (s.playing && !s.dragging && !s.juliaMode) {
        const factor = Math.exp(AUTO_ZOOM_SPEED * dt)
        s.zoom = Math.min(MAX_ZOOM, s.zoom * factor)
        // Ease center toward current landmark target
        const target = LANDMARKS[s.landmarkIndex] ?? LANDMARKS[0]
        const ease = 1 - Math.exp(-1.5 * dt)
        s.cx += (target.cx - s.cx) * ease
        s.cy += (target.cy - s.cy) * ease

        // At practical GPU precision limit: hop to next landmark and keep going
        if (s.zoom >= HOP_ZOOM) {
          s.landmarkIndex = (s.landmarkIndex + 1) % LANDMARKS.length
          const next = LANDMARKS[s.landmarkIndex]
          s.cx = next.cx
          s.cy = next.cy
          s.zoom = HOP_RESUME_ZOOM
          s.hopNoteUntil = now + HOP_NOTE_MS
          s.hopNoteActive = true
          setHopNoteLabel(next.label)
          setActiveLandmark(s.landmarkIndex)
        }
      }

      // Clear hop note when its window ends
      if (s.hopNoteActive && now >= s.hopNoteUntil) {
        s.hopNoteActive = false
        setHopNoteLabel(null)
      }

      // Julia mode: animate the c parameter along a circle
      if (s.playing && s.juliaMode) {
        s.juliaAngle += dt * 0.3
      }

      // Compute scale: half-height of view in complex plane
      const viewHeight = 3.0 / s.zoom
      const scaleDS = toDS(viewHeight)
      const centerReDS = toDS(s.cx)
      const centerImDS = toDS(s.cy)

      // Adaptive max iterations based on zoom depth (slightly higher at deep zoom)
      const maxIter = Math.min(2500, Math.max(200, 180 + 120 * Math.log10(Math.max(1, s.zoom))))

      // Julia c parameter
      const jCx = 0.7885 * Math.cos(s.juliaAngle)
      const jCy = 0.7885 * Math.sin(s.juliaAngle)

      gl.uniform2f(uResolution, pw, ph)
      gl.uniform2f(uCenterRe, centerReDS[0], centerReDS[1])
      gl.uniform2f(uCenterIm, centerImDS[0], centerImDS[1])
      gl.uniform2f(uScale, scaleDS[0], scaleDS[1])
      gl.uniform1f(uMaxIter, maxIter)
      gl.uniform1f(uPalette, s.palette)
      gl.uniform1f(uTime, s.motionTime)
      gl.uniform1f(uJuliaMode, s.juliaMode ? 1.0 : 0.0)
      gl.uniform2f(uJuliaC, jCx, jCy)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      // HUD throttle update
      if (now - s.hudAt > 150) {
        s.hudAt = now
        setHud({ zoom: s.zoom, cx: s.cx, cy: s.cy })
      }

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- Pointer / wheel handlers ---- */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    controls.registerInteraction()
    const s = st.current
    s.userInteracted = true
    s.dragging = true
    s.playing = false
    setPlaying(false)
    s.dragStartX = e.clientX
    s.dragStartY = e.clientY
    s.dragCx = s.cx
    s.dragCy = s.cy
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = st.current
    if (!s.dragging) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const viewHeight = 3.0 / s.zoom
    const pxToComplex = viewHeight / Math.min(rect.width, rect.height)
    const dx = (e.clientX - s.dragStartX) * pxToComplex
    const dy = (e.clientY - s.dragStartY) * pxToComplex
    s.cx = s.dragCx - dx
    s.cy = s.dragCy + dy
  }

  const onPointerUp = () => {
    st.current.dragging = false
  }

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    controls.registerInteraction()
    const s = st.current
    s.userInteracted = true
    s.playing = false
    setPlaying(false)

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    // Zoom toward cursor position
    const viewHeight = 3.0 / s.zoom
    const pxToComplex = viewHeight / Math.min(rect.width, rect.height)
    const mx = (e.clientX - rect.left - rect.width / 2) * pxToComplex
    const my = -(e.clientY - rect.top - rect.height / 2) * pxToComplex

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom * factor))
    const actualFactor = newZoom / s.zoom

    // Adjust center so zoom goes toward cursor
    s.cx = s.cx + mx * (1 - 1 / actualFactor)
    s.cy = s.cy + my * (1 - 1 / actualFactor)
    s.zoom = newZoom
  }

  /* ---- Touch pinch zoom ---- */
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      controls.registerInteraction()
      const s = st.current
      s.userInteracted = true
      s.playing = false
      setPlaying(false)
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      s.pinchDist = Math.sqrt(dx * dx + dy * dy)
    }
  }

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const s = st.current
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (s.pinchDist > 0) {
        const factor = dist / s.pinchDist
        s.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom * factor))
      }
      s.pinchDist = dist
    }
  }

  /* ---- Control actions ---- */
  const resetView = () => {
    controls.registerInteraction()
    const s = st.current
    s.userInteracted = true
    s.cx = -0.5
    s.cy = 0.0
    s.zoom = 1.0
    s.playing = false
    s.landmarkIndex = 0
    setPlaying(false)
    setJuliaMode(false)
    s.juliaMode = false
    setActiveLandmark(0)
    setHopNoteLabel(null)
    s.hopNoteActive = false
  }

  const togglePlayback = () => {
    controls.registerInteraction()
    const s = st.current
    s.userInteracted = true
    const next = !s.playing
    s.playing = next
    setPlaying(next)
  }

  const setMode = (julia: boolean) => {
    controls.registerInteraction()
    const s = st.current
    s.userInteracted = true
    s.juliaMode = julia
    setJuliaMode(julia)
    if (julia) {
      s.zoom = Math.max(s.zoom, 1.5)
      s.playing = true
      setPlaying(true)
    }
  }

  const goToLandmark = (index: number) => {
    controls.registerInteraction()
    const lm = LANDMARKS[index]
    if (!lm) return
    const s = st.current
    s.userInteracted = true
    s.landmarkIndex = index
    s.cx = lm.cx
    s.cy = lm.cy
    s.zoom = HOP_RESUME_ZOOM
    s.juliaMode = false
    s.playing = true
    s.hopNoteActive = false
    setJuliaMode(false)
    setPlaying(true)
    setActiveLandmark(index)
    setHopNoteLabel(null)
  }

  const cyclePalette = () => {
    controls.registerInteraction()
    setPaletteIdx((p) => (p + 1) % PALETTES.length)
  }

  /* ---- Guide steps · beginner-friendly, 5 beats ---- */
  const guideSteps: Array<GuideStep> = [
    {
      title: tx('黑色中间是什么？'),
      body: tx('中间那块深黑，不是空白——它是一个公式 z²+c 画出来的宇宙。永远逃不出去的点涂成黑色；能飞走的点，用颜色标出逃逸有多快。'),
      action: () => {
        const s = st.current
        s.userInteracted = true
        s.cx = -0.5
        s.cy = 0
        s.zoom = 1
        s.playing = false
        s.landmarkIndex = 0
        setPlaying(false)
        setJuliaMode(false)
        s.juliaMode = false
        setActiveLandmark(0)
      },
      durationMs: 5_500,
    },
    {
      title: tx('彩色是逃逸快慢'),
      body: tx('镜头开始自动放大。颜色越亮，说明那个点越快飞出边界。盯住黑与彩的交界——真正的奇观都藏在那条线上。'),
      action: () => {
        const s = st.current
        s.userInteracted = true
        s.playing = true
        setPlaying(true)
        s.cx = -0.5
        s.cy = 0
        s.zoom = 1
        s.landmarkIndex = 0
        setJuliaMode(false)
        s.juliaMode = false
        setActiveLandmark(0)
      },
      durationMs: 6_500,
    },
    {
      title: tx('细节永不重复'),
      body: tx('读数会告诉你放大了多少倍。数学上边界可以无限细；放大再放大，总有新的螺旋与褶皱——相似，却永不复读。'),
      action: () => {
        const s = st.current
        s.userInteracted = true
        s.playing = true
        setPlaying(true)
        s.landmarkIndex = 0
        setActiveLandmark(0)
      },
      durationMs: 5_500,
    },
    {
      title: tx('换个地点看看'),
      body: tx('不是只有一张图。海马谷、螺旋、天线……每一片边界都长出不同的图案。自由探索里可以点地标，随时跳到下一片山谷。'),
      action: () => {
        const s = st.current
        s.userInteracted = true
        s.landmarkIndex = 3 // spiral
        s.cx = LANDMARKS[3].cx
        s.cy = LANDMARKS[3].cy
        s.zoom = 4
        s.playing = true
        setPlaying(true)
        setJuliaMode(false)
        s.juliaMode = false
        setActiveLandmark(3)
      },
      durationMs: 5_500,
    },
    {
      title: tx('换成 Julia 宇宙'),
      body: tx('刚才是「每个像素试一个 c」。若把 c 固定、改试每个起点 z，整幅图就变成 Julia 族——同一条公式，另一座宇宙。'),
      action: () => {
        const s = st.current
        s.userInteracted = true
        s.playing = true
        setPlaying(true)
        s.juliaMode = true
        setJuliaMode(true)
        s.zoom = Math.max(s.zoom, 1.5)
      },
      durationMs: 5_500,
    },
  ]

  const zoomLog = Math.log10(Math.max(1, hud.zoom))
  const landmarkLabel = LANDMARKS[activeLandmark]?.label ?? LANDMARKS[0].label

  return (
    <div className={`mb-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className={`mb-canvas${st.current.dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      />

      {/* Loading overlay */}
      <div className={`mb-loading${glReady ? ' is-hidden' : ''}`}>
        {tx('正在初始化 WebGL 渲染器…')}
      </div>

      {/* Question header — beginner-friendly stage plaque */}
      <header className="mb-question" data-experience-overlay="true" hidden={storyMode} aria-hidden={storyMode}>
        <h1>{tx('一个公式，为什么越放大越看不完？')}</h1>
        <p>
          {tx('黑色 = 永远被困住的点；彩色 = 逃逸快慢。边界上放大再放大，细节永不重复——GPU 约到 10¹⁴ 倍后，我们会跳到下一片著名山谷继续看。')}
        </p>
        <button type="button" className="mb-why-btn" onClick={() => setWhyOpen(true)}>
          <Question weight="bold" /> {tx('为什么')}
        </button>
      </header>

      {/* Julia mode badge */}
      {juliaMode && !storyMode && (
        <div className="mb-julia-badge" data-experience-overlay="true">{tx('Julia 族 · 固定 c，整幅图是另一种宇宙')}</div>
      )}

      {/* Hop note — precision limit teleport */}
      {hopNoteLabel && !storyMode && !juliaMode && (
        <div className="mb-hop-note" data-experience-overlay="true" aria-live="polite">
          {tx('精度极限 · 跳往下一片边界')}
          <span className="mb-hop-note-place">{tx(hopNoteLabel)}</span>
        </div>
      )}

      {/* Readout panel — bottom-left passive HUD */}
      {!storyMode && (
        <aside className="mb-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className="mb-readout-row">
            <small>{tx('放大倍数')}</small>
            <strong className="is-cyan">{formatZoom(hud.zoom)}</strong>
          </div>
          <div className="mb-readout-row">
            <small>{tx('中心 Re')}</small>
            <strong>{hud.cx.toFixed(8)}</strong>
          </div>
          <div className="mb-readout-row">
            <small>{tx('中心 Im')}</small>
            <strong>{hud.cy.toFixed(8)}</strong>
          </div>
          <div className="mb-readout-row">
            <small>{tx('缩放深度')}</small>
            <strong className="is-yellow">{zoomLog.toFixed(1)} {tx('个数量级')}</strong>
          </div>
          {!juliaMode && (
            <div className="mb-readout-row">
              <small>{tx('地标')}</small>
              <strong className="is-purple">{tx(landmarkLabel)}</strong>
            </div>
          )}
        </aside>
      )}

      {!storyMode && (
        <Freebar
          ariaLabel={tx('参数')}
          className="mb-freebar"
          mainClassName="mb-freebar-main"
          primaryControlBudget={4}
          secondaryDefault="closed"
          secondary={(
            <div className="mb-secondary">
              <div className="mbz-chip-rail experience-freebar-chips" role="group" aria-label={tx('著名地标')}>
                {LANDMARKS.map((lm, index) => (
                  <button
                    key={lm.id}
                    type="button"
                    className={`mb-landmark-chip${activeLandmark === index && !juliaMode ? ' is-active' : ''}`}
                    aria-pressed={activeLandmark === index && !juliaMode}
                    onClick={() => goToLandmark(index)}
                  >
                    {tx(lm.label)}
                  </button>
                ))}
              </div>
              <div className="mbz-chip-rail experience-freebar-chips mb-tools-rail" role="group" aria-label={tx('次级工具')}>
                <button
                  type="button"
                  className="mb-palette-btn"
                  aria-label={tx('切换配色')}
                  onClick={cyclePalette}
                >
                  <Palette weight="bold" aria-hidden="true" />
                  <span
                    className="mb-palette-swatch"
                    style={{ background: PALETTES[paletteIdx].swatch }}
                  />
                  {tx(PALETTES[paletteIdx].label)}
                </button>
                <button
                  type="button"
                  className="experience-freebar-reset"
                  aria-label={tx('重置视角')}
                  title={tx('重置视角')}
                  onClick={resetView}
                >
                  <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                  <span>{tx('重置')}</span>
                </button>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('mandelbrot-zoom')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={playing ? 'true' : 'false'}
            aria-label={tx(playing ? '暂停' : '播放')}
            aria-pressed={playing}
            title={tx(playing ? '暂停' : '播放')}
            onClick={togglePlayback}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
          <label className="mb-freebar-field mb-param-zoom experience-freebar-field">
            <span>{tx('缩放')}</span>
            <input
              type="range"
              min={0}
              max={14}
              step={0.01}
              value={Math.log10(Math.max(1, hud.zoom))}
              onChange={(e) => {
                controls.registerInteraction()
                const s = st.current
                s.userInteracted = true
                s.playing = false
                setPlaying(false)
                s.zoom = Math.pow(10, Number(e.target.value))
              }}
              aria-label={tx('缩放级别')}
            />
            <b>{formatZoom(hud.zoom)}</b>
          </label>
          <div className="mb-mode-seg" role="group" aria-label={tx('集合模式')}>
            <button
              type="button"
              className={!juliaMode ? 'is-active' : undefined}
              aria-pressed={!juliaMode}
              onClick={() => setMode(false)}
            >
              {tx('曼德博')}
            </button>
            <button
              type="button"
              className={juliaMode ? 'is-active' : undefined}
              aria-pressed={juliaMode}
              onClick={() => setMode(true)}
            >
              {tx('Julia 族')}
            </button>
          </div>
        </Freebar>
      )}

      {/* Why modal */}
      {whyOpen && (
        <div className="mb-why" role="dialog" aria-label={tx('曼德博集合原理解释')} data-experience-overlay="true">
          <div className="mb-why-card">
            <button type="button" className="mb-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <h2>{tx('为什么边界有无限细节？')}</h2>
            <p>
              {tx('曼德博集合的定义极其简单：对每个复数 c，从 z = 0 开始反复计算')}{' '}
              <strong>z ← z² + c</strong>{tx('。如果 |z| 永远不超过 2，c 就属于集合（黑色区域）；否则 c 在外部，颜色表示逃逸的速度。')}
            </p>
            <p>
              {tx('边界的无穷复杂来自')}<span className="is-purple">{tx('复数乘法的几何本质')}</span>{tx('：z² 把角度加倍、把模长平方。迭代时，微小的角度差异被指数级放大——这就是「对初始条件的敏感依赖」。边界上任意小的邻域内，都同时存在逃逸和被困的轨道，因此结构在每一个尺度上重复出现，形成')}<span className="is-cyan">{tx('分形结构')}</span>{tx('。')}
            </p>
            <p>
              <span className="is-red">{tx('边界条件：')}</span>{tx('本渲染器使用 double-single 精度模拟，可稳定放大到约 10^14 倍。超过此极限需要任意精度算术——所以我们会跳到另一片著名边界继续潜入。Julia 集是曼德博集合的「切片」：固定 c 值后，观察哪些起点 z₀ 不发散——每个 c 对应一个独一无二的 Julia 集。')}
            </p>
            <small>{tx('延伸阅读：Wikipedia 曼德博集合 · 连续逃逸时间着色 · Julia 集 · 分形几何')}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="mandelbrot-zoom"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', treatment: 'monumental', width: 'normal' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'scale', tone: 'light', treatment: 'editorial', width: 'normal', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', treatment: 'caption', width: 'normal' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'drift-left', tone: 'light', treatment: 'annotation', width: 'normal' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', treatment: 'editorial', width: 'normal' },
        ]}
        showReplayChip={false}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="mandelbrot-zoom"
          gesture={{ type: 'scrub', target: '.mb-param-zoom input', label: tx('拧缩放，探索无限边界') }}
        />
      )}
    </div>
  )
}
