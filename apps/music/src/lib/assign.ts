import { tracks, tracksByCategory, type Track } from '~/data/catalog'
import { categoryLabel, domains, GLOBAL_CATEGORY } from '~/data/domains'
import { formatTime } from '~/lib/format'

function lineFor(track: Track): string {
  const title = `${track.title.zh} / ${track.title.en}`
  const bits = [
    `\`${track.id}\``,
    track.code,
    title,
    track.role,
    track.kind,
    ...track.styles,
    ...track.scenarios,
    ...track.moods,
    `energy ${track.energy}/5`,
    track.bpm ? `target ${track.bpm} BPM` : null,
    formatTime(track.duration),
  ].filter(Boolean)
  return [
    `- ${bits.join(' · ')}`,
    ...(track.description ? [`  description: ${track.description.en} / ${track.description.zh}`] : []),
    `  preview: ${track.assets.preview}`,
    `  commercialUse: ${track.rights?.commercialUse === true ? 'true' : 'unknown'}`,
    `  permissions: ${track.rights?.licenseUrl ?? 'https://music.shapeof.world/audio-license.txt'}`,
    `  metadata: https://music.shapeof.world/tracks/${track.id}.json`,
    ...(track.loop?.seamless && track.loop.asset ? [`  verifiedLoop: ${track.assets[track.loop.asset]}`] : []),
    `  page: https://music.shapeof.world/track/${track.id}`,
  ].join('\n')
}

export function assignPackText(locale: 'en' | 'zh' = 'zh'): string {
  const groups = tracksByCategory(tracks)
  const header = locale === 'zh'
    ? [
        '# 世界的形状原声 — 按分类选用',
        '',
        '把这一段交给做主题的助手：按学科给每个世界选配乐。',
        '试听使用 preview。需要商用时只选 commercialUse 为 true 的素材；unknown 代表待核对。循环使用 verifiedLoop 指定文件。不要用 r2.dev。',
        '主题曲：`hidden-shapes`（世界的形状）。',
        '',
      ]
    : [
        '# Shape of the World OST — pick by category',
        '',
        'Give this block to a theme agent so each world can choose a piece.',
        'Audition the preview. Commercial requests require commercialUse=true; unknown is not permission. Use the designated verifiedLoop for loops. Never use r2.dev.',
        'Main theme: `hidden-shapes` (Shape of the World).',
        '',
      ]

  header.push('JSON: https://music.shapeof.world/catalog.json', 'AI retrieval: https://music.shapeof.world/llms.txt', '')
  const body: string[] = []
  for (const group of groups) {
    const label = categoryLabel(group.category, locale)
    const id = group.category === GLOBAL_CATEGORY ? 'global' : group.category
    body.push(`## ${label} (\`${id}\`)`)
    body.push('')
    for (const track of group.tracks) body.push(lineFor(track))
    body.push('')
  }

  const domainIndex = [
    locale === 'zh' ? '## 学科 id' : '## Domain ids',
    '',
    `- global — ${locale === 'zh' ? '全局' : 'Global'}`,
    ...domains.map((domain) => `- ${domain.id} — ${locale === 'zh' ? domain.name : domain.nameEn}`),
    '',
  ]

  return [...header, ...body, ...domainIndex].join('\n')
}
