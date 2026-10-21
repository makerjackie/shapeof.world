import '@tanstack/react-start/client-only'

const worldLoaders = import.meta.glob('../components/experiences/worlds/*/index.tsx')
const dictionaryLoaders = import.meta.glob('../i18n/experience-en/*.json')

/** Start the shared client renderer plus this world's chunk before navigation. */
export function prefetchWorldExperience(worldId: string): void {
  // Prefetch failures are non-fatal: the navigation itself will retry the chunk
  // and surface a real error. Swallow them so a flaky network (or a world with
  // no dictionary) cannot produce an unhandled rejection.
  const swallow = () => undefined
  void import('~/components/experiences/ExperienceRenderer.client').catch(swallow)
  void worldLoaders[`../components/experiences/worlds/${worldId}/index.tsx`]?.().catch(swallow)
  void dictionaryLoaders[`../i18n/experience-en/${worldId}.json`]?.().catch(swallow)
}
