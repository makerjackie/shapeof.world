// Three ~10 s style samples for v3 (作者 2026-10-31: "直接来做一些样片给我看吧，每个样片做个 10 秒").
// A · 无人机眼  B · 电影感三维战场  C · 高密度作战图
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CITIES, ll, LANE, PLACE, toLL } from "../geo";
import { BrandMark, clamp01, CL, EIO, EO, ESO, FPS, lerp, ramp, SHADOW } from "../kit";
import { FONT, K, MONO, NUM, SERIF } from "../theme";
import { Cam, mixCam, toScreen } from "../world/camera";
import { Dot, engine, Fx, Unit, WorldState } from "../world/engine";
import { useWorldReady, World } from "../world/World";

const win = (t: number, a: number, b: number, fi = 0.25, fo = 0.25) => Math.min(clamp01((t - a) / fi), clamp01((b - t) / fo));
const keyCam = (t: number, keys: [number, Cam][], ease = ESO): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return mixCam(keys[i - 1][1], keys[i][1], ease(clamp01((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))));
  return keys[keys.length - 1][1];
};
const base = (cam: Cam, t: number, o: Partial<WorldState> = {}): WorldState => ({
  cam, time: t, country: 0, exagC: 7, control: { p2014: 0, p2022_03: 0, p2022_06: 0, p2022_11: 0, p2026: 0 }, borders: 1, rivers: 1,
  field: 1, exag: 1.5, sat: [1, 0, 0], thermal: 0, works: 1, unitScale: 1, ...o,
});
const ground = (s: WorldState) => {
  const g = engine().heightAt(s.cam.x, s.cam.y);
  if (s.field > 0.5 && s.cam.dist < 80000 && g > 0) s.cam = { ...s.cam, h: g * s.exag + 1 };
  return s;
};

// Big type that types in fast and leaves fast.
const Line: React.FC<{ t: number; at: number; out: number; text: string; size?: number; x?: number; y?: number; center?: boolean; hl?: string[]; c?: string; serif?: boolean; weight?: number }> = ({ t, at, out, text, size = 64, x = 96, y, center, hl = [], c = K.gold, serif, weight = 900 }) => {
  const frame = useCurrentFrame();
  if (t < at - 0.05 || t > out + 0.15) return null;
  const chars = Array.from(text);
  const hot = new Array(chars.length).fill(false);
  for (const h of hl) {
    const i = text.indexOf(h);
    if (i >= 0) for (let j = 0; j < Array.from(h).length; j++) hot[Array.from(text.slice(0, i)).length + j] = true;
  }
  const exit = interpolate(frame, [out * FPS - 4, out * FPS + 2], [0, 1], CL);
  return (
    <div style={{ position: "absolute", left: center ? 0 : x, right: center ? 0 : undefined, top: y, bottom: y === undefined ? 110 : undefined, textAlign: center ? "center" : "left", fontFamily: serif ? SERIF : FONT, fontWeight: weight, fontSize: size, color: K.fg, textShadow: SHADOW, opacity: 1 - exit, lineHeight: 1.25 }}>
      {chars.map((ch, i) => {
        const k = interpolate(frame, [at * FPS + i * 0.55, at * FPS + i * 0.55 + 5], [0, 1], { ...CL, easing: EO });
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.2}em)`, color: hot[i] ? c : undefined, fontFamily: hot[i] && /[0-9.%]/.test(ch) ? NUM : undefined }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

const Label: React.FC<{ s: WorldState; x: number; y: number; up?: number; text: string; sub?: string; o: number; color?: string; size?: number }> = ({ s, x, y, up = 30, text, sub, o, color = K.fg, size = 30 }) => {
  if (o <= 0.01) return null;
  const [sx, sy, v] = toScreen(s.cam, x, y, engine().heightAt(x, y) * s.exag + up);
  if (!v || sx < -300 || sx > 2200 || sy < -200 || sy > 1300) return null;
  return (
    <div style={{ position: "absolute", left: sx, top: sy, opacity: o, transform: `translateY(${(1 - o) * 8}px)` }}>
      <div style={{ position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 12px ${color}` }} />
      <div style={{ position: "absolute", left: 0, top: -2, width: 2, height: 40, background: color, opacity: 0.7, transform: "translateY(-100%)" }} />
      <div style={{ position: "absolute", left: 10, top: -54, whiteSpace: "nowrap", fontFamily: FONT, textShadow: SHADOW }}>
        <div style={{ fontSize: size, fontWeight: 900, color }}>{text}</div>
        {sub ? <div style={{ fontSize: size * 0.7, fontWeight: 700, color: "rgba(242,239,232,0.85)" }}>{sub}</div> : null}
      </div>
    </div>
  );
};

// =============================== A · 无人机眼 ===============================
let A_T: [number, number] = [1259, 6296]; // a stretch of fire trench (snapped to a real generated trench below)
let A_V: [number, number] = [1318, 6206]; // a vehicle in the open behind it
let A_DOTS: [number, number][] = [];
const pickA = () => {
  if (A_DOTS.length) return;
  const W = engine().works[0];
  let best: [number, number][] | null = null;
  let bd = 1e9;
  for (const l of W.trenches) {
    if (l.length < 30) continue;
    const m = l[Math.floor(l.length / 2)];
    const d = Math.hypot(m[0] - 1100, m[1] - 6150);
    if (d < bd) {
      bd = d;
      best = l;
    }
  }
  const l = best!;
  const m = Math.floor(l.length / 2);
  A_T = l[m];
  A_DOTS = [l[m - 6], l[m - 1], l[m + 4]];
  A_V = [A_T[0] - 10, A_T[1] - 60];
};
const aState = (t: number): WorldState => {
  pickA();
  const dots: Dot[] = A_DOTS.map(([x, y], i) => ({ x: x + Math.sin(t * 0.8 + i) * 0.4, y, o: 1, side: 1, r: 1.5 }));
  const veh: Unit = { kind: "ifv", x: A_V[0], y: A_V[1], yaw: 75, side: 1, dead: t > 7.0 ? 0.8 : 0 };
  if (t < 3.4) {
    const cam = keyCam(t, [[0, { x: A_T[0] + 20, y: A_T[1] - 10, h: 0, dist: 170, yaw: 0, pitch: 0 }], [3.4, { x: A_T[0] + 30, y: A_T[1] - 30, h: 0, dist: 140, yaw: 8, pitch: 0 }]], EIO);
    return ground(base(cam, t, { thermal: 1, dots, units: [veh], craters: 0.15, grain: 0.05 }));
  }
  if (t < 7.0) {
    // FPV: from ~700 m north, low and fast, onto the vehicle
    const k = ramp(t, 3.4, 7.0, (x) => x);
    const dist = 700 * Math.pow(1 - k, 2.2) + 8;
    const cam: Cam = { x: A_V[0] + Math.sin(t * 9) * 1.5 * (1 - k), y: A_V[1], h: 0, dist, yaw: 172 + Math.sin(t * 3) * 3, pitch: lerp(62, 48, k), fov: 96 };
    return ground(base(cam, t, { fpv: 1, dots, units: [veh], craters: 0.15, grain: 0.0, exposure: 1.15 }));
  }
  const cam = keyCam(t, [[7.0, { x: A_V[0] - 40, y: A_V[1] + 40, h: 0, dist: 420, yaw: 5, pitch: 0 }], [10, { x: A_V[0] - 40, y: A_V[1] + 40, h: 0, dist: 470, yaw: 9, pitch: 0 }]], EIO);
  const a = t - 7.25;
  const fx: Fx[] = a > 0 ? [{ x: A_V[0], y: A_V[1], h: 2, age: a, kind: "flash", size: 26 }, { x: A_V[0], y: A_V[1], h: 4 + a * 6, age: a, kind: "smoke", size: 10 + a * 5, o: 0.9 }, { x: A_V[0] + 3, y: A_V[1] + 2, h: 3 + a * 9, age: a, kind: "smoke", size: 8 + a * 6, o: 0.7 }] : [];
  return ground(base(cam, t, { thermal: 1, dots, units: [veh], fx, craters: 0.15, grain: 0.05, staticNoise: t < 7.3 ? 1 : 0 }));
};

const FpvOSD: React.FC<{ t: number }> = ({ t }) => {
  const col = "rgba(255,255,255,0.92)";
  const v = (16.4 - (t - 3.4) * 0.12).toFixed(1);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: MONO, fontWeight: 700, color: col, fontSize: 30, textShadow: "0 0 6px rgba(0,0,0,0.9)" }}>
      <div style={{ position: "absolute", left: 120, top: 100 }}>{v}V</div>
      <div style={{ position: "absolute", left: 120, top: 140, fontSize: 24 }}>LQ {Math.round(92 - (t - 3.4) * 6)}</div>
      <div style={{ position: "absolute", right: 120, top: 100 }}>{String(Math.floor((t - 3.4) * 100)).padStart(3, "0")}s</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 524, textAlign: "center", fontSize: 40 }}>+</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", fontSize: 26 }}>ARMED · {Math.round(lerp(120, 2, ramp(t, 3.4, 7, EIO)))}m</div>
    </div>
  );
};
const IsrOSD: React.FC<{ s: WorldState; t: number }> = ({ s, t }) => {
  const [lon, lat] = toLL(s.cam.x, s.cam.y);
  const col = "rgba(235,240,236,0.9)";
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: MONO, color: col, fontSize: 22 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g stroke={col} strokeWidth={3} fill="none">
          <path d="M 70 116 L 70 70 L 116 70 M 1850 116 L 1850 70 L 1804 70 M 70 964 L 70 1010 L 116 1010 M 1850 964 L 1850 1010 L 1804 1010" />
          <path d="M 960 500 L 960 525 M 960 555 L 960 580 M 920 540 L 945 540 M 975 540 L 1000 540" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 100, top: 92 }}>
        <span style={{ color: Math.floor(t * 2) % 2 ? "transparent" : "#ff5a4a" }}>●</span> REC · IR WH
      </div>
      <div style={{ position: "absolute", right: 100, top: 92, textAlign: "right" }}>
        {lat.toFixed(4)}N {lon.toFixed(4)}E<br />ALT {Math.round(s.cam.dist)} m
      </div>
    </div>
  );
};

export const SampleA: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useWorldReady();
  if (!ready) return <AbsoluteFill style={{ background: "#000" }}><World s={null} /></AbsoluteFill>;
  const s = aState(t);
  const roll = t > 3.4 && t < 7 ? Math.sin(t * 2.2) * 5 + (t - 3.4) * 2 : 0;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: roll ? `rotate(${roll}deg) scale(1.12)` : undefined }}>
        <World s={s} />
      </div>
      {t < 3.4 || t > 7.3 ? <IsrOSD s={s} t={t} /> : null}
      {t > 3.4 && t < 7 ? <FpvOSD t={t} /> : null}
      {t < 3.4 && s.dots
        ? [0, 1, 2].map((i) => {
            const d = (s.dots ?? [])[i];
            const [sx, sy] = toScreen(s.cam, d.x, d.y, engine().heightAt(d.x, d.y) * s.exag);
            const o = win(t, 1.3 + i * 0.25, 3.3);
            return <div key={i} style={{ position: "absolute", left: sx - 22, top: sy - 22, width: 44, height: 44, border: `3px solid ${K.ru}`, opacity: o }} />;
          })
        : null}
      <Line t={t} at={0.2} out={1.6} text="乌克兰南部，一段前线战壕。" size={58} />
      <Line t={t} at={1.7} out={3.3} text="战壕里，3 个人。" size={58} hl={["3 个人"]} c={K.ruHi} />
      <Line t={t} at={3.6} out={6.8} text="头顶上，一直有东西在看。" size={72} />
      <Line t={t} at={7.6} out={9.95} text="被看见，几秒后就会挨打。" size={72} hl={["被看见"]} />
      <BrandMark o={1} />
      <Audio src={staticFile("sample-a.wav")} />
    </AbsoluteFill>
  );
};

// =============================== B · 电影感三维战场 ===============================
const bState = (t: number): WorldState => {
  const cam = keyCam(t, [
    [0, { x: 900, y: 5600, h: 0, dist: 520, yaw: 8, pitch: 66, fov: 40 }],
    [5, { x: 1050, y: 6450, h: 0, dist: 780, yaw: 14, pitch: 64, fov: 40 }],
    [10, { x: 1200, y: 7300, h: 0, dist: 1900, yaw: 20, pitch: 68, fov: 40 }],
  ], (x) => x);
  const fx: Fx[] = [];
  // smoke columns and shell bursts along the front, far ahead
  for (let i = 0; i < 7; i++) {
    const x = -800 + i * 520 + Math.sin(i * 3.1) * 120;
    const y = 9100 + Math.cos(i * 2.3) * 200;
    for (let k = 0; k < 9; k++) fx.push({ x: x + Math.sin(k + t * 0.3) * 8 * k, y: y + k * 6, h: 10 + k * 26 + ((t * 9 + i * 5) % 26), age: 3, kind: "smoke", size: 30 + k * 12, o: 0.55 - k * 0.04 });
  }
  for (let i = 0; i < 10; i++) {
    const ti = (i * 0.97 + 0.3) % 10;
    const a = t - ti;
    if (a < 0 || a > 1.8) continue;
    const x = -600 + ((i * 431) % 3600);
    const y = 8800 + ((i * 173) % 700);
    fx.push({ x, y, h: 3, age: a, kind: "flash", size: 60 }, { x, y, h: 8 + a * 20, age: a, kind: "dust", size: 30 + a * 30, o: 0.8 });
  }
  const drones = Array.from({ length: 9 }, (_, i) => ({ x: 200 + i * 330 + Math.sin(t * 0.4 + i) * 40, y: 7600 + Math.cos(i * 1.7) * 600 + Math.cos(t * 0.3 + i) * 40, h: 300 + (i % 4) * 90, o: 1, cone: 0, r: 2 }));
  return ground(base(cam, t, { cine: 1, sunScreen: [0.86, 0.9], mines: { o: 1, depth: 500 }, craters: 0.05, fx, drones, exag: 2, exposure: 1.18, grain: 0.03, front: undefined }));
};
export const SampleB: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useWorldReady();
  if (!ready) return <AbsoluteFill style={{ background: "#000" }}><World s={null} /></AbsoluteFill>;
  const s = bState(t);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World s={s} />
      <Label s={s} x={1259} y={6296} text="射击壕" sub="折线挖，炸不穿一整条" o={win(t, 1.0, 4.4)} color={K.ruHi} />
      <Label s={s} x={880} y={5960} text="连级据点" o={win(t, 1.6, 4.6)} color={K.ruHi} />
      <Label s={s} x={1100} y={7120} text="雷场" sub="500 米深" o={win(t, 4.6, 8.4)} color={K.ruHi} />
      <Label s={s} x={1400} y={9150} up={120} text="前线" o={win(t, 6.4, 9.9)} />
      <Line t={t} at={0.3} out={4.4} text="2023 年 6 月，扎波罗热。" size={60} serif weight={800} />
      <Line t={t} at={4.6} out={9.9} text="俄军用 8 个月，在麦田里挖出了三道防线。" size={60} hl={["8 个月", "三道防线"]} serif weight={800} />
      <BrandMark o={1} />
      <Audio src={staticFile("sample-b.wav")} />
    </AbsoluteFill>
  );
};

// =============================== C · 高密度作战图 ===============================
const cState = (t: number): WorldState => {
  const MAP: Cam = { x: -60000, y: -60000, h: 0, dist: 1050000, yaw: 0, pitch: 18, fov: 34 };
  const FIELDC: Cam = { x: 0, y: 6000, h: 0, dist: 26000, yaw: 0, pitch: 46, fov: 34 };
  const cam = t < 3.2 ? keyCam(t, [[0, { ...MAP, dist: 1150000 }], [3.2, MAP]], EIO) : t < 4.6 ? mixCam(MAP, FIELDC, ramp(t, 3.2, 4.6, ESO)) : keyCam(t, [[4.6, FIELDC], [10, { ...FIELDC, dist: 22000, yaw: 6, y: 5000 }]], EIO);
  const far = cam.dist > 150000;
  const s = base(cam, t, {
    country: clamp01((cam.dist - 25000) / 60000),
    field: clamp01((160000 - cam.dist) / 90000),
    control: { p2014: 0, p2022_03: 0, p2022_06: 0, p2022_11: far ? 1 : 0, p2026: 0 },
    exag: 3,
    works: 0,
    front: [[-21000, 9600], [-14000, 10100], [-9000, 9700], [-6000, 9200], [-3000, 8900], [0, 9000], [2500, 9400], [5000, 10000], [7500, 10200], [10000, 10400], [13000, 10800], [16000, 11000], [21000, 11400]],
    frontGlow: 1,
    sideTint: 0.8,
    mines: { o: win(t, 6.2, 10, 0.3, 0.3), depth: 500 },
    main: win(t, 7.0, 10, 0.3, 0.3),
    teeth: win(t, 7.0, 10, 0.3, 0.3),
    third: win(t, 7.6, 10, 0.3, 0.3),
    trench: win(t, 6.2, 10, 0.3, 0.3),
  });
  if (!far) s.cam = { ...s.cam, h: engine().heightAt(s.cam.x, s.cam.y) * 3 };
  return s;
};
const Counter: React.FC<{ t: number; at: number; label: string; to: number; unit: string; color?: string }> = ({ t, at, label, to, unit, color = K.uaHi }) => {
  const k = ramp(t, at, at + 0.7, EO);
  if (k <= 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 14, opacity: k, transform: `translateX(${(1 - k) * 30}px)` }}>
      <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: K.sub }}>{label}</span>
      <span style={{ fontFamily: NUM, fontSize: 64, fontWeight: 900, color, minWidth: 170, textAlign: "right" }}>{Math.round(to * k).toLocaleString("en")}</span>
      <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: K.sub }}>{unit}</span>
    </div>
  );
};
const UnitIcon: React.FC<{ x: number; y: number; color: string; o: number; kind: "inf" | "arm"; s?: number }> = ({ x, y, color, o, kind, s = 1 }) => (
  <svg width={46 * s} height={32 * s} viewBox="0 0 46 32" style={{ position: "absolute", left: x - 23 * s, top: y - 16 * s, opacity: o }}>
    <rect x={2} y={2} width={42} height={28} fill="rgba(5,7,10,0.65)" stroke={color} strokeWidth={3} />
    {kind === "inf" ? <path d="M 2 2 L 44 30 M 44 2 L 2 30" stroke={color} strokeWidth={2.5} /> : <ellipse cx={23} cy={16} rx={13} ry={7} fill="none" stroke={color} strokeWidth={2.5} />}
  </svg>
);
export const SampleC: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useWorldReady();
  if (!ready) return <AbsoluteFill style={{ background: "#000" }}><World s={null} /></AbsoluteFill>;
  const s = cState(t);
  const c = s.cam;
  const far = c.dist > 150000;
  const P = (x: number, y: number, up = 3000) => toScreen(c, x, y, far ? up : engine().heightAt(x, y) * 3 + 40);
  // land corridor + arrow to the sea
  const [ox, oy] = PLACE.orikhiv;
  const sea = ll(35.85, 46.72);
  const a = P(ox, oy);
  const b = P(sea[0], sea[1]);
  const kA = ramp(t, 1.2, 2.4, EO);
  const unitsUA = Array.from({ length: 12 }, (_, i) => P(-9000 + (i % 6) * 3600, 12500 + Math.floor(i / 6) * 2200, 0));
  const unitsRU = Array.from({ length: 14 }, (_, i) => P(-11000 + (i % 7) * 3700, 4200 - Math.floor(i / 7) * 5200, 0));
  const [rx, ry] = PLACE.robotyne;
  const pr = P(rx, ry);
  const pl = P(LANE.x, 9300);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World s={s} />
      {far ? (
        <>
          {CITIES.map((ct, i) => {
            const [sx, sy] = P(ct.p[0], ct.p[1]);
            return <div key={i} style={{ position: "absolute", left: sx + 8, top: sy - 14, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: K.sub, textShadow: SHADOW, opacity: win(t, 0, 3.3) }}>{ct.n}</div>;
          })}
          <div style={{ position: "absolute", left: P(...ll(36.2, 46.95))[0] - 60, top: P(...ll(36.2, 46.95))[1] - 40, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.ruHi, textShadow: SHADOW, opacity: win(t, 0.4, 3.3) }}>陆路走廊</div>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: win(t, 1.2, 3.3) }}>
            <path d={`M ${a[0]} ${a[1]} L ${a[0] + (b[0] - a[0]) * kA} ${a[1] + (b[1] - a[1]) * kA}`} stroke={K.uaHi} strokeWidth={8} strokeLinecap="round" />
            {kA > 0.98 ? <path d={`M ${b[0] - 18} ${b[1] - 22} L ${b[0]} ${b[1]} L ${b[0] + 18} ${b[1] - 22}`} stroke={K.uaHi} strokeWidth={8} fill="none" strokeLinecap="round" /> : null}
            <text x={a[0] + 30} y={(a[1] + b[1]) / 2} fill={K.uaHi} fontFamily={FONT} fontWeight={900} fontSize={34} style={{ paintOrder: "stroke", stroke: "rgba(3,4,8,0.85)", strokeWidth: 7 }}>约 100 公里到海边</text>
          </svg>
        </>
      ) : (
        <>
          {unitsUA.map(([x, y], i) => <UnitIcon key={`u${i}`} x={x} y={y} color={K.ua} kind={i % 3 ? "inf" : "arm"} o={ramp(t, 4.7 + i * 0.05, 5.0 + i * 0.05, EO)} />)}
          {unitsRU.map(([x, y], i) => <UnitIcon key={`r${i}`} x={x} y={y} color={K.ru} kind={i % 4 ? "inf" : "arm"} o={ramp(t, 5.0 + i * 0.04, 5.3 + i * 0.04, EO) * 0.9} s={0.85} />)}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: win(t, 5.2, 6.3) }}>
            <path d={`M ${pl[0]} ${pl[1]} L ${pr[0]} ${pr[1]}`} stroke={K.uaHi} strokeWidth={7} strokeDasharray="16 10" />
            <text x={(pl[0] + pr[0]) / 2 + 20} y={(pl[1] + pr[1]) / 2} fill={K.uaHi} fontFamily={FONT} fontWeight={900} fontSize={34} style={{ paintOrder: "stroke", stroke: "rgba(3,4,8,0.85)", strokeWidth: 7 }}>第 1 天的目标</text>
          </svg>
        </>
      )}
      {/* running tally, top right */}
      <div style={{ position: "absolute", right: 90, top: 120, display: "flex", flexDirection: "column", gap: 4 }}>
        <Counter t={t} at={0.6} label="西方援助的坦克" to={230} unit="辆" />
        <Counter t={t} at={1.1} label="装甲车" to={1550} unit="多辆" />
        <Counter t={t} at={1.6} label="新组建的旅" to={9} unit="个" />
        <Counter t={t} at={4.8} label="进攻投入" to={12} unit="个旅" />
        <Counter t={t} at={5.4} label="计划突破" to={7} unit="天" />
      </div>
      {/* the defence, stacking up bottom-left */}
      <div style={{ position: "absolute", left: 96, bottom: 100, display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT, textShadow: SHADOW }}>
        {[
          { at: 6.3, t: "雷场", v: "500 米深" },
          { at: 7.0, t: "反坦克壕", v: "4 米深 · 6 米宽" },
          { at: 7.6, t: "防线", v: "3 道 · 约 30 公里厚" },
          { at: 8.2, t: "头顶的无人机", v: "最多 25 架" },
          { at: 8.8, t: "俄军可调兵力", v: "约 10.5 万人（乌方情报）" },
        ].map((r) => {
          const k = ramp(t, r.at, r.at + 0.35, EO);
          return k > 0 ? (
            <div key={r.t} style={{ display: "flex", gap: 18, alignItems: "baseline", opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: K.sub, width: 200 }}>{r.t}</span>
              <span style={{ fontSize: 46, fontWeight: 900, color: K.ruHi }}>{r.v}</span>
            </div>
          ) : null;
        })}
      </div>
      <Line t={t} at={0.1} out={3.1} text="2023 年，乌克兰要切断这条走廊。" size={56} y={150} x={96} hl={["切断"]} c={K.uaHi} />
      <Line t={t} at={4.7} out={6.1} text="12 个旅，7 天突破。" size={56} y={150} x={96} hl={["12 个旅", "7 天"]} c={K.uaHi} />
      <Line t={t} at={6.2} out={9.95} text="对面，已经等了 8 个月。" size={56} y={150} x={96} hl={["8 个月"]} c={K.ruHi} />
      <BrandMark o={1} />
      <Audio src={staticFile("sample-c.wav")} />
    </AbsoluteFill>
  );
};
void K;
void SERIF;
