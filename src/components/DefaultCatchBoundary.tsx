import {
  ErrorComponent,
  Link,
  useLocation,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

import { useOptionalI18n } from '~/i18n'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const i18n = useOptionalI18n()
  const t = i18n?.t ?? ((key: string) => ({
    'system.error.eyebrow': 'A fold in the atlas',
    'system.error.title': 'This world did not open correctly.',
    'system.retry': 'Try again',
    'system.back': 'Go back',
    'system.home': 'Return home',
  }[key] ?? key))
  const isRoot = useLocation({
    select: (location) => location.pathname === '/',
  })

  console.error('DefaultCatchBoundary Error:', error)

  return (
    <main className="nf-page">
      <div className="nf-content">
        <p className="eyebrow">{t('system.error.eyebrow')}</p>
        <h1 className="nf-title">{t('system.error.title')}</h1>
        <div className="nf-copy">
          <ErrorComponent error={error} />
        </div>
        <div className="nf-actions">
          <button
            onClick={() => {
              router.invalidate()
            }}
            className="action action--primary"
          >
            {t('system.retry')}
          </button>
          {isRoot ? (
            <Link
              to="/"
              className="action"
            >
              {t('system.home')}
            </Link>
          ) : (
            <Link
              to="/"
              className="action"
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
