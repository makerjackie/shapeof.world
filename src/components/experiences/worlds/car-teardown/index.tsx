import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { CarTeardown } from './CarTeardown'

export { CarTeardown }
export function worldRenderer({ controls }: { controls: ExperienceControls }) {
	const tx = useExperienceI18n()
	return <CarTeardown controls={controls} label={tx('一辆车，一层一层拆开。')} />
}
