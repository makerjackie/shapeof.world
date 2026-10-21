import {
  Link,
  useLocation,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useEffect } from 'react'

import { messages, useOptionalI18n } from '~/i18n'
import { recoverFromChunkError } from '~/lib/chunk-load-recovery'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const i18n = useOptionalI18n()
  const fallbackLocale = typeof window !== 'undefined' && /^\/en(?:\/|$)/.test(window.location.pathname) ? 'en' : 'zh'
  const t = i18n?.t ?? ((key: string) => messages[fallbackLocale][key] ?? key)
  const isRoot = useLocation({
    select: (location) => location.pathname === '/',
  })

  // Public recovery UI deliberately excludes raw exception details.
  useEffect(() => { recoverFromChunkError(error) }, [error])

  return (
    <main className="nf-page">
      <div className="nf-content">
        <h1 className="page-title nf-title">{t('system.error.title')}</h1>
        <div className="nf-copy">
          <p>{t('system.recoveryBody')}</p>
        </div>
        <div className="nf-actions">
          <Link to="/feedback" search={{ kind: 'problem' }} className="btn-secondary">{t('feedback.report')}</Link>
          <button
            onClick={() => {
              router.invalidate()
            }}
            className="btn-primary"
          >
            {t('system.retry')}
          </button>
          {isRoot ? (
            <Link
              to="/"
              className="btn-secondary"
            >
              {t('system.home')}
            </Link>
          ) : (
            <Link
              to="/"
              className="btn-secondary"
              onClick={(e) => {
                e.preventDefault()
                window.history.back()
              }}
            >
              {t('system.back')}
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
