#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const id = process.argv[2]
const version = process.argv[3] || 'v1'
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id ?? '') || !/^v[1-9][0-9]*$/.test(version)) {
  console.error('Usage: upload-track.mjs <track-id> [v1]')
  process.exit(1)
}
const musicRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(musicRoot, '..')
const dir = join(musicRoot, '.cache/processed', id, version)
const wrangler = join(repoRoot, 'node_modules/.bin/wrangler')
const bucket = 'shapeof-world-music'
const cache = 'public, max-age=31536000, immutable'
const files = [
  ['preview.mp3', 'audio/mpeg'], ['master.mp3', 'audio/mpeg'],
  ['master.wav', 'audio/wav'], ['waveform.json', 'application/json'],
].filter(([name]) => existsSync(join(dir, name)))
if (!files.some(([name]) => name === 'preview.mp3') || !files.some(([name]) => name.startsWith('master.')) || !files.some(([name]) => name === 'waveform.json')) {
  throw new Error('Missing preview, master or waveform; process audio before uploading')
}
const receiptsPath = join(dir, 'upload-receipts.json')
const receipts = existsSync(receiptsPath) ? JSON.parse(readFileSync(receiptsPath, 'utf8')) : {}
const groups = new Map()
for (const [name, type] of files) {
  const sha = createHash('sha256').update(readFileSync(join(dir, name))).digest('hex')
  if (receipts[name] && receipts[name] !== sha) throw new Error(`Published bytes changed for ${name}; use a new version`)
  if (receipts[name] === sha) continue
  const entries = groups.get(type) ?? []
  entries.push({ name, sha, key: `tracks/${id}/${version}/${name}`, file: join(dir, name) })
  groups.set(type, entries)
}
for (const [type, entries] of groups) {
  const common = ['--remote', '--force', '--content-type', type, '--cache-control', cache]
  let args
  if (entries.length > 1) {
    // Verified against the repository's installed Wrangler. Bulk shares MIME headers,
    // so MP3 and JSON entries must stay in separate groups.
    const manifest = join(dir, `upload-${type.replace('/', '-')}.json`)
    writeFileSync(manifest, JSON.stringify(entries.map(({key, file}) => ({key, file}))))
    args = ['r2', 'bulk', 'put', bucket, '--filename', manifest, '--concurrency', '2', ...common]
  } else {
    args = ['r2', 'object', 'put', `${bucket}/${entries[0].key}`, '--file', entries[0].file, ...common]
  }
  const result = spawnSync(wrangler, args, {
    cwd: repoRoot, stdio: 'inherit',
    env: { ...process.env, http_proxy: '', https_proxy: '', HTTP_PROXY: '', HTTPS_PROXY: '' },
  })
  if (result.status !== 0) process.exit(result.status || 1)
  for (const entry of entries) { receipts[entry.name] = entry.sha; console.log('uploaded', entry.key) }
  writeFileSync(receiptsPath, JSON.stringify(receipts, null, 2) + '\n')
}
