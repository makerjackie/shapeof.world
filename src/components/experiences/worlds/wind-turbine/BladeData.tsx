import {useState} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {FOILS,polar,SECTIONS,SPEC} from './model'
import {polarPlot} from './polar-plot'

/** Two labelled vertical axes preserve the different magnitudes of lift and drag. */
export function BladeData({station,alpha,onStation}:{station:number;alpha:number;onStation:(index:number)=>void}){
 const tx=useExperienceI18n(),[wide,setWide]=useState(false)
 const section=SECTIONS[station],chart=polarPlot(section.foil,alpha,wide?180:30),current=polar(section.foil,alpha)
 return <section className="wt-blade-data">
  <div className="wt-section-title"><span>{tx('截面地图')}</span><b>{(section.span+SPEC.hubRadius).toFixed(2)} / {SPEC.radius} m</b></div>
  <div className="wt-station-map" aria-label={tx('选择真实叶片站位')}>
   {SECTIONS.map((s,i)=><button key={i} aria-label={`${tx('站位')} ${i+1}`} title={`${(s.span+SPEC.hubRadius).toFixed(2)} m · ${FOILS[s.foil].name}`} aria-pressed={station===i} onClick={()=>onStation(i)}><small>{String(i+1).padStart(2,'0')}</small><i style={{height:`${8+s.chord*3}px`}}/></button>)}
  </div>
  <div className="wt-polar-heading"><span>{FOILS[section.foil].name.replace('_A17','')} · {tx('翼型升阻力极曲线')}</span><button aria-pressed={wide} onClick={()=>setWide(v=>!v)}>{wide?'±180°':'±30°'} ↔</button></div>
  <svg className="wt-polar" viewBox="0 0 270 163" role="img" aria-label={tx('真实翼型极曲线与当前迎角')}>
   <path d="M29 23V134H241V23 M29 78.5H241 M135 23V134" fill="none" stroke="#49616b" strokeWidth=".6"/>
   <path d={chart.lift} fill="none" stroke="#d0b47d" strokeWidth="1.6"/>
   <path d={chart.drag} fill="none" stroke="#8ab9ca" strokeWidth="1.6"/>
   {!chart.outside&&<><path d={`M${chart.x} 23V134`} stroke="#c5d2d6" strokeWidth=".6" strokeDasharray="3 3"/><circle cx={chart.x} cy={chart.clY} r="3" fill="#f1d08e"/><circle cx={chart.x} cy={chart.cdY} r="3" fill="#a7dbea"/></>}
   <g fontFamily="monospace" fontSize="9"><text x="3" y="14" fill="#d0b47d">Cl</text><text x="245" y="14" fill="#8ab9ca">Cd</text><text x="2" y="27" fill="#d0b47d">{chart.clMax}</text><text x="0" y="137" fill="#d0b47d">−{chart.clMax}</text><text x="246" y="27" fill="#8ab9ca">{chart.cdMax}</text><text x="246" y="137" fill="#8ab9ca">0</text><text x="29" y="151" fill="#9eb4bc">−{chart.range}°</text><text x="135" y="151" textAnchor="middle" fill="#9eb4bc">0°</text><text x="241" y="151" textAnchor="end" fill="#9eb4bc">{chart.range}°</text><text x="135" y="163" textAnchor="middle" fill="#9eb4bc">α</text></g>
  </svg>
  <div className="wt-polar-values"><span>Cl <b>{current.cl.toFixed(3)}</b></span><span>Cd <b>{current.cd.toFixed(4)}</b></span></div>
  <p className="wt-caption">{chart.outside?tx('当前迎角在图外；切换到全角度查看。'):tx('圆点是当前工作点。左右纵轴分别表示无量纲升力和阻力系数。')}</p>
 </section>
}
