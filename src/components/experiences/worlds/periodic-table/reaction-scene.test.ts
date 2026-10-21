import {expect,it} from 'vitest'
import {exhibitExperiments} from './reaction-model'
import {drawReactionScene} from './reaction-scene'

/** Record the Canvas contract: catches invalid particle ages/radii and state leaks
 * across all experiments, including rewinding and compact viewports. */
function recorder(){
 const commands:unknown[][]=[];let depth=0
 const gradient={addColorStop:(...args:unknown[])=>commands.push(['stop',...args])}
 const context=new Proxy({}, {
  get:(_,name)=> (...args:unknown[])=>{
   for(const value of args)if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`Non-finite ${String(name)} argument`)
   if(name==='save')depth++
   if(name==='restore'){depth--;if(depth<0)throw new Error('Unbalanced canvas restore')}
   if(name==='arc'&&Number(args[2])<0)throw new Error('Negative arc radius')
   if(name==='ellipse'&&(Number(args[2])<0||Number(args[3])<0))throw new Error('Negative ellipse radius')
   commands.push([name,...args]);return String(name).startsWith('create')?gradient:undefined
  },
  set:(_,name,value)=>{commands.push([name,value===gradient?'gradient':value]);return true},
 }) as CanvasRenderingContext2D
 return {context,commands,depth:()=>depth}
}
it('keeps every experiment finite and deterministic when scrubbing backwards or resizing',()=>{
 for(const experiment of exhibitExperiments)for(const width of [320,600]){
  const draw=recorder()
  for(const t of [0,.05,.2,.43,.8,1,.43,0]){drawReactionScene(draw.context,width,270,experiment,t,experiment.elements[0]);expect(draw.depth()).toBe(0)}
  const a=recorder(),b=recorder()
  drawReactionScene(a.context,width,270,experiment,.43,experiment.elements[0])
  drawReactionScene(b.context,width,270,experiment,.43,experiment.elements[0])
  expect(JSON.stringify(a.commands)).toBe(JSON.stringify(b.commands))
 }
})
