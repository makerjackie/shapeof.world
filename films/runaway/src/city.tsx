// The city and the world around it. One procedural city (streets, river, couriers and trucks moving along them),
// a stop-wave spreading from 飞鸟物流's depot, and, when the camera pulls back, a field of other cities and the links
// between them. Everything is projected by hand (screen = (world − cam) × k + centre) so strokes keep screen size.
import React from "react";
import { clamp01, EO, ramp } from "./kit";
import { K } from "./theme";
import { rng } from "./ui";

type P = [number, number];
type Line = P[];

const bez = (p0: P, p1: P, p2: P, p3: P, n = 40): Line =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]] as P;
  });

const R = rng(20261031);
const RIVER = bez([-200, 830], [500, 560], [1100, 1000], [2150, 420], 60);
const AVENUES: Line[] = [
  bez([-100, 300], [600, 250], [1300, 420], [2050, 330]),
  bez([-100, 700], [700, 620], [1200, 760], [2050, 690]),
  bez([380, -100], [460, 400], [300, 700], [430, 1200]),
  bez([980, -100], [900, 380], [1080, 760], [960, 1200]),
  bez([1540, -100], [1500, 400], [1660, 800], [1580, 1200]),
  bez([-100, 80], [700, 380], [1400, 120], [2050, 980]),
];
type District = { c: P; r: number; a: number; s: number };
const DISTRICTS: District[] = [
  { c: [960, 520], r: 380, a: 0.08, s: 34 },
  { c: [430, 330], r: 300, a: -0.35, s: 40 },
  { c: [1480, 330], r: 320, a: 0.42, s: 38 },
  { c: [1500, 820], r: 300, a: -0.1, s: 42 },
  { c: [430, 860], r: 260, a: 0.25, s: 44 },
  { c: [960, 980], r: 230, a: 0.6, s: 40 },
  { c: [180, 560], r: 220, a: 0.1, s: 46 },
  { c: [1780, 560], r: 220, a: -0.3, s: 46 },
];
const STREETS: Line[] = [];
for (const d of DISTRICTS) {
  for (const rot of [d.a, d.a + Math.PI / 2]) {
    const dir: P = [Math.cos(rot), Math.sin(rot)];
    const nor: P = [-dir[1], dir[0]];
    for (let o = -d.r + d.s / 2; o < d.r; o += d.s) {
      const h = Math.sqrt(d.r * d.r - o * o) * (0.75 + 0.25 * R());
      const cx = d.c[0] + nor[0] * o, cy = d.c[1] + nor[1] * o;
      STREETS.push([[cx - dir[0] * h, cy - dir[1] * h], [cx + dir[0] * h, cy + dir[1] * h]]);
    }
  }
}
const len = (l: Line) => {
  let s = 0;
  for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
  return s;
};
const at = (l: Line, u: number): P => {
  const L = len(l) * u;
  let s = 0;
  for (let i = 1; i < l.length; i++) {
    const d = Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
    if (s + d >= L) {
      const k = d === 0 ? 0 : (L - s) / d;
      return [l[i - 1][0] + (l[i][0] - l[i - 1][0]) * k, l[i - 1][1] + (l[i][1] - l[i - 1][1]) * k];
    }
    s += d;
  }
  return l[l.length - 1];
};

export const DEPOT: P = [1250, 600];
type Mover = { path: Line; L: number; u0: number; v: number; truck: boolean; stopDelay: number };
const MOVERS: Mover[] = [];
for (let i = 0; i < 520; i++) {
  const truck = i < 70;
  const path = truck ? AVENUES[Math.floor(R() * AVENUES.length)] : STREETS[Math.floor(R() * STREETS.length)];
  const L = len(path);
  MOVERS.push({ path, L, u0: R(), v: (truck ? 70 : 45) + R() * 50, truck, stopDelay: R() * 0.8 });
}
// position of a mover at time t (ping-pong along its path)
const moverPos = (m: Mover, t: number): P => {
  const s = (m.u0 * 2 * m.L + m.v * t) % (2 * m.L);
  const u = s < m.L ? s / m.L : 2 - s / m.L;
  return at(m.path, u);
};

export type Cam = { cx: number; cy: number; k: number };
const proj = (p: P, c: Cam): P => [(p[0] - c.cx) * c.k + 960, (p[1] - c.cy) * c.k + 540];
const dpath = (l: Line, c: Cam) => l.map((p, i) => { const q = proj(p, c); return `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join(" ");

// stop: film time the wave leaves the depot (null: never); speed in world px/s.
export const City: React.FC<{ t: number; cam: Cam; stop?: number | null; speed?: number; o?: number; detail?: number; depotLabel?: number }> = ({ t, cam, stop = null, speed = 520, o = 1, detail = 1, depotLabel = 0 }) => {
  if (o <= 0) return null;
  const k = cam.k;
  const sd = clamp01(detail) * clamp01((k - 0.12) / 0.3);
  const dotR = Math.max(1.3, 3.4 * Math.min(1, Math.sqrt(k)));
  const dp = proj(DEPOT, cam);
  const waveR = stop === null ? -1 : (t - stop) * speed;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
      <defs>
        <radialGradient id="cityglow">
          <stop offset="0%" stopColor="#3a5a8a" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#3a5a8a" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="redglow">
          <stop offset="0%" stopColor={K.red} stopOpacity={0.55} />
          <stop offset="100%" stopColor={K.red} stopOpacity={0} />
        </radialGradient>
      </defs>
      {sd > 0 ? (
        <g opacity={sd}>
          {DISTRICTS.map((d, i) => { const q = proj(d.c, cam); return <circle key={i} cx={q[0]} cy={q[1]} r={d.r * k * 1.25} fill="url(#cityglow)" opacity={0.55} />; })}
          <path d={dpath(RIVER, cam)} stroke="#0d2038" strokeWidth={70 * k} fill="none" />
          <path d={dpath(RIVER, cam)} stroke="#1c3b60" strokeWidth={2} fill="none" opacity={0.6} />
          {STREETS.map((l, i) => <path key={i} d={dpath(l, cam)} stroke={K.road} strokeWidth={1.6} fill="none" />)}
          {AVENUES.map((l, i) => <path key={i} d={dpath(l, cam)} stroke="#2a3a58" strokeWidth={4.5 * Math.max(0.5, k)} fill="none" />)}
        </g>
      ) : null}
      {waveR > 0 && waveR < 2600 && sd > 0 ? <circle cx={dp[0]} cy={dp[1]} r={waveR * k} fill="none" stroke={K.red} strokeWidth={3} opacity={0.5 * (1 - waveR / 2600)} /> : null}
      {waveR > 0 ? <circle cx={dp[0]} cy={dp[1]} r={Math.min(waveR, 1400) * k} fill="url(#redglow)" opacity={0.35} /> : null}
      {MOVERS.map((m, i) => {
        const p0 = moverPos(m, 0);
        const dist = Math.hypot(p0[0] - DEPOT[0], p0[1] - DEPOT[1]);
        const ts = stop === null ? Infinity : stop + dist / speed + m.stopDelay;
        const stopped = t >= ts;
        const p = moverPos(m, Math.min(t, ts));
        const q = proj(p, cam);
        if (q[0] < -20 || q[0] > 1940 || q[1] < -20 || q[1] > 1100) return null;
        const red = stopped ? ramp(t, ts, ts + 0.5, EO) : 0;
        const col = red > 0.5 ? K.red : m.truck ? "#ffe2a8" : "#d6ecff";
        const back = moverPos(m, Math.min(t, ts) - 0.35);
        const qb = proj(back, cam);
        return (
          <g key={i}>
            {!stopped ? <line x1={qb[0]} y1={qb[1]} x2={q[0]} y2={q[1]} stroke={col} strokeWidth={dotR * 0.9} strokeOpacity={0.35} strokeLinecap="round" /> : null}
            {red > 0 ? <circle cx={q[0]} cy={q[1]} r={dotR * (2.6 + 1.5 * (1 - red))} fill={K.red} opacity={0.22} /> : null}
            {m.truck ? <rect x={q[0] - dotR * 1.4} y={q[1] - dotR * 0.9} width={dotR * 2.8} height={dotR * 1.8} rx={dotR * 0.5} fill={col} /> : <circle cx={q[0]} cy={q[1]} r={dotR} fill={col} />}
          </g>
        );
      })}
      {depotLabel > 0 && sd > 0 ? (
        <g opacity={depotLabel}>
          <circle cx={dp[0]} cy={dp[1]} r={14} fill="none" stroke={K.red} strokeWidth={3} />
          <circle cx={dp[0]} cy={dp[1]} r={5} fill={K.red} />
          <text x={dp[0] + 24} y={dp[1] + 9} fill={K.redHi} fontSize={28} fontWeight={800} fontFamily="sans-serif">飞鸟物流 · 调度中心</text>
        </g>
      ) : null}
    </svg>
  );
};

// ---------- The world: other cities, sentences, links ----------
type Cluster = { c: P; r: number; dots: P[]; b: number };
const W = rng(4242);
export const CLUSTERS: Cluster[] = [];
{
  // a loose, borderless field: denser bands, with our city at the origin's neighbourhood
  const hubs: P[] = Array.from({ length: 9 }, () => [(W() - 0.5) * 62000 + 960, (W() - 0.5) * 32000 + 540]);
  for (let i = 0; i < 230; i++) {
    const h = hubs[i % hubs.length];
    const ang = W() * Math.PI * 2;
    const rr = Math.sqrt(W()) * 15000;
    let c: P = [h[0] + Math.cos(ang) * rr, h[1] + Math.sin(ang) * rr * 0.8];
    if (Math.hypot(c[0] - 960, c[1] - 540) < 3500) c = [c[0] + 5000, c[1]];
    if (Math.abs(c[0] - 960) > 34500 || Math.abs(c[1] - 540) > 19500) { i--; continue; }
    const r = 500 + W() * 1500;
    const n = 8 + Math.floor(W() * 22);
    const dots: P[] = Array.from({ length: n }, () => { const a = W() * Math.PI * 2; const d = Math.sqrt(W()) * r; return [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; });
    CLUSTERS.push({ c, r, dots, b: 0.4 + W() * 0.6 });
  }
}
// links between near neighbours, each with a start time offset (0..1) by distance from our city
type Link = { a: number; b: number; s: number; bend: number };
export const LINKS: Link[] = [];
{
  const seen = new Set<string>();
  CLUSTERS.forEach((ca, i) => {
    const near = CLUSTERS.map((cb, j) => ({ j, d: Math.hypot(cb.c[0] - ca.c[0], cb.c[1] - ca.c[1]) })).filter((x) => x.j !== i).sort((x, y) => x.d - y.d).slice(0, 3);
    for (const { j, d } of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key) || d > 9000) continue;
      seen.add(key);
      const mid = Math.hypot((ca.c[0] + CLUSTERS[j].c[0]) / 2 - 960, (ca.c[1] + CLUSTERS[j].c[1]) / 2 - 540);
      LINKS.push({ a: i, b: j, s: clamp01(mid / 36000) * 0.75 + W() * 0.25, bend: (W() - 0.5) * 0.5 });
    }
  });
}

// red: 0..1 how far the red links have spread; white: 0..1 how far the plain links have drawn.
export const World: React.FC<{ t: number; cam: Cam; o?: number; white?: number; red?: number }> = ({ t, cam, o = 1, white = 0, red = 0 }) => {
  if (o <= 0) return null;
  const pulse = (t * 0.6) % 1;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
      <defs>
        <radialGradient id="cg">
          <stop offset="0%" stopColor="#bcd6ff" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#bcd6ff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cgr">
          <stop offset="0%" stopColor={K.red} stopOpacity={0.7} />
          <stop offset="100%" stopColor={K.red} stopOpacity={0} />
        </radialGradient>
      </defs>
      {LINKS.map((l, i) => {
        const wk = clamp01((white - l.s * 0.9) / 0.1);
        if (wk <= 0) return null;
        const rk = clamp01((red - l.s * 0.9) / 0.1);
        const A = proj(CLUSTERS[l.a].c, cam), B = proj(CLUSTERS[l.b].c, cam);
        const mx = (A[0] + B[0]) / 2 - (B[1] - A[1]) * l.bend, my = (A[1] + B[1]) / 2 + (B[0] - A[0]) * l.bend;
        const d = `M${A[0].toFixed(1)} ${A[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${B[0].toFixed(1)} ${B[1].toFixed(1)}`;
        const u = (pulse + i * 0.137) % 1;
        const px = (1 - u) ** 2 * A[0] + 2 * (1 - u) * u * mx + u * u * B[0];
        const py = (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * my + u * u * B[1];
        const col = rk > 0.5 ? K.red : "#9fc4ff";
        return (
          <g key={i}>
            <path d={d} stroke={col} strokeWidth={1.4 + rk * 1.2} fill="none" opacity={(0.25 + 0.45 * rk) * wk} />
            <circle cx={px} cy={py} r={2 + rk * 1.5} fill={rk > 0.5 ? K.redHi : "#d9e8ff"} opacity={wk * (0.5 + 0.5 * rk)} />
          </g>
        );
      })}
      {CLUSTERS.map((c, i) => {
        const q = proj(c.c, cam);
        const rr = Math.max(10, c.r * cam.k * 1.6);
        if (q[0] < -rr || q[0] > 1920 + rr || q[1] < -rr || q[1] > 1080 + rr) return null;
        const rk = clamp01((red - clamp01(Math.hypot(c.c[0] - 960, c.c[1] - 540) / 36000) * 0.9) / 0.15);
        return (
          <g key={i}>
            <circle cx={q[0]} cy={q[1]} r={rr * 0.75} fill={rk > 0.4 ? "url(#cgr)" : "url(#cg)"} opacity={c.b * 0.42} />
            {c.dots.map((p, j) => { const s = proj(p, cam); return <circle key={j} cx={s[0]} cy={s[1]} r={1.7} fill={rk > 0.4 ? K.redHi : "#f2f6ff"} opacity={0.95} />; })}
          </g>
        );
      })}
    </svg>
  );
};

export const camLerp = (a: Cam, b: Cam, u: number): Cam => {
  // zoom in log space so the pull feels even
  const k = Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * u);
  return { cx: a.cx + (b.cx - a.cx) * u, cy: a.cy + (b.cy - a.cy) * u, k };
};
