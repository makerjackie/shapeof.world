import './styles/BridgeDesign.css'
import { useEffect, useMemo, useState } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour, GUIDE_REPLAY_EVENT } from '~/components/experiences/GuideTour'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { BridgeScene } from './BridgeScene'
import { BRIDGES } from './content'
import { Silhouette } from './Silhouette'
import { SpanView } from './SpanView'
import { bridgeResponse, type BridgeKind, type Member } from './model'

const FOCUS: Record<BridgeKind, Member['family'][][]> = {
  beam: [['deck'], ['deck'], ['tower']],
  arch: [['hanger'], ['arch'], ['anchor', 'tower']],
  suspension: [['hanger'], ['cable', 'anchor'], ['tower']],
  stayed: [['deck'], ['cable'], ['tower']],
}

function query(key: string) { return typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(key) }


function LoadPathView({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [kind, setKind] = useState<BridgeKind>('suspension')
  const [position, setPosition] = useState(.32)
  const [truck, setTruck] = useState(320)
  const [playing, setPlaying] = useState(() => query('still') !== '1' && !(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches))
  const [speed, setSpeed] = useState(1)
  const [forces, setForces] = useState(true)
  const [view, setView] = useState(query('style') === 'folio' ? 'section' : 'model')
  const [reset, setReset] = useState(0)
  const [step, setStep] = useState<number | null>(null)
  const [detail, setDetail] = useState(false)
  const style = query('style') === 'folio' ? 'folio' : 'model'
  const bridge = BRIDGES.find(b => b.id === kind)!
  const response = useMemo(() => bridgeResponse(kind, position, truck), [kind, position, truck])
  useEffect(() => {
    if (!playing) return
    let id = 0, last = 0, accumulated = 0
    const frame = (now: number) => {
      if (last && !document.hidden && !isWorldPaused()) accumulated += Math.min((now - last) / 1000, .08)
      last = now
      if (accumulated > 1 / 25) {
        const advance = accumulated * speed / 22
        setPosition(p => (p + advance) % 1)
        accumulated = 0
      }
      id = requestAnimationFrame(frame)
    }
    id = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(id)
  }, [playing, speed])
  const select = (id: BridgeKind) => { setKind(id); setStep(null); setDetail(false); controls.registerInteraction() }
  const inspect = (next: number) => { setStep(current => current === next ? null : next); setForces(true); controls.registerInteraction() }
  const reading = kind === 'beam' ? response.maxMoment : kind === 'stayed' ? response.towerLeft : response.horizontal
  return <div className="bridge-design" data-style={style} data-kind={kind} data-playing={playing} data-position={position.toFixed(4)} data-focus={step ?? 'all'}>
    <header className="bd-heading"><h1>{tx('桥的形状')}</h1><p>{tx('同一辆卡车，四条通往地面的路。')}</p></header>
    <nav className="bd-types" aria-label={tx('选择桥型')}>
      {BRIDGES.map(b => <button key={b.id} type="button" aria-pressed={kind === b.id} onClick={() => select(b.id)} data-bridge={b.id}><Silhouette kind={b.id} /><span>{tx(b.name)}</span><small>{tx(b.verb)}</small></button>)}
    </nav>
    <div className="bd-legend" aria-label={tx('力的图例')}><span className="bd-blue"><b>← →</b>{tx('拉力')}</span><span className="bd-red"><b>→ ←</b>{tx('压力')}</span><small>{tx('越粗，内力越大')}</small></div>
    <div className="bd-viewport" aria-label={tx('可旋转的桥梁模型')}>
      <BridgeScene kind={kind} response={response} position={position} playing={playing} forces={forces} labels view={view} reset={reset} style={style} focus={step === null ? null : FOCUS[kind][step]} onInspect={inspect} />
    </div>
    <div className="bd-camera"><button aria-pressed={view === 'model'} onClick={() => { setView('model'); setReset(r => r + 1); controls.registerInteraction() }}>{tx('立体')}</button><button aria-pressed={view === 'section'} onClick={() => { setView('section'); setReset(r => r + 1); controls.registerInteraction() }}>{tx('正面')}</button><button aria-pressed={forces} onClick={() => { setForces(v => !v); controls.registerInteraction() }}>{tx('受力')}</button><button className="bd-reset" onClick={() => { setReset(r => r + 1); setStep(null); controls.registerInteraction() }}>{tx('复位')}</button><span>{tx('拖动旋转 · 双指缩放')}</span></div>
    <aside className="bd-explanation">
      <div className="bd-chapter">{tx('重量去哪里了')}<span>{tx(bridge.name)}</span></div>
      <h2>{tx(bridge.heading)}</h2>
      <ol className="bd-path">{bridge.steps.map((s, i) => <li key={s}><button aria-pressed={step === i} onClick={() => inspect(i)}><b>{i + 1}</b>{tx(s)}</button></li>)}</ol>
      <div className="bd-trade"><p><strong>{tx('解决了什么')}</strong>{tx(bridge.solves)}</p><p><strong>{tx('代价')}</strong>{tx(bridge.cost)}</p></div>
      <button className="bd-detail-toggle" aria-expanded={detail} onClick={() => { setDetail(d => !d); controls.registerInteraction() }}>{tx(detail ? '收起解释' : '近看这条力的路径')}<span>{detail ? '−' : '+'}</span></button>
      {detail && <div className="bd-detail"><p>{tx(bridge.detail)}</p><div className="bd-mobile-trade"><p><strong>{tx('解决了什么')}</strong> {tx(bridge.solves)}</p><p><strong>{tx('代价')}</strong> {tx(bridge.cost)}</p></div><dl><div><dt>{tx(bridge.reading)}</dt><dd>{Math.round(reading).toLocaleString('en-US')} <small>{kind === 'beam' ? 'kN·m' : 'kN'}</small></dd></div>{kind === 'stayed' ? <div><dt>{tx('基础抗弯矩')}</dt><dd>{Math.round(Math.abs(response.foundationMoment)).toLocaleString('en-US')} <small>kN·m</small></dd></div> : <div><dt>{tx('左侧 / 右侧桥墩竖向力')}</dt><dd>{Math.round(response.towerLeft)} / {Math.round(response.towerRight)} <small>kN</small></dd></div>}{kind === 'suspension' && <div><dt>{tx('每端锚碇抗上拔力')}</dt><dd>{Math.round(response.anchorUplift)} <small>kN</small></dd></div>}</dl></div>}
    </aside>
    <section className="bd-controls" aria-label={tx('卡车与时间')}>
      <div className="bd-play"><button onClick={() => { setPlaying(p => !p); controls.registerInteraction() }} aria-label={tx(playing ? '暂停卡车' : '继续行驶')}><span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>{tx(playing ? '暂停' : '行驶')}</button><button onClick={() => { setSpeed(s => s === 1 ? .5 : s === .5 ? 2 : 1); controls.registerInteraction() }} aria-label={tx('切换行驶速度')}>{speed}×</button></div>
      <label className="bd-position"><span>{tx('拖动卡车')}<output>{Math.round(position * 120)} / 120 m</output></span><input type="range" min="0" max="100" step=".1" value={position * 100} aria-label={tx('卡车位置')} onChange={e => { setPlaying(false); setPosition(Number(e.target.value) / 100); controls.registerInteraction() }} /></label>
      <label className="bd-load"><span>{tx('卡车重量')}<output>{truck} kN</output></span><input type="range" min="80" max="640" step="40" value={truck} aria-label={tx('卡车重量')} onChange={e => { setTruck(Number(e.target.value)); controls.registerInteraction() }} /></label>
      <button className="bd-tour-button" onClick={() => window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT, { detail: { worldId: 'bridge-design' } }))}>{tx('带我看')}</button>
    </section>
    <p className="bd-model-note">{tx('理想静力模型 · 含桥面自重 · 流点表示传力路线，不是力的传播速度')}</p>
    <GuideTour worldId="bridge-design" placement="stage" steps={BRIDGES.map(b => ({ title: tx(b.name), body: tx(b.heading), action: () => { setKind(b.id); setPosition(.5); setPlaying(false); setDetail(false); setStep(null); setForces(true) }, durationMs: 8500 }))} kicker={tx('看见力的路径')} exitLabel={tx('结束导览')} stagePlan={BRIDGES.map(() => ({ position: 'bottom-left', mobilePosition: 'bottom-center', tone: 'dark', treatment: 'caption', width: 'narrow' }))} />
  </div>
}

export function BridgeDesign({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [mode, setMode] = useState(query('view') === 'span' ? 'span' : 'forces')
  return <div className="bridge-world" data-view={mode}>
    <nav className="bd-views" aria-label={tx('切换视图')}>
      <button type="button" aria-pressed={mode === 'forces'} onClick={() => { setMode('forces'); controls.registerInteraction() }}>{tx('力的路径')}</button>
      <button type="button" aria-pressed={mode === 'span'} onClick={() => { setMode('span'); controls.registerInteraction() }}>{tx('跨度与桥型')}</button>
    </nav>
    {mode === 'forces' ? <LoadPathView controls={controls} /> : <SpanView controls={controls} />}
  </div>
}
