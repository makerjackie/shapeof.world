import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { ScopedWorld } from '~/components/experiences/scoped-world/ScopedWorld'
import { mount } from './runtime.generated'
import html from './stage.generated.html?raw'
import sourceCss from './styles/source.generated.css?raw'
import shellCss from './styles/frontscope.css?raw'
const dictionary = {}
const css = sourceCss + '\n' + shellCss
export function Frontscope({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  return <ScopedWorld id="frontscope" label={tx('锋界')} controls={controls} html={html} css={css} mount={mount} dictionary={dictionary} audio nativeLocale />
}
