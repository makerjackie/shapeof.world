import './styles/NuclearBomb.css'

import {ArrowCounterClockwise, ArrowLeft, ArrowRight, ArrowUUpLeft, Pause, Play, X} from '@phosphor-icons/react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import type {ExperienceControls} from '~/components/ExperienceShell'
import {Freebar} from '~/components/experiences/Freebar'
import {GhostHint} from '~/components/experiences/GhostHint'
import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'

import {advanceTimeline, CHEMICAL_START, chainSummary, DEFAULT_YIELD_KT, sampleTimeline, slowdownFactor, stepTimeline} from './model'
import {PARTS} from './parts'
import {NuclearScene} from './scene'

type Anchor = {id: string; x: number; y: number; visible: boolean}
const SUMMARY = chainSummary(DEFAULT_YIELD_KT)
const SCHEMATIC = '示意图：只表现结构的层次和发生的先后，不按比例，不含工程细节。'

function ScientificNumber({value, digits = 2}: {value: number; digits?: number}) {
  if (!Number.isFinite(value) || value <= 0) return <>0</>
  const exponent = Math.floor(Math.log10(value))
  const coefficient = value / 10 ** exponent
  if (exponent >= 0 && exponent <= 3) return <>{value.toLocaleString('en-US', {maximumFractionDigits: 0})}</>
  return <>{coefficient.toFixed(digits)}<span className="nb-times"> × 10</span><sup>{exponent}</sup></>
}

export function NuclearBomb({controls}: {controls: ExperienceControls}) {
  const tx = useExperienceI18n()
  const {locale} = useI18n()
  const english = locale === 'en'
  const host = useRef<HTMLDivElement>(null)
  const touchedExplode = useRef(false)
  const [explode, setExplode] = useState(0)
  const [cutAngle, setCutAngle] = useState<0 | 90 | 180>(90)
  const [selectedPart, setSelectedPart] = useState<string | null>(null)
  const [time, setTime] = useState(CHEMICAL_START)
  const [playing, setPlaying] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [autoCamera, setAutoCamera] = useState(true)
  const [manualMicro, setManualMicro] = useState<boolean | null>(null)
  const [anchors, setAnchors] = useState<Array<Anchor>>([])
  const [size, setSize] = useState({width: 1600, height: 1000})
  const [reducedMotion, setReducedMotion] = useState(false)
  const [error, setError] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const sample = sampleTimeline(time)
  const micro = manualMicro ?? (autoCamera && time >= 0)
  const selected = PARTS.find((part) => part.id === selectedPart)
  const slowdown = slowdownFactor(time, speed)
  const mobile = size.width <= 720

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setSize({width: entry.contentRect.width, height: entry.contentRect.height}))
    observer.observe(element)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => { observer.disconnect(); media.removeEventListener('change', sync) }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setExplode(0.55)
      return
    }
    let frame = 0
    let start = 0
    const animate = (stamp: number) => {
      if (touchedExplode.current) return
      start ||= stamp
      const progress = Math.max(0, Math.min(1, (stamp - start - 1000) / 2200))
      setExplode(0.55 * (1 - (1 - progress) ** 3))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let previous = 0
    const tick = (stamp: number) => {
      const delta = previous ? Math.min((stamp - previous) / 1000, 0.1) : 0
      previous = stamp
      setTime((current) => advanceTimeline(current, reverse ? -delta : delta, speed))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, reverse, speed])

  useEffect(() => {
    if (playing && ((!reverse && time >= SUMMARY.durationNs) || (reverse && time <= CHEMICAL_START))) setPlaying(false)
  }, [playing, reverse, time])

  const choosePart = useCallback((id: string | null) => {
    controls.registerInteraction()
    setSelectedPart((current) => current === id ? null : id)
  }, [controls])

  const scrub = (value: number) => {
    controls.registerInteraction()
    setPlaying(false)
    setTime(value)
    setManualMicro(null)
  }

  const play = () => {
    controls.registerInteraction()
    if (!playing && !reverse && time >= SUMMARY.durationNs) setTime(CHEMICAL_START)
    if (!playing && reverse && time <= CHEMICAL_START) setTime(SUMMARY.durationNs)
    setManualMicro(null)
    setPlaying((value) => !value)
  }

  const step = (direction: -1 | 1) => {
    scrub(stepTimeline(time, direction))
  }

  const sectionControls = (id: string) => <>
    <div className="nb-cut-controls"><span>{tx('剖开')}</span><div role="group" aria-label={tx('剖开角度')}>{([0, 90, 180] as const).map((angle) => <button type="button" key={angle} aria-pressed={cutAngle === angle} onClick={() => { controls.registerInteraction(); setCutAngle(angle) }}>{angle}°</button>)}</div></div>
    <label className="nb-explode"><span>{tx('拆开')}<output>{Math.round(explode * 100)}%</output></span><input id={id} type="range" min="0" max="1" step="0.01" value={explode} aria-label={tx('拆开程度')} onChange={(event) => { controls.registerInteraction(); touchedExplode.current = true; setExplode(Number(event.target.value)) }} /></label>
  </>

  const labelPositions = useMemo(() => {
    const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]))
    const result: Array<Anchor & {name: string; order: number; side: 'left' | 'right'; labelX: number; labelY: number}> = []
    for (const side of ['left', 'right'] as const) {
      const parts = PARTS.filter((part) => (part.order <= 3) === (side === 'left'))
      parts.sort((a, b) => (anchorById.get(a.id)?.y ?? a.order * 10) - (anchorById.get(b.id)?.y ?? b.order * 10))
      const inset = mobile ? 13 : size.width >= 1200 ? Math.round(size.width * 0.15) : 38
      const top = mobile ? size.height * 0.31 : Math.max(245, size.height * 0.25)
      const bottom = mobile ? size.height * 0.6 : size.height * 0.65
      const gap = mobile ? 49 : 72
      const heights = parts.map((part, index) => Math.max(top + index * gap, Math.min(bottom - (2 - index) * gap, anchorById.get(part.id)?.y ?? top + index * gap)))
      for (let index = 1; index < heights.length; index++) heights[index] = Math.max(heights[index], heights[index - 1] + gap)
      parts.forEach((part, index) => {
        const anchor = anchorById.get(part.id)
        if (!anchor) return
        result.push({...anchor, name: english ? part.nameEn : part.name, order: part.order, side,
          labelX: side === 'left' ? inset : size.width - inset,
          labelY: heights[index],
        })
      })
    }
    return result
  }, [anchors, english, mobile, size])

  const energyPath = useMemo(() => {
    const points = Array.from({length: 121}, (_, index) => {
      const at = index / 120 * SUMMARY.durationNs
      return `${index * 2},${58 - sampleTimeline(at).energyFraction * 54}`
    })
    return `M${points.join(' L')}`
  }, [])

  return (
    <div className={`nb-world${micro ? ' is-micro' : ''}${micro && sample.energyFraction > 0.2 ? ' is-bright' : ''}${selected ? ' has-selection' : ''}`} ref={host} data-nuclear-time={time.toFixed(4)} data-nuclear-view={micro ? 'micro' : 'cutaway'}>
      <NuclearScene explode={explode} cutAngle={cutAngle} selectedPart={selectedPart} onSelectPart={choosePart} time={time} micro={micro} autoCamera={autoCamera && manualMicro === null} onAnchors={setAnchors} onInteract={controls.registerInteraction} onError={setError} reducedMotion={reducedMotion} />
      <div className="nb-vignette" aria-hidden="true" />

      <header className="nb-heading" data-experience-overlay="true">
        <p><span className="nb-live-dot" />{tx(micro ? '微观视图' : '内爆式装置')}<i />{micro ? '02' : '01'} / 02</p>
        <h1>{tx(micro ? '一颗，再到下一颗。' : '原子弹，一层一层。')}</h1>
        <span>{tx(micro ? '一颗原子核裂开，放出两三个中子。' : '「胖子」外形 · 结构示意')}</span>
      </header>

      {!mobile && !micro && !selected && <aside className="nb-section-controls" data-experience-overlay="true" aria-label={tx('剖面控制')}><div className="nb-panel-eyebrow"><span>{tx('剖面控制')}</span><span>{tx('不按比例')}</span></div>{sectionControls('nb-explode')}</aside>}

      {!micro && (
        <div className="nb-labels" data-experience-overlay="true">
          <svg className="nb-leaders" width={size.width} height={size.height} aria-hidden="true">
            {labelPositions.map((label) => {
              const endX = label.labelX + (label.side === 'left' ? (mobile ? 90 : 152) : -(mobile ? 90 : 152))
              const elbowX = label.side === 'left' ? Math.max(endX + 15, label.x - 25) : Math.min(endX - 15, label.x + 25)
              return <g key={label.id} className={selectedPart === label.id ? 'is-selected' : ''} opacity={selectedPart && selectedPart !== label.id ? 0.28 : 1}>
                <path d={`M${endX},${label.labelY} L${elbowX},${label.labelY} L${label.x},${label.y}`} />
                <circle cx={label.x} cy={label.y} r={2.2} />
              </g>
            })}
          </svg>
          {labelPositions.map((label) => (
            <button type="button" key={label.id} className={`nb-part-label is-${label.side}${selectedPart === label.id ? ' is-selected' : ''}`} style={{[label.side]: label.side === 'left' ? label.labelX : size.width - label.labelX, top: label.labelY - 17}} aria-pressed={selectedPart === label.id} onClick={() => choosePart(label.id)}>
              <span>{String(label.order).padStart(2, '0')}</span><strong>{label.name}</strong>
            </button>
          ))}
        </div>
      )}

      {selected && !micro && (
        <aside className="nb-plaque" data-experience-overlay="true">
          <div className="nb-panel-eyebrow"><span>{tx('结构展签')} / {String(selected.order).padStart(2, '0')}</span><button type="button" onClick={() => choosePart(null)} aria-label={tx('清除选择')}><X /></button></div>
          <h2>{english ? selected.nameEn : selected.name}</h2>
          <p>{english ? selected.descriptionEn : selected.description}</p>
          <small>{tx('点击其他层继续查看')}</small>
        </aside>
      )}

      {micro && (
        <aside className="nb-readout" data-experience-overlay="true" aria-label={tx('链式反应读数')}>
          <div className="nb-panel-eyebrow"><span>{tx('链式反应')}</span><span>{tx('理想化净翻倍')}</span></div>
          <div className="nb-generation"><span>{tx('代数')}</span><strong>{(sample.phase === 'disassembly' ? Math.ceil(SUMMARY.generations) : Math.floor(sample.generation)).toString().padStart(2, '0')}<small> / {Math.ceil(SUMMARY.generations)}</small></strong></div>
          <dl>
            <div><dt>{tx('本代裂变数')}</dt><dd><ScientificNumber value={sample.generationFissions} /></dd></div>
            <div className="nb-energy-reading"><dt>{tx('累计能量')}</dt><dd><ScientificNumber value={sample.energyJ} /> <small>J</small></dd></div>
            <div><dt>{tx('TNT 当量')}</dt><dd><ScientificNumber value={sample.energyKt} /> <small>kt</small></dd></div>
            <div><dt>{tx('经过时间')}</dt><dd>{sample.elapsedNs.toFixed(1)} <small>ns</small></dd></div>
            <div><dt>{tx('放慢倍数')}</dt><dd>{slowdown === null ? '—' : <><ScientificNumber value={slowdown} digits={1} /> <small>×</small></>}</dd></div>
          </dl>
          <p className="nb-reference-yield">{tx('计算参照：15 kt。并非展品的实际当量。')}</p>
          <div className="nb-chart">
            <div><span>{tx('累计能量 · 线性坐标')}</span><span>{(sample.energyFraction * 100).toFixed(1)}%</span></div>
            <svg viewBox="0 0 240 66" role="img" aria-label={tx('累计能量随时间的线性曲线')}>
              <path className="nb-chart-grid" d="M0,4H240 M0,31H240 M0,58H240" />
              <path className="nb-chart-total" d={energyPath} />
              <clipPath id="nb-energy-clip"><rect width={Math.max(0, sample.elapsedNs / SUMMARY.durationNs) * 240} height="66" /></clipPath>
              <path className="nb-chart-current" d={energyPath} clipPath="url(#nb-energy-clip)" />
              <line className="nb-chart-cursor" x1={sample.elapsedNs / SUMMARY.durationNs * 240} x2={sample.elapsedNs / SUMMARY.durationNs * 240} y1="0" y2="60" />
              <circle className="nb-chart-point" cx={sample.elapsedNs / SUMMARY.durationNs * 240} cy={58 - sample.energyFraction * 54} r="2.6" />
            </svg>
            <div className="nb-chart-axis"><span>0 ns</span><span>{SUMMARY.durationNs.toFixed(0)} ns</span></div>
            <i className="nb-energy-track"><b style={{width: `${sample.energyFraction * 100}%`}} /></i>
          </div>
        </aside>
      )}

      <div className="nb-view-tools" data-experience-overlay="true">
        <button type="button" onClick={() => { controls.registerInteraction(); setManualMicro(!micro); setSelectedPart(null) }}>{tx(micro ? '回到剖面' : '进到核心')}<ArrowRight size={13} /></button>
      </div>

      <div className="nb-caption" data-experience-overlay="true">
        {micro && <p className="nb-micro-note">{tx('示意：只画出前 12 代，之后用亮度表示')}</p>}
        {!micro && time >= -1 && time < 0 && <p className="nb-micro-note">{tx('③ 压紧、中子源放出中子')}</p>}
        {!micro && time > CHEMICAL_START && <p className="nb-micro-note">{tx('压缩量为视觉示意，不代表实际比例。')}</p>}
        <p>{tx(SCHEMATIC)} <button type="button" onClick={() => setSourcesOpen((open) => !open)}>{tx('资料来源')}</button></p>
      </div>

      {sourcesOpen && (
        <aside className="nb-sources nb-plaque" data-experience-overlay="true">
          <div className="nb-panel-eyebrow"><span>{tx('资料来源')}</span><button type="button" onClick={() => setSourcesOpen(false)} aria-label={tx('关闭')}><X /></button></div>
          <a href="https://en.wikipedia.org/wiki/Nuclear_fission" target="_blank" rel="noreferrer">Wikipedia · Nuclear fission ↗</a>
          <a href="https://en.wikipedia.org/wiki/Nuclear_chain_reaction" target="_blank" rel="noreferrer">Wikipedia · Nuclear chain reaction ↗</a>
          <a href="https://en.wikipedia.org/wiki/Shake_(unit)" target="_blank" rel="noreferrer">Wikipedia · Shake (unit) ↗</a>
          <a href="https://en.wikipedia.org/wiki/TNT_equivalent" target="_blank" rel="noreferrer">Wikipedia · TNT equivalent ↗</a>
          <a href="https://ahf.nuclearmuseum.org/ahf/history/science-behind-atom-bomb/" target="_blank" rel="noreferrer">Atomic Heritage Foundation · Fission ↗</a>
          <p>{tx('内部层次和压缩只作示意。链式反应按每代净翻倍计算。')}</p>
        </aside>
      )}

      {error && <div className="nb-error" role="alert"><p>{tx('三维视图暂时无法显示。请使用支持 WebGL 的浏览器。')}</p></div>}

      <Freebar className="nb-freebar" ariaLabel={tx('剖面和时间控制')} primaryControlBudget={3} secondaryDefault="closed" secondary={(
        <div className="nb-secondary">
          {(mobile || micro || selected) && sectionControls('nb-explode-secondary')}
          {!mobile && !micro && !selected && <span className="nb-playback-caption">{tx('播放，把不到一微秒慢下来。')}</span>}
          <div className="nb-stepping" role="group" aria-label={tx('时间步进')}>
            <button type="button" aria-label={tx('回到开始')} title={tx('回到开始')} onClick={() => { scrub(CHEMICAL_START); setManualMicro(false) }}><ArrowCounterClockwise size={17} /></button>
            <button type="button" aria-label={tx('上一代')} title={tx('上一代')} onClick={() => step(-1)}><ArrowLeft size={15} /><span>1</span></button>
            <button type="button" aria-label={tx('下一代')} title={tx('下一代')} onClick={() => step(1)}><span>1</span><ArrowRight size={15} /></button>
            <button type="button" aria-pressed={reverse} aria-label={tx('倒放')} title={tx('倒放')} onClick={() => { controls.registerInteraction(); setReverse((value) => !value) }}><ArrowUUpLeft size={17} /><span>{tx('倒放')}</span></button>
          </div>
          <label className="nb-speed"><span>{tx('速度')}</span><select value={speed} aria-label={tx('播放速度')} onChange={(event) => { controls.registerInteraction(); setSpeed(Number(event.target.value)) }}>{[0.25, 0.5, 1, 2, 4].map((value) => <option key={value} value={value}>×{value}</option>)}</select></label>
          <label className="nb-camera"><input type="checkbox" checked={autoCamera} onChange={(event) => { controls.registerInteraction(); setAutoCamera(event.target.checked); setManualMicro(null) }} /><span>{tx('自动镜头')}</span></label>
        </div>
      )}>
        <button type="button" className="nb-play" aria-label={tx(playing ? '暂停' : '播放')} onClick={play}>{playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}<span>{tx(playing ? '暂停' : '播放')}</span></button>
        <div className="nb-timeline">
          <div className="nb-chemical-axis">
            <label htmlFor="nb-chemical"><span>{tx('化学爆轰阶段')}</span><small>{tx('示意，不计时')}</small></label>
            <input id="nb-chemical" type="range" min={CHEMICAL_START} max="0" step="0.01" value={Math.min(0, time)} aria-label={tx('化学爆轰阶段（示意，不计时）')} onChange={(event) => scrub(Number(event.target.value))} />
            <div className="nb-chemical-steps">
              <span className={time > -3 ? 'is-on' : ''} aria-label={tx('① 起爆')}>{mobile ? `① ${tx('起爆')}` : tx('① 起爆')}</span>
              <span className={time > -2 ? 'is-on' : ''} aria-label={tx('② 汇聚')}>{mobile ? `② ${tx('汇聚')}` : tx('② 汇聚')}</span>
              <span className={time > -1 ? 'is-on' : ''} aria-label={tx('③ 压紧、中子源放出中子')} title={tx('③ 压紧、中子源放出中子')}>{mobile ? `③ ${tx('压紧')}` : tx('③ 压紧')}</span>
            </div>
          </div>
          <span className="nb-axis-break" aria-label={tx('断轴：两段使用不同的时间尺度')}>≈</span>
          <div className="nb-chain-axis">
            <label htmlFor="nb-chain"><span>{tx('④ 链式反应')}<small>{tx('每代 10 纳秒 · 理想化')}</small></span><span className={sample.phase === 'disassembly' ? 'is-on' : ''}>{tx('⑤ 解体')}</span></label>
            <input id="nb-chain" type="range" min="0" max={SUMMARY.durationNs} step="any" value={Math.max(0, time)} aria-label={tx('链式反应时间（纳秒）')} aria-valuetext={`${Math.max(0, time).toFixed(1)} ns`} onChange={(event) => scrub(Number(event.target.value))} />
            <div className="nb-ns-ticks">{[0, 200, 400, 600, 800].map((tick) => <span style={{left: `${tick / SUMMARY.durationNs * 100}%`}} key={tick}>{tick}{tick === 800 ? ' ns' : ''}</span>)}</div>
          </div>
        </div>
      </Freebar>
      <GhostHint worldId="nuclear-bomb" gesture={{type: 'drag', target: '.nb-scene', dx: 75, dy: -25, label: tx('拖动旋转，点一层看里面')}} delay={6000} />
    </div>
  )
}
