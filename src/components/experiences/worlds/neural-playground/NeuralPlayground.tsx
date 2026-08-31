import './styles/ExperienceHud.css'
import './styles/NeuralPlayground.css'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowCounterClockwise,
  ChartLine,
  DiceFive,
  Minus,
  Pause,
  Play,
  Plus,
  SkipForward,
  Sparkle,
  FilmStrip,
} from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar, FreebarTabs } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n, type ExperienceTextTranslator } from '~/i18n/experience'

/* ------------------------------------------------------------------ */
/* 类型与常量                                                          */
/* ------------------------------------------------------------------ */

type Point = { x: number; y: number; label: 0 | 1 }
type Sample = { v: number[]; label: 0 | 1; p: Point }
type DatasetType = 'circle' | 'xor' | 'spiral' | 'gaussian' | 'moons'
type ActivationType = 'tanh' | 'relu' | 'sigmoid'
type FeatureKey = 'x1' | 'x2' | 'x1sq' | 'x2sq' | 'x1x2' | 'sinX1' | 'sinX2'
type Pulse = { l: number; from: number; to: number; t0: number; dur: number }
type NodePos = { x: number; y: number }
type History = { train: number[]; test: number[] }
type Stats = {
  epoch: number
  trainLoss: number | null
  testLoss: number | null
  trainAcc: number
  testAcc: number
}

const POINT_COUNT = 240
const HEAT_RES = 110
const HISTORY_MAX = 160
const DOMAIN = 6

const DATASETS: { key: DatasetType; label: string }[] = [
  { key: 'circle', label: '环形' },
  { key: 'xor', label: '异或' },
  { key: 'spiral', label: '螺旋' },
  { key: 'gaussian', label: '高斯' },
  { key: 'moons', label: '月牙' },
]

const FEATURE_DEFS: { key: FeatureKey; label: string }[] = [
  { key: 'x1', label: 'x₁' },
  { key: 'x2', label: 'x₂' },
  { key: 'x1sq', label: 'x₁²' },
  { key: 'x2sq', label: 'x₂²' },
  { key: 'x1x2', label: 'x₁·x₂' },
  { key: 'sinX1', label: 'sin(x₁)' },
  { key: 'sinX2', label: 'sin(x₂)' },
]

const CLASS_BLUE = { r: 77, g: 171, b: 247 }
const CLASS_ORANGE = { r: 255, g: 169, b: 77 }
const BOUNDARY_TINT = { r: 24, g: 32, b: 50 }

/* ------------------------------------------------------------------ */
/* 随机数与数据集                                                      */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rng: () => number) {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function generateDataset(type: DatasetType, count: number, noise: number, rng: () => number): Point[] {
  const points: Point[] = []
  const rand = () => rng() * 2 - 1
  const jitter = (scale = 2) => gauss(rng) * noise * scale
  const push = (x: number, y: number, label: 0 | 1) => {
    points.push({ x: clamp(x, -5.9, 5.9), y: clamp(y, -5.9, 5.9), label })
  }

  switch (type) {
    case 'circle':
      for (let i = 0; i < count; i++) {
        const x = rand() * 6 + jitter()
        const y = rand() * 6 + jitter()
        push(x, y, x * x + y * y > 10.2 ? 1 : 0)
      }
      break
    case 'xor':
      for (let i = 0; i < count; i++) {
        const x = rand() * 6 + jitter()
        const y = rand() * 6 + jitter()
        push(x, y, x * y > 0 ? 1 : 0)
      }
      break
    case 'spiral': {
      const half = Math.floor(count / 2)
      for (let i = 0; i < half; i++) {
        const f = i / half
        const r = f * 4.6 + 0.4
        const t = f * 2.1 * Math.PI
        push(r * Math.sin(t) + jitter(1.4), r * Math.cos(t) + jitter(1.4), 0)
        push(r * Math.sin(t + Math.PI) + jitter(1.4), r * Math.cos(t + Math.PI) + jitter(1.4), 1)
      }
      break
    }
    case 'gaussian': {
      const sigma = 1.25 + noise * 1.4
      for (let i = 0; i < count; i++) {
        const label = i % 2 === 0 ? 0 : 1
        const c = label === 0 ? -2.6 : 2.6
        push(c + gauss(rng) * sigma, c + gauss(rng) * sigma, label)
      }
      break
    }
    case 'moons':
      for (let i = 0; i < count; i++) {
        const theta = rng() * Math.PI
        if (i % 2 === 0) push(4 * Math.cos(theta) - 2 + jitter(1.2), 4 * Math.sin(theta) + jitter(1.2), 0)
        else push(2 - 4 * Math.cos(theta) + jitter(1.2), 2 - 4 * Math.sin(theta) + jitter(1.2), 1)
      }
      break
  }
  return points
}

function buildFeatures(nx: number, ny: number, keys: FeatureKey[]): number[] {
  const out: number[] = []
  for (const k of keys) {
    switch (k) {
      case 'x1': out.push(nx); break
      case 'x2': out.push(ny); break
      case 'x1sq': out.push(nx * nx); break
      case 'x2sq': out.push(ny * ny); break
      case 'x1x2': out.push(nx * ny); break
      case 'sinX1': out.push(Math.sin(nx * Math.PI)); break
      case 'sinX2': out.push(Math.sin(ny * Math.PI)); break
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 神经网络（mini-batch 梯度下降 + 交叉熵）                             */
/* ------------------------------------------------------------------ */

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x))
}

function activate(x: number, type: ActivationType): number {
  switch (type) {
    case 'tanh': return Math.tanh(x)
    case 'relu': return Math.max(0, x)
    case 'sigmoid': return sigmoid(x)
  }
}

function activateDerivative(z: number, type: ActivationType): number {
  switch (type) {
    case 'tanh': { const t = Math.tanh(z); return 1 - t * t }
    case 'relu': return z > 0 ? 1 : 0
    case 'sigmoid': { const s = sigmoid(z); return s * (1 - s) }
  }
}

class NeuralNetwork {
  layers: number[]
  activation: ActivationType
  weights: number[][][]
  biases: number[][]
  gradW: number[][][]
  gradB: number[][]
  lastA: number[][] = []
  lastZ: number[][] = []
  maxAbsW = 1

  constructor(layers: number[], activation: ActivationType) {
    this.layers = layers
    this.activation = activation
    this.weights = []
    this.biases = []
    this.gradW = []
    this.gradB = []
    for (let i = 0; i < layers.length - 1; i++) {
      const scale = Math.sqrt((activation === 'relu' ? 2 : 1) / layers[i])
      const w: number[][] = []
      for (let j = 0; j < layers[i + 1]; j++) {
        const row: number[] = []
        for (let k = 0; k < layers[i]; k++) row.push((Math.random() * 2 - 1) * scale)
        w.push(row)
      }
      this.weights.push(w)
      this.biases.push(Array.from({ length: layers[i + 1] }, () => 0))
      this.gradW.push(w.map((row) => row.map(() => 0)))
      this.gradB.push(Array.from({ length: layers[i + 1] }, () => 0))
    }
    this.refreshMaxAbs()
  }

  private refreshMaxAbs() {
    let m = 0.3
    for (const lw of this.weights) {
      for (const row of lw) {
        for (const w of row) {
          const a = Math.abs(w)
          if (a > m) m = a
        }
      }
    }
    this.maxAbsW = m
  }

  forward(input: number[], trace = false): number {
    let a = input
    if (trace) {
      this.lastA = [input]
      this.lastZ = []
    }
    for (let i = 0; i < this.weights.length; i++) {
      const isOut = i === this.weights.length - 1
      const z: number[] = []
      const next: number[] = []
      for (let j = 0; j < this.weights[i].length; j++) {
        let sum = this.biases[i][j]
        const w = this.weights[i][j]
        for (let k = 0; k < a.length; k++) sum += w[k] * a[k]
        z.push(sum)
        next.push(isOut ? sigmoid(sum) : activate(sum, this.activation))
      }
      if (trace) {
        this.lastZ.push(z)
        this.lastA.push(next)
      }
      a = next
    }
    return a[0]
  }

  backward(target: number) {
    const A = this.lastA
    const Z = this.lastZ
    const L = this.weights.length
    let delta = [A[L][0] - target]
    this.accumulate(L - 1, delta)
    for (let i = L - 2; i >= 0; i--) {
      const next: number[] = []
      for (let j = 0; j < this.weights[i].length; j++) {
        let sum = 0
        for (let k = 0; k < delta.length; k++) sum += this.weights[i + 1][k][j] * delta[k]
        next.push(sum * activateDerivative(Z[i][j], this.activation))
      }
      delta = next
      this.accumulate(i, delta)
    }
  }

  private accumulate(i: number, delta: number[]) {
    const aPrev = this.lastA[i]
    for (let j = 0; j < delta.length; j++) {
      this.gradB[i][j] += delta[j]
      for (let k = 0; k < aPrev.length; k++) this.gradW[i][j][k] += delta[j] * aPrev[k]
    }
  }

  applyGrads(lr: number, scale: number) {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        for (let k = 0; k < this.weights[i][j].length; k++) {
          this.weights[i][j][k] -= lr * scale * this.gradW[i][j][k]
          this.gradW[i][j][k] = 0
        }
        this.biases[i][j] -= lr * scale * this.gradB[i][j]
        this.gradB[i][j] = 0
      }
    }
    this.refreshMaxAbs()
  }
}

function crossEntropy(p: number, y: number) {
  const c = clamp(p, 1e-7, 1 - 1e-7)
  return -(y * Math.log(c) + (1 - y) * Math.log(1 - c))
}

function runEpoch(net: NeuralNetwork, samples: Sample[], lr: number, batchSize: number) {
  const idx = samples.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const tmp = idx[i]
    idx[i] = idx[j]
    idx[j] = tmp
  }
  for (let b = 0; b < idx.length; b += batchSize) {
    let n = 0
    const end = Math.min(b + batchSize, idx.length)
    for (let k = b; k < end; k++) {
      const s = samples[idx[k]]
      net.forward(s.v, true)
      net.backward(s.label)
      n++
    }
    net.applyGrads(lr, 1 / Math.max(1, n))
  }
}

function evaluate(net: NeuralNetwork, samples: Sample[]) {
  if (samples.length === 0) return { loss: 0, acc: 0 }
  let loss = 0
  let correct = 0
  for (const s of samples) {
    const p = net.forward(s.v)
    loss += crossEntropy(p, s.label)
    if ((p > 0.5 ? 1 : 0) === s.label) correct++
  }
  return { loss: loss / samples.length, acc: correct / samples.length }
}

/* ------------------------------------------------------------------ */
/* 绘制辅助                                                            */
/* ------------------------------------------------------------------ */

type Rgb = { r: number; g: number; b: number }

function mixColor(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t }
}

function rgba(c: Rgb, alpha: number) {
  return `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${alpha})`
}

const MONO_FONT = '"SF Mono", ui-monospace, Menlo, Consolas, monospace'
const SANS_FONT = 'Manrope, system-ui, sans-serif'

function fitCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return false
  const W = Math.round(w * dpr)
  const H = Math.round(h * dpr)
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W
    canvas.height = H
    canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }
  return false
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function recomputeHeat(net: NeuralNetwork, keys: FeatureKey[], heat: HTMLCanvasElement) {
  const ctx = heat.getContext('2d')!
  const img = ctx.createImageData(HEAT_RES, HEAT_RES)
  for (let py = 0; py < HEAT_RES; py++) {
    const ny = 1 - ((py + 0.5) / HEAT_RES) * 2
    for (let px = 0; px < HEAT_RES; px++) {
      const nx = ((px + 0.5) / HEAT_RES) * 2 - 1
      const prob = net.forward(buildFeatures(nx, ny, keys))
      const d = Math.abs(prob - 0.5) * 2
      const base = mixColor(CLASS_BLUE, CLASS_ORANGE, prob)
      const c = mixColor(base, BOUNDARY_TINT, (1 - d) * 0.86)
      const i = (py * HEAT_RES + px) * 4
      img.data[i] = c.r
      img.data[i + 1] = c.g
      img.data[i + 2] = c.b
      img.data[i + 3] = 42 + 186 * d
    }
  }
  ctx.putImageData(img, 0, 0)
}

function boundaryFrame(w: number, h: number) {
  const size = Math.min(w, h) - 8
  return { size, ox: (w - size) / 2, oy: (h - size) / 2 }
}

function drawBoundary(
  canvas: HTMLCanvasElement,
  heat: HTMLCanvasElement,
  train: Sample[],
  test: Sample[],
  net: NeuralNetwork,
  keys: FeatureKey[],
  probe: { x: number; y: number } | null,
  now: number,
) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(3,6,13,0.85)'
  ctx.fillRect(0, 0, w, h)

  const { size, ox, oy } = boundaryFrame(w, h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(heat, ox, oy, size, size)
  ctx.strokeStyle = 'rgba(148,184,255,0.14)'
  ctx.lineWidth = 1
  ctx.strokeRect(ox + 0.5, oy + 0.5, size - 1, size - 1)

  const toPx = (p: Point) => ({ cx: ox + ((p.x + DOMAIN) / (DOMAIN * 2)) * size, cy: oy + ((DOMAIN - p.y) / (DOMAIN * 2)) * size })
  const missAlpha = 0.34 + 0.28 * Math.sin(now / 280)

  for (const s of test) {
    const { cx, cy } = toPx(s.p)
    ctx.beginPath()
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(4,8,16,0.72)'
    ctx.fill()
    ctx.strokeStyle = rgba(s.label === 1 ? CLASS_ORANGE : CLASS_BLUE, 0.95)
    ctx.lineWidth = 1.6
    ctx.stroke()
  }
  for (const s of train) {
    const { cx, cy } = toPx(s.p)
    ctx.beginPath()
    ctx.arc(cx, cy, 3.6, 0, Math.PI * 2)
    ctx.fillStyle = rgba(s.label === 1 ? CLASS_ORANGE : CLASS_BLUE, 0.96)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.save()
  ctx.shadowColor = '#ff6b6b'
  ctx.shadowBlur = 5
  ctx.strokeStyle = `rgba(255,107,107,${missAlpha})`
  ctx.lineWidth = 1.4
  for (const s of [...train, ...test]) {
    const pred = net.forward(s.v) > 0.5 ? 1 : 0
    if (pred === s.label) continue
    const { cx, cy } = toPx(s.p)
    ctx.beginPath()
    ctx.arc(cx, cy, 6.2, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  if (probe) {
    const { cx, cy } = toPx({ x: probe.x, y: probe.y, label: 0 })
    const pulse = 4.5 + 1.5 * Math.sin(now / 240)
    ctx.save()
    ctx.strokeStyle = 'rgba(240,248,255,0.95)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy)
    ctx.lineTo(cx - 4, cy)
    ctx.moveTo(cx + 4, cy)
    ctx.lineTo(cx + 12, cy)
    ctx.moveTo(cx, cy - 12)
    ctx.lineTo(cx, cy - 4)
    ctx.moveTo(cx, cy + 4)
    ctx.lineTo(cx, cy + 12)
    ctx.stroke()
    ctx.shadowColor = 'rgba(180,220,255,0.9)'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(cx, cy, pulse + 5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(200,228,255,0.75)'
    ctx.stroke()
    ctx.restore()
  }
}

function layoutGraph(net: NeuralNetwork, w: number, h: number): { pos: NodePos[][]; gaps: number[] } {
  const L = net.layers.length
  const padX = Math.max(30, w * 0.08)
  const padY = clamp(h * 0.16, 24, 48)
  const usable = Math.max(12, h - padY * 2)
  const pos: NodePos[][] = []
  const gaps: number[] = []
  for (let l = 0; l < L; l++) {
    const count = net.layers[l]
    const x = L === 1 ? w / 2 : padX + ((w - padX * 2) * l) / (L - 1)
    const gap = Math.min(56, count > 1 ? usable / (count - 1) : usable)
    gaps.push(gap)
    const col: NodePos[] = []
    for (let j = 0; j < count; j++) col.push({ x, y: h / 2 + (j - (count - 1) / 2) * gap })
    pos.push(col)
  }
  return { pos, gaps }
}

function drawGraph(
  canvas: HTMLCanvasElement,
  net: NeuralNetwork,
  pulses: Pulse[],
  selected: { l: number; j: number } | null,
  featLabels: string[],
  now: number,
  tx: ExperienceTextTranslator,
) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  ctx.clearRect(0, 0, w, h)
  const { pos, gaps } = layoutGraph(net, w, h)
  const L = net.layers.length

  ctx.font = `10px ${SANS_FONT}`
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.38)'
  for (let l = 0; l < L; l++) {
    const name = l === 0 ? '输入层' : l === L - 1 ? '输出层' : `隐藏层 ${l}`
    ctx.fillText(tx(name), pos[l][0].x, 18)
  }

  for (let l = 0; l < L - 1; l++) {
    for (let j = 0; j < net.weights[l].length; j++) {
      for (let k = 0; k < net.weights[l][j].length; k++) {
        const wgt = net.weights[l][j][k]
        const t = Math.min(1, Math.abs(wgt) / net.maxAbsW)
        const hot = selected !== null && selected.l === l + 1 && selected.j === j
        ctx.strokeStyle = wgt >= 0
          ? `rgba(255,169,77,${(hot ? 0.55 : 0.1) + 0.55 * t})`
          : `rgba(77,171,247,${(hot ? 0.55 : 0.1) + 0.55 * t})`
        ctx.lineWidth = (hot ? 1.2 : 0.7) + 3.2 * t
        ctx.beginPath()
        ctx.moveTo(pos[l][k].x, pos[l][k].y)
        ctx.lineTo(pos[l + 1][j].x, pos[l + 1][j].y)
        ctx.stroke()
      }
    }
  }

  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i]
    const f = (now - p.t0) / p.dur
    if (f > 1.3) {
      pulses.splice(i, 1)
      continue
    }
    if (f < 0 || f > 1) continue
    const a = pos[p.l][p.from]
    const b = pos[p.l + 1][p.to]
    const x = a.x + (b.x - a.x) * f
    const y = a.y + (b.y - a.y) * f
    const wgt = net.weights[p.l][p.to][p.from]
    const col = wgt >= 0 ? '255,205,140' : '150,205,255'
    ctx.save()
    ctx.shadowColor = `rgba(${col},0.95)`
    ctx.shadowBlur = 8
    ctx.fillStyle = `rgba(${col},${0.9 * (1 - f * 0.35)})`
    ctx.beginPath()
    ctx.arc(x, y, 2.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const A = net.lastA
  for (let l = 0; l < L; l++) {
    for (let j = 0; j < net.layers[l]; j++) {
      const { x, y } = pos[l][j]
      const isOut = l === L - 1
      const R = Math.max(4.5, Math.min(isOut ? 14 : 11, gaps[l] * 0.4))
      const raw = A[l]?.[j] ?? 0
      const v = isOut ? raw * 2 - 1 : clamp(raw, -1, 1)
      const tint = v >= 0 ? CLASS_ORANGE : CLASS_BLUE
      const fill = mixColor({ r: 10, g: 17, b: 30 }, tint, 0.18 + 0.72 * Math.abs(v))
      const isSel = selected !== null && selected.l === l && selected.j === j
      ctx.save()
      ctx.shadowColor = rgba(tint, 0.55 + 0.4 * Math.abs(v))
      ctx.shadowBlur = 13
      ctx.beginPath()
      ctx.arc(x, y, R, 0, Math.PI * 2)
      ctx.fillStyle = rgba(fill, 0.98)
      ctx.fill()
      ctx.restore()
      ctx.beginPath()
      ctx.arc(x, y, R, 0, Math.PI * 2)
      ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(226,238,255,0.5)'
      ctx.lineWidth = isSel ? 2 : 1.1
      ctx.stroke()

      if (l === 0 && featLabels[j]) {
        ctx.font = `10px ${MONO_FONT}`
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillText(tx(featLabels[j]), x, y + R + 14)
      }
      if (isOut) {
        ctx.font = `11px ${SANS_FONT}`
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(tx('ŷ'), x, y - R - 7)
      }
    }
  }

  if (selected && pos[selected.l]?.[selected.j]) {
    const sp = pos[selected.l][selected.j]
    const aVal = A[selected.l]?.[selected.j] ?? 0
    const bias = selected.l > 0 ? net.biases[selected.l - 1][selected.j] : 0
    const layerName = selected.l === 0 ? '输入层' : selected.l === L - 1 ? '输出层' : `隐藏层 ${selected.l}`
    const lines = [
      `${layerName} · 节点 ${selected.j + 1}`,
      `激活 ${aVal.toFixed(3)}`,
      selected.l > 0 ? `偏置 ${bias.toFixed(3)}` : '原始输入特征',
    ]
    ctx.font = `10px ${MONO_FONT}`
    const tw = Math.max(...lines.map((t) => ctx.measureText(t).width))
    const bw = tw + 20
    const bh = lines.length * 15 + 14
    const bx = clamp(sp.x + 18, 6, w - bw - 6)
    const by = clamp(sp.y - bh / 2, 6, h - bh - 6)
    roundRectPath(ctx, bx, by, bw, bh, 8)
    ctx.fillStyle = 'rgba(5,9,18,0.94)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(148,184,255,0.35)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.textAlign = 'left'
    lines.forEach((t, i) => {
      ctx.fillStyle = i === 0 ? 'rgba(235,243,255,0.92)' : 'rgba(255,255,255,0.6)'
      ctx.fillText(tx(t), bx + 10, by + 18 + i * 15)
    })
  }
}

function drawLossChart(canvas: HTMLCanvasElement, history: History, tx: ExperienceTextTranslator) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  ctx.clearRect(0, 0, w, h)
  const padL = 40
  const padR = 12
  const padT = 12
  const padB = 16
  const iw = w - padL - padR
  const ih = h - padT - padB
  if (iw <= 4 || ih <= 4) return

  let maxV = 0.05
  for (const v of history.train) if (v > maxV) maxV = v
  for (const v of history.test) if (v > maxV) maxV = v
  maxV *= 1.15

  ctx.font = `9px ${MONO_FONT}`
  ctx.textAlign = 'right'
  for (let g = 0; g <= 2; g++) {
    const y = padT + (ih * g) / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padL, y)
    ctx.lineTo(w - padR, y)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText((maxV * (1 - g / 2)).toFixed(3), padL - 6, y + 3)
  }

  if (history.train.length < 2) {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.font = `11px ${SANS_FONT}`
    ctx.fillText(tx('点击「训练」，观察损失曲线实时下降'), padL + iw / 2, padT + ih * 0.68)
    return
  }

  const xAt = (i: number) => padL + (i / (HISTORY_MAX - 1)) * iw
  const yAt = (v: number) => padT + ih - (v / maxV) * ih
  const drawLine = (data: number[], color: string) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.8
    ctx.lineJoin = 'round'
    ctx.shadowColor = color
    ctx.shadowBlur = 5
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = xAt(i)
      const y = yAt(v)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.restore()
    const lastX = xAt(data.length - 1)
    const lastY = yAt(data[data.length - 1])
    ctx.beginPath()
    ctx.arc(lastX, lastY, 2.6, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
  drawLine(history.train, '#6fb6ff')
  drawLine(history.test, '#ffa94d')
}

function drawStars(canvas: HTMLCanvasElement) {
  if (!fitCanvas(canvas)) return
  const ctx = canvas.getContext('2d')!
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const rng = mulberry32(20260717)
  ctx.clearRect(0, 0, w, h)
  for (let i = 0; i < 170; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = 0.3 + rng() * 1.1
    const a = 0.1 + rng() * 0.65
    const tint = rng()
    const color = tint < 0.8 ? '214,230,255' : tint < 0.94 ? '255,226,190' : '150,196,255'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color},${a})`
    ctx.fill()
  }
  for (let i = 0; i < 9; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = 3.5 + rng() * 5
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(220,236,255,0.75)')
    grad.addColorStop(1, 'rgba(220,236,255,0)')
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  }
}

function spawnWave(net: NeuralNetwork, pulses: Pulse[], now: number) {
  if (pulses.length > 520) return
  const links: Pulse[] = []
  for (let l = 0; l < net.weights.length; l++) {
    for (let to = 0; to < net.weights[l].length; to++) {
      for (let from = 0; from < net.weights[l][to].length; from++) {
        links.push({ l, from, to, t0: now + l * 110, dur: 520 })
      }
    }
  }
  const stride = links.length > 150 ? 2 : 1
  for (let i = 0; i < links.length; i += stride) {
    const link = links[i]
    link.t0 += (link.l * 31 + link.from * 17 + link.to * 13) % 90
    pulses.push(link)
  }
}

/* ------------------------------------------------------------------ */
/* 主组件                                                              */
/* ------------------------------------------------------------------ */

type Preset = {
  label: string
  dataset: DatasetType
  layers: number[]
  activation: ActivationType
  features: FeatureKey[]
  lr: number
  noise: number
}

const PRESETS: Preset[] = [
  { label: '线性可分', dataset: 'gaussian', layers: [4], activation: 'tanh', features: ['x1', 'x2'], lr: 0.1, noise: 0.08 },
  { label: 'XOR 谜题', dataset: 'xor', layers: [4, 4], activation: 'tanh', features: ['x1', 'x2'], lr: 0.1, noise: 0.05 },
  { label: '螺旋', dataset: 'spiral', layers: [6, 6, 4], activation: 'relu', features: ['x1', 'x2', 'x1sq', 'x2sq', 'sinX1', 'sinX2'], lr: 0.05, noise: 0.05 },
]

export function NeuralPlayground({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('neural-playground')
  const [datasetType, setDatasetType] = useState<DatasetType>('circle')
  const [noise, setNoise] = useState(0.1)
  const [split, setSplit] = useState(0.7)
  const [hiddenLayers, setHiddenLayers] = useState<number[]>([4, 4])
  const [activation, setActivation] = useState<ActivationType>('tanh')
  const [learningRate, setLearningRate] = useState(0.1)
  const [batchSize, setBatchSize] = useState(10)
  const [speed, setSpeed] = useState(5)
  const [features, setFeatures] = useState<FeatureKey[]>(['x1', 'x2'])
  const [playing, setPlaying] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('autoplay')
  })
  const [toolTab, setToolTab] = useState<'data' | 'net' | 'train'>('data')
  const [regenNonce, setRegenNonce] = useState(0)
  const [stats, setStats] = useState<Stats>({ epoch: 0, trainLoss: null, testLoss: null, trainAcc: 0, testAcc: 0 })
  const [probeUi, setProbeUi] = useState<{ x: number; y: number; prob: number } | null>(null)

  const orderedFeatures = FEATURE_DEFS.filter((d) => features.includes(d.key)).map((d) => d.key)
  const featuresKey = orderedFeatures.join(',')
  const layersKey = hiddenLayers.join(',')

  const netRef = useRef<NeuralNetwork | null>(null)
  if (netRef.current === null) netRef.current = new NeuralNetwork([2, 4, 4, 1], 'tanh')
  const basePointsRef = useRef<Point[]>([])
  const samplesRef = useRef<{ train: Sample[]; test: Sample[] }>({ train: [], test: [] })
  const historyRef = useRef<History>({ train: [], test: [] })
  const epochRef = useRef(0)
  const lastHistEpochRef = useRef(0)
  const pulsesRef = useRef<Pulse[]>([])
  const selectedNodeRef = useRef<{ l: number; j: number } | null>(null)
  const probeRef = useRef<{ x: number; y: number } | null>(null)
  const heatDirtyRef = useRef(true)
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const boundaryRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<HTMLCanvasElement>(null)
  const lossRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<HTMLCanvasElement>(null)

  const settingsRef = useRef({ playing, learningRate, batchSize, speed })
  settingsRef.current = { playing, learningRate, batchSize, speed }
  const featKeysRef = useRef<FeatureKey[]>(orderedFeatures)
  featKeysRef.current = orderedFeatures
  const splitRef = useRef(split)
  splitRef.current = split

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  function applySplitAndSamples() {
    const pts = basePointsRef.current
    if (pts.length === 0) return
    const keys = featKeysRef.current
    const idx = pts.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      const tmp = idx[i]
      idx[i] = idx[j]
      idx[j] = tmp
    }
    const nTrain = Math.round(pts.length * splitRef.current)
    const train: Sample[] = []
    const test: Sample[] = []
    idx.forEach((pi, i) => {
      const p = pts[pi]
      const s: Sample = { v: buildFeatures(p.x / DOMAIN, p.y / DOMAIN, keys), label: p.label, p }
      if (i < nTrain) train.push(s)
      else test.push(s)
    })
    samplesRef.current = { train, test }
  }

  function refreshStats(push = true) {
    const net = netRef.current!
    const { train, test } = samplesRef.current
    const tr = evaluate(net, train)
    const te = evaluate(net, test)
    const epoch = epochRef.current
    if (push && epoch > lastHistEpochRef.current) {
      lastHistEpochRef.current = epoch
      historyRef.current.train.push(tr.loss)
      historyRef.current.test.push(te.loss)
      if (historyRef.current.train.length > HISTORY_MAX) {
        historyRef.current.train.shift()
        historyRef.current.test.shift()
      }
    }
    setStats({ epoch, trainLoss: tr.loss, testLoss: te.loss, trainAcc: tr.acc, testAcc: te.acc })
    const probe = probeRef.current
    if (probe) {
      const prob = net.forward(buildFeatures(probe.x / DOMAIN, probe.y / DOMAIN, featKeysRef.current))
      setProbeUi({ x: probe.x, y: probe.y, prob })
    }
  }

  const refreshStatsRef = useRef(refreshStats)
  refreshStatsRef.current = refreshStats

  function resetTrainingState() {
    epochRef.current = 0
    lastHistEpochRef.current = 0
    historyRef.current = { train: [], test: [] }
    pulsesRef.current = []
    selectedNodeRef.current = null
    heatDirtyRef.current = true
    refreshStats(false)
  }

  const resetTrainingStateRef = useRef(resetTrainingState)
  resetTrainingStateRef.current = resetTrainingState

  // 数据集：类型 / 噪声 / 重新生成
  useEffect(() => {
    const rng = mulberry32((Math.random() * 1e9) | 0)
    basePointsRef.current = generateDataset(datasetType, POINT_COUNT, noise, rng)
    applySplitAndSamples()
    resetTrainingStateRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetType, noise, regenNonce])

  // 训练 / 测试分割
  useEffect(() => {
    applySplitAndSamples()
    resetTrainingStateRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split])

  // 网络结构 / 激活函数 / 输入特征
  useEffect(() => {
    const keys = featKeysRef.current
    applySplitAndSamples()
    netRef.current = new NeuralNetwork([keys.length, ...layersKey.split(',').map(Number), 1], activation)
    resetTrainingStateRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layersKey, activation, featuresKey])

  // 主循环：训练 + 三个画布的实时渲染
  useEffect(() => {
    const heat = document.createElement('canvas')
    heat.width = HEAT_RES
    heat.height = HEAT_RES
    heatCanvasRef.current = heat

    let raf = 0
    let lastStats = 0
    let lastHeat = 0
    let lastWave = 0

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const s = settingsRef.current
      const net = netRef.current!

      if (s.playing && samplesRef.current.train.length > 0) {
        for (let i = 0; i < s.speed; i++) {
          runEpoch(net, samplesRef.current.train, s.learningRate, s.batchSize)
          epochRef.current += 1
        }
        if (now - lastWave > 300) {
          spawnWave(net, pulsesRef.current, now)
          lastWave = now
        }
      }

      if (now - lastStats > 125) {
        lastStats = now
        refreshStatsRef.current()
        heatDirtyRef.current = true
      }

      if (heatDirtyRef.current && now - lastHeat > 170) {
        lastHeat = now
        recomputeHeat(net, featKeysRef.current, heat)
        heatDirtyRef.current = false
      }

      const stars = starsRef.current
      if (stars) fitCanvas(stars)
      const boundary = boundaryRef.current
      if (boundary && fitCanvas(boundary)) heatDirtyRef.current = true
      const graph = graphRef.current
      if (graph) fitCanvas(graph)
      const lossC = lossRef.current
      if (lossC) fitCanvas(lossC)

      if (boundary) {
        drawBoundary(boundary, heat, samplesRef.current.train, samplesRef.current.test, net, featKeysRef.current, probeRef.current, now)
      }
      if (graph) {
        const keys = featKeysRef.current
        const probe = probeRef.current
        let nx = 0
        let ny = 0
        if (probe) {
          nx = probe.x / DOMAIN
          ny = probe.y / DOMAIN
        } else {
          const s0 = samplesRef.current.train[0] ?? samplesRef.current.test[0]
          if (s0) {
            nx = s0.p.x / DOMAIN
            ny = s0.p.y / DOMAIN
          }
        }
        net.forward(buildFeatures(nx, ny, keys), true)
        const featLabels = FEATURE_DEFS.filter((d) => keys.includes(d.key)).map((d) => d.label)
        drawGraph(graph, net, pulsesRef.current, selectedNodeRef.current, featLabels, now, tx)
      }
      if (lossC) drawLossChart(lossC, historyRef.current, tx)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx])

  // 星空背景：静态绘制 + 尺寸变化重绘
  useEffect(() => {
    const canvas = starsRef.current
    if (!canvas) return
    drawStars(canvas)
    function onResize() {
      if (canvas) drawStars(canvas)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function togglePlay() {
    setPlaying((p) => !p)
  }

  function stepOnce() {
    const net = netRef.current!
    const s = settingsRef.current
    if (samplesRef.current.train.length === 0) return
    runEpoch(net, samplesRef.current.train, s.learningRate, s.batchSize)
    epochRef.current += 1
    spawnWave(net, pulsesRef.current, performance.now())
    heatDirtyRef.current = true
    refreshStats()
  }

  function reset() {
    netRef.current = new NeuralNetwork([orderedFeatures.length, ...hiddenLayers, 1], activation)
    resetTrainingState()
  }

  function regenerate() {
    setRegenNonce((n) => n + 1)
  }

  function addLayer() {
    if (hiddenLayers.length < 4) setHiddenLayers([...hiddenLayers, 4])
  }

  function removeLayer() {
    if (hiddenLayers.length > 1) setHiddenLayers(hiddenLayers.slice(0, -1))
  }

  function setLayerSize(index: number, size: number) {
    const next = [...hiddenLayers]
    next[index] = clamp(size, 1, 8)
    setHiddenLayers(next)
  }

  function toggleFeature(k: FeatureKey) {
    setFeatures((prev) => (prev.includes(k) ? (prev.length > 1 ? prev.filter((f) => f !== k) : prev) : [...prev, k]))
  }

  function applyPreset(p: Preset) {
    setDatasetType(p.dataset)
    setHiddenLayers(p.layers)
    setActivation(p.activation)
    setFeatures(p.features)
    setLearningRate(p.lr)
    setBatchSize(10)
    setNoise(p.noise)
    setRegenNonce((n) => n + 1)
  }

  function handleBoundaryPoint(evt: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = boundaryRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { size, ox, oy } = boundaryFrame(rect.width, rect.height)
    const x = ((evt.clientX - rect.left - ox) / size) * DOMAIN * 2 - DOMAIN
    const y = DOMAIN - ((evt.clientY - rect.top - oy) / size) * DOMAIN * 2
    const next = { x: clamp(x, -DOMAIN, DOMAIN), y: clamp(y, -DOMAIN, DOMAIN) }
    probeRef.current = next
    spawnWave(netRef.current!, pulsesRef.current, performance.now())
    refreshStats(false)
  }

  function handleGraphClick(evt: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = graphRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { pos } = layoutGraph(netRef.current!, rect.width, rect.height)
    const px = evt.clientX - rect.left
    const py = evt.clientY - rect.top
    let best: { l: number; j: number; d: number } | null = null
    pos.forEach((col, l) => {
      col.forEach((p, j) => {
        const d = Math.hypot(p.x - px, p.y - py)
        if (d < 18 && (best === null || d < best.d)) best = { l, j, d }
      })
    })
    if (best) {
      const hit: { l: number; j: number } = { l: (best as { l: number; j: number; d: number }).l, j: (best as { l: number; j: number; d: number }).j }
      const cur = selectedNodeRef.current
      selectedNodeRef.current = cur && cur.l === hit.l && cur.j === hit.j ? null : hit
    } else {
      selectedNodeRef.current = null
    }
  }

  const lrText = learningRate >= 0.095 ? learningRate.toFixed(2) : learningRate.toFixed(3)

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('它怎么学会一条边界'),
      body: tx('彩色区域正在彼此推挤：点训练，看一条边界如何从混乱中长出来，最后贴住这些数据点。这个不断修正的分界，就是网络学到的判断。'),
      action: () => {
        setPlaying(true)
        applyPreset(PRESETS[0])
      },
    },
    {
      title: '换成更难的螺旋',
      body: '直线分不开螺旋。看同一网络如何在更难的数据上卡住或冲破。',
      action: () => {
        applyPreset(PRESETS[2])
        setPlaying(true)
      },
    },
    {
      title: '戳一下决策边界',
      body: '在图上点任意位置，网络图会亮起这一层前向传播。',
      action: () => setPlaying(false),
    },
  ]

  return (
    <div className={`oss-experience neural-playground-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas ref={starsRef} className="neural-stars" aria-hidden="true" />
      <div className="neural-nebula" aria-hidden="true" />

      {!storyMode && (
        <header className="neural-plaque" data-experience-overlay="true">
          <h1>{tx('网络怎样学会「分开两类点」？')}</h1>
          <p>{tx('看决策边界慢慢贴合数据——训练是在拧无数个小旋钮。')}</p>
        </header>
      )}

      {!storyMode && (
        <aside className="neural-readout" data-experience-overlay="true" aria-live="polite">
          <div><small>{tx('轮次')}</small><strong>{stats.epoch}</strong></div>
          <div><small>{tx('训练')}</small><strong>{stats.trainAcc > 0 ? `${Math.round(stats.trainAcc * 100)}%` : '—'}</strong></div>
          <div><small>{tx('测试')}</small><strong>{stats.testAcc > 0 ? `${Math.round(stats.testAcc * 100)}%` : '—'}</strong></div>
        </aside>
      )}

      <div className="neural-main">
          <div className="neural-stage">
            <section className="neural-card">
              <header className="neural-card-header">
                <h3>{tx("决策边界")}</h3>
                <div className="neural-legend" aria-hidden="true">
                  <span><i className="neural-leg-dot is-blue" />{tx("蓝类")}</span>
                  <span><i className="neural-leg-dot is-orange" />{tx("橙类")}</span>
                  <span><i className="neural-leg-ring" />{tx("测试点")}</span>
                  <span><i className="neural-leg-miss" />{tx("误分类")}</span>
                </div>
                <span className="neural-hint">{tx(probeUi ? `探测 (${probeUi.x.toFixed(1)}, ${probeUi.y.toFixed(1)})` : '点击画面探测任意点')}</span>
              </header>
              {probeUi && (
                <div className="neural-probe">
                  <span className={probeUi.prob > 0.5 ? 'neural-probe-chip is-orange' : 'neural-probe-chip is-blue'}>
                    {tx(probeUi.prob > 0.5 ? '橙类' : '蓝类')} {tx((Math.max(probeUi.prob, 1 - probeUi.prob) * 100).toFixed(1))}%
                  </span>
                  <span className="neural-probe-detail">{tx("网络对该点的预测置信度 · 再次点击可移动探测点")}</span>
                </div>
              )}
              <div className="neural-canvas-wrap">
                <canvas
                  ref={boundaryRef}
                  className="neural-boundary-canvas"
                  onPointerDown={(e) => {
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId)
                    } catch {
                      // 合成事件或不支持的指针类型
                    }
                    handleBoundaryPoint(e)
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons > 0) handleBoundaryPoint(e)
                  }}
                />
              </div>
            </section>

            <section className="neural-card">
              <header className="neural-card-header">
                <h3>{tx("网络结构")}</h3>
                <span className="neural-hint">{tx("线宽 ∝ 权重 · 点击节点查看")}</span>
              </header>
              <div className="neural-canvas-wrap">
                <canvas ref={graphRef} className="neural-graph-canvas" onPointerDown={handleGraphClick} />
              </div>
            </section>
          </div>

          <div className="neural-bottom">
            <div className="neural-stats">
              <div className="neural-stat">
                <small>{tx("迭代轮次")}</small>
                <strong>{tx(stats.epoch)}</strong>
              </div>
              <div className="neural-stat">
                <small>{tx("训练损失")}</small>
                <strong>{tx(stats.trainLoss === null ? '—' : stats.trainLoss.toFixed(4))}</strong>
              </div>
              <div className="neural-stat">
                <small>{tx("测试损失")}</small>
                <strong>{tx(stats.testLoss === null ? '—' : stats.testLoss.toFixed(4))}</strong>
              </div>
              <div className="neural-stat">
                <small>{tx("训练准确率")}</small>
                <strong>{tx((stats.trainAcc * 100).toFixed(1))}%</strong>
              </div>
              <div className="neural-stat">
                <small>{tx("测试准确率")}</small>
                <strong>{tx((stats.testAcc * 100).toFixed(1))}%</strong>
              </div>
            </div>
            <section className="neural-card neural-loss-card">
              <header className="neural-card-header">
                <h3><ChartLine /> {tx("损失曲线")}</h3>
                <div className="neural-legend" aria-hidden="true">
                  <span><i className="neural-leg-line is-train" />{tx("训练")}</span>
                  <span><i className="neural-leg-line is-test" />{tx("测试")}</span>
                </div>
              </header>
              <div className="neural-canvas-wrap">
                <canvas ref={lossRef} className="neural-loss-canvas" />
              </div>
            </section>
          </div>
        </div>

      {!storyMode && (
        <Freebar
          className="neural-freebar-shell"
          mainClassName="neural-freebar"
          ariaLabel={tx('探索')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondaryClassName="neural-freebar-secondary"
          secondary={(
            <div className="neural-tray">
              {/* Tab 行：分类 + 重置/故事同栏，不另起行 */}
              <div className="neural-tray-head">
                <FreebarTabs
                  activeId={toolTab}
                  ariaLabel={tx('次级工具')}
                  className="neural-tool-tabs"
                  onChange={setToolTab}
                  tabs={[
                    { id: 'data', label: tx('数据') },
                    { id: 'net', label: tx('网络') },
                    { id: 'train', label: tx('训练') },
                  ]}
                />
                <div className="neural-tray-tools">
                  <button
                    type="button"
                    className="experience-freebar-reset"
                    onClick={() => {
                      controls.registerInteraction()
                      reset()
                    }}
                    aria-label={tx('重置')}
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
                      replayGuide('neural-playground')
                    }}
                    aria-label={tx('重播故事')}
                  >
                    <FilmStrip weight="fill" aria-hidden="true" />
                    <span>{tx('故事')}</span>
                  </button>
                </div>
              </div>

              {/* 内容行：同级短按钮一律一行横滑，禁止竖堆 */}
              {toolTab === 'data' ? (
                <div className="neural-chip-rail experience-freebar-chips" role="group" aria-label={tx('数据集与预设')}>
                  {DATASETS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      className={datasetType === d.key ? 'is-active' : undefined}
                      onClick={() => {
                        controls.registerInteraction()
                        setDatasetType(d.key)
                      }}
                    >
                      {tx(d.label)}
                    </button>
                  ))}
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="neural-preset-chip"
                      onClick={() => {
                        controls.registerInteraction()
                        applyPreset(p)
                        setPlaying(true)
                      }}
                    >
                      {tx(p.label)}
                    </button>
                  ))}
                </div>
              ) : toolTab === 'net' ? (
                <div className="neural-chip-rail experience-freebar-chips" role="group" aria-label={tx('网络结构')}>
                  {FEATURE_DEFS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={features.includes(f.key) ? 'is-active' : undefined}
                      onClick={() => {
                        controls.registerInteraction()
                        toggleFeature(f.key)
                      }}
                    >
                      {tx(f.label)}
                    </button>
                  ))}
                  <button type="button" onClick={removeLayer} disabled={hiddenLayers.length <= 1}>
                    <Minus weight="bold" /> {tx('减层')}
                  </button>
                  <span className="neural-layer-size">{hiddenLayers.length}×{hiddenLayers[0] ?? 4}</span>
                  <button type="button" onClick={addLayer} disabled={hiddenLayers.length >= 4}>
                    <Plus weight="bold" /> {tx('加层')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="neural-chip-rail neural-train-rail" role="group" aria-label={tx('训练参数')}>
                    <div className="neural-seg experience-freebar-seg" role="group" aria-label={tx('激活函数')}>
                      {(['tanh', 'relu', 'sigmoid'] as ActivationType[]).map((a) => (
                        <button
                          key={a}
                          type="button"
                          className={activation === a ? 'is-active' : undefined}
                          aria-pressed={activation === a}
                          onClick={() => {
                            controls.registerInteraction()
                            setActivation(a)
                          }}
                        >
                          {tx(a === 'relu' ? 'ReLU' : a)}
                        </button>
                      ))}
                    </div>
                    <div className="neural-seg experience-freebar-seg" role="group" aria-label={tx('速度')}>
                      {[1, 5, 10, 20].map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={speed === v ? 'is-active' : undefined}
                          aria-pressed={speed === v}
                          onClick={() => {
                            controls.registerInteraction()
                            setSpeed(v)
                          }}
                        >
                          {v}×
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="experience-freebar-field neural-tray-field">
                    <div>
                      <span>{tx('学习率')}</span>
                      <strong>{lrText}</strong>
                    </div>
                    <input
                      type="range"
                      min={-3}
                      max={0}
                      step={0.05}
                      value={Math.log10(learningRate)}
                      onChange={(e) => {
                        controls.registerInteraction()
                        setLearningRate(Math.pow(10, Number(e.target.value)))
                      }}
                      aria-label={tx('学习率')}
                    />
                  </label>
                </>
              )}
            </div>
          )}
        >
          <button
            type="button"
            className="experience-freebar-play neural-play"
            data-playing={playing ? 'true' : 'false'}
            onClick={() => {
              controls.registerInteraction()
              togglePlay()
            }}
            aria-label={playing ? tx('暂停') : tx('播放')}
          >
            {playing
              ? <Pause weight="fill" aria-hidden="true" />
              : <Play weight="fill" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="neural-step"
            onClick={() => {
              controls.registerInteraction()
              stepOnce()
            }}
            disabled={playing}
            aria-label={tx('单步')}
          >
            <SkipForward weight="bold" aria-hidden="true" />
            {tx('单步')}
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId="neural-playground"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'scale', tone: 'light', width: 'narrow', treatment: 'annotation', cue: 'left' },
        ]}
        showReplayChip={false}
        onExit={() => {
          enterFree()
          setPlaying(true)
        }}
      />
      {!storyMode && (
        <GhostHint worldId="neural-playground" gesture={{ type: 'tap', target: '.experience-freebar-play', label: tx('点播放，看边界成形') }} />
      )}
    </div>
  )
}
