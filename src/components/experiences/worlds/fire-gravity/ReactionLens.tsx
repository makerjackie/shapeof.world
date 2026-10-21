import type { CSSProperties } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import { combustionEquations, methaneAtoms, type ChemistryView } from './combustion-model'

export function ReactionLens({ view, burning }: { view: ChemistryView; burning: boolean }) {
  const tx = useExperienceI18n()
  return <div className={`fire-reaction-lens is-${view} ${burning ? '' : 'is-paused'}`} data-experience-overlay="true">
    {view === 'products' && <>
      <svg viewBox="0 0 360 125" role="img" aria-label={tx('同样的九个原子，由甲烷和氧气重排成二氧化碳和水')}>
        <text x="16" y="14" className="reaction-label">{tx('反应物')}</text><text x="235" y="14" className="reaction-label">{tx('产物')}</text>
        <path d="M178 65H208m-8-7 8 7-8 7" className="reaction-arrow"/>
        {methaneAtoms.map((atom,i) => <g key={i} className={`reaction-atom atom-${atom.element}`} style={{ '--from-x': `${atom.from[0]}px`, '--from-y': `${atom.from[1]}px`, '--to-x': `${atom.to[0]}px`, '--to-y': `${atom.to[1]}px` } as CSSProperties}>
          <circle r="11"/><text textAnchor="middle" dy="4">{atom.element}</text>
        </g>)}
      </svg>
      <strong className="reaction-equation">{combustionEquations[0].display}</strong>
      <small>{tx('甲烷配平示例；烛蜡是混合烃。动画省略中间反应。')}</small>
    </>}
    {view === 'incomplete' && <>
      <div className="reaction-products"><span>CO₂</span><span>H₂O</span><span className="reaction-co">CO</span><span className="reaction-soot">C</span></div>
      <strong className="reaction-equation">{combustionEquations[1].display}</strong>
      <strong className="reaction-equation">{combustionEquations[2].display}</strong>
      <small>{tx('甲烷的两种总体简式；不表示产物比例。CO不可见，烟炱才是颗粒。')}</small>
    </>}
    {view === 'energy' && <>
      <svg viewBox="0 0 360 125" role="img" aria-label={tx('反应需要越过能垒，产物总能量低于反应物')}>
        <path d="M20 25V108H345" className="reaction-axis"/>
        <path d="M24 60H65C105 60 102 18 145 18S190 96 240 96H335" className="reaction-energy-path"/>
        <circle r="5" className="reaction-energy-particle"/>
        <text x="32" y="48" className="reaction-label">{tx('反应物')}</text><text x="111" y="11" className="reaction-label">{tx('能垒')}</text><text x="278" y="84" className="reaction-label">{tx('产物')}</text>
        <path d="M320 60V90m-5-6 5 6 5-6" className="reaction-arrow"/>
      </svg>
      <strong className="reaction-equation">{tx('点燃 → 反应放热 → 热反馈')}</strong>
      <small>{tx('能量轮廓示意，无数值比例。冷却后火焰熄灭，需要重新点燃。')}</small>
    </>}
    {view === 'chain' && <>
      <svg viewBox="0 0 360 125" role="img" aria-label={tx('一个氢原子与氧气反应，形成氧原子和羟基自由基')}>
        <path d="M60 62H158Q187 62 215 33H300M158 62Q187 62 215 94H300" className="reaction-chain-path"/>
        <g className="reaction-carrier"><circle cx="60" cy="62" r="19"/><text x="60" y="67" textAnchor="middle">H</text></g>
        <text x="139" y="49" className="reaction-label">+ O₂</text>
        <g className="reaction-carrier carrier-out"><circle cx="300" cy="33" r="19"/><text x="300" y="38" textAnchor="middle">O</text><circle cx="300" cy="94" r="19"/><text x="300" y="99" textAnchor="middle">OH</text></g>
      </svg>
      <strong className="reaction-equation">{combustionEquations[3].display}</strong>
      <small>{tx('高温链分支的一例。真实火焰还包含传播、终止与许多中间步骤。')}</small>
    </>}
  </div>
}
