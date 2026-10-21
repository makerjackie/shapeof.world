import './styles/EquationWormhole.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, FilmStrip, Pause, Play, X } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import {
  FORMULA_SUBJECTS,
  MIXED_FORMULAS,
  SCENE_DEFS,
  subjectById,
  type FormulaEntry,
  type FormulaSubject,
} from './equation-wormhole-data'
import { SCENE_DEFAULT_PRESET, type CameraPreset, type SceneId } from './equation-wormhole-model'
import { PORTRAITS } from './equation-wormhole-portraits'
import { EquationSceneManager } from './equation-wormhole-scene'
import { createCanvasMeasurer, paintLayoutToCanvas, typeset } from './equation-wormhole-typeset'

/** 卡片里的公式：与墙上同一个排版器，直接画到 canvas 保证所见即所得 */
function FormulaView({ entry }: { entry: FormulaEntry }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const measure = createCanvasMeasurer()
    const layout = typeset(entry.tex, measure)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pxPerEm = 44
    const w = Math.ceil(layout.width * pxPerEm) + 8
    const h = Math.ceil((layout.height + layout.depth) * pxPerEm) + 12
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    paintLayoutToCanvas(layout, ctx, 4, 6 + layout.height * pxPerEm, pxPerEm, '#ffffff')
  }, [entry])
  return <canvas ref={ref} className="ew-formula-view" aria-label={entry.name} />
}

/** 离屏渲染一条公式为 PNG（飞出动画用） */
function renderFormulaPng(entry: FormulaEntry): { url: string; w: number; h: number } {
  const measure = createCanvasMeasurer()
  const layout = typeset(entry.tex, measure)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pxPerEm = 46
  const w = Math.ceil(layout.width * pxPerEm) + 10
  const h = Math.ceil((layout.height + layout.depth) * pxPerEm) + 14
  const canvas = document.createElement('canvas')
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  paintLayoutToCanvas(layout, ctx, 5, 7 + layout.height * pxPerEm, pxPerEm, '#ffffff')
  return { url: canvas.toDataURL('image/png'), w, h }
}

export function EquationWormhole({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const managerRef = useRef<EquationSceneManager | null>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('equation-wormhole')

  const [subjectId, setSubjectId] = useState<FormulaSubject['id']>('classic')
  const [sceneId, setSceneId] = useState<SceneId>('wormhole')
  const [playing, setPlaying] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [speed, setSpeed] = useState(100)
  const [card, setCard] = useState<FormulaEntry | null>(null)
  const [fly, setFly] = useState<{ url: string; from: { x: number; y: number; w: number } } | null>(null)
  const [flyTo, setFlyTo] = useState<{ x: number; y: number; w: number } | null>(null)
  const formulaSlotRef = useRef<HTMLDivElement>(null)

  const storyRef = useRef(storyMode)
  storyRef.current = storyMode

  // 场景管理器生命周期
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const manager = new EquationSceneManager(canvas)
    manager.setSubject(subjectById('classic'))
    managerRef.current = manager
    ;(window as unknown as { __ewManager?: EquationSceneManager }).__ewManager = manager
    return () => {
      manager.dispose()
      managerRef.current = null
      delete (window as unknown as { __ewManager?: EquationSceneManager }).__ewManager
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      setReducedMotion(media.matches)
      managerRef.current?.setReducedMotion(media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    managerRef.current?.setPlaying(playing)
  }, [playing])

  useEffect(() => {
    managerRef.current?.setSpeed(speed / 100)
  }, [speed])

  useEffect(() => {
    managerRef.current?.setCardOpen(card !== null)
    if (card === null) managerRef.current?.setHot(null)
  }, [card])

  // 公式从墙里飞出：卡片渲染后量到落点，克隆体飞过去，落定后移除
  useEffect(() => {
    if (!fly) return
    if (reducedMotion || card === null) {
      setFly(null)
      setFlyTo(null)
      return
    }
    const slot = formulaSlotRef.current
    if (!slot) return
    const rect = slot.getBoundingClientRect()
    const canvasRect = document.querySelector('.ew-canvas')?.getBoundingClientRect()
    const ox = canvasRect?.left ?? 0
    const oy = canvasRect?.top ?? 0
    const target = { x: rect.left - ox + rect.width / 2, y: rect.top - oy + rect.height / 2, w: rect.width * 0.82 }
    const raf = requestAnimationFrame(() => setFlyTo(target))
    const timer = window.setTimeout(() => {
      setFly(null)
      setFlyTo(null)
    }, 560)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [fly, reducedMotion, card])

  const applyView = (scene: SceneId, subject: FormulaSubject['id'], preset?: CameraPreset, instant = false) => {
    const manager = managerRef.current
    if (!manager) return
    manager.setSubject(subjectById(subject))
    manager.setScene(scene, instant)
    if (preset) manager.setPreset(preset)
    setSubjectId(subject)
    setSceneId(scene)
  }

  const changeScene = (scene: SceneId) => {
    controls.registerInteraction()
    setCard(null)
    applyView(scene, subjectId, SCENE_DEFAULT_PRESET[scene])
  }

  const changeSubject = (subject: FormulaSubject['id']) => {
    controls.registerInteraction()
    setCard(null)
    applyView(sceneId, subject, SCENE_DEFAULT_PRESET[sceneId])
  }

  const exitToFree = () => enterFree()

  const reset = () => {
    controls.registerInteraction()
    setCard(null)
    setFly(null)
    setFlyTo(null)
    setPlaying(true)
    setSpeed(100)
    applyView('wormhole', 'classic', SCENE_DEFAULT_PRESET.wormhole, true)
    managerRef.current?.reset()
  }

  // 画布手势：悬停减速、点按开卡、拖拽转视角、滚轮俯冲/缩放
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let downAt: { x: number; y: number } | null = null
    let moved = false
    let hoverRaf = 0

    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDistance = 0
    const localPoint = (e: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onMove = (e: PointerEvent) => {
      const manager = managerRef.current
      if (!manager) return
      const { x, y } = localPoint(e)
      const previous = pointers.get(e.pointerId)
      if (previous) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDistance > 0) manager.addWheel((pinchDistance - distance) * 2)
        pinchDistance = distance
        moved = true
        controls.registerInteraction()
        return
      }
      if (downAt && previous) {
        const dx = e.clientX - previous.x
        const dy = e.clientY - previous.y
        if (Math.abs(dx) + Math.abs(dy) > 0) {
          moved = true
          controls.registerInteraction()
          manager.addDrag((dx / canvas.clientWidth) * 2.4, (dy / canvas.clientHeight) * 2.4)
        }
        return
      }
      if (storyRef.current || e.pointerType === 'touch') return
      if (hoverRaf) return
      hoverRaf = requestAnimationFrame(() => {
        hoverRaf = 0
        const mgr = managerRef.current
        if (!mgr) return
        const pick = mgr.pickAt(x, y)
        canvas.style.cursor = pick ? 'pointer' : 'grab'
      })
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size > 1) {
        const [a, b] = [...pointers.values()]
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
        moved = true
        canvas.setPointerCapture(e.pointerId)
        return
      }
      downAt = { x: e.clientX, y: e.clientY }
      moved = false
      canvas.setPointerCapture(e.pointerId)
    }

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      pinchDistance = 0
      if (pointers.size > 0) return
      if (!downAt) return
      const manager = managerRef.current
      downAt = null
      if (!manager) return
      if (moved) return
      if (storyRef.current) return
      const { x, y } = localPoint(e)
      const pick = manager.pickAt(x, y)
      if (pick) {
        controls.registerInteraction()
        const entry = MIXED_FORMULAS[pick.formula]
        if (entry) {
          manager.setHot(pick.instance)
          const pos = manager.screenPosOf(pick.instance)
          if (pos && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const png = renderFormulaPng(entry)
            setFly({ url: png.url, from: pos })
            setFlyTo(null)
          }
          setCard(entry)
        }
      } else {
        manager.setHot(null)
        setCard(null)
      }
    }

    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size > 0) return
      pinchDistance = 0
      downAt = null
      moved = false
      if (hoverRaf) cancelAnimationFrame(hoverRaf)
      hoverRaf = 0
      canvas.style.cursor = 'grab'
    }

    const onLeave = () => {
      const manager = managerRef.current
      if (!manager) return
      canvas.style.cursor = 'grab'
    }

    const onWheel = (e: WheelEvent) => {
      const manager = managerRef.current
      if (!manager || storyRef.current) return
      e.preventDefault()
      controls.registerInteraction()
      manager.addWheel(e.deltaY)
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    canvas.addEventListener('lostpointercapture', onCancel)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      if (hoverRaf) cancelAnimationFrame(hoverRaf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('lostpointercapture', onCancel)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const guideSteps: Array<GuideStep> = useMemo(
    () => [
      {
        title: tx('公式沿着隧道延伸'),
        body: tx('公式近大远小。拖动视角，看见弯曲的隧道壁。'),
        action: () => applyView('wormhole', 'classic', SCENE_DEFAULT_PRESET.wormhole),
        durationMs: 6500,
      },
      {
        title: tx('公式拼成爱因斯坦的肖像'),
        body: tx('不同学科的公式混排成五官。切换人物，放大看清每条公式。'),
        action: () => applyView('portrait', 'relativity', SCENE_DEFAULT_PRESET.portrait),
        durationMs: 7000,
      },
      {
        title: tx('光线绕过黑洞'),
        body: tx('拖动绕行，看背面的光弯到上方；滚轮或双指向前推进，穿入流动的公式盘。'),
        action: () => applyView('blackhole', 'relativity', SCENE_DEFAULT_PRESET.blackhole),
        durationMs: 7000,
      },
      {
        title: tx('这条环带只有一个面'),
        body: tx('环带扭转半圈再接合。拖动莫比乌斯环，看内外如何相连。'),
        action: () => applyView('mobius', 'math', SCENE_DEFAULT_PRESET.mobius),
        durationMs: 7000,
      },
      {
        title: tx('停住一条公式，读它的来历'),
        body: tx('点公式读来历。底部换场景、暂停或调速，拖动改变视角。'),
        action: () => applyView('rush', 'math', SCENE_DEFAULT_PRESET.rush),
        durationMs: 5600,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx],
  )

  return (
    <div className={`oss-experience ew-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas ref={canvasRef} className="ew-canvas" />
      <div className="ew-vignette" aria-hidden="true" />

      {!storyMode && (
        <header className="ew-plaque" data-experience-overlay="true" data-experience-plaque="true">
          <h1>{sceneId === 'portrait' ? tx(PORTRAITS[subjectId]?.name ?? '') : tx(SCENE_DEFS.find((s) => s.id === sceneId)?.label ?? '公式虫洞')}</h1>
          <p>{sceneId === 'portrait' ? tx('由不同学科的公式混合组成') : tx('拖动转视角，点一条公式停住它')}</p>
        </header>
      )}

      {fly && !reducedMotion && (
        <img
          className={`ew-fly${flyTo ? ' is-flying' : ''}`}
          src={fly.url}
          alt=""
          aria-hidden="true"
          style={flyTo
            ? { left: flyTo.x - flyTo.w / 2, top: flyTo.y - 26, width: flyTo.w, opacity: 0 }
            : { left: fly.from.x - fly.from.w / 2, top: fly.from.y - 14, width: fly.from.w, opacity: 1 }}
        />
      )}
      {card && (
        <div className="ew-card-wrap" data-experience-overlay="true" onClick={() => setCard(null)}>
          <div
            className="ew-card"
            role="dialog"
            aria-label={tx('公式详情')}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="ew-card-close" onClick={() => setCard(null)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <div className="ew-card-formula" ref={formulaSlotRef}>
              <FormulaView entry={card} />
            </div>
            <h2 className="ew-card-name">{tx(card.name)}</h2>
            <p className="ew-card-by">{tx(card.by)} · {tx(card.year)}</p>
            <p className="ew-card-what">{tx(card.what)}</p>
          </div>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="ew-freebar"
          mainClassName="ew-freebar-main"
          ariaLabel={tx('场景与人物')}
          primaryControlBudget={3}
          secondary={(
            <div className="ew-tray">
              <div className="ew-chip-rail experience-freebar-chips" role="group" aria-label={tx('人物')}>
                {sceneId === 'portrait' && FORMULA_SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`ew-chip${s.id === subjectId ? ' is-active' : ''}`}
                    aria-pressed={s.id === subjectId}
                    onClick={() => changeSubject(s.id)}
                  >
                    {tx(({ classic: '牛顿', em: '麦克斯韦', relativity: '爱因斯坦', quantum: '玻尔', math: '欧拉' })[s.id])}
                  </button>
                ))}
                <button
                  type="button"
                  className="experience-freebar-reset"
                  aria-label={tx('重置')}
                  onClick={reset}
                >
                  <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                  <span>{tx('重置')}</span>
                </button>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    setCard(null)
                    setPlaying(true)
                    enterStory()
                    replayGuide('equation-wormhole')
                  }}
                  aria-label={tx('重播高光')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('高光')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <div className="ew-scenes experience-freebar-rail" role="group" aria-label={tx('场景')}>
            {SCENE_DEFS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`ew-scene-button${s.id === sceneId ? ' is-active' : ''}`}
                data-scene={s.id}
                aria-pressed={s.id === sceneId}
                onClick={() => changeScene(s.id)}
              >
                {tx(s.label)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={playing ? 'true' : 'false'}
            onClick={() => {
              controls.registerInteraction()
              setPlaying((p) => !p)
            }}
            aria-label={tx(playing ? '暂停' : '播放')}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
          <label className="ew-speed-field experience-freebar-field">
            <span>{tx('速度')}</span>
            <input
              type="range"
              min={20}
              max={250}
              step={5}
              value={speed}
              onChange={(e) => {
                controls.registerInteraction()
                setSpeed(Number(e.target.value))
              }}
              aria-label={tx('速度')}
            />
            <b>{speed}%</b>
          </label>
        </Freebar>
      )}

      <GuideTour
        worldId="equation-wormhole"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        kicker={tx('高光')}
        exitLabel={tx('退出高光')}
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', width: 'normal', treatment: 'editorial', tone: 'light', cue: 'none' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', width: 'normal', treatment: 'editorial', tone: 'light', cue: 'none' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', width: 'normal', treatment: 'editorial', tone: 'light', cue: 'none' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', width: 'normal', treatment: 'editorial', tone: 'light', cue: 'none' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', width: 'normal', treatment: 'editorial', tone: 'light', cue: 'none' },
        ]}
        showReplayChip={false}
        onExit={exitToFree}
      />
    </div>
  )
}
