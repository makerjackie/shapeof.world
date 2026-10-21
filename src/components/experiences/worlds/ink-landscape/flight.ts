import { Curve, Vector3 } from 'three'

export const FLIGHT_SECONDS = 22.8
export const PANORAMA_START = 18
export const BRIDGE = { z: 22, depth: 5, halfOpening: 9, height: 5.4 }
// A low river journey followed by one wide climbing return. The cubic
// B-spline keeps curvature continuous; distance and gimbal timing are separate.
export const ROUTE_POINTS = [
  [-14,4.4,128],[-14,4.4,100],[-15,4.2,61],[-2,1.6,30],
  [8,1.6,0],[20,3.7,-28],[30.5,4.1,-53],[31.5,4.1,-78],
  [28,4.3,-103],[18,5,-132],[3,5.8,-157],[-8,6,-181],
  [-12,6,-207],[-9,7,-234],[-4,14,-259],[0,25,-282],
  [-15,36,-300],[-39,43,-305],[-57,47,-298],[-67,48,-281],
  [-71,48,-260],[-70,48,-240],
] as const
class FlightCurve extends Curve<Vector3> {
  constructor() { super() }
  getPoint(t: number, out = new Vector3()) {
    const v = Math.min(1, Math.max(0,t)) * (ROUTE_POINTS.length - 3)
    const i = Math.min(ROUTE_POINTS.length - 4, Math.floor(v)), u = v - i
    const weights = [(1-u)**3/6,(3*u**3-6*u*u+4)/6,(-3*u**3+3*u*u+3*u+1)/6,u**3/6]
    out.set(0,0,0)
    for(let j=0;j<4;j++) out.addScaledVector(new Vector3(...ROUTE_POINTS[i+j]),weights[j])
    return out
  }
}
const route = new FlightCurve()
route.arcLengthDivisions = 4000
export const FLIGHT_DISTANCE = route.getLength()
const atDistance = (distance:number) => {
  const bounded=Math.max(0,Math.min(FLIGHT_DISTANCE,distance))
  const point=route.getPointAt(bounded/FLIGHT_DISTANCE)
  if(distance!==bounded) point.addScaledVector(route.getTangentAt(distance<0?0:1),distance-bounded)
  return point
}
const distanceAtTime = (seconds: number) => {
  // Preserve the fast passages, then ease to a quiet dolly through the final
  // view. Integrating speed keeps both the start and end of deceleration smooth.
  const cruise = 35, climbAt = 9.5, endSpeed = 2
  const span = 2 * (FLIGHT_DISTANCE - cruise * climbAt - endSpeed * (FLIGHT_SECONDS - climbAt)) / (cruise - endSpeed)
  const q = Math.min(1, Math.max(0, (seconds - climbAt) / span))
  const tail = Math.max(0, seconds - climbAt - span)
  return cruise * (seconds - tail) + (endSpeed - cruise) * span * (q ** 6 - 3 * q ** 5 + 2.5 * q ** 4) + endSpeed * tail
}
const travelDirection = (time: number) => {
  const d = distanceAtTime(time)
  return atDistance(d + 24).sub(atDistance(d - 12)).normalize()
}
const villageDirection = (time: number) => new Vector3(10, 25, 15).sub(atDistance(distanceAtTime(time))).normalize()
const yawOf = (v: Vector3) => Math.atan2(v.x, -v.z)
const wrap = (v: number) => Math.atan2(Math.sin(v), Math.cos(v))
const turnStart = 9.6, turnEnd = 15.9, turnSpan = turnEnd - turnStart
const yawStart = yawOf(travelDirection(turnStart))
const finalDirection = villageDirection(FLIGHT_SECONDS)
const yawEnd = yawStart + wrap(yawOf(finalDirection) - yawStart)
const derivative = (fn: (time: number) => Vector3, t: number) => wrap(yawOf(fn(t + .001)) - yawOf(fn(t - .001))) / .002
const startRate = derivative(travelDirection, turnStart)
const panoramaYaw = (time: number) => {
  if (time <= turnStart) return yawOf(travelDirection(time))
  if (time >= turnEnd) return yawEnd
  const u = (time - turnStart) / turnSpan, u2 = u * u, u3 = u2 * u
  // The short arc continues the incoming rightward gaze instead of reversing
  // into a longer left turn. Complete the gesture before the quiet panorama;
  // extending a slow turn makes the whole middle feel like a prolonged pan.
  return (2*u3-3*u2+1)*yawStart + (u3-2*u2+u)*turnSpan*startRate
    + (-2*u3+3*u2)*yawEnd
}
export function sampleFlight(time: number, _aspect = 16 / 9, _reducedMotion = false) {
  const progress = Math.min(1, Math.max(0, (Number.isFinite(time) ? time : 0) / FLIGHT_SECONDS))
  const seconds = progress * FLIGHT_SECONDS, position = atDistance(distanceAtTime(seconds))
  const direction = travelDirection(seconds)
  // Climb in world space while holding the view on the landscape. No roll,
  // animated field of view or stateful smoothing; seeking matches live playback.
  const reveal = Math.min(1, Math.max(0, (seconds - 7.1) / (PANORAMA_START - 7.1)))
  const ease = reveal ** 3 * (reveal * (reveal * 6 - 15) + 10)
  const pitch = .09 * Math.tanh(Math.asin(direction.y) / .09) * (1 - ease)
    + Math.asin(finalDirection.y) * ease
  const yaw = panoramaYaw(seconds)
  direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
  const target = position.clone().addScaledVector(direction, 100)
  return { position, target, bank: 0, progress }
}
