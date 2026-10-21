import { Link } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { trackTitle, type Track, type LocaleText } from '~/data/catalog'
import taxonomy from '~/generated/taxonomy.json'
import { useI18n } from '~/i18n'
import { formatTime } from '~/lib/format'
import { cleanSearch } from '~/lib/locale'
import { usePlayer } from '~/state/player'
import { useSaved } from '~/state/saved'
import { IconPause, IconPlay } from './Icons'

export function TrackCard({ track, queue }: { track: Track; queue: Track[] }) {
  const { locale, t } = useI18n()
  const player = usePlayer()
  const { saved, toggleSaved } = useSaved()
  const active = player.current?.id === track.id
  const title = trackTitle(track, locale)
  const label = (id: string, type: 'styles' | 'scenarios') => (taxonomy[type] as Record<string, LocaleText>)[id]?.[locale] ?? id
  const hue = [...(track.styles[0] || track.id)].reduce((n, c) => n + c.charCodeAt(0), 0) % 360
  return (
    <article className={`music-row${active ? ' is-active' : ''}`}>
      <button type="button" className="record-play" style={{ '--record-hue': hue } as CSSProperties}
        aria-label={`${active && player.playing ? t('player.pause') : t('card.play')} · ${title}`}
        onClick={() => active ? player.toggle() : player.playTrack(track, track.kind === 'music' ? queue : [track])}>
        {active && player.playing ? <IconPause /> : <IconPlay />}
      </button>
      <div className="music-row-title">
        <Link to="/track/$trackId" params={{ trackId: track.id }} search={cleanSearch}>{title}</Link>
        <p>{track.description?.[locale] || track.moods.map(id => (taxonomy.tags as Record<string, LocaleText>)[id]?.[locale] ?? id).join(' · ')}</p>
        <div className="asset-badges"><span>{track.rights?.commercialUse === true ? (track.rights.id === 'original-synthesis-cc0' ? 'CC0' : t('audio.commercial')) : t('audio.unknown')}</span>{track.loop?.seamless ? <span>↻ {t('audio.loopOnly')}</span> : null}</div>
      </div>
      <div className="row-tags"><span>{track.styles.map(id => label(id, 'styles')).join(' · ') || t('nav.album')}</span><small>{track.scenarios.map(id => label(id, 'scenarios')).join(' · ')}</small></div>
      <span className="energy-meter" title={`${t('meta.energy')}: ${track.energy}/5`} aria-label={`${t('meta.energy')}: ${track.energy}/5`}>{[1,2,3,4,5].map(n => <i key={n} className={n <= track.energy ? 'filled' : ''} />)}</span>
      <span className="row-duration">{formatTime(track.duration)}</span>
      <button type="button" className="save-button" aria-pressed={saved.includes(track.id)} aria-label={`${t('library.save')} · ${title}`} onClick={() => toggleSaved(track.id)}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z" fill={saved.includes(track.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      </button>
    </article>
  )
}
