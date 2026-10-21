import {clampProgress,type ExhibitExperiment} from './reaction-model'

const smooth=(a:number,b:number,t:number)=>{const p=clampProgress((t-a)/(b-a));return p*p*(3-2*p)}
const noise=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
const TAU=Math.PI*2

/** Pure presentation: every ripple, grain and highlight is derived from playback position.
 * No frame counters or randomness, so pause, resize and backward seeking preserve the scene. */
export function drawReactionScene(ctx:CanvasRenderingContext2D,width:number,height:number,experiment:ExhibitExperiment,time:number,symbol:string){
 const t=clampProgress(time),p=smooth(.18,.9,t),effect=experiment.effect
 const scale=Math.min(width/(width<420?440:600),height/300)
 ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(width/2-300*scale,(height-300*scale)/2);ctx.scale(scale,scale)
 const ellipse=(x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient)=>{ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);ctx.fillStyle=fill;ctx.fill()}
 const circle=(x:number,y:number,r:number,fill:string|CanvasGradient)=>ellipse(x,y,r,r,fill)
 const line=(points:number[],color:string,lineWidth=1)=>{ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke()}
 const halo=(x:number,y:number,r:number,color:string)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');circle(x,y,r,g)}
 const ring=(x:number,y:number,r:number,alpha:number)=>{ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(x,y,r,r*.22,0,0,TAU);ctx.strokeStyle='#dcf5e7';ctx.lineWidth=1.2;ctx.stroke();ctx.restore()}
 // The engraved platform and lighting are display furniture, not atomic orbits.
 for(let i=0;i<3;i++)ring(300,260,180+i*14,.08)
 const shadow=ctx.createRadialGradient(300,265,5,300,265,180);shadow.addColorStop(0,'#081c1970');shadow.addColorStop(1,'#081c1900');ellipse(300,265,180,23,shadow)

 if(effect==='decay'){
  for(let i=0;i<100;i++){
   const x=192+(i%10)*24,y=35+Math.floor(i/10)*23
   // Stratified quantiles reproduce the expected population, not individual decay times.
   const threshold=-Math.log2((((i*37)%100)+.5)/100),age=p-threshold,changed=age>=0
   circle(x,y,6.5,changed?'#8eaea3':'#d6b570');circle(x-1.5,y-2,1.7,changed?'#d1e3d6':'#fff0be')
   if(changed&&age<.14){
    const a=clampProgress(age/.14),angle=noise(i)*TAU
    ctx.save();ctx.globalAlpha=1-a;ctx.beginPath();ctx.arc(x,y,7+a*12,0,TAU);ctx.strokeStyle='#f6dfaa';ctx.lineWidth=1;ctx.stroke()
    for(let j=0;j<4;j++)circle(x+Math.cos(angle)*a*25+(j%2)*2,y+Math.sin(angle)*a*25+Math.floor(j/2)*2,1.2,'#f6d892')
    ctx.restore()
   }
  }
 }else if(effect==='glow'){
  const power=smooth(.13,.48,t),x=300,y=147
  halo(x,y,145,`rgba(255,99,33,${power*.25})`)
  ctx.lineCap='round';ctx.lineJoin='round'
  const tube=()=>{ctx.beginPath();ctx.moveTo(238,52);ctx.lineTo(238,205);ctx.bezierCurveTo(238,259,362,259,362,205);ctx.lineTo(362,52)}
  tube();ctx.strokeStyle='#90aaa088';ctx.lineWidth=19;ctx.stroke()
  tube();ctx.strokeStyle='#edf3df';ctx.lineWidth=13;ctx.stroke()
  ctx.save();tube();ctx.strokeStyle=`rgba(255,86,27,${power})`;ctx.shadowColor='#ff713a';ctx.shadowBlur=22*power;ctx.lineWidth=9;ctx.stroke()
  tube();ctx.strokeStyle=`rgba(255,187,111,${power*.9})`;ctx.lineWidth=3;ctx.stroke();ctx.restore()
  line([233,58,233,203],'#ffffff88',1.5);line([357,58,357,203],'#ffffff66',1.5)
  for(const ex of [238,362]){ctx.fillStyle='#615f55';ctx.fillRect(ex-12,40,24,27);ctx.fillStyle='#b9c3b1';ctx.fillRect(ex-10,45,20,5);line([ex,40,ex,26,300,26],'#9ca998',2)}
  ellipse(300,257,80,8,`rgba(255,117,59,${power*.17})`)
 }else{
  const wet=effect==='bubbles'||effect==='deposit'||effect==='still',arrival=smooth(.02,.25,t)
  if(wet){
   const fluid=ctx.createLinearGradient(0,135,0,252)
   fluid.addColorStop(0,effect==='deposit'?'#73bcd4':experiment.color??'#c4ddd3');fluid.addColorStop(1,effect==='deposit'?'#478797':'#92b7a7')
   ctx.beginPath();ctx.moveTo(152,136);ctx.lineTo(159,235);ctx.bezierCurveTo(175,270,425,270,441,235);ctx.lineTo(448,136);ctx.closePath();ctx.fillStyle=fluid;ctx.globalAlpha=.78;ctx.fill();ctx.globalAlpha=1
   if(effect==='deposit'){ctx.save();ctx.globalAlpha=p*.8;ctx.fillStyle=experiment.color??'#dbe5df';ctx.fill();ctx.restore()}
   ellipse(300,137,148,25,effect==='deposit'?`rgba(138,221,240,${.4*(1-p)})`:'#deeee63d')
   // Water displaced by entering the specimen: a short, damped surface response.
   const ripple=smooth(.17,.65,t)
   if(ripple>0&&ripple<1)for(let i=0;i<3;i++)ring(300,139,12+ripple*100+i*15,(1-ripple)*.24)
  }else{
   ellipse(300,250,150,19,'#657f71');ellipse(300,245,147,17,'#c4cbb8');ring(300,245,140,.26)
   if(effect==='melt'||effect==='oxide')ellipse(300,253,102,6,`rgba(242,175,89,${smooth(.02,.35,t)*.3})`)
  }
  if(effect==='bubbles'){
   const x=280+Math.sin(p*15)*29*(1-p),y=64+arrival*67
   if(p<1){const radius=17*Math.cbrt(1-p),metal=ctx.createRadialGradient(x-5,y-6,1,x,y,Math.max(1,radius));metal.addColorStop(0,'#fffef9');metal.addColorStop(.45,'#b3b9b1');metal.addColorStop(1,'#4b655e');circle(x,y,radius,metal)}
   for(let i=0;i<42;i++){
    const birth=.04+noise(i)*.7,age=(p-birth)/.23
    if(age<=0||age>=1)continue
    const bx=280+Math.sin(birth*15)*29*(1-birth)+Math.sin(i*2.3+age*4)*9,by=133-age*(34+noise(i+80)*35),r=(1.5+noise(i+20)*3)*Math.sin(age*Math.PI)
    ctx.save();ctx.globalAlpha=Math.sin(age*Math.PI)*.85;ctx.beginPath();ctx.arc(bx,by,r,0,TAU);ctx.strokeStyle='#f2ffef';ctx.lineWidth=1.1;ctx.stroke();circle(bx-r*.3,by-r*.35,r*.2,'#ffffff');ctx.restore()
   }
   for(let i=0;i<6;i++){const age=(p-(.05+i*.12))/.3;if(age>0&&age<1)ring(x,140,8+age*64,(1-age)*.22)}
  }else if(effect==='melt'){
   const metal=ctx.createLinearGradient(205,145,390,238);metal.addColorStop(0,'#ffffff');metal.addColorStop(.16,'#82958f');metal.addColorStop(.38,'#eafff8');metal.addColorStop(.52,'#415b57');metal.addColorStop(.73,'#e0f0e6');metal.addColorStop(1,'#62776b')
   const body=()=>{ctx.beginPath();for(let i=0;i<=100;i++){const a=i/100*TAU,r=1+(1-p)*(.13*Math.sin(a*5)+.08*Math.cos(a*7)),x=300+Math.cos(a)*(75+p*37)*r,y=205+Math.sin(a)*(55-p*29)*r+p*14;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath()}
   body();ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle='#e5f8e8b0';ctx.lineWidth=1.4;ctx.stroke()
   ctx.save();body();ctx.clip()
   for(let i=0;i<7;i++){ctx.globalAlpha=(1-p)*.23;line([230+i*18,147,267+i*11,247],'#243f38',1)}
   ctx.globalAlpha=.55;ctx.beginPath();ctx.ellipse(283,187+p*20,39+p*23,9-p*3,-.16,Math.PI,TAU);ctx.strokeStyle='#fffef2';ctx.lineWidth=3;ctx.stroke();ctx.restore()
   ellipse(300,246,95,4,`rgba(255,255,232,${p*.22})`)
  }else{
   const sy=wet?48+arrival*80:157
   const drawStrip=()=>{ctx.beginPath();ctx.roundRect(-17,-37,34,111,4)}
   const place=()=>{ctx.translate(300,sy);ctx.rotate(-.25)}
   ctx.save();place();const metal=ctx.createLinearGradient(-20,0,20,0);metal.addColorStop(0,symbol==='Au'?'#936b27':symbol==='Cu'?'#925231':'#67796f');metal.addColorStop(.45,symbol==='Au'?'#f3d785':symbol==='Cu'?'#e3a174':'#e2e9df');metal.addColorStop(1,symbol==='Au'?'#c09a46':symbol==='Cu'?'#bc744e':'#70867a');drawStrip();ctx.fillStyle=metal;ctx.fill()
   for(let i=0;i<5;i++)line([-13+i*6,-31,-13+i*6,68],'#ffffff20',.6)
   ctx.restore()
   if(effect==='deposit'||effect==='oxide'||effect==='burn'){
    ctx.save()
    // Copper can only grow on the immersed surface, never above the solution.
    if(effect==='deposit'){ctx.beginPath();ctx.rect(0,139,600,130);ctx.clip()}
    place();drawStrip();ctx.clip()
    for(let i=0;i<180;i++){
     const gx=-17+noise(i)*34,gy=-37+noise(i+240)*111,birth=effect==='deposit'?noise(i+480)*.8:(74-gy)/111*.65+noise(i+480)*.18,growth=smooth(birth,birth+.2,p)
     if(growth===0)continue
     circle(gx,gy,(2+noise(i+720)*3.5)*growth,effect==='deposit'?(i%3===0?'#ebad77':i%3===1?'#b5794d':'#744a36'):effect==='oxide'?(i%2?'#303c35':'#182720'):(i%2?'#fffbed':'#d7ddca'))
    }
    ctx.restore()
   }
   if(effect==='burn'){
    const flare=smooth(.03,.27,p)*(1-smooth(.55,.92,p))
    halo(300,171,94,`rgba(255,251,221,${flare*.6})`);halo(300,171,45,`rgba(255,255,245,${flare*.8})`)
    // Soft continuous light, never a strobe or a full-screen flash.
    if(flare>0){ctx.save();ctx.globalAlpha=flare*.7;for(let i=0;i<9;i++){const a=noise(i)*TAU,r=24+noise(i+10)*25;line([300+Math.cos(a)*12,171+Math.sin(a)*12,300+Math.cos(a)*r,171+Math.sin(a)*r],'#fffbe8',.8)}ctx.restore()}
    for(let i=0;i<16;i++){const settled=smooth(.5+noise(i)*.2,.95,p);circle(283+noise(i+16)*35,233+noise(i+32)*8,settled*(1+noise(i+48)*2),'#e7e9d7')}
   }
  }
  if(wet){
   // Foreground glass/reflection stays in front of the specimen.
   ctx.strokeStyle='#a9c7b78c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(300,132,151,27,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(149,132);ctx.lineTo(156,237);ctx.bezierCurveTo(166,273,434,273,444,237);ctx.lineTo(451,132);ctx.stroke()
   line([160,147,165,224],'#edfbe590',3);line([436,154,432,216],'#d0f0df55',1.5)
   for(let i=0;i<4;i++)line([425,174+i*15,433,174+i*15],'#c3ddcc80',1)
  }
 }
 ctx.restore()
}
