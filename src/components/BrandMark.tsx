export const BRAND_MARK_SRC = '/assets/brand/app-icon-56.webp'
export const BRAND_MARK_SRCSET = '/assets/brand/app-icon-56.webp 1x, /assets/brand/app-icon-112.webp 2x'

export function BrandMark() {
  return (
    <img
      className="brand-mark"
      src={BRAND_MARK_SRC}
      srcSet={BRAND_MARK_SRCSET}
      width={28}
      height={28}
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority="low"
    />
  )
}
