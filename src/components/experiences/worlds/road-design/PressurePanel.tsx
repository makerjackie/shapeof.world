import { useExperienceI18n } from '~/i18n/experience'
import type { DesignSpec } from './sim/types'
import type { PressureSample } from './sim/metrics'

export type PressureCurves = Record<string, PressureSample[]>
const COLORS = ['#efc890', '#8ab4ff', '#c77dff', '#5fd39a', '#f09980', '#87d0dc', '#d8b5ff', '#f4e29e']

/** Runs remain in React state when the scene changes; the model owns their samples. */
export function PressurePanel({ curves, designs, current, running, progress, speed }: { curves: PressureCurves; designs: DesignSpec[]; current: string; running: boolean; progress: number; speed: number }) {
  const tx = useExperienceI18n()
  const entries = designs.filter(design => curves[design.id]?.length)
  const maximumDemand = Math.max(1000, ...entries.flatMap(design => curves[design.id].map(sample => sample.demand)))
  const maximumFlow = Math.max(1000, ...entries.flatMap(design => curves[design.id].map(sample => sample.throughput)))
  const maximumDelay = Math.max(30, ...entries.flatMap(design => curves[design.id].map(sample => sample.averageDelay)))
  const plot = (metric: 'throughput' | 'averageDelay', maximum: number, title: string, unit: string) => <div className="rd-pressure-plot">
    <div><span>{tx(title)}</span><small>{Math.round(maximum).toLocaleString('en-US')} {unit}</small></div>
    <svg viewBox="0 0 220 66" role="img" aria-label={tx(title)}>
      {[0, 0.5, 1].map(fraction => <line key={fraction} x1="1" x2="219" y1={3 + fraction * 59} y2={3 + fraction * 59} stroke="#94abc31e" strokeDasharray={fraction === 1 ? undefined : '2 4'} />)}
      {entries.map(design => <polyline key={design.id} fill="none" stroke={COLORS[designs.indexOf(design) % COLORS.length]} strokeWidth={design.id === current ? 1.8 : 1.1} opacity={design.id === current ? 1 : 0.4} points={curves[design.id].map(sample => `${1 + sample.demand / maximumDemand * 218},${62 - sample[metric] / maximum * 59}`).join(' ')} />)}
    </svg>
  </div>
  return <section className="rd-pressure" aria-label={tx('压力测试曲线')}>
    <div className="rd-pressure-heading"><span>{tx('压力测试')}</span><small>{running ? `${Math.round(progress * 100)}% · ${speed}×` : tx('已保留曲线')}</small></div>
    {plot('throughput', maximumFlow, '需求 → 通过量', tx('辆/时'))}
    {plot('averageDelay', maximumDelay, '需求 → 平均延误', 's')}
    <div className="rd-pressure-axis"><span>0</span><span>{tx('需求')} {Math.round(maximumDemand).toLocaleString('en-US')} {tx('辆/时')}</span></div>
    <div className="rd-pressure-legend">{entries.map(design => <span key={design.id} style={{ color: COLORS[designs.indexOf(design) % COLORS.length], opacity: design.id === current ? 1 : 0.6 }}>{tx(design.name)}</span>)}</div>
    {!entries.length && <small>{tx('正在采样')}</small>}
  </section>
}
