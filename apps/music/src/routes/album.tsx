import { TrackCard } from '~/components/TrackCard'
import { album, albumTracks as tracks } from '~/data/catalog'
import { useI18n } from '~/i18n'
import { usePlayer } from '~/state/player'

export function AlbumPage() {
  const { locale, t } = useI18n()
  const player = usePlayer()
  const title = locale === 'zh' ? album.title.zh : album.title.en

  return (
    <div className="page album">
      <p className="kicker">{t('nav.album')}</p>
      <h1>{title}</h1>
      <p className="lede">{t('album.lede')}</p>
      <div className="action-row">
        <button
          type="button"
          className="btn-solid"
          disabled={tracks.length === 0}
          onClick={() => {
            if (tracks[0]) player.playTrack(tracks[0], tracks)
          }}
        >
          {t('album.play')}
        </button>
        {album.zip ? (
          <a className="btn-ghost" href={album.zip}>
            {t('album.download')}
          </a>
        ) : null}
      </div>
      {tracks.length === 0 ? (
        <p className="empty">{t('home.empty')}</p>
      ) : (
        <div className="track-grid">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} queue={tracks} />
          ))}
        </div>
      )}
    </div>
  )
}
