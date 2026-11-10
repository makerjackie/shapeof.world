/** Display-only layout. Separates compressed-radius glyphs without implying
 * any real distance between stars. The camera and physical radii are untouched. */
export function comparisonLayout(radii:number[],grid:boolean):[number,number,number][] {
  if(grid)return radii.map((_,i)=>[(i%2-.5)*5.2,(i<2?1:-1)*3,0])
  const gap=.65,total=radii.reduce((sum,r)=>sum+2*r,0)+Math.max(0,radii.length-1)*gap
  let left=-total/2
  return radii.map(r=>{const x=left+r;left+=2*r+gap;return [x,-2.3,0]})
}
