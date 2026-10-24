import { useMemo } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import type { DesignSpec, Network } from './sim/types'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { measureGeometry } from './sim/geometry-costs'
import measured from './data/capacity.json'
import type { PressureCurves } from './PressurePanel'

export function CompareTable({ designs, networks, curves: _curves, current, onSelect, onClose }: { designs: DesignSpec[]; networks: Map<string, Network>; curves: PressureCurves; current: string; onSelect: (design: DesignSpec) => void; onClose: () => void }) {
  const tx = useExperienceI18n(), format = (n: number) => Math.round(n).toLocaleString('en-US')
  const rows = useMemo(() => designs.map(design => { const network = networks.get(design.id)!; return { design, cost: measureGeometry(network), conflicts: summarizeConflicts(calculateConflicts(network)) } }), [designs, networks])
  type Row = { vehiclesPerHour: number; turningVehiclesPerHour: number; status: string }
  const capacity = (id: string): Row => (measured.designs as Record<string, Row>)[id]
  const maxCapacity = Math.max(1,...designs.map(d=>capacity(d.id).vehiclesPerHour)), maxTurning = Math.max(1,...designs.map(d=>capacity(d.id).turningVehiclesPerHour)), maxArea = Math.max(...rows.map(row=>row.cost.landArea))
  return <section className="rd-compare" role="dialog" aria-modal="false" aria-label={tx('道路设计对比')}>
    <header><div><strong>{tx('道路设计对比')}</strong><p>{tx('同一张图，看见每种设计的代价')}</p></div><button type="button" onClick={onClose} aria-label={tx('关闭对比')}>×</button></header>
    <div className="rd-compare-scroll"><table><thead><tr>{['设计', '冲突点（交/合/分）', '总通行能力（模拟）', '转向通行能力', '层数', '最高路面', '桥面面积', '占地（路面 + 围死的地）'].map(label => <th key={label}>{tx(label)}</th>)}</tr></thead><tbody>{rows.map(({ design, cost, conflicts }) => {
      const measured = capacity(design.id), flow = measured.vehiclesPerHour, turning = measured.turningVehiclesPerHour, confirmed = measured.status === 'saturated'
      return <tr key={design.id} data-current={current === design.id} onClick={() => onSelect(design)}><th><button type="button">{tx(design.name)}</button></th><td>{conflicts.total} <small>{conflicts.crossing}/{conflicts.merge}/{conflicts.diverge}</small></td><td>{!confirmed && '≥ ' }{format(flow)} <small>{tx('辆/时')}</small><span className="rd-compare-bar"><i style={{width:`${flow/maxCapacity*100}%`}} /></span>{!confirmed && <small>{tx('未确认饱和')}</small>}</td><td>{!confirmed && '≥ '}{format(turning)} <small>{tx('辆/时')}</small><span className="rd-compare-bar"><i style={{width:`${turning/maxTurning*100}%`}} /></span></td><td>{cost.layers}</td><td>{cost.maximumHeight.toFixed(1)} m</td><td>{format(cost.bridgeArea)} m²</td><td>{(cost.landArea / 10000).toFixed(2)} ha<span className="rd-compare-bar"><i style={{width:`${cost.landArea/maxArea*100}%`}} /></span></td></tr>
    })}</tbody></table></div>
    <p className="rd-compare-note">{tx('完整流向时转向占 40%，逐级加压至平台；取完整 5 分钟内按原定方向到达的最大流量，总量与转向量分别取峰值。≥ 表示未确认饱和，不是工程容量。会话压力曲线使用当前 OD，单独保留。占地：路面含路肩外扩 10 m，加围住的空地；2 m 网格，不含远端引道。参照为 18 个 OpenStreetMap 实例的同口径测量（ODbL 1.0），详见来源。')}</p>
  </section>
}
