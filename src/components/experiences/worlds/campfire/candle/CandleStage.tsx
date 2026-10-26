import { useEffect, useRef } from 'react'
import { vertex, fragment } from './flame-shader'
import { FRAME, flameShape, relax } from './model'
export function CandleStage({ gravity, peel, focus, transport, paused, label, onReady, onError }: {gravity:number;peel:number;focus:number;transport:boolean;paused:boolean;label:string;onReady():void;onError():void}) {
  const canvas=useRef<HTMLCanvasElement>(null), target=useRef({gravity,peel,focus,transport,paused}), release=useRef<number|undefined>(undefined)
  target.current={gravity,peel,focus,transport,paused}
  useEffect(()=>{
    // StrictMode replays effects on the same canvas; defer context release until a true unmount.
    clearTimeout(release.current)
    const el=canvas.current!,gl=el.getContext('webgl',{alpha:false,antialias:false})
    if(!gl){onError();return}
    const shaders:WebGLShader[]=[],program=gl.createProgram()!;let buffer:WebGLBuffer|null=null,raf=0
    const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);onError()};el.addEventListener('webglcontextlost',lost)
    try {
      for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){const s=gl.createShader(type)!;shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Candle shader');gl.attachShader(program,s)}
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Candle program');gl.useProgram(program)
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW)
      const attr=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0)
      const names=['resolution','time','gravity','height','radius','traces','peel','focus','transport','air','burn','chemistry','sceneScale','sceneOffset']
      const locations=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,n)]))
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');let time=0,last=performance.now(),g=1,cut=0,motion=0,ready=false
      const draw=(now:number)=>{
        const dt=Math.min(.05,(now-last)/1000);last=now
        if(!document.hidden){const t=target.current;if(!t.paused&&!reduced.matches)time+=dt;g=relax(g,t.gravity,dt);cut=relax(cut,t.peel,dt);motion=relax(motion,+t.transport,dt)
          const b=el.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,1.4,1200/Math.max(b.width,b.height));const w=Math.max(1,Math.round(b.width*ratio)),h=Math.max(1,Math.round(b.height*ratio))
          if(el.width!==w||el.height!==h){el.width=w;el.height=h;gl.viewport(0,0,w,h)}const shape=flameShape(g)
          gl.uniform2f(locations.resolution,w,h)
          const values={time,gravity:shape.gravity,height:shape.height,radius:shape.radius,traces:motion,peel:cut,focus:t.focus,transport:motion,air:1,burn:1,chemistry:0,sceneScale:FRAME.scale,sceneOffset:FRAME.offset}
          for(const [key,value] of Object.entries(values))gl.uniform1f(locations[key],value)
          gl.drawArrays(gl.TRIANGLES,0,6);if(!ready){ready=true;onReady()}
        }raf=requestAnimationFrame(draw)
      };raf=requestAnimationFrame(draw)
    } catch(error){console.error('Candle illustration:',error);onError()}
    return()=>{cancelAnimationFrame(raf);el.removeEventListener('webglcontextlost',lost);gl.deleteBuffer(buffer);shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);release.current=window.setTimeout(()=>gl.getExtension('WEBGL_lose_context')?.loseContext(),0)}
  },[])
  return <canvas ref={canvas} className="cf-candle-canvas" aria-label={label} role="img"/>
}
