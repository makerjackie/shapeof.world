import './styles/PinholeCanopy.css'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowCounterClockwise, CheckCircle, Question, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

type CanopyState = {
  eclipse: number
  aperture: number
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 7_931.31) * 47_117.73
  return value - Math.floor(value)
}

const SPOTS = Array.from({ length: 118 }, (_, index) => ({
  x: seededRandom(index + 11),
  y: seededRandom(index + 411),
  size: 0.58 + seededRandom(index + 811) * 1.02,
  angle: (seededRandom(index + 1_211) - 0.5) * 0.56,
  phase: seededRandom(index + 1_611) * Math.PI * 2,
  alpha: 0.42 + seededRandom(index + 2_011) * 0.5,
}))

const LEAVES = Array.from({ length: 76 }, (_, index) => ({
  x: seededRandom(index + 77),
  y: seededRandom(index + 277),
  radius: 0.35 + seededRandom(index + 477) * 0.7,
  shade: seededRandom(index + 677),
  angle: (seededRandom(index + 877) - 0.5) * Math.PI,
}))

const spotSpriteCache = new Map<string, HTMLCanvasElement>()

function getSpotSprite(eclipse: number, aperture: number) {
  const key = `${Math.round(eclipse)}-${Math.round(aperture * 2)}`
  const cached = spotSpriteCache.get(key)
  if (cached) return cached

  const sprite = document.createElement('canvas')
  sprite.width = 220
  sprite.height = 150
  const ctx = sprite.getContext('2d')!
  const centerX = 108
  const centerY = 75
  const radiusX = 45
  const radiusY = 31
  const blur = 2 + aperture * 2.3

  ctx.filter = `blur(${Math.max(0, aperture - 2) * 0.55}px)`
  ctx.shadowColor = 'rgba(255, 220, 132, 0.92)'
  ctx.shadowBlur = blur
  ctx.fillStyle = 'rgba(255, 237, 178, 0.94)'
  ctx.beginPath()
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  if (eclipse > 1) {
    const overlap = eclipse / 100
    const offset = radiusX * 2.05 * (1 - overlap)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(centerX + offset, centerY - radiusY * 0.06, radiusX * 1.02, radiusY * 1.02, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.filter = 'none'

  spotSpriteCache.set(key, sprite)
  if (spotSpriteCache.size > 48) spotSpriteCache.delete(spotSpriteCache.keys().next().value ?? '')
  return sprite
}

function drawSun(ctx: CanvasRenderingContext2D, width: number, height: number, eclipse: number) {
  const x = width * 0.72
  const y = height * 0.15
  const radius = Math.max(27, Math.min(54, width * 0.035))
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 4)
  glow.addColorStop(0, 'rgba(255,248,209,0.96)')
  glow.addColorStop(0.15, 'rgba(255,222,132,0.52)')
  glow.addColorStop(1, 'rgba(255,209,102,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8)

  ctx.fillStyle = '#fff1bb'
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  if (eclipse > 1) {
    const overlap = eclipse / 100
    const offset = radius * 2.05 * (1 - overlap)
    const moon = ctx.createRadialGradient(x + offset - radius * 0.3, y - radius * 0.2, radius * 0.12, x + offset, y, radius * 1.12)
    moon.addColorStop(0, '#17211d')
    moon.addColorStop(1, '#040a08')
    ctx.fillStyle = moon
    ctx.beginPath()
    ctx.arc(x + offset, y, radius * 1.015, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  state: CanopyState,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#477667')
  sky.addColorStop(0.34, '#284f3d')
  sky.addColorStop(1, '#07150f')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const ground = ctx.createLinearGradient(0, height * 0.28, 0, height)
  ground.addColorStop(0, 'rgba(62,88,52,0)')
  ground.addColorStop(0.28, '#374a2f')
  ground.addColorStop(0.75, '#18251a')
  ground.addColorStop(1, '#0a110c')
  ctx.fillStyle = ground
  ctx.fillRect(0, height * 0.2, width, height * 0.8)

  const warmPool = ctx.createRadialGradient(width * 0.52, height * 0.73, 0, width * 0.52, height * 0.73, width * 0.54)
  warmPool.addColorStop(0, 'rgba(157,137,72,0.22)')
  warmPool.addColorStop(0.48, 'rgba(113,110,57,0.1)')
  warmPool.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = warmPool
  ctx.fillRect(0, height * 0.24, width, height * 0.76)

  for (let index = 0; index < 24; index += 1) {
    const y = height * (0.38 + index * 0.027)
    const perspective = index / 24
    ctx.strokeStyle = `rgba(211,190,128,${0.018 + perspective * 0.02})`
    ctx.lineWidth = 1 + perspective * 1.5
    ctx.beginPath()
    ctx.moveTo(0, y + Math.sin(time * 0.1 + index) * 2)
    ctx.quadraticCurveTo(width * 0.5, y + height * 0.035, width, y - height * 0.01)
    ctx.stroke()
  }

  drawSun(ctx, width, height, state.eclipse)

  const sprite = getSpotSprite(state.eclipse, state.aperture)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const spot of SPOTS) {
    const depth = 0.25 + spot.y * 0.75
    const x = spot.x * width + Math.sin(time * 0.23 + spot.phase) * (2 + depth * 7)
    const y = height * (0.36 + spot.y * 0.66) + Math.cos(time * 0.19 + spot.phase) * (1 + depth * 3)
    const scale = (0.28 + depth * 0.82) * spot.size
    const drawWidth = 158 * scale
    const drawHeight = 96 * scale * (0.58 + depth * 0.42)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(spot.angle + Math.sin(time * 0.08 + spot.phase) * 0.035)
    ctx.globalAlpha = spot.alpha * (0.7 + Math.sin(time * 0.42 + spot.phase) * 0.13)
    ctx.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()
  }
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(10,22,14,0.9)'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(12, width * 0.02)
  ctx.beginPath()
  ctx.moveTo(-20, height * 0.04)
  ctx.bezierCurveTo(width * 0.18, height * 0.13, width * 0.31, height * 0.06, width * 0.45, height * 0.18)
  ctx.stroke()
  ctx.lineWidth *= 0.46
  ctx.beginPath()
  ctx.moveTo(width * 0.19, height * 0.1)
  ctx.lineTo(width * 0.29, height * 0.3)
  ctx.moveTo(width * 0.34, height * 0.12)
  ctx.lineTo(width * 0.5, height * 0.04)
  ctx.stroke()
  ctx.restore()

  for (const leaf of LEAVES) {
    const edgeBias = leaf.x < 0.52 ? 1 : 0.38
    const x = leaf.x * width
    const y = leaf.y * height * (0.36 * edgeBias) - height * 0.02
    const radius = (13 + leaf.radius * 25) * Math.max(0.72, width / 1_650)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(leaf.angle + Math.sin(time * 0.11 + leaf.x * 9) * 0.035)
    ctx.fillStyle = `rgba(${4 + leaf.shade * 9},${18 + leaf.shade * 22},${9 + leaf.shade * 14},${0.74 + leaf.shade * 0.22})`
    ctx.beginPath()
    ctx.moveTo(-radius * 1.35, 0)
    ctx.bezierCurveTo(-radius * 0.55, -radius * 0.82, radius * 0.62, -radius * 0.72, radius * 1.35, 0)
    ctx.bezierCurveTo(radius * 0.52, radius * 0.75, -radius * 0.62, radius * 0.78, -radius * 1.35, 0)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = `rgba(116,145,94,${0.04 + leaf.shade * 0.07})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-radius, 0)
    ctx.lineTo(radius, 0)
    ctx.stroke()
    ctx.restore()
  }
}

export function PinholeCanopy({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('pinhole-canopy')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<CanopyState>({ eclipse: 68, aperture: 7.5 })
  const [eclipse, setEclipse] = useState(68)
  const [aperture, setAperture] = useState(7.5)
  const [whyOpen, setWhyOpen] = useState(false)
  stateRef.current = { eclipse, aperture }

  const sharpness = Math.max(0, Math.min(100, Math.round(108 - aperture * 10.5)))
  const spotShape = eclipse < 4 ? '一地圆形太阳像' : eclipse < 38 ? '缺了一角的太阳像' : '一地月牙形太阳像'

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frameId = 0
    const startedAt = performance.now()
    const frame = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawScene(ctx, width, height, (now - startedAt) / 1_000, stateRef.current)
      frameId = window.requestAnimationFrame(frame)
    }
    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const guideSteps: Array<GuideStep> = [
    {
      title: '先看地上的月牙',
      body: '树叶缝隙没有月牙形，但地上的每个亮斑都变成了月牙。它们不是普通光斑，而是一百多个太阳的小像。',
      action: () => {
        setEclipse(68)
        setAperture(4)
      },
    },
    {
      title: '缩小叶隙',
      body: '把黄色滑块往“小”拨。开口越小，不同方向来的光越不容易混在一起，太阳的轮廓就越清楚。',

    },
    {
      title: '让月球走过太阳',
      body: '改变遮挡比例，地上所有光斑会同步复刻太阳剩下的形状。日食时，树荫就是天然投影幕。',
      action: () => setEclipse(76),
    },
  ]

  return (
    <div className={`oss-experience pinhole-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas ref={canvasRef} className="pinhole-canvas" aria-label={tx('树叶缝隙把日食投影到地面的互动场景')} />

      {!storyMode && (
        <header className="pinhole-question" data-experience-overlay="true">
          <span>{tx('光的魔法 · 第三课')}</span>
          <h1>{tx('树荫下，为什么落着一地小太阳？')}</h1>
          <p>{tx('缩小叶片之间的缝，让模糊光斑突然显出太阳被月球咬掉的形状。')}</p>
          <button type="button" onClick={() => setWhyOpen(true)}><Question weight="bold" /> {tx('为什么')}</button>
        </header>
      )}

      <aside className="pinhole-readout" data-experience-overlay="true">
        <span>{tx('地面成像')}</span>
        <strong>{tx(spotShape)}</strong>
        <div>
          <small>{tx('轮廓清晰度')}</small>
          <b>{tx(sharpness)}%</b>
        </div>
        <div className="pinhole-meter" aria-hidden="true"><i style={{ width: `${sharpness}%` }} /></div>
        <p>{tx('每一道叶隙，都在独立投影同一个太阳。')}</p>
        {eclipse >= 58 && sharpness >= 76 && <em><CheckCircle weight="fill" /> {tx('月牙雨完成')}</em>}
      </aside>

      {!storyMode && (
        <Freebar
          className="pinhole-freebar"
          mainClassName="pinhole-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondary={(
            <div className="pinhole-tray">
              <div className="pinhole-chip-rail experience-freebar-chips" role="group" aria-label={tx('工具')}>
                <button
                  type="button"
                  className="pinhole-reset experience-freebar-reset"
                  onClick={() => {
                    controls.registerInteraction()
                    setEclipse(68)
                    setAperture(7.5)
                  }}
                  aria-label={tx('重置')}
                >
                  <ArrowCounterClockwise weight="bold" />
                  <span>{tx('重置')}</span>
                </button>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('pinhole-canopy')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <div className="experience-freebar-field pinhole-control pinhole-aperture">
            <label>
              <span>{tx('叶隙')} <strong>{tx(aperture.toFixed(1))} mm</strong></span>
            </label>
            <input
              type="range"
              min={1.5}
              max={12}
              step={0.1}
              value={aperture}
              style={{ '--fill': `${((aperture - 1.5) / 10.5) * 100}%` } as CSSProperties}
              onChange={(event) => {
                controls.registerInteraction()
                setAperture(Number(event.target.value))
              }}
              aria-label={tx('叶隙直径')}
            />
          </div>
          <div className="experience-freebar-field pinhole-control pinhole-eclipse">
            <label>
              <span>{tx('遮日')} <strong>{tx(eclipse)}%</strong></span>
            </label>
            <input
              type="range"
              min={0}
              max={88}
              value={eclipse}
              style={{ '--fill': `${(eclipse / 88) * 100}%` } as CSSProperties}
              onChange={(event) => {
                controls.registerInteraction()
                setEclipse(Number(event.target.value))
              }}
              aria-label={tx('月球遮住太阳')}
            />
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="pinhole-why" role="dialog" aria-label={tx('树荫小孔成像解释')} data-experience-overlay="true">
          <article>
            <button type="button" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}><X weight="bold" /></button>
            <span>{tx('PINHOLE PROJECTION')}</span>
            <h2>{tx('叶缝不是在漏光，而是在给太阳拍照。')}</h2>
            <p>{tx('太阳表面每一点都向四面八方发光。很小的叶隙只允许一束很窄的方向穿过，于是来自太阳不同位置的光在地面重新排成一个倒立的太阳像。因为太阳几乎是圆的，平时你看到的大多是圆斑。')}</p>
            <p>{tx('日偏食时，月球遮掉太阳的一部分，所有叶隙投出的像都会同步变成月牙。筛子、编织帽甚至交叉的手指都能制造同样的效果；开口越小轮廓越清楚，但亮度也会下降。')}</p>
            <p>{tx('模型固定太阳约 0.53° 的视直径，并把地面视为平面。真实光斑大小还取决于叶隙到地面的距离，叶片晃动、开口形状与衍射会共同限制清晰度。')}</p>
          </article>
        </div>
      )}

      <GuideTour
        worldId="pinhole-canopy"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'drift-left', tone: 'light', width: 'narrow', treatment: 'caption', cue: 'up' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'scale', tone: 'light', width: 'normal', treatment: 'monumental' },
        ]}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint worldId="pinhole-canopy" gesture={{ type: 'scrub', target: '.pinhole-aperture input', label: '缩小叶片缝隙' }} />
      )}
    </div>
  )
}
