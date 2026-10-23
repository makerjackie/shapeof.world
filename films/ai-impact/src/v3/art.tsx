import React from "react";
import { random } from "remotion";
import { FONT, SERIF } from "../theme";
import { C, clamp01, EBACK, EO, lerp, pr } from "./kit";

// v3 drawings, in the v2 look: flat 2D objects on the dark ground, labels as HTML on top of SVG (no centred SVG text).

// ── A gaming graphics card: graphite shroud, two fans that spin with `t`, an AI-cyan light strip, gold contacts. ──
export const Gpu: React.FC<{ w: number; t: number; glow?: number; id: string; spin?: number }> = ({ w, t, glow = 0, id, spin = 1 }) => {
  const h = w * 0.42;
  const fan = (cx: number, k: number) => {
    const a = (t * 540 * spin + k * 37) % 360;
    return (
      <g key={cx}>
        <circle cx={cx} cy={74} r={50} fill="#0d1116" stroke="#2c3440" strokeWidth={3} />
        <g transform={`rotate(${a} ${cx} 74)`}>
          {Array.from({ length: 7 }).map((_, i) => (
            <path key={i} d={`M${cx},74 Q${cx + 14},${74 - 26} ${cx + 4},${74 - 44} Q${cx - 8},${74 - 30} ${cx},74 Z`} fill="#3a4350" transform={`rotate(${(i * 360) / 7} ${cx} 74)`} />
          ))}
        </g>
        <circle cx={cx} cy={74} r={12} fill="#1c222b" stroke="#47515f" strokeWidth={2} />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 400 168" width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`gpu-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#323a47" />
          <stop offset="1" stopColor="#181d24" />
        </linearGradient>
      </defs>
      {glow > 0 ? <ellipse cx={200} cy={80} rx={230} ry={100} fill={C.cyan} opacity={0.12 * glow} /> : null}
      <rect x={30} y={140} width={210} height={20} rx={3} fill="#c9973a" />
      <rect x={0} y={0} width={400} height={146} rx={16} fill={`url(#gpu-${id})`} stroke="#424c5b" strokeWidth={2} />
      <rect x={14} y={10} width={372} height={6} rx={3} fill={C.cyan} opacity={0.3 + 0.7 * glow} />
      {fan(108, 0)}
      {fan(266, 1)}
      <rect x={336} y={30} width={44} height={88} rx={6} fill="#20262f" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={344} y={40 + i * 20} width={28} height={8} rx={3} fill="#2f3743" />
      ))}
    </svg>
  );
};

// ── The skyline at dawn, in two layers. Far towers (bluer, few windows) fill the whole width, including behind the
// data centre; near towers (darker, tidy window grids, rooftop kit) leave the centre free for it. `open` raises the
// towers from the centre outwards. ──
type Tower = { x: number; w: number; h: number; seed: number; roof: number };
const makeTowers = (tag: string, minH: number, varH: number, gapFrom: number, gapTo: number) => {
  const out: Tower[] = [];
  let x = -60;
  let i = 0;
  while (x < 1980) {
    const w = 64 + random(`${tag}w${i}`) * 120;
    const h = minH + random(`${tag}h${i}`) * varH;
    if (!(x + w > gapFrom && x < gapTo)) out.push({ x, w, h, seed: i, roof: random(`${tag}r${i}`) });
    x += w + 6 + random(`${tag}g${i}`) * 22;
    i++;
  }
  return out;
};
const FAR = makeTowers("f", 230, 260, 99999, -1);
const NEAR = makeTowers("n", 150, 300, 640, 1280);

const TowerG: React.FC<{ tw: Tower; ground: number; p: number; near: boolean; t: number }> = ({ tw, ground, p, near, t }) => {
  if (p <= 0) return null;
  const hh = tw.h * pr(p, 0, 1, EO);
  const top = ground - hh;
  const colW = 16;
  const rowH = 24;
  const cols = Math.max(2, Math.floor((tw.w - 16) / colW));
  const rows = Math.max(0, Math.floor((hh - 24) / rowH));
  const x0 = tw.x + (tw.w - cols * colW) / 2 + 3;
  return (
    <g opacity={p}>
      <rect x={tw.x} y={top} width={tw.w} height={hh} fill={near ? "#0e131a" : "#161e29"} stroke={near ? "#1d2633" : "none"} strokeWidth={1.5} />
      {near && tw.roof > 0.55 ? <rect x={tw.x + tw.w * 0.2} y={top - 16} width={tw.w * 0.3} height={16} fill="#0e131a" stroke="#1d2633" strokeWidth={1.5} /> : null}
      {near && tw.roof < 0.25 ? <line x1={tw.x + tw.w * 0.7} x2={tw.x + tw.w * 0.7} y1={top} y2={top - 46} stroke="#2a3442" strokeWidth={3} /> : null}
      {near && tw.roof < 0.25 ? <circle cx={tw.x + tw.w * 0.7} cy={top - 48} r={3.5} fill={C.red} opacity={0.5 + 0.5 * Math.sin(t * 3 + tw.seed)} /> : null}
      {Array.from({ length: rows * cols }).map((_, j) => {
        const r = Math.floor(j / cols);
        const c = j % cols;
        const k = random(`${near ? "n" : "f"}win${tw.seed}-${j}`);
        const on = near ? k > 0.8 : k > 0.93;
        if (!on) return null;
        const warm = random(`${near ? "n" : "f"}wc${tw.seed}-${j}`) > 0.3;
        return <rect key={j} x={x0 + c * colW} y={top + 14 + r * rowH} width={colW - 6} height={10} rx={1} fill={warm ? "#ffd9a0" : "#bfe6ff"} opacity={near ? 0.34 : 0.14} />;
      })}
    </g>
  );
};

export const Skyline: React.FC<{ t: number; open: number; ground: number; dawn: number }> = ({ t, open, ground, dawn }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: ground - 560,
        height: 600,
        opacity: open,
        background: `linear-gradient(180deg, transparent 0%, rgba(70,105,160,${0.08 + 0.05 * dawn}) 50%, rgba(240,170,110,${0.09 * dawn}) 92%, rgba(240,170,110,${0.03 * dawn}) 100%)`,
      }}
    />
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      {FAR.map((tw, k) => (
        <TowerG key={`f${k}`} tw={tw} ground={ground} near={false} t={t} p={clamp01(open * 1.5 - (Math.abs(tw.x + tw.w / 2 - 960) / 1000) * 0.6)} />
      ))}
      {NEAR.map((tw, k) => (
        <TowerG key={`n${k}`} tw={tw} ground={ground} near t={t} p={clamp01(open * 1.6 - 0.2 - (Math.abs(tw.x + tw.w / 2 - 960) / 1000) * 0.9)} />
      ))}
      <rect x={0} y={ground} width={1920} height={1080 - ground} fill="#0a0e13" opacity={open} />
      <line x1={0} x2={1920} y1={ground} y2={ground} stroke="rgba(244,240,232,0.18)" strokeWidth={2} opacity={open} />
    </svg>
  </div>
);

// ── A walking person: head, body, swinging arms and legs; optional phone glow or laptop bag. Feet at the bottom. ──
export const Walker: React.FC<{ h: number; t: number; speed?: number; color?: string; phone?: boolean; bag?: boolean; phase?: number }> = ({
  h,
  t,
  speed = 1,
  color = "#56606e",
  phone,
  bag,
  phase = 0,
}) => {
  const a = speed === 0 ? 0 : Math.sin(t * 6 * speed + phase);
  const leg = 11 * a;
  const arm = 9 * a;
  return (
    <svg width={h * 0.42} height={h} viewBox="0 0 42 100" style={{ display: "block", overflow: "visible" }}>
      <line x1={21} y1={60} x2={21 + leg} y2={98} stroke={color} strokeWidth={8} strokeLinecap="round" />
      <line x1={21} y1={60} x2={21 - leg} y2={98} stroke={color} strokeWidth={8} strokeLinecap="round" opacity={0.85} />
      <rect x={11} y={25} width={20} height={38} rx={9} fill={color} />
      {!phone ? <line x1={21} y1={30} x2={21 - arm} y2={58} stroke={color} strokeWidth={6} strokeLinecap="round" opacity={0.9} /> : null}
      <line x1={21} y1={30} x2={phone ? 33 : 21 + arm} y2={phone ? 38 : 58} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <circle cx={21} cy={13} r={10} fill={color} />
      {phone ? (
        <g>
          <circle cx={34} cy={30} r={13} fill={C.cyan} opacity={0.22} />
          <rect x={31} y={26} width={7} height={11} rx={1.5} fill={C.cyan} />
        </g>
      ) : null}
      {bag ? <rect x={3} y={34} width={10} height={22} rx={3} fill="#2c3440" /> : null}
    </svg>
  );
};

// ── The crowd: a far row (smaller, dimmer) and a near row. On each cue a few "?" bubbles pop over heads. ──
export const Crowd: React.FC<{ t: number; ground: number; open: number; asks: number[] }> = ({ t, ground, open, asks }) => {
  const rows = [
    { n: 18, h: 84, y: ground + 92, dim: 0.65, tag: "b" },
    { n: 14, h: 128, y: ground + 182, dim: 1, tag: "a" },
  ];
  const shades = ["#4a5462", "#56606e", "#3f4855", "#5d6776", "#4f5a6a"];
  let q = 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: open }}>
      {rows.map((row) =>
        Array.from({ length: row.n }).map((_, i) => {
          const dir = random(`${row.tag}d${i}`) > 0.5 ? 1 : -1;
          const sp = 0.6 + random(`${row.tag}s${i}`) * 0.6;
          const base = ((i + 0.3 + random(`${row.tag}j${i}`) * 0.4) / row.n) * 2000 - 40;
          const x = base + dir * t * 26 * sp;
          const qi = q++;
          const ask = asks[qi % asks.length] + Math.floor(qi / asks.length) * 0.06;
          const pop = pr(t, ask, 0.42, EBACK);
          const gold = qi % 4 === 0;
          const shade = shades[(i + (row.tag === "a" ? 2 : 0)) % shades.length];
          const bubble = gold ? C.gold : "rgba(244,240,232,0.92)";
          return (
            <div key={`${row.tag}${i}`} style={{ position: "absolute", left: x, top: row.y - row.h, opacity: row.dim }}>
              <div style={{ transform: dir < 0 ? "scaleX(-1)" : undefined }}>
                <Walker h={row.h} t={t} speed={sp} color={shade} phone={random(`${row.tag}p${i}`) > 0.7} bag={random(`${row.tag}b${i}`) > 0.6} phase={i * 1.3} />
              </div>
              {pop > 0 && (row.tag === "a" || i % 2 === 0) ? (
                <div
                  style={{
                    position: "absolute",
                    left: row.h * 0.21,
                    top: -row.h * 0.42,
                    transform: `translate(-50%, ${(1 - pop) * 10}px) scale(${pop})`,
                    width: row.h * 0.36,
                    height: row.h * 0.34,
                    borderRadius: row.h * 0.1,
                    background: bubble,
                    color: C.ink,
                    fontFamily: FONT,
                    fontWeight: 900,
                    fontSize: row.h * 0.26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: Math.min(1, pop),
                  }}
                >
                  ?
                  <div
                    style={{
                      position: "absolute",
                      left: "38%",
                      bottom: -row.h * 0.06,
                      width: 0,
                      height: 0,
                      borderLeft: `${row.h * 0.05}px solid transparent`,
                      borderRight: `${row.h * 0.05}px solid transparent`,
                      borderTop: `${row.h * 0.07}px solid ${bubble}`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        }),
      )}
    </div>
  );
};

// ── The AI data hall as a room full of graphics cards (2 × 5). Card i lights up as lit[i] goes 0 → 1. ──
export const GpuHall: React.FC<{ w: number; h: number; t: number; lit: number[]; title?: string }> = ({ w, h, t, lit, title = "AI 数据中心" }) => {
  const on = lit.filter((x) => x > 0).length;
  const cw = (w - 80) / 5;
  const ch = (h - 92) / 2;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", left: -80, right: -80, top: 10, bottom: -60, background: `radial-gradient(ellipse at 50% 60%, rgba(77,212,255,${0.05 + 0.03 * on}) 0%, transparent 65%)` }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
          border: `1px solid ${C.glassLine}`,
          boxShadow: "0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      />
      <div style={{ position: "absolute", left: 30, top: 18, fontFamily: FONT, fontSize: 30, fontWeight: 900, color: C.fg, letterSpacing: 2, whiteSpace: "nowrap" }}>
        {title} <span style={{ color: C.cyan, fontSize: 21, fontWeight: 700, letterSpacing: 1 }}>● {on > 0 ? "运行中" : "待机"}</span>
      </div>
      {Array.from({ length: 10 }).map((_, i) => {
        const g = clamp01(lit[i] ?? 0);
        return (
          <div key={i} style={{ position: "absolute", left: 40 + (i % 5) * cw + (cw - 210) / 2, top: 74 + Math.floor(i / 5) * ch + (ch - 88) / 2 }}>
            <Gpu w={210} t={t} glow={g} spin={0.3 + 0.7 * g} id={`hall${i}`} />
          </div>
        );
      })}
    </div>
  );
};

// Where card i of the hall sits (its centre), for the memory streams.
export const hallSlot = (i: number, w: number, h: number) => {
  const cw = (w - 80) / 5;
  const ch = (h - 92) / 2;
  return { x: 40 + (i % 5) * cw + cw / 2, y: 74 + Math.floor(i / 5) * ch + ch / 2 };
};

// ── The data centre as a building on the skyline: a wide block, a lit glass front showing rows of cards, cooling fans
// on the roof and a glowing sign. Feet on the ground; w × h. ──
export const DcBuilding: React.FC<{ w: number; h: number; t: number; o: number }> = ({ w, h, t, o }) => (
  <div style={{ position: "relative", width: w, height: h, opacity: o }}>
    <div style={{ position: "absolute", left: -160, right: -160, top: -60, bottom: -10, background: "radial-gradient(ellipse at 50% 70%, rgba(77,212,255,0.22) 0%, transparent 62%)" }} />
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const cx = 50 + i * ((w - 100) / 5);
        const a = (t * 400 + i * 50) % 360;
        return (
          <g key={i}>
            <rect x={cx - 26} y={0} width={52} height={22} rx={4} fill="#18202a" stroke="#2a3443" strokeWidth={2} />
            <g transform={`rotate(${a} ${cx} 11)`}>
              <line x1={cx - 9} y1={11} x2={cx + 9} y2={11} stroke="#3c4757" strokeWidth={3} />
              <line x1={cx} y1={2} x2={cx} y2={20} stroke="#3c4757" strokeWidth={3} />
            </g>
          </g>
        );
      })}
      <rect x={0} y={22} width={w} height={h - 22} rx={6} fill="#121a24" stroke="#2a3646" strokeWidth={2} />
      <rect x={20} y={50} width={w - 40} height={h - 92} rx={4} fill="#0c1520" stroke="rgba(77,212,255,0.45)" strokeWidth={2} />
      {Array.from({ length: 3 * 10 }).map((_, j) => {
        const r = Math.floor(j / 10);
        const c = j % 10;
        const pw = (w - 40) / 10;
        const ph = (h - 92) / 3;
        const lit = Math.sin(t * 2.4 + j * 1.7) > -0.6;
        return (
          <g key={j}>
            <rect x={20 + c * pw + 4} y={50 + r * ph + 4} width={pw - 8} height={ph - 8} rx={2} fill={`rgba(77,212,255,${lit ? 0.16 : 0.08})`} />
            <circle cx={20 + c * pw + pw * 0.35} cy={50 + r * ph + ph / 2} r={ph * 0.18} fill="none" stroke="rgba(166,236,255,0.5)" strokeWidth={1.5} />
            <circle cx={20 + c * pw + pw * 0.68} cy={50 + r * ph + ph / 2} r={ph * 0.18} fill="none" stroke="rgba(166,236,255,0.5)" strokeWidth={1.5} />
          </g>
        );
      })}
      <rect x={w / 2 - 34} y={h - 40} width={68} height={40} fill="#0a1018" stroke="#2a3646" strokeWidth={2} />
    </svg>
    <div style={{ position: "absolute", left: 0, right: 0, top: 26, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 18, letterSpacing: 4, color: C.cyan, textShadow: `0 0 12px ${C.cyan}`, whiteSpace: "nowrap" }}>
      AI 数据中心
    </div>
  </div>
);

// ── The chat box (no brand): an empty window, a blinking cursor, then 你好 and the reply typing in. ──
export const ChatBox: React.FC<{
  t: number;
  w: number;
  h: number;
  userAt?: number;
  replyAt?: number;
  user?: string;
  reply?: string;
  cursor?: boolean;
}> = ({ t, w, h, userAt = Infinity, replyAt = Infinity, user = "你好", reply = "你好！有什么可以帮你的？", cursor = true }) => {
  const uN = Math.floor(clamp01((t - userAt) / 0.5) * Array.from(user).length + 0.0001);
  const sent = t >= userAt + 0.7;
  const rN = Math.floor(clamp01((t - replyAt) / 1.3) * Array.from(reply).length + 0.0001);
  const blink = Math.floor(t * 2.2) % 2 === 0;
  const typingUser = t >= userAt && !sent;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: 28,
        background: "linear-gradient(170deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025) 60%)",
        border: `1px solid ${C.glassLine}`,
        boxShadow: `0 50px 110px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 120px rgba(77,212,255,0.08)`,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {sent ? (
        <div style={{ position: "absolute", right: 36, top: 36, padding: "12px 24px", borderRadius: 20, background: "rgba(77,212,255,0.16)", border: "1px solid rgba(77,212,255,0.35)", color: C.fg, fontSize: 34, fontWeight: 700 }}>
          {user}
        </div>
      ) : null}
      {rN > 0 ? (
        <div style={{ position: "absolute", left: 36, top: 120, maxWidth: w - 140, padding: "12px 24px", borderRadius: 20, background: "rgba(244,240,232,0.08)", color: C.fg, fontSize: 34, fontWeight: 600, whiteSpace: "nowrap" }}>
          {Array.from(reply).slice(0, rN).join("")}
          {rN < Array.from(reply).length ? <span style={{ color: C.cyan }}>▍</span> : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 28, right: 28, bottom: 28, height: 78, borderRadius: 39, background: "rgba(0,0,0,0.35)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 30px" }}>
        <span style={{ fontSize: 32, fontWeight: 600, color: typingUser ? C.fg : C.muted, whiteSpace: "nowrap" }}>
          {typingUser ? Array.from(user).slice(0, uN).join("") : t < userAt ? "" : ""}
        </span>
        {cursor && (typingUser || t < userAt || sent) && blink ? <span style={{ width: 3, height: 38, background: C.fg, marginLeft: 4, opacity: 0.9 }} /> : null}
        {t < userAt && !typingUser ? <span style={{ fontSize: 30, color: C.muted, marginLeft: 12, opacity: 0.6 }}>发送消息</span> : null}
        <div style={{ flex: 1 }} />
        <div style={{ width: 52, height: 52, borderRadius: 26, background: typingUser ? C.fg : "rgba(244,240,232,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 22 22">
            <path d="M11,18 L11,4 M5,10 L11,4 L17,10" stroke={typingUser ? C.bg : C.muted} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// ── A light streak flying from (x0,y0) to (x1,y1) over progress p, with a soft tail. ──
export const Streak: React.FC<{ p: number; x0: number; y0: number; x1: number; y1: number; color: string; bend?: number }> = ({ p, x0, y0, x1, y1, color, bend = -120 }) => {
  if (p <= 0 || p >= 1) return null;
  const pts = Array.from({ length: 12 }).map((_, i) => {
    const q = clamp01(p - i * 0.025);
    const x = lerp(x0, x1, q);
    const y = lerp(y0, y1, q) + Math.sin(q * Math.PI) * bend;
    return { x, y, a: 1 - i / 12 };
  });
  return (
    <>
      {pts.map((pt, i) => (
        <div key={i} style={{ position: "absolute", left: pt.x - (10 - i * 0.6), top: pt.y - (10 - i * 0.6), width: 2 * (10 - i * 0.6), height: 2 * (10 - i * 0.6), borderRadius: "50%", background: color, opacity: pt.a * clamp01((1 - p) * 8), boxShadow: i === 0 ? `0 0 30px ${color}` : undefined }} />
      ))}
    </>
  );
};

export const DateTag: React.FC<{ text: string; o: number }> = ({ text, o }) => (
  <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, letterSpacing: 6, color: C.sub, opacity: o, whiteSpace: "nowrap" }}>{text}</div>
);
