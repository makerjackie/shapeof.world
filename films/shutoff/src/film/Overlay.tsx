// Everything drawn over the 3D picture: 2.39:1 letterbox, the brand mark, trailer cards, the title, the two fact
// cards, the last notification and the end card. No scale animations on text (multi-tab renders), only opacity
// and small translations.
import React from "react";
import { Img, staticFile } from "remotion";
import { SANS, SERIF } from "../engine/fonts";
import { clamp, ease, easeOut, lerp, spring } from "../engine/util";
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
  if (c.kind === "card") {
    const a = fadeIO(t, c, 0.4, 0.3);
    return (
      <div style={{ ...center, background: "#000" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 66, letterSpacing: "0.14em", opacity: a, transform: `translateY(${(1 - easeOut((t - c.t0) / 1.2)) * 10}px)` }}>{c.lines[0]}</div>
      </div>
    );
  }
  if (c.kind === "studio") {
    // the studio card, like the logo before a feature
    const a = fadeIO(t, c, 0.6, 0.45);
    return (
      <div style={{ ...center, background: "#000", opacity: a }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Img src={staticFile("brand/mark-disc.png")} style={{ width: 104, height: 104 }} />
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 84, letterSpacing: "0.12em" }}>{c.lines[0]}</div>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 38, letterSpacing: "0.6em", paddingLeft: "0.6em", marginTop: 30, color: "rgba(255,255,255,0.7)", opacity: clamp((t - c.t0 - 0.5) / 0.5) }}>{c.lines[1]}</div>
      </div>
    );
  }
  if (c.kind === "pre") {
    // what this is, and how it was made: written as code by an AI, every frame computed
    const a = clamp((c.t1 - t) / 0.4);
    const l = (d: number, dur = 0.6) => clamp((t - c.t0 - d) / dur);
    return (
      <div style={{ ...center, background: "#000", opacity: a }}>
        <div style={{ fontFamily: SANS, fontSize: 38, fontWeight: 400, letterSpacing: "0.32em", paddingLeft: "0.32em", color: "rgba(255,255,255,0.62)", opacity: l(0.1) }}>{c.lines[0]}</div>
        <div style={{ width: 120 * easeOut(l(0.5, 0.9)), height: 2, background: "rgba(255,255,255,0.35)", margin: "36px 0 40px" }} />
        <div style={{ fontFamily: SERIF, fontSize: 66, fontWeight: 600, letterSpacing: "0.1em", paddingLeft: "0.1em", opacity: l(0.6), transform: `translateY(${(1 - easeOut(l(0.6, 1.2))) * 12}px)` }}>{c.lines[1]}</div>
        <div style={{ fontFamily: SERIF, fontSize: 66, fontWeight: 600, letterSpacing: "0.1em", paddingLeft: "0.1em", marginTop: 18, opacity: l(1.25), transform: `translateY(${(1 - easeOut(l(1.25, 1.2))) * 12}px)` }}>{c.lines[2]}</div>
        <div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 500, letterSpacing: "0.3em", paddingLeft: "0.3em", marginTop: 48, color: "rgba(255,255,255,0.55)", opacity: l(2.0) }}>{c.lines[3]}</div>
      </div>
    );
  }
  if (c.kind === "name") {
    const a = fadeIO(t, c, 0.4, 0.35);
    const b = clamp((t - c.t0 - 1.05) / 0.5);
    return (
      <div style={{ ...center, background: "#000" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 62, letterSpacing: "0.14em", opacity: a, color: "rgba(255,255,255,0.88)" }}>{c.lines[0]}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 92, letterSpacing: "0.2em", paddingLeft: "0.2em", marginTop: 34, opacity: a * b, transform: `translateY(${(1 - easeOut(b)) * 10}px)` }}>{c.lines[1]}</div>
      </div>
    );
  }
  if (c.kind === "credits") {
    // a slow roll, bottom to top, that comes to rest on the studio block in the middle of the frame
    const a = clamp((t - c.t0) / 0.8) * clamp((c.t1 - t) / 0.8);
    const rowH = 80;
    const blockH = 300;
    const last = (CREDITS.length - 1) * rowH; // top of the studio block inside the list
    const k = ease(clamp((t - c.t0 - 0.4) / (c.t1 - c.t0 - 3.4)));
    const y0 = 1080 - BAR + 10;
    const y1 = 540 - blockH / 2 - last;
    const y = lerp(y0, y1, k);
    return (
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: a, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${y}px)` }}>
          {CREDITS.map(([role, name], i) =>
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
              <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 600, fontSize: i === 0 ? 64 : 38, letterSpacing: i === 0 ? "0.4em" : "0.12em", color: i === 0 ? "#fff" : "rgba(255,255,255,0.75)" }}>{name}</div>
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
    const ya = -260 + (BAR + 70 + 260) * k1 + (t > t2 ? 300 * k2 : 0);
    return (
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {t > c.t0 + 0.2 && <Banner body={c.lines[0]} y={ya} a={clamp((t - c.t0 - 0.2) / 0.2)} />}
        {t > t2 && <Banner body={c.lines[1]} y={-260 + (BAR + 70 + 260) * k2} a={clamp((t - t2) / 0.2)} />}
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
      {t < end.t0 && t > -7.3 && (
        <div style={{ position: "absolute", left: 44, top: 40, display: "flex", alignItems: "center", gap: 14, opacity: 0.72 }}>
          <Img src={staticFile("brand/mark-disc.png")} style={{ width: 52, height: 52 }} />
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 32, letterSpacing: "0.1em", color: "#fff" }}>世界的形状</div>
        </div>
      )}
    </div>
  );
};
