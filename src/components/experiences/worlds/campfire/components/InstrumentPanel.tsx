import { X } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'
import type { Instruments } from '../measurements'
export function PowerReading({ data }: { data: Instruments | null }) {
  const tx=useExperienceI18n(),kw=data?.chemicalKw
  return <><div className="cf-power"><div><span>{tx('化学放热估算')}</span><strong data-cf-power>{kw?.toFixed(1)??'—'} <small>kW</small></strong></div></div>
    <p className="cf-power-human">{tx('这团火每秒烧掉约 {fuel} 克可燃气，相当于 {kettles} 个电水壶的功率。').replace('{fuel}',kw===undefined?'—':(kw/14).toFixed(1)).replace('{kettles}',kw===undefined?'—':(kw/2).toFixed(0))}</p></>
}
export function InstrumentPanel({ data, onClose }: { data: Instruments | null; onClose(): void }) {
  const tx=useExperienceI18n(),rows=data?.series??[],end=rows.at(-1)?.time??20,max=Math.max(10,...rows.map(r=>r.chemicalKw))
  const path=rows.map((r,i)=>`${i?'L':'M'}${22+(r.time-end+20)/20*280} ${112-r.chemicalKw/max*85}`).join(' ')
  return <aside className="cf-instruments" data-experience-overlay="true" aria-label={tx('仪器面板')}>
    <div className="cf-panel-heading"><h2>{tx('这团火的仪器')}</h2><button aria-label={tx('关闭仪器')} onClick={onClose}><X size={19}/></button></div>
    <PowerReading data={data}/>
    <svg className="cf-chart" viewBox="0 0 320 140" role="img" aria-label={tx('最近20秒放热曲线')}>
      {[0,.5,1].map(f=><g key={f}><line x1={22} y1={112-85*f} x2={302} y2={112-85*f}/><text x={22} y={108-85*f}>{(max*f).toFixed(0)}</text></g>)}
      <path className="cf-line-chemical" d={path}/><text x="22" y="133">−20 s</text><text x="275" y="133">0 s</text><text x="270" y="17">kW</text>
    </svg>
    <details className="cf-measure-details"><summary>{tx('功率怎么量的')}</summary>
      <p>{tx('把每格燃料消耗相加，假定有效热值14 MJ/kg、密度353/T kg/m³。克数是按同一热值折算的等效可燃气，不是木柴称重；电水壶按2 kW计。')}</p>
      <p>{tx('另一个诊断量：温升热代理')} <b>{data?.thermalKw.toFixed(1)??'—'} kW</b>. {tx('它积分ρcp·q，使用反应后的温度；温度上限与密度近似使它不等于化学放热。两者都不是实验量热。')}</p>
    </details>
    <div className="cf-meter-block"><h3>{tx('平均火焰高度')}</h3><div className="cf-meter-pair"><div><span>{tx('50%间歇高度')}</span><strong>{data?.height50==null?'—':`${data.heightCensored?'≥ ':''}${data.height50.toFixed(2)}`} <small>m</small></strong></div><div><span>{tx('Heskestad预测')}</span><strong>{data?.predictedHeight.toFixed(2)??'—'} <small>m</small></strong></div></div>
      <p className="cf-method">{tx('40秒里，一半时间有火的最高一层。')}</p>
      <details className="cf-measure-details"><summary>{tx('高度怎么量的')}</summary><p>{tx('逐层累计有火的时间比例；按热烟炱或反应阈值判定，包含画面边缘淡出，从0.05 m燃料面起算。预测用同期平均功率与D=0.60 m；多木柴篝火不等同圆池火。')}</p></details>
    </div>
    <div className="cf-meter-block"><h3>{tx('火焰脉动')}</h3><div className="cf-meter-pair"><div><span>{tx('频谱测量')}</span><strong>{data?.frequency.hz?.toFixed(2)??'—'} <small>Hz</small></strong></div><div><span>1.5 / √D</span><strong>1.94 <small>Hz</small></strong></div></div>
      <p className="cf-measuring">{tx(data?.frequency.reason==='collecting'||!data?'正在积累40秒模拟数据':data.frequency.hz==null?'未检出稳定峰':'检出清晰频谱峰')}</p>
      <details className="cf-measure-details"><summary>{tx('脉动怎么量的')}</summary><p>{tx('放热、火焰高度、0.25 / 0.50 / 0.80 m处温度，以20 Hz为目标采样。40秒频谱分辨率0.025 Hz；至少两种信号有清晰且相近的峰才报告频率。')}</p></details>
    </div>
    <p className="cf-reference">{tx('上游目标（不是本次测量）：60 kW · 0.60 m · 1.94 Hz')}</p>
    <p className="cf-coordinate">{tx('已采集')} {Math.min(40,data?.duration??0).toFixed(1)} / 40 s · {tx('每0.25秒更新')}</p>
  </aside>
}
