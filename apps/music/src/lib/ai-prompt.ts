/** Keep the entry prompt short; llms.txt owns the retrieval workflow. */
export function musicPrompt(locale: 'en' | 'zh', shorts = false): string {
  return locale === 'zh'
      ? `请读取 https://music.shapeof.world/llms.txt，为我当前的非商业${shorts ? '短视频' : '项目'}挑选合适的配乐、音效或环境声，按需下载，并按 CC BY-NC 4.0 署名。`
      : `Read https://music.shapeof.world/llms.txt, choose suitable music, sound effects or ambience for my current non-commercial ${shorts ? 'short video' : 'project'}, download it as needed and credit it as CC BY-NC 4.0 requires.`
}
