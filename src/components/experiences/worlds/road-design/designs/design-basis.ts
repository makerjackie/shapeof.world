import { arc, joinPaths, line, point } from './kit'
/** JTG/T D21-2014 tables 4.3.2, 8.2.1, 8.3.1. Design speed is
 * distinct from each microscopic driver's desired speed. */
export const DESIGN_BASIS = { mainKmh: 120, rightKmh: 60, loopKmh: 40, stackKmh: 60, turbineKmh: 60,
  loopRadius: 60, rightRadius: 150, directionalRadius: 150, maximumGrade: .04, deckSeparation: 8,
  rightStation: 330, accelerationLength: 320, decelerationLength: 145 } as const
/** Two 45-degree R150 curves with a diagonal tangent: unlike the old cubic,
 * curvature stays below 1/150 at the noses while clearing the clover loops. */
export function rightRampPath(outer: number, station = DESIGN_BASIS.rightStation) {
  const r=DESIGN_BASIS.rightRadius, a=point(-station,outer+r), b=point(-outer-r,station)
  const first=arc(a,r,-Math.PI/2,Math.PI/4,40),last=arc(b,r,-Math.PI/4,Math.PI/4,40)
  return joinPaths(first,line(first.at(-1)!,last[0],20),last)
}
