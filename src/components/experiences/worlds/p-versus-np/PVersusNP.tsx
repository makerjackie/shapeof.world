import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, hasCompletedGuide, replayGuide, GUIDE_AUTOPLAY_STATE_EVENT } from '~/components/experiences/GuideTour'
import { useExperienceI18n } from '~/i18n/experience'
import { makeGraph, permutationCount, traceSearch, verifyRoute, type SearchFrame } from './pnp-model'
import './styles/PVersusNP.css'

const ID = 'p-versus-np'
type Mode = 'idle' | 'search' | 'verify'
export function PVersusNP({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState(9)
  const graph = useMemo(() => makeGraph(size), [size])
  const [path, setPath] = useState<number[]>(() => makeGraph(9).solution)
  const [mode, setMode] = useState<Mode>('idle')
  const [initialGuide] = useState(() => typeof window === 'undefined' || !hasCompletedGuide(ID))
  const [guide, setGuide] = useState(initialGuide)
  const [checked, setChecked] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState('每颗节点经过一次，走完所有节点。')
  const trace = useRef<SearchFrame[]>([])
  const step = useRef(0)
  const points = useRef<Array<{x: number; y: number}>>([])
  const drawState = useRef({ graph, path, checked, mode, guide })
  drawState.current = { graph, path, checked, mode, guide }
  const beginSearch = useCallback(() => {
    trace.current = traceSearch(graph); step.current = 0; setChecked(0); setAttempts(0)
    setMode('search'); setPath([0]); setFeedback('走进死路，就退回来试另一条。')
  }, [graph])
  const beginVerify = useCallback(() => {
    setChecked(0); step.current = 0; setMode('verify')
    setFeedback('依次核对：相邻、没有重复、全部到访。')
  }, [])
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{worldId: string; active: boolean}>).detail
      if (detail.worldId === ID) setGuide(detail.active)
    }
    window.addEventListener(GUIDE_AUTOPLAY_STATE_EVENT, update)
    return () => window.removeEventListener(GUIDE_AUTOPLAY_STATE_EVENT, update)
  }, [])
  useEffect(() => {
    if (mode === 'idle') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setInterval(() => {
      if (mode === 'search') {
        step.current = reduced ? trace.current.length - 1 : Math.min(step.current + 1, trace.current.length - 1)
        const frame = trace.current[step.current]
        if (!frame) return
        setPath(frame.path); setAttempts(step.current + 1)
        if (step.current >= trace.current.length - 1) {
          setMode('idle'); setFeedback('找到一条路线。现在可以沿线核对。')
        }
      } else {
        step.current = reduced ? path.length : step.current + 1
        setChecked(Math.min(step.current, path.length))
        if (step.current >= path.length) {
          setMode('idle')
          setFeedback(verifyRoute(graph, path) ? '路线成立：每颗节点恰好经过一次。' : '路线还不完整。继续连线，或退回一步。')
        }
      }
    }, reduced ? 30 : mode === 'verify' ? 140 : Math.max(65, Math.min(220, 6000 / Math.max(1, trace.current.length))))
    return () => window.clearInterval(timer)
  }, [mode, graph, path.length])
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const ctx = element.getContext('2d')
    if (!ctx) return
    let frame = 0, width = 1, height = 1, last = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const positions: Array<{x: number; y: number}> = []
    const resize = () => {
      const rect = element.getBoundingClientRect(); width = rect.width; height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.round(width * dpr); element.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(resize); ro.observe(element); resize()
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      const time = reduced.matches ? 0 : now / 1000
      const state = drawState.current
      const mobile = width < 680
      const hidden = element.closest('[data-overlays-hidden]')?.getAttribute('data-overlays-hidden') === 'true'
      const cx = hidden ? width * .5 : mobile ? width * .5 : width * .64
      const cy = hidden ? height * .5 : mobile ? height * .52 : height * .48
      const radius = Math.min(width * (mobile ? .355 : .245), height * (mobile ? .205 : .31))
      const background = ctx.createLinearGradient(0, 0, width, height)
      background.addColorStop(0, '#f8f6ec'); background.addColorStop(.55, '#eceadd'); background.addColorStop(1, '#d6d8c6')
      ctx.fillStyle = background; ctx.fillRect(0, 0, width, height)
      // Original porcelain disk with a broad, physically consistent shadow.
      ctx.save(); ctx.translate(cx, cy + 15)
      ctx.shadowColor = '#3543302e'; ctx.shadowBlur = radius * .22; ctx.shadowOffsetY = radius * .15
      ctx.fillStyle = '#e7e6d7'; ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.29, radius * 1.27, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      const disk = ctx.createRadialGradient(cx-radius*.45, cy-radius*.5, 0, cx, cy, radius*1.31)
      disk.addColorStop(0, '#fffef4'); disk.addColorStop(.72, '#f4f2e5'); disk.addColorStop(1, '#e4e2ce')
      ctx.fillStyle = disk; ctx.beginPath(); ctx.arc(cx, cy, radius*1.28, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = '#fffef9bb'; ctx.lineWidth = 2; ctx.stroke()
      ctx.strokeStyle = '#76855a24'; ctx.lineWidth = .6
      for(let ring = 0; ring < 3; ring++) { ctx.beginPath(); ctx.arc(cx, cy, radius*(1.13+ring*.035), 0, Math.PI*2);ctx.stroke() }
      const n = state.graph.size
      for (let i = 0; i < n; i++) {
        const angle = -Math.PI / 2 + i / n * Math.PI * 2
        const r = radius * (i % 3 === 1 ? .89 : 1)
        const target = {x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r}
        if (!positions[i]) positions[i] = {...target}
        const ease = reduced.matches ? 1 : 1 - Math.exp(-dt * 8)
        positions[i].x += (target.x - positions[i].x) * ease; positions[i].y += (target.y - positions[i].y) * ease
      }
      positions.length = n; points.current = positions.map(p => ({...p}))
      for (let i = 0; i < n; i++) for (let j = i+1; j < n; j++) if (state.graph.edges[i][j]) {
        const a = positions[i], b = positions[j]
        ctx.beginPath(); ctx.moveTo(a.x, a.y+3); ctx.lineTo(b.x, b.y+3)
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#68744a14';ctx.stroke()
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
        ctx.lineWidth = 1; ctx.strokeStyle = '#8d987849';ctx.stroke()
      }
      for (let i = 1; i < state.path.length; i++) {
        const a = positions[state.path[i-1]], b = positions[state.path[i]]
        if (!a || !b) continue
        ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y);ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = '#70501140';ctx.lineWidth = 7;ctx.stroke()
        const gold = ctx.createLinearGradient(a.x,a.y,b.x,b.y)
        gold.addColorStop(0,'#a57028');gold.addColorStop(.44,'#edca70');gold.addColorStop(1,'#b89036')
        ctx.strokeStyle = state.checked > i ? '#668a58' : gold;ctx.lineWidth = 3.8;ctx.stroke()
        const q = (time * .45 + i / n) % 1
        ctx.beginPath();ctx.arc(a.x+(b.x-a.x)*q,a.y+(b.y-a.y)*q,2.7,0,Math.PI*2)
        ctx.fillStyle = '#fff7ca';ctx.shadowColor='#ffda76';ctx.shadowBlur=9;ctx.fill();ctx.shadowBlur=0
      }
      const dot = mobile ? 13 : 17
      positions.forEach((p,i) => {
        const selected = state.path.includes(i)
        const checked = state.path.indexOf(i) < state.checked && selected
        ctx.beginPath();ctx.ellipse(p.x+3,p.y+7,dot*1.15,dot*.65,-.1,0,Math.PI*2)
        ctx.fillStyle='#34422d28';ctx.fill()
        const pearl = ctx.createRadialGradient(p.x-dot*.4,p.y-dot*.5,1,p.x,p.y,dot)
        pearl.addColorStop(0,selected?'#fff5c7':'#ffffff');pearl.addColorStop(.64,selected?'#d9bc69':'#e7ecd9');pearl.addColorStop(1,selected?'#a48137':'#aab698')
        ctx.fillStyle=pearl;ctx.beginPath();ctx.arc(p.x,p.y,dot,0,Math.PI*2);ctx.fill()
        ctx.lineWidth=1;ctx.strokeStyle='#fffef7aa';ctx.stroke()
        if (selected) {ctx.strokeStyle=checked?'#517548':'#9d7c36';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(p.x,p.y,dot+5,0,Math.PI*2);ctx.stroke()}
        ctx.fillStyle=selected?'#665024':'#56654b';ctx.font=`500 ${mobile?10:12}px ui-monospace, monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1).padStart(2,'0'),p.x,p.y+.7)
      })
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {cancelAnimationFrame(frame);ro.disconnect()}
  }, [])
  const steps = useMemo(() => [
    { title: tx('一根线，走遍所有节点'), body: tx('每颗节点只经过一次。金线是一份已经给出的答案。'), action: () => {setPath(graph.solution);setChecked(0);setMode('idle')} },
    { title: tx('找答案，要作出选择'), body: tx('沿着连线向前。走进死路，就退回来，再试一条。'), action: beginSearch },
    { title: tx('验答案，沿线走一遍'), body: tx('核对相邻节点、检查重复、确认全部到访，就能判断这条路线。'), action: () => {setPath(graph.solution);beginVerify()} },
    { title: tx('快验的题，都能快解吗？'), body: tx('这就是 P 与 NP 的问题。“快”指随输入规模按多项式增长；小图上的穷举无法给出答案。'), action: () => {setPath([0]);setMode('idle');setChecked(0)} }
  ], [tx, graph, beginSearch, beginVerify])
  const chooseNode = (index: number) => {
    controls.registerInteraction(); setMode('idle');setChecked(0)
    if (path.length === size) {setPath([index]);setFeedback('沿着已有连线，点下一颗节点。');return}
    if (index === path.at(-2)) {setPath(path.slice(0,-1));return}
    if (path.includes(index)) {setFeedback('这颗节点已经到访。点上一颗可以退回。');return}
    if (path.length && !graph.edges[path.at(-1)!][index]) {setFeedback('这两颗节点之间没有连线。');return}
    const next = [...path,index];setPath(next)
    setFeedback(next.length === size ? '路线已连好。试着核对答案。' : '沿着已有连线，点下一颗节点。')
  }
  const act = (action: () => void) => {controls.registerInteraction();action()}
  return <div className="pnp-world">
    <canvas ref={canvas} aria-label={tx('路径谜题：沿连线依次点击节点')} onPointerDown={event => {
      const rect=event.currentTarget.getBoundingClientRect();const x=event.clientX-rect.left,y=event.clientY-rect.top
      const i=points.current.findIndex(p=>Math.hypot(p.x-x,p.y-y)<25)
      if(i>=0)chooseNode(i)
    }} />
    {!guide && <div className="pnp-caption" data-experience-overlay="true"><span>P / NP</span><h1>{tx('找答案，验答案')}</h1><p>{tx(feedback)}</p><small>{tx('已连节点')} {path.length} / {size}{attempts > 0 && <> · {tx('搜索步骤')} {attempts}</>}</small></div>}
    {!guide && <div className="pnp-scale" data-experience-overlay="true"><strong>{permutationCount(size).toLocaleString('en-US')}</strong><span>{tx('种节点排列。排列多，不代表没有捷径。')}</span></div>}
    <GuideTour placement="stage" worldId={ID} steps={steps} defaultOpen={initialGuide} stagePlan={steps.map(()=>({position:'center-left',mobilePosition:'top-left',tone:'dark',width:'normal',treatment:'editorial'}))} onExit={()=>setGuide(false)} />
    {!guide && <Freebar ariaLabel={tx('路径探索')} className="pnp-bar" primaryControlBudget={3} secondary={<>
      <label>{tx('节点')}<select aria-label={tx('节点数量')} value={size} onChange={e=>act(()=>{const n=Number(e.target.value);setSize(n);setPath([0]);setMode('idle');setChecked(0);setAttempts(0)})}>{[6,9,12].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <div className="pnp-keyboard" role="group" aria-label={tx('按编号连接节点')}>{Array.from({length:size},(_,i)=><button key={i} type="button" aria-label={`${tx('节点')} ${i+1}`} onClick={()=>chooseNode(i)}>{i+1}</button>)}</div>
      <button type="button" className="experience-story-button" onClick={()=>act(()=>{setGuide(true);replayGuide(ID)})}>{tx('故事')}</button>
    </>}><button type="button" onClick={()=>act(beginSearch)}>{tx('找一条路')}</button><button type="button" data-pnp-verify onClick={()=>act(beginVerify)}>{tx('核对路线')}</button><button type="button" onClick={()=>act(()=>{setPath([0]);setMode('idle');setChecked(0);setAttempts(0);setFeedback('沿着已有连线，点下一颗节点。')})}>{tx('重来')}</button></Freebar>}
    {!guide && <GhostHint worldId={ID} gesture={{type:'tap',target:'[data-pnp-verify]',label:tx('让光点沿线核对答案')}} />}
  </div>
}
