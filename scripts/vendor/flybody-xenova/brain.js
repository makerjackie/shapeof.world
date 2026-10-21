/** Connectome LIF reference. Units: mV, ms, Hz. No fitted weights. */
export const PARAMETERS = Object.freeze({
  dt: 0.1,
  rest: -52,
  threshold: -45,
  tauM: 20,
  tauS: 5,
  refractory: 22,
  delay: 18,
  synapse: 0.275,
  poissonWeight: 68.75,
});
export function randomWord(i, t, seed = 1) {
  let x = (Math.imul(i + 1, 747796405) ^ Math.imul(t + 1, 2891336453) ^ seed) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 2246822519) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export function outgoingGraph(g) {
  const n = g.n,
    offsets = new Uint32Array(n + 1);
  for (const i of g.sources) offsets[i + 1]++;
  for (let i = 0; i < n; i++) offsets[i + 1] += offsets[i];
  const cursor = offsets.slice(),
    targets = new Uint32Array(g.sources.length),
    counts = new Uint32Array(g.sources.length);
  for (let j = 0; j < n; j++)
    for (let e = g.offsets[j]; e < g.offsets[j + 1]; e++) {
      const k = cursor[g.sources[e]]++;
      targets[k] = j;
      counts[k] = g.counts[e];
    }
  return { offsets, targets, counts };
}
const EM = Math.exp(-PARAMETERS.dt / PARAMETERS.tauM);
const ES = Math.exp(-PARAMETERS.dt / PARAMETERS.tauS);
const COUPLING = (PARAMETERS.tauS / (PARAMETERS.tauM - PARAMETERS.tauS)) * (EM - ES);

/** Event-driven scheduling; exactly resting neurons need no state update. */
export class BrainCPU {
  constructor(graph, { seed = 1 } = {}) {
    this.graph = graph;
    this.n = graph.n;
    this.seed = seed;
    this.out = outgoingGraph(graph);
    this.reset();
  }
  reset() {
    const n = this.n;
    this.v = new Float32Array(n).fill(-52);
    this.g = new Float32Array(n);
    this.until = new Uint32Array(n);
    this.counts = new Uint32Array(n);
    this.history = Array.from({ length: 19 }, () => []);
    this.tick = 0;
    this.active = new Uint32Array(n);
    this.present = new Uint8Array(n);
    this.activeCount = 0;
  }
  activate(i) {
    if (!this.present[i]) {
      this.present[i] = 1;
      this.active[this.activeCount++] = i;
    }
  }
  step(rates, externalEvents = null, silenced = false) {
    const driven = [];
    for (let i = 0; i < this.n; i++)
      if (externalEvents ? externalEvents[i] : rates[i] > 0) driven.push(i);
    return this.advance(rates, driven, externalEvents, silenced);
  }
  advance(rates, driven, externalEvents, silenced) {
    const { v, g, until, counts, active, present } = this,
      t = this.tick,
      p = PARAMETERS;
    const fired = [];
    let kept = 0;
    for (let k = 0; k < this.activeCount; k++) {
      const i = active[k];
      // No epsilon cutoff: skip only the exact stationary state. Refractory
      // deadlines remain stored and incoming events still check them.
      if (v[i] === p.rest && g[i] === 0) {
        present[i] = 0;
        continue;
      }
      active[kept++] = i;
      if (t >= until[i]) {
        v[i] = p.rest + (v[i] - p.rest) * EM + g[i] * COUPLING;
        g[i] *= ES;
        if (v[i] > p.threshold) fired.push(i);
      }
    }
    this.activeCount = kept;
    // Preserve the dense reference's source order and Float32 accumulation.
    fired.sort((a, b) => a - b);
    const due = this.history[t % 19],
      out = this.out;
    if (!silenced)
      for (const i of due) {
        const sign = this.graph.sign[i] * p.synapse;
        if (!sign) continue;
        for (let e = out.offsets[i]; e < out.offsets[i + 1]; e++) {
          const j = out.targets[e];
          if (t >= until[j]) {
            g[j] += out.counts[e] * sign;
            this.activate(j);
          }
        }
      }
    for (const i of driven) {
      if (
        t >= until[i] &&
        (externalEvents || randomWord(i, t, this.seed) / 4294967296 < (rates[i] * p.dt) / 1000)
      ) {
        v[i] += p.poissonWeight;
        this.activate(i);
      }
    }
    for (const i of fired) {
      v[i] = p.rest;
      g[i] = 0;
      until[i] = t + (rates[i] > 0 ? 0 : p.refractory);
      counts[i]++;
    }
    this.history[t % 19] = [];
    this.history[(t + p.delay) % 19] = fired;
    this.tick++;
    return fired;
  }
  batch(steps, rates, silenced = false) {
    const driven = [];
    for (let i = 0; i < this.n; i++) if (rates[i] > 0) driven.push(i);
    this.counts.fill(0);
    let total = 0;
    for (let k = 0; k < steps; k++) total += this.advance(rates, driven, null, silenced).length;
    return { counts: this.counts.slice(), tick: this.tick, total };
  }
}
