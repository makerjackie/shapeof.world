#!/usr/bin/env node
/**
 * Turn a Lyria master (wav or mp3) into:
 *   master copy (unchanged bytes)
 *   preview.mp3 112 kbps stereo, -16 LUFS, TP <= -1.5 dB
 *   waveform.json
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const args = process.argv.slice(2).filter((item) => !['--immediate', '--short-cue'].includes(item))
const shortCue = process.argv.includes('--short-cue')
const immediate = process.argv.includes('--immediate')
const input = args[0]
const outDir = args[1]
if (!input || !outDir) {
  console.error('Usage: process-audio.mjs <input-audio> <out-dir> [--immediate] [--short-cue <seconds>]')
  process.exit(1)
}

const src = resolve(input)
const dest = resolve(outDir)
mkdirSync(dest, { recursive: true })

const probe = JSON.parse(
  spawnSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', src], {
    encoding: 'utf8',
  }).stdout,
)
const stream = (probe.streams || []).find((s) => s.codec_type === 'audio') || {}
const format = probe.format || {}
const sourceDuration = Number(format.duration || stream.duration || 0)
const requested = shortCue ? Number(args[2]) : sourceDuration
if (!Number.isFinite(requested) || requested < 8 || requested > sourceDuration) throw new Error('Invalid cue duration')
const duration = requested
const start = sourceDuration - duration
const ext = src.toLowerCase().endsWith('.wav') ? '.wav' : '.mp3'
const masterName = `master${ext}`
copyFileSync(src, join(dest, masterName))

const preview = join(dest, 'preview.mp3')
const fadeOut = shortCue ? 0.08 : 2
const fadeOutStart = Math.max(0, duration - fadeOut)
const fadeIn = immediate ? 0.04 : 1.5
const af = `atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}`
const enc = spawnSync(
  'ffmpeg',
  ['-y', '-i', src, '-vn', '-af', af, '-codec:a', 'libmp3lame', '-b:a', '112k', '-ar', '44100', '-ac', '2', preview],
  { encoding: 'utf8' },
)
if (enc.status !== 0) {
  console.error(enc.stderr.slice(-2000))
  process.exit(enc.status || 1)
}

const pcm = join(dest, '_peaks.raw')
spawnSync(
  'ffmpeg',
  ['-y', '-i', preview, '-ac', '1', '-ar', '800', '-f', 's16le', pcm],
  { encoding: 'utf8' },
)
const { readFileSync, unlinkSync } = await import('node:fs')
const raw = readFileSync(pcm)
unlinkSync(pcm)
const samples = []
for (let i = 0; i + 1 < raw.length; i += 2) samples.push(raw.readInt16LE(i))
const buckets = 400
const peaks = []
const bucket = Math.max(1, Math.floor(samples.length / buckets))
for (let i = 0; i < buckets; i++) {
  const slice = samples.slice(i * bucket, (i + 1) * bucket)
  const peak = slice.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  peaks.push(Number((peak / 32768).toFixed(4)))
}
writeFileSync(join(dest, 'waveform.json'), JSON.stringify({ peaks, duration, sampleRate: 800 }))

function sha(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

const report = {
  source: basename(src),
  recipe: shortCue ? 'short-v2' : 'standard',
  sourceDuration,
  edit: shortCue ? { kind: 'ending-excerpt', startSeconds: start, requestedSeconds: duration, fadeInSeconds: fadeIn, fadeOutSeconds: fadeOut } : undefined,
  duration,
  codec: stream.codec_name || null,
  sampleRate: stream.sample_rate ? Number(stream.sample_rate) : null,
  channels: stream.channels || null,
  master: {
    file: masterName,
    bytes: statSync(join(dest, masterName)).size,
    sha256: sha(join(dest, masterName)),
  },
  preview: {
    file: 'preview.mp3',
    bytes: statSync(preview).size,
    sha256: sha(preview),
  },
}
writeFileSync(join(dest, 'process.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
