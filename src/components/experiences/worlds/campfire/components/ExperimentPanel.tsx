import { useExperienceI18n } from '~/i18n/experience'
import { PowerReading } from './InstrumentPanel'
import type { Instruments } from '../measurements'
import { FIELDS, type Reading } from '../fields'
export type Experiment = { fuel: number; gravity: number; event: 'none'|'fuel'|'off'|'wind'|'gravity' }
export function ExperimentPanel({ value, data, reading, onFuel, onGust, onGravity, onAir, onMeters }: {
  value: Experiment; data: Instruments|null; reading: Reading|null;
  onFuel(n:number):void; onGust():void; onGravity(n:number):void; onAir():void; onMeters():void;
}) {
  const tx=useExperienceI18n(),air=FIELDS.find(f=>f.id==='air')!
  return <aside className="cf-experiments" data-experience-overlay="true" aria-label={tx('动手改火')}>
    <h2>{tx('动手改火')}</h2><p className="cf-experiment-intro">{tx('改变供给，看这团火自己作出反应。')}</p>
    <PowerReading data={data}/><button className="cf-inline-link" onClick={onMeters}>{tx('看放热曲线与测量方法')} →</button>
    <div className="cf-experiment-block"><div className="cf-control-label"><span>{tx('燃料供给')}</span><output>{value.fuel.toFixed(1)}×</output></div>
      <div className="cf-action-pair"><button disabled={value.fuel>=2} onClick={()=>onFuel(Math.min(2,value.fuel+.5))}>{tx('加柴')}</button><button disabled={value.fuel===0} onClick={()=>onFuel(0)}>{tx('撤掉燃料')}</button></div>
      <p>{tx('“加柴”增加可燃气供给，木柴几何不变。')}</p>{value.fuel!==1&&<button className="cf-inline-link" onClick={()=>onFuel(1)}>{tx('恢复默认供给')}</button>}
    </div>
    <div className="cf-experiment-block"><button className="cf-gust" onClick={onGust}>{tx('刮一阵风')} <span>8 s</span></button>
      <p>{tx('风会改变空气与燃料相遇的位置。')}</p><button className="cf-inline-link" onClick={onAir}>{tx('切开看空气（含氧）')} →</button>
    </div>
    {value.event==='wind'&&<div className="cf-wind-reading"><div className="cf-colorbar" style={{background:`linear-gradient(90deg,${air.colors.join(',')})`}}/><div className="cf-scale"><span>0 %</span><span>{tx('可用空气')}</span><span>100 %</span></div><p>{tx('点切口比较同一位置的空气。')}{reading?.solid&&<b> {tx('这里是木柴，点旁边的气体。')}</b>}{reading&&!reading.solid&&<b> {(reading.air*100).toFixed(1)} %</b>}</p></div>}
    <div className="cf-experiment-block"><label className="cf-control-label" htmlFor="cf-gravity"><span>{tx('重力')}</span><output>{value.gravity.toFixed(1)} g</output></label><input id="cf-gravity" type="range" min={0} max={1} step={.1} value={value.gravity} onChange={e=>onGravity(Number(e.target.value))}/>
      {value.gravity<1&&<p className="cf-gravity-note">{tx('真实失重下，烛火可依靠分子扩散成为小圆球。这个模型没有算分子扩散，源流和湍流仍在；眼前的变化不是NASA实验的复现。')} <a href="https://www.nasa.gov/image-article/candle-flame-1g-vs-microgravity/" target="_blank" rel="noreferrer">{tx('NASA实验图')} ↗</a></p>}
    </div>
    {value.event==='off'&&<p className="cf-action-note">{tx('供给已关。看剩余燃料烧完，功率降下来；炭床的余热仍在。')}</p>}
    {value.event==='fuel'&&<p className="cf-action-note">{tx('供给已改变。看看功率和火焰怎样跟着变。')}</p>}
  </aside>
}
