import './styles/SpanView.css'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { BRIDGES } from './content'
import type { BridgeKind } from './model'
import { BRIDGE_EXAMPLES, type BridgeExample } from './bridge-examples'
import { SpanScene } from './SpanScene'
import { feasibleKinds, SCHEME_LIMITS, SLIDER_MAX, SPAN_KINDS, SPAN_MIN, spanResponse } from './span-model'
import { Silhouette } from './Silhouette'
import { rangeFill } from './palette'

const FEATURED = ['shibanpo', 'pingnan', 'husutong', 'yangsigang']

const WHY: Record<BridgeKind, { yes: string; no: string }> = {
  beam: { yes: '把弯矩交给梁；桥越长，梁就要越深。', no: '梁高已封顶，弯矩仍随跨度的平方增长。' },
  arch: { yes: '让压力沿拱走向两岸，代价是坚实的拱座。', no: '拱肋越长越容易失稳，这组截面需要加大。' },
  stayed: { yes: '斜索直接拉到塔上，也能跨过一千米。', no: '塔高封顶后斜索变平，自重也占去拉力余量。' },
  suspension: { yes: '主缆保持下垂，用拉力承担长跨。', no: '主缆截面已定，拉力超过了这组方案的上限。' },
}
function initialSpan() {
  if (typeof window === 'undefined') return 50
  const value = Number(new URLSearchParams(window.location.search).get('span') ?? 50)
  return Number.isFinite(value) ? Math.max(SPAN_MIN, Math.min(2023, value)) : 50
}
export function SpanView({ controls, views }: { controls: ExperienceControls; views?: ReactNode }) {
  const tx = useExperienceI18n()
  const [span, setSpan] = useState(initialSpan)
  const [selected, setSelected] = useState<BridgeKind | null>(null)
  const [example, setExample] = useState<BridgeExample | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [reset, setReset] = useState(0)
  const [front, setFront] = useState(false)
  const scroll = useRef<HTMLDivElement>(null)
  const feasible = feasibleKinds(span)
  const kind = selected ?? feasible[0] ?? 'suspension'
  const response = useMemo(() => spanResponse(kind, span), [kind, span])
  const sliderMax = Math.max(SLIDER_MAX, span)
  const chooseSpan = (next: number) => { setSpan(Math.max(SPAN_MIN, Math.min(SLIDER_MAX, next))); setSelected(null); setExample(null); controls.registerInteraction() }
  const chooseExample = (bridge: BridgeExample) => {
    setSpan(bridge.span); setSelected(bridge.kind); setExample(bridge); setCatalogOpen(false)
    scroll.current?.scrollTo({ top: 0, behavior: 'instant' }); controls.registerInteraction()
  }
  const idea = feasible.length === 1
    ? '在这组方案里，只剩悬索：主缆保持下垂，承担长跨。'
    : span > 1000 ? '超过一千米，斜拉和悬索都还可行。' : '桥越长，承重的方法也要跟着变。'
  return <div className="bridge-design bd-span" data-span={span} data-scheme={kind}>
    <div className="bs-scroll" ref={scroll}>
      {views}
      <header className="bs-heading"><h1>{tx('跨度越大，为什么要换桥型')}</h1><p>{tx(idea)}</p></header>
      {example && <section className="bs-example" aria-label={tx('所选实桥')} data-example={example.id}>
        <div><span>{tx(example.country)} · {tx(example.structure)}</span><h2>{tx(example.name)}</h2><p>{tx(example.distinction)}</p></div>
        <strong>{example.span.toLocaleString('en-US')} <small>m</small><span>{tx('通车年份')} {example.year}</span></strong>
        <a href={example.source} target="_blank" rel="noreferrer">{tx('数据出处')} ↗</a>
      </section>}
      <div className="bs-main">
        <section className="bs-stage" aria-label={tx('随跨度变化的桥梁模型')}>
          <div className="bs-canvas"><SpanScene kind={kind} span={span} reset={reset} front={front} /></div>
          <div className="bs-stage-controls"><button type="button" aria-pressed={front} onClick={() => { setFront(v => !v); controls.registerInteraction() }}>{tx(front ? '立体' : '正面')}</button><button type="button" onClick={() => { setReset(n => n + 1); controls.registerInteraction() }}>{tx('复位')}</button><span>{tx('同一河谷 · 镜头随长跨拉远')}<em>{tx('手机竖向放大 2×')}</em></span></div>
          <p className="bs-stage-caption">{tx(example ? '同桥型示意，不是这座实桥的结构复刻。' : '两岸向外移动，车和桥面宽度保持不变。')}</p>
        </section>
        <aside className="bs-schemes" aria-label={tx('四种桥型的跨度方案')}>
          <div className="bs-schemes-heading"><strong>{tx('这组方案还能用吗')}</strong><span>{tx('灰色可点，查看原因')}</span></div>
          {SPAN_KINDS.map(id => {
            const bridge = BRIDGES.find(b => b.id === id)!, r = spanResponse(id, span), possible = r.utilization <= 1
            return <button type="button" className="bs-scheme" key={id} data-scheme={id} data-feasible={possible} aria-pressed={kind === id} onClick={() => { setSelected(id); controls.registerInteraction() }}>
              <Silhouette kind={id} /><div className="bs-scheme-name"><strong>{tx(bridge.name)}</strong><small>{tx(possible ? '本方案可行' : '本方案不够')}</small></div>
              <p>{tx(WHY[id][possible ? 'yes' : 'no'])}</p>
              <div className="bs-meter"><i style={{ width: `${Math.min(100, r.utilization * 100)}%` }} /></div>
              <span className="bs-envelope">{tx('本方案约')} 20–{SCHEME_LIMITS[id].toLocaleString('en-US')} m</span>
            </button>
          })}
        </aside>
      </div>
      <section className="bs-ruler" aria-label={tx('跨度滑杆和实桥刻度')}>
        <div className="bs-ruler-heading"><label htmlFor="bridge-span">{tx('拖动跨度')} <strong><output htmlFor="bridge-span">{span.toLocaleString('en-US')}</output><small> m</small></strong></label><div className="bs-presets">{[50, 500, 1000, 1500].map(value => <button key={value} type="button" aria-pressed={span === value} onClick={() => chooseSpan(value)}>{value.toLocaleString('en-US')} m</button>)}</div></div>
        <div className="bs-range"><input id="bridge-span" type="range" min={SPAN_MIN} max={sliderMax} step="1" value={span} style={rangeFill(span, SPAN_MIN, sliderMax)} aria-label={tx('桥梁跨度')} onChange={e => chooseSpan(Number(e.target.value))} />
          <div className="bs-real-ticks" aria-hidden="true">{BRIDGE_EXAMPLES.map(b => <i key={b.id} style={{ left: `${(Math.min(sliderMax, b.span) - SPAN_MIN) / (sliderMax - SPAN_MIN) * 100}%`, top: SPAN_KINDS.indexOf(b.kind) * 5 }} />)}</div>
          <div className="bs-featured">{FEATURED.map((id, index) => { const b = BRIDGE_EXAMPLES.find(item => item.id === id)!; return <button type="button" key={id} data-example-tick={id} aria-label={`${tx(b.name)} · ${b.span} m`} style={{ left: `${(b.span - SPAN_MIN) / (sliderMax - SPAN_MIN) * 100}%`, top: index % 2 * 38 }} onClick={() => chooseExample(b)}><span>{tx(b.short)}</span><small>{b.span.toLocaleString('en-US')} m</small></button> })}</div>
        </div>
        <div className="bs-scale"><span>20 m</span><span>500</span><span>1,000</span><span>1,500</span><span>{sliderMax.toLocaleString('en-US')} m</span></div>
        {span > SLIDER_MAX && <p className="bs-record-note">{tx('纪录刻度额外延伸到 2,023 m；拖动后回到常规范围。')}</p>}
      </section>
      <details className="bs-catalog" open={catalogOpen} onToggle={e => setCatalogOpen(e.currentTarget.open)}>
        <summary>{tx('寻找实桥刻度')}<span>{tx('中国代表桥与世界纪录')} · {BRIDGE_EXAMPLES.length}</span></summary>
        <div className="bs-catalog-grid">{SPAN_KINDS.map(id => <section key={id}><h3>{tx(BRIDGES.find(b => b.id === id)!.name)}</h3>{BRIDGE_EXAMPLES.filter(b => b.kind === id).map(b => <button type="button" key={b.id} data-example-choice={b.id} onClick={() => chooseExample(b)}><span>{tx(b.name)}<small>{tx(b.country)} · {b.year}</small></span><strong>{b.span.toLocaleString('en-US')} m</strong></button>)}</section>)}</div>
      </details>
      <details className="bs-model"><summary>{tx('教学模型：范围不是所有桥梁的极限')}</summary><p>{tx('同样的桥面荷载，分别限制梁高、拱肋截面、塔高与主缆截面。需求超过本方案上限就变灰；换材料或加大结构，范围也会改变。实桥刻度不是承载验算。')}</p><dl><div><dt>{tx('当前方案需求 / 上限')}</dt><dd>{Math.round(response.demand).toLocaleString('en-US')} / {Math.round(response.capacity).toLocaleString('en-US')} {response.unit}</dd></div></dl></details>
    </div>
  </div>
}
