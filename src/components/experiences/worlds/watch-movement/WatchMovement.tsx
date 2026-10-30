import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour, GUIDE_REPLAY_EVENT } from '~/components/experiences/GuideTour'
import { isWorldAudioMuted } from '~/lib/world-playback'
import { useExperienceI18n } from '~/i18n/experience'
import { WatchScene } from './Scene'
import { PARTS, UI, VIEWS } from './content'
import { advance, amplitude, dailyRate, DEFAULT_SETTINGS, escapementStage, formatTime, frequency, indicationSeconds, initialState, remainingHours, TAU, wind, WHEELS, type PartId, type Settings, type ViewId, type WatchState } from './model'
import './styles/watch-movement.css'

type Props = { controls: ExperienceControls }
const SPEEDS = [.0625, .125, .25, 1, 60, 3600]
const speedText = (n: number) => n < 1 ? `1/${Math.round(1 / n)}×` : `${n.toLocaleString('en-US')}×`
function Scope({ state, settings, tx }: { state: WatchState; settings: Settings; tx: (s: string) => string }) {
  const angle = (state.beats + state.phase) / 2, f = frequency(settings)
  const a = amplitude(state, settings) / (Math.PI * 300 / 180)
  const points = Array.from({ length: 180 }, (_, i) => {
    const x = i / 179 * 240, time = i / 179 * 1.5
    return `${x.toFixed(2)},${(32 - Math.sin((angle - time * f) * TAU) * a * 25).toFixed(2)}`
  }).join(' ')
  return <div className="wm-scope"><svg viewBox="0 0 240 65" role="img" aria-label={tx(UI.traceNote.zh)}>
    {[8, 32, 56].map(y => <path key={y} d={`M0 ${y}H240`} className="wm-scope-grid" />)}
    {[0, 48, 96, 144, 192, 240].map(x => <path key={x} d={`M${x} 0V65`} className="wm-scope-grid" />)}
    <polyline points={points} fill="none" stroke="#a7bdce" strokeWidth="1.2" />
    <path d="M239 0V65" stroke="#c69c62" strokeWidth="1" />
  </svg><span>1.5 s</span></div>
}
function Slider({ label, value, min, max, step = .01, display, onChange }: { label: string; value: number; min: number; max: number; step?: number; display: string; onChange: (n: number) => void }) {
  return <label className="wm-range"><span>{label}<output>{display}</output></span><input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={e => onChange(Number(e.target.value))} /></label>
}
export function WatchMovement({ controls }: Props) {
  const tx = useExperienceI18n()
  const state = useRef(initialState()), winding = useRef(false)
  const [snapshot, setSnapshot] = useState(state.current)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(.125)
  const [explode, setExplode] = useState(.07)
  const [view, setView] = useState<ViewId>('movement')
  const [reset, setReset] = useState(0)
  const [selected, setSelected] = useState<PartId | null>('balance')
  const [bridges, setBridges] = useState(true)
  const [labels, setLabels] = useState(false)
  const [path, setPath] = useState(false)
  const [tab, setTab] = useState<'parts' | 'lab'>('parts')
  const [sound, setSound] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const soundRef = useRef(sound); soundRef.current = sound
  const onInteract = useCallback(() => controls.registerInteraction(), [controls.registerInteraction])
  const sample = useCallback((s: WatchState) => setSnapshot(s), [])
  const setSetting = (key: keyof Settings, value: number) => { setSettings(s => ({ ...s, [key]: value })); onInteract() }
  const select = useCallback((id: PartId) => { setSelected(id); setTab('parts'); onInteract() }, [onInteract])
  const changeView = useCallback((id: ViewId) => {
    setView(id); setReset(r => r + 1); onInteract()
    if (id === 'escapement') { setExplode(0); setBridges(false); setSpeed(.0625); setSelected('escape') }
    else if (id === 'spring') { setBridges(false); setSelected('barrel'); setSpeed(.25) }
    else if (id === 'dial') { setExplode(0); setBridges(false); setSelected('motion'); setSpeed(60) }
    else setSelected('balance')
  }, [onInteract])
  const reinitialize = useCallback(() => {
    state.current = initialState(); setSnapshot(state.current); setSettings(DEFAULT_SETTINGS); setExplode(.07)
    setPaused(false); setSpeed(.125); setView('movement'); setBridges(true); setSelected('balance'); setReset(r => r + 1)
    setPath(false); setLabels(false); winding.current = false; onInteract()
  }, [onInteract])
  const step = useCallback(() => {
    setPaused(true)
    const dt = (1.000001 - state.current.phase) / (frequency(settings) * 2)
    state.current = advance(state.current, dt, settings); setSnapshot({ ...state.current }); onInteract()
  }, [settings, onInteract])
  const addWind = useCallback((turns: number) => { state.current = wind(state.current, turns); setSnapshot({ ...state.current }); onInteract() }, [onInteract])
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) setPaused(true)
    const change = () => { if (reduced.matches) setPaused(true) }
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input,textarea,button,select,[contenteditable=true]')) return
      if (event.code === 'Space') { event.preventDefault(); setPaused(p => !p); onInteract() }
      if (event.code === 'ArrowRight') { event.preventDefault(); step() }
      if (event.code === 'KeyR') reinitialize()
    }
    window.addEventListener('keydown', keydown); reduced.addEventListener('change', change)
    return () => { window.removeEventListener('keydown', keydown); reduced.removeEventListener('change', change) }
  }, [onInteract, reinitialize, step])
  useEffect(() => () => { audio.current?.close(); winding.current = false }, [])
  const onBeat = useCallback(() => {
    if (!soundRef.current || isWorldAudioMuted() || !audio.current || audio.current.state !== 'running') return
    const context = audio.current, oscillator = context.createOscillator(), gain = context.createGain(), now = context.currentTime
    oscillator.type = 'triangle'; oscillator.frequency.value = 2100 + (state.current.beats % 2) * 430
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.035, now + .001); gain.gain.exponentialRampToValueAtTime(.0001, now + .016)
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now); oscillator.stop(now + .02)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }, [])
  const toggleSound = () => {
    if (!sound && !audio.current) audio.current = new AudioContext()
    if (!sound) void audio.current?.resume()
    setSound(s => !s); onInteract()
  }
  const names = useMemo(() => Object.fromEntries(PARTS.map(p => [p.id, tx(p.label.zh)])), [tx])
  const part = PARTS.find(p => p.id === selected) ?? PARTS[6]
  const f = frequency(settings), rate = dailyRate(settings), stage = escapementStage(snapshot)
  const partSpeed = selected && WHEELS.find(w => w.id === selected)
  const stages = [
    { id: 'barrel' as const, title: tx('能量被卷进发条'), body: tx(PARTS[0].detail.zh), action: () => { changeView('spring'); setPath(true); setSpeed(.25); addWind(6) }, durationMs: 11000 },
    { id: 'center' as const, title: tx('慢慢转，越来越快'), body: tx('每对齿轮都把速度乘上自己的齿数比。中心轮、第三轮、第四轮，最后把一小时分成六十个一分钟。'), action: () => { changeView('movement'); setBridges(false); setExplode(.12); setSelected('third'); setPath(true); setSpeed(60) }, durationMs: 11000 },
    { id: 'escape' as const, title: tx('动力在这里停下来'), body: tx(PARTS[4].detail.zh), action: () => { changeView('escapement'); setPath(false); setPaused(false) }, durationMs: 14000 },
    { id: 'spring' as const, title: tx('谁决定一秒有多长'), body: tx(PARTS[7].detail.zh), action: () => { changeView('escapement'); setSelected('spring'); setTab('lab'); setSettings(DEFAULT_SETTINGS) }, durationMs: 12000 },
    { id: 'motion' as const, title: tx('把节拍送到指针'), body: tx(PARTS[9].detail.zh), action: () => { changeView('dial'); setTab('parts'); setSpeed(3600) }, durationMs: 11000 },
  ]
  return <div className="watch-movement" data-view={view} data-playing={!paused} data-beats={snapshot.beats} data-reserve={snapshot.reserve.toFixed(4)}>
    <div className="wm-stage" aria-label={tx('可旋转和拆解的机械表机芯')}>
      <WatchScene state={state} settings={settings} paused={paused} speed={speed} explode={explode} view={view} reset={reset} bridges={bridges} labels={labels} path={path} selected={selected} winding={winding} select={select} sample={sample} onBeat={onBeat} names={names} onInteract={onInteract} />
    </div>
    <div className="wm-heading"><span className="wm-kicker">MECHANICAL OBSERVATORY / 04</span><h1>{tx(UI.title.zh)}</h1><p>{tx(UI.subtitle.zh)}</p></div>
    <nav className="wm-views" aria-label={tx('观察位置')}>{VIEWS.map(v => <button key={v.id} aria-pressed={view === v.id} onClick={() => changeView(v.id)}><small>{v.number}</small>{tx(v.label.zh)}</button>)}</nav>
    <div className="wm-status"><i data-stopped={snapshot.reserve <= 0 || paused} /><span>{tx(snapshot.reserve <= 0 ? UI.stopped.zh : paused ? UI.held.zh : UI.working.zh)}</span><b>{speedText(speed)}</b><small>{tx(UI.explore.zh)}</small></div>
    <aside className="wm-sidebar">
      <section className="wm-instruments" aria-label={tx(UI.instrument.zh)}>
        <div className="wm-section-title"><span>{tx(UI.instrument.zh)}</span><b>CAL. 04 / 15T</b></div>
        <div className="wm-time"><span>{tx(UI.indicated.zh)}</span><output>{formatTime(indicationSeconds(snapshot))}</output></div>
        <div className="wm-reference"><span>{tx('参照时间')} {formatTime(snapshot.elapsed)}</span><b>{indicationSeconds(snapshot) - snapshot.elapsed >= 0 ? '+' : ''}{(indicationSeconds(snapshot) - snapshot.elapsed).toFixed(2)} s</b></div>
        <Scope state={snapshot} settings={settings} tx={tx} />
        <dl className="wm-readings"><div><dt>{tx(UI.frequency.zh)}</dt><dd>{f.toFixed(3)}<small>Hz</small></dd></div><div><dt>{tx(UI.amplitude.zh)}</dt><dd>{Math.round(amplitude(snapshot, settings) * 180 / Math.PI)}<small>°</small></dd></div><div><dt>{tx(UI.rate.zh)}</dt><dd data-off={Math.abs(rate) > .01}>{rate > 0 ? '+' : ''}{Math.round(rate)}<small>{tx(UI.perDay.zh)}</small></dd></div></dl>
        <div className="wm-energy"><div><span>{tx(UI.reserve.zh)}</span><b>{remainingHours(snapshot, settings).toFixed(1)} <small>{tx(UI.hours.zh)}</small></b></div><div className="wm-energy-track"><i style={{ width: `${snapshot.reserve * 100}%` }} /></div></div>
      </section>
      <nav className="wm-panel-tabs" aria-label={tx('探索面板')}><button aria-pressed={tab === 'parts'} onClick={() => { setTab('parts'); onInteract() }}>{tx(UI.parts.zh)}</button><button aria-pressed={tab === 'lab'} onClick={() => { setTab('lab'); onInteract() }}>{tx(UI.physics.zh)}</button></nav>
      {tab === 'parts' ? <section className="wm-parts-panel">
        <div className="wm-part-list">{PARTS.map((p, i) => <button key={p.id} aria-pressed={selected === p.id} onClick={() => select(p.id)}><span>{String(i + 1).padStart(2, '0')}</span><i style={{ background: p.color }} />{tx(p.label.zh)}</button>)}</div>
        <article className="wm-detail"><div className="wm-section-title"><span>{tx(UI.details.zh)}</span><b>{selected?.toUpperCase()}</b></div><h2>{tx(part.label.zh)}</h2><h3>{tx(part.role.zh)}</h3><p>{tx(part.detail.zh)}</p><div className="wm-part-data">{tx(part.data.zh)}</div>{partSpeed && <dl><dt>{tx('相对中心轮')}</dt><dd>{Math.abs(partSpeed.ratio)}× <small>{tx(partSpeed.ratio < 0 ? '反向' : '同向')}</small></dd></dl>}</article>
      </section> : <section className="wm-lab-panel">
        <div className="wm-section-title"><span>{tx(UI.physics.zh)}</span><b>f = √(κ/I) / 2π</b></div>
        <Slider label={tx(UI.length.zh)} value={settings.length} min={.96} max={1.04} step={.0005} display={`${(settings.length * 100).toFixed(2)}%`} onChange={n => setSetting('length', n)} />
        <Slider label={tx(UI.inertia.zh)} value={settings.inertia} min={.9} max={1.1} step={.001} display={`${(settings.inertia * 100).toFixed(1)}%`} onChange={n => setSetting('inertia', n)} />
        <Slider label={tx(UI.friction.zh)} value={settings.friction} min={.5} max={2} step={.05} display={`${settings.friction.toFixed(2)}×`} onChange={n => setSetting('friction', n)} />
        <p className="wm-caption">{tx(UI.adjustNote.zh)}</p>
        <div className="wm-presets"><button onClick={() => { setSettings(DEFAULT_SETTINGS); onInteract() }}>{tx(UI.normal.zh)}</button><button onClick={() => { setSettings(s => ({ ...s, length: 1.02 })); onInteract() }}>{tx(UI.slow.zh)}</button><button onClick={() => { setSettings(s => ({ ...s, inertia: .98 })); onInteract() }}>{tx(UI.light.zh)}</button></div>
        <div className="wm-section-title wm-lab-subtitle"><span>{tx(UI.reserve.zh)}</span><b>{(snapshot.reserve * 100).toFixed(0)}%</b></div>
        <button className="wm-wind" onClick={() => addWind(.5)} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); winding.current = true; onInteract() }} onPointerUp={() => { winding.current = false }} onPointerCancel={() => { winding.current = false }} onLostPointerCapture={() => { winding.current = false }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addWind(1) } }}><span>↻</span>{tx(UI.wind.zh)}<small>{tx('按住持续上链')}</small></button>
        <div className="wm-presets"><button onClick={() => addWind(24)}>{tx(UI.fullWind.zh)}</button><button onClick={() => { state.current = { ...state.current, reserve: 0 }; setSnapshot({ ...state.current }); onInteract() }}>{tx(UI.empty.zh)}</button></div>
        <p className="wm-caption">{tx(UI.reserveNote.zh)}</p>
        <div className="wm-section-title wm-lab-subtitle"><span>{tx(UI.train.zh)}</span><b>8 × 7.5 × 16</b></div>
        <div className="wm-ratios"><span>96 : 12</span><span>80 : 10</span><span>75 : 10</span><span>96 : 6</span></div>
        <p className="wm-caption">{tx('一个小时，28,800 次半摆；15 枚擒纵齿，每圈放行 30 拍。')}</p>
      </section>}
    </aside>
    {view === 'escapement' && <div className="wm-escape-state"><span>{tx('擒纵的一个半摆')}</span><div>{(['release', 'impulse', 'lock'] as const).map(s => <b key={s} data-active={stage === s}>{tx(UI[s].zh)}</b>)}</div><p>{tx('画面慢放；接触面和时间窗为示意')}</p></div>}
    {snapshot.reserve <= 0 && <div className="wm-empty"><p>{tx(UI.stopNote.zh)}</p><button onClick={() => addWind(6)}>{tx(UI.wind.zh)}</button></div>}
    <section className="wm-toolbar" aria-label={tx('拆解与播放控制')}>
      <div className="wm-playback"><button className="wm-play" aria-label={tx(paused ? UI.play.zh : UI.pause.zh)} onClick={() => { setPaused(p => !p); onInteract() }}>{paused ? '▷' : 'Ⅱ'}</button><select aria-label={tx(UI.speed.zh)} value={speed} onChange={e => { setSpeed(Number(e.target.value)); onInteract() }}>{SPEEDS.map(s => <option key={s} value={s}>{speedText(s)}</option>)}</select><button className="wm-step" onClick={step} aria-label={tx(UI.step.zh)}>Ⅰ▷</button></div>
      <Slider label={tx(UI.explode.zh)} value={explode} min={0} max={1} display={`${Math.round(explode * 100)}%`} onChange={n => { setExplode(n); onInteract() }} />
      <div className="wm-switches"><button aria-pressed={bridges} onClick={() => { setBridges(p => !p); onInteract() }}>{tx(UI.bridges.zh)}</button><button aria-pressed={path} onClick={() => { setPath(p => !p); onInteract() }}>{tx(UI.showPath.zh)}</button><button aria-pressed={labels} onClick={() => { setLabels(p => !p); onInteract() }}>{tx(UI.labels.zh)}</button><button aria-pressed={sound} onClick={toggleSound}>{tx('滴答声')}</button><button onClick={() => { setReset(r => r + 1); onInteract() }}>{tx('镜头复位')}</button></div>
      <button className="wm-tour" onClick={() => window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT, { detail: { worldId: 'watch-movement' } }))}>{tx(UI.tour.zh)} <span>↗</span></button>
      <button className="wm-reset" onClick={reinitialize}>{tx(UI.reset.zh)}</button>
    </section>
    <p className="wm-note">{tx(UI.note.zh)}</p>
    <GuideTour worldId="watch-movement" steps={stages} placement="stage" kicker={tx(UI.tourKicker.zh)} exitLabel={tx(UI.tourExit.zh)} stagePlan={stages.map(() => ({ position: 'bottom-left', mobilePosition: 'bottom-center', tone: 'light', treatment: 'caption', width: 'narrow' }))} />
  </div>
}
