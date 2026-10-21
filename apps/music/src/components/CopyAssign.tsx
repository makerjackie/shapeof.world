import { useState } from 'react'

import { useI18n } from '~/i18n'
import { assignPackText } from '~/lib/assign'

export function CopyAssign({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(assignPackText(locale))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" className={className ?? 'btn-ghost'} onClick={() => void copy()}>
      {copied ? t('handoff.copied') : t('home.copyAssign')}
    </button>
  )
}
