import type {ExperienceControls} from '~/components/ExperienceShell'
import {NuclearBomb} from './NuclearBomb'

export {NuclearBomb}

export function worldRenderer({controls}: {controls: ExperienceControls}) {
  return <NuclearBomb controls={controls} />
}
