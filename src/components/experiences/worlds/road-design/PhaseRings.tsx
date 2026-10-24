import { useExperienceI18n } from '~/i18n/experience'
import { signalClock } from './sim/control'
import type { ControlSpec } from './sim/types'

const LABELS: Record<string, string> = { ns: '南北通行', ew: '东西通行', 'ns-through': '南北直行', 'ns-left': '南北左转', 'ew-through': '东西直行', 'ew-left': '东西左转', arterial: '主干道直行', 'arterial-left': '主干道左转', ramps: '匝道驶出', eastbound: '向东通行', westbound: '向西通行' }
export function PhaseRings({ control, time, dual = false }: { control: ControlSpec; time: number; dual?: boolean }) {
  const tx = useExperienceI18n(), phases=control.phases ?? [], clock=signalClock(control,time)
  const cycle=phases.reduce((sum,p)=>sum+p.green+(p.yellow??3)+(p.allRed??2),0)
  if (!cycle) return null
  const angle=(time%cycle)/cycle*360
  let start=0
  const segments=phases.map(phase=>{const length=(phase.green+(phase.yellow??3)+(phase.allRed??2))/cycle;const segment={phase,start,length};start+=length;return segment})
  return <div className="rd-phase-rings" data-phase={clock.phase?.id} data-signal={clock.state}>{(dual ? ['西侧路口','东侧路口'] : ['信号相位']).map(label=><div className="rd-phase" key={label}>
    <svg viewBox="0 0 64 64" role="img" aria-label={tx('信号相位')}>
      <circle cx="32" cy="32" r="24" fill="none" stroke="#26313b" strokeWidth="5"/>
      {segments.map(({phase,start,length})=><circle key={phase.id} cx="32" cy="32" r="24" fill="none" pathLength="100" stroke={phase.id===clock.phase?.id ? clock.state==='green'?'#8ecba7':clock.state==='yellow'?'#e2bc6e':'#c36b76' : '#51606f'} strokeWidth="5" strokeDasharray={`${Math.max(0,length*100-2)} ${100-length*100+2}`} strokeDashoffset={-start*100} transform="rotate(-90 32 32)" />)}
      <line x1="32" y1="32" x2="32" y2="13" stroke="#f0e7d7" strokeWidth="1.5" transform={`rotate(${angle} 32 32)`}/><circle cx="32" cy="32" r="2" fill="#f0e7d7"/>
    </svg>
    <div><small>{tx(label)}</small><strong>{tx(LABELS[clock.phase?.id ?? ''] ?? '信号相位')}</strong><span>{tx(clock.state==='green'?'放行':clock.state==='yellow'?'黄灯':'全红')} · {Math.ceil(clock.remaining)} s</span></div>
  </div>)}{dual && <small className="rd-phase-sync">{tx('两端协调，同步计时')}</small>}</div>
}
