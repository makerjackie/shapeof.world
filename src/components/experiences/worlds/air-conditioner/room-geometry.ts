import * as T from 'three'
export const ROOM_WINDOW={width:1.55,height:1.45,centreY:1.55,centreZ:-.65,wallX:-2.5,travel:.70,paneWidth:.73}
export const WINDOW_WALL_PIECES=[
 {at:[-2.5,.4125,-.8],size:[.09,.825,2.4]},
 {at:[-2.5,2.4375,-.8],size:[.09,.325,2.4]},
 {at:[-2.5,1.55,-1.7125],size:[.09,1.45,.575]},
 {at:[-2.5,1.55,.2625],size:[.09,1.45,.275]},
] as const
export function slidingPane(open:number){return-.36+Math.max(0,Math.min(1,Number.isFinite(open)?open:0))*ROOM_WINDOW.travel}
/** Original pleated fabric surface. The shading model remains a separate chosen gain. */
export function curtainGeometry(width:number,height=1.46){
 const g=new T.PlaneGeometry(width,height,64,16),p=g.attributes.position
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),t=(x/width+.5);p.setZ(i,.028*Math.cos(t*Math.PI*16)+.005*Math.cos(t*Math.PI*32)+.004*Math.sin(y*8+t*5))}
 g.computeVertexNormals();return g
}
