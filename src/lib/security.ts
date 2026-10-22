/** Origin preference: search and answering may use the pages; training may not. */
export const contentUsage = 'search=y, ai-input=y, train-ai=n'

export const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://s3.tradingview.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://epic.gsfc.nasa.gov https://cdn.esahubble.org https://api.nga.gov https://a.basemaps.cartocdn.com https://annotations.allmaps.org https://iiif.digitalcommonwealth.org https://commons.wikimedia.org https://upload.wikimedia.org https://press.shapeof.world",
  "connect-src 'self' blob: https://libraryimage.nga.gov https://api.nga.gov https://a.basemaps.cartocdn.com https://annotations.allmaps.org https://iiif.digitalcommonwealth.org https://music-cdn.shapeof.world",
  "media-src 'self' https://music-cdn.shapeof.world https://press.shapeof.world blob:",
  "font-src 'self' data:",
  "frame-src 'self' https://web.wwtassets.org https://earth.nullschool.net https://seanwong17.github.io https://www.tradingview-widget.com https://s.tradingview.com https://www.tradingview.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ')
