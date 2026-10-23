import './styles/PlantCell.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwise, Pause, Play, Sun, Moon } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { useExperienceI18n } from '~/i18n/experience'
import { DEFAULT_ENVIRONMENT } from './model'
import { PlantScene, flyToScale, type ScaleController } from './scene'
import { SCALE_DEFAULT, MOBILE_HERO_SCALE, SCALE_MIN, SCALE_MAX, SCALE_TICKS, LAYERS, clampScale, getActiveLayer, getScaleBar, formatLength } from './scale-model'

export function PlantCell({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [ready, setReady] = useState(false), [mobile, setMobile] = useState(false), [reducedMotion, setReducedMotion] = useState(false)
  const [environment, setEnvironment] = useState({ ...DEFAULT_ENVIRONMENT })
  const [playing, setPlaying] = useState(true), [bounds, setBounds] = useState(false)
  const [reading, setReading] = useState({ scale: SCALE_DEFAULT, width: 1600 })
  const controller = useRef<ScaleController>({ current: SCALE_DEFAULT, target: SCALE_DEFAULT, touched: false, flight: null, reset: 0 })
  useEffect(() => {
    const query = new URLSearchParams(window.location.search), phone = window.innerWidth < 720
    const parsed = query.has('scale') ? Number(query.get('scale')) : phone ? MOBILE_HERO_SCALE : SCALE_DEFAULT
    const scale = clampScale(parsed)
    controller.current.current = scale; controller.current.target = scale; controller.current.touched = query.has('scale')
    setMobile(phone); setReading({ scale, width: window.innerWidth }); setReady(true)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync(); media.addEventListener('change', sync)
    const resize = () => setMobile(window.innerWidth < 720)
    window.addEventListener('resize', resize)
    return () => { media.removeEventListener('change', sync); window.removeEventListener('resize', resize) }
  }, [])
  const updateReading = useCallback((scale: number, width: number) => setReading((old) => Math.abs(old.scale - scale) > 0.0001 || old.width !== width ? { scale, width } : old), [])
  const interact = useCallback(() => { controller.current.touched = true; controls.registerInteraction() }, [controls])
  const go = (scale: number) => { interact(); flyToScale(controller.current, scale) }
  const reset = () => {
    interact(); setEnvironment({ ...DEFAULT_ENVIRONMENT }); setPlaying(true)
    controller.current.reset++; flyToScale(controller.current, mobile ? MOBILE_HERO_SCALE : SCALE_DEFAULT)
  }
  const active = getActiveLayer(reading.scale)
  const bar = getScaleBar(reading.scale, reading.width, mobile ? 88 : 160)
  const position = (scale: number) => (SCALE_MAX - scale) / (SCALE_MAX - SCALE_MIN) * 100
  const captions = { leaf: tx('一片叶子，也是一整个世界。'), section: tx('紧密的栅栏下面，是有空隙的海绵组织。'), cell: tx('小细胞器在流动，叶绿体基本停在原位。'), chloroplast: tx('一摞摞基粒，被薄薄的膜连在一起。') }
  return <div className="pc-experience" data-plant-cell-layer={active}>
    {ready && <PlantScene controller={controller} light={environment.I} playing={playing} mobile={mobile} reducedMotion={reducedMotion} onScale={updateReading} onInteract={interact} />}
    <div className="pc-atmosphere" aria-hidden="true" />
    <header className="pc-heading" data-experience-overlay="true">
      <p><i />{tx('菠菜')} <em>Spinacia oleracea</em></p>
      <h1>{tx(LAYERS.find((layer) => layer.id === active)!.label)}</h1>
      <span>{captions[active]}</span>
    </header>
    <aside className="pc-readout" data-experience-overlay="true" aria-label={tx('读数')}>
      <div><span>{tx('视野宽度')}</span><strong>{formatLength(10 ** reading.scale)}</strong></div>
      <div><span>{tx('模拟时间')}</span><strong>{playing ? '1×' : tx('暂停')}</strong></div>
      {active === 'cell' && <div><span>{tx('胞质环流')}</span><strong>1.3–4.3 <small>μm/s</small></strong></div>}
    </aside>
    <nav className="pc-logscale" data-experience-overlay="true" aria-label={tx('对数标尺')}>
      <div className="pc-scale-track" role="slider" tabIndex={0} aria-label={tx('尺度')} aria-valuemin={SCALE_MIN} aria-valuemax={SCALE_MAX} aria-valuenow={Number(reading.scale.toFixed(2))} aria-valuetext={`${tx(LAYERS.find((layer) => layer.id === active)!.label)} ${formatLength(10 ** reading.scale)}`}
        onPointerDown={(event) => { const rect = event.currentTarget.getBoundingClientRect(); go(SCALE_MAX - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * (SCALE_MAX - SCALE_MIN)) }}
        onKeyDown={(event) => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) { event.preventDefault(); go(event.key === 'Home' ? SCALE_MAX : event.key === 'End' ? SCALE_MIN : reading.scale + (event.key === 'ArrowUp' ? 0.2 : -0.2)) } }}>
        {Array.from({ length: 29 }, (_, i) => <i key={i} className="pc-minor-tick" style={{ top: `${i / 28 * 100}%` }} />)}
        {SCALE_TICKS.map((tick) => <span key={tick.scale} className="pc-major-tick" style={{ top: `${position(tick.scale)}%` }}>{tick.label}</span>)}
        <b className="pc-cursor" style={{ top: `${position(reading.scale)}%` }} />
      </div>
      <div className="pc-layer-names">{LAYERS.map((layer) => <button key={layer.id} aria-current={active === layer.id ? 'location' : undefined} style={{ top: `${position(layer.scale)}%` }} onClick={() => go(layer.id === 'cell' && mobile ? MOBILE_HERO_SCALE : layer.scale)}>{tx(layer.label)}</button>)}</div>
    </nav>
    <div className="pc-scale-bar" data-experience-overlay="true" aria-label={tx('比例尺')}><span>{bar.label}</span><i style={{ width: bar.widthPx }} /><small>{tx('程序化参照结构 · 非标本扫描')}</small></div>
    <p className="pc-gesture" data-experience-overlay="true">{tx(mobile ? '拖动旋转 · 双指缩放' : '拖动旋转 · 滚动缩放')}</p>
    {bounds && <aside className="pc-boundaries" data-experience-overlay="true"><button type="button" onClick={() => setBounds(false)} aria-label={tx('关闭')}>×</button><h2>{tx('模型边界')}</h2><p>{tx('细胞形状、细胞器位置是按尺寸生成的参照，不是真实扫描。')}</p><p>{tx('膜的厚度不在本层解析；切口线为 0.13 μm，约为 8 nm 膜厚的 16 倍。壁上的纹理是纤维束示意。')}</p><p>{tx('光照目前只改变画面，生理过程仍在制作。')}</p></aside>}
    <Freebar className="pc-freebar" ariaLabel={tx('光照和时间')} primaryControlBudget={2} secondaryDefault="closed" mobileDensity="comfortable" secondary={<div className="pc-tools">
      <button type="button" onClick={() => { interact(); setPlaying((value) => !value) }}>{playing ? <Pause /> : <Play />}{tx(playing ? '暂停' : '继续')}</button>
      <button type="button" onClick={reset}><ArrowCounterClockwise />{tx('回到细胞')}</button>
      <button type="button" aria-expanded={bounds} onClick={() => { interact(); setBounds((value) => !value) }}>{tx('模型边界')}</button>
    </div>}>
      <button className="pc-light-switch" type="button" aria-label={tx(environment.I > 0 ? '关灯' : '开灯')} onClick={() => { interact(); setEnvironment((current) => ({ ...current, I: current.I > 0 ? 0 : 1800 })) }}>{environment.I > 0 ? <Sun /> : <Moon />}</button>
      <div className="experience-freebar-field pc-light"><label htmlFor="pc-light">{tx('光照')}<output>{environment.I} <small>μmol m⁻² s⁻¹</small></output></label><input id="pc-light" type="range" min={0} max={2000} step={20} value={environment.I} onChange={(event) => { interact(); setEnvironment((current) => ({ ...current, I: Number(event.target.value) })) }} /></div>
    </Freebar>
    <GhostHint worldId="plant-cell" gesture={{ type: 'drag', target: '.pc-scene canvas', dx: 35, dy: 0, label: tx(mobile ? '双指缩放，从叶子钻进叶绿体' : '滚动放大，从叶子钻进叶绿体') }} />
  </div>
}
