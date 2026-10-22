import { worldPath } from '../src/lib/world-urls.ts'
import {readFile, readdir, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'

import {readWorldCatalogFiles} from './lib/world-catalog-source.mjs'
import {isWorldDiscoverable} from './lib/world-lifecycle.mjs'
import {readStaticDefaultExport} from './lib/static-typescript-data.mjs'

const origin = 'https://shapeof.world'
const root = resolve(import.meta.dirname, '..')
const catalogWorlds = readWorldCatalogFiles(root).map(({path}) => readStaticDefaultExport(path))
const catalogWorldIds = catalogWorlds.map((world) => world.id).filter(Boolean)
const publicCatalogWorlds = catalogWorlds.filter((world) => isWorldDiscoverable(world))
const worldIds = [...new Set(publicCatalogWorlds.map((world) => world.id))].sort()
const categoryDirectory = resolve(root, 'src/data/content-graph/categories')
const categoryIds = (await readdir(categoryDirectory, {withFileTypes: true}))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => readStaticDefaultExport(resolve(categoryDirectory, entry.name)))
  .filter((category) => category.publication === 'public')
  .map((category) => category.id)
  .sort()
const filmSlugs = JSON.parse(await readFile(resolve(root, 'src/data/films.json'), 'utf8'))
  .filter((film) => film.publishedAt)
  .map((film) => film.slug)
  .sort()
const pathDirectory = resolve(root, 'src/data/content-graph/paths')
const pathSlugs = (await readdir(pathDirectory, {withFileTypes: true}))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => readStaticDefaultExport(resolve(pathDirectory, entry.name)))
  .filter((path) => path.publication === 'public' && path.slug)
  .map((path) => path.slug)
  .sort()

if (
  worldIds.length < 1
  || catalogWorlds.some(({id}) => !id)
  || new Set(catalogWorldIds).size !== catalogWorldIds.length
  || worldIds.length !== publicCatalogWorlds.length
) {
  throw new Error('Could not generate a complete sitemap from the world catalogues')
}

const staticEntries = [
  ['/', 'daily', '1.0'],
  ['/about', 'monthly', '0.6'],
  ['/collaborate', 'monthly', '0.5'],
  ['/feedback', 'monthly', '0.4'],
  ['/privacy', 'monthly', '0.4'],
  ['/logo', 'monthly', '0.5'],
  ['/making', 'monthly', '0.5'],
  ['/sources', 'monthly', '0.6'],
  ['/changelog', 'weekly', '0.6'],
  ['/routes', 'weekly', '0.7'],
  ['/films', 'weekly', '0.7'],
  ...filmSlugs.map((slug) => [`/films/${slug}`, 'monthly', '0.7']),
  ...categoryIds.map((id) => [`/category/${id}`, 'weekly', '0.7']),
  ...pathSlugs.map((slug) => [`/routes/${slug}`, 'weekly', '0.7']),
]

const entries = [
  ...staticEntries.map(([path, changefreq, priority]) => ({path, changefreq, priority})),
  ...worldIds.map((id) => ({
    path: worldPath(id),
    changefreq: 'monthly',
    priority: '0.8',
  })),
]

function englishPath(path) {
  return path === '/' ? '/en' : `/en${path}`
}

/** Chinese stays on the pretty URL; English is a first-class `/en` loc. */
function alternates(path) {
  return [
    `<xhtml:link rel="alternate" hreflang="zh-Hans" href="${origin}${path}"/>`,
    `<xhtml:link rel="alternate" hreflang="en" href="${origin}${englishPath(path)}"/>`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${origin}${path}"/>`,
  ].join('')
}

function urlBlock(path, loc, {changefreq, priority}) {
  return (
    `  <url><loc>${origin}${loc}</loc>`
    + `<changefreq>${changefreq}</changefreq><priority>${priority}</priority>`
    + alternates(path)
    + '</url>'
  )
}

// Poster commits do not establish when the page's main content last changed.
const urls = entries.flatMap(({path, changefreq, priority}) => {
  const rest = {changefreq, priority}
  return [
    urlBlock(path, path, rest),
    urlBlock(path, englishPath(path), rest),
  ]
})
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...urls,
  '</urlset>',
  '',
].join('\n')

if (process.argv.includes('--stdout')) {
  process.stdout.write(sitemap)
} else {
  await writeFile(new URL('../public/sitemap.xml', import.meta.url), sitemap)
  console.log(`[sitemap] wrote ${urls.length} URL records for ${worldIds.length} worlds and ${categoryIds.length} categories`)
}
