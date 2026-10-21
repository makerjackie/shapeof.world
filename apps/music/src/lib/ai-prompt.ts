/** Keep the entry prompt short; llms.txt owns the retrieval workflow. */
export function musicPrompt(locale: 'en' | 'zh', shorts = false): string {
  return locale === 'zh'
      ? `请读取 https://music.shapeof.world/llms.txt，为我当前的${shorts ? '短视频' : '项目'}挑选适合商用的配乐、音效或环境声，并按需下载使用。`
      : `Read https://music.shapeof.world/llms.txt, choose suitable commercially usable music, sound effects or ambience for my current ${shorts ? 'short video' : 'project'}, and download/use it as needed.`
}
