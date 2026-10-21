import { describe, expect, it } from 'vitest'
import { musicPrompt } from './ai-prompt'

describe('AI music retrieval brief', () => {
  it('keeps bilingual prompts small and points to live retrieval resources', () => {
    for (const locale of ['en', 'zh'] as const) {
      for (const short of [false, true]) {
        const prompt = musicPrompt(locale, short)
        expect(prompt.length).toBeLessThan(240)
        expect(prompt).toContain('https://music.shapeof.world/llms.txt')
        expect(prompt.match(/https:\/\//g)).toHaveLength(1)
        expect(prompt).not.toContain('\n')
        expect(prompt).not.toMatch(/\?(?:lang|language)=/)
      }
    }
  })
})
