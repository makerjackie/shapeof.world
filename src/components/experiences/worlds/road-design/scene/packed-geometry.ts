import * as T from 'three'

interface PackedAttribute { array:Float32Array|Uint16Array|Uint32Array; itemSize:number; normalized:boolean }
export interface PackedGeometry { attributes:Record<string,PackedAttribute>; index:PackedAttribute|null; bounds:[number,number,number,number]|null }
/** Transfer renderer-ready data without rebuilding normals or bounding volumes. */
export function packGeometry(geometry:T.BufferGeometry):PackedGeometry {
  const pack=(attribute:T.BufferAttribute)=>({array:attribute.array as PackedAttribute['array'],itemSize:attribute.itemSize,normalized:attribute.normalized})
  const sphere=geometry.boundingSphere
  return {attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([key,attribute])=>[key,pack(attribute as T.BufferAttribute)])),index:geometry.index?pack(geometry.index):null,bounds:sphere?[sphere.center.x,sphere.center.y,sphere.center.z,sphere.radius]:null}
}
export function unpackGeometry(data:PackedGeometry) {
  const geometry=new T.BufferGeometry()
  for(const [name,attribute]of Object.entries(data.attributes))geometry.setAttribute(name,new T.BufferAttribute(attribute.array,attribute.itemSize,attribute.normalized))
  if(data.index)geometry.setIndex(new T.BufferAttribute(data.index.array,data.index.itemSize,data.index.normalized))
  if(data.bounds){const [x,y,z,radius]=data.bounds;geometry.boundingSphere=new T.Sphere(new T.Vector3(x,y,z),radius)}
  return geometry
}
export function geometryBuffers(data:PackedGeometry):ArrayBuffer[]{return [...Object.values(data.attributes),...(data.index?[data.index]:[])].map(attribute=>attribute.array.buffer as ArrayBuffer)}
