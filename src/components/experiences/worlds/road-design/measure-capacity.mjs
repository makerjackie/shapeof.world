/** Reproduce with: node src/components/experiences/worlds/road-design/measure-capacity.mjs
 * No browser, rendering or randomized seed. Same ramp and core detectors as the UI.
 * Optional ids are for resuming an interrupted run; existing other rows are retained. */
import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
const root = '/src/components/experiences/worlds/road-design/'
const output = new URL('./data/capacity.json', import.meta.url)
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
try {
  const { DESIGNS } = await vite.ssrLoadModule(root + 'designs/index.ts')
  const { TrafficSimulation } = await vite.ssrLoadModule(root + 'sim/simulation.ts')
  const { pressureDemand } = await vite.ssrLoadModule(root + 'sim/metrics.ts')
  const { measureGeometry } = await vite.ssrLoadModule(root + 'sim/geometry-costs.ts')
  const results = JSON.parse(await readFile(output,'utf8').catch(()=>'{}'))
  results.method = { version: 1, seed: 271828, stepSeconds: 1/30, warmupSeconds: 240, rampSeconds: 1200, multiplierFrom: .25, multiplierTo: 2.5, windowSeconds: 300, sampleEverySeconds: 10, note: 'Maximum completed-core detector rate in full rolling five-minute windows during one rising-demand run. Model-specific, not engineering capacity.' }
  results.designs ??= {}
  for (const design of DESIGNS.filter(d => !process.argv[2] || process.argv.slice(2).includes(d.id))) {
    const network=design.build(), sim=new TrafficSimulation(network,{seed:271828,demandMultiplier:.25})
    const started=performance.now()
    sim.warmup(120); sim.resetMetrics(); sim.warmup(120)
    let peak=0, at=0, delay=0, lastPeak=0
    for(let step=1;step<=1200*30;step++) {
      sim.setDemandMultiplier(pressureDemand((step-1)/30,.25,2.5,1200)); sim.step(1/30)
      if(step%300===0 && step/30>=180) {
        const m=sim.metrics
        if(m.throughput>peak){peak=m.throughput;at=step/30;delay=m.averageDelay;lastPeak=m.outsideQueue}
      }
    }
    results.designs[design.id]={vehiclesPerHour:Math.round(peak),peakAtSeconds:at,delayAtPeakSeconds:+delay.toFixed(2),outsideQueueAtPeak:lastPeak,defaultDemand:sim.baseDemand,hullAreaM2:+measureGeometry(network).hullArea.toFixed(2)}
    await writeFile(output,JSON.stringify(results,null,2)+'\n')
    console.log(design.id,JSON.stringify(results.designs[design.id]),'wallSeconds',((performance.now()-started)/1000).toFixed(1))
  }
} finally { await vite.close() }
