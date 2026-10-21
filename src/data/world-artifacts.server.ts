import { env } from 'cloudflare:workers'
import { getRequest } from '@tanstack/react-start/server'
import { homeFeaturedWeek } from '~/lib/home-featured'

import {
  worldArtifactBucketPath,
  worldCatalogPagePath,
  type HomeBootstrapArtifact,
  type CuratedWorldArtifacts,
  type MakingWorldArtifact,
  type WorldCatalogSort,
  type WorldArtifact,
  type WorldSourcesArtifact,
  type WorldSummaryPage,
} from './world-artifacts'

type AssetsBinding = {
  fetch(input: Request): Promise<Response>
}

async function readArtifactJson<T>(path: string, requestUrl?: string): Promise<T | undefined> {
  const assets = (env as unknown as { ASSETS: AssetsBinding }).ASSETS
  if (!assets) throw new Error('Missing ASSETS binding for World artifacts')
  const baseUrl = requestUrl ?? getRequest().url
  const response = await assets.fetch(new Request(new URL(path, baseUrl), {
    headers: { accept: 'application/json' },
  }))
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`World artifact request failed: ${response.status} ${path}`)
  return response.json<T>()
}

export async function loadWorldArtifact(worldId: string, requestUrl?: string): Promise<WorldArtifact | undefined> {
  const bucket = await readArtifactJson<Record<string, WorldArtifact>>(worldArtifactBucketPath(worldId), requestUrl)
  return bucket?.[worldId]
}

export async function loadWorldSummaryPage(
  page: number,
  categoryId?: string,
  sort: WorldCatalogSort = 'catalogue',
): Promise<WorldSummaryPage | undefined> {
  return readArtifactJson<WorldSummaryPage>(worldCatalogPagePath(page, categoryId, sort))
}

export async function loadHomeBootstrap(): Promise<HomeBootstrapArtifact | undefined> {
  const home = await readArtifactJson<HomeBootstrapArtifact>('/generated/world-artifacts/home-bootstrap.json')
  return home ? { ...home, featuredWeek: homeFeaturedWeek() } : undefined
}

export async function loadCuratedWorlds(): Promise<CuratedWorldArtifacts | undefined> {
  return readArtifactJson<CuratedWorldArtifacts>('/generated/world-artifacts/curated.json')
}

export async function loadWorldSources(): Promise<WorldSourcesArtifact | undefined> {
  return readArtifactJson<WorldSourcesArtifact>('/generated/world-artifacts/sources.json')
}

export async function loadMakingWorlds(): Promise<ReadonlyArray<MakingWorldArtifact> | undefined> {
  return readArtifactJson<ReadonlyArray<MakingWorldArtifact>>('/generated/world-artifacts/making.json')
}
