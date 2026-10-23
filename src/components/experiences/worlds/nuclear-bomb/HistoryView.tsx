import './styles/HistoryView.css'

import {ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight} from '@phosphor-icons/react'
import {useEffect, useRef, useState, type ReactNode} from 'react'

import type {ExperienceControls} from '~/components/ExperienceShell'
import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'

import {HISTORY_EVENTS, TEST_INTERVALS, wholeCalendarMonths} from './history'
import {STOCKPILE_PEAK} from './history-data'
import {HistoryDataChart} from './HistoryDataChart'

const CHART_MAX_MONTHS = 120
const CHINA_EVENT = HISTORY_EVENTS.findIndex((event) => event.id === 'china-596')
const CHINA_INTERVAL = TEST_INTERVALS.find((interval) => interval.id === 'china')!
const CHINA_MONTHS = wholeCalendarMonths(CHINA_INTERVAL.first.date, CHINA_INTERVAL.later.date)

export function HistoryView({controls, active = true, guided = false, guideFocus}: {
  controls: ExperienceControls
  active?: boolean
  tabs?: ReactNode
  guided?: boolean
  guideFocus?: 'china'
}) {
  const tx = useExperienceI18n()
  const {locale} = useI18n()
  const language = locale === 'en' ? 'en' : 'zh'
  const scroller = useRef<HTMLDivElement>(null)
  const comparison = useRef<HTMLElement>(null)
  const [selectedCountry, setSelectedCountry] = useState('china')
  const [selectedEvent, setSelectedEvent] = useState(CHINA_EVENT)
  const [selectedYear, setSelectedYear] = useState(STOCKPILE_PEAK.year)
  const guideSnapshot = useRef<{country: string; event: number; year: number; scroll: number} | null>(null)
  const selected = TEST_INTERVALS.find((interval) => interval.id === selectedCountry) ?? TEST_INTERVALS[4]
  const event = HISTORY_EVENTS[selectedEvent]
  const selectedMonths = wholeCalendarMonths(selected.first.date, selected.later.date)
  const dateLabel = (value: string) => value.replaceAll('-', ' . ')
  const behavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

  useEffect(() => {
    if (guided && guideFocus === 'china') {
      if (!guideSnapshot.current) guideSnapshot.current = {country: selectedCountry, event: selectedEvent, year: selectedYear, scroll: scroller.current?.scrollTop ?? 0}
      setSelectedCountry('china')
      setSelectedEvent(CHINA_EVENT)
      setSelectedYear(STOCKPILE_PEAK.year)
      scroller.current?.scrollTo({top: 0, behavior: 'auto'})
    } else if (guideSnapshot.current) {
      const saved = guideSnapshot.current
      setSelectedCountry(saved.country)
      setSelectedEvent(saved.event)
      setSelectedYear(saved.year)
      scroller.current?.scrollTo({top: saved.scroll, behavior: 'auto'})
      guideSnapshot.current = null
    }
  // The snapshot is captured once on tour entry, then restored on exit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guided, guideFocus])

  const chooseEvent = (index: number) => {
    controls.registerInteraction()
    setSelectedEvent(Math.max(0, Math.min(HISTORY_EVENTS.length - 1, index)))
  }
  const jumpToChina = () => {
    chooseEvent(CHINA_EVENT)
    setSelectedCountry('china')
    scroller.current?.scrollTo({top: 0, behavior: behavior()})
  }
  const jumpToComparison = () => {
    controls.registerInteraction()
    if (comparison.current && scroller.current) scroller.current.scrollTo({top: comparison.current.offsetTop - 150, behavior: behavior()})
  }

  return <section className="nb-history" aria-label={tx('历史视图')} data-nuclear-history="true" data-history-guided={guided || undefined}>
    <div className="nb-history-scroll" ref={scroller}>
      <div className="nb-history-content">
        <header className="nb-history-heading">
          <p><span />{tx('历史')}<i />1938 — {tx('今天')}</p>
          <h1>{tx('日期之间，也有距离。')}</h1>
          <span>{tx('同一根年份横轴，读事件与数量。')}</span>
        </header>

        <section className="nb-history-timeline-section" aria-labelledby="nb-history-timeline-title">
          <div className="nb-history-section-label">
            <h2 id="nb-history-timeline-title">01 <span>{tx('历史时间线与数据')}</span></h2>
            <div className="nb-history-title-links"><button className="nb-history-text-link" type="button" onClick={jumpToChina}>{tx('中国的两个日期')}<ArrowUpRight size={12} /></button><button className="nb-history-text-link" type="button" onClick={jumpToComparison}>{tx('比较月数')}<ArrowDown size={12} /></button></div>
            <span className="nb-history-axis-note">{tx('年份线性排列')}</span>
          </div>
          <HistoryDataChart guided={guided} selectedEvent={selectedEvent} selectedYear={selectedYear} onEvent={chooseEvent} onYear={setSelectedYear} />
          <div className={`nb-history-selected-event${event.china ? ' is-china' : ''}`} data-history-event={event.id}>
            <div className="nb-history-event-index"><span>{String(selectedEvent + 1).padStart(2, '0')} / {HISTORY_EVENTS.length}</span><div><button type="button" disabled={selectedEvent === 0} onClick={() => chooseEvent(selectedEvent - 1)} aria-label={tx('上一个历史事件')}><ArrowLeft size={16} /></button><button type="button" disabled={selectedEvent === HISTORY_EVENTS.length - 1} onClick={() => chooseEvent(selectedEvent + 1)} aria-label={tx('下一个历史事件')}><ArrowRight size={16} /></button></div></div>
            <article>
              <div className="nb-history-event-date"><time dateTime={event.date}>{dateLabel(event.date)}</time>{event.secondDate && <><span> / </span><time dateTime={event.secondDate}>08 . 09</time></>}</div>
              <h3>{event.title[language]}</h3>
              <p>{event.description[language]}</p>
              <div className="nb-history-event-sources"><a href={event.sourceUrl} target="_blank" rel="noreferrer" onClick={controls.registerInteraction}>{tx('维基百科')}<ArrowUpRight size={12} /><span className="nb-history-sr"> · {event.title[language]}</span></a>{event.additionalSourceUrl && <a href={event.additionalSourceUrl} target="_blank" rel="noreferrer" onClick={controls.registerInteraction}>{tx('不首先使用声明')}<ArrowUpRight size={12} /></a>}</div>
            </article>
            {guided && <aside className="nb-history-guide-months"><strong>{Math.floor(CHINA_MONTHS / 12)}<small>{tx('年')}</small>{CHINA_MONTHS % 12}<small>{tx('个月')}</small></strong><span>1964.10.16 — 1967.06.17</span><p>{tx('中国：32 个完整月，另 1 天。')}</p></aside>}
          </div>
        </section>
        <section className="nb-history-comparison" ref={comparison} aria-labelledby="nb-history-comparison-title">
          <div className="nb-history-section-label"><h2>02 <span>{tx('两次试验之间')}</span></h2><button className="nb-history-text-link" type="button" onClick={jumpToChina}>{tx('中国的两个日期')}<ArrowUpRight size={12} /></button><span>{tx('线性坐标 · 从零开始')}</span></div>
          <h2 id="nb-history-comparison-title">{tx('从第一颗原子弹到第一颗氢弹')}</h2>
          <div className="nb-history-chart-layout">
            <div className="nb-history-chart">
              <div className="nb-history-chart-axis" aria-hidden="true"><span>{tx('完整月数')}</span><div>{[0, 24, 48, 72, 96, 120].map((tick) => <span key={tick} style={{left: `${tick / CHART_MAX_MONTHS * 100}%`}}>{tick}</span>)}</div></div>
              <ol className="nb-history-bars" aria-label={tx('从第一次原子弹试验到第一次两级或百万吨级热核试验的完整月数')}>
                {TEST_INTERVALS.map((interval) => {
                  const months = wholeCalendarMonths(interval.first.date, interval.later.date)
                  return <li key={interval.id} className={`${interval.china ? 'is-china ' : ''}${selectedCountry === interval.id ? 'is-selected' : ''}`}>
                    <button type="button" aria-pressed={selectedCountry === interval.id} onClick={() => { controls.registerInteraction(); setSelectedCountry(interval.id) }}>
                      <span className="nb-history-country">{interval.country[language]}</span>
                      <span className="nb-history-bar-track"><span className="nb-history-bar" style={{width: `${months / CHART_MAX_MONTHS * 100}%`}} /><strong style={{left: `${months / CHART_MAX_MONTHS * 100}%`}}>{months}<small>{tx('个月')}</small></strong></span>
                    </button>
                  </li>
                })}
              </ol>
            </div>
            <aside className={`nb-history-interval-detail${selected.china ? ' is-china' : ''}`} aria-live="polite" aria-atomic="true">
              <p>{selected.country[language]}</p>
              <h3>{Math.floor(selectedMonths / 12)}<small>{tx('年')}</small>{selectedMonths % 12}<small>{tx('个月')}</small></h3>
              <div><a href={selected.first.sourceUrl} target="_blank" rel="noreferrer" onClick={controls.registerInteraction}><span>{selected.first.name[language]}<ArrowUpRight size={11} /></span><time dateTime={selected.first.date}>{selected.first.date}</time></a><i aria-hidden="true" /><a href={selected.later.sourceUrl} target="_blank" rel="noreferrer" onClick={controls.registerInteraction}><span>{selected.later.name[language]}<ArrowUpRight size={11} /></span><time dateTime={selected.later.date}>{selected.later.date}</time></a></div>
              <small>{selected.china ? tx('32 个完整月，另 1 天。') : tx('只计完整月，不向上取整。')}</small>
            </aside>
          </div>
          <p className="nb-history-chart-note">{tx('以各国第一次两级热核或百万吨级热核试验为准，日期见维基百科各条目。')}</p>
        </section>
      </div>
    </div>
  </section>
}
