export const PAVILION = { x: -13, z: 65, halfDepth: 3, halfOpening: 2.55, floor: 2.36, ceiling: 6.7 }
/** Shared composition and clearance data; units describe an invented landscape. */
export const GATE = { x: 31.5, z: -74, halfWidth: 7.2, halfDepth: 3.8, floor: 2.1, ceiling: 8.6 }
export const riverCenter = (z: number) => {
  if(z > 130) { const d=z-130; return Math.sin(130*.018)*1.2 + 46*Math.sin(d*.009)*Math.min(1,d/90) }
  if(z > -105) return Math.sin(z*.018)*1.2
  if(z > -230) return -22*Math.sin(Math.min(1,(-z-105)/140)*Math.PI/2)
  const q=Math.max(0,-z-230)
  return -22+190*(1-Math.exp(-q*q/110000))
}
export const riverHalfWidth = (z: number) => {
  const t = Math.max(0, Math.min(1, (-z - 110) / 60))
  return 17 + 2.5 * Math.sin(z * .018) + 12 * t * t * (3 - 2 * t)
}
export const HOUSES = [
  [23, 2, 1], [34, -11, 1.1], [45, -24, .95],
  [20, -52, 1], [44, -43, 1.05], [19, -61, .85], [46, -61, .95],
  [20, -87, .9], [45, -89, 1.05], [17, -107, .8], [44, -109, .9],
  [58, -42, .85], [60, -62, 1.05], [59, -84, .95], [57, -106, 1.1],
  [-34, -33, .9], [-43, -48, .85], [-37, -64, .8],
  [-39, -151, .9], [30, -140, 1.1], [-47, -175, .85], [20, -164, .95],
] as const
// x, z, width, height, depth, seed, silhouette, yaw. Every cliff is real geometry.
// Return view faces +z: negative x is screen right. One near bluff dominates;
// narrower opposing crags and receding shoulders leave a pale central valley.
export const MOUNTAINS = [
  [-155,-285,56,72,98,1,'shoulder',.14], [144,-288,64,102,88,3,'ridge',-.16],
  [-170,-419,91,148,93,5,'crag',.12], [186,-435,108,131,96,7,'ridge',-.22],
  [-258,-171,102,99,109,9,'shoulder',.18], [265,-157,107,132,116,11,'crag',-.17],
  [-126,-576,107,158,108,13,'ridge',.16], [294,-573,118,191,116,15,'spire',.08],
  [85,-797,160,227,150,17,'ridge',-.18], [-310,-746,140,196,138,19,'spire',.19],
  [470,-789,156,247,152,21,'ridge',-.13],
  // Low foreground buttresses frame the settlement without enclosing it.
  [-173,-52,55,52,71,23,'shoulder',.22], [161,-69,48,66,67,25,'shoulder',-.18],
  [-146,30,43,67,50,27,'crag',.11], [157,149,59,125,59,29,'crag',-.26],
  [225,171,69,83,70,31,'shoulder',.13],
  // The right cliff has one offset crown, a long sheer face and a lower rear arm.
  [-180,215,112,219,87,37,'crag',-.23], [-260,285,106,128,82,33,'shoulder',.19],
  [-165,404,59,151,69,39,'crag',.27], [171,395,53,131,63,35,'ridge',-.20],
  // Distant masses overlap obliquely; no broad mid-distance ridge seals the river.
  [-42,663,121,142,94,41,'ridge',-.21], [326,643,129,186,116,43,'ridge',.20],
  [-327,686,102,182,108,45,'spire',.22], [49,936,201,188,141,47,'ridge',-.16],
] as const
