import { AiMusic } from '~/components/AiMusic'
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { TrackCard } from '~/components/TrackCard'
import { IconPlay } from '~/components/Icons'
import { tracks, type LocaleText } from '~/data/catalog'
import taxonomy from '~/generated/taxonomy.json'
import { useI18n } from '~/i18n'
import { filterTracks } from '~/lib/filters'
import { cleanSearch } from '~/lib/locale'
import { usePlayer } from '~/state/player'

const shorts = tracks.filter(track => track.collections.includes('short-promos'))
const styles = [...new Set(shorts.flatMap(track => track.styles))]

export function ShortsPage() {
  const { locale, t } = useI18n()
  const player = usePlayer()
  const [max, setMax] = useState<number>()
  const [style, setStyle] = useState('')
  const [use, setUse] = useState('')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(30)
  const visible = useMemo(() => filterTracks(shorts, {durationMin: max === undefined ? undefined : max - 1, durationMax: max === undefined ? undefined : max + 1, style, topic: use, q}).sort((a, b) => a.duration - b.duration), [max, style, use, q])
  return <div className="page shorts-page">
    <Link className="back-link" to="/" search={cleanSearch}>← {t('home.catalog')}</Link>
    <section className="shorts-hero">
      <div><p className="kicker">{t('shorts.nav')}</p><h1>{t('shorts.title')}</h1><p className="lede">{t('shorts.lede')}</p><p className="shorts-stats">{t('shorts.count',{n:shorts.length})} · {styles.length} {t('library.styles')} · {Math.round(Math.min(...shorts.map(track => track.duration)))}–{Math.round(Math.max(...shorts.map(track => track.duration)))}s</p></div>
      <div className="shorts-rhythm" aria-hidden="true">{[26,48,35,76,42,94,60,36,82,54,100,34,68,46,22].map((height,i) => <span key={i} style={{height:height+'%'}} />)}</div>
    </section>
    <AiMusic shorts />
    <div className="shorts-controls">
      <div className="scene-choices" role="group" aria-label={t('shorts.length')}>
        <button type="button" aria-pressed={max === undefined} onClick={() => { setMax(undefined); setLimit(30) }}>{t('shorts.any')}</button>
        {[15,20,25,35,40].map(n => <button type="button" key={n} aria-pressed={max === n} onClick={() => { setMax(n); setLimit(30) }}>{t('shorts.upTo',{n})}</button>)}
      </div>
      <label className="shorts-style"><span>{t('shorts.styles')}</span><select value={style} onChange={e => { setStyle(e.target.value); setLimit(30) }}><option value="">{t('filter.all')}</option>{styles.map(id => <option key={id} value={id}>{(taxonomy.styles as Record<string,LocaleText>)[id]?.[locale] ?? id}</option>)}</select></label>
      <label className="shorts-style"><span>{t('shorts.use')}</span><select value={use} onChange={e => { setUse(e.target.value); setLimit(30) }}><option value="">{t('filter.all')}</option>{(['product-demo','fast-montage','process','reveal','lifestyle'] as const).map(id => <option key={id} value={id}>{t(`shorts.${id}`)}</option>)}</select></label>
      <label className="shorts-search"><span>{t('filter.search')}</span><input type="search" value={q} onChange={e => { setQ(e.target.value); setLimit(30) }} /></label>
    </div>
    <div className="results-bar"><p className="count" role="status">{t('shorts.count',{n:visible.length})}</p><button className="btn-solid" type="button" disabled={!visible.length} onClick={() => player.playTrack(visible[0],visible)}><IconPlay />{t('library.playAll')}</button></div>
    <div className="track-grid">{visible.slice(0,limit).map(track => <TrackCard key={track.id} track={track} queue={visible} />)}</div>
    {visible.length > limit ? <div className="load-more"><button className="btn-ghost" type="button" onClick={() => setLimit(limit + 30)}>{t('home.more')} ↓</button><p className="count">{t('home.shown',{n:limit,total:visible.length})}</p></div> : null}
    {!visible.length ? <p className="empty-state">{t('home.noMatches')}</p> : null}
    <p className="shorts-note">{t('shorts.note')}</p>
    <a className="back-link" href="/collections/short-promos.json">{t('shorts.ai')} ↗</a>
  </div>
}
