import './styles/MandelbrotZoom.css'
import { useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwise, FilmStrip, Palette, Pause, Play } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { FRAGMENT_SRC, VERTEX_SRC } from './mandelbrot-shader'
import { INITIAL_CAMERA, LANDMARKS, MAX_ZOOM, OVERVIEW, clampZoom, interpolateCamera, pan, readCamera, zoomAt, type Camera, type Point } from './mandelbrot-model'

const PALETTES = ['铜与青', '深海', '余烬', '紫罗兰'] as const
const formatZoom = (zoom: number) => `${new Intl.NumberFormat('en', { maximumFractionDigits: zoom < 10 ? 1 : 0 }).format(zoom)}×`
const split = (v: number) => [Math.fround(v), v - Math.fround(v)] as const

type Flight = { from: Camera; to: Camera; elapsed: number; duration: number }
export function MandelbrotZoom({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('mandelbrot-zoom', { firstVisit: typeof window !== 'undefined' && readCamera(window.location.search) ? 'free' : 'story' })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsRef = useRef(controls)
  controlsRef.current = controls
  const [playing, setPlaying] = useState(false)
  const [julia, setJulia] = useState(false)
  const [palette, setPalette] = useState(0)
  const [hud, setHud] = useState<Camera>(INITIAL_CAMERA)
  const [place, setPlace] = useState<number | null>(0)
  const [glStatus, setGlStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [contextVersion, setContextVersion] = useState(0)
  const state = useRef({
    camera: { ...INITIAL_CAMERA } as Camera, savedMandelbrot: { ...INITIAL_CAMERA } as Camera,
    playing: false, julia: false, palette: 0, angle: 2.4, place: 0 as number | null,
    flight: null as Flight | null, dirty: true, reduced: false, last: 0, hudAt: 0,
    pointers: new Map<number, Point>(),
  })

  const stop = () => { state.current.playing = false; setPlaying(false) }
  const interact = () => {
    controlsRef.current.registerInteraction()
    state.current.flight = null
    state.current.dirty = true
    stop()
  }
  const flyTo = (camera: Camera, duration = 2.8) => {
    const s = state.current
    if (s.reduced) { s.camera = { ...camera }; s.flight = null }
    else s.flight = { from: { ...s.camera }, to: { ...camera }, elapsed: 0, duration }
    s.dirty = true
  }
  const selectMode = (next: boolean) => {
    const s = state.current
    if (next === s.julia) return
    s.flight = null
    if (next) {
      s.savedMandelbrot = { ...s.camera }
      s.camera = { cx: 0, cy: 0, zoom: 0.85 }
    } else s.camera = { ...s.savedMandelbrot }
    s.julia = next
    s.dirty = true
    setJulia(next)
  }
  const goToPlace = (index: number, user = true) => {
    if (user) interact()
    selectMode(false)
    state.current.place = index
    setPlace(index)
    flyTo(LANDMARKS[index])
  }
  const reset = () => {
    interact()
    selectMode(false)
    state.current.place = null
    setPlace(null)
    flyTo(OVERVIEW)
  }

  const togglePlayback = () => {
    controlsRef.current.registerInteraction()
    const s = state.current
    if (!s.playing && !s.julia) {
      if (s.place === null) goToPlace(0, false)
      else if (s.camera.zoom >= LANDMARKS[s.place].endZoom) flyTo(LANDMARKS[s.place])
    }
    s.playing = !s.playing
    setPlaying(s.playing)
  }

  useEffect(() => {
    const s = state.current
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => {
      s.reduced = motion.matches
      if (s.reduced) {
        s.playing = false; setPlaying(false)
        if (s.flight) { s.camera = s.flight.to; s.flight = null }
        s.dirty = true
      }
    }
    syncMotion()
    motion.addEventListener('change', syncMotion)
    const deep = readCamera(window.location.search)
    if (deep) {
      s.camera = deep; s.savedMandelbrot = deep; s.flight = null; s.place = null
      s.dirty = true; setHud(deep); setPlace(null)
    }
    controlsRef.current.completeOnboarding()
    return () => motion.removeEventListener('change', syncMotion)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s = state.current
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) { setGlStatus('error'); return }
    const shaders: WebGLShader[] = []
    let program: WebGLProgram | null = null
    let buffer: WebGLBuffer | null = null
    let raf = 0
    let disposed = false
    const destroy = () => {
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      shaders.forEach((shader) => gl.deleteShader(shader))
    }
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)
        if (!shader) throw new Error('Shader allocation failed')
        shaders.push(shader)
        gl.shaderSource(shader, source); gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed')
        return shader
      }
      const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC)
      program = gl.createProgram()
      if (!program) throw new Error('Program allocation failed')
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Program link failed')
      gl.useProgram(program)
      buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, 'a_position')
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    } catch (error) {
      console.error('Mandelbrot renderer:', error)
      setGlStatus('error'); destroy(); return
    }
    const uniforms = Object.fromEntries(['resolution', 'centerRe', 'centerIm', 'scale', 'maxIter', 'palette', 'juliaMode', 'juliaC'].map((key) => [key, gl.getUniformLocation(program!, `u_${key}`)]))
    let pw = 1, ph = 1
    const resize = () => {
      const width = canvas.clientWidth, height = canvas.clientHeight
      // Bound fragment work on Retina displays while keeping thin branches readable.
      const dpr = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(2_400_000 / Math.max(1, width * height)))
      pw = Math.max(1, Math.round(width * dpr)); ph = Math.max(1, Math.round(height * dpr))
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; s.dirty = true }
    }
    const render = (now: number) => {
      raf = 0
      if (disposed || document.hidden || gl.isContextLost()) return
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.05) : 0
      s.last = now
      if (s.flight) {
        s.flight.elapsed += dt
        s.camera = interpolateCamera(s.flight.from, s.flight.to, s.flight.elapsed / s.flight.duration)
        if (s.flight.elapsed >= s.flight.duration) s.flight = null
        s.dirty = true
      } else if (s.playing) {
        if (s.julia) s.angle += dt * 0.14
        else {
          const limit = s.place === null ? MAX_ZOOM : Math.max(s.camera.zoom, LANDMARKS[s.place].endZoom)
          s.camera.zoom = Math.min(limit, s.camera.zoom * Math.exp(dt * 0.22))
          if (s.camera.zoom >= limit) { s.playing = false; setPlaying(false) }
        }
        s.dirty = true
      }
      if (s.dirty) {
        s.dirty = false
        gl.viewport(0, 0, pw, ph)
        gl.uniform2f(uniforms.resolution, pw, ph)
        gl.uniform2f(uniforms.centerRe, ...split(s.camera.cx))
        gl.uniform2f(uniforms.centerIm, ...split(s.camera.cy))
        gl.uniform2f(uniforms.scale, ...split(3 / s.camera.zoom))
        gl.uniform1f(uniforms.maxIter, Math.min(1600, Math.round(320 + 190 * Math.log10(Math.max(1, s.camera.zoom)))))
        gl.uniform1f(uniforms.palette, s.palette)
        gl.uniform1f(uniforms.juliaMode, s.julia ? 1 : 0)
        gl.uniform2f(uniforms.juliaC, 0.7885 * Math.cos(s.angle), 0.7885 * Math.sin(s.angle))
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      if (now - s.hudAt > 100) { s.hudAt = now; setHud((old) => old.cx === s.camera.cx && old.cy === s.camera.cy && old.zoom === s.camera.zoom ? old : { ...s.camera }) }
      raf = requestAnimationFrame(render)
    }
    const wake = () => {
      s.last = 0; s.dirty = true
      if (!document.hidden && !raf) raf = requestAnimationFrame(render)
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0 }
    }
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(raf); raf = 0; setGlStatus('error') }
    const restored = () => { setGlStatus('loading'); setContextVersion((n) => n + 1) }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    document.addEventListener('visibilitychange', wake)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    resize(); wake(); setGlStatus('ready')
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); destroy()
      document.removeEventListener('visibilitychange', wake)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [contextVersion])

  const localPoint = (x: number, y: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: x - rect.left, y: y - rect.top }
  }
  const zoom = (factor: number, point?: Point) => {
    const canvas = canvasRef.current!
    state.current.camera = zoomAt(state.current.camera, factor, point ?? { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }, canvas.clientWidth, canvas.clientHeight)
    state.current.dirty = true
  }
  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    interact()
    event.currentTarget.focus({ preventScroll: true })
    state.current.pointers.set(event.pointerId, localPoint(event.clientX, event.clientY))
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const s = state.current, canvas = event.currentTarget
    if (!s.pointers.has(event.pointerId)) return
    const before = [...s.pointers.values()]
    s.pointers.set(event.pointerId, localPoint(event.clientX, event.clientY))
    const after = [...s.pointers.values()]
    const midpoint = (points: Point[]) => ({ x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length })
    const a = midpoint(before), b = midpoint(after)
    s.camera = pan(s.camera, b.x - a.x, b.y - a.y, canvas.clientWidth, canvas.clientHeight)
    if (before.length === 2) {
      const distance = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const oldDistance = distance(before)
      if (oldDistance > 1) zoom(distance(after) / oldDistance, b)
    }
    s.place = null; setPlace(null); s.dirty = true
  }
  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => { state.current.pointers.delete(event.pointerId) }
  // Native non-passive listener prevents page scrolling without React's passive-wheel warning.
  const wheelRef = useRef<(event: WheelEvent) => void>(() => {})
  wheelRef.current = (event) => {
    if (storyMode || event.ctrlKey || event.metaKey) return
    event.preventDefault(); interact()
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvasRef.current!.clientHeight : 1)
    zoom(Math.exp(-Math.max(-180, Math.min(180, delta)) * 0.004), localPoint(event.clientX, event.clientY))
  }
  useEffect(() => {
    const canvas = canvasRef.current!
    const handler = (event: WheelEvent) => wheelRef.current(event)
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [])

  const guideSteps: GuideStep[] = [
    { title: tx('分形里，还有分形'), body: tx('沿着这条边界靠近，细小的卷须会展开成另一片山谷。'), durationMs: 5500,
      action: () => { stop(); goToPlace(0, false) } },
    { title: tx('退远一点，看见全貌'), body: tx('每个像素代表一个 c。从零开始反复计算 z²+c；彩色记录逃逸所需的次数，黑色是在计算上限内仍未逃逸的点。'), durationMs: 6000,
      action: () => { stop(); selectMode(false); flyTo(OVERVIEW, 3.5); state.current.place = null; setPlace(null) } },
    { title: tx('一条边界，层层展开'), body: tx('同一个公式，在不同尺度上长出相似的螺旋。放大黑色与彩色的交界，新的分支逐渐显现。'), durationMs: 6500,
      action: () => { stop(); goToPlace(1, false) } },
    { title: tx('同一公式，另一幅图'), body: tx('固定 c，让每个像素换成一个起点，就得到 Julia 集。这里缓慢改变 c，枝条随之聚拢、分散。'), durationMs: 6500,
      action: () => { stop(); selectMode(true); state.current.playing = !state.current.reduced; setPlaying(state.current.playing) } },
  ]
  return (
    <div className={`mb-experience ${storyMode ? 'is-story' : 'is-free'}`}>
      <canvas ref={canvasRef} className="mb-canvas" tabIndex={0}
        aria-label={tx('分形画布：拖动平移，滚轮或双指缩放；方向键平移，加减键缩放')}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp}
        onDoubleClick={(event) => { interact(); zoom(2, localPoint(event.clientX, event.clientY)) }}
        onKeyDown={(event) => {
          if (storyMode || event.ctrlKey || event.metaKey || event.altKey) return
          if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','=','-','Home',' '].includes(event.key)) return
          event.preventDefault(); event.stopPropagation()
          if (event.key === ' ') { togglePlayback(); return }
          interact()
          if (event.key === 'Home') reset()
          else if (['+','=','-'].includes(event.key)) zoom(event.key === '-' ? 1 / 1.4 : 1.4)
          else state.current.camera = pan(state.current.camera, event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0, event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0, event.currentTarget.clientWidth, event.currentTarget.clientHeight)
        }} />
      {glStatus !== 'ready' && <div className="mb-loading" role="status">
        <p>{tx(glStatus === 'error' ? '当前无法显示分形，请重试或使用支持 WebGL 的浏览器。' : '正在绘制分形…')}</p>
        {glStatus === 'error' && <button type="button" onClick={() => { setGlStatus('loading'); setContextVersion((n) => n + 1) }}>{tx('重试')}</button>}
      </div>}
      {!storyMode && <>
        <header className="mb-question" data-experience-overlay="true">
          <span className="mb-eyebrow">{tx(julia ? 'Julia 集' : '曼德勃罗集')}</span>
          <h1>{tx('分形里，还有分形')}</h1>
          <p>{tx('沿着边界，继续靠近。')}</p>
        </header>
        <aside className="mb-readout" data-experience-overlay="true" data-freebar-clearance="true">
          <strong>{formatZoom(hud.zoom)}</strong>
          <span>{tx(julia ? 'Julia 集' : place === null ? '自由探索' : LANDMARKS[place].label)}</span>
        </aside>
        <Freebar ariaLabel={tx('探索分形')} className="mb-freebar" primaryControlBudget={3} secondaryDefault="closed"
          secondary={<div className="mb-secondary">
            <div className="mb-rail" role="group" aria-label={tx('边界地点')}>
              {LANDMARKS.map((landmark, i) => <button key={landmark.label} type="button" className="mb-chip" aria-pressed={!julia && place === i} onClick={() => goToPlace(i)}>{tx(landmark.label)}</button>)}
              <button type="button" className="mb-chip mb-palette" aria-label={tx('切换配色')} onClick={() => { controlsRef.current.registerInteraction(); const next = (state.current.palette + 1) % PALETTES.length; state.current.palette = next; state.current.dirty = true; setPalette(next) }}><Palette aria-hidden="true" />{tx(PALETTES[palette])}</button>
              <button type="button" className="experience-freebar-reset" aria-label={tx('重置视角')} onClick={reset}><ArrowCounterClockwise aria-hidden="true" /><span>{tx('重置')}</span></button>
              <button type="button" className="experience-freebar-story" aria-label={tx('重播故事')} onClick={() => { controlsRef.current.registerInteraction(); enterStory(); replayGuide('mandelbrot-zoom') }}><FilmStrip aria-hidden="true" /><span>{tx('故事')}</span></button>
            </div>
            <label className="mb-zoom-field"><span>{tx('缩放')}</span><input type="range" min={Math.log10(0.7)} max={6} step={0.01} value={Math.log10(hud.zoom)} aria-label={tx('缩放级别')}
              onChange={(event) => { interact(); state.current.camera.zoom = clampZoom(10 ** Number(event.target.value)) }} /></label>
          </div>}>
          <button type="button" className="experience-freebar-play" aria-label={tx(playing ? '暂停' : '播放')} aria-pressed={playing} onClick={togglePlayback}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}</button>
          <div className="experience-freebar-seg mb-modes" role="group" aria-label={tx('集合模式')}>
            <button type="button" className={!julia ? 'is-active' : ''} aria-pressed={!julia} onClick={() => { interact(); selectMode(false) }}>{tx('曼德博')}</button>
            <button type="button" className={julia ? 'is-active' : ''} aria-pressed={julia} onClick={() => { interact(); selectMode(true) }}>{tx('Julia 集')}</button>
          </div>
        </Freebar>
      </>}
      <GuideTour worldId="mandelbrot-zoom" steps={guideSteps} defaultOpen={storyMode} placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'editorial', width: 'narrow', tone: 'light', motion: 'fade' },
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'caption', width: 'narrow', tone: 'light', motion: 'rise' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption', width: 'narrow', tone: 'light', motion: 'fade' },
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'caption', width: 'narrow', tone: 'light', motion: 'rise' },
        ]} showReplayChip={false} onExit={enterFree} />
      {!storyMode && <GhostHint worldId="mandelbrot-zoom" gesture={{ type: 'drag', target: '.mb-canvas', dx: 70, dy: -30, label: tx('拖动找边界，双指或滚轮放大') }} />}
    </div>
  )
}
