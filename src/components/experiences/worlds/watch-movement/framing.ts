/** Fit a bounding sphere in both axes of a perspective viewport (millimetres). */
export function fitWatchDistance(radius: number, aspect: number, verticalFov: number) {
  const halfVertical = verticalFov * Math.PI / 360
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * Math.max(.1, aspect))
  return radius / Math.sin(Math.min(halfVertical, halfHorizontal)) * 1.06
}

/** The escapement layers rise together during the same global explosion. */
export function escapementFraming(explode: number) {
  const e = Number.isFinite(explode) ? Math.max(0, Math.min(1, explode)) : 0
  return { z: 3.8 + e * 11, radius: 6.4 + e * 1.2 }
}
