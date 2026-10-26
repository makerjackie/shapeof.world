import './styles/ChipZoom.css'
import { useCallback, useEffect, useState } from 'react'
import { ArrowCounterClockwise, ArrowDown, ArrowRight, Pause, Play } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour } from '~/components/experiences/GuideTour'
import { useExperienceI18n } from '~/i18n/experience'
import { ChipScene } from './scene'
import { PALETTES, PEEL_LAYERS, transistorState, type Layout, type Palette, type View } from './model'
import layoutUrl from './data/alu-layout.json.gz?url'
import { decodeLayout } from './load-layout'

const query = (name: string) => typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name)

export function ChipZoom({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [layout, setLayout] = useState<Layout | null>(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<View>(() => query('view') === 'transistor' ? 'transistor' : query('view') === 'cell' ? 'cell' : 'layers')
  const [palette, setPalette] = useState<Palette>(() => query('style') === 'micrograph' ? 'micrograph' : 'slice')
  const [peeled, setPeeled] = useState(() => query('view') === 'cell' ? 5 : 0)
  const [spacing, setSpacing] = useState(.95)
  const [gate, setGate] = useState(0)
  const [drain, setDrain] = useState(1.8)
  const [playing, setPlaying] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [speed, setSpeed] = useState(1)
  const [touched, setTouched] = useState(false)
  const [revision, setRevision] = useState(0)
  const [guide, setGuide] = useState(false)
  const [details, setDetails] = useState(false)
  const [journey, setJourney] = useState(false)
  useEffect(() => {
    const abort = new AbortController()
    setFailed(false)
    fetch(layoutUrl, { signal: abort.signal }).then(response => {
      if (!response.ok) throw new Error(`Layout HTTP ${response.status}`)
      return response.arrayBuffer()
    }).then(buffer => {
      const parsed = decodeLayout(buffer)
      if (!abort.signal.aborted) setLayout(parsed)
    }).catch(() => { if (!abort.signal.aborted) setFailed(true) })
    return () => abort.abort()
  }, [retry])
  const interact = useCallback(() => { setTouched(true); controls.registerInteraction() }, [controls])
  const onReady = useCallback(() => setReady(true), [])
  const chooseView = (next: View) => {
    interact(); setView(next); setRevision(v => v + 1)
    if (next === 'cell') setPeeled(5)
  }
  const peel = () => { interact(); setPeeled(value => Math.min(5, value + 1)) }
  const reset = () => { interact(); setPeeled(0); setView('layers'); setRevision(v => v + 1); setGate(0); setDrain(1.8) }
  const state = transistorState(gate, drain)
  const colors = PALETTES[palette]
  const layerNames = [tx('第四层金属'), tx('第三层金属'), tx('第二层金属'), tx('第一层金属'), tx('局部互连')]
  const guideSteps = [
    { title: tx('线在上，开关在下'), body: tx('这是一块真实的开放芯片版图。用“剥开最上层”向下看，细柱把相邻层连接起来。'), action: () => { setView('layers'); setPeeled(0) } },
    { title: tx('一直走到硅的表面'), body: tx('四层金属和局部互连下面，粉色的栅跨过绿色的有源区。这些交叉处才是晶体管。'), action: () => { setView('cell'); setPeeled(5) } },
    { title: tx('用电场打开一条路'), body: tx('现在切换到平面 NMOS 示意。提高栅源电压会形成沟道；漏源之间还要有电压差，才有持续电流。'), action: () => { setView('transistor'); setGate(1.4); setDrain(1.8) } },
  ]

  return <div className="cz-world" data-style={palette} data-view={view} data-peeled={peeled} data-ready={ready} data-flowing={state.flowing} data-capture={query('capture') === '1'}>
    <div className="cz-scene" aria-label={tx('可旋转和缩放的三维芯片')}>
      {layout && <ChipScene layout={layout} view={view} peeled={peeled} spacing={spacing} palette={palette} gate={gate} drain={drain} playing={playing} speed={speed} touched={touched} revision={revision} onInteract={interact} onReady={onReady} />}
      {!ready && <div className="cz-loading" role="status">{failed ? <>{tx('版图加载失败')}<button onClick={() => setRetry(v => v + 1)}>{tx('重新加载')}</button></> : tx('正在展开真实版图')}</div>}
    </div>

    <div className="cz-heading">
      <p>{view === 'transistor' ? tx('平面 NMOS · 原理示意') : tx('Tiny Tapeout 02 · 真实版图')}</p>
      <h1>{view === 'transistor' ? tx('电压，让硅成为开关。') : view === 'cell' ? tx('看清一个逻辑单元。') : tx('芯片里，藏着一座城。')}</h1>
      <span>{view === 'transistor' ? tx('栅极不接通电线，它用电场改变下面的硅。') : view === 'cell' ? tx('粉色的栅跨过绿色有源区，交叉处形成晶体管。') : tx('剥开层层连线，找到硅表面的晶体管。')}</span>
    </div>

    <nav className="cz-views" aria-label={tx('探索尺度')}>
      <button aria-pressed={view === 'layers'} onClick={() => chooseView('layers')}><span>150 μm</span>{tx('连线层')}</button>
      <button aria-pressed={view === 'cell'} onClick={() => chooseView('cell')}><span>1.76 μm</span>{tx('标准单元')}</button>
      <button aria-pressed={view === 'transistor'} onClick={() => chooseView('transistor')}><span>{tx('原理示意')}</span>{tx('晶体管')}</button>
    </nav>

    <aside className="cz-panel" aria-label={view === 'transistor' ? tx('晶体管控制') : tx('剥开芯片')}>
      {view !== 'transistor' ? <>
        <div className="cz-panel-title"><h2>{peeled === 5 ? tx('已到晶体管层') : tx('下面，还有什么？')}</h2><output>{peeled} / 5</output></div>
        <div className="cz-layer-list">
          {PEEL_LAYERS.map((mask, index) => <button key={mask} className="cz-layer" data-removed={index < peeled} aria-label={`${tx('查看')} ${mask.toUpperCase()}`} onClick={() => { interact(); setPeeled(index) }}>
            <i style={{ background: colors[mask] }} /><b>{mask.toUpperCase()}</b><span>{layerNames[index]}</span><small>{index < peeled ? tx('已移开') : index === peeled ? tx('最上层') : ''}</small>
          </button>)}
          <div className="cz-silicon" data-active={peeled === 5}><i />{tx('硅表面 · 晶体管')}</div>
        </div>
        <div className="cz-action-area">
          {peeled < 5 ? <button className="cz-primary" onClick={peel} disabled={!ready}><ArrowDown size={18} />{tx('剥开最上层')}<b>{PEEL_LAYERS[peeled].toUpperCase()}</b></button>
            : <button className="cz-primary" onClick={() => chooseView(view === 'cell' ? 'transistor' : 'cell')}>{view === 'cell' ? tx('让一个晶体管导通') : tx('放大一个真实单元')}<ArrowRight size={18} /></button>}
          <p aria-live="polite" className="cz-feedback">{peeled === 0 ? tx('这块电路用了四层金属，下面还有一层局部互连。') : peeled < 5 ? `${tx('已移开')} ${PEEL_LAYERS[peeled - 1].toUpperCase()}${tx('，继续向下看。')}` : tx('露出来的是有源区与栅，不是另一层金属线。')}</p>
        </div>
        <div className="cz-secondary-controls"><label className="cz-spacing">{tx('拉开层间距')}<input type="range" min="0.2" max="1.5" step="0.05" value={spacing} aria-label={tx('拉开层间距')} onChange={event => { interact(); setSpacing(Number(event.target.value)) }} /></label>
        <button className="cz-text-button" onClick={reset}><ArrowCounterClockwise size={15} />{tx('放回所有层')}</button></div>
      </> : <>
        <div className="cz-panel-title"><h2>{state.flowing ? tx('电流通过了') : state.channel ? tx('有沟道，还没有电流') : tx('现在，开关关着')}</h2><span className="cz-state" data-on={state.flowing}>{state.flowing ? tx('通') : tx('断')}</span></div>
        <label className="cz-voltage"><span>{tx('栅源电压')}<output>{gate.toFixed(2)} <small>V</small></output></span><input type="range" min="0" max="1.8" step="0.05" value={gate} aria-label={tx('栅源电压')} onChange={event => { interact(); setGate(Number(event.target.value)) }} /><div className="cz-threshold"><span>0 V</span><span>{tx('阈值示意')} 0.65 V</span><span>1.8 V</span></div></label>
        <button className="cz-primary" onClick={() => { interact(); setGate(gate > .65 ? 0 : 1.4) }}>{gate > .65 ? tx('撤去栅极电压') : tx('给栅极加电压')}<b>{gate > .65 ? '0 V' : '1.4 V'}</b></button>
        <div className="cz-current"><span>{tx('相对电流')}</span><output>{Math.round(state.relativeCurrent * 100)}%</output><i><em style={{ width: `${state.relativeCurrent * 100}%` }} /></i></div>
        <p className="cz-cause" aria-live="polite">{state.flowing ? tx('栅源电压超过阈值，硅表面形成沟道。漏源电压推动电子从源极流向漏极。') : state.channel ? tx('沟道已经形成；漏源电压为零，没有持续的净电流。') : tx('提高栅源电压，让栅极下方形成一条可导电的沟道。')}</p>
        <button className="cz-bias" aria-pressed={drain > 0} onClick={() => { interact(); setDrain(drain > 0 ? 0 : 1.8) }}>{drain > 0 ? tx('断开漏源电压') : tx('接上漏源电压')}<span>{drain.toFixed(1)} V</span></button>
      </>}
    </aside>

    <div className="cz-caption">
      <strong>{view === 'layers' ? '150 × 170 μm' : view === 'cell' ? '1.76 × 3.20 μm' : tx('平面 NMOS 剖面')}</strong>
      <span>{view === 'transistor' ? tx('结构、阈值与运动速度为教学示意') : tx('平面来自 GDS · 厚度与层距夸张 · 假色')}</span>
      {view === 'cell' && <small>sky130_fd_sc_hd__inv_2 · {tx('尺寸含掩膜外延')}</small>}
    </div>
    <div className="cz-gesture">{tx('拖动旋转 · 滚轮或双指缩放')}</div>

    <div className="cz-toolbar">
      <button aria-label={playing ? tx('暂停动画') : tx('播放动画')} onClick={() => { controls.registerInteraction(); if (!playing) setTouched(false); setPlaying(!playing) }}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
      {view === 'transistor' && <button aria-label={tx('动画速度')} onClick={() => { interact(); setSpeed(speed === 1 ? .3 : 1) }}>{speed}×</button>}
      <button onClick={() => { interact(); setRevision(v => v + 1) }}>{tx('复位镜头')}</button>
      <button onClick={() => { interact(); setPalette(palette === 'slice' ? 'micrograph' : 'slice') }}>{palette === 'slice' ? tx('暗场配色') : tx('明场配色')}</button>
      <button onClick={() => { controls.registerInteraction(); setGuide(!guide) }}>{tx('三站导览')}</button>
      <button onClick={() => setDetails(!details)} aria-expanded={details}>{tx('真实与示意')}</button>
      <button onClick={() => setJourney(!journey)} aria-expanded={journey}>{tx('完整旅程')}</button>
    </div>
    {details && <div className="cz-note"><button className="cz-close" aria-label={tx('关闭')} onClick={() => setDetails(false)}>×</button><h2>{tx('哪些是真的？')}</h2><p>{tx('连线层与标准单元来自 Ryan Cornateanu 的 Tiny Tapeout 02 ALU，使用 SKY130 工艺。这里只展示这一块电路宏，不是整颗手机芯片。')}</p><p>{tx('只显示真实存在的 M1–M4 和局部互连；绝缘介质、注入与验证层省略。颜色用于分层，垂直尺寸不是制造尺寸。')}</p><p>{tx('晶体管是另建的平面 NMOS 教学模型。0.65 V 阈值是演示参数，相对电流不是器件实测值。白点表示电子，运动速度大幅放慢。')}</p><a href="https://github.com/TinyTapeout/tinytapeout-02/tree/90098b825ac7e1bf1a97555da7a55bf656491ef3" target="_blank" rel="noreferrer">{tx('查看开放版图与许可')} ↗</a></div>}
    {journey && <div className="cz-note"><button className="cz-close" aria-label={tx('关闭')} onClick={() => setJourney(false)}>×</button><h2>{tx('从手里，到硅里')}</h2><p>{tx('手机 → 封装 → 裸片 → CPU / GPU / 缓存 / NPU → 标准单元 → 晶体管 → 原子')}</p><p>{tx('本轮可探索：真实连线层、标准单元、晶体管开关。其余尺度、逻辑门与加法器尚未开放。')}</p></div>}
    <GuideTour worldId="chip-zoom" steps={guideSteps} defaultOpen={guide} placement="stage" stagePlan={[{ position: 'bottom-left', mobilePosition: 'top-left', treatment: 'caption', tone: palette === 'slice' ? 'light' : 'dark', width: 'narrow', motion: 'fade' }]} onExit={() => setGuide(false)} exitLabel={tx('自由探索')} />
  </div>
}
