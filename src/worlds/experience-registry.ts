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

const dictionaryLoaders = {
  '../i18n/experience-en/moon-voyage.json': () => import('../i18n/experience-en/moon-voyage.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/black-hole-flyby.json': () => import('../i18n/experience-en/black-hole-flyby.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/formula-bloom.json': () => import('../i18n/experience-en/formula-bloom.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/double-slit.json': () => import('../i18n/experience-en/double-slit.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/pendulum-wave.json': () => import('../i18n/experience-en/pendulum-wave.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/double-pendulum.json': () => import('../i18n/experience-en/double-pendulum.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/firefly-sync.json': () => import('../i18n/experience-en/firefly-sync.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/chemical-garden.json': () => import('../i18n/experience-en/chemical-garden.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/neural-playground.json': () => import('../i18n/experience-en/neural-playground.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/robot-ik.json': () => import('../i18n/experience-en/robot-ik.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/solar-system.json': () => import('../i18n/experience-en/solar-system.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/three-body.json': () => import('../i18n/experience-en/three-body.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/gravity-assist.json': () => import('../i18n/experience-en/gravity-assist.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/mandelbrot-zoom.json': () => import('../i18n/experience-en/mandelbrot-zoom.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/newton-fractal.json': () => import('../i18n/experience-en/newton-fractal.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/clifford-dust.json': () => import('../i18n/experience-en/clifford-dust.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/kakeya-needle.json': () => import('../i18n/experience-en/kakeya-needle.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/strange-attractors.json': () => import('../i18n/experience-en/strange-attractors.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/fluid-sim.json': () => import('../i18n/experience-en/fluid-sim.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/electric-field.json': () => import('../i18n/experience-en/electric-field.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/magnetic-lines.json': () => import('../i18n/experience-en/magnetic-lines.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/fourier.json': () => import('../i18n/experience-en/fourier.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/ferrofluid.json': () => import('../i18n/experience-en/ferrofluid.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/soap-bubble.json': () => import('../i18n/experience-en/soap-bubble.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/pool-caustics.json': () => import('../i18n/experience-en/pool-caustics.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/pinhole-canopy.json': () => import('../i18n/experience-en/pinhole-canopy.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/lightning-lab.json': () => import('../i18n/experience-en/lightning-lab.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/snow-crystal.json': () => import('../i18n/experience-en/snow-crystal.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/boids-flocking.json': () => import('../i18n/experience-en/boids-flocking.json').then((module) => module.default as ExperienceDictionary),
  '../i18n/experience-en/phyllotaxis.json': () => import('../i18n/experience-en/phyllotaxis.json').then((module) => module.default as ExperienceDictionary),
} as Record<string, () => Promise<ExperienceDictionary>>

type WorldModule = {
  worldRenderer: RendererComponent
}

const worldModuleLoaders = {
  '../components/experiences/worlds/moon-voyage/index.tsx': () => import('../components/experiences/worlds/moon-voyage/index.tsx'),
  '../components/experiences/worlds/black-hole-flyby/index.tsx': () => import('../components/experiences/worlds/black-hole-flyby/index.tsx'),
  '../components/experiences/worlds/formula-bloom/index.tsx': () => import('../components/experiences/worlds/formula-bloom/index.tsx'),
  '../components/experiences/worlds/double-slit/index.tsx': () => import('../components/experiences/worlds/double-slit/index.tsx'),
  '../components/experiences/worlds/pendulum-wave/index.tsx': () => import('../components/experiences/worlds/pendulum-wave/index.tsx'),
  '../components/experiences/worlds/double-pendulum/index.tsx': () => import('../components/experiences/worlds/double-pendulum/index.tsx'),
  '../components/experiences/worlds/firefly-sync/index.tsx': () => import('../components/experiences/worlds/firefly-sync/index.tsx'),
  '../components/experiences/worlds/chemical-garden/index.tsx': () => import('../components/experiences/worlds/chemical-garden/index.tsx'),
  '../components/experiences/worlds/neural-playground/index.tsx': () => import('../components/experiences/worlds/neural-playground/index.tsx'),
  '../components/experiences/worlds/robot-ik/index.tsx': () => import('../components/experiences/worlds/robot-ik/index.tsx'),
  '../components/experiences/worlds/solar-system/index.tsx': () => import('../components/experiences/worlds/solar-system/index.tsx'),
  '../components/experiences/worlds/three-body/index.tsx': () => import('../components/experiences/worlds/three-body/index.tsx'),
  '../components/experiences/worlds/gravity-assist/index.tsx': () => import('../components/experiences/worlds/gravity-assist/index.tsx'),
  '../components/experiences/worlds/mandelbrot-zoom/index.tsx': () => import('../components/experiences/worlds/mandelbrot-zoom/index.tsx'),
  '../components/experiences/worlds/newton-fractal/index.tsx': () => import('../components/experiences/worlds/newton-fractal/index.tsx'),
  '../components/experiences/worlds/clifford-dust/index.tsx': () => import('../components/experiences/worlds/clifford-dust/index.tsx'),
  '../components/experiences/worlds/kakeya-needle/index.tsx': () => import('../components/experiences/worlds/kakeya-needle/index.tsx'),
  '../components/experiences/worlds/strange-attractors/index.tsx': () => import('../components/experiences/worlds/strange-attractors/index.tsx'),
  '../components/experiences/worlds/fluid-sim/index.tsx': () => import('../components/experiences/worlds/fluid-sim/index.tsx'),
  '../components/experiences/worlds/electric-field/index.tsx': () => import('../components/experiences/worlds/electric-field/index.tsx'),
  '../components/experiences/worlds/magnetic-lines/index.tsx': () => import('../components/experiences/worlds/magnetic-lines/index.tsx'),
  '../components/experiences/worlds/fourier/index.tsx': () => import('../components/experiences/worlds/fourier/index.tsx'),
  '../components/experiences/worlds/ferrofluid/index.tsx': () => import('../components/experiences/worlds/ferrofluid/index.tsx'),
  '../components/experiences/worlds/soap-bubble/index.tsx': () => import('../components/experiences/worlds/soap-bubble/index.tsx'),
  '../components/experiences/worlds/pool-caustics/index.tsx': () => import('../components/experiences/worlds/pool-caustics/index.tsx'),
  '../components/experiences/worlds/pinhole-canopy/index.tsx': () => import('../components/experiences/worlds/pinhole-canopy/index.tsx'),
  '../components/experiences/worlds/lightning-lab/index.tsx': () => import('../components/experiences/worlds/lightning-lab/index.tsx'),
  '../components/experiences/worlds/snow-crystal/index.tsx': () => import('../components/experiences/worlds/snow-crystal/index.tsx'),
  '../components/experiences/worlds/boids-flocking/index.tsx': () => import('../components/experiences/worlds/boids-flocking/index.tsx'),
  '../components/experiences/worlds/phyllotaxis/index.tsx': () => import('../components/experiences/worlds/phyllotaxis/index.tsx'),
} as Record<string, () => Promise<WorldModule>>

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
