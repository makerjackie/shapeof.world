import { useEffect, useId, useRef, useState } from 'react'
import { Check, Translate } from '@phosphor-icons/react'

import { useI18n, type Locale } from '~/i18n'

const LOCALES: Array<{ id: Locale; label: string; lang: string }> = [
  { id: 'zh', label: '简体中文', lang: 'zh-CN' },
  { id: 'en', label: 'English', lang: 'en' },
]

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className="locale-toggle-wrap" ref={rootRef}>
      <button
        type="button"
        className={compact ? 'locale-toggle locale-toggle--compact' : 'locale-toggle'}
        onClick={() => setOpen((value) => !value)}
        aria-label={t('header.language')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={t('header.language')}
      >
        <Translate aria-hidden="true" weight="thin" />
      </button>
      {open && (
        <span id={menuId} className="locale-menu" role="menu" aria-label={t('header.language')}>
          {LOCALES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={locale === item.id}
              className={locale === item.id ? 'locale-menu-item is-active' : 'locale-menu-item'}
              onClick={() => {
                setLocale(item.id)
                setOpen(false)
              }}
            >
              <span lang={item.lang}>{item.label}</span>
              {locale === item.id && <Check aria-hidden="true" weight="bold" />}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
