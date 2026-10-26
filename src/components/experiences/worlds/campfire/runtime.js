// Host adapter. The vendored combustion equations and default material settings stay upstream-compatible.
import { initGPU, Profiler } from './engine/gpu.js';
import { FireSim } from './engine/sim.js';
import { Renderer } from './engine/renderer.js';
import { Sparks } from './engine/sparks.js';
import { makeNoiseTexture, makeCurlTexture } from './engine/noise.js';
import { buildCampfire, packLogs, packStones } from './engine/scene.js';
import { orbit } from './engine/camera.js';
import { FireAudio } from './engine/audio/engine.js';
import { Section } from './section.js';
import { Meters } from './meters.js';
import { ANATOMY, layoutLabels } from './anatomy';
import { INITIAL_SLICE, slicePoint, projectPoint } from './fields';
const PRESETS={med:{res:[80,120,80],dt:1/75,surf:.6,vol:.5,step:.8},low:{res:[64,96,64],dt:1/60,surf:.5,vol:.5,step:1}};
const nextPaint=()=>new Promise(r=>requestAnimationFrame(r));
export async function createCampfire(canvas, { signal, onProgress, onReading, onStats, onError, onInteract, onMetrics=()=>{}, quality }) {
  let device, audio=null, disposed=false, raf=0;
  const reportError=e=>{if(!disposed)onError(e);};
  const started=performance.now(),startup={};const mark=name=>{startup[name]=performance.now()-started;};
  const abort=()=>{disposed=true;cancelAnimationFrame(raf);audio?.dispose();device?.destroy();};
  signal.addEventListener('abort',abort,{once:true});
  try {
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    onProgress(0);await nextPaint();
    const gpu=await initGPU();device=gpu.device;mark("adapter");
    if(signal.aborted){device.destroy();throw new DOMException('Aborted','AbortError');}
    device.lost.then(info=>{if(!disposed)onError(new Error(info.message));});
    device.addEventListener('uncapturederror',e=>{if(!disposed)onError(e.error);});
    const ctx=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({device,format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    onProgress(1);await nextPaint();
    const mobile=matchMedia('(max-width: 720px)').matches;
    const forced=new URLSearchParams(location.search).get('quality');
    const preset=PRESETS[forced || quality] || PRESETS.low;
    const scene=buildCampfire(7), logsF32=packLogs(scene.logs);
    const noiseTex=makeNoiseTexture(device,128,1), curlTex=makeCurlTexture(device,noiseTex,128);
    const sim=new FireSim(device,{res:preset.res,size:[1.2,1.8,1.2],logs:logsF32,vcycles:1,noiseTex,curlTex});
    // Upstream tools/render_final.mjs FINAL look, kept here rather than changing the solver.
    Object.assign(sim.params,{visc:2,lamAge:.2,anchorFreq:1,srcFloor:-.3,anchorGain:2.7,fuelSrc:.15,vortEps:4,turbAmp:.4,turbFreq:.7,turbEvolve:.28});
    const renderer=new Renderer(device,{sim,scene,noiseTex,curlTex,logsF32,stonesF32:packStones(scene.stones),format});
    Object.assign(renderer.params,{cubic:1,flameSharp:1,detailAmt:.3,sootEdge:.12,lightK:.6});
    renderer.params.stepMul=preset.step;renderer.surfScale=preset.surf;renderer.surfaceEvery=mobile?1:3;
    const sparks=new Sparks(device,{count:mobile?2048:8192,sim,renderer,curlTex});
    const section=new Section(device,sim,format);
    const meters=new Meters(device,sim,sparks);let instruments=null,nextMeter=0,nextFrequency=0;
    const profiler=new Profiler(device,import.meta.env.DEV && new URLSearchParams(location.search).has('profile'));
    mark("pipelines");onProgress(2);await nextPaint();
    const state={yaw:.35,pitch:.14,dist:mobile?3.2:2.8,ty:.65,fov:38,paused:false,speed:1,annotations:false,activeAnnotation:null,slice:{...INITIAL_SLICE},pixelScale:1};
    let point=null, lastProbe=0, frameNo=0, last=performance.now(),acc=0, lastStats=0,popClock=1.1;
    let lightMean=0,lastL=1, lightSeq=0, lastLightT=0;
    let soundOn=false, audioContext=null, audioPending=null, probeVersion=0;
    const frames=[];const camera=()=>orbit({yaw:state.yaw,pitch:state.pitch,dist:state.dist,target:[0,state.ty,0],fov:state.fov});
    const size=()=>{
      const dpr=Math.min(devicePixelRatio,mobile?1.25:1)*state.pixelScale;
      const w=Math.max(16,Math.round(canvas.clientWidth*dpr)),h=Math.max(16,Math.round(canvas.clientHeight*dpr));
      if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
      renderer.resize(w,h,preset.vol);
    };
    const positions=()=>Object.fromEntries(ANATOMY.map(a=>[a.id,
      a.id==='root'?(instruments?.root||a.position):a.id==='yellow'?(instruments?.yellow||a.position):
      a.id==='smoke'?(instruments?.smoke||a.position):a.id==='spark'&&instruments?.spark.count?instruments.spark.position:
      a.id==='tip'&&instruments?[0,Math.min(1.65,instruments.tip+.05),0]:a.position]));
    const focusPoint=id=>id==='wood'?(instruments?.root||ANATOMY[0].position):positions()[id];
    const simStep=(dt,prof)=>{const enc=device.createCommandEncoder();sim.step(enc,dt,prof);sparks.rate=1;sparks.step(enc,dt);device.queue.submit([enc.finish()]);};
    const halton=(i,b)=>{let f=1,r=0;while(i>0){f/=b;r+=f*(i%b);i=Math.floor(i/b);}return r;};
    function draw(prof){
      size();const cam=camera();renderer.setCamera(cam);
      Object.assign(renderer.params,{cutEnabled:+(state.slice.enabled && state.slice.cut),cutAxis:state.slice.horizontal?1:2,cutOffset:state.slice.offset,cutSign:state.slice.horizontal?1:(cam.pos[2]>=state.slice.offset?1:-1)});const j=frameNo%16+1;
      renderer.uploadParams(sim.time,frameNo++,[halton(j,2)-.5,halton(j,3)-.5]);
      section.update(cam,canvas.width,canvas.height,state.slice,point||[0,.3,0]);
      const enc=device.createCommandEncoder();renderer.renderHDR(enc,prof);sparks.draw(enc,state.paused?0:Math.min(1/120,preset.dt*state.speed));
      renderer.temporal(enc,.4,prof);renderer.bloom(enc,true,prof);const view=ctx.getCurrentTexture().createView();renderer.final(enc,view,format,true,prof);
      if(state.slice.enabled)section.draw(enc,view);
      if(soundOn && !state.paused)renderer.readLights(enc);
      prof?.end(enc);
      device.queue.submit([enc.finish()]);
      const handle=canvas.parentElement?.querySelector('[data-cf-plane-handle]');
      if(handle){const uv=projectPoint(cam,state.slice.horizontal?[-.55,state.slice.offset,0]:[-.55,.42,state.slice.offset],canvas.width/canvas.height);handle.style.display=uv?'block':'none';if(uv){handle.style.left=`${uv[0]*100}%`;handle.style.top=`${uv[1]*100}%`;}}
      if(state.annotations){
        const ps=positions(),w=canvas.clientWidth,h=canvas.clientHeight;
        const projected=ANATOMY.map(a=>{const uv=projectPoint(cam,ps[a.id],w/h);return{id:a.id,x:(uv?.[0]??.5)*w,y:(uv?.[1]??.5)*h};});
        for(const p of layoutLabels(projected,w,h)){
          const button=canvas.parentElement?.querySelector(`[data-cf-pin="${p.id}"]`),line=canvas.parentElement?.querySelector(`[data-cf-leader="${p.id}"]`);
          if(button){button.style.left=`${p.left}px`;button.style.top=`${p.top}px`;button.style.width=`${p.width}px`;}
          if(line){const x=p.left+p.width*.5,y=p.top+22;line.setAttribute('d',`M${x} ${y} L${p.x} ${p.y}`);}
        }
      }
      const marker=canvas.parentElement?.querySelector('[data-cf-probe-marker]');
      if(marker){const uv=point&&state.slice.enabled?projectPoint(cam,point,canvas.width/canvas.height):null;
        marker.style.display=uv?'block':'none';if(uv){marker.style.left=`${uv[0]*100}%`;marker.style.top=`${uv[1]*100}%`;}}
    }
    async function sample(p){
      const version=probeVersion, time=sim.time;const r=await section.sample(p,time);
      if(r && !disposed && version===probeVersion)onReading(r);
      return r;
    }
    function pop(strength=.4){sparks.burst({n:Math.round(3+12*strength),pos:[(Math.random()-.5)*.3,.1,(Math.random()-.5)*.3],speed:3+3*strength,radius:.02,dur:.04,fan:.8,size:1.4});}
    // A short physical preroll, never fabricated initial fields. Each step has its own submission.
    for(let i=0;i<48;i++){simStep(preset.dt);if(i%8===7){await device.queue.onSubmittedWorkDone();if(disposed)throw new DOMException('Aborted','AbortError');}}
    mark("preroll");draw();await device.queue.onSubmittedWorkDone();mark("firstFrame");onProgress(3);
    const pointers=new Map();let gesture=null;
    const eventPoint=e=>{const r=canvas.getBoundingClientRect();return slicePoint(camera(),(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height,r.width/r.height,state.slice);};
    const listen=(target,type,fn,opts={})=>target.addEventListener(type,fn,{...opts,signal});
    listen(canvas,'pointerdown',e=>{onInteract();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);gesture={x:e.clientX,y:e.clientY,moved:false};});
    listen(canvas,'pointermove',e=>{
      if(!pointers.has(e.pointerId)){
        if(e.pointerType==='mouse' && state.slice.enabled && performance.now()-lastProbe>110){const p=eventPoint(e);if(p){point=p;lastProbe=performance.now();sample(p).catch(reportError);}}return;
      }
      const old=pointers.get(e.pointerId), other=[...pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];
      if(other){const a=Math.hypot(old[0]-other[0],old[1]-other[1]),b=Math.hypot(e.clientX-other[0],e.clientY-other[1]);state.dist=Math.max(.7,Math.min(7,state.dist*a/Math.max(b,1)));gesture.moved=true;}
      else if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5 || gesture.moved){gesture.moved=true;state.yaw-=(e.clientX-old[0])*.005;state.pitch=Math.max(-.02,Math.min(1.25,state.pitch+(e.clientY-old[1])*.004));}
      pointers.set(e.pointerId,[e.clientX,e.clientY]);renderer.histReset=true;
    });
    const up=e=>{if(gesture && !gesture.moved && state.slice.enabled){const p=eventPoint(e);if(p){point=p;sample(p).catch(reportError);}}pointers.delete(e.pointerId);if(!pointers.size)gesture=null;};
    listen(canvas,'pointerup',up);listen(canvas,'pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});
    listen(canvas,'wheel',e=>{e.preventDefault();onInteract();state.dist=Math.max(.7,Math.min(7,state.dist*Math.exp(e.deltaY*.001)));renderer.histReset=true;},{passive:false});
    listen(canvas,'keydown',e=>{const changes={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]};if(changes[e.key]){e.preventDefault();state.yaw+=changes[e.key][0];state.pitch=Math.max(-.02,Math.min(1.25,state.pitch+changes[e.key][1]));}if(e.key==='+'||e.key==='-'){e.preventDefault();state.dist=Math.max(.7,Math.min(7,state.dist*(e.key==='+'?.9:1.1)));}renderer.histReset=true;});
    listen(document,'visibilitychange',()=>{last=performance.now();acc=0;if(document.hidden)audioContext?.suspend();else if(soundOn && !state.paused)audioContext?.resume();});
    let slowFrames=0, inFlight=0;
    async function loop(now){
      if(disposed)return;
      if(inFlight>=2){raf=requestAnimationFrame(loop);return;}
      try{
        if(document.hidden){last=now;raf=requestAnimationFrame(loop);return;}
        const elapsed=(now-last)/1000;last=now;profiler.begin();
        if(!state.paused){
          acc+=Math.min(elapsed,.05);let steps=0;
          while(acc>=preset.dt && steps<2){simStep(preset.dt*state.speed,profiler);acc-=preset.dt;steps++;}
          if(steps===2)acc=Math.min(acc,preset.dt);
          popClock-=Math.min(elapsed,.05)*state.speed;if(!soundOn && popClock<=0){pop(.2+Math.random()*.6);popClock=.6+Math.random()*2.5;}
        }else acc=0;
        draw(profiler);inFlight++;device.queue.onSubmittedWorkDone().then(()=>{inFlight--;}).catch(reportError);
        profiler.collect().catch(reportError);if(disposed)return;
        if(elapsed>0 && elapsed<1)frames.push(elapsed*1000);if(frames.length>600)frames.shift();
        if(point && (state.slice.enabled || state.activeAnnotation) && now-lastProbe>120){lastProbe=now;sample(point).catch(reportError);}
        if(!state.paused){
          if(sim.time+1e-6>=nextFrequency&&!meters.fastBusy){nextFrequency=sim.time+.05;meters.sampleFrequency(sim.time).catch(e=>{if(!disposed)onError(e);});}
          if(sim.time+1e-6>=nextMeter&&!meters.busy){nextMeter=sim.time+.25;meters.sample(sim.time).then(m=>{if(m&&!disposed){instruments=m;onMetrics(m);if(state.activeAnnotation)point=focusPoint(state.activeAnnotation);}}).catch(e=>{if(!disposed)onError(e);});}
        }
        if(soundOn && !state.paused){const ls=renderer.lightStat;renderer.collectLights().catch(reportError);if(ls?.seq && ls.seq!==lightSeq){
          const dt=lightSeq?Math.max((ls.t-lastLightT)/1000,.001):1;lightMean=lightMean?lightMean+(ls.L-lightMean)*(1-Math.exp(-dt/3.3)):ls.L;
          const hrr=lightMean>0?ls.L/lightMean:1;audio?.update({intensity:1,hrr,dhrr:(hrr-lastL)/dt,camDist:state.dist,camAz:state.yaw});lastL=hrr;lightSeq=ls.seq;lastLightT=ls.t;
        }}
        if(now-lastStats>1000){lastStats=now;const recent=frames.slice(-60);const fps=recent.length?1000/(recent.reduce((a,b)=>a+b,0)/recent.length):0;
          onStats({fps,time:sim.time,grid:sim.res.join('×'),pixelScale:state.pixelScale});
          if(fps<20 && !state.paused)slowFrames++;else slowFrames=0;
          if(slowFrames>=4 && state.pixelScale>.65){state.pixelScale=Math.max(.65,state.pixelScale-.15);slowFrames=0;}
        }
        raf=requestAnimationFrame(loop);
      }catch(e){if(!disposed){onError(e);abort();}}
    }
    last=performance.now();raf=requestAnimationFrame(loop);
    return {
      state,sim,renderer,device,section,frames,camera,profiler,meters,positions,startup,
      setSlice(patch){Object.assign(state.slice,patch);if(patch.horizontal!==undefined || patch.offset!==undefined || patch.enabled===false){probeVersion++;point=null;onReading(null);}if(patch.enabled===true){state.ty=.85;state.dist=Math.max(state.dist,3.25);state.yaw=.78;state.pitch=.24;}if(patch.enabled===false)state.ty=.65;if(patch.horizontal===true)state.pitch=.75;if(patch.horizontal===false)state.pitch=.14;renderer.histReset=true;},
      setPlayback(paused,speed){if(paused&&!state.paused&&!meters.busy)meters.sample(sim.time,false).then(m=>{if(m&&!disposed){instruments=m;onMetrics(m);}}).catch(e=>{if(!disposed)onError(e);});state.paused=paused;state.speed=Math.max(.1,Math.min(1,speed));acc=0;if(audioContext){if(paused)audioContext.suspend();else if(soundOn)audioContext.resume();}},
      async setSound(on){
        soundOn=on;
        if(!on){audio?.setVolume(0);return false;}
        if(!audio){
          // Resume synchronously inside the user's gesture, before loading the worklet.
          if(!audioPending){audioContext=new AudioContext({sampleRate:48000});audioContext.resume();audioPending=FireAudio.create(audioContext,{seed:7,volume:.7}).then(a=>{audio=a;audio.onEvent(e=>{if(!disposed && !state.paused && soundOn)pop(e.strength??.4);});return a;});}
          try{await audioPending;}catch(e){if(audioContext?.state!=='closed')audioContext?.close().catch(()=>{});audioPending=null;soundOn=false;throw e;}
        }
        if(disposed){audio?.dispose();if(audioContext?.state!=='closed')audioContext?.close().catch(()=>{});return false;}
        audio.setVolume(.7);await audio.start();if(state.paused)await audioContext.suspend();return soundOn;
      },
      setAnnotations(on){state.annotations=on;if(!on)state.activeAnnotation=null;else{state.ty=.85;state.dist=3.4;renderer.histReset=true;}},
      selectAnnotation(id,cut=false){
        const a=ANATOMY.find(a=>a.id===id);if(!a)return null;
        const p=focusPoint(id);Object.assign(state,a.camera);state.activeAnnotation=cut?null:id;
        if(cut){Object.assign(state.slice,{enabled:true,cut:true,opacity:INITIAL_SLICE.opacity,field:a.field,horizontal:!!a.horizontal,offset:a.horizontal?.3:p[2]});state.ty=a.horizontal?.3:.85;state.dist=a.horizontal?2.5:3.25;state.yaw=.78;state.pitch=a.horizontal?.9:.24;}
        else{state.slice.enabled=false;}
        point=p;sample(p).catch(reportError);renderer.histReset=true;return {position:p,slice:{...state.slice}};
      },
      setBlue(on){renderer.params.blueK=on?2:.05;renderer.histReset=true;},
      focusRoot(){Object.assign(state,{yaw:.35,pitch:.12,dist:1.2,ty:.14});renderer.histReset=true;},
      resetCamera(){Object.assign(state,{yaw:.35,pitch:.14,dist:state.annotations?3.4:(mobile?3.2:2.8),ty:state.annotations?.85:.65});renderer.histReset=true;},
      async probeAt(p){while(section.busy&&!disposed)await nextPaint();if(disposed)return null;point=p;return sample(p);},
      dispose(){abort();ctx.unconfigure();if(audioContext?.state!=='closed')audioContext?.close().catch(()=>{});signal.removeEventListener('abort',abort);},
    };
  }catch(e){abort();signal.removeEventListener('abort',abort);throw e;}
}
