import '@tanstack/react-start/client-only'

import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import type { DailyIssue } from '~/data/issues'
import {
  ExperienceI18nProvider,
  type ExperienceDictionary,
} from '~/i18n/experience'

export type RendererComponent = ComponentType<{
  controls: ExperienceControls
  issue?: DailyIssue
}>

const dictionaryLoaders = import.meta.glob('../i18n/experience-en/*.json', {
  import: 'default',
}) as Record<string, () => Promise<ExperienceDictionary>>

type WorldModule = {
  worldRenderer: RendererComponent
}

const worldModuleLoaders = import.meta.glob('../components/experiences/worlds/*/index.tsx') as Record<
  string,
  () => Promise<WorldModule>
>

function worldIdFromModulePath(modulePath: string): string {
  const match = modulePath.match(/\/worlds\/([^/]+)\/index\.tsx$/)
  if (!match) throw new Error(`Invalid world module path: ${modulePath}`)
  return match[1]
}

function lazyExperience<TModule>(
  id: string,
  loadModule: () => Promise<TModule>,
  selectRenderer: (module: TModule) => RendererComponent,
): LazyExoticComponent<RendererComponent> {
  return lazy(async () => {
    const loadDictionary = dictionaryLoaders[`../i18n/experience-en/${id}.json`]
    if (!loadDictionary) throw new Error(`Missing generated experience dictionary for ${id}`)

    const [module, dictionary] = await Promise.all([loadModule(), loadDictionary()])
    const Renderer = selectRenderer(module)
    const LocalizedRenderer: RendererComponent = (props) => createElement(
      ExperienceI18nProvider,
      { dictionary },
      createElement(Renderer, props),
    )
    return { default: LocalizedRenderer }
  })
}

const automaticRendererRegistry = Object.fromEntries(
  Object.entries(worldModuleLoaders).map(([modulePath, loadModule]) => {
    const worldId = worldIdFromModulePath(modulePath)
    return [worldId, lazyExperience(worldId, loadModule, (module) => module.worldRenderer)]
  }),
) as Record<string, LazyExoticComponent<RendererComponent>>

export const rendererRegistry = automaticRendererRegistry

export type RegisteredWorldRenderer = keyof typeof rendererRegistry

export const registeredRendererIds = Object.keys(rendererRegistry) as Array<RegisteredWorldRenderer>

export function getExperienceRenderer(renderer: string): LazyExoticComponent<RendererComponent> | undefined {
  return rendererRegistry[renderer as RegisteredWorldRenderer]
}
