#!/usr/bin/env node
import { worldPath } from '../src/lib/world-urls.ts'
import firstSeen from '../src/data/generated/world-first-seen.json' with { type: 'json' }
/**
 * Print a tracked public URL for a video or post.
 *
 *   node scripts/campaign-url.mjs rainbow xhs 2026w33 hook-a
 *   node scripts/campaign-url.mjs rainbow x 2026w33
 *
 * Sources: xhs | douyin | wechat_channels | x | wechat | bili
 * Every post needs its own utm_content, otherwise the weekly report can only
 * say which platform arrived, not which video.
 */

const allowed = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const [worldId, source, week, content = 'hook-a'] = process.argv.slice(2).map((value) => value?.trim().toLowerCase())

if (!worldId || !source || !week || !allowed.test(worldId) || !allowed.test(source) || !allowed.test(week) || !allowed.test(content)) {
  console.error('Usage: node scripts/campaign-url.mjs <world-id> <source> <week> [content]')
  console.error('Example: node scripts/campaign-url.mjs rainbow xhs 2026w33 hook-a')
  process.exit(1)
}

if (!Object.hasOwn(firstSeen, worldId)) {
  console.error(`Unknown public world: ${worldId}`)
  process.exit(1)
}

const url = new URL(`https://shapeof.world${worldPath(worldId)}`)
url.searchParams.set('utm_source', source)
url.searchParams.set('utm_campaign', `${worldId}-${week}`)
url.searchParams.set('utm_content', content)
console.log(url.toString())
