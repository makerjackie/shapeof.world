import { useEffect, useRef, useState } from 'react'
import { NavigationArrow, Pause, Play } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { useExperienceI18n } from '~/i18n/experience'
import { createInkScene, type InkEngine, type InkState } from './scene'
import { FLIGHT_SECONDS } from './flight'
import './styles/ink-landscape.css'

export function InkLandscape({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n(), canvas = useRef<HTMLCanvasElement>(null), engine = useRef<InkEngine | null>(null)
  const original = useRef<HTMLDialogElement>(null)
  const callbacks = useRef(controls); callbacks.current = controls
  const [state, setState] = useState<InkState>({ mode: 'landing', playing: false, time: 0, fog: .5, moving: false })
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false)
  const moving = state.moving
  useEffect(() => {
    if (!canvas.current) return
    try {
      engine.current = createInkScene(canvas.current, setState, () => callbacks.current.registerInteraction(), () => callbacks.current.finish())
      const capture = new URLSearchParams(location.search).has('capture')
      if (capture) engine.current.seek(FLIGHT_SECONDS - .4)
      const scene = engine.current
      scene.ready.then(() => {
        if (engine.current !== scene) return
        setReady(true)
        if (!capture) scene.takeOver()
      }).catch(error => {
        if (engine.current !== scene) return
        console.error('Ink texture failed to load', error); setFailed(true)
      })
    } catch (error) { console.error('Ink landscape initialization failed', error); setFailed(true) }
    return () => { engine.current?.dispose(); engine.current = null }
  }, [])
  const action = (fn: (scene: InkEngine) => void) => { controls.registerInteraction(); if (engine.current) fn(engine.current) }
  const start = () => { action(scene => scene.play()) }
  const openOriginal = () => { action(scene => scene.forward(false)); original.current?.showModal() }
  const toggleForward = () => {
    // Focus first: moving focus away from the canvas clears held movement.
    canvas.current?.focus({ preventScroll: true })
    action(scene => scene.forward(!moving))
  }
  const chapter = state.time < 1.2 ? tx('掠过渔舟，穿入松亭') : state.time < 2.5 ? tx('贴水穿过桥洞') : state.time < 6.2 ? tx('穿过屋檐下的街巷') : state.time < 9.5 ? tx('沿溪穿过风雨廊桥') : state.time < 10.5 ? tx('经过茶楼、竹林与庭院') : state.time < 18 ? tx('沿山势升起，回望松溪') : tx('桥、村与群山，尽收眼底')
  return <div className="ink-landscape" data-ready={ready} data-mode={state.mode}>
    <canvas ref={canvas} tabIndex={0} aria-label={tx('水墨山谷：拖动转向，方向键移动，点击水面泛起墨圈')} />
    {failed && <div className="ink-error" role="alert">{tx('三维场景未能加载，请刷新重试。')}</div>}
    {!failed && state.mode !== 'flight' && <div className="ink-title" data-experience-overlay="true">
      <p>{tx('原创水墨山水')}</p><h1>{tx('松溪入画')}</h1>
      {!ready && <span role="status">{tx('山河铺展中')}</span>}
    </div>}
    {state.mode === 'flight' && <div className="ink-flight" data-experience-overlay="true">
      <p className="ink-caption">{chapter}</p>
      <div className="ink-timeline">
        <button aria-label={tx(state.playing ? '暂停飞行' : '继续飞行')} onClick={() => action(scene => scene.pause())}>{state.playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}</button>
        <input aria-label={tx('飞行进度')} type="range" min={0} max={FLIGHT_SECONDS} step="any" value={state.time} onChange={e => action(scene => scene.seek(Number(e.target.value)))} />
        <button className="ink-primary" onClick={() => action(scene => scene.takeOver({ focus: true }))}><NavigationArrow size={19} weight="fill" />{tx('我来飞')}</button>
      </div>
      <p className="ink-flight-hint">{tx('随时拖动画面，也能自由飞行')}</p>
    </div>}
    {state.mode === 'free' && <>
      <p className="ink-hint" data-experience-overlay="true" data-freebar-clearance="true">
        <strong>{tx('自由飞行')}</strong>
        <span className="ink-desktop-hint">{tx('拖动转向 · WASD / 方向键移动 · Q / E 升降')}</span>
        <span className="ink-touch-hint">{tx('点「向前飞」前进，拖动画面转向')}</span>
      </p>
      <Freebar ariaLabel={tx('山水漫游')} primaryControlBudget={2} secondaryDefault="closed" secondary={<>
        <button onClick={openOriginal}>{tx('对照原画')}</button>
        <label className="ink-fog">{tx('雾')}<input aria-label={tx('山间雾量')} type="range" min={0} max={1} step={.01} value={state.fog} onChange={e => action(scene => scene.fog(Number(e.target.value)))} /></label>
      </>}>
        <button className="ink-control ink-primary" aria-pressed={moving} onClick={toggleForward}>{moving ? <Pause size={19} weight="fill" /> : <NavigationArrow size={19} weight="fill" />}<span>{tx(moving ? '悬停' : '向前飞')}</span></button>
        <button className="ink-control" onClick={start}><Play size={17} /><span>{tx('自动游览')}</span></button>
      </Freebar>
      <GhostHint worldId="ink-landscape" gesture={{ type: 'drag', target: '.ink-landscape > canvas', dx: 90, dy: -20, label: tx('拖动画面，转向山水之间') }} />
    </>}
    <dialog className="ink-original" ref={original} aria-label={tx('松溪入画原创母画')} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); original.current?.close() } }} data-experience-overlay="true">
      <button onClick={() => original.current?.close()} aria-label={tx('关闭原画')}>×</button>
      <img src="/assets/worlds/ink-landscape/songxi-v1/master.webp" alt={tx('松溪入画原创母画')} loading="lazy" width={1672} height={941} />
      <p>{tx('松溪入画 · 原创水墨山水')}</p>
    </dialog>
  </div>
}
