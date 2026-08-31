export const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Cesium's bundled Knockout expression parser uses Function construction.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://s3.tradingview.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://epic.gsfc.nasa.gov https://cdn.esahubble.org https://gibs.earthdata.nasa.gov https://api.nga.gov https://a.basemaps.cartocdn.com https://annotations.allmaps.org https://iiif.digitalcommonwealth.org https://commons.wikimedia.org https://upload.wikimedia.org",
  "connect-src 'self' blob: https://gibs.earthdata.nasa.gov https://libraryimage.nga.gov https://api.nga.gov https://a.basemaps.cartocdn.com https://annotations.allmaps.org https://iiif.digitalcommonwealth.org https://music-cdn.shapeof.world",
  "media-src 'self' https://music-cdn.shapeof.world",
  "font-src 'self' data:",
  "frame-src 'self' https://web.wwtassets.org https://earth.nullschool.net https://seanwong17.github.io https://www.tradingview-widget.com https://s.tradingview.com https://www.tradingview.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ')
