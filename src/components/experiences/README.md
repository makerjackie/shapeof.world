# World opening and resource progress

`ExperienceRenderer` starts `prepareWorldDownload(renderer)` before the client
renderer arrives. The world registry and intent prefetch share that promise.
The poster keeps its normal label for 400 ms; shorter openings have no progress
bar. A real import/download failure reports `experience_error` with `value:
'error'`. An opening with no incoming bytes for 20 seconds reports the existing
`experience_load_timeout` event with `value: 'stalled'`. Arrival of new bytes or
completion can recover a stalled opening. WebGL capability detection is unchanged.

## Build manifest and byte accounting

The client Vite build emits `.vite/manifest.json`. The `world-load-manifest`
plugin walks each `worlds/<id>/index.tsx` entry's **static imports**, deduplicates
JS and CSS (including each chunk's CSS), and writes one small JSON file under
`dist/client/generated/world-loads/<build-id>/<id>.json`. The build-specific base
is compiled into the client, so a new release cannot silently pair old hashes
with new sizes. There is no checked-in table to get stale. Dynamic imports,
other worlds, posters, fonts, audio, models and English dictionaries are outside
this accounting scope. Shared static imports already loaded by the shell count
as available/cached. No world sources need modification.

The initial denominator sums actual emitted file sizes plus Resource Timing's
300-byte response envelope per file. This is the uncompressed build budget;
`Content-Length`, when available, replaces each file's budget with its actual
encoded size. On completion, its denominator is calibrated to its measured
`transferSize` (or `encodedBodySize` for cache hits). Thus compression and cache
hits can reduce the initial denominator. It is not a fixed prediction of CDN
compression. Numerators come **only** from successful Resource Timing entries,
never elapsed time or stream estimates, and a URL counts once. Cached entries
with no exposed sizes count as available using their build size.

Resource Timing reports a file only after completion, so the number advances
in steps and can remain still during a large file. Before importing, we stream
fetch the allowlisted files into the ordinary HTTP cache (up to six at once).
Nonempty stream reads reset the stall timer, but **do not add displayed bytes**.
The normal JS import/CSS preload then reuses that cache; responses must retain
the existing immutable cache headers on `/assets/*.js` and `/assets/*.css`.
No evaluation via blobs, duplicate body storage, or service worker is involved.
CDP verification must use a fresh context **with HTTP cache enabled** to reflect
production; disabling cache forces the later module import to download again.

Unknown sizes produce a byte-only label and an indeterminate bar. A missing,
invalid or unavailable JSON manifest (two-second metadata deadline) fails open
to normal imports. Without any trustworthy URL allowlist, displayed bytes stay
at zero rather than counting unrelated traffic; in this degraded case we cannot prove a network stall and leave the
indeterminate poster visible (unless the browser reports it is offline).
Actual import failures still surface immediately. Development has no production size manifest.
The manifest and shared client/dictionary bootstrap are not included in the
world's byte totals. The inactivity UI is recoverable and does not abort imports.

## Resources downloaded after mount

Inside a world renderer, use the shared provider supplied by
`ClientExperienceRenderer`:

```tsx
import { useWorldLoadProgress } from '~/components/experiences/WorldLoadProgress'

const { report, finish } = useWorldLoadProgress()
// Start from an effect or event handler, never during render.
// Use real bytes from a loader's progress callback or a response stream.
report({ loaded: 0, label: t('loadingModel') })
report({ loaded: event.loaded, total: event.lengthComputable ? event.total : undefined,
  label: t('loadingModel') })
// Call only once the asset is usable, including decoding/setup.
finish()
```

The overlay uses the same 2 px bar and 400 ms delay as opening. Omit `total`
when unknown; do not supply invented byte counts. Localize `label` for Chinese
and English, or omit it for the shared localized label. Each hook instance owns
one task; multiple tasks aggregate without overwriting one another. Unmount
removes that task. Call `finish()` in your error/abort cleanup as well and keep
resource-specific error handling in the world. This API does not impose an
opening timeout on mounted worlds, and no existing world is opted in yet.
