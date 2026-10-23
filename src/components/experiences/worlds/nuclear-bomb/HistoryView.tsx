import './styles/HistoryView.css'

import {ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight} from '@phosphor-icons/react'
import {useRef, useState, type ReactNode} from 'react'

import type {ExperienceControls} from '~/components/ExperienceShell'
import {Freebar} from '~/components/experiences/Freebar'
import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'

import {HISTORY_EVENTS, TEST_INTERVALS, wholeCalendarMonths} from './history'

const CHART_MAX_MONTHS = 120

export function HistoryView({controls, active = true, tabs}: {
  controls: ExperienceControls
  active?: boolean
  tabs?: ReactNode
}) {
  const tx = useExperienceI18n()
  const {locale} = useI18n()
  const language = locale === 'en' ? 'en' : 'zh'
  const scroller = useRef<HTMLDivElement>(null)
  const timeline = useRef<HTMLOListElement>(null)
  const comparison = useRef<HTMLElement>(null)
  const [selectedCountry, setSelectedCountry] = useState('china')
  const selected = TEST_INTERVALS.find((interval) => interval.id === selectedCountry) ?? TEST_INTERVALS[4]
  const selectedMonths = wholeCalendarMonths(selected.first.date, selected.later.date)
  const dateLabel = (value: string) => value.replaceAll('-', ' . ')
  const behavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

  const moveTimeline = (direction: -1 | 1) => {
    controls.registerInteraction()
    const element = timeline.current
    if (element) element.scrollBy({left: direction * Math.max(300, element.clientWidth * 0.72), behavior: behavior()})
  }

  const jumpToChina = () => {
    controls.registerInteraction()
    const node = timeline.current?.querySelector<HTMLElement>('[data-history-event="china-596"]')
    if (!node || !scroller.current || !timeline.current) return
    if (window.matchMedia('(max-width: 720px)').matches) {
      scroller.current.scrollTo({top: node.offsetTop - 246, behavior: behavior()})
    } else {
      timeline.current.scrollTo({left: node.offsetLeft - timeline.current.offsetLeft - 20, behavior: behavior()})
    }
  }

  const jumpToComparison = () => {
    controls.registerInteraction()
    if (comparison.current && scroller.current) scroller.current.scrollTo({top: comparison.current.offsetTop - 246, behavior: behavior()})
  }

  return <section className="nb-history" aria-label={tx('历史视图')} data-nuclear-history="true">
    <div className="nb-history-scroll" ref={scroller}>
      <div className="nb-history-content">
        <header className="nb-history-heading">
          <p><span />{tx('历史')}<i />1938 — {tx('今天')}</p>
          <h1>{tx('从一次发现，走向一个时代。')}</h1>
          <span>{tx('沿着日期，读这些事件。')}</span>
        </header>

        <section className="nb-history-timeline-section" aria-labelledby="nb-history-timeline-title">
          <div className="nb-history-section-label">
            <h2 id="nb-history-timeline-title">01 <span>{tx('历史时间线')}</span></h2>
            <div className="nb-history-timeline-actions">
              <span>{tx('按事件排列，间隔不代表时长')}</span>
              <button type="button" onClick={() => moveTimeline(-1)} aria-label={tx('向前浏览时间线')}><ArrowLeft size={16} /></button>
              <button type="button" onClick={() => moveTimeline(1)} aria-label={tx('向后浏览时间线')}><ArrowRight size={16} /></button>
            </div>
            <button className="nb-history-mobile-compare" type="button" onClick={jumpToComparison}>{tx('看月数比较')}<ArrowDown size={13} /></button>
          </div>
          <ol className="nb-history-timeline" ref={timeline} tabIndex={0} aria-label={tx('可滚动的历史时间线')}>
            {HISTORY_EVENTS.map((event, index) => <li key={event.id} className={event.china ? 'is-china' : undefined} data-history-event={event.id}>
              <div className="nb-history-node-marker" aria-hidden="true"><span />{String(index + 1).padStart(2, '0')}</div>
              <article>
                <div className="nb-history-event-date"><time dateTime={event.date}>{dateLabel(event.date)}</time>{event.secondDate && <><span> / </span><time dateTime={event.secondDate}>08 . 09</time></>}</div>
                <h3>{event.title[language]}</h3>
                <p>{event.description[language]}</p>
                <div className="nb-history-event-sources">
                  <a href={event.sourceUrl} target="_blank" rel="noreferrer" onClick={controls.registerInteraction}>{tx('维基百科')}<ArrowUpRight size={12} /><span className="nb-history-sr"> · {event.title[language]}</span></a>
                  {event.additionalSourceUrl && <a href={event.additionalSourceUrl} target="_blank" rel="noreferrer" onClick={controls.registerInteraction}>{tx('不首先使用声明')}<ArrowUpRight size={12} /></a>}
                </div>
              </article>
            </li>)}
            <li className="nb-history-today">
              <div className="nb-history-node-marker" aria-hidden="true"><span />—</div>
              <article><p className="nb-history-today-label">{tx('今天')}</p><h3>{tx('回看这些日期。')}</h3><p>{tx('每个事件的出处，都可以打开。')}</p></article>
            </li>
          </ol>
        </section>

        <section className="nb-history-comparison" ref={comparison} aria-labelledby="nb-history-comparison-title">
          <div className="nb-history-section-label"><h2>02 <span>{tx('两次试验之间')}</span></h2><span>{tx('线性坐标 · 从零开始')}</span></div>
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
    {active && <Freebar className="nb-history-freebar" ariaLabel={tx('历史浏览控制')} primaryControlBudget={tabs ? 5 : 2} mobileDensity="comfortable">
      {tabs}
      <button type="button" className="nb-history-jump" onClick={jumpToChina}><span>1964—1967</span>{tx('中国的两个日期')}<ArrowRight size={14} /></button>
      <button type="button" className="nb-history-jump nb-history-jump-compare" onClick={jumpToComparison}>{tx('比较月数')}<ArrowDown size={14} /></button>
    </Freebar>}
  </section>
}
