import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { BRUSH, FONT, K, PEN, SANS, SERIF } from "../theme";
import { Orb } from "../Press";
import { D0, R, SURFACE, StackEvent, StackFrame, rnd } from "./stack";

export const W = 1920;
export const H = 1080;
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.inOut(Easing.cubic);
export const fps = 30;
export const s2f = (s: number) => Math.round(s * fps);

// ---------- text ----------

// One line of on-screen text. `gold` marks the part that carries the point.
export const Say: React.FC<{
  f: number;
  at: number;
  out?: number;
  text: string;
  gold?: string;
  size?: number;
  top: number;
  left?: number; // when set the line is left-aligned at this x, otherwise centred
  weight?: number;
  serif?: boolean;
  dim?: number;
}> = ({ f, at, out = 1e9, text, gold, size = 76, top, left, weight = 700, serif = true, dim = 1 }) => {
  const k = interpolate(f, [at, at + 9, out, out + 8], [0, 1, 1, 0], { ...CL, easing: EO });
  if (k <= 0) return null;
  const parts = gold && text.includes(gold) ? text.split(gold) : [text];
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: left ?? 0,
        right: left === undefined ? 0 : undefined,
        textAlign: left === undefined ? "center" : "left",
        fontFamily: serif ? SERIF : SANS,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: serif ? size * 0.07 : 1,
        color: K.fg,
        opacity: k * dim,
        transform: `translateY(${(1 - k) * 12}px)`,
        textShadow: "0 2px 24px rgba(0,0,0,0.6)",
        whiteSpace: "nowrap",
      }}
    >
      {parts.length === 2 ? (
        <>
          {parts[0]}
          <span style={{ color: K.gold }}>{gold}</span>
          {parts[1]}
        </>
      ) : (
        text
      )}
    </div>
  );
};

export const Src: React.FC<{ f: number; at: number; out?: number; text: string }> = ({ f, at, out = 1e9, text }) => {
  const k = interpolate(f, [at, at + 12, out, out + 10], [0, 1, 1, 0], CL);
  if (k <= 0) return null;
  return <div style={{ position: "absolute", left: 48, bottom: 40, fontFamily: SANS, fontWeight: 500, fontSize: 24, color: K.muted, opacity: 0.85 * k }}>{text}</div>;
};

// ---------- frame dressing ----------

export const Dressing: React.FC<{ brand?: number }> = ({ brand = 1 }) => (
  <>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.07, mixBlendMode: "overlay" }} />
    {brand > 0 && (
      <div style={{ position: "absolute", left: 44, top: 34, display: "flex", alignItems: "center", gap: 12, opacity: 0.7 * brand }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 44, height: 44 }} />
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.fg, letterSpacing: 2 }}>世界的形状</span>
      </div>
    )}
  </>
);

// ---------- cards: the voices as things with weight ----------

export type CardKind = "notice" | "teacher" | "parent" | "timetable" | "banner" | "rank" | "app";
export type CardSpec = { kind: CardKind; text: string; size?: number; icon?: string; iconBg?: string; sub?: string };

const PAPER_EDGE =
  "polygon(0% 6%, 3% 0%, 9% 4%, 16% 1%, 24% 5%, 33% 0%, 41% 4%, 50% 1%, 58% 5%, 67% 0%, 75% 4%, 84% 1%, 92% 5%, 97% 0%, 100% 6%, 100% 94%, 97% 100%, 91% 96%, 83% 100%, 74% 95%, 66% 100%, 57% 96%, 49% 100%, 40% 95%, 32% 100%, 23% 96%, 15% 100%, 8% 95%, 2% 100%, 0% 94%)";

export const cardH = (c: CardSpec) => {
  const s = c.size ?? 52;
  if (c.kind === "timetable") return Math.round(s * 5.2);
  if (c.kind === "app") return Math.round(s * 2.1);
  return Math.round(s * 1.7);
};

const NoticeBox: React.FC<{ h: number; s: number; children: React.ReactNode; icon?: React.ReactNode }> = ({ h, s, children, icon }) => (
  <div
    style={{
      height: h,
      padding: `0 ${s * 0.6}px 0 ${s * 0.32}px`,
      display: "flex",
      alignItems: "center",
      gap: s * 0.32,
      whiteSpace: "nowrap",
      borderRadius: Math.min(h * 0.32, 34),
      background: "linear-gradient(180deg, rgba(58,62,72,0.94), rgba(36,39,46,0.94))",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: "0 10px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: s * 0.92,
      color: "#f3f5f8",
      letterSpacing: 1,
    }}
  >
    {icon}
    {children}
  </div>
);

const OrbIcon: React.FC<{ h: number }> = ({ h }) => (
  <div style={{ width: h * 0.56, height: h * 0.56, borderRadius: h * 0.15, flexShrink: 0, background: "linear-gradient(140deg, #3b4150, #1d2028)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: h * 0.26, height: h * 0.26, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #fff, #ffc77d 60%, #e98c43)" }} />
  </div>
);

export const Card: React.FC<{ c: CardSpec }> = ({ c }) => {
  const s = c.size ?? 52;
  const h = cardH(c);
  if (c.kind === "notice") return <NoticeBox h={h} s={s} icon={<OrbIcon h={h} />}>{c.text}</NoticeBox>;
  if (c.kind === "app")
    return (
      <div style={{ height: h, padding: `0 ${s * 0.6}px 0 ${s * 0.36}px`, display: "flex", alignItems: "center", gap: s * 0.36, whiteSpace: "nowrap", borderRadius: 34, background: "linear-gradient(180deg, rgba(58,62,72,0.94), rgba(36,39,46,0.94))", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 10px 24px rgba(0,0,0,0.5)", fontFamily: SANS, color: "#f3f5f8" }}>
        <div style={{ width: h * 0.5, height: h * 0.5, borderRadius: h * 0.13, flexShrink: 0, background: c.iconBg ?? "#ff4d5e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: h * 0.26, fontWeight: 700, color: "#fff" }}>{c.icon ?? ""}</div>
        <div>
          <div style={{ fontSize: s * 0.52, opacity: 0.7, fontWeight: 500 }}>{c.sub}</div>
          <div style={{ fontSize: s * 0.9, fontWeight: 700 }}>{c.text}</div>
        </div>
      </div>
    );
  if (c.kind === "teacher" || c.kind === "parent")
    return (
      <div
        style={{
          height: h,
          padding: `0 ${s * 0.62}px`,
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          clipPath: PAPER_EDGE,
          background: c.kind === "teacher" ? "repeating-linear-gradient(180deg, #ece6d7 0px, #ece6d7 27px, rgba(120,150,190,0.35) 28px, #ece6d7 29px), #ece6d7" : "linear-gradient(170deg, #f0dc95, #e3c773)",
          fontFamily: c.kind === "teacher" ? PEN : BRUSH,
          fontSize: s * (c.kind === "teacher" ? 1.08 : 1.02),
          color: c.kind === "teacher" ? K.ink : "#3b2e1f",
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
        }}
      >
        {c.text}
      </div>
    );
  if (c.kind === "banner")
    return (
      <div style={{ height: h, padding: `0 ${s * 0.8}px`, display: "flex", alignItems: "center", whiteSpace: "nowrap", background: "linear-gradient(180deg,#b3221c,#8e1712)", fontFamily: SERIF, fontWeight: 700, fontSize: s, color: "#ffe9a8", letterSpacing: s * 0.12, boxShadow: "0 8px 18px rgba(0,0,0,0.5)" }}>{c.text}</div>
    );
  if (c.kind === "rank")
    return (
      <div style={{ height: h, padding: `0 ${s * 0.6}px`, display: "flex", alignItems: "center", gap: s * 0.5, whiteSpace: "nowrap", background: "#f4f1ea", fontFamily: SANS, fontWeight: 700, fontSize: s * 0.85, color: "#222", boxShadow: "0 6px 14px rgba(0,0,0,0.45)" }}>
        {c.text}
        <span style={{ color: K.ink }}>{c.sub}</span>
      </div>
    );
  // timetable
  const rows = (c.text || "").split("|");
  return (
    <div style={{ height: h, width: s * 7.2, padding: `${s * 0.3}px ${s * 0.45}px`, background: "#efeadf", boxShadow: "0 8px 18px rgba(0,0,0,0.5)", fontFamily: SANS, color: "#2a2a2a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ fontWeight: 700, fontSize: s * 0.62, textAlign: "center", letterSpacing: 4 }}>{c.sub ?? "作息时间表"}</div>
      {rows.map((r, i) => {
        const [t, a] = r.split(" ");
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: s * 0.46, borderTop: "1px solid rgba(0,0,0,0.15)", paddingTop: 2 }}>
            <span style={{ fontFamily: FONT, fontWeight: 500 }}>{t}</span>
            <span>{a}</span>
          </div>
        );
      })}
    </div>
  );
};

// A card standing on its bottom-centre point.
export const Placed: React.FC<{ x: number; bottom: number; rot: number; o: number; c: CardSpec; flip?: number; flipTo?: CardSpec }> = ({ x, bottom, rot, o, c, flip = 0, flipTo }) => {
  if (o <= 0) return null;
  const layer: React.CSSProperties = { position: "absolute", left: 0, bottom: 0 };
  return (
    <div style={{ position: "absolute", left: x, top: bottom, width: 0, height: 0, transform: `rotate(${rot}deg)`, opacity: o }}>
      {flip < 0.5 || !flipTo ? (
        <div style={{ ...layer, transform: `translate(-50%, 0) scaleY(${Math.cos(flip * Math.PI)})` }}>
          <Card c={c} />
        </div>
      ) : (
        <div style={{ ...layer, transform: `translate(-50%, 0) scaleY(${-Math.cos(flip * Math.PI)})` }}>
          <Card c={flipTo} />
        </div>
      )}
    </div>
  );
};

// ---------- the night water ----------

export const STARS = Array.from({ length: 80 }, (_, i) => ({ x: rnd(i * 3.1) * 2400 - 240, y: rnd(i * 7.7) * 900 - 300, r: 0.6 + rnd(i * 1.9) * 1.4, p: rnd(i * 5.3) * 6 }));

export type Ripple = { f: number; x: number; p: number };
export const ripplesFrom = (ev: StackEvent[], x: number): Ripple[] =>
  ev.filter((e) => e.kind !== "vanish").map((e) => ({ f: e.f, x, p: e.kind === "land" ? 0.45 : e.kind === "release" ? 0.3 : 1 + (e.power ?? 0) }));

const WaterLine: React.FC<{ f: number; ripples: Ripple[]; lights: { x: number; d: number }[] }> = ({ f, ripples, lights }) => {
  const pts: string[] = [];
  for (let x = -300; x <= W + 300; x += 12) {
    let y = SURFACE + Math.sin(x / 140 + f / 22) * 1.6 + Math.sin(x / 61 - f / 15) * 0.9;
    ripples.forEach((r) => {
      const t = f - r.f;
      if (t <= 0 || t > 90) return;
      const dist = Math.abs(x - r.x);
      const front = t * 7;
      y += Math.sin((dist - front) / 18) * Math.exp(-Math.abs(dist - front) / 60) * 7 * r.p * (1 - t / 90);
    });
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return (
    <>
      <svg width={W + 600} height={1} style={{ position: "absolute", left: -300, top: 0, overflow: "visible" }} viewBox={`-300 0 ${W + 600} 1`}>
        <defs>
          <linearGradient id="wl" x1="0" x2="1">
            <stop offset="0" stopColor="#b9d3ee" stopOpacity="0" />
            <stop offset="0.5" stopColor="#d7e6f5" stopOpacity="0.55" />
            <stop offset="1" stopColor="#b9d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={pts.join(" ")} fill="none" stroke="url(#wl)" strokeWidth={1.6} />
      </svg>
      {lights.map((l, i) => {
        const near = Math.exp(-Math.abs(l.d) / 140);
        return <div key={i} style={{ position: "absolute", left: l.x - 520, top: SURFACE - 26, width: 1040, height: 52, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(255,200,130,${0.42 * near}) 0%, rgba(255,170,90,${0.12 * near}) 40%, rgba(255,160,80,0) 70%)` }} />;
      })}
      {Array.from({ length: 26 }, (_, i) => {
        const x = ((rnd(i * 9.1) * 2200 + f * (0.3 + rnd(i) * 0.5)) % 2200) - 140;
        const y = SURFACE + 8 + rnd(i * 4.4) * 260;
        const w = 18 + rnd(i * 2.2) * 50 * (1 - (y - SURFACE) / 400);
        const o = 0.08 + 0.1 * Math.sin(f / 9 + i);
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: 1.4, borderRadius: 1, background: "rgba(200,220,245,1)", opacity: Math.max(0, o) }} />;
      })}
    </>
  );
};

export type OrbSpec = { x: number; d: number; v: number; glow?: number };

// The whole water world. `render(under)` draws the things that live in it (cards, extra props) and is called
// twice: once clipped above the line, once below it (refracted, dimmer). The camera moves the world, not the frame.
export const WaterScene: React.FC<{
  f: number;
  cam?: number; // world y offset: positive looks down into the water
  zoom?: number;
  zoomX?: number;
  zoomY?: number;
  orbs: OrbSpec[];
  ripples?: Ripple[];
  render?: (under: boolean) => React.ReactNode;
  deepTint?: number; // how dark the deep water gets (0..1)
  flareAt?: number;
  strain?: [number, number];
  skyO?: number;
}> = ({ f, cam = 0, zoom = 1, zoomX = 960, zoomY = 540, orbs, ripples = [], render, deepTint = 0.88, flareAt = -999, strain, skyO = 1 }) => {
  const aboveClip = `polygon(-3000px -3000px, 5000px -3000px, 5000px ${SURFACE}px, -3000px ${SURFACE}px)`;
  const belowClip = `polygon(-3000px ${SURFACE}px, 5000px ${SURFACE}px, 5000px 9000px, -3000px 9000px)`;
  const orbEls = (under: boolean) =>
    orbs.map((o, i) => (
      <div key={i} style={{ opacity: o.glow ?? 1 }}>
        <Orb s={{ d: o.d, v: o.v, ox: o.x }} f={f} under={under} flareAt={flareAt} strainFrom={strain ? strain[0] : -2} strainTo={strain ? strain[1] : -1} />
      </div>
    ));
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${zoomX}px ${zoomY}px` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translateY(${-cam}px)` }}>
          <div style={{ position: "absolute", left: -900, top: -2400, width: W + 1800, height: SURFACE + 2400, background: "linear-gradient(180deg, #030508 0%, #050a10 80%, #0b121a 100%)", opacity: skyO }} />
          {STARS.map((st, i) => (
            <div key={i} style={{ position: "absolute", left: st.x, top: st.y + cam * 0.75, width: st.r * 2, height: st.r * 2, borderRadius: "50%", background: "#dfe8f5", opacity: (0.22 + 0.18 * Math.sin(f / 14 + st.p)) * skyO }} />
          ))}
          <div style={{ position: "absolute", left: -900, top: SURFACE, width: W + 1800, height: 9000, background: `linear-gradient(180deg, #0a1620 0px, ${K.water} 140px, ${K.waterDeep} 700px, #02050a 9000px)` }} />
          <div style={{ position: "absolute", inset: 0, clipPath: aboveClip }}>
            {render?.(false)}
            {orbEls(false)}
          </div>
          <div style={{ position: "absolute", inset: 0, clipPath: belowClip }}>
            <div style={{ position: "absolute", inset: 0, filter: "blur(1.3px) saturate(0.8)", transform: `skewX(${Math.sin(f / 13) * 0.8}deg)`, transformOrigin: `50% ${SURFACE}px` }}>
              <div style={{ position: "absolute", inset: 0, transform: `translateY(${2 * SURFACE}px) scaleY(-0.85)`, transformOrigin: "50% 0", opacity: 0.28, filter: "blur(3px)" }}>
                {orbs.filter((o) => o.d < -R * 0.2).map((o, i) => (
                  <Orb key={i} s={{ d: o.d, v: o.v, ox: o.x }} f={f} under={false} flareAt={flareAt}  strainFrom={-2} strainTo={-1} />
                ))}
              </div>
              {render?.(true)}
              {orbEls(true)}
            </div>
            <div style={{ position: "absolute", left: -900, top: SURFACE, width: W + 1800, height: 9000, background: `linear-gradient(180deg, rgba(8,22,34,0.30) 0px, rgba(4,12,20,0.55) 150px, rgba(2,6,10,${deepTint}) 360px, rgba(2,6,10,${deepTint}) 9000px)` }} />
            {orbs.map((o, i) => (
              <div key={i} style={{ position: "absolute", left: o.x - 700, top: SURFACE + o.d - 500, width: 1400, height: 1000, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(255,170,90,${0.16 * Math.exp(-Math.max(0, o.d - D0) / 500) * (o.glow ?? 1)}) 0%, rgba(120,150,190,0.05) 35%, rgba(0,0,0,0) 65%)` }} />
            ))}
          </div>
          <WaterLine f={f} ripples={ripples} lights={orbs.map((o) => ({ x: o.x, d: o.d }))} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Cards of a stack simulation, drawn in the water world.
export const StackCards: React.FC<{ fr: StackFrame; specs: CardSpec[]; flips?: number[]; flipTo?: CardSpec[] }> = ({ fr, specs, flips, flipTo }) => (
  <>
    {fr.cards.map((s, i) =>
      s.o > 0 ? <Placed key={i} x={s.x} bottom={s.bottom} rot={s.rot} o={s.o} c={specs[i]} flip={flips?.[i] ?? 0} flipTo={flipTo?.[i]} /> : null,
    )}
  </>
);

// Glowing motes for a card that dissolves.
export const Motes: React.FC<{ f: number; at: number; x: number; y: number; n?: number }> = ({ f, at, x, y, n = 28 }) => {
  const t = f - at;
  if (t < 0 || t > 60) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = rnd(i * 3.3 + at) * Math.PI * 2;
        const sp = 1 + rnd(i * 7.1 + at) * 3.5;
        const px = x + (rnd(i * 1.7) - 0.5) * 260 + Math.cos(a) * sp * t;
        const py = y + (rnd(i * 2.9) - 0.5) * 50 + Math.sin(a) * sp * t * 0.6 - t * 0.8;
        const o = interpolate(t, [0, 6, 60], [0, 0.9, 0], CL);
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 4, height: 4, borderRadius: "50%", background: "#ffe2b0", boxShadow: "0 0 8px rgba(255,200,130,0.9)", opacity: o }} />;
      })}
    </>
  );
};
