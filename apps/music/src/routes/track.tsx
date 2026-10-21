import { Link } from '@tanstack/react-router'
import { useEffect, useState, type CSSProperties } from 'react'

import { Waveform } from '~/components/Waveform'
import { DownloadAudio } from '~/components/DownloadAudio'
import { IconPause, IconPlay } from '~/components/Icons'
import { archetypeLetter, getTrack, parseTrack, trackTitle, type Track } from '~/data/catalog'
import { categoryAccent, categoryLabel } from '~/data/domains'
import { useI18n } from '~/i18n'
import { formatTime, modelLabel } from '~/lib/format'
import { cleanSearch, worldLabel, worldUrl } from '~/lib/locale'
import { neighbors, similarTracks } from '~/lib/similar'
import { tracks, type LocaleText } from '~/data/catalog'
import taxonomy from '~/generated/taxonomy.json'
import { usePlayer } from '~/state/player'

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function TrackPage({ trackId }: { trackId: string }) {
  const { locale, t } = useI18n()
  const player = usePlayer()
  const [detail, setDetail] = useState<Track>()
  const [detailError, setDetailError] = useState<string>()
  const track = detail?.id === trackId ? detail : getTrack(trackId)
  useEffect(() => {
    if (!getTrack(trackId)) return
    const controller = new AbortController()
    setDetailError(undefined)
    fetch(`/tracks/${encodeURIComponent(trackId)}.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json() })
      .then(value => { const parsed = parseTrack(value); if (!parsed || parsed.id !== trackId) throw new Error('Invalid track'); if (!controller.signal.aborted) setDetail(parsed) })
      .catch(error => { if (error.name !== 'AbortError') setDetailError(trackId) })
    return () => controller.abort()
  }, [trackId])
  const [openPrompt, setOpenPrompt] = useState(false)

  if (!track) {
    return (
      <div className="page">
        <h1>{t('track.missing')}</h1>
        <Link to="/" search={cleanSearch}>{t('notfound.home')}</Link>
      </div>
    )
  }

  const active = player.current?.id === track.id
  const loopUrl = track.loop?.seamless && track.loop.asset ? track.assets[track.loop.asset] : undefined
  const loopPlaying = active && player.current?.assets.preview === loopUrl
  const duration = active ? player.duration || track.duration : track.duration
  const { prev, next } = neighbors(track)
  const similar = similarTracks(track)
  const letter = archetypeLetter(track)
  const accent = categoryAccent(track.category)
  const tagLabel = (value: string) => ((taxonomy as { tags?: Record<string, LocaleText> }).tags?.[value]?.[locale] ?? value)

  return (
    <div className="page track-page" style={{ '--accent': accent } as CSSProperties}>
      <Link className="back-link" to="/" search={cleanSearch}>← {t('home.catalog')}</Link>
      {track.collections.includes('short-promos') ? <Link className="shorts-track-link" to="/shorts" search={cleanSearch}>{t('shorts.nav')} ↗</Link> : null}
      <p className="kicker">{track.code}{letter ? ` · ${letter}` : ''}</p>
      <h1>{trackTitle(track, locale)}</h1>
      <p className="lede">
        {categoryLabel(track.category, locale)}
        <span aria-hidden="true"> · </span>
        {t(`role.${track.role}` as 'role.main-theme')}
      </p>

      {track.description ? <p className="lede">{track.description[locale]}</p> : null}
      <div className="track-stage">
        <Waveform
          className="waveform-lg"
          src={loopPlaying && track.assets.loop ? undefined : track.assets.waveform}
          progress={active ? player.time : 0}
          duration={duration}
          onSeek={active ? player.seek : undefined}
        />
        <div className="action-row">
          <button
            type="button"
            className="btn-solid"
            onClick={() => (active && !loopPlaying ? player.toggle() : player.playTrack(track, track.kind === 'music' ? tracks.filter(item => item.kind === 'music') : [track]))}
          >
            {active && !loopPlaying && player.playing ? <IconPause /> : <IconPlay />}
            {active && !loopPlaying && player.playing ? t('player.pause') : t('player.play')}
          </button>
          <DownloadAudio url={track.assets.preview} filename={`${track.id}.mp3`} label={t('track.downloadMp3')} />
          <DownloadAudio url={track.assets.master} filename={`${track.id}-master.${track.assets.master.endsWith('.wav') ? 'wav' : 'mp3'}`} label={t('track.downloadWav')} />
          {track.assets.game ? <DownloadAudio url={track.assets.game} filename={`${track.id}.ogg`} label={t('audio.downloadOgg')} /> : null}
        </div>
        {track.sourceDuration ? <p className="shorts-note">{t('shorts.edit')} · {formatTime(track.duration)} / {t('shorts.source')} · {formatTime(track.sourceDuration)}. {t('shorts.note')}</p> : null}
        <p className="attribution">{t('track.attribution', { model: modelLabel(track.model, locale) })}</p>
      </div>

      {loopUrl ? <section className="audio-loop-panel">
        <div><h2>{t('audio.loopOnly')}</h2><p>{t('audio.loopNote')} · {formatTime(track.loop?.duration ?? track.duration)}</p></div>
        <div className="action-row"><button className="btn-ghost" type="button" onClick={() => loopPlaying ? player.toggle() : player.playTrack({...track, duration:track.loop?.duration ?? track.duration, assets:{...track.assets, preview:loopUrl, waveform:track.assets.loop ? undefined : track.assets.waveform}}, [])}>{loopPlaying && player.playing ? t('player.pause') : t('audio.playLoop')}</button><DownloadAudio url={loopUrl} filename={`${track.id}-loop.wav`} label={t('audio.downloadLoop')} />{track.assets.loopOgg ? <DownloadAudio url={track.assets.loopOgg} filename={`${track.id}-loop.ogg`} label={t('audio.downloadOgg')} /> : null}</div>
      </section> : null}
      <section className="audio-rights-panel">
        <div><p className="kicker">{t('audio.permissions')}</p><h2>{track.rights?.label[locale] ?? t('audio.unknown')}</h2><p>{track.rights?.commercialUse === true ? t('audio.permissionNote') : t('audio.unknownNote')}</p></div>
        <div className="action-row"><Link to="/rights" search={cleanSearch}>{t('audio.readTerms')} ↗</Link><a href={`/tracks/${encodeURIComponent(track.id)}.json`} download={`${track.id}.json`}>{t('audio.downloadMetadata')}</a></div>
      </section>

      <dl className="spec-grid">
        <Spec label={t('meta.code')} value={track.code} />
        <Spec label={t('meta.duration')} value={formatTime(track.duration)} />
        <Spec label={t('meta.bpm')} value={track.bpm ? `${track.bpm}` : '—'} />
        <Spec label={t('meta.key')} value={(locale === 'zh' ? track.key.replace('major', '大调').replace('minor', '小调').replace('dorian', '多利亚调式').replace('lydian', '利底亚调式') : track.key) || '—'} />
        <Spec label={t('meta.energy')} value={`${track.energy} / 5`} />
        <Spec label={t('meta.model')} value={modelLabel(track.model, locale)} />
      </dl>

      <ul className="chip-row">
        {track.instruments.map((item) => <li key={item}>{tagLabel(item)}</li>)}
        {track.moods.map((item) => <li key={`m-${item}`}>{tagLabel(item)}</li>)}
      </ul>

      {detailError === trackId ? <p role="status">{t('track.detailsUnavailable')}</p> : null}
      {track.generation ? (
        <details className="generation-block">
          <summary>{t('track.generation')}</summary>
          <dl className="spec-grid">
            {track.generation.generator || track.generation.model ? (
              <Spec label={t('meta.model')} value={modelLabel(track.generation.model || track.model, locale)} />
            ) : null}
            {track.generation.completedAt || track.generation.requestedAt ? (
              <Spec label={t('meta.generatedAt')} value={(track.generation.completedAt || track.generation.requestedAt || '').replace('T', ' ').replace('Z', ' UTC')} />
            ) : null}
            {track.generation.interactionId ? (
              <Spec label={t('meta.interaction')} value={track.generation.interactionId} />
            ) : null}
            {track.generation.id ? (
              <Spec label={t('meta.generationId')} value={track.generation.id} />
            ) : null}
            <Spec
              label={t('meta.watermark')}
              value={track.generation.synthid ? t('meta.synthidOn') : t('meta.synthidOff')}
            />
            {track.generation.api ? (
              <Spec label={t('meta.api')} value={track.generation.api} />
            ) : null}
            {track.generation.sha256 ? (
              <Spec label={t('meta.sha256')} value={`${track.generation.sha256.slice(0, 16)}…`} />
            ) : null}
          </dl>
          {track.generation.endpoint ? (
            <p className="gen-endpoint">{track.generation.endpoint}</p>
          ) : null}
        </details>
      ) : null}

      {track.prompt ? (
        <section className="prompt-block">
          <button type="button" className="btn-text" onClick={() => setOpenPrompt((open) => !open)}>
            {openPrompt ? t('track.promptHide') : t('track.prompt')}
          </button>
          {openPrompt ? <pre className="prompt">{track.prompt}</pre> : null}
        </section>
      ) : null}

      {track.recommendedWorldIds.length > 0 ? (
        <section>
          <h2>{t('track.worlds')}</h2>
          <ul className="world-list">
            {track.recommendedWorldIds.map((id) => (
              <li key={id}>
                <a href={worldUrl(id, locale)}>{worldLabel(id)}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="adjacent">
        {prev && prev.id !== track.id ? (
          <Link to="/track/$trackId" params={{ trackId: prev.id }} search={cleanSearch}>
            <span>{t('track.prev')}</span>
            <strong>{trackTitle(prev, locale)}</strong>
          </Link>
        ) : <span />}
        {next && next.id !== track.id ? (
          <Link to="/track/$trackId" params={{ trackId: next.id }} search={cleanSearch}>
            <span>{t('track.next')}</span>
            <strong>{trackTitle(next, locale)}</strong>
          </Link>
        ) : <span />}
      </nav>

      {similar.length > 0 ? (
        <section>
          <h2>{t('track.similar')}</h2>
          <ul className="similar-list">
            {similar.map((item) => (
              <SimilarLink key={item.id} track={item} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function SimilarLink({ track }: { track: Track }) {
  const { locale } = useI18n()
  return (
    <li>
      <Link to="/track/$trackId" params={{ trackId: track.id }} search={cleanSearch}>
        <span className="plate">{track.code}</span>
        {trackTitle(track, locale)}
      </Link>
    </li>
  )
}
