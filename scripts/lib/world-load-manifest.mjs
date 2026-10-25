import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Only static JS/CSS dependencies belong to an opening download. */
export function collectWorldFiles(manifest, entry) {
  const visited = new Set(), files = new Set()
  function visit(key) {
    if (visited.has(key)) return
    visited.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error(`Missing Vite manifest entry: ${key}`)
    if (/\.(js|css)$/.test(chunk.file)) files.add(chunk.file)
    for (const css of chunk.css ?? []) files.add(css)
    for (const dependency of chunk.imports ?? []) visit(dependency)
  }
  visit(entry)
  return [...files].sort()
}

/** @returns {import('vite').Plugin} */
export function worldLoadManifest(directory) {
  return {
    name: 'world-load-manifest',
    apply: 'build',
    enforce: 'post',
    writeBundle: {
      order: 'post',
      handler(options, bundle) {
        if (this.environment.name !== 'client') return
        const consumers = Object.values(bundle).filter((item) => item.type === 'chunk' && item.code.includes('/generated/world-loads/'))
        if (!consumers.length || consumers.some((item) => !item.code.includes(`/${directory}/`))) {
          throw new Error('World load manifest URL does not match the compiled client; refusing stale size metadata')
        }
        const root = options.dir
        const manifest = JSON.parse(readFileSync(join(root, '.vite/manifest.json'), 'utf8'))
        const out = join(root, directory)
        mkdirSync(out, { recursive: true })
        for (const entry of Object.keys(manifest)) {
          const match = entry.match(/^src\/components\/experiences\/worlds\/([^/]+)\/index\.tsx$/)
          if (!match) continue
          const files = collectWorldFiles(manifest, entry).map((file) => [
            `/${file}`, statSync(join(root, file)).size,
          ])
          writeFileSync(join(out, `${match[1]}.json`), JSON.stringify({ files }))
        }
      },
    },
  }
}
