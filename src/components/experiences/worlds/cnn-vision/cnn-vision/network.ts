/**
 * LeNet-style MNIST CNN forward pass.
 * Adapted from Purna94/cnn-3d-visualization (MIT).
 * Architecture: Conv5×5-8 → ReLU → MaxPool2 → Conv5×5-16 → ReLU → MaxPool2 → Dense-10 → Softmax
 */

export type LayerId = 'input' | 'conv1' | 'pool1' | 'conv2' | 'pool2' | 'fc'

export type CnnWeights = {
  'conv1.weight': number[][][][]
  'conv1.bias': number[]
  'conv2.weight': number[][][][]
  'conv2.bias': number[]
  'fc.weight': number[][]
  'fc.bias': number[]
}

export type Activations = {
  input: number[][][] // [1][28][28] raw 0..1
  conv1: number[][][] // [8][24][24]
  pool1: number[][][] // [8][12][12]
  conv2: number[][][] // [16][8][8]
  pool2: number[][][] // [16][4][4]
  fc: number[] // [10] softmax probs
}

export const LAYER_META: Array<{
  id: LayerId
  nameZh: string
  dims: number[]
  spacing: number
  x: number
}> = [
  { id: 'input', nameZh: '输入', dims: [28, 28, 1], spacing: 2.4, x: 0 },
  { id: 'conv1', nameZh: '卷积1', dims: [24, 24, 8], spacing: 2.2, x: 72 },
  { id: 'pool1', nameZh: '池化1', dims: [12, 12, 8], spacing: 3.0, x: 140 },
  { id: 'conv2', nameZh: '卷积2', dims: [8, 8, 16], spacing: 2.8, x: 210 },
  { id: 'pool2', nameZh: '池化2', dims: [4, 4, 16], spacing: 3.8, x: 270 },
  { id: 'fc', nameZh: '输出', dims: [10], spacing: 5.5, x: 330 },
]

const MEAN = 0.1307
const STD = 0.3081

function conv2d(
  input: number[][][],
  weight: number[][][][],
  bias: number[],
  kernelSize: number,
): number[][][] {
  const inChannels = input.length
  const outChannels = weight.length
  const h = input[0].length
  const w = input[0][0].length
  const outH = h - kernelSize + 1
  const outW = w - kernelSize + 1
  const output: number[][][] = []

  for (let f = 0; f < outChannels; f += 1) {
    const fmap: number[][] = []
    for (let r = 0; r < outH; r += 1) {
      const row: number[] = []
      for (let c = 0; c < outW; c += 1) {
        let sum = bias[f]
        for (let ch = 0; ch < inChannels; ch += 1) {
          for (let kr = 0; kr < kernelSize; kr += 1) {
            for (let kc = 0; kc < kernelSize; kc += 1) {
              sum += input[ch][r + kr][c + kc] * weight[f][ch][kr][kc]
            }
          }
        }
        row.push(sum)
      }
      fmap.push(row)
    }
    output.push(fmap)
  }
  return output
}

function relu(tensor: number[][][]): number[][][] {
  return tensor.map((d1) => d1.map((d2) => d2.map((v) => Math.max(0, v))))
}

function maxPool2d(tensor: number[][][], poolSize: number): number[][][] {
  const filters = tensor.length
  const h = tensor[0].length
  const w = tensor[0][0].length
  const outH = Math.floor(h / poolSize)
  const outW = Math.floor(w / poolSize)
  const output: number[][][] = []

  for (let f = 0; f < filters; f += 1) {
    const fmap: number[][] = []
    for (let r = 0; r < outH; r += 1) {
      const row: number[] = []
      for (let c = 0; c < outW; c += 1) {
        let max = -Infinity
        for (let pr = 0; pr < poolSize; pr += 1) {
          for (let pc = 0; pc < poolSize; pc += 1) {
            max = Math.max(max, tensor[f][r * poolSize + pr][c * poolSize + pc])
          }
        }
        row.push(max)
      }
      fmap.push(row)
    }
    output.push(fmap)
  }
  return output
}

function flatten(tensor: number[][][]): number[] {
  const result: number[] = []
  for (let f = 0; f < tensor.length; f += 1) {
    for (let r = 0; r < tensor[f].length; r += 1) {
      for (let c = 0; c < tensor[f][0].length; c += 1) {
        result.push(tensor[f][r][c])
      }
    }
  }
  return result
}

function dense(input: number[], weight: number[][], bias: number[]): number[] {
  const outSize = weight.length
  const output: number[] = []
  for (let i = 0; i < outSize; i += 1) {
    let sum = bias[i]
    const row = weight[i]
    for (let j = 0; j < row.length; j += 1) {
      sum += input[j] * row[j]
    }
    output.push(sum)
  }
  return output
}

function softmax(logits: number[]): number[] {
  let max = -Infinity
  for (const v of logits) if (v > max) max = v
  const exps = logits.map((v) => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((v) => v / sum)
}

/** Flatten Float32Array / number[] of length 784 → forward pass */
export function forward(input: ArrayLike<number>, weights: CnnWeights): Activations {
  const rawGrid: number[][] = []
  const normGrid: number[][] = []
  for (let r = 0; r < 28; r += 1) {
    const rawRow: number[] = []
    const normRow: number[] = []
    for (let c = 0; c < 28; c += 1) {
      const v = input[r * 28 + c] ?? 0
      rawRow.push(v)
      normRow.push((v - MEAN) / STD)
    }
    rawGrid.push(rawRow)
    normGrid.push(normRow)
  }

  const inputGrid = [normGrid]
  const conv1 = relu(conv2d(inputGrid, weights['conv1.weight'], weights['conv1.bias'], 5))
  const pool1 = maxPool2d(conv1, 2)
  const conv2 = relu(conv2d(pool1, weights['conv2.weight'], weights['conv2.bias'], 5))
  const pool2 = maxPool2d(conv2, 2)
  const flat = flatten(pool2)
  const fc = softmax(dense(flat, weights['fc.weight'], weights['fc.bias']))

  return {
    input: [rawGrid],
    conv1,
    pool1,
    conv2,
    pool2,
    fc,
  }
}

export function emptyActivations(): Activations {
  const zeros2d = (h: number, w: number) =>
    Array.from({ length: h }, () => Array.from({ length: w }, () => 0))
  return {
    input: [zeros2d(28, 28)],
    conv1: Array.from({ length: 8 }, () => zeros2d(24, 24)),
    pool1: Array.from({ length: 8 }, () => zeros2d(12, 12)),
    conv2: Array.from({ length: 16 }, () => zeros2d(8, 8)),
    pool2: Array.from({ length: 16 }, () => zeros2d(4, 4)),
    fc: Array.from({ length: 10 }, () => 0.1),
  }
}

export function topPrediction(probs: number[]): { digit: number; prob: number } {
  let best = 0
  let bestP = -1
  for (let i = 0; i < probs.length; i += 1) {
    if (probs[i] > bestP) {
      bestP = probs[i]
      best = i
    }
  }
  return { digit: best, prob: bestP }
}

/** Colormap: readable mid blues → cyan → lime → gold (brighter than upstream idle). */
export function activationColor(val: number, min: number, max: number): [number, number, number] {
  if (max === min) return [0.28, 0.34, 0.58]
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)))
  // piecewise stops — lift the floor so inactive nodes are still visible
  const stops: Array<[number, number, number, number]> = [
    [0, 0.22, 0.28, 0.52],
    [0.12, 0.18, 0.38, 0.92],
    [0.3, 0.12, 0.62, 1.0],
    [0.48, 0.08, 0.88, 0.78],
    [0.65, 0.28, 0.98, 0.42],
    [0.82, 0.88, 0.98, 0.2],
    [1, 1.0, 0.92, 0.35],
  ]
  let lo = 0
  while (lo < stops.length - 2 && stops[lo + 1][0] < t) lo += 1
  const hi = lo + 1
  const tLo = stops[lo][0]
  const tHi = stops[hi][0]
  const frac = tHi === tLo ? 0 : (t - tLo) / (tHi - tLo)
  return [
    stops[lo][1] + (stops[hi][1] - stops[lo][1]) * frac,
    stops[lo][2] + (stops[hi][2] - stops[lo][2]) * frac,
    stops[lo][3] + (stops[hi][3] - stops[lo][3]) * frac,
  ]
}

export function maxAbsFlat(data: number[][][] | number[]): number {
  let m = 0.01
  if (Array.isArray(data) && typeof data[0] === 'number') {
    for (const v of data as number[]) m = Math.max(m, Math.abs(v))
    return m
  }
  for (const f of data as number[][][]) {
    for (const row of f) {
      for (const v of row) m = Math.max(m, Math.abs(v))
    }
  }
  return m
}
