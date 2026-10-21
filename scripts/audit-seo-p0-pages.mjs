#!/usr/bin/env node
// Live audit of the head metadata served for the five priority worlds, in both
// languages. `inspectSeoHtml` is pure so it can be unit tested on fixtures;
// the CLI wraps it with HTTP fetches against robots.txt, the sitemap and pages.
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import { worldPath } from '../src/lib/world-urls.ts'

export const P0_WORLD_IDS = [
  'solar-system',
  'moon-voyage',
  'mandelbrot-zoom',
  'fluid-sim',
  'black-hole-flyby',
]

const SITE = 'https://shapeof.world'
const LOCALES = ['zh', 'en']

// ---- small HTML helpers ---------------------------------------------------

/** Read the attributes of one start tag into a map keyed by lower-case name. */
function readAttributes(startTag) {
  const found = new Map()
  const pattern = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu
  for (const [, key, doubleQuoted, singleQuoted] of startTag.matchAll(pattern)) {
    const lowered = key.toLowerCase()
    const value = doubleQuoted ?? singleQuoted
    if (value && !found.has(lowered)) found.set(lowered, value)
  }
  return found
}

function startTags(markup, element) {
  return Array.from(markup.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'giu')), (m) => m[0]).map(readAttributes)
}

function innerOf(markup, element) {
  return new RegExp(`<${element}\\b[^>]*>([\\s\\S]*?)</${element}>`, 'iu').exec(markup)?.[1]
}

function jsonLdResource(head) {
  const blocks = Array.from(
    head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu),
    (m) => m[1],
  )
  try {
    const nodes = []
    for (const block of blocks) {
      const doc = JSON.parse(block)
      if (Array.isArray(doc)) nodes.push(...doc)
      else if (Array.isArray(doc?.['@graph'])) nodes.push(...doc['@graph'].map((n) => ({ '@context': doc['@context'], ...n })))
      else nodes.push(doc)
    }
    return { resource: nodes.find((n) => n?.['@type'] === 'LearningResource') ?? null, error: null }
  } catch (err) {
    return { resource: null, error: err instanceof Error ? err.message : String(err) }
  }
}

const hasText = (value) => typeof value === 'string' && value.trim().length > 0

// ---- page inspection ------------------------------------------------------

export function inspectSeoHtml(html, worldId, locale = 'zh') {
  const english = locale === 'en'
  const zhUrl = `${SITE}${worldPath(worldId)}`
  const enUrl = `${SITE}${worldPath(worldId, 'en')}`
  const selfUrl = english ? enUrl : `${SITE}${worldPath(worldId, locale)}`
  const language = english ? 'en' : 'zh-Hans'

  const htmlLang = startTags(html, 'html')[0]?.get('lang') ?? null
  // Only the served <head> counts: serialized client state and body markup
  // can contain look-alike tags that crawlers do not treat as metadata.
  const head = innerOf(html, 'head') ?? ''

  const links = startTags(head, 'link')
  const metas = startTags(head, 'meta')
  const canonicals = links.filter((l) => l.get('rel') === 'canonical')
  const alternates = {}
  for (const link of links) {
    const lang = link.get('hreflang')
    if (link.get('rel') === 'alternate' && lang) alternates[lang] = link.get('href') ?? null
  }
  const metaNamed = (name) => metas.find((m) => m.get('name')?.toLowerCase() === name)

  const title = innerOf(head, 'title')?.trim() || null
  const description = metaNamed('description')?.get('content') ?? null
  const metaRobots = metaNamed('robots')?.get('content') ?? null
  const canonical = canonicals[0]?.get('href') ?? null
  const { resource, error: structuredDataError } = jsonLdResource(head)

  const structuredDataOk = structuredDataError === null
    && resource !== null
    && resource.url === selfUrl
    && resource['@context'] === 'https://schema.org'
    && resource.inLanguage === language
    && hasText(resource.name)
    && hasText(resource.description)

  const checks = {
    titlePresent: Boolean(title),
    descriptionPresent: hasText(description),
    htmlLangCorrect: english ? htmlLang === 'en' : /^(?:zh-CN|zh-Hans(?:-CN)?)$/iu.test(htmlLang ?? ''),
    canonicalUnique: canonicals.length === 1,
    metaRobotsIndexable: !/(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/iu.test(metaRobots ?? ''),
    canonicalCorrect: canonical === selfUrl,
    hreflangZhCorrect: alternates['zh-Hans'] === zhUrl,
    hreflangEnCorrect: alternates.en === enUrl,
    hreflangDefaultCorrect: alternates['x-default'] === zhUrl,
    structuredDataValid: structuredDataOk,
  }

  return {
    title,
    description,
    htmlLang,
    metaRobots,
    canonical,
    alternates,
    structuredData: resource
      ? {
        type: resource['@type'] ?? null,
        url: resource.url ?? null,
        inLanguage: resource.inLanguage ?? null,
        name: resource.name ?? null,
      }
      : null,
    structuredDataError,
    checks,
  }
}

// ---- crawling ---------------------------------------------------------------

function exploreAllowed(robotsTxt, locale) {
  const blocked = locale === 'en'
    ? /^disallow:\s*\/en(?:\/explore)?\/?\s*$/iu
    : /^disallow:\s*\/explore\/?\s*$/iu
  const blockAll = /^disallow:\s*\/\s*$/iu
  for (const raw of robotsTxt.split(/\r?\n/u)) {
    const line = raw.replace(/#.*$/u, '').trim()
    if (blockAll.test(line) || blocked.test(line)) return false
  }
  return true
}

async function get(url) {
  const t0 = performance.now()
  const res = await fetch(url, {
    headers: { 'user-agent': 'ShapeOfWorld-P0-SEO-Audit/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  })
  const body = await res.text()
  return {
    status: res.status,
    finalUrl: res.url,
    redirected: res.redirected,
    headers: Object.fromEntries(res.headers),
    body,
    elapsedMs: Math.round(performance.now() - t0),
  }
}

function optionValue(argv, flag) {
  const at = argv.indexOf(flag)
  return at === -1 ? undefined : argv[at + 1]
}

async function auditPage(base, worldId, locale, robots, sitemap) {
  const path = worldPath(worldId, locale)
  const url = `${base}${path}`
  const reply = await get(url)
  const seo = inspectSeoHtml(reply.body, worldId, locale)
  const checks = {
    http200: reply.status === 200,
    noUnexpectedRedirect: !reply.redirected,
    httpRobotsIndexable: !/noindex|none/iu.test(reply.headers['x-robots-tag'] ?? ''),
    robotsAllowed: robots.status === 200 && exploreAllowed(robots.body, locale),
    sitemapIncluded: sitemap.status === 200 && sitemap.body.includes(`<loc>${SITE}${path}</loc>`),
    ...seo.checks,
  }
  return {
    worldId,
    locale,
    url,
    status: reply.status,
    finalUrl: reply.finalUrl,
    elapsedMs: reply.elapsedMs,
    cacheControl: reply.headers['cache-control'] ?? null,
    title: seo.title,
    description: seo.description,
    htmlLang: seo.htmlLang,
    metaRobots: seo.metaRobots,
    canonical: seo.canonical,
    alternates: seo.alternates,
    structuredData: seo.structuredData,
    checks,
    passed: Object.values(checks).every(Boolean),
  }
}

async function main(argv) {
  const base = (optionValue(argv, '--base') ?? SITE).replace(/\/$/u, '')
  const outFile = optionValue(argv, '--output')
  const auditedAt = new Date().toISOString()

  const robots = await get(`${base}/robots.txt`)
  const sitemap = await get(`${base}/sitemap.xml`)

  const pages = []
  for (const worldId of P0_WORLD_IDS) {
    for (const locale of LOCALES) pages.push(await auditPage(base, worldId, locale, robots, sitemap))
  }

  const report = {
    auditedAt,
    base,
    conditions: {
      client: `Node ${process.version} fetch`,
      locale: 'Chinese and English URL variants',
      redirects: 'follow',
    },
    robots: { status: robots.status, finalUrl: robots.finalUrl },
    sitemap: { status: sitemap.status, finalUrl: sitemap.finalUrl },
    pages,
    passed: pages.every((p) => p.passed),
  }
  const text = `${JSON.stringify(report, null, 2)}\n`
  if (outFile) await writeFile(outFile, text, 'utf8')
  process.stdout.write(text)
  if (!report.passed) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2))
}
