import { existsSync } from 'node:fs'
import { mkdir, copyFile, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const CDN_ORIGIN = 'https://music-cdn.shapeof.world'

export function soundtrackPreviewUrl(trackId, version) {
  return `${CDN_ORIGIN}/tracks/${trackId}/${version}/preview.mp3`
}

function downloadWithCurl(url, destination) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('curl', ['-fsSL', '--retry', '3', '--retry-delay', '1', '-o', destination, url], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`curl exited ${code} for ${url}: ${stderr.trim()}`))
    })
  })
}

export async function ensureSoundtrackFile(oneWorldRoot, trackId, version) {
  const bundled = resolve(oneWorldRoot, 'public/assets/audio/hidden-shapes.mp3')
  if (trackId === 'hidden-shapes' && existsSync(bundled)) return bundled

  const cacheDirectory = resolve(oneWorldRoot, '.artifacts/soundtrack')
  const cached = join(cacheDirectory, `${trackId}.mp3`)
  if (existsSync(cached)) return cached

  const url = soundtrackPreviewUrl(trackId, version)
  if (url.includes('r2.dev')) throw new Error(`Refusing r2.dev soundtrack URL: ${url}`)
  await mkdir(cacheDirectory, { recursive: true })
  const temporary = `${cached}.${process.pid}.${Date.now()}.partial`
  try {
    await downloadWithCurl(url, temporary)
    await copyFile(temporary, cached)
  } finally {
    await rm(temporary, { force: true })
  }
  return cached
}

export async function copySoundtrackForWorlds(oneWorldRoot, destinationRoot, worldIds, catalog) {
  const assignment = catalog.assignment
  const tracks = catalog.tracks
  const ids = new Set([catalog.fallbackTrackId])
  for (const worldId of worldIds) {
    const trackId = assignment.worlds[worldId]
    if (trackId) ids.add(trackId)
  }
  const audioRoot = join(destinationRoot, 'audio')
  await mkdir(audioRoot, { recursive: true })
  const copied = []
  for (const trackId of [...ids].sort()) {
    const track = tracks[trackId]
    if (!track) throw new Error(`Unknown soundtrack id ${trackId}`)
    const source = await ensureSoundtrackFile(oneWorldRoot, trackId, track.version)
    const destination = join(audioRoot, `${trackId}.mp3`)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(source, destination)
    copied.push(trackId)
  }
  return copied
}
