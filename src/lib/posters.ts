import type { WorldExperience } from '~/data/worlds/types'

/**
 * Catalogue cards never need a 2560px experience poster. Every registered
 * world ships a generated 384×256 WebP thumbnail for these dense surfaces.
 */
export function worldThumbnail(world: Pick<WorldExperience, 'id'>): string {
  return `/assets/posters/thumb/${world.id}.webp`
}

/** 首页知识星球用的更小图：128×86，避免把目录缩略图再放大成首屏竞争。 */
export function worldOrbThumbnail(world: Pick<WorldExperience, 'id'>): string {
  return `/assets/posters/orb/${world.id}.webp`
}

/** OG / 分享卡片的画幅，与 `scripts/generate-social-cards.mjs` 保持一致。 */
export const SOCIAL_CARD_WIDTH = 1200
export const SOCIAL_CARD_HEIGHT = 630

/**
 * 分享卡片：1200×630 JPEG。
 *
 * 不要在 og:image 上用体验海报——那是 WebP、16:10、单张 600 KB 上下。
 * 微信与微博对 WebP 的 OG 预览支持不可靠（分享出去经常只剩一条裸链接），
 * 而 16:10 的图按 1.91:1 声明会被平台裁坏。
 * 生成方式见 `scripts/generate-social-cards.mjs`。
 */
export function worldSocialCard(world: Pick<WorldExperience, 'id'>): string {
  return `/assets/posters/social/${world.id}.jpg`
}
