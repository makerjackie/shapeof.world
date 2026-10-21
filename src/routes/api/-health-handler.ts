import { webBuild } from '~/lib/web-build'

type VersionMetadata = { id: string; tag?: string; timestamp?: string }

export function healthResponse(version: VersionMetadata | undefined, worldCount: number): Response {
  return Response.json({ status: 'ok', version, worldCount, release: webBuild }, { headers: { 'cache-control': 'no-store' } })
}
