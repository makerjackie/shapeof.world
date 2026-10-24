import { useMemo } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import type { DesignSpec, Network } from './sim/types'
import { calculateConflicts, summarizeConflicts } from './sim/conflicts'
import { measureGeometry } from './sim/geometry-costs'
import measured from './data/capacity.json'
import type { PressureCurves } from './PressurePanel'

export function CompareTable({ designs, networks, curves, current, onSelect, onClose }: { designs: DesignSpec[]; networks: Map<string, Network>; curves: PressureCurves; current: string; onSelect: (design: DesignSpec) => void; onClose: () => void }) {
  const tx = useExperienceI18n(), format = (n: number) => Math.round(n).toLocaleString('en-US')
  const rows = useMemo(() => designs.map(design => { const network = networks.get(design.id)!; return { design, cost: measureGeometry(network), conflicts: summarizeConflicts(calculateConflicts(network)) } }), [designs, networks])
  const capacity = (id: string) => {
    const fullWindows = curves[id]?.filter(p => p.time >= 180)
    return fullWindows?.length ? Math.max(...fullWindows.map(p => p.throughput)) : (measured.designs as Record<string, { vehiclesPerHour: number }>)[id]?.vehiclesPerHour ?? 0
  }
  const maxCapacity = Math.max(1,...designs.map(d=>capacity(d.id))), maxArea = Math.max(...rows.map(row=>row.cost.hullArea))
  return <section className="rd-compare" role="dialog" aria-modal="false" aria-label={tx('道路设计对比')}>
    <header><div><strong>{tx('道路设计对比')}</strong><p>{tx('同一张图，看见每种设计的代价')}</p></div><button type="button" onClick={onClose} aria-label={tx('关闭对比')}>×</button></header>
    <div className="rd-compare-scroll"><table><thead><tr>{['设计', '冲突点（交/合/分）', '通行能力（模拟）', '层数', '最高路面', '桥面面积', '占地'].map(label => <th key={label}>{tx(label)}</th>)}</tr></thead><tbody>{rows.map(({ design, cost, conflicts }) => {
      const flow = capacity(design.id)
      return <tr key={design.id} data-current={current === design.id} onClick={() => onSelect(design)}><th><button type="button">{tx(design.name)}</button></th><td>{conflicts.total} <small>{conflicts.crossing}/{conflicts.merge}/{conflicts.diverge}</small></td><td>{format(flow)} <small>{tx('辆/时')}</small><span className="rd-compare-bar"><i style={{width:`${flow/maxCapacity*100}%`}} /></span></td><td>{cost.layers}</td><td>{cost.maximumHeight.toFixed(1)} m</td><td>{format(cost.bridgeArea)} m²</td><td>{(cost.hullArea / 10000).toFixed(2)} ha<span className="rd-compare-bar"><i style={{width:`${cost.hullArea/maxArea*100}%`}} /></span></td></tr>
    })}</tbody></table></div>
    <p className="rd-compare-note">{tx('固定种子，需求在 20 分钟内由 0.25× 升至 2.5×，取完整 5 分钟窗口最大通过量；不是工程容量。本次压力测试会更新读数。占地为立交范围凸包估算，不含远端引道。')}</p>
  </section>
}
