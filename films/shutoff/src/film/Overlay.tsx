// Everything drawn over the 3D picture: 2.39:1 letterbox, the brand mark, trailer cards, the title, the two fact
// cards, the last notification and the end card. No scale animations on text (multi-tab renders), only opacity
// and small translations.
import React from "react";
import { Img, staticFile } from "remotion";
import { SANS, SERIF } from "../engine/fonts";
import { clamp, ease, easeOut, lerp, spring } from "../engine/util";
import { revealQuad } from "../engine/phone";
import { CHAT_T0 } from "./cut";
import { CARDS, CREDITS, Card } from "./text";

const BAR = 138; // (1080 - 1920/2.39) / 2

const fadeIO = (t: number, c: Card, i = 0.35, o = 0.35) => clamp((t - c.t0) / i) * clamp((c.t1 - t) / o);

const Orb: React.FC<{ s: number }> = ({ s }) => (
  <div style={{ width: s, height: s, borderRadius: s * 0.24, background: "linear-gradient(#14243a, #070d18)", position: "relative", flex: "none" }}>
    <div
      style={{
        position: "absolute", left: s * 0.08, top: s * 0.08, width: s * 0.84, height: s * 0.84, borderRadius: "50%",
        background: "radial-gradient(circle, #fff 0%, rgba(214,244,255,0.95) 28%, rgba(90,200,235,0.45) 55%, rgba(40,120,200,0) 100%)",
      }}
    />
  </div>
);

const Banner: React.FC<{ body: string; y: number; a: number }> = ({ body, y, a }) => (
  <div
    style={{
      position: "absolute", left: 460, width: 1000, top: y, opacity: a, borderRadius: 40, background: "rgba(46,51,61,0.94)",
      border: "2px solid rgba(255,255,255,0.08)", padding: "30px 40px 36px", boxSizing: "border-box", fontFamily: SANS, color: "#fff",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <Orb s={56} />
      <div style={{ fontSize: 34, fontWeight: 600, flex: 1 }}>安</div>
      <div style={{ fontSize: 30, color: "rgba(255,255,255,0.5)" }}>现在</div>
    </div>
    <div style={{ fontSize: 58, fontWeight: 500, marginTop: 18, letterSpacing: "0.02em" }}>{body}</div>
  </div>
);

const CardView: React.FC<{ c: Card; t: number }> = ({ c, t }) => {
  const center: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", textAlign: "center" };
  const shade = "radial-gradient(ellipse 60% 45% at 50% 50%, rgba(0,0,0,0.72), rgba(0,0,0,0.35) 60%, rgba(0,0,0,0) 100%)";
  if (c.kind === "slogan") {
    // 安's advert, as a tagline under the light show
    const a = fadeIO(t, c, 0.6, 0.4);
    const b = clamp((t - c.t0 - 0.7) / 0.6);
    return (
      <div style={{ ...center, top: BAR, bottom: BAR, justifyContent: "flex-end", paddingBottom: 64 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 70, letterSpacing: "0.2em", paddingLeft: "0.2em", opacity: a, textShadow: "0 0 30px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9)" }}>{c.lines[0]}</div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, letterSpacing: "0.4em", paddingLeft: "0.4em", marginTop: 18, color: "rgba(255,170,90,0.95)", opacity: a * b, textShadow: "0 0 16px rgba(0,0,0,0.95)" }}>{c.lines[1]}</div>
      </div>
    );
  }
  if (c.kind === "card") {
    const a = fadeIO(t, c, 0.4, 0.3);
    return (
      <div style={{ ...center, background: c.over ? shade : "#000", opacity: c.over ? a : 1 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 66, letterSpacing: "0.14em", opacity: a, transform: `translateY(${(1 - easeOut((t - c.t0) / 1.2)) * 10}px)` }}>{c.lines[0]}</div>
      </div>
    );
  }
  if (c.kind === "pre") {
    // one line on what this is: a film an AI made by writing code
    const a = clamp((c.t1 - t) / 0.4);
    const l = (d: number, dur = 0.6) => clamp((t - c.t0 - d) / dur);
    return (
      <div style={{ ...center, background: "#000", opacity: a }}>
        <div style={{ fontFamily: SERIF, fontSize: 66, fontWeight: 600, letterSpacing: "0.12em", paddingLeft: "0.12em", opacity: l(0.15, 0.7), transform: `translateY(${(1 - easeOut(l(0.15, 1.3))) * 12}px)` }}>{c.lines[0]}</div>
        <div style={{ width: 120 * easeOut(l(0.6, 0.9)), height: 2, background: "rgba(255,255,255,0.35)", margin: "40px 0 36px" }} />
        <div style={{ fontFamily: SANS, fontSize: 34, fontWeight: 500, letterSpacing: "0.3em", paddingLeft: "0.3em", color: "rgba(255,255,255,0.6)", opacity: l(0.9) }}>{c.lines[1]}</div>
        {c.lines[2] && <div style={{ position: "absolute", bottom: BAR + 70, fontFamily: SANS, fontSize: 28, fontWeight: 400, letterSpacing: "0.16em", paddingLeft: "0.16em", color: "rgba(255,255,255,0.45)", opacity: l(1.25) }}>{c.lines[2]}</div>}
      </div>
    );
  }
  if (c.kind === "name") {
    const a = fadeIO(t, c, 0.4, 0.35);
    const b = clamp((t - c.t0 - 1.05) / 0.5);
    return (
      <div style={{ ...center, background: c.over ? shade : "#000" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 62, letterSpacing: "0.14em", opacity: a, color: "rgba(255,255,255,0.88)" }}>{c.lines[0]}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 92, letterSpacing: "0.2em", paddingLeft: "0.2em", marginTop: 34, opacity: a * b, transform: `translateY(${(1 - easeOut(b)) * 10}px)` }}>{c.lines[1]}</div>
      </div>
    );
  }
  if (c.kind === "credits") {
    // two still pages, long enough to read, each fading in and out on black
    const rowH = 68;
    const blockH = 300;
    const brk = CREDITS.findIndex(([r]) => r === "/");
    const pages = [CREDITS.slice(0, brk), CREDITS.slice(brk + 1)];
    const half = (c.t1 - c.t0) / 2;
    const pg = t < c.t0 + half ? 0 : 1;
    const p0 = c.t0 + pg * half;
    const a = clamp((t - p0) / 0.5) * clamp((p0 + half - t) / 0.5);
    const rows = pages[pg];
    return (
      <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", opacity: a }}>
          {rows.map(([role, name], i) =>
            role === "#" ? (
              <div key={i} style={{ height: blockH, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: SANS, fontSize: 34, letterSpacing: "0.6em", paddingLeft: "0.6em", color: "rgba(255,255,255,0.6)", marginBottom: 30 }}>出品</div>
                <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                  <Img src={staticFile("brand/mark-disc.png")} style={{ width: 96, height: 96 }} />
                  <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 80, letterSpacing: "0.12em", color: "#fff" }}>{name}</div>
                </div>
                <div style={{ fontFamily: SANS, fontSize: 34, letterSpacing: "0.2em", marginTop: 28, color: "rgba(255,255,255,0.7)" }}>MakerJackie</div>
              </div>
            ) : role === "*" ? (
              <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 600, fontSize: (pg === 0 && i === 0) ? 64 : 38, letterSpacing: (pg === 0 && i === 0) ? "0.4em" : "0.12em", color: (pg === 0 && i === 0) ? "#fff" : "rgba(255,255,255,0.75)" }}>{name}</div>
            ) : (
              <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", fontFamily: SANS, fontSize: 38 }}>
                <div style={{ width: 920, paddingRight: 40, textAlign: "right", color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", boxSizing: "border-box" }}>{role}</div>
                <div style={{ flex: 1, color: "rgba(255,255,255,0.92)", letterSpacing: "0.06em", fontSize: name.startsWith("《") ? 31 : 38 }}>{name}</div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }
  if (c.kind === "word") {
    const a = fadeIO(t, c, 0.3, 0.3);
    return (
      <div style={{ ...center, top: BAR, bottom: BAR, justifyContent: "flex-end", paddingBottom: 70 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: c.lines[0].length > 3 ? 64 : 84, letterSpacing: c.lines[0].length > 3 ? "0.14em" : "0.6em", paddingLeft: c.lines[0].length > 3 ? 0 : "0.6em", opacity: a, textShadow: "0 0 40px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.8)" }}>
          {c.lines[0]}
        </div>
      </div>
    );
  }
  if (c.kind === "date") {
    const a = fadeIO(t, c, 0.25, 0.25);
    const b = clamp((t - c.t0 - 0.9) / 0.15);
    return (
      <div style={{ ...center, background: "#000" }}>
        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 44, letterSpacing: "0.3em", color: "rgba(255,255,255,0.7)", opacity: a }}>{c.lines[0]}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 130, letterSpacing: "0.5em", paddingLeft: "0.5em", marginTop: 26, opacity: a * b }}>{c.lines[1]}</div>
      </div>
    );
  }
  if (c.kind === "title") {
    // the title stutters on like a failing light, then holds
    const k = t - c.t0;
    const flick = k < 0.5 ? ([0, 1, 0, 0, 1, 0.3, 1, 1, 0, 1, 1, 1, 1, 1, 1][Math.floor(k * 30)] ?? 1) : 1;
    const a = flick * clamp((c.t1 - t) / 0.6);
    return (
      <div style={{ ...center, background: "#000" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 230, letterSpacing: "0.32em", paddingLeft: "0.32em", opacity: a, textShadow: "0 0 60px rgba(150,200,255,0.25)" }}>{c.lines[0]}</div>
      </div>
    );
  }
  if (c.kind === "fact") {
    const a = fadeIO(t, c, 0.5, 0.4);
    const l = (i: number) => clamp((t - c.t0 - 0.2 - i * 1.0) / 0.5);
    return (
      <div style={{ ...center, background: "#000", gap: 18 }}>
        <div style={{ fontFamily: SANS, fontSize: 50, fontWeight: 400, opacity: a * l(0), color: "rgba(255,255,255,0.85)" }}>{c.lines[0]}</div>
        <div style={{ fontFamily: SANS, fontSize: 50, fontWeight: 400, opacity: a * l(1), color: "rgba(255,255,255,0.85)" }}>{c.lines[1]}</div>
        <div style={{ fontFamily: SANS, fontSize: 64, fontWeight: 700, opacity: a * l(2.4), marginTop: 22 }}>{c.lines[2]}</div>
        <div style={{ position: "absolute", bottom: BAR + 40, fontFamily: SANS, fontSize: 30, color: "rgba(255,255,255,0.45)", opacity: a * l(2.4) }}>{c.src}</div>
      </div>
    );
  }
  if (c.kind === "notif") {
    const k1 = clamp(spring(t - c.t0 - 0.2, 10), 0, 1.03);
    const t2 = c.t0 + 2.6;
    const k2 = clamp(spring(t - t2, 10), 0, 1.03);
    const two = c.lines.length > 1;
    const ya = -260 + (BAR + 70 + 260) * k1 + (two && t > t2 ? 300 * k2 : 0);
    return (
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {t > c.t0 + 0.2 && <Banner body={c.lines[0]} y={ya} a={clamp((t - c.t0 - 0.2) / 0.2)} />}
        {two && t > t2 && <Banner body={c.lines[1]} y={-260 + (BAR + 70 + 260) * k2} a={clamp((t - t2) / 0.2)} />}
      </div>
    );
  }
  if (c.kind === "end") {
    const a = fadeIO(t, c, 0.6, 0.5);
    return (
      <div style={{ ...center, background: "#000", opacity: a }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <Img src={staticFile("brand/mark-disc.png")} style={{ width: 120, height: 120 }} />
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 96, letterSpacing: "0.12em" }}>{c.lines[0]}</div>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 40, marginTop: 34, letterSpacing: "0.3em", color: "rgba(255,255,255,0.75)" }}>{c.lines[1]}</div>
        <div style={{ position: "absolute", bottom: 90, fontFamily: SANS, fontSize: 30, letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)" }}>{c.lines[2]}</div>
      </div>
    );
  }
  return null;
};

// projective transform taking the w×h rectangle to the quad d (tl, tr, br, bl), as a CSS matrix3d
const homography = (w: number, h: number, d: [number, number][]) => {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const A: number[][] = [];
  src.forEach(([x, y], i) => {
    const [u, v] = d[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const [a, b, c, dd, e, f, g, hh] = A.map((r, i) => r[8] / r[i]);
  return [a, dd, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1];
};

// the reveal: the frozen last frame of 安's film shrinks into the video message on 林工's phone
const Reveal: React.FC<{ t: number }> = ({ t }) => {
  const lt = t - CHAT_T0;
  if (lt < 0 || lt >= 1.8) return null;
  const p = ease(clamp((lt - 0.12) / 1.3));
  const q = revealQuad(lt, t);
  const H = 1080 - 2 * BAR;
  const src: [number, number][] = [[0, BAR], [1920, BAR], [1920, 1080 - BAR], [0, 1080 - BAR]];
  const pts = src.map((s0, i) => [lerp(s0[0], q[i][0], p), lerp(s0[1], q[i][1], p)] as [number, number]);
  const m = homography(1920, H, pts);
  const a = 1 - clamp((lt - 1.45) / 0.3);
  return (
    <Img
      src={staticFile("reveal.jpg")}
      style={{ position: "absolute", left: 0, top: 0, width: 1920, height: H, transformOrigin: "0 0", transform: `matrix3d(${m.join(",")})`, opacity: a, boxShadow: "0 0 80px rgba(0,0,0,0.7)" }}
    />
  );
};

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const live = CARDS.filter((c) => t >= c.t0 && t < c.t1);
  const end = CARDS.find((c) => c.kind === "end") as Card;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {live.map((c, i) => (
        <CardView key={i} c={c} t={t} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAR, background: "#000" }} />
      {t < end.t0 && (
        <div style={{ position: "absolute", left: 44, top: 40, display: "flex", alignItems: "center", gap: 14, opacity: 0.72 }}>
          <Img src={staticFile("brand/mark-disc.png")} style={{ width: 52, height: 52 }} />
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 32, letterSpacing: "0.1em", color: "#fff" }}>世界的形状</div>
        </div>
      )}
    </div>
  );
};
