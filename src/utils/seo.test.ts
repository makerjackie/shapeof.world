import { describe, expect, it } from 'vitest'

import { seo } from './seo'

describe('social metadata', () => {
  it('emits localized large-image Open Graph and Twitter metadata', () => {
    const tags = seo({
      title: '为什么一年有四季？',
      description: '亲手改变地轴倾角。',
      image: 'https://shapeof.world/assets/posters/desktop/seasons.webp',
      imageAlt: '四季互动模拟器',
      imageHeight: 630,
      imageWidth: 1200,
      locale: 'zh',
      url: 'https://shapeof.world/explore/seasons',
    })

    expect(tags).toContainEqual({ property: 'og:locale', content: 'zh_CN' })
    expect(tags).toContainEqual({ property: 'og:url', content: 'https://shapeof.world/explore/seasons' })
    expect(tags).toContainEqual({ property: 'og:image:width', content: '1200' })
    expect(tags).toContainEqual({ name: 'twitter:image:alt', content: '四季互动模拟器' })
  })
})
