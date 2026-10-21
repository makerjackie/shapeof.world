import { AiMusic } from '~/components/AiMusic'
import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FilterBar } from '~/components/FilterBar'
import { TrackCard } from '~/components/TrackCard'
import { IconPause, IconPlay } from '~/components/Icons'
import { hiddenShapesTrack, tracks, trackTitle, type LocaleText, type AudioKind } from '~/data/catalog'
import taxonomy from '~/generated/taxonomy.json'
import { useI18n } from '~/i18n'
import { filterTracks, filtersActive, type TrackFilters } from '~/lib/filters'
import { readLibrary, sortLibrary } from '~/lib/library'
import { cleanSearch } from '~/lib/locale'
import { usePlayer } from '~/state/player'
import { useSaved } from '~/state/saved'

export function HomePage({ kind = 'music', games = false }: { kind?: AudioKind; games?: boolean }) {
  const { locale, t } = useI18n()
  const player = usePlayer()
  const { saved } = useSaved()
  const storageKey = `music.library.${games ? 'games' : kind}`
  const [state, setState] = useState(() => readLibrary(storageKey))
  const { filters, sort, savedOnly, limit } = state
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* Browsing still works without storage. */ } }, [state, storageKey])
  const updateFilters = (filters: TrackFilters) => setState(value => ({ ...value, filters, limit: 40 }))
  const library = useMemo(() => tracks.filter(track => track.kind === kind && (!games || track.collections.includes('game-audio'))), [kind, games])
  const visible = useMemo(() => sortLibrary(filterTracks(savedOnly ? library.filter(track => saved.includes(track.id)) : library, filters), sort, locale), [filters, sort, locale, savedOnly, saved, library])
  const theme = kind === 'music' && !games ? hiddenShapesTrack() : undefined
  const scenes = Object.entries(taxonomy.scenarios).filter(([id]) => library.some(track => track.scenarios.includes(id)))
  const themePlaying = theme && player.current?.id === theme.id && player.playing
  return (
    <div className="page home">
      <section className="library-hero">
        <div className="hero-copy">
          <p className="kicker">{t('library.kicker')}</p>
          <h1>{t(games ? 'audio.gamesTitle' : kind === 'sfx' ? 'audio.sfxTitle' : kind === 'ambience' ? 'audio.ambienceTitle' : 'library.title')}</h1>
          <p className="lede">{t(games ? 'audio.gamesLede' : kind === 'sfx' ? 'audio.sfxLede' : kind === 'ambience' ? 'audio.ambienceLede' : 'site.lede')}</p>
          <p className="library-stats"><span>{library.length} <small>{t('audio.assets')}</small></span><span>{library.filter(track => track.rights?.commercialUse === true).length} <small>{t('audio.commercial')}</small></span><span>{library.filter(track => track.loop?.seamless).length} <small>{t('audio.loops')}</small></span></p>
        </div>
        {theme ? <button className="featured-record" type="button" onClick={() => player.current?.id === theme.id ? player.toggle() : player.playTrack(theme, tracks.filter(track => track.kind === 'music'))} aria-label={`${themePlaying ? t('player.pause') : t('home.playTheme')}`}>
          <img className="featured-emblem" src="/brand/mark-256.png" width={118} height={118} alt="" aria-hidden="true" />
          <span className="featured-copy"><small>{t('home.themeKicker')}</small><strong>{trackTitle(theme, locale)}</strong><span>{themePlaying ? <IconPause /> : <IconPlay />}{themePlaying ? t('player.pause') : t('home.playTheme')}</span></span>
        </button> : null}
      </section>
      <AiMusic />
      <nav className="audio-kind-nav" aria-label={t('audio.type')}>
        {([{id:'music',path:'/'},{id:'sfx',path:'/sounds'},{id:'ambience',path:'/ambience'},{id:'games',path:'/games'}] as const).map(item => <Link key={item.id} to={item.path} search={cleanSearch} className={(games ? item.id === 'games' : item.id === kind) ? 'selected' : ''}><span>{t(`audio.${item.id}`)}</span><small>{tracks.filter(track => item.id === 'games' ? track.collections.includes('game-audio') : track.kind === item.id).length}</small></Link>)}
      </nav>
      {kind === 'music' && !games ? <Link className="shorts-banner" to="/shorts" search={cleanSearch}><span><small>{t('shorts.nav')}</small><strong>{t('shorts.open')}</strong></span><span aria-hidden="true">↗</span></Link> : null}
      <section className="scene-section" aria-label={t('filter.scenario')}>
        <p className="kicker">{t('library.scenePrompt')}</p>
        <div className="scene-choices">
          <button type="button" aria-pressed={!filters.scenario} onClick={() => updateFilters({ ...filters, scenario: undefined })}>{t('filter.all')}</button>
          {scenes.map(([id, label], i) => <button key={id} type="button" aria-pressed={filters.scenario === id} onClick={() => updateFilters({ ...filters, scenario: filters.scenario === id ? undefined : id })}><span className={`scene-dot dot-${i % 5}`} aria-hidden="true" />{(label as LocaleText)[locale]}</button>)}
        </div>
      </section>
      <section className="catalog-block">
        <div className="catalog-tabs">
          <div role="group" aria-label={t('home.catalog')}><button type="button" aria-pressed={!savedOnly} onClick={() => setState(s => ({ ...s, savedOnly: false, limit: 40 }))}>{t('home.catalog')} <span>{library.length}</span></button><button type="button" aria-pressed={savedOnly} onClick={() => setState(s => ({ ...s, savedOnly: true, limit: 40 }))}>{t('library.saved')} <span>{library.filter(track => saved.includes(track.id)).length}</span></button></div>
          <Link to="/handoff" search={cleanSearch}>{t('library.ai')} ↗</Link>
        </div>
        <FilterBar filters={filters} onChange={updateFilters} list={library} />
        <div className="results-bar">
          <p className="count" role="status">{t('home.count', { n: visible.length })}{savedOnly ? ` · ${t('library.local')}` : ''}</p>
          {filtersActive(filters) ? <button type="button" className="clear-filter" onClick={() => updateFilters({})}>{t('filter.clear')} ×</button> : null}
          <label className="sort-control"><span className="sr-only">{t('library.sort')}</span><select value={sort} onChange={e => setState(s => ({ ...s, sort: e.target.value, limit: 40 }))}>{['explore', 'short', 'long', 'title'].map(id => <option key={id} value={id}>{t(`library.sort.${id}` as 'library.sort.explore')}</option>)}</select></label>
          <button className="btn-solid play-results" type="button" disabled={!visible.length} onClick={() => player.playTrack(visible[0], visible)}><IconPlay />{t('library.playAll')}</button>
        </div>
        {visible.length ? <div className="track-grid">{visible.slice(0, limit).map(track => <TrackCard key={track.id} track={track} queue={visible} />)}</div> : <div className="empty-state"><h2>{savedOnly && !saved.length ? t('library.noSaved') : t('home.noMatches')}</h2><p>{savedOnly && !saved.length ? t('library.saveHint') : t('library.tryFilters')}</p></div>}
        {visible.length > limit ? <div className="load-more"><button className="btn-ghost" type="button" onClick={() => setState(s => ({ ...s, limit: s.limit + 40 }))}>{t('home.more')} ↓</button><p className="count">{t('home.shown', { n: limit, total: visible.length })}</p></div> : null}
      </section>
    </div>
  )
}
