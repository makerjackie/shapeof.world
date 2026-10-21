import './styles/ComplexMapping.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, FilmStrip, Pause, Play } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { createComplexScene, type SceneSettings } from './complex-scene'
import { type ComplexFnId } from './complex-mapping-model'

const INITIAL: SceneSettings = { fn: 'exp', component: 're', amount: 1, mapping: false, wireOnly: false, axes: true, rotating: true }
const FUNCTIONS: { id: ComplexFnId; formula: string }[] = [
  { id: 'exp', formula: 'eᶻ' }, { id: 'sin', formula: 'sin z' }, { id: 'tan', formula: 'tan z' }, { id: 'sq', formula: 'z²' }, { id: 'inv', formula: '1/z' }, { id: 'zeta', formula: 'ζ(z)' },
]

export function ComplexMapping({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('complex-mapping')
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ReturnType<typeof createComplexScene> | null>(null)
  const [settings, setSettings] = useState<SceneSettings>(INITIAL)
  const [failure, setFailure] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => {
    if (!canvas.current) return
    try {
      scene.current = createComplexScene(canvas.current, () => setFailure(true))
      scene.current.set(settingsRef.current)
    } catch (error) {
      console.error('Complex surface initialization failed', error)
      setFailure(true)
    }
    return () => { clearTimers(); scene.current?.dispose(); scene.current = null }
  }, [])
  useEffect(() => { scene.current?.set(settings) }, [settings])
  const change = (patch: Partial<SceneSettings>) => {
    controls.registerInteraction()
    clearTimers()
    setSettings(s => ({ ...s, ...patch }))
  }
  const exit = () => { clearTimers(); enterFree() }
  const reset = () => { change(INITIAL); scene.current?.resetCamera() }
  const guideSteps: GuideStep[] = useMemo(() => [
    {
      title: tx('复指数，也有波峰与波谷'),
      body: tx('沿虚数方向，指数函数不断起伏；沿实数方向，振幅越来越大。这里的高度是函数值的实部。'),
      durationMs: 6500,
      action: () => { clearTimers(); setSettings(INITIAL); scene.current?.resetCamera() },
    },
    {
      title: tx('一条正弦，展开成曲面'),
      body: tx('中间的金线是熟悉的正弦曲线。加入虚数输入，两侧的波峰升高、波谷加深：实部等于 sin x × cosh y。'),
      durationMs: 7500,
      action: () => {
        clearTimers(); setSettings({ ...INITIAL, fn: 'sin', amount: 0 })
        timers.current.push(setTimeout(() => setSettings(s => ({ ...s, amount: 1 })), 1600))
      },
    },
    {
      title: tx('同一个函数，另一张曲面'),
      body: tx('函数值还包含虚部。换一个高度分量，形状就变了；颜色始终表示函数值的方向。'),
      durationMs: 6500,
      action: () => { clearTimers(); setSettings({ ...INITIAL, fn: 'sin', component: 'im' }) },
    },
    {
      title: tx('靠近原点，数值向两侧增大'),
      body: tx('1/z 在原点没有定义。沿实数轴靠近原点，实部分别趋向正、负无穷，超出窗口的部分留空。拖动曲面转一圈，或展开复平面，看看其他函数。'),
      durationMs: 6500,
      action: () => { clearTimers(); setSettings({ ...INITIAL, fn: 'inv' }) },
    },
  ], [tx])
  const names: Record<ComplexFnId, string> = {
    exp: tx('复指数函数'), sin: tx('复正弦函数'), tan: tx('复正切函数'), sq: tx('复平方函数'), inv: tx('复倒数函数'), zeta: tx('黎曼 ζ 函数'),
  }
  const expression = FUNCTIONS.find(f => f.id === settings.fn)!.formula
  const height = settings.component === 'abs' ? '|f(z)|' : `${settings.component === 're' ? 'Re' : 'Im'} f(z)`

  return <div className={`oss-experience cm-experience ${storyMode ? 'is-story' : 'is-free'}`}>
    <canvas ref={canvas} className="cm-canvas" tabIndex={0}
      aria-label={tx('复变函数曲面，可拖动旋转、双指缩放，方向键旋转')}
      onPointerDown={() => { controls.registerInteraction(); if (storyMode) exit() }}
      onWheel={() => { if (!storyMode) controls.registerInteraction() }}
      onKeyDown={event => {
        const direction = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] }[event.key]
        if (!direction) return
        event.preventDefault(); event.stopPropagation(); controls.registerInteraction(); if (storyMode) exit()
        scene.current?.rotate(direction[0], direction[1])
      }}
    />
    {failure && <p className="cm-failure" role="alert">{tx('三维画面暂时无法显示，请刷新页面重试。')}</p>}
    {!storyMode && <>
      <header className="cm-plate" data-experience-overlay="true" data-experience-plaque="true">
        <span>{tx('复变函数')}</span>
        <h1>{names[settings.fn]}</h1>
        <div className="cm-equation">f(z) = <strong>{expression}</strong></div>
      </header>
      <aside className="cm-legend" data-experience-overlay="true" data-freebar-clearance="true">
        <p>{settings.mapping ? <>{settings.amount === 0 ? tx('原像网格') : settings.amount === 1 ? tx('映射后的网格') : tx('网格变换过程')} <b>z → f(z)</b></> : <>{tx('高度')} <b>{height}</b></>}</p>
        {settings.fn === 'zeta' && <p className="cm-zeta-note">{tx('白线：Re z = ½')}<br />Re z ∈ [−4, 4] · Im z ∈ [−18, 18]</p>}
        <div className="cm-phase"><span>{tx('颜色表示辐角')}</span><i aria-hidden="true" /><span>−π · 0 · π</span></div>
      </aside>
      <Freebar className="cm-freebar" ariaLabel={tx('复变函数探索参数')} primaryControlBudget={2} secondaryDefault="closed"
        secondary={<div className="cm-tray">
          <div className="experience-freebar-seg" role="group" aria-label={tx('高度分量')}>
            {(['re', 'im', 'abs'] as const).map(component => <button type="button" key={component} className={settings.component === component ? 'is-active' : ''} aria-pressed={settings.component === component} onClick={() => change({ component, mapping: false })}>{component === 're' ? tx('实部') : component === 'im' ? tx('虚部') : tx('模长')}</button>)}
          </div>
          <button type="button" aria-pressed={settings.wireOnly} onClick={() => change({ wireOnly: !settings.wireOnly })}>{tx('线框')}</button>
          <button type="button" aria-pressed={settings.axes} onClick={() => change({ axes: !settings.axes })}>{tx('坐标轴')}</button>
          <button type="button" aria-pressed={settings.mapping} onClick={() => change({ mapping: !settings.mapping, amount: 1 })}>{settings.mapping ? tx('返回曲面') : tx('平面映射')}</button>
          <button type="button" className="experience-freebar-reset" onClick={reset} aria-label={tx('重置')}><ArrowCounterClockwise /><span>{tx('重置')}</span></button>
          <button type="button" className="experience-freebar-story" aria-label={tx('重播故事')} onClick={() => { controls.registerInteraction(); enterStory(); replayGuide('complex-mapping') }}><FilmStrip /><span>{tx('故事')}</span></button>
        </div>}>
        <div className="experience-freebar-rail cm-fn-rail" role="group" aria-label={tx('选择函数')}>
          {FUNCTIONS.map(fn => <button type="button" key={fn.id} aria-label={names[fn.id]} className={settings.fn === fn.id ? 'is-active' : ''} aria-pressed={settings.fn === fn.id} onClick={() => change({ fn: fn.id })}>{fn.formula}</button>)}
        </div>
        <button type="button" className="experience-freebar-play" aria-label={settings.rotating ? tx('暂停转动') : tx('自动转动')} aria-pressed={settings.rotating} disabled={settings.mapping} onClick={() => change({ rotating: !settings.rotating })}>{settings.rotating ? <Pause weight="fill" /> : <Play weight="fill" />}</button>
        <div className="experience-freebar-field cm-unfold"><label htmlFor="cm-unfold">{settings.mapping ? tx('映射') : tx('展开复平面')}</label><input id="cm-unfold" type="range" min="0" max="100" value={Math.round(settings.amount * 100)} onChange={e => change({ amount: Number(e.target.value) / 100 })} /></div>
      </Freebar>
      <GhostHint worldId="complex-mapping" gesture={{ type: 'drag', target: '.cm-canvas', dx: 90, dy: -30, label: tx('拖动曲面，转到另一侧') }} />
    </>}
    <GuideTour worldId="complex-mapping" steps={guideSteps} placement="stage" defaultOpen={storyMode} showReplayChip={false} onExit={exit}
      stagePlan={guideSteps.map(() => ({ position: 'top-left', mobilePosition: 'top-left', width: 'normal', treatment: 'editorial', tone: 'light', motion: 'rise' }))} />
  </div>
}
