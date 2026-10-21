import type { WorldExperience } from '../types'

type CatalogModule = {
  default: WorldExperience
}

const modules = import.meta.glob<CatalogModule>(['./**/*.ts', '!./index.ts'], {eager: true})

export const worldCatalog: Array<WorldExperience> = Object.entries(modules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([, module]) => module.default)
