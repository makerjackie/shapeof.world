/** Input envelope is defined in neural milliseconds, independent of render FPS. */
export const PULSE_ENVELOPES = Object.freeze({
  paint: Object.freeze({ holdMs: 80, decayMs: 180, durationMs: 1000 }),
  turn: Object.freeze({ holdMs: 650, decayMs: 220, durationMs: 2500 }),
});
export class PulseBank {
  constructor(n) {
    this.n = n;
    this.pulses = [];
    this.rates = new Float32Array(n);
  }
  add(indices, tick, strength = 180, profile = 'paint') {
    if (!Object.hasOwn(PULSE_ENVELOPES, profile)) throw Error('Unknown pulse profile');
    const unique = [...new Set(indices)].filter((i) => Number.isInteger(i) && i >= 0 && i < this.n);
    if (!unique.length) return;
    // Coalesce rapid strokes in the same simulation tick and bound retained pulses.
    const last = this.pulses.at(-1);
    if (last?.tick === tick && last.strength === strength && last.profile === profile)
      last.indices = [...new Set([...last.indices, ...unique])];
    else this.pulses.push({ indices: unique, tick, strength, profile });
    if (this.pulses.length > 32) this.pulses.splice(0, this.pulses.length - 32);
  }
  sample(tick) {
    this.rates.fill(0);
    this.pulses = this.pulses.filter(
      (p) => (tick - p.tick) * 0.1 < PULSE_ENVELOPES[p.profile].durationMs,
    );
    for (const p of this.pulses) {
      const ms = (tick - p.tick) * 0.1,
        envelope = PULSE_ENVELOPES[p.profile];
      const rate = p.strength * Math.exp(-Math.max(0, ms - envelope.holdMs) / envelope.decayMs);
      if (rate < 1) continue;
      for (const i of p.indices) this.rates[i] = Math.max(this.rates[i], rate);
    }
    return this.rates;
  }
  reset() {
    this.pulses = [];
    this.rates.fill(0);
  }
}
export function populations(neurons) {
  const g = {
    walkLeft: [],
    walkRight: [],
    turnLeft: [],
    turnRight: [],
    reverse: [],
    escape: [],
    walk: [],
    left: [],
    right: [],
    escapeInput: [],
  };
  neurons.forEach((r, i) => {
    const t = r[1],
      s = r[3],
      side = s === 'L' ? 'Left' : s === 'R' ? 'Right' : null;
    if (side && ['DNp09', 'DNg100', 'DNg97'].includes(t)) g['walk' + side].push(i);
    if (side && ['DNa02', 'DNa11', 'DNg13'].includes(t)) g['turn' + side].push(i);
    if (t === 'MDN') g.reverse.push(i);
    if (t === 'DNp01') g.escape.push(i);
    if (t === 'LC9') g.walk.push(i);
    // DNa02 supplies a direct turn drive alongside the LC9 input.
    if (side && (t === 'LC9' || t === 'DNa02')) g[s === 'L' ? 'left' : 'right'].push(i);
    if (t === 'LC4') g.escapeInput.push(i);
  });
  return g;
}
export const CHANNELS = ['walkLeft', 'walkRight', 'turnLeft', 'turnRight', 'reverse', 'escape'];
// Readout columns contain only the contributing descending neurons.
export function compactReadout(groups) {
  const indices = Uint32Array.from(new Set(CHANNELS.flatMap((key) => groups[key])));
  const width = Math.max(1, indices.length),
    columns = new Map([...indices].map((id, i) => [id, i]));
  const weights = new Float32Array(CHANNELS.length * width);
  CHANNELS.forEach((key, c) => {
    for (const id of groups[key]) weights[c * width + columns.get(id)] = 1 / groups[key].length;
  });
  return { indices, width, weights };
}
export function decodeCounts(counts, groups, steps) {
  return Float32Array.from(CHANNELS, (key) => {
    let sum = 0;
    for (const i of groups[key]) sum += counts[i];
    return groups[key].length ? ((sum / groups[key].length) * 10000) / steps : 0;
  });
}
