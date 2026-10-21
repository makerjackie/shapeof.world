import { Link } from '@tanstack/react-router'

import { trackTitle } from '~/data/catalog'
import { useI18n } from '~/i18n'
import { formatTime } from '~/lib/format'
import { cleanSearch } from '~/lib/locale'
import { usePlayer } from '~/state/player'
import { IconNext, IconPause, IconPlay, IconPrev } from './Icons'
import { Waveform } from './Waveform'

export function Player() {
  const { locale, t } = useI18n()
  const player = usePlayer()
  const track = player.current
  const duration = player.duration || track?.duration || 0

  if (!track) return null

  return (
    <div className="player" role="region" aria-label={t('site.kicker')}>
      <div className="player-controls">
        <button type="button" className="icon-btn" onClick={player.prev} aria-label={t('player.prev')} disabled={!track}>
          <IconPrev />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-main"
          onClick={player.toggle}
          aria-label={player.playing ? t('player.pause') : t('player.play')}
          disabled={!track}
        >
          {player.playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="icon-btn" onClick={player.next} aria-label={t('player.next')} disabled={!track}>
          <IconNext />
        </button>
      </div>
      <div className="player-body">
        <div className="player-copy">
          {track ? (
            <Link to="/track/$trackId" params={{ trackId: track.id }} search={cleanSearch}>
              <strong>{trackTitle(track, locale)}</strong>
              <span>{track.code}</span>
            </Link>
          ) : (
            <span className="player-idle">{t('player.idle')}</span>
          )}
        </div>
        <Waveform
          src={track?.assets.waveform}
          progress={player.time}
          duration={duration}
          onSeek={track ? player.seek : undefined}
        />
      </div>
      <span className="player-time">
        {formatTime(player.time)}
        <span aria-hidden="true"> / </span>
        {formatTime(duration)}
      </span>
      <label className="volume">
        <span className="sr-only">{t('player.volume')}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={(event) => player.setVolume(Number(event.target.value))}
        />
      </label>
    </div>
  )
}
