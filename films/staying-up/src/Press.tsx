import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { BRUSH, FONT, K, PEN, SANS, SERIF } from "./theme";
import { D0, FRAMES, H, OWN_FLIP, R, RELEASE, SIM, SURFACE, W, WORDS, Frame, flipAt, rnd, wordH } from "./sim";

export const PRESS_FRAMES = FRAMES;

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EO = Easing.bezier(0.16, 1, 0.3, 1);

// ---------- precomputed particles ----------

type Bubble = { born: number; x: number; y: number; r: number; sp: number; ph: number };
const BUBBLES: Bubble[] = (() => {
  const out: Bubble[] = [];
  SIM.frames.forEach((s, f) => {
    const deep = s.d - D0;
    if (deep > 50 && f % 4 === 0) {
      const n = f >= RELEASE ? 3 : 1;
      for (let j = 0; j < n; j++) {
        const h = rnd(f * 7 + j);
        out.push({ born: f, x: s.ox + (h - 0.5) * R * 1.4, y: SURFACE + s.d - R * 0.6, r: 2 + rnd(f + j * 3) * 5, sp: 2.4 + rnd(f * 3 + j) * 3, ph: h * 6 });
      }
    }
  });
  return out;
})();

type Drop = { born: number; x: number; vx: number; vy: number; r: number };
const DROPS: Drop[] = SIM.events
  .filter((e) => e.kind === "breach" || e.kind === "splashdown")
  .flatMap((e) => {
    const n = e.kind === "breach" ? 36 : 18;
    const p = 0.5 + (e.power ?? 0.5);
    return Array.from({ length: n }, (_, j) => {
      const h = rnd(e.f * 13 + j);
      const a = (h - 0.5) * 2.2;
      const sp = (5 + rnd(j * 5 + e.f) * 13) * p;
      return { born: e.f, x: SIM.frames[e.f].ox + (rnd(j + e.f) - 0.5) * R, vx: Math.sin(a) * sp * 0.9, vy: -Math.cos(a) * sp * (e.kind === "breach" ? 1.4 : 0.8), r: 1.5 + rnd(j * 11) * 3.5 };
    });
  });

const RIPPLES = SIM.events.map((e) => ({ f: e.f, p: e.kind === "land" ? 0.45 : e.kind === "release" ? 0.3 : 1 + (e.power ?? 0) }));

// ---------- pieces ----------

export const Orb: React.FC<{ s: { d: number; v: number; ox: number }; f: number; under: boolean; flareAt?: number; strainFrom?: number; strainTo?: number }> = ({ s, f, under, flareAt = RELEASE, strainFrom = 300, strainTo = RELEASE }) => {
  const y = SURFACE + s.d;
  const deep = Math.max(0, s.d - D0);
  const breath = 1 + Math.sin(f / 9) * 0.02;
  const strain = interpolate(f, [strainFrom, strainTo], [0, 1], CL) * (f < strainTo ? 1 : 0);
  const glowK = under ? Math.max(0.35, 1 - deep / 520) : 1;
  const flare = interpolate(f, [flareAt + 10, flareAt + 22, flareAt + 70], [0, 1, 0], CL);
  const r = R * breath;
  const stretch = s.d < 0 ? 1 + Math.min(0.14, Math.abs(s.v) / 220) : 1;
  return (
    <div style={{ position: "absolute", left: s.ox, top: y, width: 0, height: 0 }}>
      <div style={{ position: "absolute", left: -r * 7, top: -r * 7, width: r * 14, height: r * 14, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,180,94,${0.22 * glowK + flare * 0.25}) 0%, rgba(255,150,70,${0.08 * glowK}) 30%, rgba(255,140,60,0) 62%)` }} />
      <div style={{ position: "absolute", left: -r * 2.6, top: -r * 2.6, width: r * 5.2, height: r * 5.2, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,214,150,${0.5 * glowK + flare * 0.4}) 0%, rgba(255,190,110,${0.16 * glowK}) 45%, rgba(255,180,100,0) 70%)` }} />
      <div
        style={{
          position: "absolute",
          left: -r,
          top: -r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          transform: `scale(${(1 + strain * 0.04 * Math.sin(f * 2.3)) / stretch}, ${(1 - strain * 0.08) * stretch})`,
          background: `radial-gradient(circle at 42% 38%, #ffffff 0%, ${K.orb} 26%, #ffd9a0 58%, #f7a85a 88%, #e98c43 100%)`,
          boxShadow: `0 0 ${30 + flare * 40}px rgba(255,200,130,${0.75 * glowK}), inset -10px -14px 26px rgba(170,80,20,0.35)`,
        }}
      />
    </div>
  );
};

// The voices are things with weight: a teacher's red pen on an exercise-book slip, a parent's note,
// and later the same words as your own lock-screen notifications.
const PAPER_EDGE = "polygon(0% 6%, 3% 0%, 9% 4%, 16% 1%, 24% 5%, 33% 0%, 41% 4%, 50% 1%, 58% 5%, 67% 0%, 75% 4%, 84% 1%, 92% 5%, 97% 0%, 100% 6%, 100% 94%, 97% 100%, 91% 96%, 83% 100%, 74% 95%, 66% 100%, 57% 96%, 49% 100%, 40% 95%, 32% 100%, 23% 96%, 15% 100%, 8% 95%, 2% 100%, 0% 94%)";

export const Paper: React.FC<{ kind: string; size: number; h: number; text: string }> = ({ kind, size, h, text }) => {
  const teacher = kind === "teacher";
  return (
    <div
      style={{
        height: h,
        padding: `0 ${size * 0.62}px`,
        display: "flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        clipPath: PAPER_EDGE,
        background: teacher
          ? "repeating-linear-gradient(180deg, #ece6d7 0px, #ece6d7 27px, rgba(120,150,190,0.35) 28px, #ece6d7 29px), #ece6d7"
          : "linear-gradient(170deg, #f0dc95, #e3c773)",
        fontFamily: teacher ? PEN : BRUSH,
        fontSize: size * (teacher ? 1.08 : 1.02),
        color: teacher ? K.ink : "#3b2e1f",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
      }}
    >
      {text}
    </div>
  );
};

export const Notice: React.FC<{ size: number; h: number; text: string }> = ({ size, h, text }) => (
  <div
    style={{
      height: h,
      padding: `0 ${size * 0.6}px 0 ${size * 0.32}px`,
      display: "flex",
      alignItems: "center",
      gap: size * 0.32,
      whiteSpace: "nowrap",
      borderRadius: h * 0.32,
      background: "linear-gradient(180deg, rgba(58,62,72,0.92), rgba(36,39,46,0.92))",
      border: "1px solid rgba(255,255,255,0.14)",
      boxShadow: "0 10px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: size * 0.92,
      color: "#f3f5f8",
      letterSpacing: 1,
    }}
  >
    <div style={{ width: h * 0.56, height: h * 0.56, borderRadius: h * 0.15, flexShrink: 0, background: "linear-gradient(140deg, #3b4150, #1d2028)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: h * 0.26, height: h * 0.26, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #fff, #ffc77d 60%, #e98c43)" }} />
    </div>
    {text}
  </div>
);

const Words: React.FC<{ s: Frame; f: number }> = ({ s, f }) => (
  <>
    {WORDS.map((w, i) => {
      const st = s.words[i];
      if (f < w.at || st.o <= 0) return null;
      const h = wordH(w);
      // a card turning over: the paper folds away edge-on, the notification turns in behind it
      const k = w.kind === "self" ? 1 : interpolate(f, [flipAt(i), flipAt(i) + OWN_FLIP], [0, 1], { ...CL, easing: Easing.inOut(Easing.cubic) });
      const layer: React.CSSProperties = { position: "absolute", left: 0, bottom: 0, transformOrigin: "50% 50%" };
      return (
        <div key={i} style={{ position: "absolute", left: st.x, top: st.bottom, width: 0, height: 0, transform: `rotate(${st.rot}deg)`, opacity: st.o }}>
          {k < 0.5 && (
            <div style={{ ...layer, transform: `translate(-50%, 0) scaleY(${Math.cos(k * Math.PI)})`, bottom: 0 }}>
              <Paper kind={w.kind} size={w.size} h={h} text={w.text} />
            </div>
          )}
          {k >= 0.5 && (
            <div style={{ ...layer, transform: `translate(-50%, 0) scaleY(${-Math.cos(k * Math.PI)})` }}>
              <Notice size={w.size} h={h} text={w.text} />
            </div>
          )}
        </div>
      );
    })}
  </>
);

const Bubbles: React.FC<{ f: number }> = ({ f }) => (
  <>
    {BUBBLES.map((b, i) => {
      const t = f - b.born;
      if (t < 0) return null;
      const y = b.y - t * b.sp;
      if (y < SURFACE + 4) return null;
      const x = b.x + Math.sin(t / 6 + b.ph) * 5;
      const o = Math.min(1, t / 6) * interpolate(y, [SURFACE + 4, SURFACE + 60], [0, 0.8], CL);
      return <div key={i} style={{ position: "absolute", left: x - b.r, top: y - b.r, width: b.r * 2, height: b.r * 2, borderRadius: "50%", border: "1.2px solid rgba(220,235,255,0.75)", background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%)", opacity: o }} />;
    })}
  </>
);

const Drops: React.FC<{ f: number }> = ({ f }) => (
  <>
    {DROPS.map((d, i) => {
      const t = f - d.born;
      if (t < 0 || t > 60) return null;
      const x = d.x + d.vx * t;
      const y = SURFACE + d.vy * t + 0.5 * 0.95 * t * t;
      if (y > SURFACE + 2) return null;
      // drawn as a short streak along its velocity, so the spray reads as water, not stars
      const vy = d.vy + 0.95 * t;
      const sp = Math.hypot(d.vx, vy);
      const len = Math.max(d.r * 2, Math.min(46, sp * 1.6));
      const ang = (Math.atan2(vy, d.vx) * 180) / Math.PI - 90;
      const o = interpolate(t, [0, 3, 30, 50], [0, 0.9, 0.7, 0], CL);
      return <div key={i} style={{ position: "absolute", left: x - d.r * 0.5, top: y - len / 2, width: d.r, height: len, borderRadius: d.r, transform: `rotate(${ang}deg)`, background: "linear-gradient(180deg, rgba(225,238,252,0.95), rgba(225,238,252,0))", boxShadow: "0 0 6px rgba(255,205,140,0.45)", opacity: o }} />;
    })}
  </>
);

const Surface: React.FC<{ s: Frame; f: number }> = ({ s, f }) => {
  const pts: string[] = [];
  for (let x = -300; x <= W + 300; x += 12) {
    let y = SURFACE + Math.sin(x / 140 + f / 22) * 1.6 + Math.sin(x / 61 - f / 15) * 0.9;
    RIPPLES.forEach((r) => {
      const t = f - r.f;
      if (t <= 0 || t > 90) return;
      const dist = Math.abs(x - s.ox);
      const front = t * 7;
      y += Math.sin((dist - front) / 18) * Math.exp(-Math.abs(dist - front) / 60) * 7 * r.p * (1 - t / 90);
    });
    pts.push(`${x},${y.toFixed(1)}`);
  }
  const near = Math.exp(-Math.abs(s.d) / 140);
  return (
    <>
      <svg width={W + 600} height={H * 2} style={{ position: "absolute", left: -300, top: 0, overflow: "visible" }} viewBox={`-300 0 ${W + 600} ${H * 2}`}>
        <defs>
          <linearGradient id="sl" x1="0" x2="1">
            <stop offset="0" stopColor="#b9d3ee" stopOpacity="0" />
            <stop offset="0.5" stopColor="#d7e6f5" stopOpacity="0.55" />
            <stop offset="1" stopColor="#b9d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={pts.join(" ")} fill="none" stroke="url(#sl)" strokeWidth={1.6} />
      </svg>
      {/* the orb's light lying on the water */}
      <div style={{ position: "absolute", left: s.ox - 520, top: SURFACE - 26, width: 1040, height: 52, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(255,200,130,${0.42 * near}) 0%, rgba(255,170,90,${0.12 * near}) 40%, rgba(255,160,80,0) 70%)` }} />
    </>
  );
};

export const Brand: React.FC = () => (
  <div style={{ position: "absolute", left: 44, top: 34, display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }}>
    <Img src={staticFile("mark-disc.png")} style={{ width: 44, height: 44 }} />
    <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.fg, letterSpacing: 2 }}>世界的形状</span>
  </div>
);

// ---------- film ----------

export const Press: React.FC = () => {
  const f = useCurrentFrame();
  const s = SIM.frames[Math.min(f, FRAMES - 1)];
  const world: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${s.zoom}) translateY(${-s.cam}px)`, transformOrigin: "50% 50%" };
  const aboveClip = `polygon(-3000px -3000px, 5000px -3000px, 5000px ${SURFACE}px, -3000px ${SURFACE}px)`;
  const belowClip = `polygon(-3000px ${SURFACE}px, 5000px ${SURFACE}px, 5000px 5000px, -3000px 5000px)`;
  const wob = Math.sin(f / 13) * 0.8;

  const clockO = interpolate(f, [4, 22, 58, 80], [0, 1, 1, 0], CL);
  const endK = interpolate(f, [422, 448], [0, 1], { ...CL, easing: EO });
  const endK2 = interpolate(f, [434, 460], [0, 1], { ...CL, easing: EO });

  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <div style={world}>
        {/* sky */}
        <div style={{ position: "absolute", left: -600, top: -1400, width: W + 1200, height: SURFACE + 1400, background: "linear-gradient(180deg, #040609 0%, #070b11 72%, #0c131b 100%)" }} />
        {/* water body */}
        <div style={{ position: "absolute", left: -600, top: SURFACE, width: W + 1200, height: 1800, background: `linear-gradient(180deg, #0a1620 0%, ${K.water} 22%, ${K.waterDeep} 70%)` }} />

        {/* above the line */}
        <div style={{ position: "absolute", inset: 0, clipPath: aboveClip }}>
          <Words s={s} f={f} />
          <Orb s={s} f={f} under={false} />
          <Drops f={f} />
        </div>

        {/* below the line: refracted, dimmer, bluer */}
        <div style={{ position: "absolute", inset: 0, clipPath: belowClip }}>
          <div style={{ position: "absolute", inset: 0, filter: "blur(1.3px) saturate(0.8)", transform: `skewX(${wob}deg)`, transformOrigin: `50% ${SURFACE}px` }}>
            {/* reflection of whatever is in the air */}
            <div style={{ position: "absolute", inset: 0, transform: `translateY(${2 * SURFACE}px) scaleY(-0.85)`, transformOrigin: "50% 0", opacity: 0.28, filter: "blur(3px)" }}>
              {s.d < -R * 0.2 && <Orb s={s} f={f} under={false} />}
            </div>
            <Words s={s} f={f} />
            <Orb s={s} f={f} under />
            <Bubbles f={f} />
          </div>
          <div style={{ position: "absolute", left: -600, top: SURFACE, width: W + 1200, height: 1800, background: "linear-gradient(180deg, rgba(8,22,34,0.30) 0%, rgba(4,12,20,0.55) 25%, rgba(2,6,10,0.88) 60%)" }} />
          {/* the orb's light spreading through the water */}
          <div style={{ position: "absolute", left: s.ox - 700, top: SURFACE + s.d - 500, width: 1400, height: 1000, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(255,170,90,${0.16 * Math.exp(-Math.max(0, s.d - D0) / 500)}) 0%, rgba(120,150,190,0.05) 35%, rgba(0,0,0,0) 65%)` }} />
        </div>

        <Surface s={s} f={f} />
      </div>

      {/* lock-screen clock: the night we're in */}
      {clockO > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 168, textAlign: "center", opacity: clockO, color: K.fg }}>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, letterSpacing: 10, opacity: 0.6 }}>凌晨</div>
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 150, letterSpacing: 4, lineHeight: 1.05 }}>01:07</div>
        </div>
      )}

      {/* the line */}
      {endK > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 92, letterSpacing: 8, color: K.fg }}>
          <span style={{ opacity: endK, display: "inline-block", transform: `translateY(${(1 - endK) * 24}px)` }}>压得越深，</span>
          <span style={{ opacity: endK2, display: "inline-block", transform: `translateY(${(1 - endK2) * 24}px)`, color: K.gold }}>弹得越高</span>
        </div>
      )}

      {/* vignette + grain */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.07, mixBlendMode: "overlay" }} />
      <Brand />

      <Sound />
    </AbsoluteFill>
  );
};

// ---------- sound ----------

const sfx = (n: string) => staticFile(`sfx/${n}.wav`);

const Sound: React.FC = () => {
  const ev = SIM.events;
  const breach = ev.find((e) => e.kind === "breach");
  const down = ev.find((e) => e.kind === "splashdown");
  return (
    <>
      <Audio
        src={sfx("under")}
        volume={(f) => interpolate(f, [0, 20, 300, 330, RELEASE, RELEASE + 10, 460, 480], [0, 0.55, 0.55, 0.12, 0.12, 0.6, 0.5, 0], CL)}
      />
      <Audio src={sfx("brown")} volume={(f) => interpolate(f, [0, 30, 450, 480], [0, 0.12, 0.12, 0], CL)} />
      {ev
        .filter((e) => e.kind === "land")
        .map((e) => (
          <Sequence key={`l${e.f}`} from={e.f} durationInFrames={60}>
            <Audio src={sfx("thump")} volume={0.55 + (e.i ?? 0) * 0.05} />
            <Audio src={sfx("plop")} volume={0.35} />
          </Sequence>
        ))}
      {WORDS.map((w, i) =>
        w.kind === "self" ? null : (
          <Sequence key={`fl${i}`} from={flipAt(i) + 3} durationInFrames={20}>
            <Audio src={sfx("drop")} volume={0.45} />
          </Sequence>
        ),
      )}
      {[120, 185, 290].map((f) => (
        <Sequence key={`b${f}`} from={f} durationInFrames={45}>
          <Audio src={sfx("bubble")} volume={0.35} />
        </Sequence>
      ))}
      <Sequence from={RELEASE - 58} durationInFrames={70}>
        <Audio src={sfx("swell")} volume={0.7} />
      </Sequence>
      <Sequence from={RELEASE} durationInFrames={40}>
        <Audio src={sfx("sub")} volume={0.9} />
        <Audio src={sfx("rise")} volume={0.6} />
      </Sequence>
      {breach && (
        <Sequence from={breach.f} durationInFrames={50}>
          <Audio src={sfx("splash")} volume={1} />
          <Audio src={sfx("smallsplash")} volume={0.6} />
        </Sequence>
      )}
      {down && (
        <Sequence from={down.f} durationInFrames={50}>
          <Audio src={sfx("smallsplash")} volume={0.7} />
          <Audio src={sfx("plop")} volume={0.5} />
        </Sequence>
      )}
      <Sequence from={434} durationInFrames={40}>
        <Audio src={sfx("ping")} volume={0.35} />
      </Sequence>
    </>
  );
};
