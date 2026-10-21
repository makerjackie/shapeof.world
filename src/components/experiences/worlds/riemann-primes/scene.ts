import {finitePsi,mangoldt,primesUpTo,psi,smooth,ZERO_HEIGHTS} from './model'
const PRIMES=new Set(primesUpTo(500))
const SAMPLES=400
const waves=Array.from({length:21},(_,n)=>Array.from({length:SAMPLES+1},(_,i)=>{const x=2+i/SAMPLES*62;return finitePsi(x,n)-x}))
const exact=Array.from({length:SAMPLES+1},(_,i)=>{const x=2+i/SAMPLES*62;return psi(x)-x})
function path(ctx:CanvasRenderingContext2D,points:number[][]){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y))}
function pearl(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,alpha:number,color='255,209,131'){
 if(alpha<.001)return;const g=ctx.createRadialGradient(x-r*.25,y-r*.35,0,x,y,r*4);g.addColorStop(0,`rgba(255,251,231,${alpha})`);g.addColorStop(.16,`rgba(${color},${alpha})`);g.addColorStop(.31,`rgba(${color},${alpha*.35})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(x-r*4,y-r*4,r*8,r*8)
}
export function drawScene(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,immersive:boolean,copyBottom:number){
 const mobile=w<700,cx=immersive?w*.5:mobile?w*.5:w*.66,cy=immersive?h*.5:mobile?(Math.max(copyBottom,230)+h-155)/2:h*.52
 const size=Math.min(w*(mobile?.445:.29),h*(mobile?.255:.37))
 ctx.fillStyle='#070a1c';ctx.fillRect(0,0,w,h)
 const mist=ctx.createRadialGradient(cx,cy,0,cx,cy,size*1.8);mist.addColorStop(0,'#1c2147');mist.addColorStop(.55,'#0e122c');mist.addColorStop(1,'#070a1c');ctx.fillStyle=mist;ctx.fillRect(0,0,w,h)
 // Grains are deterministic and static, never substituted for scientific points.
 for(let j=0;j<100;j++){const x=((j*137.3)%w),y=((j*79.7)%h);ctx.fillStyle='rgba(181,183,231,.045)';ctx.fillRect(x,y,1,1)}
 const unwind=smooth(10,20,t),waveIn=smooth(25,33,t),critical=smooth(45,53,t)
 const orbit=1-unwind,curveAlpha=unwind*(1-critical*.9)
 const rot=t*.032
 if(orbit>0){
  const spine=[];for(let k=0;k<=1000;k++){const n=k/2,r=Math.sqrt(n/500)*size,a=n*.09+rot;spine.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r*.72])}
  path(ctx,spine);ctx.strokeStyle=`rgba(229,198,153,${orbit*.13})`;ctx.lineWidth=.8;ctx.stroke()
 }
 for(let n=1;n<=500;n++){
  const r=Math.sqrt(n/500)*size,a=n*.09+rot,sx=cx+Math.cos(a)*r,sy=cy+Math.sin(a)*r*.72
  const px=cx-size+(n-2)/62*size*2,py=cy-(psi(Math.min(n,65))-Math.min(n,65))*size*.085
  const alpha=(n<=64?1:1-unwind)*(!PRIMES.has(n)?orbit*.2:1)*(1-critical)
  if(alpha<=.01)continue
  const x=sx*(1-unwind)+px*unwind,y=sy*(1-unwind)+py*unwind
  const highlight=.7+.3*Math.sin(n*.23-t*.9)
  if(PRIMES.has(n))pearl(ctx,x,y,(n<30?2.6:1.6)*highlight,alpha*.9)
  else{ctx.fillStyle=`rgba(122,134,207,${alpha})`;ctx.beginPath();ctx.arc(x,y,.9,0,Math.PI*2);ctx.fill()}
  if(PRIMES.has(n)&&[2,13,41,97,193,317,499].includes(n)&&orbit>.2){ctx.fillStyle=`rgba(248,224,185,${orbit*.72})`;ctx.font=`${mobile?10:12}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillText(String(n),x,y-10)}
 }
 if(curveAlpha>.001){
  ctx.save();ctx.globalAlpha=curveAlpha
  const xx=(i:number)=>cx-size+i/SAMPLES*size*2,yy=(v:number)=>cy-v*size*.085
  const baseline=[[cx-size,cy],[cx+size,cy]];path(ctx,baseline);ctx.strokeStyle='rgba(221,216,241,.17)';ctx.lineWidth=1;ctx.stroke()
  // Successive partial sums occupy a shallow depth stack. Each is the exact finite formula.
  const layers=20*waveIn
  for(let n=0;n<=Math.ceil(layers);n++){
   const depth=(layers-n)*size*.019,visible=Math.min(1,Math.max(0,layers-n+1));if(!visible)continue
   const pts=waves[n].map((v,i)=>[xx(i)+depth*.62,yy(v)-depth])
   path(ctx,[...pts,[xx(SAMPLES)+depth*.62,cy+size*.28-depth],[xx(0)+depth*.62,cy+size*.28-depth]])
   ctx.closePath();ctx.fillStyle=`rgba(${n===Math.floor(layers)?'138,113,211':'96,88,174'},${.025*visible*waveIn})`;ctx.fill()
   path(ctx,pts);ctx.strokeStyle=`rgba(${n===Math.floor(layers)?'223,194,255':'132,127,213'},${(.16+.5*n/20)*visible*waveIn})`;ctx.lineWidth=n===Math.floor(layers)?1.8:.8;ctx.stroke()
  }
  const exactPoints=exact.map((v,i)=>[xx(i),yy(v)])
  path(ctx,exactPoints);ctx.strokeStyle='#e8bb77';ctx.lineWidth=mobile?1.8:2;ctx.shadowColor='#f4af63';ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0
  for(let p=2;p<=64;p++)if(mangoldt(p)>0){const x=cx-size+(p-2)/62*size*2;const y=yy(psi(p)-p);pearl(ctx,x,y,PRIMES.has(p)?2:1.2,.85);if(PRIMES.has(p)&&p%4===1){ctx.fillStyle='#a7a8bf';ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText(`${p}`,x,cy+size*.39)}}
  ctx.restore()
 }
 if(critical>.001){
  ctx.save();ctx.globalAlpha=critical
  const top=cy-size*.93,bottom=cy+size*.93,lineX=cx
  const ribbon=ctx.createLinearGradient(lineX-size*.4,0,lineX+size*.4,0);ribbon.addColorStop(0,'rgba(131,118,213,0)');ribbon.addColorStop(.5,'rgba(132,120,221,.22)');ribbon.addColorStop(1,'rgba(131,118,213,0)');ctx.fillStyle=ribbon;ctx.fillRect(lineX-size*.4,top,size*.8,bottom-top)
  for(let side=-1;side<=1;side++){
   const x=lineX+side*size*.61;path(ctx,[[x,top],[x,bottom]]);ctx.strokeStyle=side===0?'#dcc8ff':'rgba(204,191,235,.14)';ctx.lineWidth=side===0?1.7:.7;ctx.stroke()
   ctx.fillStyle=side===0?'#ebdcff':'#9290ad';ctx.font=`${mobile?12:14}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillText(side===0?'Re(s) = ½':side<0?'0':'1',x,bottom+26)
  }
  ZERO_HEIGHTS.forEach((z,i)=>{const y=bottom-z/82*(bottom-top);pearl(ctx,lineX,y,2.4+(i<3?1:0),1,'214,189,255');if(i<3||i===19){ctx.fillStyle='#c5b6db';ctx.font=`${mobile?10:12}px ui-monospace,monospace`;ctx.textAlign='left';ctx.fillText(z.toFixed(3)+'…',lineX+18,y+4)}})
  ctx.restore()
 }
}
