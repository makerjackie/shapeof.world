import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { BRIDGE } from './flight'
import { buildVillage } from './songxi-village'
import { buildDownstream } from './songxi-landmarks'
import { buildFoothills } from './songxi-foothills'
import { createPaintMaterial } from './songxi-textures'
import { applySongxiFog } from './songxi-fog'
import { GATE, HOUSES, MOUNTAINS, PAVILION, riverCenter, riverHalfWidth } from './songxi-layout'
import { mountainSurface, createMountainGeometry, type Mountain } from './songxi-mountains'

type Point = [number, number, number]

/** The river, village and all mountain layers share one navigable 3D space. */
export function buildSongxi(scene: T.Scene, renderer: T.WebGLRenderer, paper: T.Color) {
  let seed = 71212
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const range = (a: number, b: number) => a + random() * (b - a)
  const loads: Promise<unknown>[] = [], textures: T.Texture[] = []
  const loader = new T.TextureLoader()
  const load = (url: string, repeat = false) => {
    let tex!: T.Texture
    loads.push(new Promise((resolve, reject) => { tex = loader.load(url, resolve, undefined, reject) }))
    if (repeat) tex.wrapS = tex.wrapT = T.RepeatWrapping
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.push(tex); return tex
  }
  const brush = load('/assets/worlds/ink-landscape/rock-ink-v1.webp', true)
  const cun = load('/assets/worlds/ink-landscape/songxi-v1/cun-v2.webp', true)
  const cliffBrush = load('/assets/worlds/ink-landscape/songxi-v1/cun-v3.webp', true)
  const pineMap = load('/assets/worlds/ink-landscape/songxi-v1/pine.webp'); pineMap.colorSpace = T.SRGBColorSpace
  const masonry = load('/assets/worlds/ink-landscape/songxi-v1/stone.webp', true)
  const rock = createPaintMaterial(cliffBrush, paper, .045, 1.55, '#292e29', .025, 'rock')
  const paleRock = createPaintMaterial(cliffBrush, paper, .012, 1.2, '#51584e', .015, 'rock')
  const cliffInk = createPaintMaterial(cliffBrush, paper, .018, 1.7, '#252b27', .025, 'rock')
  const stone = createPaintMaterial(masonry, paper, .13, 1.20)
  const paving = createPaintMaterial(masonry, paper, .24, .85)
  const canopyMaterial = stone.clone(); canopyMaterial.side = T.DoubleSide
  const bankWash = createPaintMaterial(cun, paper, .028, .64, '#5b604b', .07, 'earth')
  const plaster = createPaintMaterial(cun, paper, .05, .17)
  const timber = new T.MeshBasicMaterial({ color: '#514a3b' })
  const bark = createPaintMaterial(brush, paper, .19, 1.35, '#272c26', .16)
  const dark = new T.MeshBasicMaterial({ color: '#514a3d' })
  const roofInk = createPaintMaterial(cun, paper, .15, 1.25, '#30352e', .57)
  roofInk.side = T.DoubleSide
  const drawings = new Map<string, number[]>()
  const meshes = new Map<T.Material, T.Mesh[]>()
  const line = (points: Point[], color = '#766e5b') => {
    const values = drawings.get(color) ?? []; drawings.set(color, values)
    for (let i = 1; i < points.length; i++) values.push(...points[i - 1], ...points[i])
  }
  const mesh = (geometry: T.BufferGeometry, material: T.Material, p: Point = [0,0,0], scale: Point = [1,1,1]) => {
    const m = new T.Mesh(geometry, material); m.position.set(...p); m.scale.set(...scale)
    const list = meshes.get(material) ?? []; list.push(m); meshes.set(material, list); return m
  }
  const segment = (a: Point, b: Point, radius: number, material: T.Material = timber, tip = radius * .65) => {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b)
    const m = mesh(new T.CylinderGeometry(tip, radius, av.distanceTo(bv), 7), material)
    m.position.copy(av).add(bv).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), bv.sub(av).normalize())
  }
  // Hand-drawn foliage is distributed across depth, above real branching trunks.
  const foliageMaterial = new T.MeshBasicMaterial({ map: pineMap, transparent: true, alphaTest: .3, side: T.DoubleSide, color: '#625e4f' })
  const foliage = new T.InstancedMesh(new T.PlaneGeometry(1,1), foliageMaterial, 48000)
  const transform = new T.Object3D(); let count = 0
  const tuft = (p: Point, size: number) => {
    for (let k = 0; k < 3 && count < 48000; k++) {
      transform.position.set(...p); transform.position.y += k * .05
      transform.rotation.set(k === 2 ? -1.05 : range(-.2,.1), k * Math.PI / 3 + range(-.3,.3), range(-.08,.08))
      transform.scale.set(size, size * .9, 1); transform.updateMatrix(); foliage.setMatrixAt(count++, transform.matrix)
    }
  }
  const pine = (x: number, y: number, z: number, s: number, lean = 1) => {
    const trunk: Point[] = [[x,y-.9,z],[x+s*.09*lean,y+s*.4,z],[x+s*.04*lean,y+s*.7,z+s*.05],[x+s*.19*lean,y+s,z]]
    for (let j=1;j<trunk.length;j++) {
      segment(trunk[j-1],trunk[j],s*(.043-j*.009),bark)
      for(let k=0;k<3;k++){const p=trunk[j-1],q=trunk[j],r=s*(.043-j*.009);line([[p[0]+r*.6,p[1],p[2]+r*(k-1)*.4],[q[0]+r*.5,q[1],q[2]+r*(k-1)*.4]],'#c4bba3')}
    }
    for (let j=0;j<7;j++) {
      const h=.36+j*.09, a=j*2.35, length=s*(.42-h*.23)
      const start: Point=[x+s*.1*lean,y+h*s,z]
      const mid: Point=[start[0]+Math.cos(a)*length*.55,start[1]+s*.035,start[2]+Math.sin(a)*length*.55]
      const end: Point=[start[0]+Math.cos(a)*length,start[1]+s*.10,start[2]+Math.sin(a)*length]
      segment(start,mid,s*.015,bark);segment(mid,end,s*.009,bark)
      tuft([end[0],end[1]+s*.065,end[2]],s*range(.38,.57))
    }
    tuft(trunk[3],s*.4)
  }
  const boulder = (x: number,y: number,z: number,w: number,h: number,d: number, material = rock) => {
    const g=new T.IcosahedronGeometry(1,2), a=g.getAttribute('position')
    for(let i=0;i<a.count;i++){const px=a.getX(i),py=a.getY(i),pz=a.getZ(i),r=1+.075*Math.sin(px*19+py*13+pz*17);a.setXYZ(i,px*r,py*r,pz*r)}
    g.computeVertexNormals(); const m=mesh(g,material,[x,y,z],[w,h,d]);m.rotation.y=range(0,6.28)
  }
  // Continuous raised banks; the river remains an actual opening between them.
  for(const side of [-1,1]) {
    const positions:number[]=[],indices:number[]=[]
    for(let j=0;j<=400;j++)for(let i=0;i<=10;i++) {
      const z=700-j*5.5, bank=riverHalfWidth(z), u=i/10
      positions.push(riverCenter(z)+side*(bank+u*950), -.15+Math.sqrt(u)*4+Math.sin(z*.09+u*5)*u*.75,z)
    }
    for(let j=0;j<400;j++)for(let i=0;i<10;i++){const a=j*11+i;indices.push(a,a+11,a+1,a+1,a+11,a+12)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(side>0?indices.reverse():indices);g.computeVertexNormals();mesh(g,bankWash)
    for(let j=0;j<105;j++) {
      const z=range(-790,138),x=riverCenter(z)+side*(riverHalfWidth(z)+range(-1.5,4))
      boulder(x,.2,z,range(1.5,5),range(.7,2.7),range(2,5))
      if(j%4===2)pine(x+side*range(2,6),.6,z,range(5,10),-side)
    }
  }
  boulder(-20,.6,86,2,1.6,4);boulder(-24,2,73,4,3.5,5)
  pine(-22,5,79,24,1);pine(-31,9,61,20,1);pine(19,2,44,12,-1);boulder(19,.2,44,3.2,2.6,3.8)
  for(const [x,y,z,w,h,d] of [[-31,2,85,12,9,12],[-34,5,64,10,12,12],[-42,8,76,11,18,15],[-27,1,47,8,5,10]])boulder(x,y,z,w,h,d)

  // Closed, irregular rock volumes at every depth; the flight enters the mountain range.
  const cliff=(m:Mountain)=>{
    const [x,z,w,h,d]=m
    const point=(t:number,a:number)=>mountainSurface(m,t,a)
    mesh(createMountainGeometry(m),Math.abs(z) > 580?paleRock:cliffInk)
    // Roots only occupy upward-facing ledges. Clustered growth leaves bare
    // cliff faces for the broad ink washes instead of pinning trees to walls.
    const planted = (t: number, a: number, size: number) => {
      const p = new T.Vector3(...point(t, a))
      const along = new T.Vector3(...point(t, a + .002)).sub(p)
      const up = new T.Vector3(...point(Math.min(.998, t + .002), a)).sub(p)
      if (new T.Vector3().crossVectors(up, along).normalize().y < .62) return
      pine(p.x, p.y - .28, p.z, size)
    }
    for(let k=0;k<16;k++) {
      const t=range(.18,.94),a=range(0,6.28)
      for(let j=0;j<3;j++) planted(Math.min(.985,t+j*.013),a+j*.043,range(3.8,7.5))
    }
    for(let k=0;k<15;k++) planted(range(.95,.985),range(0,6.28),range(3.8,7.5))
    // Low, overlapping shoulders connect peaks to the valley rather than floating.
    boulder(x+w*.25,1,z+d*.3,w*.78,h*.16,d*.86,Math.abs(z) > 580?paleRock:cliffInk)
  }
  MOUNTAINS.forEach(cliff)
  for(let j=0;j<95;j++){
    const z=range(-650,-155),side=j%2?1:-1,x=riverCenter(z)+side*(riverHalfWidth(z)+range(5,19))
    boulder(x,1,z,range(2,5),range(1.2,4),range(3,7),cliffInk)
    if(j%2===0)pine(x,2,z,range(4,8),-side)
  }
  // Real extruded masonry arch. The opening is empty all the way through.
  const top=(x:number)=>2.2+5.2*(1-(x/19)**2)
  const shape=new T.Shape();shape.moveTo(-19,-1)
  for(let i=0;i<=100;i++){const x=-19+i*.38;shape.lineTo(x,top(x))}
  shape.lineTo(19,-1);shape.lineTo(BRIDGE.halfOpening,-1);shape.lineTo(BRIDGE.halfOpening,0)
  for(let i=0;i<=96;i++){const a=i/96*Math.PI;shape.lineTo(Math.cos(a)*BRIDGE.halfOpening,Math.sin(a)*BRIDGE.height)}
  shape.lineTo(-BRIDGE.halfOpening,-1);shape.closePath()
  mesh(new T.ExtrudeGeometry(shape,{depth:BRIDGE.depth,bevelEnabled:false}),stone,[0,0,BRIDGE.z-BRIDGE.depth/2])
  for(const z of [BRIDGE.z-BRIDGE.depth/2-.03,BRIDGE.z+BRIDGE.depth/2+.03]) {
    for(let j=0;j<=38;j++){
      const x=-19+j,y=top(x)
      mesh(new T.BoxGeometry(.17,1.15,.19),stone,[x,y+.57,z]);mesh(new T.SphereGeometry(.15,6,4),stone,[x,y+1.18,z])
      if(j<38)segment([x,y+.83,z],[x+1,top(x+1)+.83,z],.075,stone,.075)
    }
    // Radial voussoirs and a double ink outline make the arch readable up close.
    const inner:Point[]=[],outer:Point[]=[]
    for(let i=0;i<=80;i++){const a=i/80*Math.PI;inner.push([Math.cos(a)*9,Math.sin(a)*5.4,z]);outer.push([Math.cos(a)*9.65,Math.sin(a)*6.08,z]);if(i%2===0)line([inner[i],outer[i]],'#706757')}
    line(inner,'#5c5344');line(outer,'#736a59')
  }
  // Drawn tile roofs: physical eaves, curved tiles and ridges on every side.
  const roof=(x:number,y:number,z:number,w:number,d:number,h:number)=>{
    const positions:number[]=[],indices:number[]=[],rows=24,cols=36
    const point=(u:number,v:number):Point=>{
      const hip=Math.max(0,(Math.abs(u)-.54)/.46),fall=Math.max(Math.abs(v),hip)
      const curl=Math.pow(fall,8)*h*(.18+.12*Math.pow(Math.abs(u),6))
      return[x+u*w,y+h*Math.pow(1-fall,1.65)+curl,z+v*d]
    }
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++)positions.push(...point(i/cols*2-1,j/rows*2-1))
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;indices.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,roofInk)
    for(let i=0;i<=cols;i++)line(Array.from({length:rows+1},(_,j)=>{const p=point(i/cols*2-1,j/rows*2-1);p[1]+=.035;return p}),'#aaa08a')
    for(let j=0;j<=rows;j+=2)line(Array.from({length:cols+1},(_,i)=>{const p=point(i/cols*2-1,j/rows*2-1);p[1]+=.04;return p}),'#827864')
    for(const v of [-1,1])line(Array.from({length:cols+1},(_,i)=>point(i/cols*2-1,v)),'#363c32')
    for(const u of [-1,1])line(Array.from({length:rows+1},(_,j)=>point(u,j/rows*2-1)),'#363c32')
    // Substantial ridge cap, raised tips and individual eave battens.
    segment([x-w*.56,y+h+.07,z],[x+w*.56,y+h+.07,z],.09,roofInk,.09)
    for(const side of [-1,1])segment([x+side*w*.54,y+h+.06,z],[x+side*w*.66,y+h+.35,z],.08,roofInk,.025)
    for(let i=-14;i<=14;i++)for(const sign of [-1,1]){
      const a=point(i/14,sign),b=point(i/14,sign*.66)
      segment([a[0],a[1]-.06,a[2]],[b[0],b[1]-.06,b[2]],.04,timber,.035)
    }
  }
  const pavilion=(x:number,z:number,base=0)=>{
    mesh(new T.BoxGeometry(7.8,base+3.1,7.8),stone,[x,(base+1.1)/2,z])
    mesh(new T.BoxGeometry(8.4,.28,8.4),stone,[x,base+2.22,z])
    for(const dx of [-2.7,2.7])for(const dz of [-2.7,2.7])segment([x+dx,base+2.3,z+dz],[x+dx,base+8,z+dz],.14)
    for(const side of [-1,1]) {segment([x-2.7,base+7,z+side*2.7],[x+2.7,base+7,z+side*2.7],.13);segment([x+side*2.7,base+7,z-2.7],[x+side*2.7,base+7,z+2.7],.13)}
    for(const side of [-1,1])for(let j=0;j<9;j++) {
      const u=-2.7+j*.675
      segment([x+u,base+6.7,z+side*2.7],[x+u,base+7.65,z+side*2.7],.035)
      segment([x+side*2.7,base+6.7,z+u],[x+side*2.7,base+7.65,z+u],.035)
    }
    roof(x,base+7.1,z,4.7,4.7,2.9)
    mesh(new T.SphereGeometry(.18,10,8),dark,[x,base+10.3,z])
    for(let j=0;j<8;j++)mesh(new T.BoxGeometry(2.5,.3,1),stone,[x+2,base+2.1-j*.26,z+3.6+j*.55])
    for(const dx of [-2.7,2.7]) {segment([x+dx,base+3.3,z-2.7],[x+dx,base+3.3,z+2.7],.07);for(let k=0;k<7;k++)segment([x+dx,base+2.5,z-2.7+k*.9],[x+dx,base+3.3,z-2.7+k*.9],.035)}
  }
  pavilion(PAVILION.x,PAVILION.z)
  // The moored boat leads into an open pavilion on a stone promontory.
  mesh(new T.BoxGeometry(11,2.9,5.5),stone,[-18.5,.65,65])
  boulder(-25,1,58,7,4,8)
  buildVillage({ mesh, line, segment, roof, materials: { plaster, stone, timber, dark, roofInk } }, HOUSES)
  buildDownstream({ mesh, line, segment, roof, pavilion, pine, boulder, materials: { plaster, stone, paving, timber, dark, roofInk } })
  for(let j=0;j<28;j++) {
    const z=-14-j*3.7,x=riverCenter(z)+riverHalfWidth(z)+1.7
    mesh(new T.BoxGeometry(2.6,2.25,4.0),stone,[x,.75,z])
    if(j%3===0){segment([x-.8,1.9,z],[x-.8,2.8,z],.09,stone);segment([x-.8,2.6,z],[x-.8,2.6,z-3.7],.075,stone)}
  }

  // A real gatehouse: two side rooms and an upper floor leave an empty passage.
  mesh(new T.BoxGeometry(20,3,102),paving,[31.5,.60,-73])
  for(const side of [-1,1]) {
    const x=GATE.x+side*10.8
    mesh(new T.BoxGeometry(7.6,3,8),stone,[x,.6,GATE.z])
    mesh(new T.BoxGeometry(7.2,6.5,7.6),plaster,[x,5.35,GATE.z])
    for(const dz of [-3.9,3.9])for(const dx of [-3.5,3.5])segment([x+dx,2.1,GATE.z+dz],[x+dx,9.2,GATE.z+dz],.14)
    roof(x,8.6,GATE.z,4.6,5.0,2.7)
    for(let j=0;j<8;j++)mesh(new T.BoxGeometry(.10,3.6,.1),timber,[GATE.x+side*7.1,4.3,GATE.z-3.2+j*.9])
  }
  mesh(new T.BoxGeometry(14.4,3.8,7.6),plaster,[GATE.x,10.5,GATE.z])
  roof(GATE.x,12.4,GATE.z,11.1,5.6,3.1)
  for(const dz of [-3.83,3.83]) {
    segment([GATE.x-8.5,8.6,GATE.z+dz],[GATE.x+8.5,8.6,GATE.z+dz],.17)
    for(const dx of [-4.5,0,4.5]) {
      mesh(new T.BoxGeometry(2.2,1.6,.10),dark,[GATE.x+dx,10.5,GATE.z+dz])
      for(let j=0;j<5;j++)mesh(new T.BoxGeometry(.06,1.6,.14),timber,[GATE.x+dx-1+j*.5,10.5,GATE.z+dz])
    }
  }
  const vermilion=new T.MeshBasicMaterial({color:'#885e49'})
  for(const z of [-44,-59,-91,-110])for(const side of [-1,1]) {
    const x=31.5+side*6.8
    segment([x,2.15,z],[x,6.8,z],.055)
    segment([x,6.8,z],[x-side*.7,6.8,z],.04)
    mesh(new T.SphereGeometry(.35,10,8),vermilion,[x-side*.7,6.25,z],[1,1.25,1])
    line([[x-side*.7,5.8,z],[x-side*.7,5.45,z]],'#70523c')
  }
  // Waterside awnings, stacked baskets, stone steps and raised balconies.
  for(const [x,z] of [[24,-40],[39,-91],[21,-108]]) {
    mesh(new T.BoxGeometry(4,.10,2.4),timber,[x,5.1,z])
    for(const dx of [-1.8,1.8])segment([x+dx,2.1,z+.9],[x+dx,5.15,z+.9],.055)
    for(let i=0;i<4;i++){mesh(new T.CylinderGeometry(.4,.34,.6,9),stone,[x-1.5+i*.9,2.5,z]);for(let j=0;j<3;j++)line([[x-1.8+i*.9,2.3+j*.15,z+.3],[x-1.2+i*.9,2.3+j*.15,z+.3]],'#6f624e')}
  }
  const willow=(x:number,z:number,s:number)=>{
    segment([x,-.3,z],[x-.5,1+s*.65,z],.24)
    for(let j=0;j<21;j++) {
      const a=j/21*Math.PI*2,r=range(s*.22,s*.44)
      const end:Point=[x+Math.cos(a)*r,1+s*.78,z+Math.sin(a)*r]
      segment([x-.5,1+s*.55,z],end,.075)
      for(let k=0;k<4;k++) {
        const strand:Point[]=[]
        for(let l=0;l<=16;l++){const t=l/16;strand.push([end[0]+Math.cos(a)*(t*.7+k*.12),end[1]+Math.sin(t*Math.PI)*.7-t*s*.65,end[2]+Math.sin(a)*(t*.7+k*.1)])}
        line(strand,'#6d7156')
        for(let l=3;l<strand.length;l++){const p=strand[l];line([[p[0]-.12,p[1]+.19,p[2]],[p[0],p[1]-.18,p[2]+.11]],'#727157')}
      }
    }
  }
  willow(18,10,9);willow(-17,-48,8);willow(51,-76,7);willow(-13,-116,8)
  // Landing stage and mooring stakes provide close, continuous speed references.
  for(const [x,z] of [[-12,68],[12,-10]]) {
    mesh(new T.BoxGeometry(5,.24,7),timber,[x,.75,z])
    for(let j=0;j<15;j++)line([[x-2.5,.88,z-3.5+j*.48],[x+2.5,.88,z-3.5+j*.48]],'#a59a80')
    for(const dx of [-2.2,2.2])for(const dz of [-3,3])segment([x+dx,-.4,z+dz],[x+dx,1.65,z+dz],.10)
  }
  const boats:T.Group[]=[]
  const boat=(x:number,z:number,angle:number)=>{
    const group=new T.Group(),shape=new T.Shape();shape.moveTo(0,-3.3);shape.quadraticCurveTo(1.35,-1.8,1.1,1.9);shape.quadraticCurveTo(.6,3.7,0,3.9);shape.quadraticCurveTo(-.9,3,-1.1,1.9);shape.quadraticCurveTo(-1.35,-1.8,0,-3.3)
    const hull=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.42,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:1}),dark);hull.rotation.x=-Math.PI/2;group.add(hull)
    const canopy=new T.Mesh(new T.CylinderGeometry(.9,.9,3.1,20,1,true,Math.PI/2,Math.PI),canopyMaterial);canopy.rotation.x=Math.PI/2;canopy.position.set(0,.6,.4);group.add(canopy)
    for(let i=0;i<9;i++){const pts=Array.from({length:21},(_,j)=>new T.Vector3(Math.cos(j/20*Math.PI)*.91,.6+Math.sin(j/20*Math.PI)*.91,-1.1+i*.375));group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#6a604d'})))}
    const pole=new T.Mesh(new T.CylinderGeometry(.023,.023,5.7,5),dark);pole.rotation.z=-.55;pole.position.set(1.7,.5,2);group.add(pole)
    group.position.set(x,.05,z);group.rotation.y=angle;scene.add(group);boats.push(group)
  }
  boat(5.5,60,.12);boat(-13,78,-.15);boat(-6,-54,.25)
  boat(-16,-161,-.1);boat(9,-109,.4)
  const wakes:T.Line[]=[]
  for(const [x,z] of [[5.5,60],[-13,78],[-6,-54],[-16,-161],[9,-109]])for(let ring=0;ring<4;ring++) {
    const pts:T.Vector3[]=[]
    for(let j=0;j<=36;j++){const angle=-.25+ring*.42+j/36*2.3;pts.push(new T.Vector3(Math.cos(angle),0,Math.sin(angle)*1.65))}
    const wake=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#838471',transparent:true,opacity:.20}));wake.position.set(x,.012,z);scene.add(wake);wakes.push(wake)
  }
  // Sparse, curving water strokes drawn in the river plane, with irregular
  // lengths and spacing. They supply water detail without a full-screen grid.
  const waterMarks:number[]=[]
  for(let i=0;i<950;i++) {
    const z=range(-920,145),half=riverHalfWidth(z),centre=riverCenter(z)
    const length=range(1.4,8.5),x=centre+range(-half+length+1,half-length-1),bend=range(-.17,.17)
    for(let j=0;j<12;j++){
      const u=j/12,v=(j+1)/12
      waterMarks.push(x+(u-.5)*length,.01,z+Math.sin(u*Math.PI)*bend,x+(v-.5)*length,.01,z+Math.sin(v*Math.PI)*bend)
    }
  }
  const strokes=new T.BufferGeometry();strokes.setAttribute('position',new T.Float32BufferAttribute(waterMarks,3))
  scene.add(new T.LineSegments(strokes,new T.LineBasicMaterial({color:'#667667',transparent:true,opacity:.22})))
  // Sparse reeds have actual depth and are never laid across the flight corridor.
  for(let i=0;i<130;i++) {
    const side=i%2?1:-1,z=range(-215,110),x=riverCenter(z)+side*(riverHalfWidth(z)-.3),h=range(.35,1.1)
    line([[x,0,z],[x+range(-.3,.3),h*.7,z+.12],[x+.4,h,z+.17]],'#766f58')
  }
  // A rooted old pine frames the return view: one dark foreground anchor,
  // with the bridge and light river kept clear in the centre.
  boulder(25,3,-190,19,7,17,rock)
  boulder(19,6,-195,10,8,11,rock)
  boulder(36,4,-179,12,9,15,rock)
  pine(19,12,-194,38,-1)
  pine(40,10,-181,19,1)
  const foothills = buildFoothills({ mesh, line, pine, brush: cun, paper })
  // Static geometry is batched per material; shadows are ink washes, not PBR.
  for(const [material,items] of meshes) {
    const geometries=items.map(m=>{m.updateMatrix();const transformed=m.geometry.clone().applyMatrix4(m.matrix);const g=transformed.index?transformed.toNonIndexed():transformed; if(g!==transformed)transformed.dispose();g.deleteAttribute('uv');return g})
    const merged=mergeGeometries(geometries);if(merged)scene.add(new T.Mesh(merged,material))
    geometries.forEach(g=>g.dispose());new Set(items.map(m=>m.geometry)).forEach(g=>g.dispose())
  }
  for(const [color,points] of drawings) {const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));scene.add(new T.LineSegments(g,new T.LineBasicMaterial({color})))}
  foliage.count=count;foliage.instanceMatrix.needsUpdate=true;scene.add(foliage)
  scene.traverse(object => {
    const material = (object as T.Mesh).material
    for (const item of Array.isArray(material) ? material : material ? [material] : []) {
      if (item instanceof T.MeshBasicMaterial || item instanceof T.LineBasicMaterial) applySongxiFog(item, paper)
    }
  })
  return {ready:Promise.all(loads),materials:[rock,paleRock,cliffInk,stone,plaster,bankWash,bark,paving,roofInk,canopyMaterial,...foothills.materials],animate:(t:number)=>{boats.forEach((b,i)=>{b.position.y=.07+Math.sin(t*1.3+i)*.055;b.rotation.z=Math.sin(t*.9+i)*.018});wakes.forEach((w,i)=>{const life=(t*.12+i/4)%1;w.scale.setScalar(1.5+life*2.1);(w.material as T.LineBasicMaterial).opacity=(1-life)*.20});},dispose:()=>textures.forEach(t=>t.dispose())}
}
