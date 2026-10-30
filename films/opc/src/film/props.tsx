// The flat objects of the film: the revenue dashboard and the payment QR on the opening stall's laptop (mapped
// onto its screen in 3D), the business licence, policy cards, payment notifications, the TV insert, the dot rows.
import React from "react";
import { interpolate } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { clamp01, EIO, EO, ESO } from "../timing";
import { Cam, quadMatrix, rectCorners, toScreen } from "../world/camera";
import { SCREEN } from "./state";
import { fmt, SHADOW, useT } from "./ui";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- the laptop screen (1500 x 1000 px, mapped onto the 0.36 x 0.24 m screen) ----------
export const OnScreen: React.FC<{ cam: Cam; o: number; children: React.ReactNode }> = ({ cam, o, children }) => {
  if (o <= 0.001) return null;
  const q = rectCorners(cam, SCREEN.p, SCREEN.u, SCREEN.v);
  if (!q) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1500, height: 1000, transformOrigin: "0 0", transform: quadMatrix(1500, 1000, q), opacity: o, overflow: "hidden", borderRadius: 10 }}>
      {children}
    </div>
  );
};

const NOTES = ["新用户注册", "新订阅", "新用户注册", "新用户注册", "新订阅", "新用户注册", "新订阅", "新用户注册", "新用户注册", "新订阅", "新用户注册", "新订阅", "新用户注册", "新用户注册"];

export const Dashboard: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT() - t0;
  const users = Math.round(250000 * interpolate(t, [0.1, 2.7], [0.02, 1], { ...CL, easing: ESO }));
  const grow = interpolate(t, [0, 2.8], [0.08, 1], { ...CL, easing: ESO });
  // the user curve: slow, then steep
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const x = i / 60;
    if (x > grow) break;
    const y = Math.pow(x, 2.6) * 0.92 + 0.02 * Math.sin(x * 40);
    pts.push([60 + x * 780, 760 - y * 470]);
  }
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${path} L${pts[pts.length - 1][0].toFixed(1)},760 L60,760 Z` : "";
  const stamp = interpolate(t, [1.25, 1.45], [0, 1], { ...CL, easing: EO });
  const n = Math.floor(clamp01(t / 2.9) * NOTES.length * 1.0) + 2;
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0e131c,#090c12)", fontFamily: FONT, color: K.fg }}>
      <div style={{ position: "absolute", left: 50, top: 36, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg,#ff8a3d,#ff4f7b)" }} />
        <span style={{ fontSize: 40, fontWeight: 800 }}>Base44</span>
        <span style={{ fontSize: 24, fontWeight: 600, padding: "4px 14px", borderRadius: 16, background: "rgba(255,255,255,0.08)", color: "rgba(244,240,232,0.75)" }}>AI 建站工具</span>
      </div>
      <div style={{ position: "absolute", right: 50, top: 44, fontSize: 24, fontWeight: 700, color: K.green }}>● 实时</div>
      <div style={{ position: "absolute", left: 50, top: 128, width: 860, height: 820, borderRadius: 22, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ position: "absolute", left: 40, top: 30, fontSize: 28, color: "rgba(244,240,232,0.6)", fontWeight: 600 }}>用户</div>
        <div style={{ position: "absolute", left: 40, top: 70, fontSize: 104, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>{fmt(users)}</div>
        <svg width={860} height={820} style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff8a3d" stopOpacity="0.45" />
              <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={60} x2={840} y1={760 - i * 150} y2={760 - i * 150} stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
          ))}
          {area ? <path d={area} fill="url(#ga)" /> : null}
          {path ? <path d={path} fill="none" stroke="#ff9a52" strokeWidth={6} strokeLinejoin="round" /> : null}
        </svg>
      </div>
      <div style={{ position: "absolute", left: 950, top: 128, width: 500, height: 820, overflow: "hidden" }}>
        {Array.from({ length: n }).map((_, i) => {
          const k = n - 1 - i; // newest on top
          const age = t - (k / NOTES.length) * 2.9;
          const e = interpolate(age, [0, 0.25], [0, 1], { ...CL, easing: EO });
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 0,
                top: i * 112 + (1 - e) * -60,
                width: 500,
                height: 96,
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 18,
                paddingLeft: 24,
                opacity: e * (1 - i * 0.09),
                boxSizing: "border-box",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 22, background: NOTES[k % NOTES.length] === "新订阅" ? K.green : "#5aa0ff" }} />
              <div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{NOTES[k % NOTES.length]}</div>
                <div style={{ fontSize: 22, color: "rgba(244,240,232,0.5)" }}>刚刚</div>
              </div>
            </div>
          );
        })}
      </div>
      {stamp > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 520,
            top: 330,
            transform: `rotate(-9deg) scale(${1.6 - 0.6 * stamp})`,
            opacity: stamp,
            border: "10px solid #e8333a",
            borderRadius: 18,
            padding: "14px 46px",
            color: "#ff474e",
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: 10,
            background: "rgba(20,4,6,0.35)",
            boxShadow: "0 0 40px rgba(232,51,58,0.35)",
          }}
        >
          已被收购
        </div>
      ) : null}
    </div>
  );
};

// The payment page waiting for the first customer (the last shot).
export const PayScreen: React.FC = () => {
  const t = useT();
  const cells: React.ReactNode[] = [];
  const N = 25;
  const hsh = (x: number, y: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const fx = Math.min(x, N - 1 - x);
      const fy = Math.min(y, N - 1 - y);
      const finder = (x < 7 && y < 7) || (x > N - 8 && y < 7) || (x < 7 && y > N - 8);
      let on = hsh(x, y) > 0.52;
      if (finder) {
        const lx = x < 7 ? x : x - (N - 7);
        const ly = y < 7 ? y : y - (N - 7);
        const r = Math.max(Math.abs(lx - 3), Math.abs(ly - 3));
        on = r === 3 || r <= 1;
      }
      void fx;
      void fy;
      if (on) cells.push(<rect key={`${x}-${y}`} x={x * 16} y={y * 16} width={16} height={16} fill="#111" />);
    }
  const dots = ".".repeat(1 + (Math.floor(t * 2) % 3));
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#f4f1ea,#e9e4da)", fontFamily: FONT, color: "#16181c", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginTop: 70, fontSize: 52, fontWeight: 800 }}>扫码付款</div>
      <div style={{ marginTop: 40, padding: 34, background: "#fff", borderRadius: 26, boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}>
        <svg width={400} height={400}>{cells}</svg>
      </div>
      <div style={{ marginTop: 44, fontSize: 40, fontWeight: 600, color: "rgba(22,24,28,0.55)" }}>等待付款{dots}</div>
    </div>
  );
};

// ---------- the business licence (title) ----------
export const Licence: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const k = interpolate(t, [at, at + 0.55], [0, 1], { ...CL, easing: EO });
  const x = interpolate(t, [out - 0.4, out], [0, 1], { ...CL, easing: EIO });
  if (k <= 0 || x >= 1) return null;
  const seal = interpolate(t, [at + 0.5, at + 0.62], [0, 1], { ...CL, easing: EO });
  const row = (a: string, b: string, i: number) => (
    <div key={i} style={{ display: "flex", gap: 34, fontSize: 34, lineHeight: 2.0 }}>
      <span style={{ width: 170, color: "#5a4632", letterSpacing: 8 }}>{a}</span>
      <span style={{ color: "#2a2018" }}>{b}</span>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 960 - 560, top: 330 + (1 - k) * 160 + x * 120, width: 1120, height: 640, opacity: k * (1 - x), transform: `rotate(${(1 - k) * 4 - 1.5}deg)` }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 40% 30%, #f6eedd, #e8dcc3 70%, #ddcfb2)",
          borderRadius: 6,
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      />
      <div style={{ position: "absolute", inset: 22, border: "3px solid #9c3b2a", borderRadius: 4 }} />
      <div style={{ position: "absolute", inset: 32, border: "1px solid rgba(156,59,42,0.6)", borderRadius: 2, background: "repeating-linear-gradient(45deg, rgba(156,59,42,0.035) 0 6px, transparent 6px 12px)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, textAlign: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 64, letterSpacing: 26, color: "#8f2f22" }}>营业执照</div>
      <div style={{ position: "absolute", left: 120, top: 200, fontFamily: SERIF, fontWeight: 600 }}>
        {[
          ["名称", "＿＿＿＿＿＿＿＿"],
          ["类型", "有限责任公司（自然人独资）"],
          ["股东", "1 人"],
        ].map(([a, c], i) => row(a, c, i))}
      </div>
      {seal > 0 ? (
        <svg width={220} height={220} style={{ position: "absolute", right: 90, bottom: 60, opacity: 0.85 * seal, transform: `scale(${1.5 - 0.5 * seal}) rotate(-12deg)` }}>
          <circle cx={110} cy={110} r={96} fill="none" stroke="#d8262c" strokeWidth={8} />
          <path id="sealArc" d="M 30 110 A 80 80 0 0 1 190 110" fill="none" />
          <text fontFamily={SERIF} fontWeight={800} fontSize={30} fill="#d8262c" letterSpacing={6}>
            <textPath href="#sealArc" startOffset="50%" textAnchor="middle">
              一人公司的形状
            </textPath>
          </text>
          <text x={110} y={140} textAnchor="middle" fontSize={64} fill="#d8262c">
            ★
          </text>
        </svg>
      ) : null}
    </div>
  );
};

// ---------- policy cards ----------
export const DocCard: React.FC<{ at: number; out: number; x: number; y: number; org: string; date: string; quote: React.ReactNode; note?: string }> = ({ at, out, x, y, org, date, quote, note }) => {
  const t = useT();
  const k = interpolate(t, [at, at + 0.35], [0, 1], { ...CL, easing: EO });
  const o = Math.min(k, interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - k) * 40,
        width: 760,
        padding: "26px 34px 28px 40px",
        boxSizing: "border-box",
        background: "rgba(10,13,20,0.84)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderLeft: "8px solid #d8262c",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        opacity: o,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 700, color: K.gold }}>
        <span>{org}</span>
        <span style={{ color: "rgba(244,240,232,0.55)", fontWeight: 600 }}>{date}</span>
      </div>
      <div style={{ marginTop: 14, fontSize: 38, fontWeight: 700, color: K.fg, lineHeight: 1.42 }}>{quote}</div>
      {note ? <div style={{ marginTop: 10, fontSize: 24, color: "rgba(244,240,232,0.6)" }}>{note}</div> : null}
    </div>
  );
};

// ---------- a payment notification hanging over a stall ----------
export const Notif: React.FC<{ cam: Cam; at: number; out: number; p: [number, number, number]; text: string; sub?: string; gold?: boolean; lift?: number }> = ({ cam, at, out, p, text, sub, gold, lift = 90 }) => {
  const t = useT();
  const k = interpolate(t, [at, at + 0.25], [0, 1], { ...CL, easing: EO });
  const o = Math.min(k, interpolate(t, [out - 0.25, out], [1, 0], CL));
  if (o <= 0) return null;
  const [sx, sy, vis] = toScreen(cam, p[0], p[1], p[2]);
  if (!vis) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: sx,
        top: sy - lift - (1 - k) * -30,
        transform: `translate(-50%, -100%) scale(${0.8 + 0.2 * k})`,
        opacity: o,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 26px 14px 16px",
        borderRadius: 40,
        background: gold ? "rgba(255,214,120,0.95)" : "rgba(246,244,238,0.95)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        fontFamily: FONT,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 20, background: gold ? "#b8741a" : K.green, color: "#fff", fontSize: 26, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>¥</div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#16181c" }}>{text}</div>
        {sub ? <div style={{ fontSize: 21, fontWeight: 600, color: "rgba(22,24,28,0.6)" }}>{sub}</div> : null}
      </div>
    </div>
  );
};

// ---------- TV insert: a theatre's seats, then one screen for a whole city ----------
export const TVInsert: React.FC<{ at: number; tvAt: number; out: number }> = ({ at, tvAt, out }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.5], [0, 1], CL), interpolate(t, [out - 0.4, out], [1, 0], CL));
  if (o <= 0) return null;
  const tv = interpolate(t, [tvAt, tvAt + 1.2], [0, 1], { ...CL, easing: ESO });
  const seats: React.ReactNode[] = [];
  const cx = 600;
  const cy = 610;
  for (let r = 0; r < 9; r++) {
    const n = 12 + r * 2;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.18 + (0.64 * i) / (n - 1));
      const rad = 150 + r * 34;
      const x0 = cx - Math.cos(a) * rad;
      const y0 = cy + Math.sin(a) * rad * 0.42;
      // seats fly into the TV
      const d = clamp01(tv * 1.4 - ((r * 37 + i * 13) % 100) / 250);
      const x = x0 + (1320 - x0) * d;
      const y = y0 + (560 - y0) * d;
      seats.push(<circle key={`${r}-${i}`} cx={x} cy={y} r={7 * (1 - d) + 1.5} fill="#ffcf7a" opacity={(0.9 - r * 0.05) * (1 - d * 0.85)} />);
    }
  }
  // the city around the TV: many more viewers
  const city: React.ReactNode[] = [];
  for (let i = 0; i < 420; i++) {
    const v1 = Math.sin(i * 12.9898) * 43758.5453;
    const v2 = Math.sin(i * 78.233) * 43758.5453;
    const a = (v1 - Math.floor(v1)) * Math.PI * 2;
    const rr = 190 + (v2 - Math.floor(v2)) * 330;
    const k = clamp01(tv * 2 - 1 - (i % 60) / 120);
    if (k <= 0) continue;
    city.push(<circle key={i} cx={1320 + Math.cos(a) * rr * 1.25} cy={560 + Math.sin(a) * rr * 0.55} r={3} fill="#cfe3ff" opacity={0.75 * k} />);
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, background: "radial-gradient(ellipse at 50% 55%, rgba(14,12,10,0.86), rgba(4,5,8,0.95))" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <radialGradient id="spot" cx="0.5" cy="0.2" r="0.6">
            <stop offset="0" stopColor="#ffe2a8" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffe2a8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g opacity={1 - tv * 0.6}>
          <ellipse cx={cx} cy={cy - 20} rx={120} ry={30} fill="#3a2a1a" />
          <polygon points={`${cx - 60},${cy - 420} ${cx + 60},${cy - 420} ${cx + 180},${cy - 10} ${cx - 180},${cy - 10}`} fill="url(#spot)" />
          <circle cx={cx} cy={cy - 52} r={18} fill="#ffe9c2" />
        </g>
        {seats}
        {city}
        <g opacity={tv} transform={`translate(1320 560) scale(${0.85 + 0.15 * tv}) translate(-1320 -560)`}>
          <line x1={1290} y1={420} x2={1250} y2={360} stroke="#9aa3ad" strokeWidth={5} />
          <line x1={1350} y1={420} x2={1390} y2={360} stroke="#9aa3ad" strokeWidth={5} />
          <rect x={1170} y={420} width={300} height={230} rx={36} fill="#3b3128" stroke="#6b5a48" strokeWidth={6} />
          <rect x={1196} y={444} width={210} height={182} rx={30} fill="#cfe3ff" opacity={0.92} />
          <circle cx={1440} cy={480} r={10} fill="#8a7a66" />
          <circle cx={1440} cy={515} r={10} fill="#8a7a66" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: cx - 200, width: 400, top: 860, textAlign: "center", fontFamily: FONT, fontSize: 32, fontWeight: 700, color: "rgba(255,226,170,0.85)", opacity: 1 - tv }}>剧场：几百个座位</div>
      <div style={{ position: "absolute", left: 1120, width: 400, top: 880, textAlign: "center", fontFamily: FONT, fontSize: 32, fontWeight: 700, color: "rgba(207,227,255,0.9)", opacity: tv }}>电视：一整座城</div>
    </div>
  );
};

// ---------- ten customers in a row; the lit ones came back ----------
export const DotRow: React.FC<{ at: number; out: number; x: number; y: number; lit: number; label: string; value: string; color?: string }> = ({ at, out, x, y, lit, label, value, color = K.gold }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.3], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o, fontFamily: FONT }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: K.sub, textShadow: SHADOW }}>{label}</div>
      <div style={{ display: "flex", gap: 22, marginTop: 18, alignItems: "center" }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const s = at + 0.3 + i * 0.07;
          const k = interpolate(t, [s, s + 0.25], [0, 1], { ...CL, easing: EO });
          const on = clamp01(lit - i);
          const litK = interpolate(t, [at + 1.1 + i * 0.12, at + 1.35 + i * 0.12], [0, 1], CL) * on;
          return (
            <div
              key={i}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                transform: `scale(${k})`,
                background: litK > 0 ? color : "rgba(207,227,255,0.18)",
                opacity: litK > 0 ? 0.35 + 0.65 * litK : 1,
                boxShadow: litK > 0 ? `0 0 ${24 * litK}px ${color}` : "none",
                border: "2px solid rgba(207,227,255,0.35)",
              }}
            />
          );
        })}
        <div style={{ marginLeft: 26, fontSize: 64, fontWeight: 800, color, textShadow: SHADOW, whiteSpace: "nowrap" }}>{value}</div>
      </div>
    </div>
  );
};
