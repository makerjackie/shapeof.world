import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { WatchMovement } from './WatchMovement'
export { WatchMovement }
export function WatchWorld({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  return <div style={{ width: '100%', height: '100%' }} aria-label={tx('时间的机芯')}><WatchMovement controls={controls} /></div>
}
export { WatchWorld as worldRenderer }
