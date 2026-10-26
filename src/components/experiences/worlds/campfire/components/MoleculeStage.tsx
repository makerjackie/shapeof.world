import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { moleculeScene, type MolecularStation, type Element, type Bond } from '../molecules'
const COLORS:Record<Element,string>={C:'#50565c',H:'#e9e5dd',O:'#ad4a3e'}
export default function MoleculeStage({ station, progress, label }: { station:MolecularStation; progress:number; label:string }) {
  const host=useRef<HTMLDivElement>(null),phase=useRef(progress);phase.current=progress
  useEffect(()=>{
    const el=host.current!,scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setClearColor(0x071017,0);renderer.outputColorSpace=THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-label',label);renderer.domElement.tabIndex=0;el.appendChild(renderer.domElement)
    const camera=new THREE.PerspectiveCamera(38,1,.1,100),controls=new OrbitControls(camera,renderer.domElement)
    controls.enableDamping=true;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=20;controls.rotateSpeed=.65
    scene.add(new THREE.HemisphereLight(0xd9e5ef,0x17232c,2.1))
    const key=new THREE.DirectionalLight(0xffe3bd,3.5);key.position.set(-4,5,7);scene.add(key)
    const rim=new THREE.DirectionalLight(0x86bed6,2.5);rim.position.set(4,2,-3);scene.add(rim)
    const model=moleculeScene(station),root=new THREE.Group();scene.add(root)
    const sphere=new THREE.SphereGeometry(1,28,20),cylinder=new THREE.CylinderGeometry(1,1,1,10)
    const textures:THREE.Texture[]=[],materials:THREE.Material[]=[],counts={C:0,H:0,O:0}
    const spheres=model.atoms.map(a=>{
      const material=new THREE.MeshStandardMaterial({color:COLORS[a.element],roughness:.35,metalness:.08});materials.push(material)
      const m=new THREE.Mesh(sphere,material),radius=a.element==='H'?.19:.29;m.scale.setScalar(radius);root.add(m)
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d')!
      ctx.font='500 36px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=a.element==='H'?'#253039':'#ffffff'
      ctx.fillText(`${a.element}${++counts[a.element]}`,64,32)
      const texture=new THREE.CanvasTexture(canvas);textures.push(texture);const mat=new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true});materials.push(mat)
      const tag=new THREE.Sprite(mat);tag.scale.set(.45,.225,1);tag.renderOrder=3;root.add(tag)
      return {mesh:m,tag}
    })
    const makeBonds=(bonds:Bond[])=>bonds.flatMap(([a,b,order=1])=>Array.from({length:order},(_,i)=>{
      const material=new THREE.MeshStandardMaterial({color:0x82939a,roughness:.6,transparent:true});materials.push(material)
      const mesh=new THREE.Mesh(cylinder,material);root.add(mesh);return{mesh,material,a,b,offset:(i-(order-1)/2)*.13}
    }))
    const before=makeBonds(model.before),after=makeBonds(model.after),axis=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),offset=new THREE.Vector3()
    const resize=()=>{const w=el.clientWidth,h=Math.max(180,el.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,.2,Math.max(7.5,4.1/(camera.aspect*Math.tan(THREE.MathUtils.degToRad(19)))));camera.updateProjectionMatrix();controls.update()}
    const observer=new ResizeObserver(resize);observer.observe(el);resize()
    let raf=0
    const draw=()=>{
      const t=phase.current,m=Math.max(0,Math.min(1,(t-.18)/.64)),ease=m*m*(3-2*m)
      model.atoms.forEach((a,i)=>{const p=a.from.map((v,j)=>v+(a.to[j]-v)*ease) as [number,number,number];p[2]+=Math.sin(m*Math.PI)*((i%3)-1)*.65;spheres[i].mesh.position.set(...p);spheres[i].tag.position.copy(spheres[i].mesh.position);spheres[i].tag.position.addScaledVector(camera.position.clone().sub(spheres[i].mesh.position).normalize(),a.element==='H'?.2:.31)})
      const unchanged=station==='soot'||station==='exhaust'
      for(const [bonds,alpha] of [[before,unchanged?1:1-Math.min(1,t/.24)],[after,unchanged?0:Math.max(0,(t-.76)/.24)]] as const)for(const b of bonds){
        const a=spheres[b.a].mesh.position,c=spheres[b.b].mesh.position;direction.copy(c).sub(a);offset.crossVectors(direction,new THREE.Vector3(0,0,1)).normalize().multiplyScalar(b.offset)
        b.mesh.position.copy(a).add(c).multiplyScalar(.5).add(offset);b.mesh.quaternion.setFromUnitVectors(axis,direction.clone().normalize());b.mesh.scale.set(.035,direction.length(),.035);b.material.opacity=alpha;b.mesh.visible=alpha>.001
      }
      controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(draw)
    };draw()
    return()=>{cancelAnimationFrame(raf);observer.disconnect();controls.dispose();sphere.dispose();cylinder.dispose();materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}
  },[station,label])
  return <div ref={host} className="cf-molecule-stage"/>
}
