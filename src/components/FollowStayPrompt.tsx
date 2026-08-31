import { useEffect, useId, useState } from 'react'
import { X } from '@phosphor-icons/react'

import { useI18n } from '~/i18n'
import { trackEvent } from '~/lib/analytics'
import { safeLocalStorage } from '~/lib/storage'

import './FollowStayPrompt.css'

export const AUTHOR_X_URL = 'https://x.com/maker_jackie'
export const WECHAT_GROUP_QR = '/assets/community/wechat-group.jpg'
export const FOLLOW_PROMPT_STORAGE_KEY = 'oneworld.follow-prompt.v1'

export type FollowPromptOrigin = 'share_card' | 'second_world'

export function hasDismissedFollowPrompt(): boolean {
  return safeLocalStorage.get(FOLLOW_PROMPT_STORAGE_KEY) === 'dismissed'
}

export function dismissFollowPrompt(): void {
  safeLocalStorage.set(FOLLOW_PROMPT_STORAGE_KEY, 'dismissed')
}

export function FollowStayPrompt({
  origin,
  layout = 'card',
  onDismiss,
}: {
  origin: FollowPromptOrigin
  layout?: 'card' | 'chip'
  onDismiss?: () => void
}) {
  const { t, locale } = useI18n()
  const titleId = useId()
  const [qrOpen, setQrOpen] = useState(false)

  useEffect(() => {
    trackEvent({ event: 'follow_prompt_shown', value: origin })
  }, [origin])

  function dismiss() {
    dismissFollowPrompt()
    trackEvent({ event: 'follow_prompt_click', value: 'dismiss' })
    onDismiss?.()
  }

  return (
    <aside
      className={layout === 'chip' ? 'follow-stay follow-stay--chip' : 'follow-stay'}
      aria-labelledby={titleId}
    >
      <div className="follow-stay-copy">
        <p id={titleId} className="follow-stay-title">{t('follow.title')}</p>
        <p className="follow-stay-body">{t('follow.body')}</p>
      </div>
      <div className="follow-stay-actions">
        {locale === 'zh' && (
          <button
            type="button"
            className="follow-stay-action"
            aria-expanded={qrOpen}
            onClick={() => {
              setQrOpen((open) => !open)
              trackEvent({ event: 'follow_prompt_click', value: 'wechat' })
            }}
          >
            {t('follow.wechat')}
          </button>
        )}
        <a
          className="follow-stay-action"
          href={AUTHOR_X_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent({ event: 'follow_prompt_click', value: 'x' })}
        >
          {t('follow.x')}
        </a>
        {layout === 'chip' && (
          <button
            type="button"
            className="follow-stay-dismiss"
            onClick={dismiss}
            aria-label={t('follow.dismiss')}
          >
            <X weight="bold" />
          </button>
        )}
      </div>
      {qrOpen && locale === 'zh' && (
        <img
          className="follow-stay-qr"
          src={WECHAT_GROUP_QR}
          alt={t('community.qrAlt')}
          width={180}
          height={214}
        />
      )}
    </aside>
  )
}
