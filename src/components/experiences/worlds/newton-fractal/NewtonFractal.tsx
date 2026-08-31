import './styles/NewtonFractal.css'

import { useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwise, Question, Shuffle, Warning, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

const RED = '#ff6b6b'

// z³ − 1 = 0 的三个根（单位圆上等距分布）
const ROOTS = [
  { re: 1, im: 0 },
  { re: -0.5, im: Math.sqrt(3) / 2 },
  { re: -0.5, im: -Math.sqrt(3) / 2 },
]
// 三个根的盆地配色：青（根1）/ 黄（根2）/ 紫（根3）
const BASIN: Array<[number, number, number]> = [
  [77, 208, 225],
  [255, 209, 102],
  [177, 92, 255],
]
const ROOT_LABELS = ['z₁', 'z₂', 'z₃']
const RANGE = 1.45
const MAX_ITER = 60
const BOUNDARY_ITER = 25
const DEFAULT_START = { re: 0.92, im: 0.78 }

type BasinJob = {
  key: string
  stage: number // 0 粗 → 1 中 → 2 细
  row: number
  gridW: number
  gridH: number
  img: ImageData | null
  off: HTMLCanvasElement | null
  done: boolean
}

/** 牛顿迭代 z ← z − (z³−1)/(3z²)；返回收敛到的根（-1 = 失败）与步数，可记录路径 */
function solveNewton(re0: number, im0: number, path: Array<number> | null): { root: number; iters: number } {
  let re = re0
  let im = im0
  for (let i = 0; i < MAX_ITER; i += 1) {
    for (let r = 0; r < 3; r += 1) {
      const dre = re - ROOTS[r].re
      const dim = im - ROOTS[r].im
      if (dre * dre + dim * dim < 1e-12) return { root: r, iters: i }
    }
    // z² 与 z³（复数乘法展开）
    const z2re = re * re - im * im
    const z2im = 2 * re * im
    const z3re = z2re * re - z2im * im
    const z3im = z2re * im + z2im * re
    // f = z³ − 1，f′ = 3z²，做复数除法 f / f′
    const fre = z3re - 1
    const fim = z3im
    const dre = 3 * z2re
    const dim = 3 * z2im
    const den = dre * dre + dim * dim
    if (den < 1e-18) return { root: -1, iters: MAX_ITER }
    re -= (fre * dre + fim * dim) / den
    im -= (fim * dre - fre * dim) / den
    if (!Number.isFinite(re) || !Number.isFinite(im)) return { root: -1, iters: MAX_ITER }
    if (path) path.push(re, im)
  }
  return { root: -1, iters: MAX_ITER }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function NewtonFractal({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('newton-fractal')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [whyOpen, setWhyOpen] = useState(false)
  const [hud, setHud] = useState({ re: DEFAULT_START.re, im: DEFAULT_START.im, iters: 0, root: 0, boundary: false })

  const st = useRef({
    start: { ...DEFAULT_START },
    userTouched: false,
    dragging: false,
    wander: 0,
    lastNow: 0,
    plot: { cx: 0, cy: 0, size: 1 },
    basin: { key: '', stage: 0, row: 0, gridW: 0, gridH: 0, img: null, off: null, done: false } as BasinJob,
    hudKey: '',
  })

  useEffect(() => {
    controls.completeOnboarding()
    // 深链：?re=0.3&im=0.9 预置起点（海报/分享），并停用自动巡游
    const q = new URLSearchParams(window.location.search)
    const re = Number(q.get('re'))
    const im = Number(q.get('im'))
    if (q.get('re') !== null && q.get('im') !== null && Number.isFinite(re) && Number.isFinite(im)) {
      st.current.start = { re: clamp(re, -RANGE, RANGE), im: clamp(im, -RANGE, RANGE) }
      st.current.userTouched = true
    }
  }, [controls])

  const randomize = () => {
    controls.registerInteraction()
    const s = st.current
    s.userTouched = true
    const r = 0.3 + 1.05 * Math.sqrt(Math.random())
    const a = Math.random() * Math.PI * 2
    s.start = { re: r * Math.cos(a), im: r * Math.sin(a) }
  }

  const reset = () => {
    controls.registerInteraction()
    const s = st.current
    s.userTouched = true
    s.start = { ...DEFAULT_START }
  }

  const pointToComplex = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const p = st.current.plot
    const re = ((clientX - rect.left - p.cx) / (p.size / 2)) * RANGE
    const im = -((clientY - rect.top - p.cy) / (p.size / 2)) * RANGE
    return { re: clamp(re, -RANGE, RANGE), im: clamp(im, -RANGE, RANGE) }
  }

  // 主循环：渐进渲染收敛盆地 + 起点路径 + 自动巡游演示
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const frame = (now: number) => {
      const s = st.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const dt = s.lastNow ? Math.min((now - s.lastNow) / 1000, 0.05) : 0
      s.lastNow = now

      const mobile = w < 720
      const size = mobile ? Math.min(w * 0.94, h * 0.52) : Math.min(w * 0.58, h * 0.68)
      const cx = mobile ? w / 2 : w / 2 - 36
      const cy = mobile ? h * 0.57 : h * 0.55
      s.plot = { cx, cy, size }
      const left = cx - size / 2
      const top = cy - size / 2

      // ---- 渐进渲染盆地（低分辨率先行，逐帧加密）----
      const b = s.basin
      const key = `${Math.round(size)}@${dpr}`
      if (b.key !== key) {
        b.key = key
        b.stage = 0
        b.row = 0
        b.img = null
        b.off = null
        b.done = false
      }
      if (!b.done) {
        const base = Math.max(1, Math.ceil((size * dpr) / 560))
        const cell = b.stage === 0 ? base * 6 : b.stage === 1 ? base * 2 : base
        const gridW = Math.max(2, Math.round((size * dpr) / cell))
        if (!b.img || !b.off || b.gridW !== gridW) {
          b.gridW = gridW
          b.gridH = gridW
          b.img = new ImageData(gridW, gridW)
          b.off = document.createElement('canvas')
          b.off.width = gridW
          b.off.height = gridW
          b.row = 0
        }
        const img = b.img
        const gridH = b.gridH
        // 海报模式：带深链参数时一帧算完当前阶段，不再渐进
        const posterMode = typeof window !== 'undefined' && /[?&](re|im|full)=/.test(window.location.search)
        const rowsThisFrame = posterMode ? gridH : Math.max(3, Math.ceil(gridH / 20))
        const rowEnd = Math.min(gridH, b.row + rowsThisFrame)
        for (let gy = b.row; gy < rowEnd; gy += 1) {
          const im = RANGE - (2 * RANGE * gy) / (gridH - 1)
          for (let gx = 0; gx < gridW; gx += 1) {
            const re = -RANGE + (2 * RANGE * gx) / (gridW - 1)
            const res = solveNewton(re, im, null)
            const idx = (gy * gridW + gx) * 4
            if (res.root < 0) {
              // 未收敛：暗红，标记方法失效区
              img.data[idx] = 110
              img.data[idx + 1] = 36
              img.data[idx + 2] = 44
              img.data[idx + 3] = 255
            } else {
              const c = BASIN[res.root]
              const k = 0.16 + 0.84 * (1 - Math.min(res.iters, 42) / 52) // 收敛越快越亮
              img.data[idx] = Math.round(c[0] * k)
              img.data[idx + 1] = Math.round(c[1] * k)
              img.data[idx + 2] = Math.round(c[2] * k)
              img.data[idx + 3] = 255
            }
          }
        }
        b.off.getContext('2d')!.putImageData(img, 0, 0)
        b.row = rowEnd
        if (b.row >= gridH) {
          if (b.stage < 2) {
            b.stage += 1
            b.row = 0
            b.img = null
          } else {
            b.done = true
          }
        }
      }

      // ---- 自动巡游：用户碰过之前，起点自己走动演示 ----
      if (!s.userTouched && !s.dragging) {
        s.wander += dt
        s.start = {
          re: 0.92 * Math.cos(s.wander * 0.5),
          im: 0.88 * Math.sin(s.wander * 0.37 + 1.1),
        }
      }

      // ---- 起点的迭代路径 ----
      const path: Array<number> = [s.start.re, s.start.im]
      const res = solveNewton(s.start.re, s.start.im, path)
      const boundary = res.iters > BOUNDARY_ITER

      const hudKey = `${s.start.re.toFixed(3)}|${s.start.im.toFixed(3)}|${res.iters}|${res.root}`
      if (hudKey !== s.hudKey) {
        s.hudKey = hudKey
        setHud({ re: s.start.re, im: s.start.im, iters: res.iters, root: res.root, boundary })
      }

      // ---- 绘制 ----
      ctx.fillStyle = '#05070f'
      ctx.fillRect(0, 0, w, h)

      if (b.off) {
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(b.off, left, top, size, size)
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'
      ctx.lineWidth = 1
      ctx.strokeRect(left - 0.5, top - 0.5, size + 1, size + 1)

      const toPx = (re: number, im: number) => ({
        x: cx + (re / RANGE) * (size / 2),
        y: cy - (im / RANGE) * (size / 2),
      })

      // 坐标轴（实轴 / 虚轴）
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(left, cy)
      ctx.lineTo(left + size, cy)
      ctx.moveTo(cx, top)
      ctx.lineTo(cx, top + size)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(226,232,240,0.6)'
      ctx.font = `600 ${mobile ? 9 : 10.5}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(tx('Re'), left + size - 22, cy - 7)
      ctx.fillText(tx('Im'), cx + 7, top + 14)

      // 大字公式：方程本体
      ctx.textAlign = 'center'
      ctx.fillStyle = '#e8eef7'
      ctx.font = `800 ${mobile ? 22 : 30}px ui-monospace, monospace`
      ctx.fillText(tx('z³ − 1 = 0'), cx, top - (mobile ? 40 : 46))
      ctx.fillStyle = 'rgba(148,163,184,0.85)'
      ctx.font = `600 ${mobile ? 10 : 12.5}px ui-monospace, monospace`
      ctx.fillText(tx('牛顿迭代  z ← z − (z³−1)/(3z²)'), cx, top - (mobile ? 20 : 20))

      // 三个根
      for (let r = 0; r < 3; r += 1) {
        const p = toPx(ROOTS[r].re, ROOTS[r].im)
        const c = BASIN[r]
        if (res.root === r) {
          const pulse = 15 + 3 * Math.sin(now / 210)
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, mobile ? 8 : 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = 'rgba(232,238,247,0.95)'
        ctx.font = `700 ${mobile ? 10 : 12}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(tx(ROOT_LABELS[r]), p.x, p.y + (mobile ? 22 : 26))
      }

      // 迭代路径（白色折线 + 步点）
      if (path.length >= 4) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.lineWidth = 1.8
        ctx.shadowColor = 'rgba(255,255,255,0.6)'
        ctx.shadowBlur = 6
        ctx.beginPath()
        for (let i = 0; i < path.length; i += 2) {
          const p = toPx(path[i], path[i + 1])
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        for (let i = 2; i < path.length; i += 2) {
          const p = toPx(path[i], path[i + 1])
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // 起点手柄（白色大圆 + 外环）
      const hp = toPx(s.start.re, s.start.im)
      ctx.fillStyle = 'rgba(255,255,255,0.96)'
      ctx.strokeStyle = boundary ? RED : 'rgba(5,7,15,0.9)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, mobile ? 11 : 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = boundary ? 'rgba(255,107,107,0.85)' : 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, mobile ? 18 : 21, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // 手柄旁的步数标签（靠近边界变红）
      const tag = res.root < 0 ? `未收敛 · ${res.iters} 步` : `${res.iters} 步 → 根 ${res.root + 1}`
      ctx.font = `700 ${mobile ? 11 : 12.5}px ui-monospace, monospace`
      const tagW = ctx.measureText(tag).width + 18
      const tagX = clamp(hp.x - tagW / 2, 8, w - tagW - 8)
      const tagY = hp.y - (mobile ? 46 : 50)
      ctx.fillStyle = 'rgba(4,8,14,0.82)'
      ctx.strokeStyle = boundary ? 'rgba(255,107,107,0.7)' : 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(tagX, tagY, tagW, 24, 12)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = boundary ? RED : '#e8eef7'
      ctx.textAlign = 'center'
      ctx.fillText(tx(tag), tagX + tagW / 2, tagY + 16)

      // 底部图例
      ctx.fillStyle = 'rgba(148,163,184,0.75)'
      ctx.font = `600 ${mobile ? 9.5 : 11}px system-ui, sans-serif`
      ctx.fillText(tx('每个像素 = 一个起点 · 颜色 = 收敛到的根 · 明暗 = 收敛快慢'), cx, top + size + (mobile ? 20 : 26))

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('这张彩图从哪来？'),
      body: tx('不是画家涂的。每个像素都是一次「猜答案」的起点：从这儿出发，用牛顿法一步步修正猜测，看最后会落到方程的哪个解。'),
      action: () => {
        st.current.userTouched = true
        st.current.start = { re: 0.92, im: 0.78 }
      },
    },
    {
      title: tx('三个解，三种颜色'),
      body: tx('方程 z³−1=0 有三个解，像三块磁铁。青、黄、紫各守一块地盘——你最终落到哪个解，像素就染成哪种颜色；越亮，说明猜得越快。'),
      action: () => {
        st.current.userTouched = true
        st.current.start = { re: 0.7, im: 0.2 }
      },
    },
    {
      title: tx('白线是修正的脚步'),
      body: tx('拖动白色起点：折线记录每一次修正。多数起点几步就扑进某个解；越靠近颜色交界，犹豫越久、折线越长。'),
      action: () => {
        st.current.userTouched = true
        st.current.start = { re: -0.3, im: 0.65 }
      },
    },
    {
      title: tx('边界为何撕成碎纹？'),
      body: tx('两种颜色交界处，起点只差一丝，最后可能扑向完全不同的解。无论放大多少倍，三种颜色永远纠缠——这就是分形边界。'),
      action: () => {
        const s = st.current
        s.userTouched = true
        s.start = { re: 0.06, im: 0.12 }
      },
    },
    {
      title: tx('自己拖一把'),
      body: tx('退出故事后，拖动白色圆点，或点随机起点。看路径如何扑向某个解，以及交界处如何突然「变心」。'),
      action: () => {
        st.current.userTouched = true
        st.current.start = { re: 0.5, im: -0.55 }
      },
    },
  ]

  const imSign = hud.im >= 0 ? '+' : '−'
  const rootClass = hud.root === 0 ? 'is-cyan' : hud.root === 1 ? 'is-yellow' : hud.root === 2 ? 'is-purple' : 'is-red'

  return (
    <div className={`oss-experience nfrac-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="nfrac-canvas"
        style={{ cursor: st.current.dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(e) => {
          controls.registerInteraction()
          const s = st.current
          s.userTouched = true
          s.dragging = true
          ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
          const p = pointToComplex(e.clientX, e.clientY)
          if (p) s.start = p
        }}
        onPointerMove={(e) => {
          const s = st.current
          if (!s.dragging) return
          const p = pointToComplex(e.clientX, e.clientY)
          if (p) s.start = p
        }}
        onPointerUp={() => {
          st.current.dragging = false
        }}
        onPointerCancel={() => {
          st.current.dragging = false
        }}
      />

      {!storyMode && (
        <header className="nfrac-question" data-experience-overlay="true">
          <h1>{tx('猜错起点，答案会跳到另一边')}</h1>
          <p>{tx('每个像素用牛顿法解 z³−1=0：颜色表示落到哪个解，白线是修正路径。拖动白色起点试试。')}</p>
          <button type="button" className="nfrac-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx('为什么')}
          </button>
        </header>
      )}

      <aside className="nfrac-readout" data-experience-overlay="true">
        <div className="nfrac-readout-row">
          <small>{tx("起点")}</small>
          <strong>
            {tx(hud.re.toFixed(2))} {tx(imSign)} {tx(Math.abs(hud.im).toFixed(2))}i
          </strong>
        </div>
        <div className="nfrac-readout-row">
          <small>{tx("迭代步数")}</small>
          <strong className={hud.boundary ? 'is-red' : 'is-cyan'}>{tx(hud.iters)}</strong>
        </div>
        <div className="nfrac-readout-row">
          <small>{tx("收敛到")}</small>
          <strong className={rootClass}>{tx(hud.root < 0 ? '未收敛' : `根 ${hud.root + 1}`)}</strong>
        </div>
        {hud.root < 0 && (
          <div className="nfrac-critical">
            <Warning weight="fill" /> {tx("未收敛：牛顿法在这个起点附近失效了。")}</div>
        )}
        {hud.boundary && (
          <div className="nfrac-critical">
            <Warning weight="fill" /> {tx("分形边界：")}{tx(hud.iters)} {tx("步才收敛，起点差一丝结果就不同。")}</div>
        )}
      </aside>

      {!storyMode && (
        <Freebar
          className="nfrac-freebar"
          mainClassName="nfrac-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondary={(
            <button
              type="button"
              className="experience-freebar-story"
              onClick={() => {
                controls.registerInteraction()
                enterStory()
                replayGuide('newton-fractal')
              }}
              aria-label={tx('重播故事')}
            >
              <FilmStrip weight="fill" aria-hidden="true" />
              <span>{tx('故事')}</span>
            </button>
          )}
        >
          <div className="experience-freebar-actions nfrac-transport">
            <button type="button" className="nfrac-icon-btn" aria-label={tx('随机起点')} onClick={randomize}>
              <Shuffle weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="nfrac-icon-btn experience-freebar-reset"
              aria-label={tx('重置起点')}
              onClick={reset}
            >
              <ArrowCounterClockwise weight="bold" aria-hidden="true" />
            </button>
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="nfrac-why" role="dialog" aria-label={tx("牛顿分形原理解释")} data-experience-overlay="true">
          <div className="nfrac-why-card">
            <button type="button" className="nfrac-why-close" onClick={() => setWhyOpen(false)} aria-label={tx("关闭")}>
              <X weight="bold" />
            </button>
            <h2>{tx("边界为什么是分形？")}</h2>
            <p>
              {tx("牛顿法解 f(z) = 0：从猜测 z 出发，沿切线方向逼近根，迭代式是")}{tx(' ')}
              <strong>z ← z − f(z)/f′(z)</strong>{tx("。对 z³ − 1 来说就是 z ← z − (z³−1)/(3z²)。 大多数起点几步内就掉进某个根——这就是画面里大片纯色的收敛盆地。")}</p>
            <p>
              {tx("但在盆地的交界处，迭代会在几个根之间反复「犹豫」，路径拉得很长。数学上可以证明： 这些边界点构成的集合恰好是该映射的")}<span className="is-purple">{tx("Julia 集")}</span>{tx("—— 无论放大多少倍都同样纠缠，是真正的分形。边界上任意小的扰动都会改变最终归宿， 这就是「对初始条件的敏感依赖」。")}</p>
            <p>
              <span className="is-red">{tx("边界条件：")}</span>{tx("牛顿法并非万能：导数为 0 的点（这里是 z = 0）会让迭代飞出去； 高次或震荡的函数还可能出现完全不收敛的混沌轨道。这时需要更好的初值估计、阻尼牛顿法或别的求根算法。")}</p>
            <small>{tx("延伸阅读：Wikipedia 牛顿分形（Newton fractal）· Julia 集 · 牛顿迭代法")}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="newton-fractal"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'monumental' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'normal', treatment: 'editorial', cue: 'up' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'fade', tone: 'light', width: 'narrow', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'scale', tone: 'light', width: 'wide', treatment: 'editorial' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'annotation' },
        ]}
        showReplayChip={false}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="newton-fractal"
          gesture={{ type: 'drag', target: '.nfrac-canvas', dx: 110, dy: -80, label: tx('拖动白色起点，看它扑向哪个解') }}
        />
      )}
    </div>
  )
}
