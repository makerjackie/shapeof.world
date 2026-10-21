/** Shell counting and drag interaction originated in SeanWong17/Future-Style-Periodic-Table,
 * src/modules/atom3d.ts at 6f76f56078ed6cd388493e080e77bad6b026645f. MIT; see upstream-LICENSE.txt.
 * Particle projection and nucleus packing are counting illustrations, not a simulation.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import { nucleusGeometry, rotatePoint, shellPoint, type Point3 } from './atom-geometry'
import { completeElementData } from './complete-element-data'
import { electronConfiguration, sampleProbabilityCloud, type CloudSelection } from './quantum-model'
import { paintProbabilityCloud } from './probability-canvas'

type Particle = 'proton' | 'neutron' | 'electron'
type NucleonView = {
 node: SVGCircleElement; kind: Particle; position: Point3; target: Point3
 radius: number; targetRadius: number; opacity: number; retiring: boolean
}
const INITIAL = { x: -12, y: 10, scale: 1 }
const clampScale = (value: number) => Math.max(.65, Math.min(3.2, value))
type AtomMode = 'structure' | 'cloud'
const VIEW_KEY = 'oneworld:periodic-table:atom-view'
const basisNames = [['s'], ['pᵧ', 'p𝓏', 'pₓ'], ['dₓᵧ', 'dᵧ𝓏', 'd𝓏²', 'dₓ𝓏', 'dₓ²₋ᵧ²'], ['f₁', 'f₂', 'f₃', 'f₄', 'f₅', 'f₆', 'f₇']]
const SVG_NS = 'http://www.w3.org/2000/svg'
const circleAt = (node: SVGCircleElement, point: Point3, radius: number, scale: number) => {
 node.setAttribute('cx', (point.x * scale).toFixed(3))
 node.setAttribute('cy', (point.y * scale).toFixed(3))
 node.setAttribute('r', (radius * scale).toFixed(3))
}

export function AtomSpecimen({ shells, symbol, reduced, activeShell, onInteract, atomicNumber, massNumber, onShellChange }: {
 shells: number[]; symbol: string; reduced: boolean; activeShell: number | null; onInteract: () => void
 atomicNumber?: number; massNumber?: number; onShellChange?: (shell: number | null) => void
}) {
 const tx = useExperienceI18n(), id = useId().replace(/:/g, '')
 const cloudCanvas = useRef<HTMLCanvasElement>(null), surface = useRef<HTMLDivElement>(null)
 const [mode, setMode] = useState<AtomMode>(() => { try { return localStorage.getItem(VIEW_KEY) === 'cloud' ? 'cloud' : 'structure' } catch { return 'structure' } })
 const [zoomPercent, setZoomPercent] = useState(100)
 const [expanded, setExpanded] = useState(false), [selection, setSelection] = useState<CloudSelection>(null)
 const configuration = useMemo(() => electronConfiguration(symbol), [symbol])
 const cloud = useMemo(() => mode === 'cloud' ? sampleProbabilityCloud(configuration, selection) : null, [mode, configuration, selection])
 const orbital = selection ? configuration.find(s => s.key === selection.subshell) : null
 const detailScale = useRef(1)
 const scene = useRef<SVGGElement>(null), rings = useRef<SVGGElement>(null)
 const pose = useRef({ ...INITIAL }), displayed = useRef({ ...INITIAL })
 const phase = useRef(0), requestDraw = useRef(() => {})
 const nucleons = useRef(new Map<string, NucleonView>())
 const pointers = useRef(new Map<number, { x: number; y: number }>())
 const [paused, setPaused] = useState(false), [focus, setFocus] = useState<Particle | null>(null)
 const options = useRef({ reduced, paused, activeShell, focus, mode, cloud })
 const electrons = shells.reduce((sum, count) => sum + count, 0)
 const protons = atomicNumber ?? electrons
 const neutrons = massNumber !== undefined && massNumber >= protons ? massNumber - protons : null

 useEffect(() => {
  const node=surface.current
  if(!node)return
  const onWheel=(event:WheelEvent)=>{
   event.preventDefault();event.stopPropagation();onInteract()
   pose.current.scale=clampScale(pose.current.scale*Math.exp(-event.deltaY*(event.deltaMode===1?.035:.0015)))
   setZoomPercent(Math.round(pose.current.scale*100));requestDraw.current()
  }
  node.addEventListener('wheel',onWheel,{passive:false})
  return()=>node.removeEventListener('wheel',onWheel)
 },[onInteract])
 const zoomBy=(amount:number)=>{onInteract();pose.current.scale=clampScale(pose.current.scale+amount);setZoomPercent(Math.round(pose.current.scale*100));requestDraw.current()}

 useEffect(() => {
  const container = scene.current!, ringContainer = rings.current!
  const orbits = shells.map((count, index) => {
   const path = document.createElementNS(SVG_NS, 'path')
   path.classList.add('pm-orbit'); path.dataset.shell = String(index)
   ringContainer.appendChild(path)
   const particles = Array.from({ length: count }, (_, i) => {
    const node = document.createElementNS(SVG_NS, 'circle')
    node.classList.add('pm-electron'); node.dataset.kind = 'electron'; node.dataset.shell = String(index)
    node.setAttribute('fill', `url(#${id}-electron)`)
    container.appendChild(node)
    return { node, angle: Math.PI * 2 * i / count + index * .63 }
   })
   return { path, particles, samples: Array.from({ length: 96 }, (_, i) => shellPoint(index, shells.length, i * Math.PI / 48)) }
  })
  let frame = 0, previousTime = 0, disposed = false, inView = true
  const draw = () => {
   if (!disposed && inView && !frame && !document.hidden) frame = requestAnimationFrame(tick)
  }
  const tick = (now: number) => {
   frame = 0
   const { reduced: still, paused: stopped, focus: selected, activeShell: shell, mode: view, cloud: density } = options.current
   const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60
   previousTime = now
   const blend = still ? 1 : 1 - Math.exp(-14 * dt)
   const p = displayed.current, target = pose.current
   p.x += (target.x - p.x) * blend; p.y += (target.y - p.y) * blend; p.scale += (target.scale - p.scale) * blend
   let settling = Math.abs(p.x - target.x) + Math.abs(p.y - target.y) + Math.abs(p.scale - target.scale) > .001
   if (view === 'cloud') {
    if (density && cloudCanvas.current) paintProbabilityCloud(cloudCanvas.current, density, p, 'full', 0)
    if (settling) draw(); else previousTime = 0
    return
   }
   const nucleusFocus = selected === 'proton' || selected === 'neutron'
   const zoomTarget = nucleusFocus ? 3.35 : 1
   detailScale.current += (zoomTarget - detailScale.current) * blend
   settling ||= Math.abs(detailScale.current - zoomTarget) > .001
   const scale = p.scale * detailScale.current
   if (!still && !stopped && !nucleusFocus && shell === null) phase.current += dt
   const depthOrder: { node: SVGCircleElement; depth: number }[] = []
   orbits.forEach(({ path, samples, particles }, index) => {
    path.setAttribute('d', samples.map((point, i) => {
     const angle = i * Math.PI / 48
     const projected = rotatePoint(shell === index ? { x: 112 * Math.cos(angle), y: 112 * Math.sin(angle), z: 0 } : point, p)
     return `${i ? 'L' : 'M'}${(projected.x * scale).toFixed(2)},${(projected.y * scale).toFixed(2)}`
    }).join(' ') + 'Z')
    const opacity = nucleusFocus || shell !== null && shell !== index ? 0 : 1
    path.style.opacity = String(opacity)
    particles.forEach(({ node, angle }) => {
     const theta = angle + phase.current * Math.PI * 2 / (24 + index * 7)
     const point = rotatePoint(shell === index ? { x: 112 * Math.cos(theta), y: 112 * Math.sin(theta), z: 0 } : shellPoint(index, shells.length, theta), p)
     circleAt(node, point, shell === index ? 4 : index === shells.length - 1 ? 3.4 : 2.8, scale)
     node.style.opacity = String(opacity)
     depthOrder.push({ node, depth: point.z })
    })
   })
   for (const [key, particle] of nucleons.current) {
    const destinationOpacity = particle.retiring ? 0 : 1
    particle.opacity += (destinationOpacity - particle.opacity) * blend
    particle.radius += (particle.targetRadius - particle.radius) * blend
    for (const axis of ['x', 'y', 'z'] as const) particle.position[axis] += (particle.target[axis] - particle.position[axis]) * blend
    if (particle.retiring && particle.opacity < .005) { particle.node.remove(); nucleons.current.delete(key); continue }
    if (Math.abs(particle.opacity - destinationOpacity) + Math.abs(particle.radius - particle.targetRadius) + Math.hypot(particle.position.x - particle.target.x, particle.position.y - particle.target.y, particle.position.z - particle.target.z) > .005) settling = true
    const point = rotatePoint(particle.position, p)
    circleAt(particle.node, point, particle.radius, scale)
    particle.node.style.opacity = String(particle.opacity * (selected && selected !== particle.kind ? .12 : 1))
    depthOrder.push({ node: particle.node, depth: point.z })
   }
   // Project every particle into the same scene and paint back to front. Circles
   // stay round even when a shell is edge-on; the nucleus has depth when rotated.
   depthOrder.sort((a, b) => a.depth - b.depth)
   let cursor = container.firstElementChild
   for (const { node } of depthOrder) {
    if (node !== cursor) container.insertBefore(node, cursor)
    else cursor = cursor.nextElementSibling
   }
   if ((!still && !stopped && !nucleusFocus && shell === null) || settling) draw()
   else previousTime = 0
  }
  const visibility = () => {
   cancelAnimationFrame(frame); frame = 0; previousTime = 0
   if (!document.hidden) draw()
  }
  requestDraw.current = draw
  document.addEventListener('visibilitychange', visibility)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw)
  if (surface.current) observer?.observe(surface.current)
  // The atom stays mounted beside the reading content. Pause while its surface
  // is scrolled out of view, then resume the same pose and phase on return.
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
   inView = entries.some(entry => entry.isIntersecting)
   cancelAnimationFrame(frame); frame = 0; previousTime = 0
   if (inView) draw()
  })
  if (surface.current) intersection?.observe(surface.current)
  draw()
  const retainedNucleons = nucleons.current
  return () => {
   disposed = true; observer?.disconnect(); intersection?.disconnect(); cancelAnimationFrame(frame); requestDraw.current = () => {}
   document.removeEventListener('visibilitychange', visibility)
   container.replaceChildren(); ringContainer.replaceChildren(); retainedNucleons.clear()
  }
 }, [shells, symbol, id])

 useEffect(() => {
  const geometry = nucleusGeometry(protons, neutrons ?? 0), retained = new Set(geometry.map(p => p.key))
  for (const p of geometry) {
   let particle = nucleons.current.get(p.key)
   if (!particle) {
    const node = document.createElementNS(SVG_NS, 'circle')
    node.classList.add('pm-nucleon'); node.dataset.nucleon = p.key; node.dataset.kind = p.kind
    node.setAttribute('fill', `url(#${id}-${p.kind})`)
    scene.current!.appendChild(node)
    particle = { node, kind: p.kind, position: { x: p.x * 1.3, y: p.y * 1.3, z: p.z * 1.3 }, target: p, radius: p.radius * .4, targetRadius: p.radius, opacity: 0, retiring: false }
    nucleons.current.set(p.key, particle)
   }
   particle.target = p; particle.targetRadius = p.radius; particle.retiring = false
  }
  for (const [key, particle] of nucleons.current) if (!retained.has(key)) { particle.retiring = true; particle.targetRadius = 0 }
  requestDraw.current()
 }, [protons, neutrons, shells, symbol, id])

 useEffect(() => {
  options.current = { reduced, paused, activeShell, focus, mode, cloud }
  requestDraw.current()
 }, [reduced, paused, activeShell, focus, mode, cloud, expanded])

 useEffect(() => {
  if (activeShell !== null) { setFocus(null); pose.current.x = 0; pose.current.y = 0; requestDraw.current() }
 }, [activeShell])

 const choose = (kind: Particle) => { onInteract(); onShellChange?.(null); setFocus(current => current === kind ? null : kind) }
 const switchMode = (next: AtomMode) => { onInteract(); setMode(next); try { localStorage.setItem(VIEW_KEY, next) } catch { /* Storage can be unavailable in a private window. */ } }
 const chooseShell = (index: number) => { onInteract(); setFocus(null); onShellChange?.(activeShell === index ? null : index); requestDraw.current() }
 const expand = () => { onInteract(); setExpanded(!expanded); surface.current?.focus({ preventScroll: true }) }
 return <div className={`pm-atom-exhibit pm-atom-studio${expanded ? ' is-expanded' : ''}`} data-focus={focus ?? 'all'} data-mode={mode} data-cut="full" data-zoom={zoomPercent}>
  <div className="pm-atom-toolbar"><b><sup>{massNumber ?? ''}</sup>{symbol}</b><div className="pm-atom-modes" role="group" aria-label={tx('原子视图')}><button aria-pressed={mode === 'structure'} onClick={() => switchMode('structure')}>{tx('结构示意')}</button><button aria-pressed={mode === 'cloud'} onClick={() => switchMode('cloud')}>{tx('电子云')}</button></div><button className="pm-atom-expand" aria-expanded={expanded} onClick={expand}>{tx(expanded ? '收起观察' : '放大观察')}</button></div>
  {mode === 'cloud' && <div className="pm-cloud-selection"><label>{tx('观察对象')}<select value={selection?.subshell ?? 'all'} onChange={e => { onInteract(); setSelection(e.target.value === 'all' ? null : { subshell: e.target.value, m: e.target.value.endsWith('p') ? 1 : 0 }) }}><option value="all">{tx('整体电子云')}</option>{configuration.map(s => <option key={s.key} value={s.key}>{s.key} · {tx('单轨道')}</option>)}</select></label>{orbital && orbital.l > 0 && <label>{tx('轨道形状')}<select value={selection!.m} onChange={e => { onInteract(); setSelection({ subshell: orbital.key, m: Number(e.target.value) }) }}>{basisNames[orbital.l].map((name, i) => <option key={i} value={i - orbital.l}>{name}</option>)}</select></label>}</div>}
  <div ref={surface} className="pm-atom-touch" tabIndex={0} role="group" aria-label={tx('原子视图：方向键旋转，加减号缩放')}
   onPointerDown={e => { if (e.button !== 0) return; onInteract(); e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }) }}
   onPointerMove={e => { const previous = pointers.current.get(e.pointerId); if (!previous) return; const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1]; if (other) { const old = Math.hypot(previous.x - other.x, previous.y - other.y), next = Math.hypot(e.clientX - other.x, e.clientY - other.y); if (old > 0) pose.current.scale = clampScale(pose.current.scale * next / old) } else { pose.current.y += (e.clientX - previous.x) * .5; pose.current.x -= (e.clientY - previous.y) * .5 } pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); setZoomPercent(Math.round(pose.current.scale*100)); requestDraw.current() }}
   onPointerUp={e => pointers.current.delete(e.pointerId)} onPointerCancel={e => pointers.current.delete(e.pointerId)} onLostPointerCapture={e => pointers.current.delete(e.pointerId)}
   onKeyDown={e => { const p = pose.current; if (e.key === 'ArrowUp') p.x -= 10; else if (e.key === 'ArrowDown') p.x += 10; else if (e.key === 'ArrowLeft') p.y -= 10; else if (e.key === 'ArrowRight') p.y += 10; else if (e.key === '+' || e.key === '=') p.scale = clampScale(p.scale + .1); else if (e.key === '-') p.scale = clampScale(p.scale - .1); else if (e.key === 'Home') pose.current = { ...INITIAL }; else return; e.preventDefault(); onInteract(); setZoomPercent(Math.round(pose.current.scale*100)); requestDraw.current() }}>
   <canvas ref={cloudCanvas} className="pm-probability-canvas" aria-hidden="true"/>
   <svg className="pm-atom-scene" viewBox="-184 -184 368 368" aria-hidden="true">
    <defs>
     <radialGradient id={`${id}-proton`} cx="30%" cy="25%" r="72%"><stop stopColor="#e5efd7"/><stop offset=".42" stopColor="#819a70"/><stop offset="1" stopColor="#344e3d"/></radialGradient>
     <radialGradient id={`${id}-neutron`} cx="30%" cy="25%" r="72%"><stop stopColor="#fff9e9"/><stop offset=".42" stopColor="#c8c3ab"/><stop offset="1" stopColor="#797f6c"/></radialGradient>
     <radialGradient id={`${id}-electron`} cx="30%" cy="25%" r="72%"><stop stopColor="#fff6cf"/><stop offset=".4" stopColor="#c7a151"/><stop offset="1" stopColor="#785326"/></radialGradient>
    </defs>
    <g className="pm-atom-rings" ref={rings}/><g className="pm-atom-particles" ref={scene}/>
   </svg>
  </div>
  {mode === 'structure' ? <>
  <div className="pm-atom-shell-picker" role="group" aria-label={tx('电子层')}><button aria-pressed={activeShell === null} onClick={() => { onInteract(); onShellChange?.(null); setFocus(null) }}>{tx('全部')}</button>{shells.map((count, i) => <button key={i} aria-pressed={activeShell === i} aria-label={`${tx('电子层')} ${i + 1}: ${count}`} onClick={() => chooseShell(i)}>{'KLMNOPQ'[i]}<small>{count}</small></button>)}</div>
  {activeShell !== null && <p className="pm-atom-selection-note" aria-live="polite">{'KLMNOPQ'[activeShell]} · {tx('电子数')} <b>{shells[activeShell]}</b></p>}
  <div className="pm-atom-ledger" aria-label={tx('点选粒子，观察它的位置')}>
   {(['proton', 'neutron', 'electron'] as const).map(kind => <button key={kind} data-kind={kind} aria-pressed={focus === kind} onClick={() => choose(kind)}><i aria-hidden="true"/><span>{tx(kind === 'proton' ? '质子' : kind === 'neutron' ? '中子' : '电子')}</span><b key={`${kind}-${kind === 'proton' ? protons : kind === 'neutron' ? neutrons : electrons}`}>{kind === 'proton' ? protons : kind === 'neutron' ? neutrons ?? '—' : electrons}</b></button>)}
  </div>
  </> : <div className="pm-cloud-tools"><p>{tx('疏密表示概率，点不代表电子。')}</p></div>}
  <div className="pm-atom-actions"><div className="pm-atom-zoom" role="group" aria-label={tx('原子缩放')}><button aria-label={tx('缩小原子')} disabled={zoomPercent<=65} onClick={()=>zoomBy(-.25)}>−</button><output>{zoomPercent}%</output><button aria-label={tx('放大原子')} disabled={zoomPercent>=320} onClick={()=>zoomBy(.25)}>+</button></div><div className="pm-atom-controls">{mode === 'structure' && <button disabled={reduced || activeShell !== null || focus === 'proton' || focus === 'neutron'} aria-pressed={paused} onClick={() => { onInteract(); setPaused(!paused) }}>{tx(reduced ? '已减少动态效果' : paused ? '继续运动' : '暂停运动')}</button>}<button onClick={() => { onInteract(); pose.current = { ...INITIAL }; setZoomPercent(100); requestDraw.current() }}>{tx('复位')}</button></div></div><p className="pm-atom-gesture">{tx('拖动旋转 · 滚轮或双指缩放')}</p>
  {mode === 'structure' ? <small>{tx('分层计数示意，非真实轨道；尺寸不按比例。')}</small> : <><small>{tx(selection ? '单轨道，非整个原子。' : '整体为按电子数加权的球平均密度。')}</small><details className="pm-cloud-model"><summary>{tx('模型说明')} · {symbol === 'H' ? 'H' : tx('多电子近似')}</summary><p>{tx(symbol === 'H' ? '氢：非相对论解析解，固定核。' : '类氢屏蔽近似，未计电子关联和相对论效应。')}</p>{completeElementData[symbol]?.configPredicted && <p>{tx('此电子排布包含理论预测。')}</p>}<p>{tx('分布静态；金点为核。自动缩放，大小不可比较。')}</p><a href="https://openstax.org/books/university-physics-volume-3/pages/8-1-the-hydrogen-atom" target="_blank" rel="noreferrer">{tx('来源')} ↗</a></details></>}
 </div>
}
