export interface CabinetBounds { left:number; top:number; width:number; height:number }

/** Fit the complete cabinet into its tile without stretching the photograph. */
export function cabinetTransform(target:CabinetBounds, cabinet:CabinetBounds):string {
 const scale=Math.min(target.width/cabinet.width,target.height/cabinet.height)
 const x=target.left+target.width/2-cabinet.left-cabinet.width/2
 const y=target.top+target.height/2-cabinet.top-cabinet.height/2
 return `translate(${x}px,${y}px) scale(${scale})`
}

/** Remove the tile's hover scaling; its centre stays in the same place. */
export function tileBounds(node:HTMLElement):CabinetBounds {
 const r=node.getBoundingClientRect()
 return {left:r.left+(r.width-node.offsetWidth)/2,top:r.top+(r.height-node.offsetHeight)/2,width:node.offsetWidth,height:node.offsetHeight}
}
