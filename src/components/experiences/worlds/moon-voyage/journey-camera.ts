import * as THREE from 'three'
import { KM_PER_UNIT, R_E, R_M, T_COAST_END, type MissionSample } from './moon-voyage/mission'
export type CameraMode = 'journey' | 'craft' | 'earth' | 'moon' | 'wide' | 'top'
const EARTH_R=R_E/KM_PER_UNIT, MOON_R=R_M/KM_PER_UNIT
const SUN_DIR=new THREE.Vector3(.656,.5,.755).normalize()
/** A deterministic pose for every editorial time and viewport. */
export function journeyCamera(s:MissionSample, position:number, aspect:number, mode:CameraMode='journey', storyMode=true) {
    const craft = new THREE.Vector3(...s.pos).divideScalar(KM_PER_UNIT)
    const moon = new THREE.Vector3(...s.moonPos).divideScalar(KM_PER_UNIT)
    const radial = craft.clone().normalize()
    const away = craft.clone().sub(moon).normalize()
    const fit = Math.max(1, 1.1 / aspect)
    const pose = (shot: string) => {
      let target = craft.clone(), direction = radial.clone().multiplyScalar(.65).add(new THREE.Vector3(0,.45,.65)).normalize()
      let distance = 8 * fit
      if (shot === 'launch') {
        const k = THREE.MathUtils.smoothstep(s.altKm, .5, 60)
        const tangent = new THREE.Vector3(0,0,1).addScaledVector(radial,-radial.z).normalize()
        const side = new THREE.Vector3().crossVectors(radial,tangent).normalize()
        const horizonView = radial.clone().multiplyScalar(.14).addScaledVector(tangent,.75).addScaledVector(side,.65).normalize()
        direction = new THREE.Vector3(.001,.0042,.0052).normalize().lerp(horizonView,k).normalize()
        target.addScaledVector(radial,.0005*(1-THREE.MathUtils.smoothstep(s.altKm,0,1)))
        distance = Math.min(10, .004 + Math.max(0,s.altKm)/100*.8) * fit
      } else if (shot === 'earth') {
        target.set(0,0,0); direction.copy(radial).add(new THREE.Vector3(0,.55,0)).normalize(); distance = EARTH_R * 3.5 * fit
      } else if (shot === 'wide' || shot === 'top') {
        target.copy(moon).multiplyScalar(.5)
        direction.set(.15,1,.15).normalize(); distance = 5000 * fit
      } else if (shot === 'lookback') {
        target.set(0,0,0); direction.copy(radial).add(new THREE.Vector3(0,.12,0)).normalize()
        distance = Math.max(EARTH_R*3, craft.length()+EARTH_R*1.5)*fit
      } else if (shot === 'moon') {
        target.copy(moon); direction.copy(SUN_DIR); distance = MOON_R*3.6*fit
      } else if (s.t >= T_COAST_END) {
        direction.copy(away).multiplyScalar(.65).add(new THREE.Vector3(0,.65,.25)).normalize(); distance = 7*fit
      }
      return { target, direction, distance }
    }
    const cuts: Array<[number,string]> = [[0,'launch'],[16,'launch'],[22,'earth'],[35,'earth'],[43,'lookback'],[54,'wide'],[62,'wide'],[72,'moon'],[100,'moon']]
    let a = pose(mode), b = a, blend = 0
    if (storyMode || mode === 'journey') {
      for (let i=1;i<cuts.length;i++) if(position <= cuts[i][0]) {
        const left=cuts[i-1], right=cuts[i]
        a=pose(left[1]); b=pose(right[1]); blend=THREE.MathUtils.smoothstep(position,left[0],right[0]); break
      }
    }
    const target = a.target.clone().lerp(b.target,blend)
    // Interpolate actual camera endpoints, not a target inside a planet plus
    // an independently interpolated distance. The latter tunnels through Earth.
    const cameraPosition = a.target.clone().addScaledVector(a.direction,a.distance)
      .lerp(b.target.clone().addScaledVector(b.direction,b.distance),blend)
    if(cameraPosition.length()<EARTH_R+.002) cameraPosition.setLength(EARTH_R+.002)
    const fromMoon=cameraPosition.clone().sub(moon)
    if(fromMoon.length()<MOON_R+.002) cameraPosition.copy(moon).add(fromMoon.setLength(MOON_R+.002))
    const up = new THREE.Vector3(0,1,0)
    if (position < 22 && (storyMode || mode==='journey')) up.set(1,0,0).lerp(new THREE.Vector3(0,1,0),THREE.MathUtils.smoothstep(position,16,22)).normalize()
    return {position:cameraPosition,target,up}
}
