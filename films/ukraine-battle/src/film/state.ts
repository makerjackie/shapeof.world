// The world at film time t: camera path, which layers are on, and what moves on the field. One function, so the
// whole film is one continuous shot of one world.
import { FRONT_2026, FRONT_JUN23, FRONT_NOV23, LANE, MINE_BELT, PLACE } from "../geo";
import { clamp01, EIO, ESO, lerp, ramp } from "../kit";
import { Cam, mixCam } from "../world/camera";
import { Drone, Dot, Fx, Trail, Unit, WorldState } from "../world/engine";

const S = (a: number, b: number, t: number) => ramp(t, a, b, EIO);
const win = (t: number, a: number, b: number, fi = 0.5, fo = 0.5) => Math.min(clamp01((t - a) / fi), clamp01((b - t) / fo));

// ---------- camera keys ----------
type Key = [number, Cam];
const camAt = (t: number, keys: Key[], ease = ESO): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, c0] = keys[i - 1];
      const [t1, c1] = keys[i];
      return mixCam(c0, c1, ease(clamp01((t - t0) / (t1 - t0))));
    }
  }
  return keys[keys.length - 1][1];
};
// A long zoom where the target should only slide once we are high up (keeps the subject in frame).
const dive = (a: Cam, b: Cam, k: number): Cam => {
  const c = mixCam(a, b, k);
  const near = a.dist < b.dist ? a : b;
  const far = a.dist < b.dist ? b : a;
  // stay over the near subject until we are ~60 km up, then slide
  const lo = Math.log(Math.max(near.dist, 60000));
  const hi = Math.log(far.dist);
  const m = Math.pow(clamp01((Math.log(c.dist) - lo) / (hi - lo)), 1.3);
  return { ...c, x: lerp(near.x, far.x, m), y: lerp(near.y, far.y, m), h: lerp(near.h, far.h, m) };
};

const [mx, my] = PLACE.mala;
const [rx, ry] = PLACE.robotyne;
const LX = LANE.x;

const HOOK0: Cam = { x: LX - 4, y: 7700, h: 470, dist: 150, yaw: 0, pitch: 0, fov: 34 };
const HOOK1: Cam = { x: LX - 2, y: 7692, h: 470, dist: 125, yaw: 5, pitch: 0, fov: 34 };
const UKR_A: Cam = { x: -300000, y: 110000, h: 0, dist: 2150000, yaw: 0, pitch: 14, fov: 34 };
const UKR_B: Cam = { x: -280000, y: 100000, h: 0, dist: 2000000, yaw: 0, pitch: 16, fov: 34 };
const FIELD_A: Cam = { x: 0, y: 6500, h: 300, dist: 36000, yaw: 0, pitch: 38, fov: 34 };

// ---------- the 8 June column (event time τ seconds) ----------
type ColP = { y0: number; hit: number; sw: number; mine: number; speed?: number };
const KINDS: Unit["kind"][] = ["clear", "tank", "ifv", "ifv", "ifv", "ifv", "ifv"];
const column = (tau: number, P: ColP): { units: Unit[]; fx: Fx[] } => {
  const v = P.speed ?? 5;
  const units: Unit[] = [];
  const fx: Fx[] = [];
  let prevY = 1e9;
  KINDS.forEach((kind, i) => {
    let y = P.y0 + i * 24 - v * Math.max(0, tau);
    let x = LX;
    let yaw = 180;
    let dead = 0;
    if (i === 0) {
      const yHit = P.y0 - v * P.hit;
      if (tau > P.hit) {
        y = yHit;
        dead = clamp01((tau - P.hit) / 1.5) * 0.8;
      }
    } else if (i === 1) {
      // tries to back out and go round, and finds a mine
      const ySw = P.y0 + 24 - v * P.sw;
      if (tau > P.sw) {
        const k = clamp01((tau - P.sw) / (P.mine - P.sw));
        y = Math.max(ySw, prevY + 13);
        x = LX + Math.sin(k * 1.2) * 9;
        yaw = 180 - k * 38;
        if (tau > P.mine) {
          x = LX + Math.sin(1.2) * 9;
          yaw = 142;
          dead = clamp01((tau - P.mine) / 1.2) * 0.75;
        }
      }
      y = Math.max(y, prevY + 13);
    } else {
      y = Math.max(y, prevY + 13 + (i % 2) * 2);
      if (tau > P.hit + 2) x = LX + ((i % 3) - 1) * 1.6;
    }
    prevY = y;
    units.push({ kind, x, y, yaw, side: 0, dead });
  });
  if (tau > P.hit - 0.4) {
    const a = tau - P.hit;
    if (a > 0) {
      fx.push({ x: LX, y: units[0].y - 3, h: 2, age: a, kind: "flash", size: 34 });
      for (let k = 0; k < 5; k++) fx.push({ x: LX + Math.sin(k * 2.1) * 3, y: units[0].y + k * 1.5, h: 3 + a * (1.5 + k), age: a, kind: "smoke", size: 7 + a * 2.2 + k * 1.5, o: clamp01(1 - a / 40) });
    }
  }
  if (tau > P.mine) {
    const a = tau - P.mine;
    fx.push({ x: units[1].x, y: units[1].y, h: 1, age: a, kind: "mine", size: 26 });
    fx.push({ x: units[1].x, y: units[1].y, h: 2 + a * 2, age: a, kind: "dust", size: 18 + a * 8, o: clamp01(1 - a / 6) });
  }
  return { units, fx };
};

// shells falling round the stopped column
const shellsAround = (t: number, t0: number, n: number, cx: number, cy: number, spread: number): Fx[] => {
  const out: Fx[] = [];
  for (let i = 0; i < n; i++) {
    const ti = t0 + i * 0.55 + Math.sin(i * 7.3) * 0.2;
    const a = t - ti;
    if (a < 0 || a > 8) continue;
    const x = cx + Math.sin(i * 12.9) * spread;
    const y = cy + Math.cos(i * 7.7) * spread * 1.4;
    out.push({ x, y, h: 2, age: a, kind: "flash", size: 24 });
    out.push({ x, y, h: 3 + a * 3, age: a, kind: "dust", size: 10 + a * 4, o: clamp01(1 - a / 6) * 0.8 });
  }
  return out;
};

const droneSwarm = (t: number, n: number, o: number, cx: number, cy: number, sx: number, sy: number): Drone[] =>
  Array.from({ length: n }, (_, i) => ({
    x: cx + Math.sin(i * 3.7 + t * 0.12) * sx * (0.4 + 0.6 * ((i * 0.37) % 1)),
    y: cy + Math.cos(i * 2.3 + t * 0.09) * sy * (0.4 + 0.6 * ((i * 0.53) % 1)),
    h: 380 + ((i * 97) % 500),
    o,
    cone: 0,
    r: 4,
  }));

// interpolate between two fronts point-wise (both have their own point counts → resample by x)
const resample = (line: [number, number][], xs: number[]) =>
  xs.map((x) => {
    for (let i = 0; i + 1 < line.length; i++) {
      const [ax, ay] = line[i];
      const [bx, by] = line[i + 1];
      if ((x >= ax && x <= bx) || (x >= bx && x <= ax)) {
        const k = (x - ax) / (bx - ax || 1);
        return [x, ay + (by - ay) * k] as [number, number];
      }
    }
    return [x, line[line.length - 1][1]] as [number, number];
  });
const mixFront = (a: [number, number][], b: [number, number][], k: number) => {
  // the November line is not a function of x (the salient), so morph along an arc-length parameter
  const N = 46;
  const sample = (l: [number, number][]) => {
    const seg: number[] = [0];
    for (let i = 1; i < l.length; i++) seg.push(seg[i - 1] + Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]));
    const L = seg[seg.length - 1];
    return Array.from({ length: N }, (_, j) => {
      const s = (j / (N - 1)) * L;
      let i = 1;
      while (i < seg.length - 1 && seg[i] < s) i++;
      const u = (s - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
      return [lerp(l[i - 1][0], l[i][0], u), lerp(l[i - 1][1], l[i][1], u)] as [number, number];
    });
  };
  const A = sample(a);
  const B = sample(b);
  return A.map((p, j) => [lerp(p[0], B[j][0], k), lerp(p[1], B[j][1], k)] as [number, number]);
};
void resample;

const base = (cam: Cam, t: number): WorldState => ({
  cam,
  time: t,
  country: 0,
  exagC: 7,
  control: { p2014: 0, p2022_03: 0, p2022_06: 0, p2022_11: 0, p2026: 0 },
  borders: 1,
  rivers: 1,
  field: 1,
  exag: 3,
  sat: [1, 0, 0],
  thermal: 0,
  unitScale: 1,
});

export const stateAt = (t: number): WorldState => {
  // ---------------- 0 · hook: thermal, top-down, the column stopping ----------------
  if (t < 13.6) {
    const cam = camAt(t, [[0, HOOK0], [13.6, HOOK1]], EIO);
    const s = base(cam, t);
    const c = column(t + 0.4, { y0: 7712, hit: 2.4, sw: 3.0, mine: 4.0, speed: 5 });
    s.thermal = 1;
    s.exag = 1.5;
    s.units = c.units;
    s.fx = [...c.fx, ...shellsAround(t, 5.2, 9, LX, 7680, 30)].map((f) => (f.kind === "dust" || f.kind === "smoke" ? { ...f, o: (f.o ?? 1) * 0.55, size: (f.size ?? 10) * 0.7 } : f));
    s.craters = 0.08;
    s.mines = { o: 0, depth: 500 };
    s.grain = 0.06;
    return s;
  }
  // ---------------- 1 · pull out to all of Ukraine, the war in one map ----------------
  if (t < 56) {
    let cam: Cam;
    if (t < 19.5) cam = dive(HOOK1, UKR_A, S(13.6, 19.5, t));
    else if (t < 49.8) cam = camAt(t, [[19.5, UKR_A], [49.8, UKR_B]], EIO);
    else cam = dive(UKR_B, FIELD_A, ramp(t, 49.8, 56, ESO));
    const s = base(cam, t);
    s.thermal = 1 - S(13.6, 15.4, t);
    s.field = clamp01((160000 - cam.dist) / 90000);
    s.country = clamp01((cam.dist - 25000) / 60000);
    s.exag = 3;
    const c = column(13.6 + 0.4, { y0: 7712, hit: 2.4, sw: 3.0, mine: 4.0, speed: 5 });
    s.units = t < 16 ? c.units : [];
    s.fx = t < 16 ? shellsAround(13.6, 5.2, 9, LX, 7680, 30).map((f) => ({ ...f, age: f.age + (t - 13.6) })) : [];
    s.unitScale = 1;
    // control areas
    const p14 = win(t, 21.6, 25.6, 0.8, 0.9);
    const p03 = win(t, 25.5, 31.4, 1.2, 0.9);
    const p06 = win(t, 30.8, 34.2, 0.9, 1.2);
    const p11 = win(t, 33.6, 44.5, 1.6, 2.2);
    const p26 = S(40.5, 44.5, t);
    s.control = { p2014: p14, p2022_03: p03, p2022_06: p06, p2022_11: p11, p2026: p26 * (1 - S(49.8, 51.6, t)) };
    s.rivers = 1;
    s.front = FRONT_JUN23 as [number, number][];
    s.frontGlow = S(52, 56, t);
    return s;
  }
  // ---------------- 2 · the field and its defences ----------------
  if (t < 109) {
    const ROB: Cam = { x: rx - 600, y: ry - 2500, h: 380, dist: 5200, yaw: 195, pitch: 62, fov: 34 };
    const cam = camAt(t, [
      [56, FIELD_A],
      [60, { x: 0, y: 7000, h: 300, dist: 30000, yaw: 0, pitch: 36 }],
      [64.5, { x: 0, y: 7500, h: 300, dist: 26000, yaw: 8, pitch: 46 }],
      [69, { x: -500, y: 12500, h: 330, dist: 11000, yaw: 168, pitch: 72 }],
      [73, { x: 300, y: 9200, h: 340, dist: 4200, yaw: 176, pitch: 62 }],
      [76.5, { x: 600, y: 7600, h: 360, dist: 3600, yaw: 180, pitch: 58 }],
      [80, { x: 900, y: 7200, h: 360, dist: 2600, yaw: 196, pitch: 52 }],
      [86, { x: 1000, y: 7050, h: 360, dist: 1500, yaw: 205, pitch: 48 }],
      [90.6, ROB],
      [92.4, { x: -3600, y: -2900, h: 420, dist: 420, yaw: 200, pitch: 56 }],
      [96.8, { x: -3300, y: -2950, h: 420, dist: 330, yaw: 215, pitch: 54 }],
      [97.4, { x: -800, y: -2200, h: 420, dist: 6000, yaw: 200, pitch: 60 }],
      [101, { x: -2000, y: -3000, h: 300, dist: 27000, yaw: 180, pitch: 46 }],
      [105, { x: 0, y: 1000, h: 300, dist: 22000, yaw: 180, pitch: 50 }],
      [109, { x: -500, y: 2000, h: 300, dist: 24000, yaw: 165, pitch: 48 }],
    ]);
    const s = base(cam, t);
    s.exag = lerp(3, 7, S(64.6, 68, t)) - S(86, 92, t) * 3;
    s.front = FRONT_JUN23 as [number, number][];
    s.frontGlow = 1;
    s.sideTint = S(59.8, 62, t);
    s.trench = S(76.5, 78, t);
    s.mines = { o: S(80, 81, t) * (1 - 0.55 * S(91, 93, t)), depth: lerp(120, 500, S(81.5, 84.5, t)) };
    s.main = S(91, 93, t);
    s.teeth = S(91.6, 93, t);
    s.third = S(97, 99, t);
    s.drones = t > 101 ? droneSwarm(t, 25, S(101, 102, t), 0, 4000, 9000, 9000) : [];
    s.scan = 0;
    return s;
  }
  // ---------------- 3 · the assault ----------------
  if (t < 176) {
    const cam = camAt(t, [
      [109, { x: -500, y: 2000, h: 300, dist: 24000, yaw: 165, pitch: 48 }],
      [113.6, { x: 900, y: 9600, h: 300, dist: 5200, yaw: 190, pitch: 60 }],
      [117.6, { x: 1100, y: 8400, h: 320, dist: 3600, yaw: 200, pitch: 56 }],
      [122, { x: 1000, y: 7200, h: 340, dist: 900, yaw: 330, pitch: 58, oy: 430 }],
      [127, { x: 1000, y: 7330, h: 350, dist: 300, yaw: 300, pitch: 55, oy: 430 }],
      [130.5, { x: 1000, y: 7330, h: 350, dist: 250, yaw: 290, pitch: 52, oy: 430 }],
      [135, { x: 1000, y: 7345, h: 350, dist: 210, yaw: 280, pitch: 50, oy: 430 }],
      [139.4, { x: LX, y: 7350, h: 350, dist: 200, yaw: 272, pitch: 46, oy: 430 }],
      [139.6, { x: LX, y: 7370, h: 350, dist: 240, yaw: 0, pitch: 0 }],
      [145.9, { x: LX, y: 7375, h: 350, dist: 300, yaw: 6, pitch: 0 }],
      [146.1, { x: -200, y: 2900, h: 300, dist: 8500, yaw: 278, pitch: 64, oy: 470 }],
      [151.3, { x: -200, y: 2900, h: 300, dist: 9500, yaw: 272, pitch: 66, oy: 470 }],
      [151.5, { x: -2540, y: 14820, h: 330, dist: 420, yaw: 170, pitch: 56 }],
      [155.8, { x: -2540, y: 14820, h: 330, dist: 520, yaw: 160, pitch: 58 }],
      [156, { x: 1000, y: 7250, h: 340, dist: 1300, yaw: 300, pitch: 60, oy: 430 }],
      [160, { x: 1000, y: 7330, h: 340, dist: 650, yaw: 290, pitch: 56, oy: 430 }],
      [166.4, { x: 1000, y: 7360, h: 340, dist: 520, yaw: 250, pitch: 54, oy: 430 }],
      [176, { x: 1000, y: 7360, h: 340, dist: 700, yaw: 220, pitch: 58, oy: 430 }],
    ]);
    const s = base(cam, t);
    s.exag = 3;
    s.front = FRONT_JUN23 as [number, number][];
    s.frontGlow = 0.8;
    s.sideTint = 0.6;
    s.trench = 1;
    s.main = 1;
    s.teeth = 1;
    s.third = 1;
    s.night = 1 - S(119.8, 122.2, t);
    // column: gathers, then (from 127) enters the lane
    const tau = t - 127;
    const P = { y0: 7330, hit: 4.0, sw: 8.2, mine: 10.6, speed: 5 };
    const col = column(t < 127 ? 0 : tau, P);
    if (t < 127) col.units.forEach((u, i) => (u.y = 8300 + i * 26 - S(113.6, 127, t) * 820));
    s.units = col.units;
    s.fx = [...col.fx];
    s.unitScale = t < 117.6 ? 5 : t < 124 ? 2.5 : 1.7;
    // mines: the belt with a lane cut once the line charge has fired
    s.mines = { o: 1, depth: 500, lane: S(124.5, 125.5, t) * (1 - S(156.6, 158.6, t)) };
    // line charge (122–127): rocket out, rope lands, a chain of blasts
    const tr: Trail[] = [];
    if (t > 122.4 && t < 127.5) {
      const k = clamp01((t - 122.4) / 1.3);
      const yEnd = 7325 - 520 * k;
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        pts.push([LX, 7325 - (7325 - yEnd) * u, 3 + Math.sin(u * Math.PI) * 30 * (1 - S(123.7, 124.3, t))]);
      }
      tr.push({ pts, color: "#ffe2b0", o: 1 - S(126, 127.4, t), width: 2.2 });
      for (let i = 0; i < 12; i++) {
        const tb = 124.3 + i * 0.05;
        const a = t - tb;
        if (a > 0) s.fx.push({ x: LX, y: 7300 - i * 42, h: 2, age: a, kind: "flash", size: 30 }, { x: LX, y: 7300 - i * 42, h: 4 + a * 6, age: a, kind: "dust", size: 26 + a * 10, o: clamp01(1 - a / 5) });
      }
    }
    // ATGM from the tree belt (130.5–131)
    if (t > 130.2 && t < 131.6) {
      const k = clamp01((t - 130.2) / 0.8);
      const from: [number, number] = [LX - 640, 6520];
      const to: [number, number] = [LX, col.units[0].y];
      void from;
      tr.push({ pts: [[from[0], from[1], 4], [lerp(from[0], to[0], k), lerp(from[1], to[1], k), 3]], color: "#fff4d6", o: 1, width: 2.5 });
    }
    // drone + timer, then shells (139.6–146)
    if (t > 139.4 && t < 146) {
      s.thermal = 1;
      s.fx.push(...shellsAround(t, 143.2, 14, LX, 7380, 30));
      s.craters = S(143.2, 146, t) * 0.2;
    } else if (t >= 146) s.fx.push(...shellsAround(t, 143.2, 14, LX, 7380, 30).filter((f) => f.kind !== "flash"));
    // helicopter far south (146–151)
    if (t > 146.1 && t < 151.5) {
      s.heli = { x: -1400, y: -1600, h: 45, yaw: 20, o: 1, rotor: t * 30 };
      const k = clamp01((t - 147.6) / 2.4);
      if (k > 0) tr.push({ pts: [[-1400, -1600, 40], [lerp(-1400, LX, k), lerp(-1600, 7350, k), 40 - 30 * k]], color: "#ffd59a", o: 1, width: 2.4 });
      s.unitScale = 3;
    }
    // loitering munition onto the guns behind Orikhiv (151.5–156)
    if (t > 151.5 && t < 156) {
      const guns: Unit[] = [0, 1, 2].map((i) => ({ kind: "gun", x: -2600 + i * 70, y: 14800 + i * 30, yaw: 170, side: 0, dead: i === 1 ? S(153.6, 154.4, t) * 0.8 : 0 }));
      s.units = [...guns];
      s.unitScale = 3;
      const k = clamp01((t - 152.4) / 1.3);
      if (k < 1) tr.push({ pts: [[-2600 + 70, 14830 - 600, 120], [-2600 + 70, lerp(14830 - 600, 14830, k), lerp(120, 2, k)]], color: "#ffd59a", o: 0.9, width: 2 });
      if (t > 153.7) s.fx.push({ x: -2530, y: 14830, h: 2, age: t - 153.7, kind: "flash", size: 40 }, { x: -2530, y: 14830, h: 5 + (t - 153.7) * 5, age: t - 153.7, kind: "smoke", size: 26 + (t - 153.7) * 8, o: 0.8 });
    }
    // night again: remote mining of the lane (156–160)
    if (t > 156 && t < 160) {
      s.night = S(156, 156.8, t) * (1 - S(159.2, 160, t)) * 0.85;
      for (let i = 0; i < 26; i++) {
        const tb = 157 + (i % 9) * 0.12;
        const a = t - tb;
        if (a > 0) s.fx.push({ x: LX + Math.sin(i * 5.1) * 26, y: 7300 - i * 22 + Math.cos(i) * 10, h: Math.max(0.5, 60 - a * 90), age: 0, kind: "glow", size: 3.2, o: 0.9 });
      }
    }
    // stopped column stays for the summary and the quotes
    if (t > 156) {
      const cc = column(30, P);
      s.units = cc.units;
      s.unitScale = 1.8;
      s.craters = S(158, 162, t) * 0.25;
      s.fx.push(...cc.fx.filter((f) => f.kind === "smoke").map((f) => ({ ...f, o: 0.5 })));
    }
    // a few drones over the lane for "seen"
    if (t > 160 && t < 166.4) s.drones = droneSwarm(t, 6, S(160, 161, t), LX, 7400, 500, 500).map((d) => ({ ...d, h: 220 + (d.h % 200), r: 2 }));
    s.trails = tr;
    return s;
  }
  // ---------------- 4 · on foot; the line creeps; "we see everything" ----------------
  if (t < 231.6) {
    const cam = camAt(t, [
      [176, { x: 1000, y: 7400, h: 340, dist: 1800, yaw: 150, pitch: 60 }],
      [179.6, { x: -900, y: 6950, h: 340, dist: 200, yaw: 0, pitch: 0 }],
      [187.2, { x: -900, y: 6905, h: 340, dist: 150, yaw: 8, pitch: 0 }],
      [190.8, { x: -1200, y: 5000, h: 300, dist: 16000, yaw: 180, pitch: 50 }],
      [198.6, { x: -2000, y: 3200, h: 300, dist: 14000, yaw: 190, pitch: 54 }],
      [202.4, { x: -5000, y: -6000, h: 300, dist: 34000, yaw: 200, pitch: 44 }],
      [212, { x: -3000, y: 2000, h: 330, dist: 9000, yaw: 180, pitch: 64 }],
      [225.6, { x: 0, y: 4000, h: 300, dist: 26000, yaw: 180, pitch: 50 }],
      [231.6, { x: 0, y: 4500, h: 300, dist: 30000, yaw: 180, pitch: 46 }],
    ]);
    const s = base(cam, t);
    s.exag = 3;
    // the line creeps south: June → late August (Robotyne) → November
    const k = S(190.8, 198.6, t);
    s.front = mixFront(FRONT_JUN23 as [number, number][], FRONT_NOV23 as [number, number][], k);
    s.frontGlow = 1;
    s.sideTint = 0.7;
    s.trench = 1 - k * 0.6;
    s.main = 1;
    s.teeth = 1;
    s.third = 1;
    s.mines = { o: (1 - k * 0.7) * (t < 180 ? 1 - 0.7 * S(176, 177.2, t) : t < 190.8 ? 0.3 : 1), depth: 500 };
    s.sat = [1 - S(190.8, 198.6, t), S(190.8, 198.6, t), 0];
    s.craters = 0.12;
    // dismounted group in thermal (179.6–190.8)
    if (t > 179.6 && t < 190.8) {
      s.thermal = S(179.6, 180.2, t) * (1 - S(190.2, 190.8, t));
      s.night = t > 183.6 ? 0.6 : 0;
      const dots: Dot[] = [];
      for (let i = 0; i < 11; i++) {
        const prog = (t - 179.6) * (t > 183.6 ? 0.6 : 1.6);
        const crawl = t > 183.6 && i < 3;
        dots.push({ x: -900 + ((i * 37) % 23) - 11 + (crawl ? (i - 1) * 8 : 0), y: 7000 - (crawl ? 60 + prog * 0.8 : i * 7 + prog) , o: 1, side: 0, r: crawl ? 2.6 : 3.0 });
      }
      s.dots = dots;
      if (t > 183.6) {
        // mines found one by one ahead of the crawlers
        const n = Math.floor((t - 183.6) * 2.2);
        for (let j = 0; j < n; j++) s.fx = [...(s.fx ?? []), { x: -900 + ((j * 13) % 21) - 10, y: 6900 - 70 - j * 5, h: 0.6, age: 0, kind: "glow", size: 3.0, o: 0.8 }];
      }
    }
    // everything is seen (219–231): scan layer + many drones
    s.scan = S(220.2, 222, t);
    s.drones = t > 219 ? droneSwarm(t, 30, S(219, 220.5, t), 0, 4000, 10000, 9000) : [];
    s.fade = 0;
    return s;
  }
  // ---------------- 5 · 2024–2026: the other way; the kill zone ----------------
  if (t < 303) {
    const cam = camAt(t, [
      [231.6, { x: 0, y: 4500, h: 300, dist: 30000, yaw: 180, pitch: 46 }],
      [238, { x: 1500, y: 8300, h: 300, dist: 2600, yaw: 10, pitch: 56 }],
      [246.4, { x: 1500, y: 8900, h: 320, dist: 1900, yaw: 25, pitch: 54 }],
      [249, { x: 0, y: 6000, h: 300, dist: 26000, yaw: 0, pitch: 44 }],
      [258.4, { x: 0, y: 2000, h: 300, dist: 70000, yaw: 0, pitch: 34 }],
      [263.4, { x: 2000, y: 10000, h: 320, dist: 2400, yaw: 0, pitch: 58 }],
      [263.6, { x: 2402, y: 10190, h: 320, dist: 170, yaw: 0, pitch: 0 }],
      [276.6, { x: 2402, y: 10205, h: 320, dist: 140, yaw: -8, pitch: 0 }],
      [276.8, { x: 3202, y: 12098, h: 320, dist: 160, yaw: 0, pitch: 0 }],
      [289.6, { x: 3202, y: 12098, h: 320, dist: 120, yaw: 6, pitch: 0 }],
      [295.6, { x: 2800, y: 11000, h: 320, dist: 4200, yaw: 0, pitch: 60 }],
      [303, { x: 2800, y: 11500, h: 320, dist: 6500, yaw: 0, pitch: 62 }],
    ]);
    const s = base(cam, t);
    s.exag = 3;
    const back = S(231.8, 236, t);
    s.front = mixFront(FRONT_NOV23 as [number, number][], FRONT_2026 as [number, number][], back);
    s.frontGlow = 1;
    s.sideTint = 0.7;
    s.trench = 0.4;
    s.main = 1;
    s.teeth = 1;
    s.third = 1;
    s.mines = { o: 0.3, depth: 500 };
    s.sat = [1, 0, 0];
    s.craters = 0.3;
    // Russian armour coming north and stopping at the belts (238–246)
    if (t > 236 && t < 246.6) {
      const tau = t - 236;
      s.units = Array.from({ length: 6 }, (_, i) => {
        const stop = 9300 - (i % 3) * 60;
        const y = Math.min(stop, 7600 + tau * 120 - i * 40);
        return { kind: i % 2 ? "ifv" : "tank", x: 1500 + ((i * 53) % 90) - 45, y, yaw: 0, side: 1, dead: y >= stop ? clamp01((tau - (stop - 7600 + i * 40) / 120) / 1.5) * 0.8 : 0 } as Unit;
      });
      s.unitScale = 4;
      s.fx = s.units.filter((u) => (u.dead ?? 0) > 0).map((u) => ({ x: u.x, y: u.y, h: 4, age: 1, kind: "smoke", size: 40, o: 0.7 }) as Fx);
      // small groups / motorbikes after the armour
      if (t > 240.8) s.units.push(...[0, 1, 2].map((i) => ({ kind: "moto" as const, x: 600 + i * 400, y: 8200 + (t - 240.8) * 60 - i * 30, yaw: 0, side: 1 as const })));
    }
    // kill-zone band grows (246.6–258.4)
    const kz = t < 249.2 ? 0 : t < 251.4 ? 1500 : t < 253.6 ? lerp(1500, 5500, S(251.4, 252.4, t)) : lerp(5500, 22000, S(253.6, 255.4, t));
    s.kill = { w: kz, o: S(249, 249.6, t) * (1 - S(258.4, 259.4, t)) };
    // the two sides, close up (263.6–289.6)
    if (t > 263.4 && t < 289.6) {
      s.thermal = 1;
      s.dots = [];
      if (t < 276.8) {
        // a Russian two-man group creeping north, a drone overhead
        const p = (t - 263.6) * 1.2;
        s.dots = [{ x: 2400, y: 10180 + p * 0.5, o: 1, side: 1, r: 2.6 }, { x: 2407, y: 10170 + p * 0.5, o: 1, side: 1, r: 2.6 }];
        s.drones = [{ x: 2420 + Math.sin(t) * 8, y: 10215 + p * 0.5, h: 45, o: 1, cone: 0, r: 0.5 }];
      } else {
        // a Ukrainian position in the ground at the crossroads; supply drop
        s.dots = [{ x: 3200, y: 12100, o: 0.8, side: 0, r: 2.4 }, { x: 3206, y: 12095, o: 0.8, side: 0, r: 2.4 }];
        if (t > 281.2 && t < 285) s.drones = [{ x: 3200 + (t - 281.2) * 22 - 40, y: 12125, h: 30, o: 1, cone: 0, r: 0.5 }];
      }
    }
    return s;
  }
  // ---------------- 6 · the whole line again ----------------
  if (t < 334) {
    const FAR: Cam = { x: 120000, y: 60000, h: 0, dist: 1150000, yaw: 0, pitch: 22, fov: 34 };
    let cam: Cam;
    if (t < 309) cam = dive({ x: 2800, y: 11500, h: 320, dist: 6500, yaw: 0, pitch: 62 }, FAR, S(303, 309, t));
    else cam = camAt(t, [[309, FAR], [334, { ...FAR, x: 100000, y: 50000, dist: 1050000 }]], EIO);
    const s = base(cam, t);
    s.field = clamp01((160000 - cam.dist) / 90000);
    s.country = clamp01((cam.dist - 25000) / 60000);
    s.sat = [0, 1, 0];
    s.front = FRONT_2026 as [number, number][];
    s.frontGlow = 1;
    s.control = { p2014: 0, p2022_03: 0, p2022_06: 0, p2022_11: 0, p2026: S(304, 309, t) };
    s.fade = S(333.4, 334, t);
    return s;
  }
  // ---------------- 7 · ending: back to the field, thermal fades to the 2021 farmland ----------------
  {
    const END0: Cam = { x: 600, y: 7400, h: 340, dist: 9000, yaw: 0, pitch: 0, fov: 34 };
    const END1: Cam = { x: 600, y: 7400, h: 340, dist: 15000, yaw: 4, pitch: 0, fov: 34 };
    const cam = camAt(t, [[334, END0], [352, END1]], EIO);
    const s = base(cam, t);
    s.field = clamp01((160000 - cam.dist) / 90000);
    s.country = clamp01((cam.dist - 25000) / 60000);
    s.thermal = 1 - S(344.2, 347.6, t);
    s.sat = [0, 1 - S(344.2, 347.6, t), S(344.2, 347.6, t)];
    s.front = FRONT_2026 as [number, number][];
    s.frontGlow = 1 - S(344.2, 347, t);
    s.craters = 0.12 * (1 - S(344.2, 347.6, t));
    s.fade = Math.max(S(350.6, 351.4, t), 1 - S(334.8, 335.8, t));
    void MINE_BELT;
    void mx;
    void my;
    return s;
  }
};
