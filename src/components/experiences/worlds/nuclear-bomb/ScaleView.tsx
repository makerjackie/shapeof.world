import './styles/ScaleView.css'

import {useMemo, useState, type ReactNode} from 'react'

import type {ExperienceControls} from '~/components/ExperienceShell'
import {Freebar} from '~/components/experiences/Freebar'
import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'

import {sampleEffects, sliderToYield, snapYield, YIELD_PRESETS, yieldToSlider} from './effects'
import {ScaleScene, type ScaleOverlay} from './scale-scene'

const CONDITIONS = '按 Glasstone & Dolan《核武器效应》的教科书缩放律：空中最优高度爆炸、平坦地面、晴天。实际受地形、建筑和天气影响。城市网格是抽象的，不对应任何真实城市。'
const INITIAL_OVERLAY: ScaleOverlay = {width: 1600, height: 1000, rings: [], references: [], scaleKm: 1, scalePixels: 100}
const RINGS = [
  {id: 'blast20', label: '20 psi（140 kPa）· 几乎所有建筑倒塌', short: '20 psi', color: '#e0a060', key: 'blast20Km'},
  {id: 'blast5', label: '5 psi（34 kPa）· 大多数民用建筑被摧毁', short: '5 psi', color: '#c48a5a', key: 'blast5Km'},
  {id: 'blast1', label: '1 psi（6.9 kPa）· 中度损坏、玻璃震碎', short: '1 psi', color: '#8c7c6c', key: 'blast1Km'},
  {id: 'burn', label: '三度烧伤 · 晴天', short: '三度烧伤', color: '#d07050', key: 'burnKm'},
] as const

function Scientific({value}: {value: number}) {
  const exponent = Math.floor(Math.log10(value))
  return <>{(value / 10 ** exponent).toFixed(2)}<span> × 10</span><sup>{exponent}</sup></>
}

function amount(yieldKt: number, english: boolean) {
  const unit = yieldKt >= 1000 ? (english ? 'Mt' : '百万吨') : yieldKt >= 1 ? (english ? 'kt' : '千吨') : (english ? 't' : '吨')
  const value = yieldKt >= 1000 ? yieldKt / 1000 : yieldKt >= 1 ? yieldKt : yieldKt * 1000
  return {number: value.toLocaleString('en-US', {maximumFractionDigits: value < 10 ? 2 : 1}), unit}
}

function km(value: number | null) {
  return value === null ? '—' : value.toLocaleString('en-US', {minimumFractionDigits: value < 10 ? 2 : 1, maximumFractionDigits: value < 10 ? 2 : 1})
}

export function ScaleView({controls, active = true, tabs}: {controls: ExperienceControls; active?: boolean; tabs?: ReactNode}) {
  const tx = useExperienceI18n()
  const {locale} = useI18n()
  const english = locale === 'en'
  const [yieldKt, setYieldKt] = useState(15)
  const [overlay, setOverlay] = useState(INITIAL_OVERLAY)
  const [error, setError] = useState('')
  const effects = useMemo(() => sampleEffects(yieldKt), [yieldKt])
  const preset = YIELD_PRESETS.find((item) => Math.abs(item.yieldKt - yieldKt) < 1e-7)
  const selectedName = preset ? (english ? preset.nameEn : preset.name) : tx('自定当量')
  const display = amount(yieldKt, english)
  const labels = overlay.rings.filter((item) => item.visible).map((anchor, index, anchors) => ({
    ...anchor,
    xLabel: Math.min(overlay.width - 480, anchor.x + 15),
    yLabel: Math.min(overlay.height - 240, Math.max(240, anchor.y + (index - (anchors.length - 1) / 2) * 30)),
  }))
  const changeYield = (next: number) => {
    controls.registerInteraction()
    setYieldKt(next)
  }

  return (
    <section className="nb-scale-view" data-active={active} data-scale-yield={yieldKt} aria-hidden={!active}>
      <ScaleScene yieldKt={yieldKt} active={active} onOverlay={setOverlay} onInteract={controls.registerInteraction} onError={setError} />
      <div className="nb-scale-vignette" />
      <header className="nb-scale-heading" data-experience-overlay="true">
        <p><span />{tx('尺度与效应')}<i />02 / 03</p>
        <h1>{tx('同一份能量，放到地面上。')}</h1>
        <div>{tx('抽象参照 · 静态最大范围')}</div>
      </header>

      <div className="nb-scale-ring-labels" aria-hidden="true">
        <svg width={overlay.width} height={overlay.height}>
          {labels.map((anchor) => {
            const ring = RINGS.find((item) => item.id === anchor.id)!
            return <path key={anchor.id} d={`M ${anchor.x} ${anchor.y} L ${anchor.x + 8} ${anchor.y} L ${anchor.xLabel - 7} ${anchor.yLabel}`} style={{stroke: ring.color}} />
          })}
        </svg>
        {labels.map((anchor) => {
          const ring = RINGS.find((item) => item.id === anchor.id)!
          return <div className="nb-scale-ring-label" key={anchor.id} style={{left: anchor.xLabel, top: anchor.yLabel, borderColor: ring.color}}><span>{tx(ring.short)}</span><b>{km(effects[ring.key])}<small> km</small></b></div>
        })}
      </div>

      <div className="nb-scale-reference-labels" aria-hidden="true">
        {overlay.references.filter((item) => item.visible && item.y > 180 && item.y < overlay.height - 230 && item.x < overlay.width - 320).map((item) => <span key={item.id} style={{left: item.x, top: item.y}}><i />{item.id === 'tower' ? tx('300 米 · 高塔') : tx('8,848 米 · 珠峰的高度')}</span>)}
      </div>

      <aside className="nb-scale-readout" data-experience-overlay="true" aria-label={tx('能量与效应读数')}>
        <div className="nb-scale-preset-name"><span>{selectedName}</span><small>{preset?.year ?? tx('TNT 当量')}</small></div>
        <div className="nb-scale-yield-reading"><strong>{display.number}</strong><span>{display.unit}<small> TNT</small></span></div>
        <dl className="nb-scale-energy-data">
          <div><dt>{tx('能量')}</dt><dd><Scientific value={effects.energyJ} /><small> J</small></dd></div>
          <div><dt>{tx('相当于 TNT')}</dt><dd>{effects.tntTons.toLocaleString('en-US', {maximumFractionDigits: 1})}<small> {tx('吨')}</small></dd></div>
        </dl>
        {effects.showEffects ? <>
          <div className="nb-scale-height"><span>{tx('爆炸高度')}</span><b>{km(effects.heightKm)}<small> km</small></b></div>
          <dl className="nb-scale-effect-data">
            <div className="nb-scale-fireball-reading"><dt><i />{tx('火球半径')}</dt><dd>{km(effects.fireballKm)}<small> km</small></dd></div>
            {RINGS.map((ring) => <div key={ring.id} title={tx(ring.label)}><dt><i style={{background: ring.color}} />{tx(ring.short)}</dt><dd>{km(effects[ring.key])}<small> km</small></dd></div>)}
          </dl>
        </> : <p className="nb-scale-energy-only">{tx('1 千吨以下只比较能量，不画效应圈')}</p>}
        <p className="nb-scale-reference-note">{preset?.id === 'one-ton' ? tx('1 吨，约为一辆轻型卡车的载重。') : tx('高度参照：300 米的塔，8,848 米的山。')}</p>
        {effects.showEffects && <details className="nb-scale-legend"><summary>{tx('圈线说明')}</summary><ul>{RINGS.map((ring) => <li key={ring.id}><i style={{background: ring.color}} />{tx(ring.label)}</li>)}</ul></details>}
      </aside>

      <div className="nb-scale-ruler" data-experience-overlay="true">
        <span>{overlay.scaleKm === 0.1 ? tx('100 米') : overlay.scaleKm === 1 ? tx('1 千米') : tx('10 千米')}</span>
        <i style={{width: overlay.scalePixels}} />
      </div>
      <p className="nb-scale-disclaimer" data-experience-overlay="true">{tx(CONDITIONS)}</p>
      {error && <p className="nb-scale-error" role="alert">{tx('当前设备无法显示三维画面。能量和半径读数仍可使用。')}</p>}

      {active && <Freebar className="nb-scale-freebar" ariaLabel={tx('尺度控制')} primaryControlBudget={5}>
        {tabs}
        <div className="nb-scale-yield-control">
          <label htmlFor="nb-scale-yield"><span>{tx('当量')}</span><output>{display.number} {display.unit} TNT</output><small>{tx('对数刻度')}</small></label>
          <div className="nb-scale-slider-track">
            <input id="nb-scale-yield" type="range" min="0" max="1" step="0.0001" value={yieldToSlider(yieldKt)} aria-label={tx('TNT 当量')} aria-valuetext={`${display.number} ${display.unit} TNT`} onChange={(event) => changeYield(snapYield(sliderToYield(Number(event.target.value))))} />
            <div className="nb-scale-preset-marks" aria-hidden="true">{YIELD_PRESETS.map((item) => <i key={item.id} className={item.id === preset?.id ? 'is-active' : undefined} style={{left: `${yieldToSlider(item.yieldKt) * 100}%`}} />)}</div>
          </div>
          <div className="nb-scale-slider-ends"><span style={{left: 0}}>{tx('1 吨')}</span><span style={{left: `${yieldToSlider(1) * 100}%`}}>{tx('1 千吨')}</span><span style={{left: `${yieldToSlider(1000) * 100}%`}}>{tx('1 百万吨')}</span><span style={{left: '100%'}}>{tx('50 百万吨')}</span></div>
        </div>
        <label className="nb-scale-preset-control"><span>{tx('参照当量')}</span><select id="nb-scale-preset" value={preset?.id ?? 'custom'} aria-label={tx('参照当量')} onChange={(event) => {
          const item = YIELD_PRESETS.find((candidate) => candidate.id === event.target.value)
          if (item) changeYield(item.yieldKt)
        }}><option value="custom" disabled>{tx('自定当量')}</option>{YIELD_PRESETS.map((item) => <option key={item.id} value={item.id}>{english ? item.nameEn : item.name}{item.year ? ` · ${item.year}` : ''}</option>)}</select></label>
      </Freebar>}
    </section>
  )
}
