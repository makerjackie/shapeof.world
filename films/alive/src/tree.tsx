import React from "react";
import { random } from "remotion";
import { Icon, IconName } from "./icons";
import { FONT, K } from "./theme";

// The life as a drawing: a warm trunk (living) running from birth to 79 along a gentle wave, branches (school,
// work, money, a home, promotion) growing out of it as tapered, slightly wavering strokes with twigs, leaves and an
// icon at the tip. A branch can break; the trunk carries on.
export type TreeGeo = { x0: number; w: number; y: number; amp?: number; scale?: number };
export type TBranch = {
  a0: number; // age it leaves the trunk
  a1: number; // age of the tip
  dy: number; // how far up (−) or down (+) it reaches, px
  color: string;
  icon?: IconName;
  label?: string;
  grow: number; // 0–1
  o?: number;
  cut?: number; // 0–1 along the branch where it breaks
  fall?: number; // 0–1 the broken piece falling away
  w?: number;
  seed?: string;
};

export const LIFE_YEARS = 79;
export const ageX = (g: TreeGeo, age: number) => g.x0 + (age / LIFE_YEARS) * g.w;
export const trunkY = (g: TreeGeo, x: number) => g.y + (g.amp ?? 10) * Math.sin((x - g.x0) / 240);

const smooth = (t: number) => t * t * (3 - 2 * t);

export const branchPts = (g: TreeGeo, b: TBranch, n = 56) => {
  const s = b.seed ?? `${b.a0}-${b.a1}`;
  const ph = random(`ph${s}`) * 6;
  const pts: [number, number][] = [];
  const y0 = trunkY(g, ageX(g, b.a0));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = ageX(g, b.a0 + (b.a1 - b.a0) * u);
    const rise = smooth(Math.min(1, u / 0.34));
    pts.push([x, y0 + b.dy * rise + 7 * Math.sin(u * Math.PI * 2.6 + ph) * rise]);
  }
  return pts;
};

export const tipOf = (g: TreeGeo, b: TBranch) => {
  const p = branchPts(g, b);
  return p[p.length - 1];
};

// A tapered ribbon through pts[from..to], width w0 at u = 0 falling to 40 % at u = 1.
const ribbon = (pts: [number, number][], from: number, to: number, w0: number) => {
  const n = pts.length - 1;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = from; i <= to; i++) {
    const a = pts[Math.max(0, i - 1)];
    const c = pts[Math.min(n, i + 1)];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const hw = (w0 * (1 - 0.6 * (i / n))) / 2;
    const nx = (-dy / len) * hw;
    const ny = (dx / len) * hw;
    left.push(`${(pts[i][0] + nx).toFixed(1)} ${(pts[i][1] + ny).toFixed(1)}`);
    right.push(`${(pts[i][0] - nx).toFixed(1)} ${(pts[i][1] - ny).toFixed(1)}`);
  }
  return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
};

const Twigs: React.FC<{ pts: [number, number][]; b: TBranch; from?: number; upTo: number }> = ({ pts, b, from = 0, upTo }) => {
  const n = pts.length - 1;
  const s = b.seed ?? `${b.a0}-${b.a1}`;
  const side = b.dy < 0 ? -1 : 1;
  return (
    <>
      {[0.48, 0.66, 0.84].map((u, k) => {
        const i = Math.round(u * n);
        if (i > upTo || i < from) return null;
        const [x, y] = pts[i];
        const len = 34 + random(`tl${s}${k}`) * 26;
        const ex = x + len * 0.8;
        const ey = y + side * (k % 2 ? -1 : 1) * len * 0.55;
        const leaf = Math.min(1, (upTo - i) / 6);
        return (
          <g key={k}>
            <path d={`M ${x} ${y} Q ${x + len * 0.35} ${y}, ${ex} ${ey}`} stroke={b.color} strokeWidth={2} fill="none" strokeLinecap="round" />
            <ellipse cx={ex} cy={ey} rx={9 * leaf} ry={4.5 * leaf} transform={`rotate(${side * (k % 2 ? 30 : -30)} ${ex} ${ey})`} fill={b.color} fillOpacity={0.7} />
          </g>
        );
      })}
    </>
  );
};

export const Branch: React.FC<{ g: TreeGeo; b: TBranch }> = ({ g, b }) => {
  if (b.grow <= 0.001) return null;
  const pts = branchPts(g, b);
  const n = pts.length - 1;
  const upTo = Math.max(1, Math.round(Math.min(1, b.grow) * n));
  const w0 = (b.w ?? 7) * (g.scale ?? 1);
  const cutI = b.cut === undefined ? n + 1 : Math.round(b.cut * n);
  const fall = b.fall ?? 0;
  const near = Math.min(upTo, cutI);
  const piv = pts[Math.min(n, cutI)];
  return (
    <g opacity={b.o ?? 1}>
      <path d={ribbon(pts, 0, near, w0)} fill={b.color} />
      <Twigs pts={pts} b={b} upTo={Math.min(upTo, cutI - 2)} />
      {cutI <= n && upTo > cutI + 1 && fall < 1 ? (
        <g transform={`translate(${fall * 40} ${fall * fall * 260}) rotate(${(b.dy < 0 ? -1 : 1) * fall * 14} ${piv[0]} ${piv[1]})`} opacity={1 - fall}>
          <path d={ribbon(pts, cutI + 1, upTo, w0)} fill={b.color} />
          <Twigs pts={pts} b={b} from={cutI + 2} upTo={upTo} />
        </g>
      ) : null}
    </g>
  );
};

// The trunk: three strokes for a soft glow and a warm core, optional light running along it (`run` 0–1) and gold
// threads wound around it (relationships, `threads` 0–1).
export const Trunk: React.FC<{ g: TreeGeo; draw?: number; glow?: number; w?: number; run?: number; threads?: number; o?: number }> = ({ g, draw = 1, glow = 0.6, w = 7, run, threads = 0, o = 1 }) => {
  if (draw <= 0.001) return null;
  const x1 = g.x0 + g.w * Math.min(1, draw);
  const pts: string[] = [];
  for (let x = g.x0 - 60; x <= x1; x += 16) pts.push(`${x.toFixed(1)} ${trunkY(g, x).toFixed(1)}`);
  pts.push(`${x1} ${trunkY(g, x1)}`);
  const d = `M ${pts.join(" L ")}`;
  const thread = (k: number) => {
    const p: string[] = [];
    const xe = g.x0 - 60 + (x1 - g.x0 + 60) * threads;
    for (let x = g.x0 - 60; x <= xe; x += 6) p.push(`${x.toFixed(1)} ${(trunkY(g, x) + 11 * Math.sin(x / 34 + k * 2.1)).toFixed(1)}`);
    return p.length > 1 ? `M ${p.join(" L ")}` : "";
  };
  const rx = run === undefined ? null : g.x0 - 100 + (g.w + 200) * run;
  return (
    <g opacity={o}>
      <path d={d} stroke={K.theme} strokeWidth={w * 6} strokeOpacity={0.05 + 0.1 * glow} fill="none" strokeLinecap="round" />
      <path d={d} stroke={K.theme} strokeWidth={w * 2.4} strokeOpacity={0.14 + 0.2 * glow} fill="none" strokeLinecap="round" />
      <path d={d} stroke={K.theme} strokeWidth={w} fill="none" strokeLinecap="round" />
      <path d={d} stroke={K.themeHi} strokeWidth={w * 0.3} strokeOpacity={0.4 + 0.5 * glow} fill="none" strokeLinecap="round" />
      {threads > 0 ? [0, 1, 2].map((k) => <path key={k} d={thread(k)} stroke={K.gold} strokeWidth={1.6} strokeOpacity={0.75} fill="none" />) : null}
      {rx !== null
        ? [
            [150, 16, 0.1],
            [80, 9, 0.18],
            [34, 4.5, 0.55],
          ].map(([a, b, op], k) => <ellipse key={k} cx={rx} cy={trunkY(g, rx)} rx={a} ry={b} fill={K.themeHi} fillOpacity={op} />)
        : null}
      {draw < 1 ? <circle cx={x1} cy={trunkY(g, x1)} r={w * 1.3} fill={K.themeHi} /> : null}
    </g>
  );
};

// Age ticks under the trunk.
export const AgeTicks: React.FC<{ g: TreeGeo; o?: number }> = ({ g, o = 1 }) => (
  <g opacity={o}>
    {[0, 10, 20, 30, 40, 50, 60, 70, 79].map((a) => {
      const x = ageX(g, a);
      const y = trunkY(g, x);
      return <circle key={a} cx={x} cy={y} r={3.5} fill={K.bg} stroke={K.themeHi} strokeWidth={1.5} />;
    })}
  </g>
);

export const AgeLabels: React.FC<{ g: TreeGeo; o?: number; dy?: number }> = ({ g, o = 1, dy = 18 }) => (
  <>
    {[0, 10, 20, 30, 40, 50, 60, 70, 79].map((a) => {
      const x = ageX(g, a);
      return (
        <div key={a} style={{ position: "absolute", left: x - 30, width: 60, top: trunkY(g, x) + dy, textAlign: "center", fontFamily: FONT, fontSize: 19, fontWeight: 700, color: K.muted, opacity: o }}>
          {a} 岁
        </div>
      );
    })}
  </>
);

// The icon at a branch tip, with its label beside it (HTML, so it uses the film's fonts).
export const TipLabel: React.FC<{ g: TreeGeo; b: TBranch; o: number; left?: boolean; size?: number; children?: React.ReactNode }> = ({ g, b, o, left = false, size = 30, children }) => {
  if (o <= 0.01) return null;
  const [x, y] = tipOf(g, b);
  const r = size * 0.95;
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, opacity: o * (b.o ?? 1), transform: `scale(${0.7 + 0.3 * o})`, transformOrigin: `${r}px ${r}px` }}>
      <div style={{ position: "relative", width: r * 2, height: r * 2, borderRadius: "50%", background: K.bg, border: `2.5px solid ${b.color}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${b.color}55` }}>
        {b.icon ? <Icon name={b.icon} size={size} color={b.color} /> : null}
        <div style={{ position: "absolute", top: r - size * 0.62, [left ? "right" : "left"]: r * 2 + 12, fontFamily: FONT, fontSize: size * 1.05, fontWeight: 900, color: b.color, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
          {b.label}
          {children}
        </div>
      </div>
    </div>
  );
};

// The film's standard life tree.
export const TREE: TreeGeo = { x0: 130, w: 1640, y: 650 };
export const LIFE_BRANCHES: Omit<TBranch, "grow">[] = [
  { a0: 6, a1: 21, dy: -150, color: K.lilac, icon: "cap", label: "上学", seed: "school" },
  { a0: 22, a1: 61, dy: 170, color: K.steel, icon: "bag", label: "工作", seed: "work" },
  { a0: 24, a1: 68, dy: -270, color: K.sand, icon: "coin", label: "赚钱", seed: "money" },
  { a0: 30, a1: 52, dy: -110, color: K.steelHi, icon: "key", label: "买房", seed: "home" },
  { a0: 33, a1: 55, dy: 290, color: K.pink, icon: "up", label: "升职", seed: "up" },
];
