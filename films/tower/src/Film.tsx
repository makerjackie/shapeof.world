import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Palette, Spectrum, Vignette } from "./bg";
import { CL, EIO, EO } from "./fx";
import { BeatOffset } from "./kit";
import { BRAND_FROM, CHAPTERS, FILM_FRAMES, SCENES, Trans } from "./scenes";
import { FONT, K, SERIF } from "./theme";
import { barToFrame, FPB, MUSIC_OFFSET } from "./timing";

const PRE = 7; // frames the incoming scene starts before its downbeat
const POST = 5; // frames the outgoing scene lingers after it
// The track peaks at about +0.8 dBTP once encoded; 1.5 dB down keeps the master under −1 dBTP (as ai-real-cost).
const GAIN = 0.84;

const starts = SCENES.map((s, i) => (i === 0 ? 0 : barToFrame(s.from)));
const ends = SCENES.map((s, i) => (i === SCENES.length - 1 ? FILM_FRAMES : Math.min(FILM_FRAMES, barToFrame(s.to))));

// Enter/exit motion for one scene; transitions land on the bar's downbeat. No CSS filters (STYLE.md 三、4).
const Shell: React.FC<{ tin: Trans; tout?: Trans; pre: number; total: number; children: React.ReactNode }> = ({ tin, tout, pre, total, children }) => {
  const f = useCurrentFrame();
  const e = interpolate(f, [0, pre + 8], [0, 1], { ...CL, easing: EO });
  const x = tout ? interpolate(f, [total - POST - PRE, total], [0, 1], { ...CL, easing: EIO }) : 0;
  let opacity = 1;
  let transform = "";
  if (tin === "zoom") {
    opacity *= e;
    transform += ` scale(${0.9 + 0.1 * e})`;
  } else if (tin === "slide") {
    opacity *= e;
    transform += ` translateX(${(1 - e) * 420}px)`;
  } else if (tin === "up") {
    opacity *= e;
    transform += ` translateY(${(1 - e) * 280}px)`;
  } else if (tin === "fade") {
    opacity *= e;
  } else if (f < pre) {
    opacity = 0;
  }
  if (tout === "zoom") {
    opacity *= 1 - x;
    transform += ` scale(${1 + x * 0.2})`;
  } else if (tout === "slide") {
    opacity *= 1 - x;
    transform += ` translateX(${-x * 420}px)`;
  } else if (tout === "up") {
    opacity *= 1 - x;
    transform += ` translateY(${-x * 280}px)`;
  } else if (tout === "fade") {
    opacity *= 1 - x;
  } else if (tout && f >= total - POST) {
    opacity = 0;
  }
  return <AbsoluteFill style={{ opacity, transform: transform || undefined }}>{children}</AbsoluteFill>;
};

// Brand corner mark (STYLE.md 三、4/6): orb + 世界的形状 at 60% opacity, 48 px from the edges, from frame 0 until
// the brand card; the chapter label sits right next to it.
const BRAND_END = barToFrame(BRAND_FROM) - 10;

const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [BRAND_END - 12, BRAND_END], [1, 0], CL);
  if (o <= 0) return null;
  const ch = CHAPTERS.find((c) => frame >= barToFrame(c.from) - 4 && frame < barToFrame(c.to) - 4);
  const p = ch ? interpolate(frame, [barToFrame(ch.from) - 4, barToFrame(ch.from) + 10], [0, 1], { ...CL, easing: EO }) : 0;
  return (
    <div style={{ position: "absolute", left: 48, top: 48, display: "flex", alignItems: "center", gap: 18, opacity: o }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.6 }}>
        <div style={{ position: "relative", width: 44, height: 44 }}>
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,240,232,0.16) 0%, rgba(244,240,232,0.05) 55%, transparent 72%)" }} />
          <Img src={staticFile("mark-disc.png")} style={{ position: "relative", width: 44, height: 44 }} />
        </div>
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.fg, letterSpacing: 2 }}>世界的形状</span>
      </div>
      {ch ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, opacity: p, transform: `translateX(${(1 - p) * -20}px)` }}>
          <span style={{ width: 2, height: 28, background: K.line }} />
          <span style={{ background: K.theme, color: K.bg, fontWeight: 900, fontSize: 21, padding: "3px 10px", borderRadius: 7 }}>{ch.n}</span>
          <span style={{ color: K.fg, fontWeight: 700, fontSize: 23, opacity: 0.85 }}>{ch.t}</span>
        </div>
      ) : null}
    </div>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "#ffffff10" }}>
      <div style={{ width: `${(frame / FILM_FRAMES) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${K.theme}, ${K.themeHi})` }} />
    </div>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const hits = SCENES.flatMap((s, i) => (s.accents ?? []).map((b) => Math.round(starts[i] + (i === 0 ? barToFrame(0) : 0) + b * FPB)));
  const last = hits.filter((h) => h >= 0 && h <= frame).pop();
  if (last === undefined) return null;
  const o = interpolate(frame - last, [0, 7], [0.3, 0], CL);
  return o > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: o, pointerEvents: "none" }} /> : null;
};

const palKeys = SCENES.map((s, i) => ({ at: starts[i], pal: s.pal as Palette }));

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const curIdx = Math.max(0, starts.filter((s) => s <= frame).length - 1);
  const cur = SCENES[curIdx];
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <Audio
        src={staticFile("music.m4a")}
        trimBefore={MUSIC_OFFSET}
        volume={(f) => GAIN * interpolate(f, [0, 3], [0.6, 1], CL) * interpolate(f, [FILM_FRAMES - 12, FILM_FRAMES - 1], [1, 0], CL)}
      />
      <Backdrop keys={palKeys} />
      {SCENES.map((s, i) => {
        const start = starts[i];
        const pre = i === 0 ? 0 : PRE;
        const end = ends[i] + (i < SCENES.length - 1 ? POST : 0);
        const total = end - (start - pre);
        const offset = i === 0 ? barToFrame(0) : PRE;
        const next = SCENES[i + 1];
        return (
          <Sequence key={i} from={start - pre} durationInFrames={total} premountFor={30}>
            <BeatOffset.Provider value={offset}>
              <Shell tin={s.tin} tout={next && next.from <= s.to ? next.tin : "fade"} pre={pre} total={total}>
                <s.C />
              </Shell>
            </BeatOffset.Provider>
          </Sequence>
        );
      })}
      <Hud />
      <Spectrum color={cur.pal[0]} />
      <Flash />
      <Vignette />
      <Grain />
      <Progress />
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [FILM_FRAMES - 20, FILM_FRAMES - 1], [0, 1], CL), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
