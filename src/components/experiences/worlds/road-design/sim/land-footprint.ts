import type { Network, Vec3 } from './types'
import { sampleLane } from './geometry'
export interface LandRoad { points: Vec3[]; width: number }
export const LAND_METHOD = { gridMetres: 2, boundaryBufferMetres: 10, version: 2 } as const

/** Select physical pavement, clipping each main carriageway at its own outer
 * ramp joins. Empty quadrants never become land merely because of a long lead. */
export function junctionRoads(network: Network): LandRoad[] {
  const ramps = network.carriageways.filter(r => r.kind === 'ramp')
  const anchors = ramps.length ? ramps.flatMap(r => [r.points[0], r.points.at(-1)!]) : network.lanes.flatMap(l =>
    l.kind === 'connector' || l.waitingArea || l.circulating ? l.points : l.stopLine === undefined ? [] :
      [sampleLane(l, l.stopLine).position, ...(l.solid ?? []).map(s => sampleLane(l, s.start).position)])
  if (!anchors.length) return []
  const bounds = [Math.min(...anchors.map(p=>p.x)),Math.max(...anchors.map(p=>p.x)),Math.min(...anchors.map(p=>p.z)),Math.max(...anchors.map(p=>p.z))]
  const roads: LandRoad[] = []
  for (const road of network.carriageways) {
    const width = road.laneCount * road.laneWidth + (road.medianWidth ?? 0) + 2 * (road.shoulder ?? 0)
    if (road.kind === 'ramp') { roads.push({ points: road.points, width }); continue }
    // Project ramp ends to this carriageway. Accept only nearby joins; the
    // opposite carriageway is included symmetrically, but a remote arm isn't.
    const joins: number[] = []
    if (ramps.length) for (const p of anchors) {
      let best = Infinity, station = 0, offset = 0
      for (let i=1;i<road.points.length;i++) {
        const a=road.points[i-1], b=road.points[i], dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)
        const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(len*len||1)))
        const distance=Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)
        if(distance<best){best=distance;station=offset+t*len} offset+=len
      }
      if(best<=width+15)joins.push(station)
    }
    const first=Math.min(...joins),last=Math.max(...joins)
    let offset=0
    for(let i=1;i<road.points.length;i++) {
      const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)
      let enter=0,leave=1
      if(joins.length>=2 && last-first>1) { enter=Math.max(0,(first-offset)/len);leave=Math.min(1,(last-offset)/len) }
      else for(const [origin,delta,min,max] of [[a.x,dx,bounds[0],bounds[1]],[a.z,dz,bounds[2],bounds[3]]]) {
        if(Math.abs(delta)<1e-9){if(origin<min||origin>max)leave=-1;continue}
        const t0=(min-origin)/delta,t1=(max-origin)/delta
        enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1))
      }
      if(leave>enter) roads.push({width,points:[enter,leave].map(t=>({x:a.x+dx*t,y:0,z:a.z+dz*t}))})
      offset+=len
    }
  }
  return roads
}

/** Plan-projection proxy, NOT cadastral ROW: buffered pavement plus enclosed
 * ground. Bridges are projected down too. Grid is anchored to world coordinates
 * and 4-connected exterior flood fill prevents diagonal leaks through pavement. */
export function lockedLand(roads: LandRoad[], grid: number = LAND_METHOD.gridMetres, buffer: number = LAND_METHOD.boundaryBufferMetres) {
  if(!roads.length) return { area:0, roadArea:0, enclosedArea:0 }
  let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity
  for(const road of roads)for(const p of road.points){const r=road.width/2+buffer+grid*2;minX=Math.min(minX,p.x-r);minZ=Math.min(minZ,p.z-r);maxX=Math.max(maxX,p.x+r);maxZ=Math.max(maxZ,p.z+r)}
  minX=Math.floor(minX/grid)*grid;minZ=Math.floor(minZ/grid)*grid
  const w=Math.ceil((maxX-minX)/grid),h=Math.ceil((maxZ-minZ)/grid),cells=new Uint8Array(w*h)
  for(const road of roads)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],r=road.width/2+buffer,dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz
    const x0=Math.max(0,Math.floor((Math.min(a.x,b.x)-r-minX)/grid)),x1=Math.min(w-1,Math.ceil((Math.max(a.x,b.x)+r-minX)/grid))
    const z0=Math.max(0,Math.floor((Math.min(a.z,b.z)-r-minZ)/grid)),z1=Math.min(h-1,Math.ceil((Math.max(a.z,b.z)+r-minZ)/grid))
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
      const px=minX+(x+.5)*grid-a.x,pz=minZ+(z+.5)*grid-a.z,t=Math.max(0,Math.min(1,(px*dx+pz*dz)/(len2||1)))
      if((px-dx*t)**2+(pz-dz*t)**2<=r*r)cells[z*w+x]=1
    }
  }
  const queue=new Int32Array(cells.length);let head=0,tail=0,roadCells=0
  const visit=(i:number)=>{if(cells[i]===0){cells[i]=2;queue[tail++]=i}}
  for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x)}
  for(let z=0;z<h;z++){visit(z*w);visit(z*w+w-1)}
  while(head<tail){const i=queue[head++],x=i%w;if(x>0)visit(i-1);if(x<w-1)visit(i+1);if(i>=w)visit(i-w);if(i<w*(h-1))visit(i+w)}
  for(const value of cells)if(value===1)roadCells++
  return {area:(cells.length-tail)*grid*grid,roadArea:roadCells*grid*grid,enclosedArea:(cells.length-tail-roadCells)*grid*grid}
}
