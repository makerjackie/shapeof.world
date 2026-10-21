#!/usr/bin/env node
/**
 * Build UI and machine-readable catalogs from authoritative music/tracks/*.json.
 */
import { access, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CDN = 'https://music-cdn.shapeof.world'
const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../../..')
const musicDir = join(repoRoot, 'music')
const outDir = join(here, '../src/generated')
const rightsProfiles = JSON.parse(await readFile(join(musicDir, 'rights-profiles.json'), 'utf8')).profiles

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function assertCdnUrl(label, value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is missing`)
  }
  if (!value.startsWith(`${CDN}/`)) {
    throw new Error(`${label} must use the public music CDN: ${value}`)
  }
}

function normalizeTrack(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) {
    throw new Error('Track is missing id')
  }
  if (!raw.assets?.preview || !raw.assets?.master || !(raw.duration > 0)) throw new Error(`${raw.id}: published audio assets and measured duration are required`)
  const assets = { ...raw.assets }
  assertCdnUrl(`${raw.id}.assets.preview`, assets.preview)
  assertCdnUrl(`${raw.id}.assets.master`, assets.master)
  if (assets.waveform) assertCdnUrl(`${raw.id}.assets.waveform`, assets.waveform)
  for (const [key, value] of Object.entries(assets)) assertCdnUrl(`${raw.id}.assets.${key}`, value)
  const rights = rightsProfiles[raw.rightsProfile ?? 'legacy-unreviewed']
  if (!rights) throw new Error(`${raw.id}: unknown rights profile`)
  const kind = raw.kind ?? 'music'
  if (!['music', 'sfx', 'ambience'].includes(kind)) throw new Error(`${raw.id}: invalid audio kind`)
  if (raw.loop?.seamless && (!raw.loop.basis || !assets[raw.loop.asset])) throw new Error(`${raw.id}: verified loop requires an exact asset and evidence`)
  const next = { ...raw, assets, kind, rights }
  return next
}

function defaultAlbum() {
  return {
    id: 'volume-1',
    title: { en: 'Volume 1', zh: '第一卷' },
  }
}

function roleUse(track) {
  switch (track.role) {
    case 'main-theme':
      return 'Site identity / opening theme.'
    case 'category-default':
      return `Default bed for the ${track.category} domain.`
    case 'flagship':
      return 'Featured long-form piece.'
    case 'library':
      return 'Additional library cue.'
    case 'world-theme':
      return `Theme for a ${track.category} world.`
    default:
      return track.role ? String(track.role) : 'Library cue.'
  }
}

function titleOf(track) {
  const en = track.title?.en ?? track.id
  const zh = track.title?.zh ?? ''
  return zh && zh !== en ? `${en} / ${zh}` : en
}

function buildHandoff(catalog) {
  const lines = [
    '# Shape of the World Original Soundtrack — agent handoff',
    '',
    'Standalone catalog site: https://music.shapeof.world',
    `CDN: ${CDN}`,
    'Machine catalog: https://music.shapeof.world/catalog.json',
    'Retrieval instructions: https://music.shapeof.world/llms.txt',
    'Small type indexes: https://music.shapeof.world/audio-index.json',
    'Commercial requests require commercialUse=true; unknown is not permission.',
    'Loops require the designated verified loop asset, not the preview.',
    'Use the exact asset URLs below; versions and master extensions vary.',
    'Never use r2.dev URLs.',
    '',
    '## Album',
    '',
    `- ${catalog.album.title?.en ?? catalog.album.id} (\`${catalog.album.id}\`)`,
    ...(catalog.album.zip ? [`- MP3 ZIP: ${catalog.album.zip}`] : []),
    '',
    '## Tracks',
    '',
  ]

  for (const track of catalog.tracks) {
    lines.push(`### ${track.id} (${track.code ?? '—'})`)
    lines.push('')
    lines.push(`- Title: ${titleOf(track)}`)
    lines.push(`- Role: ${track.role ?? 'library'}`)
    lines.push(`- Kind: ${track.kind}`)
    lines.push(`- Commercial use: ${track.rights.commercialUse === true ? 'true' : track.rights.commercialUse === false ? 'false' : 'unknown'}`)
    lines.push(`- Permission profile: ${track.rights.id} — ${track.rights.licenseUrl}`)
    lines.push(`- Metadata: https://music.shapeof.world/tracks/${track.id}.json`)
    lines.push(`- Use: ${roleUse(track)}`)
    lines.push(`- Category: ${track.category ?? '—'}`)
    lines.push(`- Archetype: ${track.archetype ?? '—'}`)
    if (Array.isArray(track.moods) && track.moods.length) lines.push(`- Moods: ${track.moods.join(', ')}`)
    if (Number.isFinite(track.energy)) lines.push(`- Energy: ${track.energy}`)
    if (Number.isFinite(track.bpm)) lines.push(`- Target BPM: ${track.bpm}`)
    if (track.styles?.length) lines.push(`- Styles: ${track.styles.join(', ')}`)
    if (track.scenarios?.length) lines.push(`- Scenarios: ${track.scenarios.join(', ')}`)
    if (track.description) lines.push(`- Description: ${track.description.en} / ${track.description.zh}`)
    lines.push(`- Duration: ${track.duration ?? '—'}s`)
    if (track.sourceDuration) lines.push('- Original master duration: ' + track.sourceDuration + 's')
    if (track.edit) lines.push('- Short edit: preview only; source offset ' + track.edit.startSeconds + 's. Master remains the full original.')
    lines.push(`- Model: ${track.model ?? 'lyria-3-pro-preview'}`)
    lines.push(`- Preview: ${track.assets.preview}`)
    lines.push(`- Master: ${track.assets.master}`)
    if (track.loop?.seamless) lines.push(`- Verified loop (${track.loop.duration}s): ${track.assets[track.loop.asset]}`)
    if (track.assets.waveform) lines.push(`- Waveform: ${track.assets.waveform}`)
    if (Array.isArray(track.recommendedWorldIds) && track.recommendedWorldIds.length) {
      lines.push(`- Recommended worlds: ${track.recommendedWorldIds.join(', ')}`)
    }
    lines.push('')
  }

  if (catalog.tracks.length === 0) {
    lines.push('_No track records yet. Add JSON files under music/tracks/. _')
    lines.push('')
  }

  return lines.join('\n')
}

const tracksDir = join(musicDir, 'tracks')
const handoffSource = join(musicDir, 'AGENT_HANDOFF.md')

const files = (await exists(tracksDir))
  ? (await readdir(tracksDir)).filter(name => name.endsWith('.json')).sort()
  : []
const sourceTracks = await Promise.all(files.map(async file => JSON.parse(await readFile(join(tracksDir, file), 'utf8'))))
const tracks = sourceTracks.filter(track => track.status === 'published').map(normalizeTrack)

const albumPath = join(musicDir, 'albums/volume-1.json')
const storedAlbum = await exists(albumPath) ? JSON.parse(await readFile(albumPath, 'utf8')) : {}
const catalog = {
  album: { ...defaultAlbum(), ...storedAlbum },
  tracks,
}

if (catalog.album.zip) assertCdnUrl('album.zip', catalog.album.zip)

const ids = new Set()
for (const track of catalog.tracks) {
  if (ids.has(track.id)) throw new Error(`Duplicate track id: ${track.id}`)
  ids.add(track.id)
}

const handoff = buildHandoff(catalog)

await mkdir(outDir, { recursive: true })
const indexFields = ['id', 'code', 'title', 'category', 'archetype', 'moods', 'topics', 'energy', 'bpm', 'key', 'instruments', 'instrumental', 'model', 'duration', 'recommendedWorldIds', 'role', 'assets', 'styles', 'scenarios', 'description', 'collections', 'sourceDuration', 'kind', 'rights', 'loop', 'usage']
const uiCatalog = { ...catalog, tracks: tracks.map(track => ({
  ...Object.fromEntries(indexFields.filter(key => track[key] !== undefined && !['rights','loop'].includes(key)).map(key => [key, track[key]])),
  rights: Object.fromEntries(['id','status','label','licenseUrl','commercialUse','attributionRequired'].map(key => [key,track.rights[key]])),
  ...(track.loop ? {loop: Object.fromEntries(['seamless','asset','duration'].filter(key => track.loop[key] !== undefined).map(key => [key,track.loop[key]]))} : {}),
})) }
await writeFile(join(outDir, 'catalog.json'), `${JSON.stringify(uiCatalog, null, 2)}\n`)
await writeFile(join(outDir, 'AGENT_HANDOFF.md'), handoff.endsWith('\n') ? handoff : `${handoff}\n`)
console.log(`catalog: ${catalog.tracks.length} tracks → ${join(outDir, 'catalog.json')}`)

// Public retrieval artifacts and the UI share exactly the same published source.
const taxonomy = JSON.parse(await readFile(join(musicDir, 'taxonomy.json'), 'utf8'))
await writeFile(join(outDir, 'taxonomy.json'), JSON.stringify(taxonomy, null, 2) + '\n')
const publicDir = join(here, '../public')
const publicTracks = join(publicDir, 'tracks')
await rm(publicTracks, { recursive: true, force: true })
await mkdir(publicTracks, { recursive: true })
const machineCatalog = {
  schemaVersion: 2,
  count: tracks.length,
  fields: {
    duration: 'Measured audio length in seconds; MP3 decoder padding can cause slight player differences.',
    targetDuration: 'Requested seconds, not a duration guarantee.',
    styles: 'Stable ids describing the intended genre; see taxonomy.',
    scenarios: 'Curated intended uses, not exclusive suitability constraints; see taxonomy.',
    bpm: 'Prompt target unless explicitly marked otherwise; audioReview.bpmEstimate is model inference.',
    energy: 'Energy 1 (quiet) to 5 (intense); energyBasis indicates audio-review inference or prompt intent. targetEnergy preserves the request.',
    key: 'Requested key, not a verified transcription.',
    instruments: 'Requested instruments; audioReview.instruments records model-inferred audible instruments.',
    moods: 'Requested moods; audioReview.moods records model-inferred audible character.',
    audioReview: 'Automated full-audio review, not a human listening pass.',
    assets: 'Exact versioned CDN URLs. Never derive a master URL from the preview.',
    shortForm: 'Editorial intent. Structure timestamps refer to the requested source arrangement, not verified edit markers.',
    sourceDuration: 'Measured original master length when preview is a shorter edit; duration always describes playback/preview.',
    edit: 'Preview excerpt start in source seconds, requested length and applied fades. Master bytes remain unchanged.',
    collections: 'Curated collection ids. short-promos contains short promotional edits, one independent source composition per record.',
    kind: 'music, sfx or ambience. Never count alternate formats or loop edits as independent assets.',
    rights: 'Per-asset permissions. For commercial requests require commercialUse === true and attributionRequired === false when requested. Null is unknown. No claim-free or exclusive-rights guarantee.',
    usage: 'Curated placement and project hints, not measured acoustics.',
    assetIntegrity: 'SHA-256 and bytes for exact delivered files when available. Preserve with project downloads.',
    loop: 'seamless=true only after PCM seam analysis and automated listening. Download assets[loop.asset]; do not loop the MP3 preview. Loop duration may differ from the original.',
  },
  taxonomy,
  ...catalog,
}
await writeFile(join(publicDir, 'catalog.json'), JSON.stringify(machineCatalog, null, 2) + '\n')
await writeFile(join(publicDir, 'catalog.ndjson'), tracks.map(t => JSON.stringify(t)).join('\n') + '\n')
const retrievalTaxonomy = Object.fromEntries(['styles', 'scenarios'].map(kind => [kind, Object.fromEntries(Object.entries(taxonomy[kind]).map(([id, label]) => [id, { ...label, count: tracks.filter(track => track[kind]?.includes(id)).length, url: `https://music.shapeof.world/${kind}/${id}.json` }]))]))
await writeFile(join(publicDir, 'taxonomy.json'), JSON.stringify(retrievalTaxonomy, null, 2) + '\n')
const summaryFields = ['id', 'title', 'description', 'styles', 'scenarios', 'moods', 'instruments', 'energy', 'bpm', 'duration', 'instrumental', 'assets', 'collections', 'sourceDuration', 'edit', 'kind', 'rights', 'loop', 'usage']
for (const kind of ['styles', 'scenarios']) {
  const dir = join(publicDir, kind)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  for (const id of Object.keys(taxonomy[kind])) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Unsafe taxonomy id')
    const matches = tracks.filter(track => track[kind]?.includes(id)).map(track => ({
      ...Object.fromEntries(summaryFields.filter(key => track[key] !== undefined).map(key => [key, track[key]])),
      metadataUrl: `https://music.shapeof.world/tracks/${track.id}.json`,
      pageUrl: `https://music.shapeof.world/track/${track.id}`,
      ...(track.audioReview ? { reviewedEnergy: track.audioReview.energy, bpmEstimate: track.audioReview.bpmEstimate, observedMoods: track.audioReview.moods, observedInstruments: track.audioReview.instruments } : {}),
    }))
    await writeFile(join(dir, `${id}.json`), JSON.stringify({schemaVersion: 1, kind, id, title: taxonomy[kind][id], count: matches.length, tracks: matches}, null, 2) + '\n')
  }
}

const collectionDir = join(publicDir, 'collections')
await mkdir(collectionDir, { recursive: true })
const shortTracks = tracks.filter(track => track.collections?.includes('short-promos'))
await writeFile(join(collectionDir, 'short-promos.json'), JSON.stringify({schemaVersion: 1, id: 'short-promos', title: {en: 'Short promos', zh: '短片配乐'}, count: shortTracks.length, fields: machineCatalog.fields, tracks: shortTracks}, null, 2) + '\n')

const shortIndex = shortTracks.map(track => ({
  id: track.id, title: track.title, description: track.description,
  duration: track.duration, sourceDuration: track.sourceDuration,
  use: track.shortForm?.use, styles: track.styles, energy: track.energy,
  bpmEstimate: track.audioReview?.bpmEstimate,
  observedMoods: track.audioReview?.moods,
  observedInstruments: track.audioReview?.instruments,
  assets: { preview: track.assets.preview, master: track.assets.master },
  metadataUrl: `https://music.shapeof.world/tracks/${track.id}.json`,
  pageUrl: `https://music.shapeof.world/track/${track.id}`,
  kind: track.kind, rights: track.rights, loop: track.loop,
}))
await writeFile(join(collectionDir, 'short-promos.index.json'), JSON.stringify({
  schemaVersion: 1, id: 'short-promos', count: shortIndex.length,
  fields: { ...machineCatalog.fields,
    use: 'Curated intended video type; same as shortForm.use in full metadata.',
    bpmEstimate: 'Automated audio-review tempo estimate, not a verified beat grid.',
    observedMoods: 'Automated audio-review inference; compare with description and audition.',
    observedInstruments: 'Automated audio-review inference, not confirmed instrumentation.',
  }, tracks: shortIndex,
}, null, 2) + '\n')

for (const track of tracks) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(track.id)) throw new Error('Unsafe track id')
  await writeFile(join(publicTracks, `${track.id}.json`), JSON.stringify(track, null, 2) + '\n')
}
await writeFile(handoffSource, handoff + '\n')
await writeFile(join(publicDir, 'audio-license.txt'), await readFile(join(musicDir, 'AUDIO_LICENSE.txt')))
await writeFile(join(publicDir, 'rights.json'), JSON.stringify({schemaVersion: 1, profiles: rightsProfiles}, null, 2) + '\n')
const packsDir = join(musicDir, 'packs')
const packs = await exists(packsDir) ? (await Promise.all((await readdir(packsDir)).filter(f => f.endsWith('.json')).sort().map(async f => JSON.parse(await readFile(join(packsDir, f), 'utf8'))))).filter(p => p.status === 'published') : []
for (const pack of packs) {
  for (const event of pack.events) {
    const track = tracks.find(t => t.id === event.id)
    if (!track || track.rights.commercialUse !== true || track.assets[event.role] !== event.url || track.assetIntegrity?.[event.role]?.sha256 !== event.sha256) throw new Error(`${pack.id}: invalid scene-kit source`)
  }
}
await writeFile(join(publicDir, 'packs.json'), JSON.stringify({schemaVersion: 1, count: packs.length, packs}, null, 2) + '\n')
await writeFile(join(outDir, 'packs.json'), JSON.stringify(packs.map(({id, title, description, duration, assets, events}) => ({id, title, description, duration, assets, events})), null, 2) + '\n')
const audioDir = join(publicDir, 'audio')
await rm(audioDir, {recursive: true, force: true})
await mkdir(audioDir, {recursive: true})
const compact = track => ({
  id: track.id, title: track.title, description: track.description, kind: track.kind,
  duration: track.duration, styles: track.styles, scenarios: track.scenarios, energy: track.energy,
  commercialUse: track.rights.commercialUse, attributionRequired: track.rights.attributionRequired,
  rightsProfile: track.rights.id, loop: {seamless: track.loop?.seamless === true, duration: track.loop?.duration},
  metadataUrl: `https://music.shapeof.world/tracks/${track.id}.json`,
  pageUrl: `https://music.shapeof.world/track/${track.id}`,
})
const audioIndex = {schemaVersion: 1, count: tracks.length, licenseUrl: 'https://music.shapeof.world/audio-license.txt', kinds: {}}
for (const kind of ['music', 'sfx', 'ambience']) {
  const matches = tracks.filter(t => t.kind === kind)
  const pages = []
  for (let i = 0; i < matches.length; i += 60) {
    const file = `${kind}-${i / 60 + 1}.json`
    pages.push({url: `https://music.shapeof.world/audio/${file}`, count: Math.min(60, matches.length - i)})
    await writeFile(join(audioDir, file), JSON.stringify({schemaVersion: 1, kind, tracks: matches.slice(i, i + 60).map(compact)}) + '\n')
  }
  audioIndex.kinds[kind] = {count: matches.length, commercialCount: matches.filter(t => t.rights.commercialUse === true).length, pages,
    styles: [...new Set(matches.flatMap(t => t.styles ?? []))].map(id => ({id, title: taxonomy.styles[id], url: `https://music.shapeof.world/styles/${id}.json`}))}
}
await writeFile(join(publicDir, 'audio-index.json'), JSON.stringify(audioIndex, null, 2) + '\n')
for (const collection of ['game-audio', 'sound-effects', 'environment-audio', 'narration']) {
  const matches = tracks.filter(t => t.collections?.includes(collection))
  await writeFile(join(collectionDir, `${collection}.index.json`), JSON.stringify({schemaVersion: 1, id: collection, count: matches.length, tracks: matches.map(compact)}) + '\n')
}
await writeFile(join(publicDir, 'llms.txt'), `# Shape of the World Music / 世界的形状曲库

Music, sound effects and designed ambience. Only published assets appear here.
音乐、音效与合成环境声素材库。以下接口只收录已发布素材。

## Audio and permissions / 素材与权限

Start with https://music.shapeof.world/audio-index.json to select music, sfx or ambience, then follow a matching style URL or a small page (at most 60 records). Game music: https://music.shapeof.world/collections/game-audio.index.json . Narration: https://music.shapeof.world/collections/narration.index.json . SFX: https://music.shapeof.world/collections/sound-effects.index.json . Ambience: https://music.shapeof.world/collections/environment-audio.index.json .
先读 audio-index.json，按音乐、音效、环境声选择风格链接或小分页。游戏、旁白、音效、环境声可读上述专门索引。

For commercial work require commercialUse === true; null means unknown, not allowed. For no-attribution requests require attributionRequired === false. Open each chosen metadataUrl and inspect rights, audioReview and assetIntegrity. Read https://music.shapeof.world/audio-license.txt and retain those records with the downloaded files. Provider terms review is not a guarantee against third-party claims or Content ID errors. Legacy assets without verified permissions must not enter a commercially cleared recommendation.
商用需求只选择 commercialUse === true；null 代表未知。免署名需 attributionRequired === false。下载前读取素材元数据与 audio-license.txt，保存权限、审核及摘要，不把服务条款核对当成绝无版权争议的保证。权限未核对的旧曲不进入已确认商用推荐。

For video/game sound design select separate roles: background music, ambience, transition, impact, UI or gameplay event. Recommend a small coherent set and placement times matched to the user's actual timeline. Audio analysis estimates are not verified beat markers. For seamless playback require loop.seamless === true and download assets[loop.asset]; a preview or longer original is not necessarily the loop. PCM/WAV is preferred for exact event timing and loop sample boundaries; OGG is an optional compressed delivery. Synthesized foley/environments are designed textures, not recordings of real locations, animals or people. Never call an MP3-derived WAV a lossless original.
按背景配乐、环境、转场、撞击、UI、游戏事件搭配素材，并结合实际时间线给出放置建议。无缝循环必须核对 loop.seamless 与 assets[loop.asset]；预览和原始长版不一定是循环版。精确卡点与循环优先使用 WAV，OGG 为压缩交付。合成拟音不是实地录音；MP3 转出的 WAV 不能称作无损原始录音。

Reusable scene kits: https://music.shapeof.world/packs.json . Each kit supplies exact source roles, placement times, gains, a demonstration mix and a ZIP containing source audio plus permissions. The mixes are examples, not additional original compositions or a guarantee of fit for a different timeline. Do not confuse the no-narration explainer example with a finished narrated video.
场景套件见 packs.json，包含素材角色、放置时间、音量、混音示例及带许可的素材 ZIP。混音是使用示例，不是新增原创曲目；讲解示例未包含旁白，需按实际视频调整。

## Task workflow / 选曲流程

Use the user's current project context: visuals, scene, mood, pace, narration and target duration. Ask only for essential missing context; do not invent a project or download unrelated music. Compare 3 suitable candidates (or report fewer matches), showing title, actual duration in seconds, fit and returned track page URL; recommend one.
结合用户当前项目的画面、场景、情绪、节奏、旁白和目标时长；仅在缺少关键背景时询问，不虚构项目或下载无关音乐。比较 3 首合适候选（不足则如实说明），列出标题、实际秒数、理由及返回的曲目页 URL，推荐一首。

For short videos use the short promo index below. Otherwise read taxonomy.json, then its linked style and scene subsets. Only fetch the full catalog for cross-category filtering when the subsets are insufficient. Open every candidate's metadataUrl and inspect edit and audioReview before recommending it. Missing review is unknown, not verified listening evidence.
短视频先读下方短片索引；其他项目先读 taxonomy.json 及其中链接的风格、场景子集，仅在子集不足以跨分类筛选时读取完整曲库。推荐前打开每首候选的 metadataUrl，检查 edit 和 audioReview；缺少审核代表未知，不能声称已试听。

Filter actual playback length using duration (seconds). sourceDuration is the original recording length. For short edits download assets.preview, the short MP3; assets.master may be a longer original and is not a substitute for the short edit. Use only exact returned URLs, never construct or guess asset addresses.
用 duration（秒）筛选实际播放长度；sourceDuration 是原曲时长。短片下载 assets.preview 短版 MP3，assets.master 可能是更长的原始音频，不能当作短版。只使用返回的真实 URL，不拼接或猜测下载地址。

Download the recommended asset when the current task calls for it. If audio editing is in scope, fit the visuals, lower music under narration and audition transitions. Report what was actually downloaded, edited and auditioned; never assume seamless loops, verified beat markers, promotional performance or unstated license rights. If a web reader fails, try curl with the exact URL when available; if access still fails, report the limitation and do not invent tracks.
按当前任务需要下载推荐曲目；允许处理音频时，按画面剪辑、降低旁白下的音量并试听衔接。如实报告下载、剪辑和试听状态，不默认无缝循环，不把 BPM 或提示词结构当作已测量剪辑点，不承诺传播效果或未注明的授权。网页读取失败时，如有条件可用 curl 请求同一真实 URL；仍不可访问则说明限制，不编造曲目。

## Retrieval resources / 检索资源

- [Short promo index / 短片精简索引](https://music.shapeof.world/collections/short-promos.index.json): start here; compare candidates, then fetch their metadataUrl for full review and provenance.
- [Short promo collection / 短片配乐合集](https://music.shapeof.world/collections/short-promos.json): short edits, measured lengths, source provenance and exact downloads.
- [Style and scene index / 风格与场景索引](https://music.shapeof.world/taxonomy.json): small bilingual index with retrieval URLs.
- Style summaries / 按风格读取: https://music.shapeof.world/styles/{id}.json
- Scene summaries / 按场景读取: https://music.shapeof.world/scenarios/{id}.json
- [Full catalog / 完整曲库](https://music.shapeof.world/catalog.json): schemaVersion, fields, taxonomy, tracks.
- [NDJSON / 逐行曲目](https://music.shapeof.world/catalog.ndjson): one track per line.
- Individual metadata / 单曲信息: https://music.shapeof.world/tracks/{id}.json
- Listening page / 试听页面: https://music.shapeof.world/track/{id}

For short promotional videos start with collections/short-promos.index.json, filter duration and use, then compare descriptions and observed instruments. Fetch the chosen metadataUrl for edit and audioReview; the full collection uses shortForm.use. Download assets.preview for the short edit; assets.master is the longer original source. Each record has an independent source composition. Structure timestamps are source prompt intentions, not verified edit markers. No retention or viral-performance claim is implied.
短片先读取精简索引，按实际时长、use 用途和实际听感描述筛选，再读取候选的 metadataUrl 获取审核与剪辑详情。preview 是短剪辑版，master 是较长的原始音频；剪辑前请试听确认。

Start with taxonomy.json and one style or scene summary to keep context small.
For complex combinations, retrieve the full catalog. Combine scenarios/styles with moods, instruments and measured duration,
then rank candidates by description and audioReview.moods/instruments (named observedMoods/observedInstruments in summaries). These are audio-review inferences; styles/scenarios and top-level moods/instruments remain curated intentions. Match all requested constraints before choosing.
先结合场景、风格、情绪、乐器与实际时长筛选，再阅读描述选择。

Use exact assets.preview for playback and short-edit downloads; use assets.master only when the original recording is needed.
New library tracks preserve requested tempo/key and targetEnergy. Energy uses the audio reviewer estimate when available; audioReview records the underlying inference.
Do not treat prompt intentions as measured acoustics. Automated audio review can be imperfect.
Do not assume seamless loops or invent asset versions. No blanket third-party rights clearance
is implied by this catalog; preserve generation provenance when using a track.
试听和下载必须使用 assets 中的完整地址；不得猜测版本、无缝循环或授权范围。

Example: select scenarios containing focus, styles containing lofi, energy <= 2,
and duration between 90 and 180 seconds. In jq:
.tracks[] | select((.scenarios // [] | index("focus")) and (.styles // [] | index("lofi")) and .energy <= 2 and .duration >= 90 and .duration <= 180) | {id, title, duration, assets}
`)
