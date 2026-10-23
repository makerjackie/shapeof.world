/**
 * Which player a film page shows. Films are self-hosted on Cloudflare, which
 * has no data centres in mainland China, so viewers there get the Bilibili
 * player instead. The page HTML is cached and identical for everyone; the
 * choice is made in the browser (see /api/geo), and a viewer can always switch.
 */

export type FilmPlayerKind = 'native' | 'bilibili'

export const FILM_PLAYER_STORAGE_KEY = 'shapeof.film-player.v1'

const BVID = /\/video\/(BV[0-9A-Za-z]{10})(?:[/?#]|$)/u

/** The BV id in a Bilibili watch URL, e.g. https://www.bilibili.com/video/BV1srnN6GEBC/. */
export function bilibiliBvid(watchUrl: string | undefined): string | undefined {
  if (!watchUrl) return undefined
  let url: URL
  try {
    url = new URL(watchUrl)
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' || !/(?:^|\.)bilibili\.com$/u.test(url.hostname)) return undefined
  return BVID.exec(url.pathname)?.[1]
}

export function bilibiliPlayerUrl(bvid: string): string {
  const params = new URLSearchParams({ bvid, page: '1', high_quality: '1', danmaku: '0', autoplay: '0' })
  return `https://player.bilibili.com/player.html?${params}`
}

export function parseFilmPlayer(value: unknown): FilmPlayerKind | undefined {
  return value === 'native' || value === 'bilibili' ? value : undefined
}

/** A ?player= override wins, then the viewer's own switch, then the country. */
export function chooseFilmPlayer(choice: {
  override?: FilmPlayerKind
  stored?: FilmPlayerKind
  country?: string
}): FilmPlayerKind {
  return choice.override ?? choice.stored ?? (choice.country === 'CN' ? 'bilibili' : 'native')
}
