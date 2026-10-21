import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { ScopedWorld } from '~/components/experiences/scoped-world/ScopedWorld'
import { mount } from './runtime'
import html from './stage.html?raw'
import css from './styles/cafe-terrace.css?raw'
const dictionary = {}
export function CafeTerrace({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  return <ScopedWorld id="cafe-terrace" label={tx('夜间露天咖啡座')} controls={controls} html={html} css={css} mount={mount} dictionary={dictionary} audio nativeLocale />
}
