import { useEffect, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'

import { useI18n } from '~/i18n'
import { trackEvent } from '~/lib/analytics'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallOneWorld() {
  const { t } = useI18n()
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    function handlePrompt(event: Event) {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    function handleInstalled() {
      setPromptEvent(null)
      trackEvent({ event: 'pwa_install' })
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (!promptEvent) return null

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  return (
    <button type="button" className="install-oneworld" onClick={() => void install()}>
      <DownloadSimple aria-hidden="true" /> {t('pwa.install')}
    </button>
  )
}
