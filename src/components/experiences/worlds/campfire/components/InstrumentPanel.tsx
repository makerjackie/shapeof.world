import { X } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'
import type { Instruments } from '../measurements'
export function InstrumentPanel({ data, onClose }: { data: Instruments | null; onClose(): void }) {
  const tx=useExperienceI18n(), rows=data?.series??[], end=rows.at(-1)?.time??20
  const max=Math.max(10,...rows.flatMap(r=>[r.chemicalKw,r.thermalKw]))
  const path=(key:'chemicalKw'|'thermalKw')=>rows.map((r,i)=>`${i?'L':'M'}${22+(r.time-end+20)/20*280} ${112-r[key]/max*85}`).join(' ')
  return <aside className="cf-instruments" data-experience-overlay="true" aria-label={tx('仪器面板')}>
    <div className="cf-panel-heading"><h2>{tx('这团火的仪器')}</h2><button aria-label={tx('关闭仪器')} onClick={onClose}><X size={19}/></button></div>
    <div className="cf-power"><div><span>{tx('化学放热估算')}</span><strong>{data?.chemicalKw.toFixed(1)??'—'} <small>kW</small></strong></div><div><span>{tx('温升热代理')}</span><strong>{data?.thermalKw.toFixed(1)??'—'} <small>kW</small></strong></div></div>
    <p className="cf-method">{tx('全网格燃料消耗 × 假定热值14 MJ/kg；另一条是ρcp·q。两者都依赖密度近似，不是实验测量。')}</p>
    <svg className="cf-chart" viewBox="0 0 320 140" role="img" aria-label={tx('最近20秒放热曲线')}>
      {[0,.5,1].map(f=><g key={f}><line x1={22} y1={112-85*f} x2={302} y2={112-85*f}/><text x={22} y={108-85*f}>{(max*f).toFixed(0)}</text></g>)}
      <path className="cf-line-chemical" d={path('chemicalKw')}/><path className="cf-line-thermal" d={path('thermalKw')}/>
      <text x="22" y="133">−20 s</text><text x="275" y="133">0 s</text><text x="270" y="17">kW</text>
    </svg>
    <div className="cf-curve-key"><span>{tx('燃料热值估算')}</span><span>{tx('温升热代理')}</span></div>
    <div className="cf-meter-block"><h3>{tx('平均火焰高度')}</h3><div className="cf-meter-pair"><div><span>{tx('50%间歇高度')}</span><strong>{data?.height50==null?'—':`${data.heightCensored?'≥ ':''}${data.height50.toFixed(2)}`} <small>m</small></strong></div><div><span>{tx('Heskestad预测')}</span><strong>{data?.predictedHeight.toFixed(2)??'—'} <small>m</small></strong></div></div>
      <p className="cf-method">{tx('20秒里，火焰一半时间超过这个高度。按热烟炱与反应阈值判定，包含画面边缘淡出；从0.05 m燃料面起算。')}</p>
      <details className="cf-measure-details"><summary>{tx('预测的假设')}</summary><p className="cf-method">{tx('预测使用同期平均化学放热估算与等效直径D=0.60 m；多木柴篝火并不等同圆池火。')}</p></details>
      {data?.heightCensored&&<p className="cf-measuring">{tx('火焰接近模拟域上边界，高度只能报告下限。')}</p>}
    </div>
    <div className="cf-meter-block"><h3>{tx('火焰脉动')}</h3><div className="cf-meter-pair"><div><span>{tx('频谱测量')}</span><strong>{data?.frequency.hz?.toFixed(2)??'—'} <small>Hz</small></strong></div><div><span>1.5 / √D</span><strong>1.94 <small>Hz</small></strong></div></div>
      <p className="cf-method">{tx('中心线上0.50 m处的温度，每秒采20次；取最近20秒的频谱峰，分辨率0.05 Hz。')}</p>
      <p className="cf-measuring">{tx(data?.frequency.reason==='collecting'||!data?'正在积累20秒模拟数据':data.frequency.hz==null?'未检出稳定峰':'检出清晰频谱峰')}</p>
    </div>
    <p className="cf-reference">{tx('上游目标（不是本次测量）：60 kW · 0.60 m · 1.94 Hz')}</p>
    <p className="cf-coordinate">{tx('已采集')} {Math.min(20,data?.duration??0).toFixed(1)} / 20 s · {tx('每0.25秒更新')}</p>
  </aside>
}
