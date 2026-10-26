import { useState } from 'react'
import { X } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'
import { FIELDS, INITIAL_SLICE, explainReading, type Reading, type Slice } from '../fields'
export function InspectionPanel({ slice, reading, saved, paused, blue, onSlice, onSave, onClear, onBlue, onCompare, onModel, onMolecules }: {
  slice: Slice; reading: Reading | null; saved: Reading | null; paused: boolean; blue: boolean;
  onSlice(patch: Partial<Slice>): void; onSave(): void; onClear(): void; onBlue(): void;
  onCompare(id:'yellow'|'root'): void; onModel(): void; onMolecules(): void;
}) {
  const tx=useExperienceI18n(),[details,setDetails]=useState(false),field=FIELDS.find(f=>f.id===slice.field)!,valid=reading&&!reading.solid
  return <aside className={`cf-panel ${details?'cf-expanded':''}`} data-experience-overlay="true" aria-label={tx('剖面与探针')}>
    <div className="cf-panel-heading"><h2>{tx('切开这团火')}</h2><button aria-label={tx('关闭剖面')} onClick={()=>onSlice({enabled:false})}><X size={19}/></button></div>
    <label className="cf-field-label" htmlFor="cf-field">{tx('剖面显示')}</label><select id="cf-field" value={slice.field} onChange={e=>onSlice({field:e.target.value as Slice['field']})}>{FIELDS.map(f=><option key={f.id} value={f.id}>{tx(f.label)}</option>)}</select>
    <div className="cf-colorbar" style={{background:`linear-gradient(90deg,${field.colors.join(',')})`}}/><div className="cf-scale"><span>{field.min}</span><span>{field.unit}</span><span>≥ {field.max}</span></div>
    <div className="cf-compare-row"><button aria-pressed={slice.cut} onClick={()=>onSlice({cut:true})}>{tx('切开')}</button><button aria-pressed={!slice.cut} onClick={()=>onSlice({cut:false})}>{tx('叠加')}</button><button onClick={()=>onSlice({opacity:slice.opacity===0?INITIAL_SLICE.opacity:0})}>{tx(slice.opacity===0?'显示场图':'看原色')}</button></div>
    <details className="cf-geometry"><summary>{tx('位置、方向与透明度')}</summary><div className="cf-section-tools"><button aria-pressed={!slice.horizontal} onClick={()=>onSlice({horizontal:false,offset:0})}>{tx('竖切')}</button><button aria-pressed={slice.horizontal} onClick={()=>onSlice({horizontal:true,offset:.3})}>{tx('横切')}</button><output>{slice.horizontal?'y':'z'} {slice.offset.toFixed(2)} m</output></div>
      <input className="cf-position" aria-label={tx('移动剖面')} type="range" min={slice.horizontal?.03:-.55} max={slice.horizontal?1.5:.55} step={.01} value={slice.offset} onChange={e=>onSlice({offset:Number(e.target.value)})}/>
      <label className="cf-field-label" htmlFor="cf-opacity">{tx('场图不透明度')}</label><input id="cf-opacity" className="cf-position" type="range" min={0} max={1} step={.05} value={slice.opacity} onChange={e=>onSlice({opacity:Number(e.target.value)})}/>
      <button className="cf-blue-toggle" aria-pressed={blue} onClick={onBlue}>{tx('蓝光增强显示')} ×40</button></details>
    <div className="cf-probe-head"><strong>{tx('探针')}</strong><span>{tx(paused?'时间已冻结':'跟随火焰变化')}</span></div>
    <div className="cf-pick-pair"><span>{tx('对照两处')}</span><button onClick={()=>onCompare('yellow')}>{tx('黄色火焰')}</button><button onClick={()=>onCompare('root')}>{tx('火根')}</button></div>
    {!reading?<p className="cf-probe-empty">{tx('点切口上的任何位置，读出温度、烟炱和年龄。')}</p>:<>
      <div className="cf-main-reading"><div><span>{tx('温度')}</span><strong>{valid?Math.round(reading.temperature):'—'} <small>K</small></strong><span>{valid?Math.round(reading.celsius):'—'} °C</span></div><div><span>{tx('烟炱')}</span><strong>{valid?reading.soot.toFixed(3):'—'}</strong><span>ppm</span></div><div><span>{tx('气体年龄')}</span><strong>{valid&&reading.age!==null?(reading.age*1000).toFixed(0):'—'}</strong><span>ms</span></div></div>
      <button className="cf-molecule-link" onClick={onMolecules}>{tx('放大看分子')} ↗</button>
      <p className="cf-explanation">{tx(explainReading(reading))}</p>
      <div className="cf-more-readings"><dl><div><dt>{tx('速度')}</dt><dd>{valid?reading.speed.toFixed(2):'—'} m/s</dd></div><div><dt>{tx('燃料气')}</dt><dd>{valid?(reading.fuel*100).toFixed(2):'—'} %</dd></div><div><dt>{tx('氧质量分数（估算）')}</dt><dd>{valid?(reading.oxygenMassEstimate*100).toFixed(2):'—'} %</dd></div><div><dt>{tx('燃烧升温率')}</dt><dd>{valid?Math.round(reading.heatingRate).toLocaleString():'—'} K/s</dd></div><div><dt>{tx('涡量')}</dt><dd>{valid?reading.vorticity.toFixed(1):'—'} s⁻¹</dd></div></dl><p className="cf-coordinate">x {reading.position[0].toFixed(2)} / y {reading.position[1].toFixed(2)} / z {reading.position[2].toFixed(2)} m · t {reading.time.toFixed(2)} s</p></div>
      <div className="cf-probe-actions"><button disabled={!valid} onClick={onSave}>{tx('留下对照点')}</button><button className="cf-details-toggle" aria-expanded={details} onClick={()=>setDetails(!details)}>{tx(details?'收起读数':'全部读数')}</button></div>
    </>}
    {saved&&<div className="cf-saved"><span>{tx('对照点')} · {saved.time.toFixed(2)} s</span><strong>{Math.round(saved.temperature)} K · {saved.soot.toFixed(3)} ppm · {saved.age!==null?(saved.age*1000).toFixed(0):'—'} ms</strong><button aria-label={tx('清除对照点')} onClick={onClear}><X size={14}/></button></div>}
    {slice.field==='age'&&<p className="cf-age-note">{tx('烟炱生成门限为15–50 ms，还需高温。年龄计燃料来源气体的老化，不是温度。')}</p>}
    <button className="cf-model-link" onClick={onModel}>{tx('这些数是怎么来的？')}</button>
  </aside>
}
