import { describe, expect, it } from 'vitest'

import { bilibiliBvid, bilibiliPlayerUrl, chooseFilmPlayer, parseFilmPlayer } from './film-player'

describe('film player', () => {
  it('reads the BV id from Bilibili watch URLs', () => {
    expect(bilibiliBvid('https://www.bilibili.com/video/BV1srnN6GEBC/')).toBe('BV1srnN6GEBC')
    expect(bilibiliBvid('https://www.bilibili.com/video/BV1srnN6GEBC')).toBe('BV1srnN6GEBC')
    expect(bilibiliBvid('https://m.bilibili.com/video/BV1srnN6GEBC?p=1')).toBe('BV1srnN6GEBC')
  })

  it.each([undefined, '', 'not a url', 'http://www.bilibili.com/video/BV1srnN6GEBC/',
    'https://evil.example/video/BV1srnN6GEBC/', 'https://www.bilibili.com/video/av170001/',
    'https://www.bilibili.com/video/BV1srnN6GEBCX/'])('rejects %s', (url) => {
    expect(bilibiliBvid(url)).toBeUndefined()
  })

  it('builds the embed URL without danmaku or autoplay', () => {
    expect(bilibiliPlayerUrl('BV1srnN6GEBC')).toBe(
      'https://player.bilibili.com/player.html?bvid=BV1srnN6GEBC&page=1&high_quality=1&danmaku=0&autoplay=0',
    )
  })

  it('lets an override beat the stored switch, and the switch beat the country', () => {
    expect(chooseFilmPlayer({ country: 'CN' })).toBe('bilibili')
    for (const country of ['HK', 'MO', 'TW', 'US', undefined]) expect(chooseFilmPlayer({ country })).toBe('native')
    expect(chooseFilmPlayer({ stored: 'native', country: 'CN' })).toBe('native')
    expect(chooseFilmPlayer({ stored: 'bilibili', country: 'US' })).toBe('bilibili')
    expect(chooseFilmPlayer({ override: 'native', stored: 'bilibili', country: 'CN' })).toBe('native')
  })

  it('accepts only known player names', () => {
    expect(parseFilmPlayer('bilibili')).toBe('bilibili')
    expect(parseFilmPlayer('native')).toBe('native')
    expect(parseFilmPlayer('youtube')).toBeUndefined()
    expect(parseFilmPlayer(undefined)).toBeUndefined()
  })
})
