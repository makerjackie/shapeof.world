import { useNavigate } from '@tanstack/react-router'

import { tracks as allTracks, type Track } from '~/data/catalog'
import { categoryAccent, domains, GLOBAL_CATEGORY } from '~/data/domains'
import { useI18n } from '~/i18n'
import { hashUnit } from '~/lib/format'
import { cleanSearch } from '~/lib/locale'
import { usePlayer } from '~/state/player'

const SIZE = 320
const CX = SIZE / 2
const CY = SIZE / 2

function polar(track: Track) {
  const domain = domains.find((item) => item.id === track.category)
  const sector = domain ? domain.order - 1 : 0
  const sectors = domains.length
  const base = track.category === GLOBAL_CATEGORY ? -Math.PI / 2 : ((sector + 0.5) / sectors) * Math.PI * 2 - Math.PI / 2
  const jitter = (hashUnit(track.id) - 0.5) * 0.28
  const radius = track.category === GLOBAL_CATEGORY
    ? 18 + hashUnit(`${track.id}-r`) * 22
    : 58 + (track.energy / 5) * 78 + hashUnit(`${track.id}-r`) * 12
  const angle = base + jitter
  return {
    x: CX + Math.cos(angle) * radius,
    y: CY + Math.sin(angle) * radius,
  }
}

export function CatalogChart({ visible }: { visible: Track[] }) {
  const { t } = useI18n()
  const player = usePlayer()
  const navigate = useNavigate()
  const visibleIds = new Set(visible.map((track) => track.id))

  return (
    <svg className="star-chart" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('chart.label')}>
      <circle cx={CX} cy={CY} r={148} className="chart-ring" />
      <circle cx={CX} cy={CY} r={96} className="chart-ring" />
      <circle cx={CX} cy={CY} r={42} className="chart-ring" />
      {domains.map((domain) => {
        const angle = ((domain.order - 0.5) / domains.length) * Math.PI * 2 - Math.PI / 2
        const x2 = CX + Math.cos(angle) * 148
        const y2 = CY + Math.sin(angle) * 148
        return <line key={domain.id} x1={CX} y1={CY} x2={x2} y2={y2} className="chart-meridian" />
      })}
      {allTracks.map((track) => {
        const { x, y } = polar(track)
        const on = visibleIds.has(track.id)
        const active = player.current?.id === track.id
        return (
          <circle
            key={track.id}
            className={`chart-star ${on ? 'is-on' : 'is-off'} ${active ? 'is-active' : ''}`}
            cx={x}
            cy={y}
            r={active ? 5.5 : 3.4}
            fill={on ? categoryAccent(track.category) : 'rgba(232,226,212,0.18)'}
            role="link"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate({ to: '/track/$trackId', params: { trackId: track.id }, search: cleanSearch })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                void navigate({ to: '/track/$trackId', params: { trackId: track.id }, search: cleanSearch })
              }
            }}
          >
            <title>{track.code} · {track.title.en}</title>
          </circle>
        )
      })}
    </svg>
  )
}
