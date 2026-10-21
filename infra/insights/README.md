# Shape of the World Insights

`insights.shapeof.world` is a separate, read-only Cloudflare Worker. It reads
aggregated data from the existing `oneworld_events` Analytics Engine dataset and
never sends visitor- or session-level rows to the browser.

## Product surface

- One password-protected dashboard for investors and operators.
- Three product outcomes first, then drivers, AI analysis, common website
  metrics, world-level details, and metric definitions.
- Dashboard data is queried live from Analytics Engine on every load or range
  change; fresh data never requires a code change or redeploy.
- Rolling 7, 30, and 90 day windows. Matched previous-period comparisons appear
  only when the retained dataset contains a complete baseline; the 90-day view
  deliberately omits comparison because it reaches the raw-data retention limit.
- Static UI assets are public, but every data API response requires a signed,
  seven-day, HttpOnly, Secure, SameSite=Strict session cookie.

## Permanent event archive

Analytics Engine keeps raw rows for three months, so a cron trigger every 10
minutes copies every row of `ARCHIVE_DATASETS` (`oneworld_events`, then
`shape_of_world_app_events`) into the D1 database `shapeof-analytics`
(binding `ANALYTICS_ARCHIVE`). The schema and its duplicate handling are
documented in `migrations/0001_events_archive.sql`; the export is
`src/archive.ts`.

- `events` keeps one row per Analytics Engine row with all original columns
  unchanged (`timestamp`, `_sample_interval`, `index1`, `blob1`..`blob20`,
  `double1`..`double20`) plus `dataset`, `occurrence` and a SHA-256
  `row_hash`. The unique hash makes re-exports idempotent; `occurrence`
  numbers identical rows so true duplicates are kept.
- `archive_days` records each exported UTC day. Each run exports the oldest
  days not yet complete (up to 10 per run, 5 minutes of wall time), starting
  from the earliest day Analytics Engine still holds. A day becomes complete
  once it is the day before yesterday or older and the archive holds at least
  the row count Analytics Engine reports; yesterday is re-exported at most
  hourly until then.
- Weight counts by `_sample_interval` when querying the archive, as with
  Analytics Engine itself.

```bash
npx wrangler d1 migrations apply shapeof-analytics --remote
npx wrangler d1 execute shapeof-analytics --remote \
  --command "SELECT dataset, day, rows, expected_rows, complete FROM archive_days ORDER BY day"
```

The dashboard still reads Analytics Engine live. Worlds removed from the catalog
keep their historical metrics: `scripts/generate-catalog.mjs` moves a removed
world's last title into `src/world-catalog.retired.json`, and worlds missing
from both lists are shown by their raw id.

## Required Worker secrets

- `INSIGHTS_PASSWORD`
- `INSIGHTS_SESSION_SECRET` (at least 32 random characters)
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ANALYTICS_TOKEN` with Account Analytics Read permission

Set them with Wrangler; never add their values to this repository.

## Optional AI analysis

Set `DEEPSEEK_API_KEY` to enable the evidence-linked AI report. The Worker sends
only bounded aggregate facts to the official DeepSeek API, validates the JSON
response, rejects unsupported numeric claims, and caches each report for one
hour. Without the secret, the rest of the dashboard remains fully available and
shows a clear configuration state instead of fabricated analysis.

The default model is `deepseek-v4-pro`; it can be changed with the non-secret
`DEEPSEEK_MODEL` Worker variable. Use `POST /api/report?days=7` to explicitly
refresh a report, subject to authentication and rate limiting.

New telemetry records only low-cardinality device and browser categories derived
server-side. Raw User-Agent values are never stored, and historical data is not
backfilled.

## Commands

```bash
pnpm --dir infra/insights check
pnpm --dir infra/insights deploy
```

The catalog is generated from `src/data/generated/world-summaries.json`, so the
dashboard uses the same titles, domains, and poster IDs as the public site, plus
the stored titles in `src/world-catalog.retired.json`. Commit that file when a
world removal changes it.
