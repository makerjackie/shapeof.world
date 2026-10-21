import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { findStaticVariable, staticLiteralValue } from './static-typescript-data.mjs'

function routeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return routeFiles(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.startsWith('-') && !entry.name.includes('.test.') ? [path] : []
  })
}
const sorted = values => [...new Set(values)].sort()

export function collectRouteReservations(root) {
  // Read the generated TanStack tree and its source declarations, so a newly
  // added route is reserved even before Vite regenerates routeTree.gen.ts.
  const paths = []
  const tree = join(root, 'src/routeTree.gen.ts')
  if (existsSync(tree)) for (const match of readFileSync(tree, 'utf8').matchAll(/fullPath: ['"]([^'"]+)['"]/g)) paths.push(match[1])
  for (const file of routeFiles(join(root, 'src/routes'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/createFileRoute\(['"]([^'"]+)['"]\)/g)) paths.push(match[1])
  }
  const server = join(root, 'src/server.ts')
  if (existsSync(server)) for (const match of readFileSync(server, 'utf8').matchAll(/['\"](\/[a-zA-Z0-9./_-]+)['\"]/g)) paths.push(match[1])
  const topLevelRoutes = sorted(paths.map(path => path.split('/')[1]).filter(name => name && !name.startsWith('$') && !name.startsWith('_')))
  const settings = JSON.parse(readFileSync(join(root, 'project.inlang/settings.json'), 'utf8'))
  const legacy = join(root, 'src/lib/legacy-entry-paths.ts')
  const variable = name => staticLiteralValue(findStaticVariable(legacy, name))
  return {
    topLevelRoutes,
    exactPagePaths: sorted(paths.filter(path => !path.includes('$') && !/^\/(?:api|media|\.well-known)(?:\/|$)/.test(path)).map(path => path.length > 1 ? path.replace(/\/$/, '') : path)),
    languagePrefixes: sorted(settings.locales),
    legacyEntryNames: sorted([...variable('legacyHomeEntryNames'), variable('legacyWorldEntryPrefix'), variable('legacyChineseEntryPrefix')]),
    staticNames: sorted(readdirSync(join(root, 'public')).filter(name => !name.startsWith('_'))),
  }
}

export function generateRouteReservations(root, check = false) {
  const output = join(root, 'src/data/generated/route-reservations.json')
  const bytes = JSON.stringify(collectRouteReservations(root), null, 2) + '\n'
  const previous = existsSync(output) ? readFileSync(output, 'utf8') : ''
  if (check && previous !== bytes) throw new Error('Route reservations are stale; run node scripts/generate-route-reservations.mjs')
  if (!check && previous !== bytes) { mkdirSync(join(root, 'src/data/generated'), { recursive: true }); writeFileSync(output, bytes) }
}
