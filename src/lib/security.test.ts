import {describe, expect, it} from 'vitest'

import {contentSecurityPolicy, contentUsage} from './security'

describe('content security policy', () => {
  it('allows measured GLB textures to decode from generated blob URLs', () => {
    expect(contentSecurityPolicy).toContain("img-src 'self' data: blob:")
    expect(contentSecurityPolicy).toContain("connect-src 'self' blob:")
  })

  it('allows the local Draco and medical-image WASM decoders to compile', () => {
    expect(contentSecurityPolicy).toContain("'wasm-unsafe-eval'")
    expect(contentSecurityPolicy).toContain("worker-src 'self' blob:")
  })

  it('allows Cloudflare Web Analytics to load its injected beacon', () => {
    expect(contentSecurityPolicy).toContain('https://static.cloudflareinsights.com')
  })

  it('allows Shape of the World original soundtrack previews from the music CDN', () => {
    expect(contentSecurityPolicy).toContain("media-src 'self' https://music-cdn.shapeof.world")
    expect(contentSecurityPolicy).toContain('https://music-cdn.shapeof.world')
    expect(contentSecurityPolicy).not.toContain('r2.dev')
  })

  it('allows device-local song playback without opening arbitrary remote media origins', () => {
    const media = contentSecurityPolicy.split('; ').find((directive) => directive.startsWith('media-src '))
    expect(media?.split(' ').slice(1)).toEqual(["'self'", 'https://music-cdn.shapeof.world', 'blob:'])
  })

  it('allows AI assistants to read pages while reserving training rights', () => {
    expect(contentUsage).toBe('search=y, ai-input=y, train-ai=n')
  })

  it('allows the declared TradingView stock heatmap embed', () => {
    expect(contentSecurityPolicy).toContain('https://s3.tradingview.com')
    expect(contentSecurityPolicy).toContain('https://www.tradingview-widget.com')
  })

  it('keeps third-party image access limited to declared scientific archives', () => {
    expect(contentSecurityPolicy).toContain('https://epic.gsfc.nasa.gov')
    expect(contentSecurityPolicy).toContain('https://cdn.esahubble.org')
    expect(contentSecurityPolicy).toContain('https://web.wwtassets.org')
    expect(contentSecurityPolicy).not.toContain('https://gibs.earthdata.nasa.gov')
    expect(contentSecurityPolicy).toContain('https://api.nga.gov')
    expect(contentSecurityPolicy).toContain('https://annotations.allmaps.org')
    expect(contentSecurityPolicy).toContain('https://iiif.digitalcommonwealth.org')
    expect(contentSecurityPolicy).toContain('https://earth.nullschool.net')
    expect(contentSecurityPolicy).toContain('https://seanwong17.github.io')
    expect(contentSecurityPolicy).not.toContain('https://assets.lanshuagent.com')
    expect(contentSecurityPolicy).not.toContain('https://cell-architecture-studio.lanshuagent.com')
    expect(contentSecurityPolicy).not.toContain('https://3d-api.si.edu')
    expect(contentSecurityPolicy).toContain('https://commons.wikimedia.org')
    expect(contentSecurityPolicy).toContain('https://upload.wikimedia.org')
    expect(contentSecurityPolicy).not.toContain('https: *')
  })
})
