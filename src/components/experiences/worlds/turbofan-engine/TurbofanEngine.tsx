import { useCallback, useMemo, useState } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour, GUIDE_REPLAY_EVENT } from '~/components/experiences/GuideTour'
import { useExperienceI18n } from '~/i18n/experience'
import { EngineScene } from './TurbofanScene'
import { PARTS, type EngineView, type PartId } from './content'
import { compressorStages, DEFAULT_SETTINGS, engineCycle, PRESETS, type EngineSettings } from './model'
import './styles/turbofan.css'

type Cycle = ReturnType<typeof engineCycle>
const VIEWS: { id: EngineView; name: string }[] = [
  { id: 'cutaway', name: '纵向剖切' }, { id: 'assembled', name: '完整短舱' }, { id: 'shafts', name: '同心双轴' }, { id: 'front', name: '迎风端面' },
]

function CycleChart({ cycle, active, onStation }: { cycle: Cycle; active: number | null; onStation: (n: number) => void }) {
  const tx = useExperienceI18n()
  const maxP = Math.max(...cycle.stations.map(s => s.pressure))
  const temp = (t: number) => 116 - (t - 200) / 1500 * 96
  const press = (p: number) => 116 - p / maxP * 96
  const path = (field: 'temperature' | 'pressure') => cycle.stations.map((s, i) => `${i ? 'L' : 'M'} ${25 + i * 47} ${field === 'temperature' ? temp(s.temperature) : press(s.pressure)}`).join(' ')
  return <div className="tf-cycle">
    <div className="tf-section-label">{tx('沿气路读数')}<span>{tx('总温 / 总压')}</span></div>
    <svg viewBox="0 0 286 153" role="img" aria-label={tx('六个测站的总温与总压')}>
      {[20, 52, 84, 116].map(y => <line key={y} x1="20" y1={y} x2="266" y2={y} stroke="#2c3842" strokeDasharray="2 5" />)}
      <path d={path('pressure')} fill="none" stroke="#82c7d1" strokeWidth="1.6" />
      <path d={path('temperature')} fill="none" stroke="#e4ad75" strokeWidth="1.6" />
      {cycle.stations.map((s, i) => <g key={s.id}>
        <circle cx={25 + i * 47} cy={temp(s.temperature)} r={active === i ? 4 : 2.6} fill="#e4ad75" />
        <circle cx={25 + i * 47} cy={press(s.pressure)} r={active === i ? 4 : 2.6} fill="#82c7d1" />
        <text x={25 + i * 47} y="140" textAnchor="middle" fill="#8e9ca7" fontSize="10">{s.id}</text>
      </g>)}
    </svg>
    <div className="tf-chart-key"><span><i className="tf-temperature" />{tx('温度')} · K</span><span><i className="tf-pressure" />{tx('压力')} · kPa</span></div>
    <div className="tf-stations">{cycle.stations.map((s, i) => <button key={s.id} aria-pressed={active === i} onClick={() => onStation(i)}>
      <small>{s.id}</small><span>{tx(s.name)}</span><b>{Math.round(s.temperature)} <em>K</em></b><b>{(s.pressure / 1000).toFixed(0)} <em>kPa</em></b>
    </button>)}</div>
  </div>
}

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (n: number) => void }) {
  const tx = useExperienceI18n()
  return <label className="tf-slider"><span>{tx(label)}<output>{value.toLocaleString('en-US', { maximumFractionDigits: 2 })}<small>{unit}</small></output></span>
    <input type="range" aria-label={tx(label)} value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} />
  </label>
}

export function TurbofanEngine({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS)
  const [selected, setSelected] = useState<PartId | null>(null)
  const [view, setView] = useState<EngineView>('cutaway')
  const [playing, setPlaying] = useState(() => !(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches))
  const [explode, setExplode] = useState(0)
  const [slowdown, setSlowdown] = useState(1200)
  const [streams, setStreams] = useState(true)
  const [thermal, setThermal] = useState(true)
  const [panel, setPanel] = useState<'anatomy' | 'cycle' | 'design'>('anatomy')
  const [station, setStation] = useState<number | null>(null)
  const [reset, setReset] = useState(0)
  const [mobilePanel, setMobilePanel] = useState(false)
  const [compressorStage, setCompressorStage] = useState(4)
  const cycle = useMemo(() => engineCycle(settings), [settings])
  const stages = compressorStages(cycle)
  const part = PARTS.find(p => p.id === selected)
  const interact = useCallback(() => controls.registerInteraction(), [controls.registerInteraction])
  const change = (field: keyof EngineSettings, value: number) => { setSettings(s => ({ ...s, [field]: value })); interact() }
  const select = useCallback((id: PartId) => { setSelected(id); setPanel('anatomy'); interact() }, [interact])
  const restart = () => { setSettings(DEFAULT_SETTINGS); setSelected(null); setView('cutaway'); setExplode(0); setStreams(true); setThermal(true); setSlowdown(1200); setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches); setPanel('anatomy'); setStation(null); setCompressorStage(4); setMobilePanel(false); setReset(r => r + 1); interact() }
  const applyPreset = (index: number) => { setSettings({ ...PRESETS[index].settings }); setPanel('cycle'); interact() }
  const guideSteps = PARTS.map((p, i) => ({
    title: tx(p.name), body: tx(p.body), durationMs: 14000,
    action: () => { setSelected(p.id); setView(i === 3 ? 'shafts' : 'cutaway'); setExplode(0); setPanel('anatomy'); setPlaying(true) },
  }))
  return <div className="tf-world" data-view={view} data-selected={selected ?? 'all'} data-playing={playing} data-panel={panel} tabIndex={0} onKeyDown={e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) return
    if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p); interact() }
    if (e.key.toLowerCase() === 'r') restart()
    const n = Number(e.key)
    if (n >= 1 && n <= 5) select(PARTS[n - 1].id)
  }}>
    <div className="tf-title"><p>PROPULSION LAB / 01</p><h1>{tx('一台涡扇，打开来看')}</h1><span>{tx('两条气路 · 两根同心轴 · 一个能量循环')}</span></div>
    <div className="tf-viewport" role="region" aria-label={tx('可以旋转缩放的发动机模型')}>
      <EngineScene cycle={cycle} playing={playing} slowdown={slowdown} view={view} explode={explode} selected={selected} streams={streams} thermal={thermal} reset={reset} compressorStage={compressorStage} onCompressorStage={i => { setCompressorStage(i); select('compressor') }} onSelect={select} onInteraction={interact} />
    </div>
    <nav className="tf-views" aria-label={tx('观察角度')}>{VIEWS.map(v => <button key={v.id} aria-pressed={view === v.id} onClick={() => { setView(v.id); setReset(r => r + 1); interact() }}>{tx(v.name)}</button>)}</nav>
    <div className="tf-measurements" aria-live="off">
      <div><span>{tx('净推力')}</span><strong>{(cycle.thrust / 1000).toFixed(1)}<small>kN</small></strong><div className="tf-thrust-bar"><i style={{ width: `${Math.max(0, Math.min(100, cycle.fanThrust / Math.max(1, cycle.thrust) * 100))}%` }} /></div><p><i />{tx('外涵道')} {(cycle.fanThrust / 1000).toFixed(1)} <em>/</em> {tx('核心机')} {(cycle.coreThrust / 1000).toFixed(1)}</p></div>
      <div><span>{tx('燃油流量')}</span><strong>{cycle.fuelFlow.toFixed(2)}<small>kg/s</small></strong><p>TSFC {cycle.tsfc?.toFixed(1) ?? '—'} g/(kN·s)</p></div>
      <div><span>{tx('风扇轴功')}</span><strong>{(cycle.fanPower / 1e6).toFixed(1)}<small>MW</small></strong><p>{tx('核心 / 外涵道流量')} {cycle.coreFlow.toFixed(0)} / {cycle.bypassFlow.toFixed(0)} kg/s</p></div>
    </div>
    <aside className={`tf-panel${mobilePanel ? ' tf-panel-open' : ''}`}>
      <button className="tf-panel-handle" onClick={() => setMobilePanel(p => !p)} aria-expanded={mobilePanel}>{tx('打开实验台')}<span>{mobilePanel ? '−' : '+'}</span></button>
      <div className="tf-panel-body">
        <nav className="tf-tabs" aria-label={tx('实验台')}>
          {(['anatomy', 'cycle', 'design'] as const).map((p, i) => <button key={p} aria-pressed={panel === p} onClick={() => { setPanel(p); interact() }}>{tx(['结构', '气路', '工况'][i])}</button>)}
        </nav>
        {panel === 'anatomy' && <>
          <nav className="tf-parts" aria-label={tx('选择发动机部件')}>{PARTS.map(p => <button key={p.id} aria-pressed={selected === p.id} onClick={() => select(p.id)}><small>{p.number}</small><span>{tx(p.name)}</span><i style={{ background: p.color }} /></button>)}</nav>
          <article className="tf-explanation"><div className="tf-section-label">{part ? part.number : '00'} / {tx(part ? part.name : '整机')}</div>
            <h2>{tx(part?.subtitle ?? '空气在这里分成两条路')}</h2><p>{tx(part?.body ?? '沿着发动机走一圈：风扇分流，压气机增压，燃烧室加热，涡轮取走轴功，喷管把剩余能量交给气流。点击零件，或一路放大进入内部。')}</p>
            <p className="tf-experiment">{tx(part?.experiment ?? '先转一转，再切开它。打开气流示踪，追踪一条绕过燃烧室的外涵道气路。')}</p>
            {selected && <button className="tf-text-button" onClick={() => { setSelected(null); setReset(r => r + 1); interact() }}>{tx('回到整机')} ↗</button>}
          </article>
          {selected === 'compressor' && <div className="tf-stage-inspector"><div className="tf-section-label">{tx('逐级检查')}<span>{tx('转子 / 静子交替排列')}</span></div>
            <div className="tf-stage-buttons">{stages.map((s, i) => <button key={i} aria-label={`${tx('压气级')} ${i + 1}`} aria-pressed={compressorStage === i} onClick={() => { setCompressorStage(i); interact() }}>{i + 1}</button>)}</div>
            <dl><div><dt>{tx('出口总温')}</dt><dd>{stages[compressorStage].temperature.toFixed(0)} K</dd></div><div><dt>{tx('出口总压')}</dt><dd>{(stages[compressorStage].pressure / 1000).toFixed(0)} kPa</dd></div><div><dt>{tx('本级轴功')}</dt><dd>{(stages[compressorStage].power / 1e6).toFixed(2)} MW</dd></div></dl>
            <small>{tx('按相等逐级压比分配总温升，非叶片流场求解。')}</small>
          </div>}
          <Slider label={tx('拆开外壳与总成')} value={explode * 100} min={0} max={100} unit="%" onChange={n => { setExplode(n / 100); interact() }} />
          <div className="tf-checks"><label><input type="checkbox" checked={streams} onChange={e => { setStreams(e.target.checked); interact() }} />{tx('气流示踪')}</label><label><input type="checkbox" checked={thermal} onChange={e => { setThermal(e.target.checked); interact() }} />{tx('温度着色')}</label></div>
        </>}
        {panel === 'cycle' && <>
          <CycleChart cycle={cycle} active={station} onStation={i => { setStation(i); setSelected(i < 2 ? 'fan' : i === 2 ? 'compressor' : i === 3 ? 'combustor' : 'turbine'); setView('cutaway'); interact() }} />
          <div className="tf-balance"><div className="tf-section-label">{tx('两根轴的能量账本')}</div><p>{tx('高压涡轮 → 压气机')}<b>{(cycle.hptPower / 1e6).toFixed(2)} MW</b></p><p>{tx('低压涡轮 → 风扇')}<b>{(cycle.lptPower / 1e6).toFixed(2)} MW</b></p><p>{tx('核心喷管')}<b>{tx(cycle.coreNozzle.choked ? '已阻塞' : '未阻塞')}</b></p><small>{tx('轴功按能量平衡匹配，包含 99% 机械效率。')}</small></div>
        </>}
        {panel === 'design' && <>
          <div className="tf-section-label">{tx('选择一个工况')}</div>
          <div className="tf-presets">{PRESETS.map((p, i) => <button key={p.name} onClick={() => applyPreset(i)}>{tx(p.name)}<span>↗</span></button>)}</div>
          <Slider label={tx('飞行高度')} value={settings.altitude} min={0} max={12000} step={250} unit="m" onChange={n => change('altitude', n)} />
          <Slider label={tx('飞行马赫数')} value={settings.mach} min={0} max={.85} step={.01} unit="M" onChange={n => change('mach', n)} />
          <Slider label={tx('涵道比')} value={settings.bypass} min={0} max={12} step={.5} unit=":1" onChange={n => change('bypass', n)} />
          <Slider label={tx('设计压比')} value={settings.compressorRatio} min={8} max={35} unit=":1" onChange={n => change('compressorRatio', n)} />
          <Slider label={tx('压气机效率')} value={settings.compressorEfficiency * 100} min={76} max={94} unit="%" onChange={n => change('compressorEfficiency', n / 100)} />
        </>}
        {!cycle.feasible && <p className="tf-limit" role="status">{tx('这个组合没有足够的核心喷管压差。它超出了本参照循环的可行工况。')}</p>}
        <details className="tf-limits"><summary>{tx('模型与显示边界')}</summary><p>{tx('虚构的双轴分流涡扇；零维稳态循环，非任何型号的工程模型。未求解叶片流场、冷却引气、喘振、固定喷口匹配或瞬态启停。质量流量与轴速采用说明中的参照规律。')}</p><p>{tx('叶片和短舱为原创教学几何，拆解位移为展示排布。流点与伪彩色表示路径和温度，不表示实测粒子轨迹、火焰形状或真实流速。')}</p><a href="https://www.grc.nasa.gov/www/k-12/airplane/aturbf.html" target="_blank" rel="noreferrer">NASA Glenn · {tx('原理来源')} ↗</a></details>
      </div>
    </aside>
    <div className="tf-bottom">
      <div className="tf-transport"><button onClick={() => { setPlaying(p => !p); interact() }} aria-label={tx(playing ? '暂停转子与气流' : '继续转子与气流')}>{playing ? 'Ⅱ' : '▷'}<span>{tx(playing ? '暂停' : '继续')}</span></button>
        <label>{tx('转子慢放')}<select value={slowdown} onChange={e => { setSlowdown(Number(e.target.value)); interact() }}>{[60, 300, 1200, 6000].map(n => <option key={n} value={n}>1/{n}×</option>)}</select></label>
      </div>
      <Slider label={tx('油门')} value={Math.round(settings.throttle * 100)} min={10} max={100} unit="%" onChange={n => change('throttle', n / 100)} />
      <div className="tf-rpm"><span>LP <b>{Math.round(cycle.lowRpm).toLocaleString('en-US')}</b></span><span>HP <b>{Math.round(cycle.highRpm).toLocaleString('en-US')}</b></span><small>rpm · {tx('物理转速')}</small></div>
      <div className="tf-actions"><button onClick={() => { setSelected(null); setReset(r => r + 1); interact() }}>{tx('全景')}</button><button onClick={restart}>{tx('复位')}</button><button onClick={() => { window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT, { detail: { worldId: 'turbofan-engine' } })); interact() }}>{tx('带我看')}</button></div>
    </div>
    <p className="tf-hint">{tx('拖动旋转 · 滚轮缩放 · 点击部件深入')}<span>{tx('参考循环，非实机性能')}</span></p>
    <GuideTour worldId="turbofan-engine" steps={guideSteps} placement="stage" kicker={tx('沿着能量走一圈')} exitLabel={tx('结束导览')} stagePlan={[{ position: 'bottom-left', mobilePosition: 'top-left', tone: 'light', width: 'narrow', treatment: 'caption' }]} />
  </div>
}
