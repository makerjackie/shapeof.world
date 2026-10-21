#!/usr/bin/env node
/**
 * Original procedural sky for black-hole-flyby. No catalogue, sky image, or
 * astronomical object coordinates are an input. Seed: 0x5eeda17c.
 *
 * Format audited against Eric Bruneton's BSD-3-Clause source at e60fa7b:
 * gaia_sky_map/cube_map.cc and gaia_sky_map_generator.cc, and demo.html's loader.
 * Packing also checked against the Khronos EXT_texture_shared_exponent spec:
 * https://registry.khronos.org/OpenGL/extensions/EXT/EXT_texture_shared_exponent.txt
 * All output is little-endian RGB9_E5 (mantissa RGB at bits 0/9/18, exponent
 * at 27, decoded channel = mantissa * 2 ** (exponent - 24)). Face order and
 * direction convention are OpenGL +X,-X,+Y,-Y,+Z,-Z. Every level stores the
 * galaxy plane, then the star plane. L3 is one 256-square level (524288 B);
 * L4 contains L4..11, 128..1 square (174760 B).
 *
 * Important upstream detail: galaxy radiance is area-weighted, NOT a plain
 * average. Stars are sums through L6; L7 and coarser are divided by the sum
 * of the ORIGINAL 2048-square texel areas, cos(theta)^3. At L6 -> L7 this
 * changes units. Build all levels from unquantized L3 source values to avoid
 * repeated RGB9_E5 rounding. Exact solid angles give the same area integral
 * as upstream's 2048-square midpoint quadrature within 2.4e-7 relative at L3 (measured over all texels).
 *
 * The optional --compare-reference reads the old tiles only via git show,
 * decodes them in memory, and retains only global scalar statistics. It never
 * writes a reference tile, reconstructed tile, image, or per-texel derivative.
 * Normal generation needs only the restored BSD black_body.dat lookup table.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'public/vendor/black-hole/sky');
const STATS_FILE = resolve(ROOT, 'scripts/black-hole-sky-statistics.json');
const FACES = ['pos-x', 'neg-x', 'pos-y', 'neg-y', 'pos-z', 'neg-z'];
const SIZE = 256;
const SEED = 0x5eeda17c;
const LUMA = [.2126, .7152, .0722];
// Authored exposure guardrails. The galaxy keeps its authored contrast and is
// scaled once to a mean luminance a little above the old sky's L3 mean (724),
// because the far view needs a bright band for the lens to bend; stars use
// scalar quantiles. These controls have no reference spatial information.
const GALAXY_TARGET_MEAN = 950;
const STAR_ANCHORS = [[0, 0], [.00193278, 0], [.1, .25914121094], [.2, .394506640625],
  [.4, .67], [.5, .86], [.6, 1.16], [.8, 2.27],
  [.9, 3.78], [.95, 7.3], [.98, 26.8], [.99, 49.268525], [.995, 90],
  [.999, 380], [.9995, 730], [.9998, 1500], [.9999, 2300],
  [.99995, 3500], [.99998, 7200], [.99999, 9400], [.999995, 17600], [1, 24500]];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Authored spherical composition, independent of any observed sky positions.
// Every preset looks roughly along this cube's equator with +Z up (far looks
// at +X, about 7 degrees below it), so a plane tilted slightly off the equator
// crosses each view as a band. In the far view it passes a few degrees above
// the black hole and rises gently to the right, and the lens bends it into a
// ring. The bulge sits left of the far view's optical axis, so the ring is
// brighter on one side.
const NORMAL = normalize([.061, .14, 1]);
const EQUATOR = normalize([1, 0, 0].map((x, i) => x - NORMAL[i] * NORMAL[0]));
const TANGENT = cross(NORMAL, EQUATOR);
const BULGE_LONGITUDE = .46;

function randomSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ SEED;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const smooth = t => t * t * (3 - 2 * t);
  const u = smooth(x - ix), v = smooth(y - iy), w = smooth(z - iz);
  let n = 0;
  for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    n += hash(ix + i, iy + j, iz + k) * (i ? u : 1 - u) * (j ? v : 1 - v) * (k ? w : 1 - w);
  }
  return n;
}
function fbm(d, frequency, octaves = 5) {
  let sum = 0, weight = .5, total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    // Offsets and noninteger frequency avoid aligned/repeated noise octaves.
    sum += weight * noise(d[0] * frequency + 12.31, d[1] * frequency - 7.17, d[2] * frequency + 23.73);
    total += weight; weight *= .51; frequency *= 2.037;
  }
  return sum / total;
}
function ridged(d, frequency, octaves = 4) {
  let sum = 0, weight = .5, total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    const n = noise(d[0] * frequency - 32.19, d[1] * frequency + 17.53, d[2] * frequency + 8.71);
    sum += weight * (1 - Math.abs(2 * n - 1));
    total += weight; weight *= .56; frequency *= 2.113;
  }
  return sum / total;
}
function smoothRange(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
// Noise that depends only on galactic longitude: sampled on a circle in its own
// region of noise space, so it varies along the band but not across it.
function alongBand(longitude, radius, offset, octaves = 4) {
  return fbm([Math.cos(longitude) * radius, Math.sin(longitude) * radius, offset], 1, octaves);
}
const shift = (d, s) => d.map(v => v + s);
function diffuseSample(d) {
  // All fields are evaluated in 3D direction space, so they stay continuous
  // across cube edges. A small vector warp makes the band edges ragged.
  const warp = [0, 1, 2].map(k => fbm(d.map((x, i) => x + (i === k ? 5.3 : -2.7)), 6.2, 4) - .5);
  const q = normalize(d.map((v, k) => v + .07 * warp[k]));
  const b = Math.asin(clamp(dot(q, NORMAL), -1, 1));
  const l = Math.atan2(dot(q, TANGENT), dot(q, EQUATOR));
  const dl = Math.atan2(Math.sin(l - BULGE_LONGITUDE), Math.cos(l - BULGE_LONGITUDE));
  // The center line meanders and the width breathes along the band; the
  // band thickens around the bulge.
  const center = .02 * Math.sin(2 * l) + .03 * (alongBand(l, 1.1, 3.1) - .5);
  const width = .075 * (.65 + .7 * alongBand(l, 1.6, 7.9)) * (1 + .9 * Math.exp(-((dl / .42) ** 2)));
  const y = (b - center) / width;
  const disc = Math.exp(-(Math.abs(y) ** 1.5)) + .08 * Math.exp(-Math.abs(y) / 3.5);
  // Bright star clouds and faint stretches along the band, a bulge on one
  // side, and clumpy texture inside.
  // The stretch behind the far view's black hole is kept bright, so the lens
  // has a luminous band to bend into a ring.
  const nearAxis = Math.exp(-(((l - .1) / .5) ** 2));
  const along = .3 + 1.2 * smoothRange(.32, .72, alongBand(l, 1.9, 13.7, 5)) + 1.0 * nearAxis;
  const bulge = 1.9 * Math.exp(-((dl / .3) ** 2) - (((b - center) / .2) ** 2));
  const cloud = Math.exp(1.5 * (fbm(q, 9.5, 5) - .5) + 1.1 * (fbm(shift(q, 3.3), 31, 4) - .5));
  // Dust. Two rifts run along the band but switch on and off with longitude,
  // drift across it and have ragged edges, so the lens bends them into broken
  // arcs instead of evenly spaced rings. Patches and ridged filaments add
  // smaller dark clouds around the band.
  const yr = y + .55 * (fbm(shift(q, -4.1), 16, 4) - .5);
  const riftOffset = .25 + .35 * (alongBand(l, 1.4, 21.1) - .5);
  const riftWidth = .22 + .25 * alongBand(l, 2, 33.3);
  const rift = smoothRange(.4, .6, alongBand(l, 2.3, 27.4, 5)) * Math.exp(-(((yr - riftOffset) / riftWidth) ** 2));
  const fork = smoothRange(.55, .7, alongBand(l, 2.8, 41.6, 5)) * Math.exp(-(((yr + .55) / .2) ** 2));
  const support = Math.exp(-((Math.abs(y) / 2.2) ** 2));
  const patches = smoothRange(.56, .74, fbm(shift(q, 9.1), 7.7, 5));
  const filaments = smoothRange(.72, .9, ridged(q, 19, 5)) * smoothRange(.42, .62, fbm(shift(q, -6.6), 4.9, 4));
  const opticalDepth = 2.6 * rift + 1.8 * fork + support * (2 * patches + 1.5 * filaments);
  const disk = disc * along * cloud, core = bulge * cloud;
  // Neutral-cool starlight, a warmer bulge, and dust that reddens what it
  // dims, so only lane edges and the bulge turn warm.
  const tint = .05 * (fbm(shift(q, 12.2), 3.7, 3) - .5);
  const base = [.92 - tint, .97, 1.12 + 2 * tint];
  const warm = [1.18, 1, .78];
  const background = .004 + .004 * fbm(d, 4.1, 4);
  const rgb = [0, 1, 2].map(k => (disk * base[k] + core * warm[k]) * Math.exp(-opticalDepth * [1.06, 1, .92][k]) +
    background * [.95, .98, 1.08][k]);
  return rgb;
}
function faceDirection(face, x, y, size = SIZE) {
  const u = 2 * (x + .5) / size - 1, v = 2 * (y + .5) / size - 1;
  return normalize([[1, -v, -u], [-1, -v, u], [u, 1, v], [u, -1, -v], [u, -v, 1], [-u, -v, -1]][face]);
}
function directionPixel(d) {
  const [x, y, z] = d, ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let face, u, v, a;
  if (ax >= ay && ax >= az) { face = x > 0 ? 0 : 1; u = x > 0 ? -z : z; v = -y; a = ax; }
  else if (ay >= az) { face = y > 0 ? 2 : 3; u = x; v = y > 0 ? z : -z; a = ay; }
  else { face = z > 0 ? 4 : 5; u = z > 0 ? x : -x; v = -y; a = az; }
  const i = clamp(Math.floor((u / a + 1) * .5 * SIZE), 0, SIZE - 1);
  const j = clamp(Math.floor((v / a + 1) * .5 * SIZE), 0, SIZE - 1);
  return face * SIZE * SIZE + j * SIZE + i;
}
function areaAt(x, y, size = SIZE) {
  const primitive = (u, v) => Math.atan2(u * v, Math.sqrt(1 + u * u + v * v));
  const x0 = 2 * x / size - 1, x1 = 2 * (x + 1) / size - 1;
  const y0 = 2 * y / size - 1, y1 = 2 * (y + 1) / size - 1;
  // Integral of cos(theta)^3 in units of original 2048-square texels.
  return (primitive(x1, y1) - primitive(x0, y1) - primitive(x1, y0) + primitive(x0, y0)) * 1024 ** 2;
}
function packRgb9e5(rgb) {
  if (!rgb.every(value => Number.isFinite(value) && value >= 0)) throw new Error('Nonfinite or negative source radiance');
  const c = rgb.map(x => clamp(x, 0, 65408));
  const max = Math.max(...c);
  if (max < 2 ** -25) return 0;
  let exponent = Math.max(-16, Math.floor(Math.log2(max))) + 16;
  let step = 2 ** (exponent - 24);
  if (Math.floor(max / step + .5) === 512) { exponent++; step *= 2; }
  return ((exponent << 27) | (Math.floor(c[2] / step + .5) << 18) |
    (Math.floor(c[1] / step + .5) << 9) | Math.floor(c[0] / step + .5)) >>> 0;
}
function unpackRgb9e5(value) {
  const step = 2 ** ((value >>> 27) - 24);
  return [(value & 511) * step, ((value >>> 9) & 511) * step, ((value >>> 18) & 511) * step];
}
async function blackBodyColors() {
  const data = await readFile(resolve(ROOT, 'public/vendor/black-hole/black_body.dat'));
  if (data.length !== 128 * 3 * 4) throw new Error('Unexpected BSD black_body.dat size');
  const colors = [];
  for (let i = 0; i < 128; i++) {
    const rgb = [0, 1, 2].map(k => data.readFloatLE((i * 3 + k) * 4));
    const y = dot(rgb, LUMA);
    colors.push(rgb.map(v => v / Math.max(1e-30, y)));
  }
  return temperature => {
    const x = clamp(Math.log(temperature / 100) / 6 * 128 - .5, 0, 127);
    const i = Math.floor(x), t = x - i;
    return colors[i].map((v, k) => v * (1 - t) + colors[Math.min(127, i + 1)][k] * t);
  };
}
function percentileCurve(p, anchors, shape) {
  let i = 1;
  while (i < anchors.length - 1 && p > anchors[i][0]) i++;
  const [a, x] = anchors[i - 1], [b, y] = anchors[i];
  const t = ((p - a) / (b - a)) ** shape;
  return x > 0 ? Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * t) : x + (y - x) * t;
}
function calibrateRadiance(rgb, raw, anchors, targetMean, unitColors = false) {
  // A single exponent adjusts curvature between the few scalar quantiles.
  // Solve its integral against the benchmark mean, without any spatial input.
  let low = .1, high = 8;
  for (let iteration = 0; iteration < 24; iteration++) {
    const shape = (low + high) / 2;
    let mean = 0;
    for (let i = 0; i < raw.length; i++) mean += percentileCurve(i / (raw.length - 1), anchors, shape) / raw.length;
    if (mean > targetMean) low = shape; else high = shape;
  }
  const shape = (low + high) / 2;
  const order = Array.from({ length: raw.length }, (_, i) => i).sort((a, b) => raw[a] - raw[b]);
  for (let rank = 0; rank < raw.length; rank++) {
    const p = order[rank], value = percentileCurve(rank / (raw.length - 1), anchors, shape);
    const scale = unitColors ? value : raw[p] > 0 ? value / raw[p] : 0;
    for (let k = 0; k < 3; k++) rgb[p * 3 + k] *= scale;
  }
  return shape;
}
async function synthesize() {
  const colorAt = await blackBodyColors();
  const count = 6 * SIZE * SIZE;
  const galaxy = new Float64Array(count * 3), stars = new Float64Array(count * 3);
  const areas = new Float64Array(SIZE * SIZE), raw = new Float64Array(count);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) areas[y * SIZE + x] = areaAt(x, y);
  for (let face = 0; face < 6; face++) for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const p = face * SIZE * SIZE + y * SIZE + x, rgb = diffuseSample(faceDirection(face, x, y));
    raw[p] = dot(rgb, LUMA);
    for (let k = 0; k < 3; k++) galaxy[p * 3 + k] = rgb[k];
  }
  // One linear scale sets the exposure guardrail (mean luminance); the
  // authored contrast between band, dust and background is kept as is.
  const galaxyScale = GALAXY_TARGET_MEAN * count / raw.reduce((a, b) => a + b, 0);
  for (let i = 0; i < galaxy.length; i++) galaxy[i] *= galaxyScale;
  const brightBand = [...raw].sort((a, b) => a - b)[Math.floor(count * .995)];
  const random = randomSource(SEED);
  let starCount = 0;
  const placePopulation = (n, planeFraction, minFlux, maxFlux, slope, traceBand = false) => {
    const minPower = minFlux ** -slope, maxPower = maxFlux ** -slope;
    for (let i = 0; i < n; i++) {
      let d, p;
      if (traceBand) {
        // Unresolved-looking star clouds: positions follow the diffuse light,
        // so bright clouds sparkle and dust lanes hold fewer stars.
        do {
          const z = 2 * random() - 1, phi = random() * 2 * Math.PI, r = Math.sqrt(1 - z * z);
          d = [r * Math.cos(phi), r * Math.sin(phi), z];
          p = directionPixel(d);
        } while (random() > Math.min(1, raw[p] / brightBand) ** .8);
      } else {
        const longitude = random() * 2 * Math.PI;
        let latitude;
        if (random() < planeFraction) {
          // A Gaussian disc population, from independent spherical positions.
          latitude = clamp(Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(random() * 2 * Math.PI) * .19, -1.5, 1.5);
        } else latitude = Math.asin(2 * random() - 1);
        const c = Math.cos(latitude), s = Math.sin(latitude);
        d = EQUATOR.map((v, k) => v * Math.cos(longitude) * c + TANGENT[k] * Math.sin(longitude) * c + NORMAL[k] * s);
        p = directionPixel(d);
      }
      // N(<m) proportional to 10 ** (.4 * slope * m); more faint stars.
      const flux = (minPower - random() * (minPower - maxPower)) ** (-1 / slope);
      const t = random();
      const temperature = flux > 25
        ? t < .24 ? 3000 + random() * 1000 : t < .72 ? 10500 + random() * 11500 : 6000 + random() * 3000
        : t < .68 ? 4100 + random() * 3400 : t < .96 ? 7600 + random() * 6500 : 14500 + random() * 17000;
      const rgb = colorAt(temperature);
      for (let k = 0; k < 3; k++) stars[p * 3 + k] += rgb[k] * flux;
      starCount++;
    }
  };
  placePopulation(5400000, .22, .006, 1.8, .9);
  placePopulation(900000, 0, .006, 1.8, .9, true);
  placePopulation(135000, .12, .45, 24000, .86);
  for (let p = 0; p < count; p++) raw[p] = stars[p * 3] * LUMA[0] + stars[p * 3 + 1] * LUMA[1] + stars[p * 3 + 2] * LUMA[2];
  const starShape = calibrateRadiance(stars, raw, STAR_ANCHORS, 4.065710283904721);
  return { galaxy, stars, areas, starCount, calibrationShapes: { galaxyScale, star: starShape } };
}
function encodeFaceLevels(source, face) {
  let size = SIZE;
  let area = source.areas;
  let galaxySum = new Float64Array(SIZE * SIZE * 3), starSum = new Float64Array(SIZE * SIZE * 3);
  for (let p = 0; p < SIZE * SIZE; p++) for (let k = 0; k < 3; k++) {
    galaxySum[p * 3 + k] = source.galaxy[(face * SIZE * SIZE + p) * 3 + k] * area[p];
    starSum[p * 3 + k] = source.stars[(face * SIZE * SIZE + p) * 3 + k];
  }
  const encoded = [];
  for (let level = 3; level <= 11; level++) {
    const buffer = Buffer.alloc(size * size * 8);
    for (let p = 0; p < size * size; p++) {
      const galaxy = [0, 1, 2].map(k => galaxySum[p * 3 + k] / area[p]);
      const star = [0, 1, 2].map(k => starSum[p * 3 + k] / (level > 6 ? area[p] : 1));
      buffer.writeUInt32LE(packRgb9e5(galaxy), p * 4);
      buffer.writeUInt32LE(packRgb9e5(star), (size * size + p) * 4);
    }
    encoded.push(buffer);
    if (size === 1) break;
    const nextSize = size / 2, nextArea = new Float64Array(nextSize * nextSize);
    const nextGalaxy = new Float64Array(nextSize * nextSize * 3), nextStars = new Float64Array(nextSize * nextSize * 3);
    for (let y = 0; y < nextSize; y++) for (let x = 0; x < nextSize; x++) {
      const p = y * nextSize + x;
      for (const dy of [0, 1]) for (const dx of [0, 1]) {
        const q = (2 * y + dy) * size + 2 * x + dx;
        nextArea[p] += area[q];
        for (let k = 0; k < 3; k++) { nextGalaxy[p * 3 + k] += galaxySum[q * 3 + k]; nextStars[p * 3 + k] += starSum[q * 3 + k]; }
      }
    }
    size = nextSize; area = nextArea; galaxySum = nextGalaxy; starSum = nextStars;
  }
  return encoded;
}
function summarize(tiles) {
  const levels = new Map();
  for (const { startLevel, buffer } of tiles) {
    let size = 2048 >> startLevel, offset = 0;
    for (let level = startLevel; offset < buffer.length; level++, size /= 2) {
      if (!levels.has(level)) levels.set(level, { galaxy: [], star: [], galaxyRgb: [0, 0, 0], starRgb: [0, 0, 0] });
      const data = levels.get(level);
      for (const kind of ['galaxy', 'star']) for (let p = 0; p < size * size; p++) {
        const rgb = unpackRgb9e5(buffer.readUInt32LE(offset)); offset += 4;
        data[kind].push(dot(rgb, LUMA));
        for (let k = 0; k < 3; k++) data[`${kind}Rgb`][k] += rgb[k];
      }
    }
  }
  return [...levels.entries()].sort(([a], [b]) => a - b).map(([level, data]) => {
    const result = { level, texels: data.galaxy.length };
    for (const kind of ['galaxy', 'star']) {
      const values = data[kind].sort((a, b) => a - b), nonzero = values.filter(v => v > 0);
      const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))] || 0;
      const total = data[`${kind}Rgb`].reduce((a, b) => a + b, 0);
      result[kind] = { mean: values.reduce((a, b) => a + b, 0) / values.length,
        p10: q(values, .1), p50: q(values, .5), p90: q(values, .9), p99: q(values, .99), p999: q(values, .999),
        max: values.at(-1), nonzeroFraction: nonzero.length / values.length,
        nonzeroP50: q(nonzero, .5), nonzeroP90: q(nonzero, .9),
        rgbFractions: data[`${kind}Rgb`].map(v => v / total) };
    }
    return result;
  });
}
function measureMipConsistency(tiles) {
  const faces = [];
  for (let face = 0; face < 6; face++) {
    const levels = new Map();
    for (const { startLevel, buffer } of tiles.slice(face * 2, face * 2 + 2)) {
      let size = 2048 >> startLevel, offset = 0;
      for (let level = startLevel; offset < buffer.length; level++, size /= 2) {
        const planes = {};
        for (const kind of ['galaxy', 'star']) {
          const values = new Float64Array(size * size);
          for (let p = 0; p < values.length; p++, offset += 4) values[p] = dot(unpackRgb9e5(buffer.readUInt32LE(offset)), LUMA);
          planes[kind] = values;
        }
        levels.set(level, planes);
      }
    }
    faces.push(levels);
  }
  const results = [];
  for (let childLevel = 3; childLevel < 11; childLevel++) {
    const size = 2048 >> childLevel, parentSize = size / 2;
    const errors = { galaxy: [], star: [] };
    for (const levels of faces) for (let y = 0; y < parentSize; y++) for (let x = 0; x < parentSize; x++) {
      const child = levels.get(childLevel), parent = levels.get(childLevel + 1), area = areaAt(x, y, parentSize);
      let galaxy = 0, star = 0;
      for (const dy of [0, 1]) for (const dx of [0, 1]) {
        const i = 2 * x + dx, j = 2 * y + dy, p = j * size + i, childArea = areaAt(i, j, size);
        galaxy += child.galaxy[p] * childArea;
        star += child.star[p] * (childLevel > 6 ? childArea : 1);
      }
      galaxy /= area;
      if (childLevel + 1 > 6) star /= area;
      const p = y * parentSize + x;
      for (const [kind, prediction] of [['galaxy', galaxy], ['star', star]]) {
        const actual = parent[kind][p];
        errors[kind].push(Math.abs(prediction - actual) / Math.max(actual, 1e-12));
      }
    }
    const result = { childLevel, parentLevel: childLevel + 1 };
    for (const kind of ['galaxy', 'star']) {
      const e = errors[kind].sort((a, b) => a - b);
      result[kind] = { meanRelativeError: e.reduce((a, b) => a + b, 0) / e.length,
        p99RelativeError: e[Math.floor(e.length * .99)], maxRelativeError: e.at(-1) };
    }
    results.push(result);
  }
  return results;
}
function readReference() {
  const tiles = [];
  for (const face of FACES) for (const startLevel of [3, 4]) {
    const result = spawnSync('git', ['-C', resolve(ROOT, '../oneworld'), 'show',
      `518161586:public/vendor/black-hole/gaia/${face}-${startLevel}-0-0.dat`], { maxBuffer: 4 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`Reference read failed: ${result.stderr.toString()}`);
    const expected = startLevel === 3 ? 524288 : 174760;
    if (result.stdout.length !== expected) throw new Error('Reference tile size mismatch');
    tiles.push({ startLevel, buffer: result.stdout });
  }
  return { statistics: summarize(tiles), mipValidation: measureMipConsistency(tiles) };
}

// Independent known values from the Khronos bit layout catch packing drift.
for (const [rgb, expected] of [[[0, 0, 0], 0], [[1, 1, 1], 0x84020100],
  [[65408, 65408, 65408], 0xffffffff], [[2 ** -24, 0, 0], 1]]) {
  if (packRgb9e5(rgb) !== expected) throw new Error('RGB9_E5 known-value check failed');
}
await mkdir(OUTPUT, { recursive: true });
const source = await synthesize();
const tiles = [], files = [];
for (let face = 0; face < 6; face++) {
  const levels = encodeFaceLevels(source, face);
  for (const startLevel of [3, 4]) {
    const buffer = startLevel === 3 ? levels[0] : Buffer.concat(levels.slice(1));
    const file = `${FACES[face]}-${startLevel}-0-0.dat`;
    const expected = startLevel === 3 ? 524288 : 174760;
    if (buffer.length !== expected) throw new Error(`Output size mismatch: ${file}`);
    await writeFile(resolve(OUTPUT, file), buffer);
    files.push({ file, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
    tiles.push({ startLevel, buffer });
  }
}
let previous = {};
try { previous = JSON.parse(await readFile(STATS_FILE, 'utf8')); } catch { /* First generation. */ }
const referenceRun = process.argv.includes('--compare-reference') ? readReference() : undefined;
const reference = referenceRun?.statistics ?? previous.reference;
const referenceMipValidation = referenceRun?.mipValidation ?? previous.referenceMipValidation;
const report = { seed: `0x${SEED.toString(16)}`, syntheticStars: source.starCount, calibrationShapes: source.calibrationShapes,
  calibration: { galaxyTargetMean: GALAXY_TARGET_MEAN, starAnchors: STAR_ANCHORS,
    starTargetMean: 4.065710283904721, intent: 'Authored exposure guardrails: one linear galaxy scale to a target mean, and star quantiles; not exact reference matching.' },
  provenance: 'Original random spherical positions and procedural spherical radiance; BSD black_body.dat supplies only blackbody colors.',
  referenceProvenance: 'Global scalar statistics only; git show 518161586:public/vendor/black-hole/gaia/*, decoded in memory. No reference spatial data retained.',
  radiance: 'Linear sRGB luminance Y = .2126 R + .7152 G + .0722 B; quantiles include zero unless marked nonzero.',
  mipRule: 'Galaxy = sum(flux) / sum(original 2048 texel cos^3 areas); star = sum(flux) at L3..6 and sum(flux) / sum(original areas) at L7..11.',
  validation: { rgb9e5KnownVectors: 4, sourceRadianceFiniteNonnegative: true, exactTileSizes: true,
    mipMaxRelativeErrorLimit: .01, mipMeanRelativeErrorLimit: .002 },
  files, generated: summarize(tiles), generatedMipValidation: measureMipConsistency(tiles),
  ...(reference ? { reference, referenceMipValidation } : {}) };
for (const level of report.generatedMipValidation) for (const kind of ['galaxy', 'star']) {
  if (level[kind].maxRelativeError > .01 || level[kind].meanRelativeError > .002) {
    throw new Error(`Mip consistency failed: L${level.childLevel} -> ${level.parentLevel} ${kind}`);
  }
}
await writeFile(STATS_FILE, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated ${files.length} original sky tiles (${files.reduce((n, f) => n + f.bytes, 0)} bytes); seed ${report.seed}; ${source.starCount} synthetic stars.`);
console.log(`Statistics: ${STATS_FILE}`);
console.log('PASS: RGB9_E5 known-value vectors, finite nonnegative source, 12 exact layouts, and all L3..11 mip transitions (max relative error < 1%, mean < 0.2%).');
for (const data of report.generated) console.log(`L${data.level}: galaxy mean ${data.galaxy.mean.toFixed(3)}, p50 ${data.galaxy.p50.toFixed(3)}, p90 ${data.galaxy.p90.toFixed(3)}; star nonzero ${(100 * data.star.nonzeroFraction).toFixed(4)}%, mean ${data.star.mean.toFixed(5)}, p50 ${data.star.p50.toFixed(5)}, p99 ${data.star.p99.toFixed(5)}`);
