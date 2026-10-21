import { Link } from '@tanstack/react-router'

import { trackTitle, type Track } from '~/data/catalog'
import { useI18n } from '~/i18n'
import { formatTime } from '~/lib/format'
import { cleanSearch } from '~/lib/locale'
import { usePlayer } from '~/state/player'
import { IconPause, IconPlay } from './Icons'

export function TrackRow({
  track,
  queue,
  note,
}: {
  track: Track
  queue: Track[]
  note?: string
}) {
  const { locale, t } = useI18n()
  const player = usePlayer()
  const active = player.current?.id === track.id
  const playing = active && player.playing

  return (
    <div className={`track-row${active ? ' is-active' : ''}`}>
      <button
        type="button"
        className="row-play"
        onClick={() => (active ? player.toggle() : player.playTrack(track, queue))}
        aria-label={playing ? t('player.pause') : t('card.play')}
      >
        {playing ? <IconPause /> : <IconPlay />}
      </button>
      <div className="row-copy">
        <Link to="/track/$trackId" params={{ trackId: track.id }} search={cleanSearch}>
          {trackTitle(track, locale)}
        </Link>
        <p>
          {note ?? (track.bpm ? `${track.bpm} BPM` : track.code)}
          <span aria-hidden="true"> · </span>
          {formatTime(track.duration)}
        </p>
      </div>
    </div>
  )
}
