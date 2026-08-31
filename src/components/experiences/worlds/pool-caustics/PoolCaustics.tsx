import './styles/PoolCaustics.css'
import { FilmStrip } from '@phosphor-icons/react'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
type CausticBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6

type Ripple = {
  x: number
  y: number
  startedAt: number
  strength: number
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function PoolLightField({
  beat,
  waveHeight,
  depth,
  controls,
  reducedMotion,
  onUserTouch,
}: {
  beat: CausticBeat
  waveHeight: number
  depth: number
  controls: ExperienceControls
  reducedMotion: boolean
  onUserTouch: () => void
}) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const beatRef = useRef(beat)
  const waveRef = useRef(waveHeight)
  const depthRef = useRef(depth)
  const rippleRef = useRef<Ripple | null>(null)
  const dragBoostRef = useRef(0)
  const lastDragAtRef = useRef(0)

  beatRef.current = beat
  waveRef.current = waveHeight
  depthRef.current = depth

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const compact = window.innerWidth < 720
    const gridWidth = compact ? 142 : 210
    const gridHeight = compact ? 108 : 136
    const light = new Float32Array(gridWidth * gridHeight)
    const mapCanvas = document.createElement('canvas')
    mapCanvas.width = gridWidth
    mapCanvas.height = gridHeight
    const mapContext = mapCanvas.getContext('2d')
    if (!mapContext) return
    const image = mapContext.createImageData(gridWidth, gridHeight)
    let width = 1
    let height = 1
    let dpr = 1
    let frame = 0
    let lastBeat = beatRef.current

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 1.7)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const surfaceSlope = (u: number, v: number, time: number) => {
      const dragBoost = dragBoostRef.current
      const amplitude = waveRef.current * (1 + dragBoost * 0.55)
      const p1 = u * 13.6 + v * 4.2 + time * 0.72
      const p2 = -u * 5.1 + v * 16.4 - time * 0.54
      const p3 = u * 21.3 - v * 9.7 + time * 0.31
      // Extra fine ripple for wetter micro-refraction
      const p4 = u * 33.8 + v * 27.1 + time * 1.05
      let dx = amplitude * (
        Math.cos(p1) * 13.6 * 0.54
        - Math.cos(p2) * 5.1 * 0.31
        + Math.cos(p3) * 21.3 * 0.15
        + Math.cos(p4) * 33.8 * 0.045
      )
      let dy = amplitude * (
        Math.cos(p1) * 4.2 * 0.54
        + Math.cos(p2) * 16.4 * 0.31
        - Math.cos(p3) * 9.7 * 0.15
        + Math.cos(p4) * 27.1 * 0.045
      )
      const ripple = rippleRef.current
      if (ripple) {
        const age = time - ripple.startedAt / 1_000
        if (age >= 0 && age < 4.2) {
          const rx = u - ripple.x
          const ry = v - ripple.y
          const radius = Math.hypot(rx, ry) || 0.001
          const strength = ripple.strength ?? 1
          const envelope = Math.exp(-radius * 2.35) * Math.exp(-age * 0.42) * strength
          const phase = radius * 48 - age * 11.2
          // dual-frequency ring: bright crest + secondary lag for wet bounce
          const radialSlope = amplitude * 5.4 * envelope * (
            Math.cos(phase) + 0.35 * Math.cos(phase * 1.7 + 0.4)
          )
          dx += radialSlope * rx / radius
          dy += radialSlope * ry / radius
        }
      }
      return { dx, dy }
    }

    const deposit = (x: number, y: number, amount: number) => {
      const px = x * (gridWidth - 1)
      const py = y * (gridHeight - 1)
      const ix = Math.floor(px)
      const iy = Math.floor(py)
      if (ix < 0 || iy < 0 || ix >= gridWidth - 1 || iy >= gridHeight - 1) return
      const fx = px - ix
      const fy = py - iy
      const index = iy * gridWidth + ix
      light[index] += amount * (1 - fx) * (1 - fy)
      light[index + 1] += amount * fx * (1 - fy)
      light[index + gridWidth] += amount * (1 - fx) * fy
      light[index + gridWidth + 1] += amount * fx * fy
    }

    const paintCaustics = (time: number) => {
      light.fill(0)
      const guidedWave = beatRef.current === 1 ? Math.max(waveRef.current, 0.034) : beatRef.current >= 2 && beatRef.current <= 4 ? 0.027 : waveRef.current
      const savedWave = waveRef.current
      waveRef.current = guidedWave
      const bend = (1 - 1 / 1.333) * (0.32 + depthRef.current * 0.7)
      for (let y = 0; y < gridHeight; y += 1) {
        const v = y / (gridHeight - 1)
        for (let x = 0; x < gridWidth; x += 1) {
          const u = x / (gridWidth - 1)
          const slope = surfaceSlope(u, v, time)
          deposit(u - slope.dx * bend, v - slope.dy * bend, 0.92)
        }
      }
      waveRef.current = savedWave

      let peak = 1
      for (const value of light) peak = Math.max(peak, value)
      const dragBoost = dragBoostRef.current
      for (let index = 0; index < light.length; index += 1) {
        // Higher contrast + sharper bright ridges for a wetter look
        const normalized = clamp01(Math.log1p(light[index] * (2.55 + dragBoost * 0.4)) / Math.log1p(peak * 1.28))
        const glow = Math.pow(normalized, 1.28)
        const hot = Math.pow(normalized, 3.1)
        const spark = Math.pow(normalized, 5.2)
        const offset = index * 4
        image.data[offset] = Math.round(3 + glow * 185 + hot * 62 + spark * 28)
        image.data[offset + 1] = Math.round(42 + glow * 200 + hot * 48 + spark * 18)
        image.data[offset + 2] = Math.round(72 + glow * 145 + hot * 38 + spark * 12)
        image.data[offset + 3] = Math.round(125 + glow * 130)
      }
      mapContext.putImageData(image, 0, 0)
    }

    const drawRayStudy = (time: number, focus: boolean) => {
      const mobile = width < 720
      const left = mobile ? width * 0.08 : width * 0.53
      const right = mobile ? width * 0.92 : width * 0.93
      const top = mobile ? height * 0.19 : height * 0.17
      const surfaceY = mobile ? height * 0.32 : height * 0.31
      const floorY = mobile ? height * 0.58 : height * 0.66
      const count = focus ? 15 : 10
      context.save()
      context.fillStyle = 'rgba(1, 12, 18, .48)'
      context.fillRect(left - 18, top - 16, right - left + 36, floorY - top + 32)
      context.strokeStyle = 'rgba(119, 229, 239, .48)'
      context.lineWidth = 1.4
      context.beginPath()
      for (let step = 0; step <= 120; step += 1) {
        const ratio = step / 120
        const x = left + ratio * (right - left)
        const y = surfaceY + Math.sin(ratio * 12.8 + time * 0.72) * 8 + Math.sin(ratio * 27 - time * 0.35) * 3
        if (step === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()
      context.strokeStyle = 'rgba(255, 247, 194, .72)'
      context.shadowColor = '#fff4a8'
      context.shadowBlur = 12
      for (let index = 0; index < count; index += 1) {
        const ratio = (index + 0.5) / count
        const x = left + ratio * (right - left)
        const y = surfaceY + Math.sin(ratio * 12.8 + time * 0.72) * 8 + Math.sin(ratio * 27 - time * 0.35) * 3
        const slope = Math.cos(ratio * 12.8 + time * 0.72) * 0.68 + Math.cos(ratio * 27 - time * 0.35) * 0.22
        const targetX = focus
          ? left + (right - left) * (0.52 + (ratio - 0.5) * 0.16)
          : x - slope * (right - left) * 0.09
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x, y)
        context.lineTo(targetX, floorY)
        context.stroke()
      }
      context.shadowBlur = 0
      context.strokeStyle = 'rgba(125, 218, 231, .34)'
      context.beginPath()
      context.moveTo(left, floorY)
      context.lineTo(right, floorY)
      context.stroke()
      context.restore()
    }

    const render = (now: number) => {
      const time = reducedMotion ? 1.6 : now / 1_000
      if (lastBeat !== beatRef.current) lastBeat = beatRef.current

      // decay drag boost smoothly so light play eases out after finger leaves
      const sinceDrag = now - lastDragAtRef.current
      if (sinceDrag > 40) {
        dragBoostRef.current *= 0.965
        if (dragBoostRef.current < 0.01) dragBoostRef.current = 0
      }

      paintCaustics(time)
      const dragBoost = dragBoostRef.current
      const ripple = rippleRef.current

      const pool = context.createLinearGradient(0, 0, 0, height)
      pool.addColorStop(0, '#011018')
      pool.addColorStop(0.22, '#032a40')
      pool.addColorStop(0.55, '#04354d')
      pool.addColorStop(1, '#021018')
      context.fillStyle = pool
      context.fillRect(0, 0, width, height)

      // soft sun disc through water — brightens slightly while dragging
      const sun = context.createRadialGradient(width * 0.62, height * 0.18, 0, width * 0.62, height * 0.18, width * 0.42)
      sun.addColorStop(0, `rgba(255, 236, 160, ${0.14 + dragBoost * 0.08})`)
      sun.addColorStop(0.4, `rgba(120, 200, 210, ${0.05 + dragBoost * 0.04})`)
      sun.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = sun
      context.fillRect(0, 0, width, height)

      // caustic layers: soft bloom + sharper wet mesh + hot sparkle
      context.save()
      context.globalCompositeOperation = 'screen'
      context.globalAlpha = 0.9 + dragBoost * 0.06
      context.filter = `blur(${width < 720 ? 2.2 : 3.4}px) saturate(${1.32 + dragBoost * 0.18})`
      context.drawImage(mapCanvas, -width * 0.08, height * 0.08, width * 1.16, height * 1.04)
      context.globalAlpha = 0.68
      context.filter = 'none'
      context.drawImage(mapCanvas, -width * 0.05, height * 0.12, width * 1.1, height * 0.98)
      // fine bright shimmer pass — wet refraction ridges
      context.globalAlpha = 0.32 + dragBoost * 0.12
      context.globalCompositeOperation = 'lighter'
      context.drawImage(mapCanvas, -width * 0.03, height * 0.14, width * 1.06, height * 0.94)
      // ultra-sharp sparkle for wet diamond glints
      context.globalAlpha = 0.14 + dragBoost * 0.1
      context.drawImage(mapCanvas, -width * 0.02, height * 0.15, width * 1.04, height * 0.92)
      context.restore()

      // local light bloom at active ripple (hand-stirred caustic bloom)
      if (ripple) {
        const age = time - ripple.startedAt / 1_000
        if (age >= 0 && age < 2.4) {
          const life = 1 - age / 2.4
          const rx = ripple.x * width
          const ry = height * 0.12 + ripple.y * height * 0.88
          const r = (48 + age * 90) * (0.85 + (ripple.strength ?? 1) * 0.25)
          context.save()
          context.globalCompositeOperation = 'screen'
          const bloom = context.createRadialGradient(rx, ry, 0, rx, ry, r)
          bloom.addColorStop(0, `rgba(255, 245, 190, ${0.22 * life * (ripple.strength ?? 1)})`)
          bloom.addColorStop(0.35, `rgba(160, 230, 230, ${0.12 * life})`)
          bloom.addColorStop(1, 'rgba(0, 0, 0, 0)')
          context.fillStyle = bloom
          context.fillRect(rx - r, ry - r, r * 2, r * 2)
          context.restore()
        }
      }

      const waterVeil = context.createLinearGradient(0, 0, 0, height)
      waterVeil.addColorStop(0, 'rgba(1, 16, 26, .9)')
      waterVeil.addColorStop(0.18, 'rgba(8, 68, 86, .28)')
      waterVeil.addColorStop(0.48, 'rgba(1, 22, 34, .04)')
      waterVeil.addColorStop(0.78, 'rgba(1, 14, 22, .12)')
      waterVeil.addColorStop(1, 'rgba(1, 8, 14, .48)')
      context.fillStyle = waterVeil
      context.fillRect(0, 0, width, height)

      // surface ripple lines — denser + slightly brighter near drag
      context.save()
      context.globalCompositeOperation = 'screen'
      context.lineWidth = 1
      const rows = 8 + Math.round(dragBoost * 3)
      for (let row = 0; row < rows; row += 1) {
        context.strokeStyle = `rgba(140, 236, 238, ${0.12 + dragBoost * 0.08 + row * 0.004})`
        context.beginPath()
        const baseY = height * (0.09 + row * 0.028)
        for (let x = 0; x <= width; x += 5) {
          let y = baseY + Math.sin(x * 0.017 + time * (0.36 + row * 0.07)) * (2.5 + row * 0.9)
            + Math.sin(x * 0.041 - time * 0.22 + row) * 1.2
          if (ripple) {
            const age = time - ripple.startedAt / 1_000
            if (age >= 0 && age < 3.5) {
              const dx = x / width - ripple.x
              const dy = (baseY / height) - ripple.y
              const dist = Math.hypot(dx, dy)
              const env = Math.exp(-dist * 4.5) * Math.exp(-age * 0.55) * (ripple.strength ?? 1)
              y += Math.sin(dist * 55 - age * 14) * env * 10
            }
          }
          if (x === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.stroke()
      }
      context.restore()

      // soft vignette for immersion
      const vignette = context.createRadialGradient(width * 0.5, height * 0.52, width * 0.2, width * 0.5, height * 0.52, width * 0.78)
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(1, 'rgba(0, 4, 10, 0.45)')
      context.fillStyle = vignette
      context.fillRect(0, 0, width, height)

      if (beatRef.current === 2 || beatRef.current === 4) drawRayStudy(time, false)
      if (beatRef.current === 3) drawRayStudy(time, true)

      if (!reducedMotion) frame = window.requestAnimationFrame(render)
    }

    frame = window.requestAnimationFrame(render)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  function makeRipple(event: ReactPointerEvent<HTMLCanvasElement>, fromDrag = false) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const now = performance.now()
    // Drag accumulates energy; a single tap still makes a crisp ring
    if (fromDrag) {
      dragBoostRef.current = Math.min(1, dragBoostRef.current + 0.12)
    } else {
      dragBoostRef.current = Math.min(1, dragBoostRef.current + 0.35)
    }
    lastDragAtRef.current = now
    rippleRef.current = {
      x: clamp01((event.clientX - bounds.left) / bounds.width),
      y: clamp01((event.clientY - bounds.top) / bounds.height),
      startedAt: now,
      strength: fromDrag ? 0.75 + dragBoostRef.current * 0.45 : 1.15,
    }
    controls.registerInteraction()
    onUserTouch()
  }

  return (
    <canvas
      ref={canvasRef}
      className="caustics-canvas"
      aria-label={tx('轻划水面，观察水波如何折弯并聚拢阳光，在池底形成游动光纹')}
      onPointerDown={(event) => makeRipple(event, false)}
      onPointerMove={(event) => {
        if (event.buttons) makeRipple(event, true)
      }}
    />
  )
}

export function PoolCaustics({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reducedMotion = false
  const [beat, setBeat] = useState<CausticBeat>(0)
  const [waveHeight, setWaveHeight] = useState(0.032)
  const [depth, setDepth] = useState(0.68)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('pool-caustics')

  useEffect(() => controls.completeOnboarding(), [controls])
  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(0)
  }, [enterFree])

  const guideSteps = useMemo<Array<GuideStep>>(() => [
    {
      title: '池底的光网，其实从水面开始',
      body: '阳光看起来平直，池底却一直在长出明暗纹路。真正不停变化的，是上方那层几乎透明的水面。',
      action: () => setBeat(1),
      durationMs: 5500,
    },
    {
      title: '每一道小波纹，都是一片软镜片',
      body: '光从空气进入水时会拐弯。水面向哪边倾斜，光线就被带向哪边；波纹一动，成千上万片“镜片”也跟着转动。',
      action: () => setBeat(2),
      durationMs: 6000,
    },
    {
      title: '许多光挤到一起，亮线就出现了',
      body: '池底的亮处不是凭空多出光，而是附近许多光线被水面聚到同一小块地方。暗处则是光被带走后留下的空隙。',
      action: () => setBeat(3),
      durationMs: 6000,
    },
    {
      title: '一个公式，决定光会拐多少',
      body: '斯涅尔定律：n₁ sin θ₁ = n₂ sin θ₂。空气 n≈1.00，水 n≈1.33。水面倾斜不断改写入射角，光网便一直游动。',
      action: () => setBeat(4),
      durationMs: 6000,
    },
    {
      title: '五百年前，达·芬奇已经画过它',
      body: '大约 1503—1506 年，达·芬奇研究球面镜时画下许多光线汇成弯曲亮线的过程。今天，这类被光线包络出来的亮纹叫“焦散”。',
      action: () => setBeat(5),
      durationMs: 5500,
    },
    {
      title: '同一套光路',
      body: '涟漪折弯光线，池底就织出焦散网。工程师与电影也靠同一套光路，去算镜片、水面与体积光。',
      action: () => setBeat(6),
      durationMs: 5000,
    },
  ], [])

  return (
    <div className={`oss-experience caustics-experience caustics-beat-${beat}${storyMode ? ' is-story' : ' is-free'}`}>
      <PoolLightField
        beat={beat}
        waveHeight={waveHeight}
        depth={depth}
        controls={controls}
        reducedMotion={reducedMotion}
        onUserTouch={returnToFree}
      />

      {!storyMode && (
        <header className="caustics-plaque" data-experience-overlay="true">
          <span>{tx('WATER / LIGHT')}</span>
          <h1>{tx('光纹')}</h1>
          <p>{tx('为什么泳池底下的光一直在游？')}</p>
        </header>
      )}

      {!storyMode && (
        <Freebar
          className="caustics-freebar"
          mainClassName="caustics-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={3}
        >
          <label className="caustics-freebar-field">
            <span>{tx('波浪高度')}</span>
            <input
              className="caustics-wave"
              type="range"
              min="0.006"
              max="0.052"
              step="0.001"
              value={waveHeight}
              aria-label={tx('波浪高度')}
              onChange={(event) => {
                controls.registerInteraction()
                setWaveHeight(Number(event.target.value))
              }}
            />
            <b>{waveHeight.toFixed(3)}</b>
          </label>
          <label className="caustics-freebar-field">
            <span>{tx('池水深度')}</span>
            <input
              className="caustics-depth"
              type="range"
              min="0.18"
              max="1"
              step="0.01"
              value={depth}
              aria-label={tx('池水深度')}
              onChange={(event) => {
                controls.registerInteraction()
                setDepth(Number(event.target.value))
              }}
            />
            <b>{depth.toFixed(2)}</b>
          </label>
          <button
            type="button"
            className="experience-freebar-story"
            onClick={() => {
              controls.registerInteraction()
              enterStory()
              setBeat(0)
              replayGuide('pool-caustics')
            }}
            aria-label={tx('重播故事')}
          >
            <FilmStrip weight="fill" aria-hidden="true" />
            <span>{tx('故事')}</span>
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId="pool-caustics"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'monumental' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'editorial' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'fade', tone: 'light', width: 'wide', treatment: 'caption', cue: 'up' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'normal', treatment: 'annotation' },
          { position: 'center-right', mobilePosition: 'top-right', motion: 'scale', tone: 'light', width: 'normal', treatment: 'editorial' },
          { position: 'center-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', width: 'normal', treatment: 'caption' },
        ]}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint worldId="pool-caustics" gesture={{ type: 'drag', target: '.caustics-canvas', dx: 110, dy: 25, label: tx('轻划水面') }} />
      )}
    </div>
  )
}
