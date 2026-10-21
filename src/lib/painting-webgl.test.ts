import { describe, expect, it } from 'vitest'
import { PaintingVertices, paintingRenderSize, createPaintingQuality, paintingDrawRanges, updatePaintingBounds, drawPaintingRanges } from './painting-webgl.js'

const identity = new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])

describe('painting renderer budgets', () => {
  it('keeps high DPI screens within the default pixel budget', () => {
    const [w,h] = paintingRenderSize(2560,1440,3)
    expect(w*h).toBeLessThanOrEqual(1500000)
    expect(w/h).toBeCloseTo(2560/1440,2)
    expect(paintingRenderSize(390,766,3)).toEqual([390,766])
    const fine = paintingRenderSize(2560,1440,3,1.25)
    expect(fine[0]*fine[1]).toBeGreaterThan(w*h)
    expect(paintingRenderSize(0,0,0)).toEqual([1,1])
  })

  it('adapts sustained slow animation without counting startup or overriding a manual choice', () => {
    const quality = createPaintingQuality()
    for (let t=100; t<=2000; t+=100) expect(quality.sample(t)).toBe(false)
    for (let t=2100; t<=10000; t+=100) quality.sample(t)
    expect(quality.scale).toBe(.65)
    quality.manual()
    for (let t=10100; t<=20000; t+=100) expect(quality.sample(t)).toBe(false)
    expect(quality.scale).toBe(1)
  })

  it('starts a fresh sampling window after returning from a hidden tab', () => {
    const quality = createPaintingQuality()
    for (let t=100; t<=3000; t+=16) quality.sample(t)
    quality.reset()
    expect(quality.sample(300000)).toBe(false)
    expect(quality.sample(301000)).toBe(false)
    expect(quality.scale).toBe(1)
  })
})

it('stores large geometry in typed chunks while preserving float order', () => {
  const vertices = new PaintingVertices()
  for (let i=0; i<70000; i++) vertices.push(i/3)
  const result = vertices.toArray()
  expect(result.length).toBe(70000)
  expect(result[65535]).toBe(Math.fround(65535/3))
  expect(result[65536]).toBe(Math.fround(65536/3))
  expect(result[69999]).toBe(Math.fround(69999/3))
  expect(vertices.chunks).toHaveLength(0)
})

describe('conservative camera culling', () => {
  const geometry = (positions: number[]) => {
    const values = new Float32Array(positions.length*2048*3*3)
    positions.forEach((x,block) => {
      for (let i=block*2048*9; i<(block+1)*2048*9; i+=3) values[i]=x
    })
    return values
  }
  const draw = (ranges: ReturnType<typeof paintingDrawRanges>) => {
    const calls: number[][] = []
    const gl = { TRIANGLES: 4, drawArrays: (_: number, first: number, count: number) => calls.push([first,count]) }
    drawPaintingRanges(gl,{ ranges },identity)
    return calls
  }

  it('merges adjacent visible triangles and preserves the wireframe vertex numbering', () => {
    const ranges = paintingDrawRanges(geometry([0,0,10,0]),3,undefined)
    expect(draw(ranges)).toEqual([[0,12288],[18432,6144]])
  })

  it('keeps a batch intersecting the frustum, including animation padding', () => {
    const values = geometry([2])
    const ranges = paintingDrawRanges(values,3,undefined)
    expect(draw(ranges)).toEqual([[0,6144]])
    updatePaintingBounds(ranges,undefined,0)
    expect(draw(ranges)).toEqual([])
  })

  it('updates articulated bounds when a parent moves, rotates, or scales a local mesh', () => {
    const values = new Float32Array([-.5,-.5,0,1, .5,-.5,0,1, 0,.5,0,1])
    const ranges = paintingDrawRanges(values,4,3)
    const pose = identity.slice()
    pose[12]=10
    updatePaintingBounds(ranges,[{world:identity},{world:pose}],0)
    expect(draw(ranges)).toEqual([])
    pose[12]=0; pose[0]=0; pose[1]=2; pose[4]=-2; pose[5]=0
    updatePaintingBounds(ranges,[{world:identity},{world:pose}],0)
    expect(draw(ranges)).toEqual([[0,3]])
    expect(ranges[0].min).toEqual([-1,-1,0])
    expect(ranges[0].max).toEqual([1,1,0])
  })
})
