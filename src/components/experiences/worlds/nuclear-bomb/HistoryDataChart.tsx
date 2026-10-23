import {useEffect, useRef, type PointerEvent} from 'react'

import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'

import {HISTORY_EVENTS, parseHistoryDate} from './history'
import {annualTotal, HISTORY_DATA, observationAt, STOCKPILE_PEAK, TEST_PEAK} from './history-data'

const WIDTH = 1280
const LEFT = 68
const RIGHT = 1220
const START = 1938
const TODAY = new Date().getUTCFullYear() + (new Date().getUTCMonth() + 1) / 12
const END = Math.max(TODAY, HISTORY_DATA.stockpiles.rows.at(-1)![0] + 0.5)
const STOCK_BOTTOM = 242
const STOCK_TOP = 114
const TEST_BOTTOM = 350
const TEST_TOP = 284
const STOCK_MAX = Math.ceil(STOCKPILE_PEAK.total / 20000) * 20000
const TEST_MAX = Math.ceil(TEST_PEAK.total / 50) * 50
const stockColors = ['#888782', '#b4b0a7', '#706f69', '#d0c9bc', '#d4b072', '#9d978a', '#6f6c64', '#c1b8a7', '#81796b', '#aaa08d']
const COUNTRY_LABELS: Record<string, {zh: string; en: string}> = {
  USA: {zh: '美国', en: 'United States'}, RUS: {zh: '苏联／俄罗斯', en: 'USSR / Russia'},
  GBR: {zh: '英国', en: 'United Kingdom'}, FRA: {zh: '法国', en: 'France'}, CHN: {zh: '中国', en: 'China'},
  IND: {zh: '印度', en: 'India'}, PAK: {zh: '巴基斯坦', en: 'Pakistan'}, ISR: {zh: '以色列', en: 'Israel'},
  PRK: {zh: '朝鲜', en: 'North Korea'}, ZAF: {zh: '南非', en: 'South Africa'},
}
const x = (year: number) => LEFT + (year - START) / (END - START) * (RIGHT - LEFT)
const yStock = (value: number) => STOCK_BOTTOM - value / STOCK_MAX * (STOCK_BOTTOM - STOCK_TOP)
const yTest = (value: number) => TEST_BOTTOM - value / TEST_MAX * (TEST_BOTTOM - TEST_TOP)
const format = (value: number | null) => value === null ? '—' : value.toLocaleString('en-US')
const decimalYear = (date: string) => {
  const parsed = parseHistoryDate(date)
  const year = parsed.getUTCFullYear()
  return year + (parsed.getTime() - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1))
}
const areas = HISTORY_DATA.stockpiles.countries.map((_, countryIndex) => {
  const top = HISTORY_DATA.stockpiles.rows.map(([year, values]) => `${x(year)},${yStock(values.slice(0, countryIndex + 1).reduce<number>((sum, value) => sum + (value ?? 0), 0))}`)
  const bottom = [...HISTORY_DATA.stockpiles.rows].reverse().map(([year, values]) => `${x(year)},${yStock(values.slice(0, countryIndex).reduce<number>((sum, value) => sum + (value ?? 0), 0))}`)
  return `M${top.join(' L')} L${bottom.join(' L')} Z`
})

export function HistoryDataChart({selectedEvent, selectedYear, onEvent, onYear, guided = false}: {
  guided?: boolean
  selectedEvent: number
  selectedYear: number
  onEvent: (index: number) => void
  onYear: (year: number) => void
}) {
  const tx = useExperienceI18n()
  const {locale} = useI18n()
  const language = locale === 'en' ? 'en' : 'zh'
  const svg = useRef<SVGSVGElement>(null)
  const chartScroller = useRef<HTMLDivElement>(null)
  const previousScroll = useRef<number | null>(null)
  useEffect(() => {
    const node = chartScroller.current
    if (node && node.clientWidth < 720) node.scrollLeft = x(STOCKPILE_PEAK.year) / WIDTH * node.scrollWidth - node.clientWidth / 2
  }, [])
  useEffect(() => {
    const node = chartScroller.current
    if (!node) return
    if (guided) {
      if (previousScroll.current === null) previousScroll.current = node.scrollLeft
      if (node.clientWidth < 720) node.scrollLeft = x(STOCKPILE_PEAK.year) / WIDTH * node.scrollWidth - node.clientWidth / 2
    } else if (previousScroll.current !== null) {
      node.scrollLeft = previousScroll.current
      previousScroll.current = null
    }
  }, [guided])
  const selectedStocks = observationAt(HISTORY_DATA.stockpiles, selectedYear)
  const selectedTests = observationAt(HISTORY_DATA.tests, selectedYear)
  const stocks = annualTotal(selectedStocks)
  const tests = annualTotal(selectedTests)
  const pointYear = (event: PointerEvent<SVGElement>) => {
    const box = svg.current?.getBoundingClientRect()
    if (!box) return
    const localX = (event.clientX - box.left) / box.width * WIDTH
    onYear(Math.round(Math.max(START, Math.min(Math.floor(END), START + (localX - LEFT) / (RIGHT - LEFT) * (END - START)))))
  }
  return <div className="nb-history-data" data-guide-history="true">
    <div className="nb-history-data-readout" aria-live="polite" aria-atomic="true">
      <strong>{selectedYear}<small>{tx('年')}</small></strong>
      <span>{tx('全球核弹头库存')}<b>{format(stocks)}<small>{tx('枚')}</small></b></span>
      <span>{tx('当年核试验')}<b>{format(tests)}<small>{tx('次')}</small></b></span>
      <p>{stocks === null || tests === null ? tx('破折号表示该年未收录，不代表零。') : tx('悬停年份读数；手机点按。')}</p>
    </div>
    <p className="nb-history-pan-hint">{tx('左右拖动年份，两张图保持对齐。')}<span aria-hidden="true">↔</span></p>
    <div className="nb-history-data-scroll" ref={chartScroller} tabIndex={0} aria-label={tx('共用年份横轴的时间线与数据图，可横向滚动')}>
      <svg ref={svg} className="nb-history-data-svg" viewBox={`0 0 ${WIDTH} 382`} aria-label={tx('历史事件、各国核弹头库存与每年核试验次数')}>
        <defs><pattern id="nb-history-unavailable" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1 M0 6L6 0 M5 7L7 5" stroke="#aaa294" strokeOpacity=".065" strokeWidth="1" /></pattern></defs>
        <rect x={LEFT} y={STOCK_TOP} width={x(1945) - LEFT} height={STOCK_BOTTOM - STOCK_TOP} fill="url(#nb-history-unavailable)" />
        <rect x={LEFT} y={TEST_TOP} width={x(1945) - LEFT} height={TEST_BOTTOM - TEST_TOP} fill="url(#nb-history-unavailable)" />
        <rect x={x(HISTORY_DATA.tests.rows.at(-1)![0] + .5)} y={TEST_TOP} width={RIGHT - x(HISTORY_DATA.tests.rows.at(-1)![0] + .5)} height={TEST_BOTTOM - TEST_TOP} fill="url(#nb-history-unavailable)" />
        {[1940, 1960, 1980, 2000, 2020].map((year) => <line key={year} x1={x(year)} x2={x(year)} y1="37" y2={TEST_BOTTOM} stroke="#b8b0a2" strokeOpacity=".075" />)}
        {[1963, 1996].map((year) => <g key={year} className="nb-history-treaty"><line x1={x(year)} x2={x(year)} y1="82" y2={TEST_BOTTOM} /><text x={x(year) + 7} y="96">{year} · {year === 1963 ? tx('部分禁止核试验') : tx('全面禁止核试验')}</text></g>)}
        <line x1={LEFT} x2={RIGHT} y1="36" y2="36" stroke="#a49b8b" strokeOpacity=".45" />
        {[1938, 1950, 1970, 1990, 2010].map((year) => <g key={year}><line x1={x(year)} x2={x(year)} y1="36" y2="42" stroke="#9a9285" /><text x={x(year)} y="60" textAnchor={year === START ? 'start' : 'middle'} className="nb-history-svg-year">{year}</text></g>)}
        <text x={RIGHT} y="60" textAnchor="end" className="nb-history-svg-year">{Math.floor(TODAY)} · {tx('今天')}</text>
        {HISTORY_EVENTS.map((event, index) => {
          const eventX = x(decimalYear(event.date))
          const eventY = index % 3 === 0 ? 16 : index % 3 === 1 ? 25 : 36
          return <g key={event.id} role="button" tabIndex={0} aria-label={`${event.date} · ${event.title[language]}`} aria-pressed={selectedEvent === index} className={`nb-history-event-tick${event.china ? ' is-china' : ''}${selectedEvent === index ? ' is-selected' : ''}`} onClick={() => onEvent(index)} onKeyDown={(e) => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); onEvent(index)}}}>
            <title>{event.date} · {event.title[language]}</title><line x1={eventX} x2={eventX} y1={eventY} y2="36" /><circle cx={eventX} cy={eventY} r="9" fill="transparent" stroke="none" /><circle cx={eventX} cy={eventY} r={selectedEvent === index ? 4.5 : 3} />
          </g>
        })}
        <circle cx={RIGHT} cy="36" r="3" fill="#827a6c" />
        {[0, STOCK_MAX / 2, STOCK_MAX].map((tick) => <g key={tick}><line x1={LEFT} x2={RIGHT} y1={yStock(tick)} y2={yStock(tick)} stroke="#aaa294" strokeOpacity=".1" /><text x={LEFT - 12} y={yStock(tick) + 4} textAnchor="end" className="nb-history-svg-value">{tick === 0 ? '0' : `${tick / 1000}k`}</text></g>)}
        <text x="0" y="101" className="nb-history-svg-unit">{tx('库存（枚）')}</text>
        {areas.map((d, index) => <path key={HISTORY_DATA.stockpiles.countries[index].code} d={d} fill={stockColors[index]} fillOpacity={HISTORY_DATA.stockpiles.countries[index].code === 'CHN' ? .95 : .82} />)}
        <text x={x(STOCKPILE_PEAK.year) + 10} y={yStock(STOCKPILE_PEAK.total) - 12} className="nb-history-svg-peak">{STOCKPILE_PEAK.year} · {format(STOCKPILE_PEAK.total)}</text>
        {[0, TEST_MAX].map((tick) => <g key={tick}><line x1={LEFT} x2={RIGHT} y1={yTest(tick)} y2={yTest(tick)} stroke="#aaa294" strokeOpacity=".12" /><text x={LEFT - 12} y={yTest(tick) + 4} textAnchor="end" className="nb-history-svg-value">{tick}</text></g>)}
        <text x="0" y="271" className="nb-history-svg-unit">{tx('试验（次）')}</text>
        {HISTORY_DATA.tests.rows.map((row) => <rect key={row[0]} x={x(row[0]) - 3.5} y={yTest(annualTotal(row) ?? 0)} width="7" height={TEST_BOTTOM - yTest(annualTotal(row) ?? 0)} fill={selectedYear === row[0] ? '#d2c5ad' : '#8e8a81'} />)}
        <text x={RIGHT} y="373" textAnchor="end" className="nb-history-svg-value">{tx('试验数据截至')} {HISTORY_DATA.tests.rows.at(-1)![0]}</text>
        <line x1={x(selectedYear)} x2={x(selectedYear)} y1="76" y2={TEST_BOTTOM} stroke="#d4b072" strokeOpacity=".65" strokeWidth="1" strokeDasharray="3 4" />
        {stocks !== null && <circle cx={x(selectedYear)} cy={yStock(stocks)} r="3" fill="#d4b072" />}
        <rect x={LEFT} y="78" width={RIGHT - LEFT} height={TEST_BOTTOM - 78} fill="transparent" tabIndex={0} role="slider" aria-label={tx('查看年份数据')} aria-valuemin={START} aria-valuemax={Math.floor(END)} aria-valuenow={selectedYear} onPointerMove={(e) => {if (e.pointerType === 'mouse') pointYear(e)}} onPointerDown={pointYear} onKeyDown={(e) => {if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault(); onYear(Math.max(START, Math.min(Math.floor(END), selectedYear + (e.key === 'ArrowLeft' ? -1 : 1))))}}} />
      </svg>
    </div>
    <div className="nb-history-country-legend">{HISTORY_DATA.stockpiles.countries.map(({code}, index) => <span key={code} className={code === 'CHN' ? 'is-china' : undefined}><i style={{background: stockColors[index]}} />{COUNTRY_LABELS[code][language]}<b>{format(selectedStocks?.[1][index] ?? null)}</b></span>)}</div>
    <p className="nb-history-data-reading">{STOCKPILE_PEAK.year} {tx('年库存达到峰值，此后下降。')} {tx('各国库存相加；不含退役待拆弹头。')}</p>
    <div className="nb-history-data-source"><span>{tx('数据：Our World in Data，基于 FAS 与 Arms Control Association。')}</span><a href={HISTORY_DATA.stockpiles.source.csv.replace('.csv', '')} target="_blank" rel="noreferrer">{tx('库存来源')} ↗</a><a href={HISTORY_DATA.tests.source.csv.replace('.csv', '')} target="_blank" rel="noreferrer">{tx('试验来源')} ↗</a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 ↗</a></div>
  </div>
}
