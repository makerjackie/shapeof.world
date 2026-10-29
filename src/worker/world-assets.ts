/** Versioned directories of large world files (models, HDRs, decoders) kept in R2 instead of Git. */
const PREFIXES = ['car-teardown/v2/']

type AssetBucket = Pick<R2Bucket, 'get'>

/**
 * Serves `/assets/<key>` from R2 for paths that are not static files. Only the listed
 * prefixes are readable; uploads are immutable, so a new version gets a new directory.
 */
export async function handleWorldAsset(request: Request, bucket: AssetBucket | undefined): Promise<Response> {
  const fail = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } })
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } })
  }
  const key = new URL(request.url).pathname.slice('/assets/'.length)
  if (!/^[a-z0-9-]+\/v\d+\/[A-Za-z0-9/._-]+$/.test(key) || key.includes('..') || !PREFIXES.some(prefix => key.startsWith(prefix))) {
    return fail(404)
  }
  if (!bucket) return fail(503)
  const object = await bucket.get(key, { onlyIf: request.headers })
  if (object === null) return fail(404)
  const headers = new Headers({ 'x-content-type-options': 'nosniff' })
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  // A failed precondition comes back without a body.
  if (!('body' in object)) return new Response(null, { status: 304, headers })
  headers.set('content-length', String(object.size))
  return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers })
}
