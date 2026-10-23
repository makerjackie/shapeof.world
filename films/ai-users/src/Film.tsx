import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Beat, CL, Corner, Desk, EIO } from "./kit";
import { FILM_FRAMES, SCENES } from "./scenes";
import { A, A_AT, A_BAR, A_END, A_JUMP, A_REP, aBar, B, B2_AT, B_AT, B_BAR, B_RESUME, B_STOP, bBar, END_CARD_AT, FPS, sec } from "./timing";

const SLIDE = 18; // frames a new sheet takes to slide over the desk, ending on the scene's first downbeat
const LINGER = 6; // frames the old scene stays underneath after that

// A scene that arrives as a new sheet: it slides in from the right over the previous one, its leading edge
// casting a shadow on the paper underneath (the film's one transition, films/DIRECTOR.md 五).
const Shell: React.FC<{ slide: boolean; children: React.ReactNode }> = ({ slide, children }) => {
  const f = useCurrentFrame();
  if (!slide)
    return (
      <AbsoluteFill>
        <Desk />
        {children}
      </AbsoluteFill>
    );
  const p = interpolate(f, [0, SLIDE], [0, 1], { ...CL, easing: EIO });
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - p) * 1960}px)`, boxShadow: p < 1 ? "-30px 0 60px rgba(70,45,15,0.28)" : undefined }}>
      <Desk />
      {children}
    </AbsoluteFill>
  );
};

// Music levels: measured on the finished MP4 (films/DIRECTOR.md 七), target about −12 LUFS, true peak ≤ −1 dBTP.
const GAIN_A = 0.95;
const GAIN_B = 0.9;
const AMB = 0.22;
const MACHINE = 0.3;

const Music: React.FC = () => {
  const aFrom = Math.round((A.down - A_AT) * FPS);
  // A plays to film bar A_JUMP, then picks up again A_REP bars back in the track: a 3-frame crossfade just
  // before the downbeat, so the downbeat itself comes only from the second copy.
  const jump = sec(aBar(A_JUMP));
  const a2Start = jump - 3;
  const a2From = Math.round((A.down + (A_JUMP - A_REP) * A_BAR) * FPS) - 3;
  const b1From = sec(B_AT - B.down);
  const b1Len = sec(bBar(B_STOP)) - b1From;
  const b2Start = sec(B2_AT) - 2;
  const b2Offset = Math.round((B.down + B_RESUME * B_BAR) * FPS) - 2;
  const machineFrom = sec(aBar(16.5));
  const machineLen = sec(aBar(29.2)) - machineFrom;
  return (
    <>
      <Sequence from={0} durationInFrames={jump}>
        <Audio src={staticFile(`audio/${A.id}.mp3`)} startFrom={aFrom} volume={(f) => GAIN_A * interpolate(f, [jump - 3, jump], [1, 0], CL)} />
      </Sequence>
      <Sequence from={a2Start} durationInFrames={sec(A_END) + 6 - a2Start}>
        <Audio src={staticFile(`audio/${A.id}.mp3`)} startFrom={a2From} volume={(f) => GAIN_A * interpolate(f, [0, 3], [0, 1], CL)} />
      </Sequence>
      {b1From < FILM_FRAMES ? (
        <Sequence from={b1From} durationInFrames={b1Len}>
          <Audio src={staticFile(`audio/${B.id}.mp3`)} volume={(f) => GAIN_B * interpolate(f, [b1Len - 4, b1Len], [1, 0], CL)} />
        </Sequence>
      ) : null}
      {b2Start < FILM_FRAMES ? (
        <Sequence from={b2Start} durationInFrames={FILM_FRAMES - b2Start}>
          <Audio
            src={staticFile(`audio/${B.id}.mp3`)}
            startFrom={b2Offset}
            volume={(f) => GAIN_B * interpolate(f + b2Start, [sec(END_CARD_AT) + 30, FILM_FRAMES - 4], [1, 0], CL)}
          />
        </Sequence>
      ) : null}
      <Audio src={staticFile("audio/ambience-room-01.wav")} loop volume={AMB} />
      {/* the machine room comes in half a bar before the programmer's sheet and leaves with it */}
      <Sequence from={machineFrom} durationInFrames={machineLen}>
        <Audio src={staticFile("audio/ambience-machine-02.wav")} loop volume={(f) => MACHINE * interpolate(f, [0, 20, machineLen - 20, machineLen], [0, 1, 1, 0], CL)} />
      </Sequence>
    </>
  );
};

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const cur = [...SCENES].reverse().find((s) => frame >= sec(s.from)) ?? SCENES[0];
  return (
    <AbsoluteFill style={{ background: "#e8ddc9", overflow: "hidden" }}>
      <Music />
      <Desk />
      {SCENES.map((s, i) => {
        const pre = s.slide ? SLIDE : 0;
        const start = sec(s.from) - pre;
        const next = SCENES[i + 1];
        const end = next ? sec(next.from) + LINGER : FILM_FRAMES;
        const fpb = (FPS * 60) / s.bpm;
        return (
          <Sequence key={s.id} from={start} durationInFrames={Math.max(1, end - start)}>
            <Beat.Provider value={{ at: sec(s.zero) - start, fpb }}>
              <Shell slide={!!s.slide}>
                <s.C />
              </Shell>
            </Beat.Provider>
          </Sequence>
        );
      })}
      {frame < sec(END_CARD_AT) ? <Corner chapter={cur.chapter} /> : null}
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [FILM_FRAMES - 12, FILM_FRAMES - 1], [0, 1], CL), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
