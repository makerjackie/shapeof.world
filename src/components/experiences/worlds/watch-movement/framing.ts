/** Fit a bounding sphere in both axes of a perspective viewport (millimetres). */
export function fitWatchDistance(radius: number, aspect: number, verticalFov: number) {
  const halfVertical = verticalFov * Math.PI / 360
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * Math.max(.1, aspect))
  return radius / Math.sin(Math.min(halfVertical, halfHorizontal)) * 1.06
}
