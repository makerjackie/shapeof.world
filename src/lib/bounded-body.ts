export type BodyReadResult =
  | { ok: true; value: string }
  | { ok: false; status: 400 | 413; error: string }

export async function readBoundedBody(request: Request, maximumBodyBytes = 4_096): Promise<BodyReadResult> {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      return { ok: false, status: 400, error: 'Invalid content length' }
    }
    if (Number(declaredLength) > maximumBodyBytes) {
      return { ok: false, status: 413, error: 'Payload too large' }
    }
  }

  if (!request.body) return { ok: true, value: '' }

  const reader = request.body.getReader()
  const chunks: Array<Uint8Array> = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maximumBodyBytes) {
        await reader.cancel()
        return { ok: false, status: 413, error: 'Payload too large' }
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
}
