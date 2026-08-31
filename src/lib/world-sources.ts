import type { WorldExperience, WorldSource } from '~/data/worlds/types'

/**
 * User-facing source lists must talk about the *phenomenon*, not the render stack.
 * React / Three.js / bundlers are implementation details — they used to show up in
 * the ⓘ panel and the AI guide, which made every world sound the same.
 */

const ENGINE_SOURCE_PATTERN =
  /\b(react[-\s]?three[-\s]?fiber|react three fiber|\br3f\b|three\.?js\b|\bdrei\b|@react-three|webgl2?\b(?!.*nasa)|webpack|vite\b|glsl\b(?!.*shader toy))/iu

/** Pure engine / tooling credit lines that must never lead the visitor-facing list. */
export function isEngineOnlySource(source: Pick<WorldSource, 'label' | 'labelEn' | 'url'>): boolean {
  const blob = `${source.label} ${source.labelEn} ${source.url}`
  // Keep real scientific hosts even if the label mentions WebGL in passing.
  if (/nasa\.gov|esa\.int|arxiv\.org|doi\.org|wikipedia\.org|nature\.com|science\.org|aps\.org|gwosc|jpl\.nasa/i.test(source.url)) {
    if (!/react[-\s]?three|three\.js|pmndrs/i.test(blob)) return false
  }
  if (/github\.com\/(pmndrs|mrdoob|react-spring)/i.test(source.url)) return true
  return ENGINE_SOURCE_PATTERN.test(blob)
}

/** posterSource / credit lines that only name the stack. */
export function isEngineOnlyPosterSource(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  // Entirely stack noise
  if (/^(react\s*three\s*fiber|three\.js|r3f)([·|,/\s-]+(react\s*three\s*fiber|three\.js|r3f|本地构建|local build|自定义 glsl|custom glsl))*$/i.test(trimmed)) {
    return true
  }
  // Starts with stack and has little else
  if (/^(react\s*three\s*fiber|three\.js)/i.test(trimmed) && trimmed.length < 48) return true
  return false
}

/**
 * Sources shown in ⓘ, the ask panel, and the AI system prompt.
 * Engine-only rows are dropped; if everything was engine noise, keep the
 * original list so we never ship an empty sources block without a catalog fix.
 */
export function userFacingSources(world: Pick<WorldExperience, 'sources'>): Array<WorldSource> {
  const filtered = world.sources.filter((source) => !isEngineOnlySource(source))
  return filtered.length > 0 ? filtered : world.sources
}
