import './styles/PlantCell.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, Sun, Moon } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GuideTour } from '~/components/experiences/GuideTour'
import { GhostHint } from '~/components/experiences/GhostHint'
import { useExperienceI18n } from '~/i18n/experience'
import { DEFAULT_INPUTS, createPhysiology, getPhysiologySnapshot, type PlantInputs, type PhysiologyState } from './model'
import { PlantScene, flyToScale, type ScaleController } from './scene'
import { SCALE_DEFAULT, MOBILE_HERO_SCALE, SCALE_MIN, SCALE_MAX, SCALE_TICKS, LAYERS, clampScale, getActiveLayer, getScaleBar, getFramedScale, formatLength } from './scale-model'
import { getMolecularReadings } from './molecular-model'
import { parseCaptureParams } from './capture-params'

export function PlantCell({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [capture, setCapture] = useState(false)
  const [guide, setGuide] = useState(false)
  const [ready, setReady] = useState(false), [mobile, setMobile] = useState(false), [reducedMotion, setReducedMotion] = useState(false)
  const [inputs, setInputs] = useState<PlantInputs>({ ...DEFAULT_INPUTS })
  const physiology = useRef<PhysiologyState>(null!)
  if (!physiology.current) physiology.current = createPhysiology(DEFAULT_INPUTS)
  const [snapshot, setSnapshot] = useState(() => getPhysiologySnapshot(physiology.current, DEFAULT_INPUTS))
  const [bounds, setBounds] = useState(false), [expandedReadouts, setExpandedReadouts] = useState(false)
  const [hintVersion, setHintVersion] = useState(0), [lightHint, setLightHint] = useState(false)
  const lastLight = useRef(400)
  const manualSpeed = useRef(false)
  useEffect(() => {
    if (!hintVersion) return
    setLightHint(true)
    const timer = window.setTimeout(() => setLightHint(false), 6000)
    return () => window.clearTimeout(timer)
  }, [hintVersion])
  const [reading, setReading] = useState({ scale: SCALE_DEFAULT, width: 1600 })
  const controller = useRef<ScaleController>({ current: SCALE_DEFAULT, target: SCALE_DEFAULT, touched: false, flight: null, reset: 0 })
  useEffect(() => {
    const phone = window.innerWidth < 720
    const initial = parseCaptureParams(window.location.search, phone)
    controller.current.current = initial.scale; controller.current.target = initial.scale; controller.current.touched = initial.touched
    controller.current.initialOrbit = initial.orbit
    manualSpeed.current = initial.manualSpeed
    setInputs(initial.inputs); lastLight.current = initial.inputs.I || 400
    physiology.current = createPhysiology(initial.inputs, initial.daySeconds, initial.waterProgress)
    setSnapshot(getPhysiologySnapshot(physiology.current, initial.inputs)); setCapture(initial.capture); setGuide(initial.guide)
    setMobile(phone); setReading({ scale: initial.scale, width: window.innerWidth }); setReady(true)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync(); media.addEventListener('change', sync)
    const resize = () => setMobile(window.innerWidth < 720)
    window.addEventListener('resize', resize)
    return () => { media.removeEventListener('change', sync); window.removeEventListener('resize', resize) }
  }, [])
  const updateReading = useCallback((scale: number, width: number) => setReading((old) => Math.abs(old.scale - scale) > 0.0001 || old.width !== width ? { scale, width } : old), [])
  const interact = useCallback(() => { controller.current.touched = true; setGuide(false); controls.registerInteraction() }, [controls])
  const go = (scale: number) => { interact(); flyToScale(controller.current, scale) }
  const reset = () => {
    interact(); setInputs({ ...DEFAULT_INPUTS }); physiology.current = createPhysiology(DEFAULT_INPUTS)
    setSnapshot(getPhysiologySnapshot(physiology.current, DEFAULT_INPUTS)); lastLight.current=400; setLightHint(false)
    controller.current.initialOrbit = undefined; controller.current.reset++; flyToScale(controller.current, mobile ? MOBILE_HERO_SCALE : SCALE_DEFAULT)
    manualSpeed.current = false
  }
  const changeLight = (I: number) => {
    interact(); if(I > 0) lastLight.current=I
    setInputs((current) => ({ ...current, I })); setHintVersion((value) => value + 1)
  }
  const active = getActiveLayer(reading.scale)
  const molecular = active === 'membrane' || active === 'motor'
  useEffect(() => {
    if (ready && !manualSpeed.current) setInputs(current => ({ ...current, timeScale: molecular ? 0.001 : 1 }))
  }, [molecular, ready])
  const molecularReading = getMolecularReadings(snapshot.actualPPFD, reading.scale, inputs.timeScale, inputs.playing)
  const bar = getScaleBar(getFramedScale(reading.scale, mobile), reading.width, mobile ? 88 : 160)
  const position = (scale: number) => (SCALE_MAX - scale) / (SCALE_MAX - SCALE_MIN) * 100
  const guideSteps = useMemo(() => [
    { title: tx('一片叶子'), body: tx('沿着叶脉向里走。这片菠菜叶，连接着我们即将看到的细胞和分子。'), scale: -.54 },
    { title: tx('气孔'), body: tx('两枚保卫细胞围出一个孔。气孔调节气体交换，也影响水分散失。'), scale: -2.55 },
    { title: tx('叶片截面'), body: tx('紧密的栅栏组织朝向阳光，下面的海绵组织留下连通的气腔。'), scale: -3 },
    { title: tx('叶肉细胞'), body: tx('小细胞器沿胞质索流动。叶绿体留在壁边，用几分钟调整向光的位置。'), scale: mobile ? MOBILE_HERO_SCALE : SCALE_DEFAULT },
    { title: tx('叶绿体'), body: tx('一摞摞类囊体组成基粒，伸出的薄膜把它们连接起来。'), scale: -5.22 },
    { title: tx('类囊体膜'), body: tx('光系统让电子接力前进，把质子积累到腔内。伸向基质的大分子只能站在空隙足够的膜面。'), scale: -6.85 },
    { title: tx('ATP 合酶'), body: tx('铜色转子转一圈通过 14 个质子，三个催化位点释放 3 个 ATP。关灯，它会锁住。'), scale: mobile ? -7.7 : -7.34 },
  ].map(step => ({ title: step.title, body: step.body, durationMs: 7500, action: () => {
    flyToScale(controller.current, step.scale)
  } })), [tx, mobile])
  const captions = { leaf: tx('一片叶子，也是一整个世界。'), section: tx('紧密的栅栏下面，是有空隙的海绵组织。'), cell: tx('小细胞器快速流动，叶绿体用几分钟挪向合适的光。'), chloroplast: tx('一摞摞基粒，被薄薄的膜连在一起。'), membrane: tx('膜上的分子各有位置。电子一路走，质子留在腔里。'), motor: tx('转子转一圈，14 个质子通过，3 个 ATP 离开。') }
  return <div className="pc-experience" data-plant-cell-layer={active} data-capture={capture}>
    {ready && <PlantScene capture={capture} controller={controller} viewScale={reading.scale} inputs={inputs} physiology={physiology} onPhysiology={setSnapshot} mobile={mobile} reducedMotion={reducedMotion} onScale={updateReading} onInteract={interact} />}
    <div className="pc-atmosphere" aria-hidden="true" />
    <header className="pc-heading" data-experience-overlay="true">
      <p><i />{tx('菠菜')} <em>Spinacia oleracea</em></p>
      <h1>{tx(LAYERS.find((layer) => layer.id === active)!.label)}</h1>
      <span>{captions[active]}</span>
    </header>
    <aside className={`pc-readout ${expandedReadouts ? 'is-expanded' : ''}`} data-experience-overlay="true" aria-label={tx('读数')}>
      <div><span>{tx('视野宽度')}</span><strong>{formatLength(10 ** getFramedScale(reading.scale, mobile))}</strong></div>
      <div className="pc-time-reading"><span>{tx('时间倍率')}</span><strong>{inputs.playing ? inputs.timeScale === .001 ? '1/1000×' : `${inputs.timeScale}×` : tx('暂停')}</strong></div>
      <div><span>{tx('光照')}</span><strong>{Math.round(snapshot.actualPPFD)} <small>μmol m⁻² s⁻¹</small></strong></div>
      <div><span>{tx('净光合')}</span><strong>{snapshot.netAssimilation.toFixed(2)} <small>μmol m⁻² s⁻¹</small></strong></div>
      <div><span>{tx('净放氧（估算）')}</span><strong>{snapshot.approximateNetOxygen.toFixed(2)} <small>μmol m⁻² s⁻¹</small></strong></div>
      {!molecular && <><div><span>{tx('气孔开度')}</span><strong>{Math.round(snapshot.stomatalOpening*100)}%</strong></div>
      <div><span>{tx('叶水势 Ψ')}</span><strong>{snapshot.water.psi.toFixed(2)} <small>MPa</small></strong></div>
      <div><span>{tx('膨压 P')}</span><strong>{snapshot.water.pressure.toFixed(2)} <small>MPa</small></strong></div>
      <div><span>{tx('细胞相对体积')}</span><strong>{Math.round(snapshot.water.relativeVolume*100)}%</strong></div>
      <div><span>{tx('淀粉储量')}</span><strong>{Math.round(snapshot.starchFraction*100)}%</strong></div></>}
      {molecular && <div><span>{tx('类囊体腔宽')}</span><strong>{molecularReading.lumenNm.toFixed(1)} <small>nm</small></strong></div>}
      {active === 'membrane' && <p>{tx(inputs.timeScale === .001 ? '电子传递以约 1/1000 的局部慢放示意；亮点代表传递事件，不是粒子轨道。' : '分子运动已加快；亮点与轨迹示意事件密度，不逐个追踪真实电子。')}</p>}
      {active === 'motor' && <>
        <div><span>{tx('每圈质子')}</span><strong>14 H⁺</strong></div>
        <div><span>{tx('每圈 ATP')}</span><strong>3</strong></div>
        <div><span>H⁺ / ATP</span><strong>4.67</strong></div>
        <div><span>{tx('真实转速（数量级）')}</span><strong>{molecularReading.actualRps.toFixed(0)} <small>rev/s</small></strong></div>
        <div><span>{tx('局部慢放')}</span><strong>{molecularReading.slowdown > 0 ? `1/${Math.round(molecularReading.slowdown)}×` : '—'}</strong></div>
        <p>{tx(snapshot.actualPPFD === 0 ? '黑暗中，γ 亚基的氧化还原开关锁住转子。' : '铜色转子逆时针转动（从基质侧看）；外面的定子不动。')}</p>
        {molecularReading.motionCapped && <p>{tx('高速时转动显示限于每秒 2 圈；局部倍率按实际显示速度计算。')}</p>}
      </>}
      {inputs.dayCycle && <div><span>{tx('一天中的时间')}</span><strong>{`${Math.floor(snapshot.daySeconds/3600).toString().padStart(2,'0')}:${Math.floor(snapshot.daySeconds%3600/60).toString().padStart(2,'0')}`}</strong></div>}
      {active === 'cell' && <div><span>{tx('胞质环流')}</span><strong>1.3–4.3 <small>μm/s</small></strong></div>}
      {active === 'cell' && <div><span>{tx('顶面叶绿体')}</span><strong>{snapshot.topChloroplastCount} / 200</strong></div>}
      {active === 'cell' && inputs.timeScale >= 3600 && <p>{tx('环流太快，显示为轨迹')}</p>}
      {!molecular && inputs.water === 'drought' && <p>{tx('干旱过程压缩至 3 个模拟小时；×60 下约 3 分钟。')}</p>}
      {!molecular && inputs.water === 'saltwater' && <p>{tx('实验：叶片浸入 0.5 M NaCl，外液进入壁膜间隙。')}</p>}
      <button className="pc-readout-toggle" aria-expanded={expandedReadouts} onClick={()=>setExpandedReadouts((value)=>!value)}>{tx(expandedReadouts?'收起读数':'展开读数')}</button>
    </aside>
    <nav className="pc-logscale" data-experience-overlay="true" aria-label={tx('对数标尺')}>
      <div className="pc-scale-track" role="slider" tabIndex={0} aria-label={tx('尺度')} aria-valuemin={SCALE_MIN} aria-valuemax={SCALE_MAX} aria-valuenow={Number(reading.scale.toFixed(2))} aria-valuetext={`${tx(LAYERS.find((layer) => layer.id === active)!.label)} ${formatLength(10 ** getFramedScale(reading.scale, mobile))}`}
        onPointerDown={(event) => { const rect = event.currentTarget.getBoundingClientRect(); go(SCALE_MAX - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * (SCALE_MAX - SCALE_MIN)) }}
        onKeyDown={(event) => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) { event.preventDefault(); go(event.key === 'Home' ? SCALE_MAX : event.key === 'End' ? SCALE_MIN : reading.scale + (event.key === 'ArrowUp' ? 0.2 : -0.2)) } }}>
        {Array.from({ length: 29 }, (_, i) => <i key={i} className="pc-minor-tick" style={{ top: `${i / 28 * 100}%` }} />)}
        {SCALE_TICKS.map((tick) => <span key={tick.scale} className="pc-major-tick" style={{ top: `${position(tick.scale)}%` }}>{tick.label}</span>)}
        <b className="pc-cursor" style={{ top: `${position(reading.scale)}%` }} />
      </div>
      <div className="pc-layer-names">{LAYERS.map((layer) => <button key={layer.id} aria-current={active === layer.id ? 'location' : undefined} style={{ top: `${position(layer.scale)}%` }} onClick={() => go(mobile && layer.id === 'motor' ? -7.7 : layer.id === 'cell' && mobile ? MOBILE_HERO_SCALE : layer.scale)}>{tx(layer.label)}</button>)}</div>
    </nav>
    <div className="pc-scale-bar" data-experience-overlay="true" aria-label={tx('比例尺')}><span>{bar.label}</span><i style={{ width: bar.widthPx }} /><small>{tx(molecular ? 'PDB 实验结构 · 排布与运动为示意' : '程序化参照结构 · 非标本扫描')}</small></div>
    <p className="pc-gesture" data-experience-overlay="true">{tx(mobile ? '拖动旋转 · 双指缩放' : '拖动旋转 · 滚动缩放')}</p>
    {bounds && <aside className="pc-boundaries" data-experience-overlay="true"><button type="button" onClick={() => setBounds(false)} aria-label={tx('关闭')}>×</button><h2>{tx('模型边界')}</h2>
      <p>{tx('水势与体积为压力–体积参照模型。干旱压缩至 3 小时，复水约 30 分钟；盐水交换约 5 分钟。参数非菠菜品种拟合，壁皱缩与质壁分离形状为示意。')}</p>
      <p>{tx('细胞形状、细胞器位置是按尺寸生成的参照，不是真实扫描。')}</p>
      <p>{tx('细胞壁切口显示为 0.4 μm，是 0.2 μm 参考壁厚的 2 倍；截面层切边为 0.65 μm，约 3.25 倍。')}</p>
      <p>{tx('光合曲线是参照模型；放氧按净碳同化估算，未单独计算光呼吸。气孔的光响应时间常数为 15 分钟，水胁迫关闭为 1 分钟。')}</p>
      <p>{tx('聚光与避光阈值借鉴拟南芥光迁移研究，是简化的白光阈值，不是菠菜实测。叶绿体移动约每分钟 1–3 μm。')}</p>
      <p>{tx('淀粉按正净碳同化的 25% 储存；黑暗中按预计夜长消耗。百分比相对于模型参考容量，不是叶片干重比例。')}</p>
      <p>{tx('16.3–19.1 nm 的类囊体间距取自拟南芥暗适应与强光实验，按光强分档插值。')}</p>
      <p>{tx('分子来自 PDB 实验结构，大多为菠菜；光系统 I 来自豌豆。膜上排布按分区与拥挤度生成，不是电镜复刻。')}</p>
      <p>{tx('铁氧还蛋白 1A70 是菠菜 E92K 突变体，用作形状参照；它不代表野生型电子传递速率。')}</p>
      <p>{tx('分子过程采用局部慢放。ATP 合酶转速是百圈每秒的数量级参照，不是菠菜在该光强下的实测值；L5 另按可见转速调整慢放倍率。')}</p>
    </aside>}
    {lightHint && !capture && <p className="pc-light-hint" role="status">{tx(inputs.timeScale >= 60 ? '叶绿体正在慢慢挪位，需要几分钟。' : '叶绿体要几分钟才挪完，把时间调到 ×60 看看。')}</p>}
    <Freebar className={`pc-freebar ${guide ? 'pc-guide-active' : ''}`} ariaLabel={tx('光照和时间')} primaryControlBudget={3} secondaryDefault="closed" mobileDensity="comfortable" secondary={<div className="pc-tools">
      <div className="pc-water-control" role="group" aria-label={tx('水分')}>{([{id:'normal',label:'正常'},{id:'drought',label:'干旱'},{id:'saltwater',label:'泡盐水'}] as const).map(option=><button key={option.id} type="button" data-water={option.id} aria-pressed={inputs.water===option.id} onClick={()=>{interact();setInputs(current=>({...current,water:option.id}))}}>{tx(option.label)}</button>)}</div>
      <button type="button" data-pc-guide onClick={() => { controls.registerInteraction(); setGuide(true) }}>{tx('七站导览')}</button>
      <button type="button" onClick={reset}><ArrowCounterClockwise />{tx('回到细胞')}</button>
      <button type="button" data-pc-day-cycle aria-pressed={inputs.dayCycle} onClick={()=>{interact();setInputs((current)=>({...current,dayCycle:!current.dayCycle}))}}>{tx('昼夜循环')}</button>
      <button type="button" aria-expanded={bounds} onClick={() => { interact(); setBounds((value) => !value) }}>{tx('模型边界')}</button>
    </div>}>
      <button className="pc-light-switch" type="button" aria-label={tx(inputs.I > 0 ? '关灯' : '开灯')} onClick={() => changeLight(inputs.I > 0 ? 0 : lastLight.current)}>{inputs.I > 0 ? <Sun /> : <Moon />}</button>
      <select id="pc-time" className="pc-time-control" aria-label={tx('时间倍率')} value={inputs.playing?inputs.timeScale:0} onChange={(event)=>{interact();manualSpeed.current=true;const rate=Number(event.target.value);setInputs((current)=>({...current,playing:rate!==0,timeScale:rate===0?current.timeScale:rate as PlantInputs['timeScale']}))}}>
        <option value={0}>{tx('暂停')}</option><option value={.001}>1/1000×</option><option value={1}>1×</option><option value={60}>×60</option><option value={3600}>×3600</option>
      </select>
      <div className="experience-freebar-field pc-light"><label htmlFor="pc-light">{tx(inputs.dayCycle?'正午光照':'光照')}<output>{inputs.I} <small>μmol m⁻² s⁻¹</small></output></label><input id="pc-light" type="range" min={0} max={2000} step={10} value={inputs.I} onChange={(event) => changeLight(Number(event.target.value))} /></div>
    </Freebar>
    {!capture && <GuideTour worldId="plant-cell" steps={guideSteps} defaultOpen={guide} kicker={tx('导览')} exitLabel={tx('自由探索')} onExit={() => setGuide(false)} stagePlan={[{ position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption', tone: 'light', width: 'narrow', motion: 'fade' }]} />}
    {!capture && !guide && <GhostHint worldId="plant-cell" gesture={{ type: 'drag', target: '.pc-scene canvas', dx: 35, dy: 0, label: tx(mobile ? '双指缩放，从叶子钻进分子' : '滚动放大，从叶子钻进分子') }} />}
  </div>
}
