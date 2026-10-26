import { useExperienceI18n } from '~/i18n/experience'
import type { ConflictPoint } from '../sim/types'
export const CONFLICT_NAMES={crossing:'交叉',merge:'合流',diverge:'分流'}
export function ConflictSymbol({kind}:{kind:ConflictPoint['type']}){
 return <svg viewBox="0 0 20 20" aria-hidden="true" className={`rd-conflict-icon rd-${kind}`}><path d={kind==='crossing'?'M4 4 16 16M16 4 4 16':'M4 3 10 10 16 3M10 10V18'} transform={kind==='diverge'?'rotate(180 10 10)':undefined} fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>
}
export function ConflictLegend({conflicts}:{conflicts?:ConflictPoint[]}){
 const tx=useExperienceI18n()
 return <span className="rd-conflict-types">{(['crossing','merge','diverge'] as const).map(kind=><span key={kind} data-conflict-type={kind}><ConflictSymbol kind={kind}/>{tx(CONFLICT_NAMES[kind])}{conflicts&&<> <b>{conflicts.filter(c=>c.type===kind).length}</b></>}</span>)}</span>
}
