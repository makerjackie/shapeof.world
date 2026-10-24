import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BeatOffset } from "./kit";
import { barToFrame, FPB, MUSIC_SEGMENTS } from "./timing";
import { Backdrop, Grain, Palette, Vignette } from "./bg";
import { CL, EIO, EO } from "./fx";
import { FILM_FRAMES, SCENES, Trans } from "./scenes";
import { K } from "./theme3";

const PRE = 7; // frames the incoming scene starts before its downbeat
const POST = 5; // frames the outgoing scene lingers after it

const starts = SCENES.map((s, i) => (i === 0 ? 0 : barToFrame(s.from)));
const ends = SCENES.map((s, i) => (i === SCENES.length - 1 ? FILM_FRAMES : Math.min(FILM_FRAMES, barToFrame(s.to))));

// Enter/exit motion for one scene; transitions land on the bar's downbeat.
const Shell: React.FC<{ tin: Trans; tout?: Trans; pre: number; total: number; children: React.ReactNode }> = ({ tin, tout, pre, total, children }) => {
  const f = useCurrentFrame();
  const e = interpolate(f, [0, pre + 8], [0, 1], { ...CL, easing: EO });
  const x = tout ? interpolate(f, [total - POST - PRE, total], [0, 1], { ...CL, easing: EIO }) : 0;
  let opacity = 1;
  let transform = "";
  let filter: string | undefined;
  if (tin === "zoom") {
    opacity *= e;
    transform += ` scale(${0.86 + 0.14 * e})`;
    filter = e < 1 ? `blur(${(1 - e) * 10}px)` : undefined;
  } else if (tin === "slide") {
    opacity *= e;
    transform += ` translateX(${(1 - e) * 520}px)`;
  } else if (tin === "up") {
    opacity *= e;
    transform += ` translateY(${(1 - e) * 340}px)`;
  } else if (f < pre) {
    opacity = 0;
  }
  if (tout === "zoom") {
    opacity *= 1 - x;
    transform += ` scale(${1 + x * 0.3})`;
    if (x > 0) filter = `blur(${x * 12}px)`;
  } else if (tout === "slide") {
    opacity *= 1 - x;
    transform += ` translateX(${-x * 520}px)`;
  } else if (tout === "up") {
    opacity *= 1 - x;
    transform += ` translateY(${-x * 340}px)`;
  } else if (tout && f >= total - POST) {
    opacity = 0;
  }
  return <AbsoluteFill style={{ opacity, transform: transform || undefined, filter }}>{children}</AbsoluteFill>;
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const hits = SCENES.flatMap((s, i) => (s.accents ?? []).map((b) => Math.round(starts[i] + b * FPB)));
  const last = hits.filter((h) => h >= 0 && h <= frame).pop();
  if (last === undefined) return null;
  const o = interpolate(frame - last, [0, 7], [0.4, 0], CL);
  return o > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: o, pointerEvents: "none" }} /> : null;
};

const XF = 2; // crossfade half-length in frames at each music cut, centred on the downbeat
const GAIN = 0.8; // the loudness pass (tools/render_master.sh) sets the level; this only keeps the mix out of clipping
const FADE_FROM = barToFrame(SCENES[SCENES.length - 1].from + 1.5);

// The cut soundtrack: each segment overlaps its neighbours by XF frames with an equal-power fade.
const Music: React.FC = () => (
  <>
    {MUSIC_SEGMENTS.map((m, i) => {
      const from = Math.max(0, m.from - XF);
      const to = Math.min(FILM_FRAMES, m.to + XF);
      return (
        <Sequence key={i} from={from} durationInFrames={to - from}>
          <Audio
            src={staticFile("music.m4a")}
            trimBefore={from + m.offset}
            volume={(f) => {
              const t = f + from;
              const fadeIn = i === 0 ? 1 : Math.sin((Math.PI / 2) * interpolate(t, [m.from - XF, m.from + XF], [0, 1], CL));
              const fadeOut = m.to === Infinity ? 1 : Math.cos((Math.PI / 2) * interpolate(t, [m.to - XF, m.to + XF], [0, 1], CL));
              return GAIN * fadeIn * fadeOut * interpolate(t, [FADE_FROM, FILM_FRAMES - 2], [1, 0], CL);
            }}
          />
        </Sequence>
      );
    })}
  </>
);

const palKeys = SCENES.map((s, i) => ({ at: starts[i], pal: s.pal as Palette }));

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <Music />
      <Backdrop keys={palKeys} />
      {SCENES.map((s, i) => {
        const start = starts[i];
        const pre = i === 0 ? 0 : PRE;
        const end = ends[i] + (i < SCENES.length - 1 ? POST : 0);
        const total = end - (start - pre);
        const offset = i === 0 ? barToFrame(0) : PRE;
        return (
          <Sequence key={i} from={start - pre} durationInFrames={total} premountFor={30}>
            <BeatOffset.Provider value={offset}>
              <Shell tin={s.tin} tout={SCENES[i + 1]?.tin} pre={pre} total={total}>
                <s.C />
              </Shell>
            </BeatOffset.Provider>
          </Sequence>
        );
      })}
      <Flash />
      <Vignette />
      <Grain />
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [FILM_FRAMES - 20, FILM_FRAMES - 1], [0, 1], CL), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
