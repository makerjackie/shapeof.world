/**
 * 世界分层（曝光策略）
 *
 * 这份文件不新建一份策展名单——`home-recommended.ts` 已经是首页策展的唯一来源。
 * 它做的是把那份名单的作用范围，从「首页排序」扩展到**所有会决定用户看到什么的入口**：
 *
 * | 入口 | 改动前 | 改动后 |
 * |---|---|---|
 * | 首页「推荐」排序 | 用 `recommendedWorldRank` | 不变 |
 * | 首页「随机来一个」 | 全部 142 个等概率 | 未访问门面优先，耗尽后扩展到全部未访问 |
 * | 世界内「下一个世界」 | 按编号顺序走遍全部 | 未访问优先随机，耗尽后随机重游（跳过长尾） |
 * | 每日轮换 | 按编号偏移 | 优先门面 |
 *
 * 为什么单独一个文件：普通新增世界已经通过 per-world catalog 和自动 registry
 * 避开共享编辑；曝光分层仍是低频、单一所有者的策展决策，不应混进并行制作 slice。
 * 新世界先保持 `making`，显式晋升公开后若未列入策展名单，默认落在 `solid`。
 *
 * 三层：
 * - `flagship`       门面。「随机来一个」优先从未访问门面取，每日轮换与对外投放素材只从这里取。
 * - `solid`          合格。出现在「全部世界」网格、搜索、系列、学科筛选里。**未列出的世界默认属于这一层。**
 * - `archiveVisible` 长尾。只通过搜索和直链可达，不进入「下一个世界」链路与每日轮换。
 *
 * 注意 `archiveVisible` 不等于 `archivedWorldIds`（`world-state.ts`）：
 * 后者是彻底下线、连目录都不进；这里的世界仍然完整可玩、可被搜索命中，
 * 只是不占用有限的推荐位。
 *
 * 当前分层使用三个策展问题：
 *   1. 静音、不读文字、只看前 5 秒，我会不会想给别人看？（否 → archiveVisible）
 *   2. 海报单独放在小红书首页，会不会有人点？（否 → 先重拍海报再评）
 *   3. 玩完能不能用一句人话说出「原来如此」？（否 → 最多 solid）
 * 三个都是「是」→ flagship。
 */

import { recommendedWorldIds } from './home-recommended'

export type WorldTier = 'flagship' | 'solid' | 'archiveVisible'

/**
 * 门面容量。
 *
 * `recommendedWorldIds` 是一份 30+ 的策展排序，用来决定首页网格的先后；
 * 但「随机来一个」这颗主 CTA 需要更窄的收口——名单一旦变长，
 * 它就退化成第二个目录，失去分层的意义。取前 20 个。
 *
 * 想让某个世界进门面：把它挪到 `home-recommended.ts` 前 20 位。
 * 只有一处名单要维护。
 */
export const FLAGSHIP_CAPACITY = 20

/** 门面世界：策展名单的前 `FLAGSHIP_CAPACITY` 个。 */
export const flagshipWorldIds: ReadonlySet<string> = new Set(
  recommendedWorldIds.slice(0, FLAGSHIP_CAPACITY),
)

/**
 * 长尾世界：保留可玩与可搜索，但不占推荐位。
 *
 * 默认留空——分层的收益主要来自 flagship 那一端的收口，
 * 而把一个世界降级需要真的看过它。等按 §2.4 过一遍全部世界之后再往这里填。
 */
export const archiveVisibleWorldIds: ReadonlySet<string> = new Set([])

/** 未列出的世界默认 `solid`：新世界上线即可见，但不会自动获得门面曝光。 */
export function getWorldTier(worldId: string): WorldTier {
  if (flagshipWorldIds.has(worldId)) return 'flagship'
  if (archiveVisibleWorldIds.has(worldId)) return 'archiveVisible'
  return 'solid'
}

export function isFlagship(worldId: string): boolean {
  return flagshipWorldIds.has(worldId)
}

/** 是否进入发现流（「下一个世界」链路、每日轮换）。 */
export function isDiscoverable(worldId: string): boolean {
  return !archiveVisibleWorldIds.has(worldId)
}

type Identified = { id: string }

/** 门面子集，保持传入顺序。 */
export function selectFlagship<T extends Identified>(items: ReadonlyArray<T>): Array<T> {
  return items.filter((item) => flagshipWorldIds.has(item.id))
}

/** 发现流子集（排除 `archiveVisible`），保持传入顺序。 */
export function selectDiscoverable<T extends Identified>(items: ReadonlyArray<T>): Array<T> {
  return items.filter((item) => isDiscoverable(item.id))
}

/**
 * 每日轮换：按日期在池里取一个稳定偏移，连取 3 个。
 * 规则 + 池，不是预写队列，所以永远不会「跑干」。
 */
export function pickDailyTrio<T>(pool: ReadonlyArray<T>, date: Date): Array<T> {
  if (pool.length === 0) return []
  const yearStart = Date.UTC(date.getFullYear(), 0, 1)
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const day = Math.floor((today - yearStart) / 86_400_000)
  const offset = ((day % pool.length) + pool.length) % pool.length
  return [0, 1, 2].map((step) => pool[(offset + step) % pool.length])
}

/**
 * 「下一个世界」链路的 SSR / 无状态相邻回退：跳过 `archiveVisible` 的世界。
 * 客户端有 Atlas 访问记录时由导航选择器优先随机未访问项，耗尽后随机重游；
 * 这里仍保留相邻项回退，保证 SSR、hydration 或摘要模块加载失败时永远有返回值。
 */
export function nextDiscoverable<T extends Identified>(
  items: ReadonlyArray<T>,
  currentId: string,
  direction: -1 | 1,
): T {
  const total = items.length
  const current = items.findIndex((item) => item.id === currentId)
  for (let step = 1; step < total; step += 1) {
    const candidate = items[(((current + direction * step) % total) + total) % total]
    if (candidate && isDiscoverable(candidate.id)) return candidate
  }
  return items[(((current + direction) % total) + total) % total]
}
