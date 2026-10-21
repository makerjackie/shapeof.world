import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FilmStrip } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStagePlan, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useI18n } from '~/i18n/index'
import { useExperienceI18n } from '~/i18n/experience'
import { NOTE_INK, type ProfileId } from './art/palette'
import { NUMERAL_FONT, SERIF_CN } from './art/note-art'
import { PROFILES, formatMoney, hopLabel, lifetimeSpend, pick, yearLabel, type Locale } from './money-model'
import { ACTS, STORY_ITEMS, createMoneyScene, type MoneyScene, type SceneLabels, type SceneMode, type SceneStatus } from './scene/engine'
import type { Rect } from './scene/note-view'
import { storyCopy } from './story-copy'
import './styles/FollowTheMoney.css'

const ID = 'follow-the-money'
const SANS = '"Manrope", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif'

const STAGE_PLAN_EN: GuideStagePlan = Array.from({ length: 6 }, (_, i) => ({
  position: 'center-left' as const,
  mobilePosition: 'top-center' as const,
  treatment: 'caption' as const,
  tone: 'light' as const,
  motion: i === 0 ? ('rise' as const) : ('fade' as const),
}))

const STAGE_PLAN: GuideStagePlan = [
  { position: 'center-left', mobilePosition: 'top-center', treatment: 'editorial', tone: 'light', motion: 'rise' },
  { position: 'center-left', mobilePosition: 'top-center', treatment: 'editorial', tone: 'light', motion: 'fade' },
  { position: 'center-left', mobilePosition: 'top-center', treatment: 'editorial', tone: 'light', motion: 'fade' },
  { position: 'center-left', mobilePosition: 'top-center', treatment: 'editorial', tone: 'light', motion: 'fade' },
  { position: 'center-left', mobilePosition: 'top-center', treatment: 'editorial', tone: 'light', motion: 'fade' },
  { position: 'center-left', mobilePosition: 'top-center', treatment: 'editorial', tone: 'light', motion: 'fade' },
]

function useLabels(locale: Locale): SceneLabels {
  const tx = useExperienceI18n()
  return useMemo<SceneLabels>(() => ({
    dest: {
      wages: tx('工资'),
      profit: tx('利润'),
      depreciation: tx('折旧'),
      surplus: tx('企业盈余'),
      tax: tx('税'),
      imports: tx('付给国外'),
    },
    hop: (n: number) => hopLabel(n, locale),
    firstHop: tx('第 1 站 · 你付钱的地方'),
    everyCent: tx('一分不少，全都有了去处'),
    tapToCut: tx('点一下，切下一刀'),
    defense: tx('其中用于国防'),
    hiddenTax: tx('藏在价格里的税'),
    year: (n: number) => yearLabel(n, locale),
    landmarks: {
      tower: tx('哈利法塔'),
      everest: tx('珠穆朗玛峰'),
      karman: tx('太空边界'),
      station: tx('空间站轨道'),
      geo: tx('地球同步轨道'),
      moon: tx('月球'),
    },
    revenue: tx('营收'),
    profit: tx('利润'),
    sans: locale === 'zh' ? `"PingFang SC", "Hiragino Sans GB", ${SANS}` : SANS,
    serif: locale === 'zh' ? SERIF_CN : NUMERAL_FONT,
  }), [tx, locale])
}

function cssPx(element: HTMLElement | null, fallback: number): number {
  if (!element) return fallback
  const value = element.getBoundingClientRect().top
  return Number.isFinite(value) ? value : fallback
}

export function FollowTheMoney({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { locale: siteLocale } = useI18n()
  const locale: Locale = siteLocale === 'zh' ? 'zh' : 'en'
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(ID)
  const [profileId, setProfileId] = useState<ProfileId>(locale === 'zh' ? 'cn' : 'us')
  const pickedProfile = useRef(false)
  const [mode, setMode] = useState<SceneMode>('note')
  const [itemId, setItemId] = useState<string>(STORY_ITEMS[profileId].second)
  const [layering, setLayering] = useState<'dest' | 'category'>('dest')
  const [rulerId, setRulerId] = useState('gdp')
  const [status, setStatus] = useState<SceneStatus | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const plaqueRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<MoneyScene | null>(null)
  const storyRef = useRef(storyMode)
  storyRef.current = storyMode
  const labels = useLabels(locale)
  const profile = PROFILES[profileId]

  useEffect(() => {
    if (!pickedProfile.current) setProfileId(locale === 'zh' ? 'cn' : 'us')
  }, [locale])

  // Scene lifecycle.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scene = createMoneyScene(canvas, { profile: PROFILES[profileId], locale, labels, onStatus: setStatus })
    sceneRef.current = scene
    ;(window as unknown as { __followTheMoney?: MoneyScene }).__followTheMoney = scene
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => scene.setReduced(media.matches)
    motion()
    media.addEventListener('change', motion)
    const resize = new ResizeObserver(() => scene.resize())
    resize.observe(canvas)
    if (pendingAct.current !== null) {
      scene.act(ACTS[pendingAct.current])
      pendingAct.current = null
    }
    return () => {
      media.removeEventListener('change', motion)
      resize.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
    // The scene is created once; later prop changes go through setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setLocale(locale, labels)
  }, [locale, labels])

  useEffect(() => {
    sceneRef.current?.setProfile(profileId)
  }, [profileId])

  // Keep the protagonist inside the free space between copy, plaque and bottom controls.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let raf = 0
    let lastKey = ''
    const measure = () => {
      raf = requestAnimationFrame(measure)
      const scene = sceneRef.current
      if (!scene) return
      const r = root.getBoundingClientRect()
      const immersive = root.closest('[data-overlays-hidden="true"]') !== null
      const safeTop = Math.max(0, cssPx(probeRef.current, r.top + 72) - r.top)
      const narrow = r.width < 720
      let rect: Rect
      if (immersive) {
        rect = { x: 16, y: Math.max(24, safeTop * 0.4), w: r.width - 32, h: r.height - Math.max(24, safeTop * 0.4) - 24 }
      } else if (storyRef.current) {
        const copy = root.querySelector<HTMLElement>('.guide-stage-copy')?.getBoundingClientRect()
        const nav = root.ownerDocument.querySelector<HTMLElement>('.guide-stage-nav')?.getBoundingClientRect()
        const bottom = (nav && nav.height > 0 ? nav.top : r.bottom - 96) - r.top - 12
        if (narrow) {
          const top = copy && copy.height > 0 ? copy.bottom - r.top + 10 : safeTop + 150
          rect = { x: 12, y: top, w: r.width - 24, h: Math.max(160, bottom - top) }
        } else {
          const left = copy && copy.width > 0 && copy.right < r.left + r.width * 0.6 ? copy.right - r.left + 32 : r.width * 0.36
          rect = { x: left, y: safeTop + 8, w: Math.max(240, r.width - left - 40), h: Math.max(200, bottom - safeTop - 8) }
        }
      } else {
        const bar = root.querySelector<HTMLElement>('.experience-freebar')?.getBoundingClientRect()
        const plaque = plaqueRef.current?.getBoundingClientRect()
        const top = Math.max(safeTop + 8, plaque && plaque.height > 0 && narrow ? plaque.bottom - r.top + 8 : safeTop + 8)
        const bottom = (bar && bar.height > 0 ? bar.top : r.bottom - 90) - r.top - 10
        const left = !narrow && plaque && plaque.width > 0 ? Math.min(r.width * 0.26, plaque.right - r.left + 12) : 12
        rect = { x: left, y: top, w: Math.max(220, r.width - left - (narrow ? 12 : 40)), h: Math.max(180, bottom - top) }
      }
      const key = [rect.x, rect.y, rect.w, rect.h].map((v) => Math.round(v / 4)).join(':')
      if (key !== lastKey) {
        scene.setFocus(rect, lastKey === '')
        lastKey = key
      }
    }
    raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [])

  // GuideTour (a child) runs its first action before this component's effects create the scene.
  const pendingAct = useRef<number | null>(null)
  const runAct = useCallback((index: number) => {
    if (sceneRef.current) sceneRef.current.act(ACTS[index])
    else pendingAct.current = index
  }, [])

  const copy = useMemo(() => storyCopy(profile, locale), [profile, locale])
  const steps = useMemo<Array<GuideStep>>(() => copy.map((line, index) => ({
    title: line.title,
    body: line.body,
    action: () => runAct(index),
    replay: () => runAct(index),
    durationMs: [7600, 11500, 6500, 8000, 15500, 9000][index],
  })), [copy, runAct])

  const take = () => controls.registerInteraction()

  const applyMode = useCallback((next: SceneMode, options?: { item?: string; layering?: 'dest' | 'category'; ruler?: string }) => {
    const scene = sceneRef.current
    if (!scene) return
    if (next === 'note') scene.spend(options?.item ?? itemId)
    else if (next === 'life') scene.life(options?.layering ?? layering)
    else scene.ruler(options?.ruler ?? rulerId)
  }, [itemId, layering, rulerId])

  const leaveStory = () => {
    enterFree()
    setMode('note')
    const item = STORY_ITEMS[profileId].second
    setItemId(item)
    const scene = sceneRef.current
    const current = scene?.status()
    if (scene && !(current?.mode === 'note' && current.itemId === item)) scene.spend(item)
  }

  // Returning visitors start in free exploration with a note on the table.
  useEffect(() => {
    if (!storyRef.current) sceneRef.current?.spend(itemId)
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chooseMode = (next: SceneMode) => {
    take()
    setMode(next)
    applyMode(next)
  }

  const chooseItem = (id: string) => {
    take()
    setItemId(id)
    setMode('note')
    applyMode('note', { item: id })
  }

  const chooseProfile = (id: ProfileId) => {
    take()
    pickedProfile.current = true
    setProfileId(id)
  }

  // Keep chip selections valid for the active profile; the scene replays its own last command.
  useEffect(() => {
    const next = PROFILES[profileId]
    setItemId((current) => (current === 'average' || next.items.some((item) => item.id === current) ? current : STORY_ITEMS[profileId].first))
    setRulerId((current) => (current === 'pair' || next.ruler.some((r) => r.id === current) ? current : 'gdp'))
  }, [profileId])

  // Canvas input: tap cuts the note; drag or wheel zooms the ruler.
  const drag = useRef<{ x: number; y: number; moved: number; started: number } | null>(null)
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, moved: 0, started: performance.now() }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d) return
    const dy = event.clientY - d.y
    d.moved += Math.hypot(event.clientX - d.x, dy)
    if (!storyMode && mode === 'ruler' && d.moved > 6) {
      sceneRef.current?.zoom(dy * 0.012)
      take()
    }
    d.x = event.clientX
    d.y = event.clientY
  }
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.moved > 8) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (sceneRef.current?.tap(event.clientX - rect.left, event.clientY - rect.top)) take()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      if (storyRef.current || mode !== 'ruler') return
      event.preventDefault()
      sceneRef.current?.zoom(event.deltaY * 0.004)
      controls.registerInteraction()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [mode, controls])

  const life = lifetimeSpend(profile)
  const currentItem = profile.items.find((item) => item.id === itemId)
  const target = profile.ruler.find((r) => r.id === rulerId)
  const plaqueTitle = mode === 'note'
    ? `${currentItem ? pick(currentItem.label, locale) : tx('平均的一张')} · ${profile.symbol}100`
    : mode === 'life'
      ? `${tx('你的一辈子')} · ${formatMoney(life, profile, locale)}`
      : rulerId === 'pair' ? pick(profile.pair.label, locale) : target ? pick(target.label, locale) : tx('量一量')
  const plaqueLine = mode === 'note'
    ? (status?.finished ? tx('切完了。点钞票再来一张，或换一样东西花。') : tx('点一下钞票，切下一刀。每一刀都是供应链上的一站。'))
    : mode === 'life'
      ? (layering === 'dest' ? tx('同一摞钱，按最后给了谁来分。') : tx('同一摞钱，按花在什么上来分。'))
      : tx('上下拖动或滚动，缩放这把尺子。')

  const modes: Array<[SceneMode, string]> = [['note', tx('花一张')], ['life', tx('一辈子')], ['ruler', tx('量一量')]]

  return (
    <div
      ref={rootRef}
      className={`ftm-world ${storyMode ? 'is-story' : 'is-free'}`}
      data-profile={profileId}
      data-mode={mode}
      style={{ '--ftm-ink': NOTE_INK[profileId].ink, '--ftm-glow': NOTE_INK[profileId].glow } as CSSProperties}
    >
      <span ref={probeRef} className="ftm-safe-probe" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="ftm-canvas"
        role="img"
        aria-label={tx('一张钞票被一刀刀切开，碎片飞向工资、利润、税和进口；一辈子的钱叠成一根柱子，伸向太空。')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null }}
        tabIndex={0}
        onKeyDown={(event) => {
          if (storyMode) return
          if ((event.key === 'Enter' || event.key === ' ') && sceneRef.current?.tapNote()) {
            event.preventDefault()
            take()
          } else if (mode === 'ruler' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault()
            sceneRef.current?.zoom(event.key === 'ArrowUp' ? 0.35 : -0.35)
            take()
          }
        }}
      />

      {!storyMode && (
        <div ref={plaqueRef} className="ftm-plaque" data-experience-overlay="true">
          <span>{tx('跟着钱走')} · {pick(profile.name, locale)}</span>
          <h1>{plaqueTitle}</h1>
          <p>{plaqueLine}</p>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="ftm-freebar"
          ariaLabel={tx('跟着钱走的操作')}
          primaryControlBudget={3}
          secondaryDefault="open"
          secondary={(
            <div className="ftm-tray experience-freebar-rail">
              <div className="ftm-picks" role="group" aria-label={mode === 'note' ? tx('花在什么上') : mode === 'life' ? tx('怎么分这摞钱') : tx('拿什么来比')}>
                {mode === 'note' && profile.items.map((item) => (
                  <button key={item.id} type="button" aria-pressed={itemId === item.id} onClick={() => chooseItem(item.id)}>{pick(item.label, locale)}</button>
                ))}
                {mode === 'note' && (
                  <button type="button" aria-pressed={itemId === 'average'} onClick={() => chooseItem('average')}>{tx('平均的一张')}</button>
                )}
                {mode === 'life' && (
                  <>
                    <button type="button" aria-pressed={layering === 'category'} onClick={() => { take(); setLayering('category'); sceneRef.current?.life('category') }}>{tx('花在了什么上')}</button>
                    <button type="button" aria-pressed={layering === 'dest'} onClick={() => { take(); setLayering('dest'); sceneRef.current?.life('dest') }}>{tx('最后给了谁')}</button>
                  </>
                )}
                {mode === 'ruler' && profile.ruler.map((r) => (
                  <button key={r.id} type="button" aria-pressed={rulerId === r.id} onClick={() => { take(); setRulerId(r.id); sceneRef.current?.ruler(r.id) }}>{pick(r.label, locale)}</button>
                ))}
                {mode === 'ruler' && (
                  <button type="button" aria-pressed={rulerId === 'pair'} onClick={() => { take(); setRulerId('pair'); sceneRef.current?.ruler('pair') }}>{pick(profile.pair.label, locale)}</button>
                )}
              </div>
              <span className="ftm-sep" aria-hidden="true" />
              <div className="ftm-profile" role="group" aria-label={tx('用哪里的数据')}>
                {(['cn', 'us'] as const).map((id) => (
                  <button key={id} type="button" aria-pressed={profileId === id} onClick={() => chooseProfile(id)}>{id === 'cn' ? tx('中国') : tx('美国')}</button>
                ))}
              </div>
              <button type="button" className="experience-freebar-story" aria-label={tx('重播故事')} onClick={() => { take(); enterStory(); replayGuide(ID) }}>
                <FilmStrip />
                <span>{tx('故事')}</span>
              </button>
            </div>
          )}
        >
          <div className="experience-freebar-seg" role="group" aria-label={tx('看哪一部分')}>
            {modes.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => chooseMode(id)}>{label}</button>
            ))}
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId={ID}
        placement="stage"
        steps={steps}
        stagePlan={locale === 'zh' ? STAGE_PLAN : STAGE_PLAN_EN}
        defaultOpen={storyMode}
        showReplayChip={false}
        kicker={tx('跟着钱走')}
        onExit={leaveStory}
      />
      {!storyMode && mode === 'note' && (
        <GhostHint worldId={ID} gesture={{ type: 'tap', target: '.ftm-canvas', label: tx('点一下钞票，切下一刀') }} />
      )}
    </div>
  )
}
