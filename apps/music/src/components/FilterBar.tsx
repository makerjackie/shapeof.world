import { type TrackFilters, uniqueSorted } from '~/lib/filters'
import { tracks, type LocaleText, type Track } from '~/data/catalog'
import taxonomy from '~/generated/taxonomy.json'
import { useI18n } from '~/i18n'

export function FilterBar({
  filters,
  onChange,
  list = tracks,
}: {
  filters: TrackFilters
  onChange: (next: TrackFilters) => void
  list?: Track[]
}) {
  const { locale, t } = useI18n()

  const set = (patch: Partial<TrackFilters>) => onChange({ ...filters, ...patch })


  return (
    <form className="filters" onSubmit={(event) => event.preventDefault()}>
      <label className="search-field">
        <span className="sr-only">{t('filter.search')}</span>
        <input
          type="search"
          value={filters.q ?? ''}
          placeholder={t('filter.searchPh')}
          onChange={(event) => set({ q: event.target.value || undefined })}
        />
      </label>

      <div className="catalog-selects">
        <label>{t('filter.style')}
          <select value={filters.style ?? ''} onChange={e => set({ style: e.target.value || undefined })}>
            <option value="">{t('filter.all')}</option>
            {uniqueSorted(list.flatMap(track => track.styles)).map(id => <option key={id} value={id}>{(taxonomy.styles as Record<string, LocaleText>)[id]?.[locale] ?? id}</option>)}
          </select>
        </label>
        <label>{t('meta.duration')}
          <select value={filters.durationMin === undefined ? '' : filters.durationMin} onChange={e => {
            const min = e.target.value === '' ? undefined : Number(e.target.value)
            const bounds: Record<number, number> = {0:1,1:5,5:15,15:30,30:60,60:120}
            set({ durationMin: min, durationMax: min === undefined || min === 120 ? undefined : bounds[min] - .001 })
          }}>
            <option value="">{t('filter.all')}</option>
            {[[0,'< 1s'],[1,'1–5s'],[5,'5–15s'],[15,'15–30s'],[30,'30–60s'],[60,'60–120s'],[120,'≥ 120s']].map(([min,label]) => <option key={min} value={min}>{label}</option>)}
          </select>
        </label>
        <label>{t('filter.energy')}
          <select value={filters.energy ?? ''} onChange={e => set({ energy: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{t('filter.all')}</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / 5</option>)}
          </select>
        </label>
      </div>
      <div className="audio-options">
        <label><input type="checkbox" checked={filters.commercialOnly === true} onChange={e => set({commercialOnly:e.target.checked})} />{t('audio.commercialOnly')}</label>
        <label><input type="checkbox" checked={filters.loopOnly === true} onChange={e => set({loopOnly:e.target.checked})} />{t('audio.loopOnly')}</label>
        <label><input type="checkbox" checked={filters.narrationOnly === true} onChange={e => set({narrationOnly:e.target.checked})} />{t('audio.narrationOnly')}</label>
      </div>

    </form>
  )
}
