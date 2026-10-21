import { afterEach, describe, expect, it } from 'vitest'
import { loadClassicFilmScript } from './classic-film-loader'

afterEach(() => {
  document.querySelectorAll('script[data-classic-film]').forEach((script) => script.remove())
})

describe('classic film assets', () => {
  it('runs Vite-inlined UTF-8 assets as inline classic scripts instead of CSP-blocked data URLs', async () => {
    const source = "void '蚕的一生'"
    const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
    const script = await loadClassicFilmScript(url, 'silkworm-life', 'i18n.js')

    expect(script.getAttribute('src')).toBeNull()
    expect(script.textContent).toBe(source)
    expect(script.dataset.classicFilm).toBe('silkworm-life')
  })

})
