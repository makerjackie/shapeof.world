/** node src/components/experiences/worlds/road-design/measure-capacity.mjs [ids...]
 * Browser-free deterministic saturation experiment. Raw stage evidence is committed. */
import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
const root='/src/components/experiences/worlds/road-design/',output=new URL('./data/capacity.json',import.meta.url)
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'})
try {
 const {DESIGNS}=await vite.ssrLoadModule(root+'designs/index.ts')
 const {TrafficSimulation}=await vite.ssrLoadModule(root+'sim/simulation.ts')
 const {CAPACITY_METHOD:method,capacityOD,isPlateau}=await vite.ssrLoadModule(root+'sim/capacity-study.ts')
 const {measureGeometry}=await vite.ssrLoadModule(root+'sim/geometry-costs.ts')
 const results=JSON.parse(await readFile(output,'utf8').catch(()=>'{}'));results.method=method;results.designs??={}
 for(const d of DESIGNS.filter(d=>!process.argv[2]||process.argv.slice(2).includes(d.id))) {
  const n=d.build(),defaultDemand=n.defaultOD.reduce((sum,r)=>sum+r.vehiclesPerHour,0);n.defaultOD=capacityOD(n)
  const sim=new TrafficSimulation(n,{seed:method.seed,demandMultiplier:.5}),start=performance.now(),stages=[]
  sim.warmup(method.warmupSeconds);sim.resetMetrics()
  for(const multiplier of method.multipliers){
   sim.setDemandMultiplier(multiplier);const queue=sim.outsideQueue
   sim.advance(method.stageSeconds)
   const m=sim.metrics, completed=sim.metricsWindow.completions.filter(c=>c.time>=sim.time-method.windowSeconds),delivered=completed.filter(c=>c.delivered!==false)
   const hourlyFactor=3600/method.windowSeconds
   const total=delivered.length*hourlyFactor,turning=delivered.filter(c=>sim.movementMap.get(c.movementId)?.turn!=='straight').length*hourlyFactor,missed=completed.length-delivered.length
   stages.push({missed,multiplier,demand:Math.round(m.demand),total,turning,delay:+m.averageDelay.toFixed(2),queue:m.outsideQueue,queueGrowth:m.outsideQueue-queue,backlogSeconds:Math.round(m.outsideQueue/Math.max(1,total)*3600)})
   console.log(d.id,JSON.stringify(stages.at(-1)))
   if(isPlateau(stages))break
  }
  const peak=stages.reduce((a,b)=>b.total>a.total?b:a),turnPeak=stages.reduce((a,b)=>b.turning>a.turning?b:a),saturated=isPlateau(stages)
  results.designs[d.id]={status:saturated?'saturated':'not-saturated',vehiclesPerHour:peak.total,turningVehiclesPerHour:turnPeak.turning,peakMultiplier:peak.multiplier,turningPeakMultiplier:turnPeak.multiplier,defaultDemand,landAreaM2:measureGeometry(n).landArea,stages}
  await writeFile(output,JSON.stringify(results,null,2)+'\n')
  console.log(d.id,saturated?'SATURATED':'LOWER BOUND','wallSeconds',((performance.now()-start)/1000).toFixed(1))
 }
} finally {await vite.close()}
