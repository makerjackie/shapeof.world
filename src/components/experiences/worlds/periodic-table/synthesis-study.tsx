import { useMemo, useState } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'
import { synthesisSvg, reactionText, type SynthesisReaction } from './synthesis-graphic'

export function SynthesisStudy({ reaction, reduced, onInteract }: { reaction: SynthesisReaction; reduced: boolean; onInteract: () => void }) {
 const tx = useExperienceI18n()
 const [run, setRun] = useState(0)
 // Keep the SVG node and its animation phase across shell/context updates.
 const markup = useMemo(() => ({ __html: synthesisSvg(reaction, !reduced) }), [reaction, reduced])
 return <figure className="pm-synthesis">
  <div key={run} className="pm-synthesis-drawing" role="img" aria-label={`${tx('核合成示意，非实拍')} · ${reactionText(reaction)}`} dangerouslySetInnerHTML={markup}/>
  <figcaption><span>{tx('核合成示意，非实拍')}</span><button onClick={() => { onInteract(); setRun(value => value + 1) }}><ArrowCounterClockwise size={14}/>{tx('重播合成')}</button></figcaption>
 </figure>
}
