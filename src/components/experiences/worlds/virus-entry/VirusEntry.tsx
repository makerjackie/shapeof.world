import { useCallback, useEffect, useState } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour, GUIDE_REPLAY_EVENT } from '~/components/experiences/GuideTour'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { advanceProgress, frameAt, PARTS, STAGES, type Part, type Route, type View } from './model'
import { VirusScene } from './VirusScene'
import './styles/VirusEntry.css'

const VIEWS: { id: View; title: string; caption: string }[] = [
  { id: 'journey', title: '跨过边界', caption: '跟随一颗有包膜的颗粒，辨认细胞内外。' },
  { id: 'particle', title: '拆开一颗颗粒', caption: '包膜、表面蛋白、内部组分与遗传物质。' },
  { id: 'membrane', title: '贴近脂质双层', caption: '亲水头部在两边，疏水部分藏在中间。' },
  { id: 'inside', title: '进入细胞之后', caption: '囊泡内部和细胞质，是两个不同的空间。' },
]

export function VirusEntry({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(() => !(typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches))
  const [speed, setSpeed] = useState(1)
  const [route, setRoute] = useState<Route>('endosome')
  const [view, setView] = useState<View>('journey')
  const [section, setSection] = useState(true)
  const [explode, setExplode] = useState(0)
  const [selected, setSelected] = useState<Part>('envelope')
  const [reset, setReset] = useState(0)
  const [panel, setPanel] = useState(false)
  const f = frameAt(progress, route), part = PARTS.find(p => p.id === selected)!
  const interact = useCallback(() => controls.registerInteraction(), [controls.registerInteraction])
  useEffect(() => { if (progress >= 1) setPlaying(false) }, [progress])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { if (media.matches) setPlaying(false) }
    media.addEventListener('change', change); return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!playing) return
    let raf = 0, last = 0, elapsed = 0
    const run = (now: number) => {
      if (last && !document.hidden && !isWorldPaused()) elapsed += Math.min(.06, (now - last) / 1000)
      last = now
      if (elapsed >= .04) { const dt = elapsed; elapsed = 0; setProgress(p => advanceProgress(p, dt, speed)) }
      raf = requestAnimationFrame(run)
    }
    raf = requestAnimationFrame(run); return () => cancelAnimationFrame(raf)
  }, [playing, speed])
  const inspect = useCallback((id: Part) => { setSelected(id); interact() }, [interact])
  const selectView = (next: View) => { setView(next); setReset(r => r + 1); interact() }
  const jump = (index: number) => { setProgress(STAGES[index].at); setPlaying(false); setView('journey'); interact() }
  return <div className="ve-world" data-view={view} data-route={route} data-progress={progress.toFixed(4)} data-playing={playing} data-stage={f.stage}>
    <div className="ve-title"><p>MEMBRANE OBSERVATORY / 01</p><h1>{tx('病毒，怎样跨过细胞膜？')}</h1><span>{tx(VIEWS.find(v => v.id === view)!.caption)}</span></div>
    <div className="ve-scene" aria-label={tx('可旋转和放大的膜与颗粒示意')}><VirusScene progress={progress} route={route} view={view} section={section} explode={explode} selected={selected} reset={reset} onSelect={inspect} onInteraction={interact} /></div>
    <nav className="ve-views" aria-label={tx('探索视图')}>{VIEWS.map((v, i) => <button key={v.id} aria-pressed={view === v.id} onClick={() => selectView(v.id)}><small>0{i + 1}</small>{tx(v.title)}</button>)}</nav>
    <div className="ve-locations"><span>{tx('细胞外侧')}</span><i /><span>{tx('脂质双层')}</span><i /><span>{tx('细胞质')}</span></div>
    <aside className={`ve-panel${panel ? ' ve-panel-open' : ''}`}>
      <button className="ve-panel-toggle" aria-expanded={panel} onClick={() => setPanel(p => !p)}>{tx('观察与记录')}<span>{panel ? '−' : '+'}</span></button>
      <div className="ve-panel-body">
        <div className="ve-kicker">{tx('一个通用的进入示意')}<span>{tx('不是特定病原体')}</span></div>
        <div className="ve-route"><button aria-pressed={route === 'surface'} onClick={() => { setRoute('surface'); setProgress(0); interact() }}>{tx('表面融合')}</button><button aria-pressed={route === 'endosome'} onClick={() => { setRoute('endosome'); setProgress(0); interact() }}>{tx('内吞后融合')}</button></div>
        <article className="ve-story"><p>0{f.stage + 1} / 06</p><h2>{tx(STAGES[f.stage].title)}</h2><p>{tx(STAGES[f.stage].body)}</p></article>
        <div className="ve-space"><span>{tx('当前内容物的位置')}</span><strong>{tx(f.hasReachedCytoplasm ? '到达胞质' : route === 'endosome' && f.uptake > .6 ? '仍在囊泡内' : '仍在细胞外')}</strong><p>{tx('位置标签对应展示阶段，不是感染结果预测。')}</p></div>
        <div className="ve-kicker">{tx('选择一个结构')}<span>{tx('可直接点击模型')}</span></div>
        <nav className="ve-parts" aria-label={tx('选择一个结构')}>{PARTS.map(p => <button key={p.id} aria-pressed={selected === p.id} onClick={() => inspect(p.id)}><i style={{ background: p.color }} />{tx(p.name)}</button>)}</nav>
        <article className="ve-part"><h3>{tx(part.name)}</h3><p>{tx(part.body)}</p></article>
        <label className="ve-check"><input type="checkbox" checked={section} onChange={e => { setSection(e.target.checked); interact() }} />{tx('移开一部分包膜与蛋白外层')}</label>
        {view === 'particle' && <label className="ve-explode"><span>{tx('分层展开')}<output>{Math.round(explode * 100)}%</output></span><input type="range" aria-label={tx('分层展开')} min="0" max="1" step=".01" value={explode} onChange={e => { setExplode(Number(e.target.value)); interact() }} /></label>}
        <details className="ve-limits"><summary>{tx('科学与显示边界')}</summary><p>{tx('这是通用有包膜颗粒的原创机制示意，不对应某个病毒、真实序列或实验解析结构。几何、颜色、数量与拆解间距用于辨认，不是显微图像或分子动力学。')}</p><p>{tx('进度和倍率只控制展示，不表示生物学时间、感染率或治疗效果。不同病毒的进入、脱壳和后续复制路线不同。')}</p><a href="https://www.ncbi.nlm.nih.gov/books/NBK26833/" target="_blank" rel="noreferrer">NCBI Bookshelf · {tx('机制出处')} ↗</a></details>
      </div>
    </aside>
    <div className="ve-timeline"><div className="ve-play"><button onClick={() => { if (progress >= 1) setProgress(0); setPlaying(p => !p); interact() }} aria-label={tx(playing ? '暂停过程' : '继续过程')}>{playing ? 'Ⅱ' : '▷'}<span>{tx(playing ? '暂停' : '继续')}</span></button><label>{tx('展示倍率')}<select value={speed} onChange={e => { setSpeed(Number(e.target.value)); interact() }}>{[.25, 1, 2, 4].map(n => <option key={n} value={n}>{n}×</option>)}</select></label><button onClick={() => { setProgress(0); setPlaying(true); setReset(r => r + 1); interact() }}>{tx('重新看一遍')}</button><button onClick={() => { window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT, { detail: { worldId: 'virus-entry' } })); interact() }}>{tx('带我看')}</button></div>
      <label className="ve-progress"><span>{tx('示意进度')}<output>{Math.round(progress * 100)}%</output></span><input type="range" aria-label={tx('示意进度')} min="0" max="1" step=".001" value={progress} onChange={e => { setProgress(Number(e.target.value)); setPlaying(false); interact() }} /></label>
      <nav className="ve-chapters" aria-label={tx('跳到一个阶段')}>{STAGES.map((s, i) => <button key={s.at} aria-pressed={f.stage === i} onClick={() => jump(i)}><small>0{i + 1}</small>{tx(s.title)}</button>)}</nav>
    </div>
    <p className="ve-hint">{tx('拖动旋转 · 滚轮缩放 · 点击结构 · 拖动进度回看')}<span>{tx('通用科普示意 · 原创三维结构')}</span></p>
    <GuideTour worldId="virus-entry" steps={STAGES.map((s, i) => ({ title: tx(s.title), body: tx(s.body), durationMs: 12000, action: () => { jump(i); setPlaying(false) } }))} placement="stage" kicker={tx('看懂一道膜')} exitLabel={tx('结束导览')} stagePlan={[{ position: 'bottom-left', mobilePosition: 'top-center', tone: 'dark', treatment: 'caption', width: 'narrow' }]} />
  </div>
}
