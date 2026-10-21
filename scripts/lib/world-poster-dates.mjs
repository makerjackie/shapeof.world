import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function gitStamp(root, args) {
  const result = spawnSync('git', ['log', ...args], { cwd: root, encoding: 'utf8' })
  const stamp = result.status === 0 ? result.stdout.trim().split('\n').find((line) => line) : ''
  return /^\d{4}-\d{2}-\d{2}$/.test(stamp) ? stamp : undefined
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Sitemap lastmod: last time the poster file was committed.
 * Recapture updates Google’s date; it must not reshuffle homepage “new”.
 */
export function posterLastModified(root, worldId) {
  return gitStamp(root, ['-1', '--format=%cs', '--', `public/assets/posters/${worldId}.webp`])
}

/**
 * Homepage freshness / catalogue order: the day the world first appeared.
 * Prefer the component’s first add, then the poster’s first add.
 */
function pascalFromWorldId(worldId) {
  return worldId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function worldFirstSeen(root, worldId, componentPath, posterUrl) {
  const files = []
  if (componentPath) files.push(componentPath)
  // After a world moves to worlds/<id>/, keep the legacy component path so
  // homepage freshness does not jump to the migration day.
  const pascal = pascalFromWorldId(worldId)
  files.push(`src/components/experiences/${pascal}.tsx`)
  if (typeof posterUrl === 'string' && posterUrl.startsWith('/')) files.push(posterUrl.slice(1))
  files.push(`public/assets/posters/${worldId}.webp`)
  const added = []
  for (const file of [...new Set(files)]) {
    const stamp = gitStamp(root, ['--diff-filter=A', '--reverse', '--format=%cs', '--', file])
    if (stamp) added.push(stamp)
  }
  if (added.length > 0) return added.sort()[0]
  if (files.some((file) => existsSync(join(root, file)))) return todayStamp()
  return posterLastModified(root, worldId)
}

/**
 * Last commit date among a world's source, catalog, copy, and poster files.
 * Used by /making; it must not reshuffle homepage “new”.
 */
export function worldLastModified(root, files) {
  const unique = [...new Set(files.filter((file) => typeof file === 'string' && file.length > 0))]
  if (unique.length === 0) return undefined
  return gitStamp(root, ['-1', '--format=%cs', '--', ...unique])
}
