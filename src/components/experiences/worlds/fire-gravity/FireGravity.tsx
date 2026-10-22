import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { FilmStrip } from '@phosphor-icons/react'
import { GuideTour, hasCompletedGuide, type GuideStagePlan } from '~/components/experiences/GuideTour'
import { flameRegions, flameStory, type FlameRegion } from './flame-content'
import { ReactionLens } from './ReactionLens'
import { chemistryViews } from './chemistry-content'
import { combustionState, relativeSupply, type ChemistryView } from './combustion-model'
import { GhostHint } from '~/components/experiences/GhostHint'
import { useExperienceI18n } from '~/i18n/experience'
import { flameShape, relax, sceneFrame, sceneToScreen } from './fire-gravity-model'
import { vertex, fragment } from './flame-shader'
import './styles/FireGravity.css'

/** Points inside the right half-section (scene units, candle top at y = 0) where each zone label is pinned. */
const zoneAnchors = [
  { id: 'luminous', x: .12, y: 1.07 },
  { id: 'outer', x: .232, y: .77 },
  { id: 'core', x: .045, y: .4 },
] as const
const zoneColumn = .52

export function FireGravity({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; peel: number } | null>(null)
  const [chemistry, setChemistry] = useState<ChemistryView | null>(null)
  const [air, setAir] = useState(1)
  const [lit, setLit] = useState(true)
  const combustion = combustionState(chemistry ? air : 1, chemistry ? lit : true)
  const chemistryContent = chemistryViews.find(item => item.id === chemistry)
  const selectChemistry = (view: ChemistryView) => {
    setChemistry(view); setRegion('whole'); setPeel(0); setGravity(1)
    if (!chemistry) { setAir(1); setLit(true) }
    if (view === 'incomplete') setAir(.4)
    setTransport(true); setTraces(true)
  }
  const [gravity, setGravity] = useState(1)
  const [traces, setTraces] = useState(false)
  const [region, setRegion] = useState<FlameRegion>('whole')
  const [peel, setPeel] = useState(0)
  const [transport, setTransport] = useState(false)
  const [story, setStory] = useState(() => !hasCompletedGuide('fire-gravity'))
  const selected = flameRegions.find(item => item.id === region)!
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = canvas.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const target = useRef({ gravity, traces, peel, focus: selected.focus, transport, air: combustion.air, burn: combustion.burning ? 1 : 0, chemistry: chemistry ? 1 : 0 })
  target.current = { gravity, traces, peel, focus: selected.focus, transport, air: combustion.air, burn: combustion.burning ? 1 : 0, chemistry: chemistry ? 1 : 0 }
  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ worldId: string; active: boolean }>).detail
      if (detail.worldId === 'fire-gravity') setStory(detail.active)
    }
    window.addEventListener('oneworld:guide-autoplay-state', onState)
    return () => window.removeEventListener('oneworld:guide-autoplay-state', onState)
  }, [])
  const steps = useMemo(() => flameStory.map(step => ({
    title: tx(step.title), body: tx(step.body), durationMs: 8500,
    action: () => {
      setChemistry(step.chemistry ?? null); setAir(step.chemistry === 'incomplete' ? .4 : 1); setLit(true)
      setRegion(step.region); setPeel(step.peel); setTransport(step.transport)
      setTraces(step.transport); setGravity(step.gravity)
    },
  })), [tx])
  const stagePlan: GuideStagePlan = flameStory.map(() => ({ position: 'top-left', mobilePosition: 'top-left', width: 'normal', tone: 'light', motion: 'fade' }))
  const selectRegion = (id: FlameRegion) => {
    setChemistry(null); setRegion(id); setGravity(1); setPeel(id === 'whole' ? 0 : 1)
    setTransport(id === 'core' || id === 'outer'); setTraces(id === 'outer')
    controls.registerInteraction()
  }
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const gl = el.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) { setFailed(true); return }
    const shaders: WebGLShader[] = []
    const program = gl.createProgram()!
    let buffer: WebGLBuffer | null = null
    let raf = 0
    const fail = () => { cancelAnimationFrame(raf); setFailed(true) }
    const onLost = (event: Event) => { event.preventDefault(); fail() }
    el.addEventListener('webglcontextlost', onLost)
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl.createShader(type)!
        shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed')
        gl.attachShader(program, shader)
      }
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link failed')
      gl.useProgram(program)
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
      const attr = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0)
      const locations = Object.fromEntries(['resolution','time','gravity','height','radius','traces','peel','focus','transport','air','burn','chemistry','sceneScale','sceneOffset'].map(name => [name, gl.getUniformLocation(program, name)]))
      const reduced = matchMedia('(prefers-reduced-motion: reduce)')
      let currentAir = 1, currentBurn = 1, currentChemistry = 0
      let drawn = false
      let current = 1, currentPeel = 0, currentFocus = 0, currentTransport = 0, currentTraces = 0, last = performance.now(), clock = 0
      const render = (now: number) => {
        // A candle needs coherent motion, not a full-volume draw at display refresh rate.
        if (now - last < 1000 / 30) { raf = requestAnimationFrame(render); return }
        const dt = Math.min(2, (now-last)/1000); last = now
        if (!document.hidden) {
          if (!reduced.matches) clock += Math.min(.05, dt)
          currentAir = relax(currentAir, target.current.air, dt)
          currentBurn = relax(currentBurn, target.current.burn, dt)
          currentChemistry = relax(currentChemistry, target.current.chemistry, dt)
          current = relax(current, target.current.gravity, dt)
          currentPeel = relax(currentPeel, target.current.peel, dt)
          currentFocus = target.current.focus
          currentTransport = relax(currentTransport, target.current.transport ? 1 : 0, dt)
          currentTraces = relax(currentTraces, target.current.traces ? 1 : 0, dt)
          const bounds = el.getBoundingClientRect()
          const ratio = Math.min(1.4, 1000 / Math.max(bounds.width, bounds.height))
          const w = Math.max(1, Math.round(bounds.width*ratio)), h = Math.max(1, Math.round(bounds.height*ratio))
          if (el.width !== w || el.height !== h) { el.width=w; el.height=h; gl.viewport(0,0,w,h) }
          const shape = flameShape(current)
          gl.uniform2f(locations.resolution,w,h)
          gl.uniform1f(locations.time,clock)
          gl.uniform1f(locations.gravity,shape.gravity)
          gl.uniform1f(locations.height,shape.height)
          gl.uniform1f(locations.radius,shape.radius)
          gl.uniform1f(locations.traces,currentTraces)
          gl.uniform1f(locations.peel,currentPeel)
          gl.uniform1f(locations.focus,currentFocus)
          gl.uniform1f(locations.transport,currentTransport)
          gl.uniform1f(locations.air,currentAir)
          gl.uniform1f(locations.burn,currentBurn)
          gl.uniform1f(locations.chemistry,currentChemistry)
          const frame = sceneFrame(bounds.width / Math.max(1, bounds.height), currentChemistry)
          gl.uniform1f(locations.sceneScale,frame.scale)
          gl.uniform1f(locations.sceneOffset,frame.offset)
          gl.drawArrays(gl.TRIANGLES,0,6)
          if (!drawn) { drawn = true; setReady(true) }
        }
        raf=requestAnimationFrame(render)
      }
      raf=requestAnimationFrame(render)
    } catch (error) { console.error('Fire gravity renderer:', error); fail() }
    return () => { cancelAnimationFrame(raf); el.removeEventListener('webglcontextlost',onLost); gl.deleteBuffer(buffer); shaders.forEach(s=>gl.deleteShader(s)); gl.deleteProgram(program) }
  }, [])
  const microgravity = !chemistry && gravity < .02
  const fact = tx(region === 'whole' && peel > .1 ? '半剖面 · 暗处是富燃料的焰心' : selected.fact).split(' · ')
  const frame = sceneFrame(size.w / Math.max(1, size.h), 0)
  const column = sceneToScreen(zoneColumn, 0, size.w, size.h, frame).x
  const showZones = !chemistry && peel > .35 && gravity > .9 && size.w > 0
  return <div className={`fire-gravity-experience ${chemistry ? 'is-chemistry' : ''} ${ready ? 'is-ready' : ''}`}>
    <canvas ref={canvas} className={`fire-gravity-canvas ${!chemistry ? 'is-sliceable' : ''}`}
      onPointerDown={event => {
        if (chemistry || event.button !== 0) return
        controls.registerInteraction(); setStory(false)
        drag.current = { x: event.clientX, peel }; event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        if (!drag.current) return
        const distance = event.clientX - drag.current.x
        if (Math.abs(distance) < 4) return
        setGravity(1); setRegion('whole')
        setPeel(Math.max(0, Math.min(1, drag.current.peel + distance / Math.min(220, event.currentTarget.clientWidth * .5))))
      }}
      onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
      onPointerCancel={() => { drag.current = null }} aria-label={tx('随重力变化的烛火')} role="img" />
    {!ready && !failed && <div className="fire-gravity-loading" aria-hidden="true"><i /></div>}
    {failed && <div className="fire-gravity-fallback"><img src="/assets/posters/fire-gravity.webp" alt={tx('烛火近景')} /><p>{tx('当前设备无法绘制火焰，显示静态预览。')}</p></div>}
    {!story && <div className="fire-gravity-caption" data-experience-overlay="true">
      <span className="fire-gravity-kicker">{tx(chemistry ? '燃烧化学' : microgravity ? '微重力' : '一簇火的内部')}</span>
      <h1>{tx(chemistryContent?.title ?? (microgravity ? '没有浮力，火焰变成圆顶' : selected.title))}</h1>
      <p>{chemistryContent ? tx(chemistryContent.body) : microgravity ? tx('静止空气中的微重力烛火，可以变成蓝色圆顶。') : tx(selected.body)}</p>
      {!chemistry && !microgravity && <div className={`fire-gravity-fact is-${region}`}>{fact.map((item, i) => <span key={i}>{item}</span>)}</div>}
      {!chemistry && gravity < .98 && <button className="fire-gravity-earth" onClick={() => { setGravity(1); controls.registerInteraction() }}>{tx('回到地球重力')}</button>}
    </div>}
    {chemistry && <ReactionLens view={chemistry} burning={combustion.burning} />}
    {showZones && <div className={`fire-zone-labels ${story ? 'is-passive' : ''}`} data-experience-overlay="true" style={{ opacity: Math.min(1, (peel - .35) / .35) }}>
      {zoneAnchors.map(zone => {
        const point = sceneToScreen(zone.x, zone.y, size.w, size.h, frame)
        const item = flameRegions.find(entry => entry.id === zone.id)!
        const state = region === 'whole' ? '' : region === zone.id ? 'is-active' : 'is-dim'
        return <button key={zone.id} className={`fire-zone-label is-${zone.id} ${state}`} tabIndex={story ? -1 : 0}
          style={{ left: point.x, top: point.y, width: Math.max(28, column - point.x) } as CSSProperties}
          aria-pressed={region === zone.id} onClick={() => selectRegion(zone.id)}><span>{tx(item.label)}</span></button>
      })}
    </div>}
    {!story && !chemistry && <div className="fire-gravity-note" data-experience-overlay="true" data-freebar-clearance="true">
      {transport && <div className="fire-note-legend">{gravity > .5 && <span className="is-fuel">{tx('蜡的供给路径')}</span>}<span className="is-air">{tx('空气输运（示意）')}</span></div>}
      <small>{tx(peel > .1 ? '右半侧为增强剖面；分区之间实际是渐变。' : '在火焰上向右拖动，剖开内部；向左拖动合拢。')}</small>
    </div>}
    {!story && <Freebar ariaLabel={tx('探索火焰内部')} primaryControlBudget={4} secondaryClassName="fire-gravity-secondary" secondary={<>
      <div className="fire-view-switch"><button aria-pressed={!chemistry} onClick={() => { selectRegion('whole'); controls.registerInteraction() }}>{tx('火焰分层')}</button><button aria-pressed={Boolean(chemistry)} onClick={() => { selectChemistry('products'); controls.registerInteraction() }}>{tx('燃烧化学')}</button></div>
      {chemistry ? <>
        <label className="fire-gravity-slider"><span>{tx('相对供氧')} <output>{air < .1 ? tx('停止') : air < .65 ? tx('受限') : tx('充足')}</output></span>
          <input id="fire-air-input" type="range" min="0" max="1" step=".01" value={air} aria-label={tx('相对供氧')} onChange={e => { const next = relativeSupply(Number(e.target.value)); setAir(next); if (next <= .08) setLit(false); if (next < .65) setChemistry('incomplete') }} onPointerDown={controls.registerInteraction} onKeyDown={controls.registerInteraction}/>
        </label>
        <button className="fire-gravity-traces" disabled={!lit && air <= .08} onClick={() => { setLit(!lit); controls.registerInteraction() }}>{tx(lit ? '冷却熄灭' : '重新点燃')}</button>
      </> : <>
        <label className="fire-gravity-slider"><span>{tx('剖开火焰')} <output>{Math.round(peel * 100)}%</output></span>
          <input id="fire-peel-input" type="range" min="0" max="1" step=".01" value={peel} aria-label={tx('剖开火焰')} onChange={e => { setPeel(Number(e.target.value)); setGravity(1) }} onPointerDown={controls.registerInteraction} onKeyDown={controls.registerInteraction}/>
        </label>
        <button className="fire-gravity-traces" aria-pressed={transport} onClick={() => { setTransport(!transport); setTraces(!transport); controls.registerInteraction() }}>{tx('追踪燃料与空气')}</button>
        <label className="fire-gravity-slider"><span>{tx('重力')} <output>{gravity === 0 ? tx('微重力') : `${gravity.toFixed(2)} g`}</output></span>
          <input id="fire-gravity-input" type="range" min="0" max="1" step=".01" value={gravity} aria-label={tx('重力')} onChange={e => { setGravity(Number(e.target.value)); setRegion('whole'); setPeel(0) }} onPointerDown={controls.registerInteraction} onKeyDown={controls.registerInteraction}/>
        </label>
      </>}
      <button className="experience-freebar-story" aria-label={tx('故事')} onClick={() => { setStory(true); controls.registerInteraction() }}><FilmStrip/><span>{tx('故事')}</span></button>
    </>}>
      <div className="experience-freebar-seg">{chemistry ? chemistryViews.map(item => <button key={item.id} className={chemistry === item.id ? 'is-active' : undefined} aria-pressed={chemistry === item.id} onClick={() => { selectChemistry(item.id); controls.registerInteraction() }}>{tx(item.label)}</button>) : flameRegions.map(item => <button key={item.id} className={region === item.id ? 'is-active' : undefined} aria-pressed={region === item.id} onClick={() => selectRegion(item.id)}>{tx(item.label)}</button>)}</div>
    </Freebar>}
    <GuideTour placement="stage" worldId="fire-gravity" steps={steps} defaultOpen={story} stagePlan={stagePlan} onExit={() => setStory(false)} />
    {!story && !chemistry && <GhostHint worldId="fire-gravity-drag" gesture={{type:'drag', target:'.fire-gravity-canvas', dx:100, dy:0, label:tx('向右拖动，打开火焰')}} />}
  </div>
}
