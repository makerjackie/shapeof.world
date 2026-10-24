import { useMemo } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import type { DesignSpec, Network } from './sim/types'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { measureGeometry } from './sim/geometry-costs'
import type { PressureCurves } from './PressurePanel'

export function CompareTable({ designs, networks, curves, current, onSelect, onClose }: { designs: DesignSpec[]; networks: Map<string, Network>; curves: PressureCurves; current: string; onSelect: (design: DesignSpec) => void; onClose: () => void }) {
  const tx = useExperienceI18n(), format = (n: number) => Math.round(n).toLocaleString('en-US')
  const rows = useMemo(() => designs.map(design => { const network = networks.get(design.id)!; return { design, cost: measureGeometry(network), conflicts: summarizeConflicts(calculateConflicts(network)) } }), [designs, networks])
  return <section className="rd-compare" role="dialog" aria-modal="false" aria-label={tx('道路设计对比')}>
    <header><div><strong>{tx('道路设计对比')}</strong><p>{tx('同一张图，看见每种设计的代价')}</p></div><button type="button" onClick={onClose} aria-label={tx('关闭对比')}>×</button></header>
    <div className="rd-compare-scroll"><table><thead><tr>{['设计', '冲突点（交/合/分）', '压力测试峰值', '层数', '最高路面', '桥面面积', '占地（凸包）'].map(label => <th key={label}>{tx(label)}</th>)}</tr></thead><tbody>{rows.map(({ design, cost, conflicts }) => {
      const samples = curves[design.id]
      return <tr key={design.id} data-current={current === design.id} onClick={() => onSelect(design)}><th><button type="button">{tx(design.name)}</button></th><td>{conflicts.total} <small>{conflicts.crossing}/{conflicts.merge}/{conflicts.diverge}</small></td><td>{samples?.length ? format(Math.max(...samples.map(p => p.throughput))) : '—'} <small>{samples?.length ? tx('辆/时') : ''}</small></td><td>{cost.layers}</td><td>{cost.maximumHeight.toFixed(1)} m</td><td>{format(cost.bridgeArea)} m²</td><td>{(cost.hullArea / 10000).toFixed(1)} ha</td></tr>
    })}</tbody></table></div>
    <p className="rd-compare-note">{tx('通过量来自本次会话的压力测试；未测试显示 —。面积包含图中引道，占地为路面外包凸包估算。')}</p>
  </section>
}
