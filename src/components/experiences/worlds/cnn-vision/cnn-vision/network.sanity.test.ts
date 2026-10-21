import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { forward, topPrediction, type CnnWeights } from './network'
import { getSampleDigit, normalizeDigit } from './sampleDigits'

const weightsPath = resolve(process.cwd(), 'public/assets/experiences/cnn-vision/weights.json')
const weights = JSON.parse(readFileSync(weightsPath, 'utf8')) as CnnWeights

describe('cnn-vision network', () => {
  it('classifies built-in sample digits better than chance', () => {
    let correct = 0
    for (let d = 0; d < 10; d++) {
      const img = normalizeDigit(getSampleDigit(d))
      const act = forward(img, weights)
      if (topPrediction(act.fc).digit === d) correct++
    }
    expect(correct).toBeGreaterThanOrEqual(6)
  })

  it('updates probabilities when input changes', () => {
    const a = forward(normalizeDigit(getSampleDigit(1)), weights)
    const b = forward(normalizeDigit(getSampleDigit(8)), weights)
    let diff = 0
    for (let i = 0; i < a.fc.length; i++) diff += Math.abs(a.fc[i] - b.fc[i])
    expect(diff).toBeGreaterThan(0.05)
  })
})
