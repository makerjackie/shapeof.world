export const seo = ({
  title,
  description,
  keywords,
  image,
  imageAlt,
  imageHeight,
  imageWidth,
  locale,
  url,
}: {
  title: string
  description?: string
  image?: string
  imageAlt?: string
  imageHeight?: number
  imageWidth?: number
  keywords?: string
  locale?: 'en' | 'zh'
  url?: string
}) => {
  const tags = [
    { title },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:card', content: 'summary_large_image' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Shape of the World' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    ...(url ? [{ property: 'og:url', content: url }] : []),
    ...(locale
      ? [
          { property: 'og:locale', content: locale === 'zh' ? 'zh_CN' : 'en_US' },
          { property: 'og:locale:alternate', content: locale === 'zh' ? 'en_US' : 'zh_CN' },
        ]
      : []),
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { name: 'twitter:image:alt', content: imageAlt ?? title },
          { property: 'og:image', content: image },
          { property: 'og:image:alt', content: imageAlt ?? title },
          ...(imageWidth ? [{ property: 'og:image:width', content: String(imageWidth) }] : []),
          ...(imageHeight ? [{ property: 'og:image:height', content: String(imageHeight) }] : []),
        ]
      : []),
  ]

  return tags
}
