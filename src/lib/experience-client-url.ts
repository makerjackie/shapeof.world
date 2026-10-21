/// <reference types="vite/client" />

/**
 * Shared client-renderer URL for modulepreload.
 *
 * Do not `import` `ExperienceRenderer.client` from server/SSR modules — TanStack
 * Start denies `*.client.*` in the worker. The Vite source path is enough in
 * `vite dev`. Production HTML relies on the renderer starting its own import
 * on mount, plus hover / next-world prefetch.
 */
export const experienceClientUrl = import.meta.env.DEV
  ? '/src/components/experiences/ExperienceRenderer.client.tsx'
  : ''
