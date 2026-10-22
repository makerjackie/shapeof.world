import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { countSourceCountries, feltMass, totalMg, type Atlas } from './phone-elements-data'

const atlas = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../../../../public/assets/phone-elements/atlas.json'), 'utf8'),
) as Atlas
const source = readFileSync(resolve(import.meta.dirname, 'PhoneElements.tsx'), 'utf8')

function element(sym: string) {
  const found = atlas.elements.find((entry) => entry.sym === sym)
  if (!found) throw new Error(`missing ${sym}`)
  return found
}

describe('phone-elements figures on screen match the atlas', () => {
  it('counts the countries the story answer names', () => {
    const countries = countSourceCountries(atlas.elements)
    expect(source).toContain(`至少 ${countries} 个国家`)
    expect(source).toContain(`就连着 ${countries} 个国家`)
  })

  it('keeps the story numbers tied to the measured data', () => {
    expect(atlas.meta.measuredMetals).toBe(53)
    expect(source).toContain('数出 53 种金属')
    expect(Math.round(element('Fe').mg / 1_000)).toBe(16)
    expect(element('Au').mg).toBe(16.8)
    expect(source).toContain('金只有 16.8 毫克')
    expect(Math.round(1_000 / element('Au').mg / 10) * 10).toBe(60)
    expect(source).toContain('得拆 60 部手机')
    expect(element('Co').top?.[0]).toEqual(['CD', 76])
    expect(element('Ga').top?.[0]).toEqual(['CN', 98])
  })

  it('turns small masses into phones per gram', () => {
    expect(feltMass(totalMg(element('Au')), 'zh')).toBe('凑够 1 克，要拆 60 部手机')
    expect(feltMass(0.04, 'zh')).toBe('凑够 1 克，要拆 2.5 万部手机')
    expect(feltMass(0.04, 'en')).toBe('25,000 phones to gather 1 g')
    expect(feltMass(16_411, 'zh')).toBeNull()
  })
})
