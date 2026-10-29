import type {ExperienceControls} from '~/components/ExperienceShell'
import {useExperienceI18n} from '~/i18n/experience'
import {WindTurbine} from './WindTurbine'
export {WindTurbine}
export function WindWorld({controls}:{controls:ExperienceControls}){const tx=useExperienceI18n();return <div style={{height:'100%',width:'100%'}} aria-label={tx('风的发电机')}><WindTurbine controls={controls}/></div>}
export {WindWorld as worldRenderer}
