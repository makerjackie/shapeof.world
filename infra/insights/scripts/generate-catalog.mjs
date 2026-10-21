import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(projectRoot, '../../src/data/generated/world-summaries.json')
const outputPath = resolve(projectRoot, 'src/world-catalog.generated.json')
// Stored titles of worlds no longer in the catalog. Their historical events stay
// in Analytics Engine and the D1 archive, so Insights keeps naming them.
const retiredPath = resolve(projectRoot, 'src/world-catalog.retired.json')
const readJson = async (path) => (existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : [])
// The site catalog must exist: an empty source would retire every world.
const source = JSON.parse(await readFile(sourcePath, 'utf8'))
if (!Array.isArray(source) || source.length === 0) throw new Error(`No worlds in ${sourcePath}`)

const poster = (id) => `/assets/posters/thumb/${id}.webp`
const current = source.map((world) => ({
  id: world.id,
  title: world.posterTitle || world.title,
  titleEn: world.translations?.en?.posterTitle || world.translations?.en?.title || world.id,
  domain: world.domain,
  poster: poster(world.id),
  category: world.category,
}))
const currentIds = new Set(current.map((world) => world.id))

// A world that disappears from the catalog moves from the previous catalog into
// the retired list, so its last title is kept; a world that returns leaves it.
const retiredById = new Map((await readJson(retiredPath)).map((world) => [world.id, world]))
for (const world of await readJson(outputPath)) {
  if (world.retired || currentIds.has(world.id) || retiredById.has(world.id)) continue
  retiredById.set(world.id, {
    id: world.id,
    title: world.title || world.id,
    titleEn: world.titleEn || world.id,
    ...(world.domain ? { domain: world.domain } : {}),
    ...(world.category ? { category: world.category } : {}),
  })
}
const retired = [...retiredById.values()]
  .filter((world) => !currentIds.has(world.id))
  .sort((left, right) => left.id.localeCompare(right.id))

const catalog = [
  ...current,
  ...retired.map((world) => ({ ...world, poster: poster(world.id), retired: true })),
]

await writeFile(retiredPath, `${JSON.stringify(retired, null, 2)}\n`)
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Generated ${catalog.length} Insights catalog entries (${current.length} current, ${retired.length} retired).`)
