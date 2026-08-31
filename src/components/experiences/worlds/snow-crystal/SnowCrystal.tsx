import './styles/SnowCrystal.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import {
  GuideTour,
  replayGuide,
  type GuideStep,
} from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
type SnowBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6

type Tip = {
  x: number
  y: number
  dir: number // radians
  generation: number
  arm: number // 0..5 primary arm
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}

/** Habit label from Nakaya-inspired temperature/humidity map (stylized). */
function habitName(tempC: number, humidity: number): string {
  if (tempC > -5) return humidity > 0.55 ? '薄板' : '实心板'
  if (tempC > -10) return humidity > 0.65 ? '扇形板' : '棱柱'
  if (tempC > -16) return humidity > 0.7 ? '枝晶' : humidity > 0.45 ? '扇形板' : '厚板'
  if (tempC > -22) return humidity > 0.6 ? '针状' : '空心柱'
  return humidity > 0.55 ? '细针' : '短柱'
}

function habitFactors(tempC: number, humidity: number) {
  // radial: along 6 primary axes; side: side-branch tendency; plate: fill between arms
  let radial = 1
  let side = 0.35
  let plate = 0.2
  let needle = 0
  if (tempC > -5) {
    radial = 0.55
    side = 0.15
    plate = 0.85
  } else if (tempC > -10) {
    radial = 0.75
    side = 0.35 + humidity * 0.2
    plate = 0.45
  } else if (tempC > -16) {
    radial = 0.95 + humidity * 0.25
    side = 0.55 + humidity * 0.35
    plate = 0.12
  } else if (tempC > -22) {
    radial = 1.15
    side = 0.12
    plate = 0.05
    needle = 0.7
  } else {
    radial = 1.25
    side = 0.08
    plate = 0.02
    needle = 0.9
  }
  radial *= 0.7 + humidity * 0.55
  side *= 0.5 + humidity * 0.7
  return { radial, side, plate, needle }
}

export function SnowCrystal({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [tempC, setTempC] = useState(-14)
  const [humidity, setHumidity] = useState(0.78)
  const [growth, setGrowth] = useState(1)
  const [beat, setBeat] = useState<SnowBeat>(0)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('snow-crystal')

  const sim = useRef({
    tempC: -14,
    humidity: 0.78,
    growth: 1,
    beat: 0 as SnowBeat,
    time: 0,
    lastNow: 0,
    tips: [] as Array<Tip>,
    segments: [] as Array<{ x0: number; y0: number; x1: number; y1: number; w: number; arm: number }>,
    plates: [] as Array<{ x: number; y: number; r: number; arm: number }>,
    seed: 1,
    growing: true,
    maxGen: 5,
  })

  sim.current.tempC = tempC
  sim.current.humidity = humidity
  sim.current.growth = growth
  sim.current.beat = beat

  const reseed = useCallback(() => {
    // Grow a single primary arm, then paint 6-fold copies — keeps true hex symmetry.
    const dir = -Math.PI / 2
    sim.current.tips = [{ x: 0, y: 0, dir, generation: 0, arm: 0 }]
    sim.current.segments = []
    sim.current.plates = []
    sim.current.seed = Math.random() * 1000
    sim.current.growing = true
    sim.current.time = 0
  }, [])

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(0)
  }, [enterFree])

  useEffect(() => {
    controls.completeOnboarding()
    reseed()
  }, [controls, reseed])

  useEffect(() => {
    if (beat === 0) return
    if (beat === 1) {
      setTempC(-14)
      setHumidity(0.8)
      reseed()
    } else if (beat === 2) {
      setTempC(-3)
      setHumidity(0.5)
      reseed()
    } else if (beat === 3) {
      setTempC(-15)
      setHumidity(0.85)
      reseed()
    } else if (beat === 4) {
      setTempC(-25)
      setHumidity(0.7)
      reseed()
    } else if (beat === 5) {
      setTempC(-12)
      setHumidity(0.75)
      reseed()
    } else if (beat === 6) {
      setTempC(-14)
      setHumidity(0.78)
    }
  }, [beat, reseed])

  useEffect(() => {
    // Parameter change mid-growth: reseed for clear habit switch
    reseed()
  }, [tempC, humidity, reseed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 1
    let height = 1
    let dpr = 1
    let frame = 0
    let growAcc = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const hash = (n: number) => {
      const x = Math.sin(n * 127.1 + sim.current.seed) * 43758.5453
      return x - Math.floor(x)
    }

    const paint = (now: number) => {
      const s = sim.current
      const dt = s.lastNow ? Math.min(0.05, (now - s.lastNow) / 1000) : 0.016
      s.lastNow = now
      const rate = 1
      s.time += dt * rate

      const factors = habitFactors(s.tempC, s.humidity)
      growAcc += dt * rate * s.growth * (1.1 + s.humidity * 0.6)

      // Grow a single arm; rendering mirrors it six times for clean hex symmetry
      while (growAcc > 0.028 && s.growing && s.segments.length < 420) {
        growAcc -= 0.028
        const nextTips: Array<Tip> = []
        for (const tip of s.tips) {
          if (tip.generation > s.maxGen) continue
          const step = (0.02 + factors.radial * 0.014) * (1 + factors.needle * 0.4)
          // Shared hash by generation only → same for all 6 painted arms
          const wobble = (hash(tip.generation * 13 + Math.floor(s.segments.length / 4)) - 0.5) * 0.06
          const dir = tip.dir + wobble * (1 - factors.needle) * 0.5
          const x1 = tip.x + Math.cos(dir) * step
          const y1 = tip.y + Math.sin(dir) * step
          const r = Math.hypot(x1, y1)
          if (r > 0.92) {
            s.growing = false
            continue
          }
          s.segments.push({
            x0: tip.x,
            y0: tip.y,
            x1,
            y1,
            w: Math.max(0.7, 2.6 - tip.generation * 0.4 - factors.needle),
            arm: 0,
          })

          if (factors.plate > 0.3 && tip.generation >= 1 && hash(tip.generation * 5) > 0.5) {
            s.plates.push({
              x: (tip.x + x1) * 0.5,
              y: (tip.y + y1) * 0.5,
              r: 0.014 + factors.plate * 0.022 * (1 - r),
              arm: 0,
            })
          }

          nextTips.push({
            x: x1,
            y: y1,
            dir,
            generation: tip.generation,
            arm: 0,
          })

          // Symmetric side branches at ±60° (hex ice lattice)
          const branchChance = factors.side * (0.28 + 0.35 * hash(tip.generation * 9 + 2))
          if (tip.generation < s.maxGen && r > 0.12 && hash(tip.generation * 7 + s.segments.length) < branchChance) {
            for (const sideSign of [-1, 1] as const) {
              // Both sides for needle/plate clarity; denser when humidity high
              if (sideSign < 0 && factors.side < 0.35 && hash(tip.generation + 1) < 0.55) continue
              nextTips.push({
                x: x1,
                y: y1,
                dir: dir + sideSign * (Math.PI / 3),
                generation: tip.generation + 1,
                arm: 0,
              })
            }
          }
        }
        s.tips = nextTips.slice(0, 48)
        if (s.tips.length === 0) s.growing = false
      }

      const mobile = width < 720
      const cx = width * 0.5
      const cy = height * (mobile ? 0.42 : 0.46)
      const scale = Math.min(width, height) * (mobile ? 0.36 : 0.4)

      // Cold night stage — ice white / blue, no vignette
      const bg = ctx.createRadialGradient(cx, cy * 0.82, 0, cx, cy, Math.max(width, height) * 0.8)
      bg.addColorStop(0, '#12263a')
      bg.addColorStop(0.4, '#0a1624')
      bg.addColorStop(1, '#040910')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Soft ice pedestal glow under the crystal
      const pedestal = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.15)
      pedestal.addColorStop(0, 'rgba(160, 210, 255, 0.12)')
      pedestal.addColorStop(0.45, 'rgba(100, 160, 220, 0.05)')
      pedestal.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = pedestal
      ctx.beginPath()
      ctx.arc(cx, cy, scale * 1.15, 0, Math.PI * 2)
      ctx.fill()

      // Drifting frost motes
      for (let i = 0; i < 52; i += 1) {
        const px = (hash(i * 3.1) * width + s.time * (6 + hash(i) * 18)) % width
        const py = (hash(i * 7.7) * height + s.time * (3 + hash(i + 1) * 9)) % height
        const a = 0.06 + hash(i + 2) * 0.14
        const r = 0.6 + hash(i + 3) * 1.8
        const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2)
        g.addColorStop(0, `rgba(230, 244, 255, ${a})`)
        g.addColorStop(1, 'rgba(200, 230, 255, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(px, py, r * 2.2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Hex lattice guide (story early / free idle)
      if (s.beat === 1 || s.beat === 0) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.strokeStyle = 'rgba(170, 210, 255, 0.14)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 7])
        for (let a = 0; a < 6; a += 1) {
          const ang = (a * Math.PI) / 3 - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(ang) * scale * 0.98, Math.sin(ang) * scale * 0.98)
          ctx.stroke()
        }
        // Outer hex ring
        ctx.setLineDash([])
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.1)'
        ctx.beginPath()
        for (let a = 0; a < 6; a += 1) {
          const ang = (a * Math.PI) / 3 - Math.PI / 2
          const x = Math.cos(ang) * scale * 0.98
          const y = Math.sin(ang) * scale * 0.98
          if (a === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
      }

      // Paint one grown arm as six rotated copies (true hex symmetry)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const sparkle = 0.55 + 0.45 * Math.sin(s.time * 1.4)

      for (let arm = 0; arm < 6; arm += 1) {
        const rot = (arm * Math.PI) / 3
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        const map = (x: number, y: number) => ({
          x: (x * cos - y * sin) * scale,
          y: (x * sin + y * cos) * scale,
        })
        // Per-arm lighting — slight cool/warm tilt so the crystal feels 3D
        const armLight = 0.72 + 0.28 * Math.sin(arm * 1.05 + s.time * 0.4)

        for (const p of s.plates) {
          const c = map(p.x, p.y)
          const pr = p.r * scale * 3.2
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, pr)
          g.addColorStop(0, `rgba(220, 240, 255, ${0.35 * armLight})`)
          g.addColorStop(0.45, `rgba(170, 210, 255, ${0.14 * armLight})`)
          g.addColorStop(1, 'rgba(160, 210, 255, 0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(c.x, c.y, pr, 0, Math.PI * 2)
          ctx.fill()
        }

        for (const seg of s.segments) {
          const a = map(seg.x0, seg.y0)
          const b = map(seg.x1, seg.y1)
          // Soft ice halo
          ctx.strokeStyle = `rgba(150, 200, 255, ${0.16 * armLight})`
          ctx.lineWidth = seg.w + 4.5
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          // Mid ice body
          ctx.strokeStyle = `rgba(${150 + armLight * 70}, ${200 + armLight * 40}, 255, ${0.55 * armLight})`
          ctx.lineWidth = seg.w + 1.6
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          // Bright frost core
          ctx.strokeStyle = `rgba(245, 252, 255, ${0.55 + 0.35 * armLight * sparkle})`
          ctx.lineWidth = Math.max(0.7, seg.w * 0.55)
          ctx.shadowColor = 'rgba(180, 220, 255, 0.55)'
          ctx.shadowBlur = 6
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      }

      // Growing tip sparks (while still growing)
      if (s.growing && s.tips.length > 0) {
        for (let arm = 0; arm < 6; arm += 1) {
          const rot = (arm * Math.PI) / 3
          const cos = Math.cos(rot)
          const sin = Math.sin(rot)
          for (const tip of s.tips) {
            const x = (tip.x * cos - tip.y * sin) * scale
            const y = (tip.x * sin + tip.y * cos) * scale
            const tg = ctx.createRadialGradient(x, y, 0, x, y, 9)
            tg.addColorStop(0, `rgba(255, 255, 255, ${0.75 * sparkle})`)
            tg.addColorStop(0.4, `rgba(180, 220, 255, ${0.35 * sparkle})`)
            tg.addColorStop(1, 'rgba(140, 200, 255, 0)')
            ctx.fillStyle = tg
            ctx.beginPath()
            ctx.arc(x, y, 9, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Core nucleus — bright ice seed
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 16)
      core.addColorStop(0, 'rgba(255, 255, 255, 1)')
      core.addColorStop(0.3, 'rgba(210, 235, 255, 0.9)')
      core.addColorStop(0.65, 'rgba(140, 200, 255, 0.35)')
      core.addColorStop(1, 'rgba(100, 170, 255, 0)')
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const loop = (now: number) => {
      frame = window.requestAnimationFrame(loop)
      try {
        paint(now)
      } catch (error) {
        console.error('[snow-crystal] render failed', error)
      }
    }
    frame = window.requestAnimationFrame(loop)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [false])

  const habit = habitName(tempC, humidity)

  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: tx('雪花为什么总长出六条臂'),
        body: tx('一片雪晶从中心开始，六条主臂几乎同时向外伸展。这个重复出现的对称不是画出来的装饰，而是冰的六角晶格在生长。'),
        action: () => setBeat(1),
        durationMs: 5_500,
      },
      {
        title: tx('温度决定“板”还是“针”'),
        body: tx('接近 0°C 时，晶体更爱铺成薄板；更冷时，沿主轴拉长成柱或针。这就是中谷宇吉郎图里的习性分区。'),
        action: () => setBeat(2),
        durationMs: 6_200,
      },
      {
        title: tx('水汽充足，侧枝才会疯长'),
        body: tx('湿度高时，臂的侧面也容易结出新枝，于是出现经典的树枝状雪花。湿度低，就更像简洁的板或柱。'),
        action: () => setBeat(3),
        durationMs: 6_000,
      },
      {
        title: tx('每一片都独一无二？'),
        body: tx('路径依赖：云中温度与水汽一路波动，六条臂共享同一历史，却在细节上分叉——所以相似，却几乎不会完全相同。'),
        action: () => setBeat(4),
        durationMs: 6_200,
      },
      {
        title: tx('这是风格化的生长，不是实验室数据'),
        body: tx('真实雪晶在三维中生长，还有碰撞与升华。这里用六角分支动画帮你看见习性如何随环境改变。'),
        action: () => setBeat(5),
        durationMs: 5_500,
      }
    ],
    [tx],
  )

  return (
    <div className={`oss-experience snow-experience snow-beat-${beat}`}>
      <canvas
        ref={canvasRef}
        className="snow-canvas"
        aria-label={tx('六角雪晶随温度与湿度改变习性的生长动画')}
        onPointerDown={() => {
          controls.registerInteraction()
        }}
      />

      {!storyMode && (
        <div className="snow-readout" data-experience-overlay="true" aria-live="polite">
          <strong>{tx(habit)}</strong>
          <span>
            {tempC.toFixed(0)}°C · {Math.round(humidity * 100)}%
          </span>
        </div>
      )}

      {!storyMode && (
        <header className="snow-plaque" data-experience-overlay="true">
          <h1>{tx('六角如何长成')}</h1>
          <p>{tx('同一片云里，为什么雪花有时像板，有时像针？')}</p>
        </header>
      )}

      {!storyMode && (
        <Freebar
          className="snow-freebar"
          mainClassName="snow-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={1}
          secondary={(
            <div className="snow-tray">
              <div className="experience-freebar-field">
                <div>
                  <span>{tx('湿度')}</span>
                  <strong>{Math.round(humidity * 100)}%</strong>
                </div>
                <input
                  className="snow-humidity"
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.01}
                  value={humidity}
                  aria-label={tx('相对湿度')}
                  onChange={(event) => {
                    controls.registerInteraction()
                    setHumidity(Number(event.target.value))
                    returnToFree()
                  }}
                />
              </div>
              <div className="snow-tray-row">
                <div className="experience-freebar-field">
                  <div>
                    <span>{tx('生长速度')}</span>
                    <strong>×{growth.toFixed(1)}</strong>
                  </div>
                  <input
                    className="snow-growth"
                    type="range"
                    min={0.4}
                    max={2.2}
                    step={0.1}
                    value={growth}
                    aria-label={tx('生长速度')}
                    onChange={(event) => {
                      controls.registerInteraction()
                      setGrowth(Number(event.target.value))
                      returnToFree()
                    }}
                  />
                </div>
                <div className="snow-tray-tools">
                  <button
                    type="button"
                    className="experience-freebar-reset"
                    aria-label={tx('重新生长')}
                    onClick={() => {
                      controls.registerInteraction()
                      reseed()
                      returnToFree()
                    }}
                  >
                    <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                    <span>{tx('重置')}</span>
                  </button>
                  <button
                    type="button"
                    className="experience-freebar-story"
                    onClick={() => {
                      controls.registerInteraction()
                      enterStory()
                      replayGuide('snow-crystal')
                    }}
                    aria-label={tx('重播故事')}
                  >
                    <FilmStrip weight="fill" aria-hidden="true" />
                    <span>{tx('故事')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        >
          <div className="experience-freebar-field">
            <div>
              <span>{tx('温度')}</span>
              <strong>{tempC.toFixed(0)}°C</strong>
            </div>
            <input
              className="snow-temp"
              type="range"
              min={-30}
              max={-1}
              step={0.5}
              value={tempC}
              aria-label={tx('温度，摄氏度')}
              onChange={(event) => {
                controls.registerInteraction()
                setTempC(Number(event.target.value))
                returnToFree()
              }}
            />
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="snow-crystal"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental' },
        ]}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="snow-crystal"
          gesture={{ type: 'scrub', target: '.snow-temp', label: tx('拨动温度') }}
        />
      )}
    </div>
  )
}
