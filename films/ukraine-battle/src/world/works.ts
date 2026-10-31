// Field fortifications, generated (deterministically) along the real OSM tree belts: fire trenches with traverses
// on the enemy-facing edge of each belt, firing pits, communication trenches running back to dugouts; in the second
// zone, the anti-tank ditch of the main line. All 示意: the pattern follows RUSI's description of Russian positions
// ("company fighting positions in wood blocks"), not surveyed trench lines.
import fieldJson from "../data/field.json";
import { FRONT_JUN23, MAIN_LINE, MINE_BELT, TRENCH_1 } from "../geo";

export type Zone = { x0: number; y0: number; size: number };
export type Works = {
  zone: Zone;
  trenches: [number, number][][]; // centre lines, width TRENCH_W
  pits: [number, number, number][]; // x, y, radius
  dugouts: [number, number, number][]; // x, y, yaw (rad)
  ditches: [number, number][][]; // anti-tank ditch centre lines, width DITCH_W
  parapets: [number, number][][]; // spoil ridges
};
export const TRENCH_W = 1.7;
export const TRENCH_D = 2.0;
export const DITCH_W = 6;
export const DITCH_D = 4;

const WOODS = (fieldJson as unknown as { woods: number[][] }).woods;

const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const lineY = (L: [number, number][], x: number) => {
  for (let i = 0; i + 1 < L.length; i++) if (x >= L[i][0] && x <= L[i + 1][0]) return L[i][1] + ((L[i + 1][1] - L[i][1]) * (x - L[i][0])) / (L[i + 1][0] - L[i][0]);
  return L[L.length - 1][1];
};
const frontY = (x: number) => {
  const L = FRONT_JUN23 as [number, number][];
  for (let i = 0; i + 1 < L.length; i++) if (x >= L[i][0] && x <= L[i + 1][0]) return L[i][1] + ((L[i + 1][1] - L[i][1]) * (x - L[i][0])) / (L[i + 1][0] - L[i][0]);
  return 9000;
};

// A fire trench along a straight run: crenellated trace (bays and traverses), pits ahead, comm trenches behind.
const fireTrench = (a: [number, number], b: [number, number], fwd: [number, number], R: () => number, out: Works) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / L;
  const uy = (b[1] - a[1]) / L;
  const line: [number, number][] = [];
  const bay = 9;
  for (let s = 0; s <= L; s += bay) {
    const off = Math.floor(s / bay) % 2 === 0 ? 0 : 2.4;
    const x = a[0] + ux * s + fwd[0] * off;
    const y = a[1] + uy * s + fwd[1] * off;
    line.push([x, y]);
    const s2 = Math.min(L, s + bay * 0.62);
    line.push([a[0] + ux * s2 + fwd[0] * off, a[1] + uy * s2 + fwd[1] * off]);
  }
  out.trenches.push(line);
  // spoil thrown up on the enemy side
  out.parapets.push([
    [a[0] + fwd[0] * 4.2, a[1] + fwd[1] * 4.2],
    [b[0] + fwd[0] * 4.2, b[1] + fwd[1] * 4.2],
  ]);
  // firing pits on short stubs
  for (let s = 14 + R() * 10; s < L - 8; s += 26 + R() * 14) {
    const bx = a[0] + ux * s;
    const by = a[1] + uy * s;
    const px = bx + fwd[0] * 7.5;
    const py = by + fwd[1] * 7.5;
    out.trenches.push([
      [bx + fwd[0] * 1.2, by + fwd[1] * 1.2],
      [px, py],
    ]);
    out.pits.push([px, py, 1.3 + R() * 0.4]);
  }
  // communication trenches back to dugouts
  for (let s = 40 + R() * 40; s < L - 30; s += 140 + R() * 90) {
    const bx = a[0] + ux * s;
    const by = a[1] + uy * s;
    const depth = 45 + R() * 60;
    const comm: [number, number][] = [[bx, by]];
    for (let k = 1; k <= 6; k++) {
      const d = (depth * k) / 6;
      const zz = (k % 2 ? 1 : -1) * 3.5;
      comm.push([bx - fwd[0] * d + ux * zz, by - fwd[1] * d + uy * zz]);
    }
    out.trenches.push(comm);
    const [ex, ey] = comm[comm.length - 1];
    out.dugouts.push([ex - fwd[0] * 4, ey - fwd[1] * 4, Math.atan2(uy, ux)]);
  }
};

export const buildWorks = (zone: Zone, kind: "forward" | "main", seed: number): Works => {
  const R = rng(seed);
  const out: Works = { zone, trenches: [], pits: [], dugouts: [], ditches: [], parapets: [] };
  const inZ = (x: number, y: number, m = 30) => x > zone.x0 + m && x < zone.x0 + zone.size - m && y > zone.y0 + m && y < zone.y0 + zone.size - m;
  if (kind === "forward") {
    // the traced forward line and a second line ~350 m behind it, in ~260 m pieces, plus company strongpoints between
    const T1 = TRENCH_1 as [number, number][];
    for (const back of [0, 350]) {
      for (let i = 0; i + 1 < T1.length; i++) {
        const [ax, ay] = T1[i];
        const [bx, by] = T1[i + 1];
        const L = Math.hypot(bx - ax, by - ay);
        const n = Math.max(1, Math.round(L / 260));
        for (let k = 0; k < n; k++) {
          if (back && R() < 0.35) continue;
          const a: [number, number] = [ax + ((bx - ax) * (k + 0.04)) / n, ay + ((by - ay) * (k + 0.04)) / n - back];
          const b: [number, number] = [ax + ((bx - ax) * (k + 0.96)) / n, ay + ((by - ay) * (k + 0.96)) / n - back];
          if (!inZ(a[0], a[1], 40) || !inZ(b[0], b[1], 40)) continue;
          fireTrench(a, b, [0, 1], R, out);
        }
      }
    }
    for (let x = out.zone.x0 + 250; x < out.zone.x0 + out.zone.size - 250; x += 650 + R() * 200) {
      const y = lineY(T1, x) - 160 - R() * 60;
      const w = 70 + R() * 30;
      const h = 50 + R() * 20;
      const ring: [number, number][] = [];
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        ring.push([x + Math.cos(a) * w * (0.9 + 0.1 * Math.cos(a * 3)), y + Math.sin(a) * h]);
      }
      out.trenches.push(ring);
      out.trenches.push([[x, y + h], [x + 4, y + h + 50], [x - 3, y + 160]]);
      for (let k = 0; k < 3; k++) out.dugouts.push([x - 30 + k * 30, y - 8 + (k % 2) * 14, 0]);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        out.pits.push([x + Math.cos(a) * (w + 9), y + Math.sin(a) * (h + 9), 1.4]);
        out.trenches.push([[x + Math.cos(a) * w, y + Math.sin(a) * h], [x + Math.cos(a) * (w + 8), y + Math.sin(a) * (h + 8)]]);
      }
    }
    for (const r of WOODS) {
      const n = r.length / 2;
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < r.length; i += 2) {
        cx += r[i];
        cy += r[i + 1];
      }
      cx /= n;
      cy /= n;
      if (!inZ(cx, cy, 80)) continue;
      let sxx = 0, syy = 0, sxy = 0;
      for (let i = 0; i < r.length; i += 2) {
        const x = r[i] - cx;
        const y = r[i + 1] - cy;
        sxx += x * x;
        syy += y * y;
        sxy += x * y;
      }
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      let t0 = 1e9, t1 = -1e9, wmax = 0;
      for (let i = 0; i < r.length; i += 2) {
        const x = r[i] - cx;
        const y = r[i + 1] - cy;
        const t = x * ux + y * uy;
        t0 = Math.min(t0, t);
        t1 = Math.max(t1, t);
        wmax = Math.max(wmax, Math.abs(-x * uy + y * ux));
      }
      if (t1 - t0 < 150 || wmax > 60) continue;
      const fy = frontY(cx);
      // Russian positions sit behind (south of) their minefield belt; Ukrainian ones north of the front
      const russian = cy < lineY(MINE_BELT as [number, number][], cx) - 60;
      const ukrainian = cy > fy + 150;
      if (!russian && !ukrainian) continue;
      // the side facing the enemy: north for Russian positions, south for Ukrainian ones
      let nx = -uy;
      let ny = ux;
      if ((russian && ny < 0) || (ukrainian && ny > 0)) {
        nx = -nx;
        ny = -ny;
      }
      const off = wmax + 7;
      const a: [number, number] = [cx + ux * (t0 + 12) + nx * off, cy + uy * (t0 + 12) + ny * off];
      const b: [number, number] = [cx + ux * (t1 - 12) + nx * off, cy + uy * (t1 - 12) + ny * off];
      // long belts are split, so not every metre is dug
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const pieces = Math.max(1, Math.round(L / 320));
      for (let k = 0; k < pieces; k++) {
        if (pieces > 1 && R() < 0.2) continue;
        const k0 = k / pieces + 0.02;
        const k1 = (k + 1) / pieces - 0.02;
        fireTrench([a[0] + (b[0] - a[0]) * k0, a[1] + (b[1] - a[1]) * k0], [a[0] + (b[0] - a[0]) * k1, a[1] + (b[1] - a[1]) * k1], [nx, ny], R, out);
      }
    }
  } else {
    // main line: the anti-tank ditch (traced line), spoil on its rear side, and a fire trench ~250 m behind
    const ML = (MAIN_LINE as [number, number][]).filter(([x, y]) => inZ(x, y, -2000));
    const clip: [number, number][] = [];
    for (let i = 0; i + 1 < ML.length; i++) {
      const [ax, ay] = ML[i];
      const [bx, by] = ML[i + 1];
      const L = Math.hypot(bx - ax, by - ay);
      for (let s = 0; s < L; s += 6) {
        const x = ax + ((bx - ax) * s) / L;
        const y = ay + ((by - ay) * s) / L;
        if (inZ(x, y)) clip.push([x, y]);
      }
    }
    if (clip.length > 2) {
      out.ditches.push(clip);
      out.parapets.push(clip.map(([x, y]) => [x, y - 9] as [number, number]));
      for (let i = 0; i + 40 < clip.length; i += 40) {
        const a: [number, number] = [clip[i][0], clip[i][1] - 260];
        const b: [number, number] = [clip[i + 40][0], clip[i + 40][1] - 260];
        fireTrench(a, b, [0, 1], R, out);
      }
    }
  }
  return out;
};
