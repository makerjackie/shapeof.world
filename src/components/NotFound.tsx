import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { useOptionalI18n } from '~/i18n'

export function NotFound({ children }: { children?: ReactNode }) {
  const i18n = useOptionalI18n()
  const t = i18n?.t ?? ((key: string) => ({
    'system.notFound.eyebrow': 'Uncharted territory',
    'system.notFound.title': 'This page is not in the atlas.',
    'system.notFound.body': 'The path may have moved, but the worlds remain.',
    'system.back': 'Go back',
    'system.home': 'Return home',
  }[key] ?? key))
  return (
    <main className="nf-page">
      <div className="nf-watermark" aria-hidden="true">404</div>
      <div className="nf-content">
        <p className="nf-coords" aria-hidden="true">00°00′N 00°00′E</p>
        <p className="eyebrow">{t('system.notFound.eyebrow')}</p>
        <h1 className="nf-title">{t('system.notFound.title')}</h1>
        <div className="nf-copy">
          {children || <p>{t('system.notFound.body')}</p>}
        </div>
        <div className="nf-actions">
          <button
            onClick={() => window.history.back()}
            className="action"
          >
            {t('system.back')}
          </button>
          <Link
            to="/"
            className="action action--primary"
          >
            {t('system.home')}
          </Link>
        </div>
      </div>
    </main>
  )
}
