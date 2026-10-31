// The flat objects of the film: the registration on the opening stall's laptop and the shop page on the last desk
// (mapped onto their screens in 3D), number cards, notifications over a stall, the TV insert, the dot rows.
// No QR codes anywhere, not even fake ones (the short-video platforms do not allow them).
import React from "react";
import { interpolate } from "remotion";
import { FONT, K } from "../theme";
import { clamp01, EO, ESO } from "../timing";
import { Cam, quadMatrix, rectCorners, toScreen } from "../world/camera";
import { SCREEN, Screen } from "./state";
import { SHADOW, useT } from "./ui";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- the laptop screen (1500 x 1000 px, mapped onto the 0.36 x 0.24 m screen) ----------
export const OnScreen: React.FC<{ cam: Cam; o: number; scr?: Screen; children: React.ReactNode }> = ({ cam, o, scr = SCREEN, children }) => {
  if (o <= 0.001) return null;
  const q = rectCorners(cam, scr.p, scr.u, scr.v);
  if (!q) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1500, height: 1000, transformOrigin: "0 0", transform: quadMatrix(1500, 1000, q), opacity: o, overflow: "hidden", borderRadius: 10 }}>
      {children}
    </div>
  );
};

// The registration that opens the film (on the opening stall's laptop).
export const RegScreen: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT() - t0;
  const rows: [string, string][] = [
    ["企业类型", "一人有限责任公司"],
    ["股东", "1 人"],
    ["经营范围", "网站设计、软件开发"],
  ];
  const ok = interpolate(t, [0.75, 0.95], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#f3f5f8,#e6eaf0)", fontFamily: FONT, color: "#1a1f27" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 120, background: "#1f4fa3", display: "flex", alignItems: "center", paddingLeft: 60, gap: 22 }}>
        <div style={{ width: 54, height: 54, borderRadius: 27, border: "5px solid #ffd66b" }} />
        <span style={{ fontSize: 46, fontWeight: 800, color: "#fff", letterSpacing: 4 }}>企业设立登记</span>
      </div>
      <div style={{ position: "absolute", left: 90, top: 200, width: 1320 }}>
        {rows.map(([a, b], i) => {
          const k = interpolate(t, [0.05 + i * 0.12, 0.3 + i * 0.12], [0, 1], { ...CL, easing: EO });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", height: 130, borderBottom: "2px solid rgba(26,31,39,0.1)", opacity: k }}>
              <span style={{ width: 300, fontSize: 44, color: "rgba(26,31,39,0.55)", fontWeight: 600 }}>{a}</span>
              <span style={{ fontSize: 56, fontWeight: 800 }}>{b}</span>
            </div>
          );
        })}
      </div>
      {ok > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 90,
            top: 660,
            width: 1320,
            height: 220,
            borderRadius: 26,
            background: "#e3f6ec",
            border: "4px solid #2fb36b",
            display: "flex",
            alignItems: "center",
            gap: 40,
            paddingLeft: 60,
            boxSizing: "border-box",
            opacity: ok,
            transform: `scale(${1.08 - 0.08 * ok})`,
          }}
        >
          <div style={{ width: 120, height: 120, borderRadius: 60, background: "#2fb36b", color: "#fff", fontSize: 84, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
          <div>
            <div style={{ fontSize: 76, fontWeight: 900, color: "#17824a" }}>登记成功</div>
            <div style={{ fontSize: 38, fontWeight: 600, color: "rgba(23,130,74,0.8)" }}>营业执照已发放</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

// The last shot: the new desk's shop page, its regulars still none.
export const RegularsScreen: React.FC = () => {
  const t = useT();
  const blink = Math.floor(t * 1.6) % 2 === 0 ? 1 : 0.35;
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#f4f1ea,#e9e4da)", fontFamily: FONT, color: "#16181c" }}>
      <div style={{ position: "absolute", left: 70, top: 56, fontSize: 56, fontWeight: 900 }}>我的店</div>
      <div style={{ position: "absolute", right: 70, top: 70, fontSize: 34, fontWeight: 600, color: "rgba(22,24,28,0.5)" }}>今天</div>
      <div style={{ position: "absolute", left: 70, top: 190, width: 1360, height: 690, borderRadius: 30, background: "#fff", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
        <div style={{ position: "absolute", left: 70, top: 60, fontSize: 48, fontWeight: 700, color: "rgba(22,24,28,0.6)" }}>回头客</div>
        <div style={{ position: "absolute", left: 66, top: 120, fontSize: 300, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>0</div>
        <div style={{ position: "absolute", left: 70, top: 470, right: 70, height: 2, background: "rgba(22,24,28,0.1)" }} />
        <div style={{ position: "absolute", left: 70, top: 520, fontSize: 40, fontWeight: 600, color: "rgba(22,24,28,0.42)", display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#d9a33a", opacity: blink }} />
          还没有人回来
        </div>
      </div>
    </div>
  );
};

// A number card for the count of new one-person companies, sliding in.
export const StatCard: React.FC<{ at: number; out: number; x: number; y: number; tag: string; main: React.ReactNode; sub: string; w?: number }> = ({ at, out, x, y, tag, main, sub, w = 560 }) => {
  const t = useT();
  const k = interpolate(t, [at, at + 0.4], [0, 1], { ...CL, easing: EO });
  const o = Math.min(k, interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - k) * 36,
        width: w,
        padding: "26px 32px 28px",
        boxSizing: "border-box",
        background: "rgba(6,9,15,0.72)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderTop: `6px solid ${K.gold}`,
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        opacity: o,
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 800, color: K.gold, letterSpacing: 2 }}>{tag}</div>
      <div style={{ marginTop: 10, fontSize: 46, fontWeight: 800, color: K.fg, lineHeight: 1.25 }}>{main}</div>
      <div style={{ marginTop: 10, fontSize: 26, fontWeight: 600, color: "rgba(244,240,232,0.62)", lineHeight: 1.4 }}>{sub}</div>
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
