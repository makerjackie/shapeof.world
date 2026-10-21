import { useEffect, useRef } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { useI18n } from '~/i18n'
import { useRegisterExperienceCapabilities } from '../ExperienceCapabilities'
import { createScopedRuntime } from './runtime'
import { createWorldTranslator } from './translation'
import './scoped-world.css'

type Props = {
  id: string
  label: string
  controls: ExperienceControls
  html: string
  css: string
  mount: (environment: ReturnType<typeof createScopedRuntime>['environment']) => void
  audio?: boolean
  nativeLocale?: boolean
  dictionary: Record<string, string>
}

export function ScopedWorld({ id, label, controls, html, css, mount, dictionary, audio = false, nativeLocale = false }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const interaction = useRef(controls.registerInteraction)
  interaction.current = controls.registerInteraction
  const { locale, setLocale } = useI18n()
  const localeKey = nativeLocale ? undefined : locale
  useRegisterExperienceCapabilities(id, { supportsImmersive: true, hasFreeControls: true, hasWorldAudio: audio })
  useEffect(() => {
    const element = host.current
    if (!element) return
    const translate = createWorldTranslator(locale, dictionary)
    const root = element.shadowRoot ?? element.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = translate(css)
    const body = document.createElement('div')
    body.className = 'world-document'
    body.lang = locale === 'en' ? 'en' : 'zh-CN'
    body.innerHTML = translate(html)
    root.replaceChildren(style, body)
    const runtime = createScopedRuntime(root, body, translate)
    const shell = element.closest('.experience-page')
    const syncShell = () => { body.classList.toggle('world-immersive', shell?.getAttribute('data-overlays-hidden') === 'true') }
    const observer = new MutationObserver(syncShell)
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-overlays-hidden'] })
    syncShell()
    const register = (event: Event) => { if (event.isTrusted) interaction.current() }
    const changeLanguage = (event: Event) => {
      const next = (event as CustomEvent).detail
      if (next === 'zh' || next === 'en') setLocale(next)
    }
    root.addEventListener('world-language', changeLanguage)
    root.addEventListener('pointerdown', register)
    root.addEventListener('keydown', register)
    const dispose = () => {
      observer.disconnect()
      root.removeEventListener('world-language', changeLanguage)
      root.removeEventListener('pointerdown', register)
      root.removeEventListener('keydown', register)
      runtime.dispose()
    }
    try { mount(runtime.environment) } catch (error) { dispose(); throw error }
    return dispose
  }, [css, html, localeKey, mount, dictionary, setLocale])
  useEffect(() => {
    if (nativeLocale) host.current?.shadowRoot?.dispatchEvent(new CustomEvent('host-language', { detail: locale }))
  }, [nativeLocale, locale])
  return <div ref={host} className="scoped-world-stage" data-world={id} aria-label={label} />
}
