import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectSeoHtml } from './audit-seo-p0-pages.mjs'

function page(locale = 'zh') {
  const zh = 'https://shapeof.world/solar-system'
  const en = 'https://shapeof.world/en/solar-system'
  const url = locale === 'en' ? en : zh
  const language = locale === 'en' ? 'en' : 'zh-Hans'
  return `<html lang="${language}"><head>
    <title>${locale === 'en' ? 'Solar system' : '太阳系'}</title>
    <meta name="description" content="An interactive solar system">
    <link rel="canonical" href="${url}">
    <link rel="alternate" hreflang="zh-Hans" href="${zh}">
    <link rel="alternate" hreflang="en" href="${en}">
    <link rel="alternate" hreflang="x-default" href="${zh}">
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'LearningResource', url,
      inLanguage: language, name: 'Solar system', description: 'An interactive solar system',
    })}</script>
  </head><body></body></html>`
}

for (const locale of ['zh', 'en']) {
  test(`${locale} metadata uses a self-canonical URL and reciprocal language links`, () => {
    const result = inspectSeoHtml(page(locale), 'solar-system', locale)
    assert.ok(Object.values(result.checks).every(Boolean), JSON.stringify(result.checks))
  })
}

test('the existing two-argument API continues to inspect the default Chinese page', () => {
  assert.ok(Object.values(inspectSeoHtml(page(), 'solar-system').checks).every(Boolean))
})

test('English pages cannot silently inherit Chinese metadata', () => {
  const checks = inspectSeoHtml(page('zh'), 'solar-system', 'en').checks
  assert.equal(checks.canonicalCorrect, false)
  assert.equal(checks.htmlLangCorrect, false)
  assert.equal(checks.structuredDataValid, false)
  assert.equal(checks.hreflangZhCorrect, true)
})

test('missing SSR descriptions and duplicate canonicals fail even with body metadata', () => {
  const html = page().replace('<meta name="description" content="An interactive solar system">', '')
    .replace('</head>', '<link rel="canonical" href="https://shapeof.world/"> </head>')
    .replace('<body>', '<body><meta name="description" content="Client-only description">')
  const checks = inspectSeoHtml(html, 'solar-system').checks
  assert.equal(checks.descriptionPresent, false)
  assert.equal(checks.canonicalUnique, false)
})

test('malformed JSON-LD is reported and unrelated JSON-LD does not mask the resource', () => {
  const additional = '<script type="application/ld+json">{"@type":"Organization"}</script>'
  assert.equal(inspectSeoHtml(page().replace('<title>', `${additional}<title>`), 'solar-system').checks.structuredDataValid, true)
  const result = inspectSeoHtml(page().replace('"@context":', '"@context"!'), 'solar-system')
  assert.equal(result.checks.structuredDataValid, false)
  assert.ok(result.structuredDataError)
})

test('noindex and incorrect reciprocal language links fail the audit', () => {
  const html = page('en').replace('</head>', '<meta name="robots" content="noindex,follow"></head>')
    .replace('hreflang="zh-Hans" href="https://shapeof.world/', 'hreflang="zh-Hans" href="https://shapeof.world/en/')
  const checks = inspectSeoHtml(html, 'solar-system', 'en').checks
  assert.equal(checks.metaRobotsIndexable, false)
  assert.equal(checks.hreflangZhCorrect, false)
})


test('Chinese regional and script language tags are accepted, but Traditional Chinese is not', () => {
  for (const language of ['zh-CN', 'zh-Hans', 'zh-Hans-CN']) {
    assert.equal(inspectSeoHtml(page().replace('lang="zh-Hans"', `lang="${language}"`), 'solar-system').checks.htmlLangCorrect, true)
  }
  assert.equal(inspectSeoHtml(page().replace('lang="zh-Hans"', 'lang="zh-Hant"'), 'solar-system').checks.htmlLangCorrect, false)
})
