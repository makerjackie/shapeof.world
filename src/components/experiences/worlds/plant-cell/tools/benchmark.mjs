// Separate fresh headless browser per view: no retained WebGL contexts between samples.
// node tools/benchmark.mjs <private-result.json>
import { chromium } from 'playwright'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
if (!process.argv[2]) throw new Error('Pass a private JSON output path.')
const results = []
const views = process.argv.find(arg=>arg.startsWith('--views='))?.slice(8).split(',')
for (const [name, scale, mobile] of [['hero',-3.86,false],['handoff',-6.5,false],['membrane',-6.85,false],['motor',-7.34,false],['mobileMotor',-7.65,true]]) {
  if (views && !views.includes(name)) continue
  const profile=await mkdtemp(join(tmpdir(),'plant-cell-benchmark-'))
  let context
  try {
    context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:mobile?{width:390,height:844}:{width:1600,height:1000},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,args:['--headless=new','--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--mute-audio','--disable-background-timer-throttling']})
    const page=await context.newPage(), errors=[]
    page.on('pageerror',error=>errors.push(String(error)))
    await page.addInitScript(()=>performance.setResourceTimingBufferSize(20000))
    await page.goto(`http://127.0.0.1:3241/plant-cell?scale=${scale}&ghost=0`,{waitUntil:'domcontentloaded'})
    await page.locator('.pc-scene canvas[data-scale]').waitFor({timeout:60000})
    await page.waitForTimeout(7000)
    const sample=await page.evaluate(async()=>{
      const canvas=document.querySelector('.pc-scene canvas')
      const url=performance.getEntriesByType('resource').map(e=>e.name).find(url=>/\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(url))
      const fiber=await import(url), root=fiber._roots.get(canvas).store.getState(), gl=root.gl.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info')
      const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)
      root.gl.info.autoReset=false;root.gl.info.reset()
      const frames=[],start=performance.now();let previous=start
      return new Promise(resolve=>{const frame=now=>{frames.push(now-previous);previous=now;if(now-start<5000)requestAnimationFrame(frame);else{
        const sorted=frames.slice(1).sort((a,b)=>a-b), info={...root.gl.info.render};root.gl.info.autoReset=true
        resolve({fps:1000*frames.length/(now-start),p95:sorted[Math.floor(sorted.length*.95)],frames:frames.length,trianglesPerFrame:Math.round(info.triangles/frames.length),drawsPerFrame:Math.round(info.calls/frames.length),renderer})
      }};requestAnimationFrame(frame)})
    })
    results.push({name,scale,viewport:mobile?'390x844':'1600x1000',...sample,errors})
    console.log(JSON.stringify(results.at(-1)))
  } finally { await context?.close();await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{}) }
}
await writeFile(process.argv[2],JSON.stringify({at:new Date().toISOString(),method:'7-second settle, 5-second requestAnimationFrame sample, one fresh isolated headless Chrome per view; viewport emulation, not physical phone evidence',results},null,2)+'\n')
