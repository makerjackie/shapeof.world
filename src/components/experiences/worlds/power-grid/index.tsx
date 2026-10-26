import type { ComponentType } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { PowerGrid } from './PowerGrid'

export { PowerGrid }
export const worldRenderer: ComponentType<{ controls: ExperienceControls }> = PowerGrid
