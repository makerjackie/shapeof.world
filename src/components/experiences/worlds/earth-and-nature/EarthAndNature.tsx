import { useExperienceI18n } from '~/i18n/experience'
import copy from './content.en.json'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { ScopedWorld } from '~/components/experiences/scoped-world/ScopedWorld'
import html from './stage.html?raw'
import css from './styles/stage.css?raw'
import { mount } from './runtime'
import labels from '~/i18n/experience-en-overrides/earth-and-nature.json'

const dictionary = { ...copy, ...labels }

export function EarthAndNature({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  return <ScopedWorld label={tx('地球与自然')} id="earth-and-nature" controls={controls} html={html} css={css} mount={mount} dictionary={dictionary} />
}
