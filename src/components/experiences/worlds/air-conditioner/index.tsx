import type {ExperienceControls} from '~/components/ExperienceShell'
import {useExperienceI18n} from '~/i18n/experience'
import {AirConditioner} from './AirConditioner'
export function AirConditionerWorld({controls}:{controls:ExperienceControls}){const tx=useExperienceI18n();return <div style={{width:'100%',height:'100%'}} aria-label={tx('空调，把热搬到另一边')}><AirConditioner controls={controls}/></div>}
export {AirConditionerWorld as worldRenderer}
