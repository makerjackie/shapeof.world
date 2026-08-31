import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'

import { useI18n } from '~/i18n'
import { useSiteBgm } from '~/lib/site-bgm'

/**
 * Mute control for the default world-music bed.
 * Only mounted when the current world does not own its own music.
 * Muting keeps the track running so unmuting continues mid-loop.
 */
export function SiteBgmToggle({
  className = 'experience-header-icon site-bgm-toggle',
  showLabel = false,
}: {
  className?: string
  showLabel?: boolean
}) {
  const { t } = useI18n()
  const { muted, toggleMuted } = useSiteBgm()
  const label = muted ? t('bgm.unmute') : t('bgm.mute')

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        toggleMuted()
      }}
      aria-pressed={muted}
      title={label}
      aria-label={label}
      data-bgm-muted={muted ? 'true' : 'false'}
    >
      {muted
        ? <SpeakerSlash aria-hidden="true" weight="regular" />
        : <SpeakerHigh aria-hidden="true" weight="regular" />}
      {showLabel && <span>{label}</span>}
    </button>
  )
}
