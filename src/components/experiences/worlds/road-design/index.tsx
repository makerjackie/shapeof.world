import type { ComponentType } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { RoadDesign } from './RoadDesign'

export { RoadDesign }
export const worldRenderer: ComponentType<{ controls: ExperienceControls }> = RoadDesign
