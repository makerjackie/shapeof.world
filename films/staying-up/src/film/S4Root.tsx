import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K } from "../theme";
import { CL, CardSpec, Dressing, EIO, Placed, Say, StackCards, WaterScene, cardH, ripplesFrom } from "./kit";
import { D0, SURFACE, simulateStack } from "./stack";

// 33–83 s. Where the voice comes from. Dive back through the years past the things that said it first;
// they turn into your own notifications and rush back onto the orb; the grown-up versions pile on;
// the deepest press on the music's peak. The music stops: "它没有错。" The second track comes in softly.

export const S4_LEN = 1500;
const OX = 1180; // the orb sits right of centre in this act; the words live on the left
const DIVE_FROM = 50;
const DIVE_TO = 320;
const DEPTH = 2600;
const BOTTOM_FLIP = 336; // the earliest one turns while we watch
const RISE_FROM = 380;
const RISE_TO = 540;
const STACK_FROM = 546;
const MODERN = 790; // music at its fullest
const TREMBLE = 980;
const FREEZE = 1185; // the music drops out
const TENDER = 1290;
const FADE = 1462;

const camDive = (f: number) =>
  f < RISE_FROM ? interpolate(f, [DIVE_FROM, DIVE_TO], [0, DEPTH], { ...CL, easing: EIO }) : interpolate(f, [RISE_FROM, RISE_TO], [DEPTH, 0], { ...CL, easing: EIO });
const frameAtCam = (c: number) => {
  for (let f = DIVE_FROM; f < DIVE_TO; f++) if (camDive(f) >= c) return f;
  return DIVE_TO;
};
const frameRise = (depth: number) => {
  for (let f = RISE_FROM; f < RISE_TO; f++) if (camDive(f) <= depth + 60) return f;
  return RISE_TO;
};

const PAST: { depth: number; x: number; c: CardSpec; to: CardSpec }[] = [
  { depth: 620, x: 640, c: { kind: "banner", text: "提高一分，干掉千人", size: 70 }, to: { kind: "notice", text: "别人都在进步。", size: 56 } },
  { depth: 1080, x: 1260, c: { kind: "timetable", text: "06:00 起床|06:30 早读|07:20 上课|12:00 午饭|18:30 晚自习|22:00 熄灯", sub: "作息时间表", size: 58 }, to: { kind: "notice", text: "又没按时睡。", size: 56 } },
  { depth: 1560, x: 600, c: { kind: "rank", text: "期中考试 第 37 名", sub: "↓5", size: 64 }, to: { kind: "notice", text: "你怎么这么没用。", size: 56 } },
  { depth: 1980, x: 1240, c: { kind: "teacher", text: "别浪费时间", size: 80 }, to: { kind: "notice", text: "又浪费了一天。", size: 56 } },
  { depth: 2420, x: 760, c: { kind: "parent", text: "早点睡，都是为你好", size: 64 }, to: { kind: "notice", text: "明天一定早睡。", size: 56 } },
];
const EXTRA: { depth: number; x: number; c: CardSpec }[] = [
  { depth: 760, x: 1560, c: { kind: "teacher", text: "上课不许走神", size: 50 } },
  { depth: 940, x: 380, c: { kind: "rank", text: "数学 72 分", sub: "家长签字", size: 46 } },
  { depth: 1300, x: 420, c: { kind: "teacher", text: "这道题又错了", size: 52 } },
  { depth: 1420, x: 1600, c: { kind: "parent", text: "玩手机能考上大学吗", size: 44 } },
  { depth: 1760, x: 1560, c: { kind: "banner", text: "不要输在起跑线上", size: 48 } },
  { depth: 2080, x: 420, c: { kind: "teacher", text: "抓紧时间", size: 54 } },
  { depth: 2240, x: 1520, c: { kind: "parent", text: "看看人家", size: 56 } },
];
const FLIP_AT = PAST.map((p, i) => (i === PAST.length - 1 ? BOTTOM_FLIP : Math.max(RISE_FROM + 2, frameRise(p.depth) - 20)));

const MODERN_CARDS: CardSpec[] = [
  { kind: "app", sub: "动态", text: "别人都上岸了", icon: "动", iconBg: "#e8455a", size: 50 },
  { kind: "app", sub: "健康", text: "睡眠评分 58 · 较差", icon: "♥", iconBg: "#3a7bd5", size: 50 },
  { kind: "app", sub: "屏幕使用时间", text: "今日 6 小时 12 分", icon: "⌛", iconBg: "#6a4cff", size: 50 },
];
const STACK_SPECS: CardSpec[] = [...PAST.map((p) => ({ ...p.to, size: 48 })), ...MODERN_CARDS];
const SIM = simulateStack({
  frames: S4_LEN,
  x: OX,
  cards: [
    ...PAST.map((p, i) => ({ at: STACK_FROM + i * 8, h: cardH({ ...p.to, size: 48 }), weight: 38, dx: [-10, 12, -6, 8, -12][i], rot: [-1.4, 1.2, -0.8, 1.5, -1.1][i] })),
    ...MODERN_CARDS.map((c, i) => ({ at: MODERN + 24 + i * 22, h: cardH(c), weight: 36, dx: [6, -10, 8][i], rot: [1.0, -1.3, 0.8][i] })),
  ],
  trembleFrom: TREMBLE,
  trembleTo: FREEZE,
});

export const S4Root: React.FC = () => {
  const f = useCurrentFrame();
  const s = SIM.frames[f];
  const follow = Math.max(0, Math.min(260, (s.d - D0) * 0.55));
  const cam = f < RISE_TO ? camDive(f) : follow * interpolate(f, [RISE_TO, RISE_TO + 24], [0, 1], { ...CL, easing: EIO });

  const flip = (i: number) => interpolate(f, [FLIP_AT[i], FLIP_AT[i] + 9], [0, 1], { ...CL, easing: EIO });
  const riseY = (i: number) => {
    const t = Math.max(0, f - FLIP_AT[i] - 10);
    return -(t * t) * 0.075;
  };
  const orbX = f < RISE_TO ? interpolate(f, [0, 60], [960, OX], { ...CL, easing: EIO }) : s.ox;
  const year = Math.round(2026 - (Math.min(cam, DEPTH) / DEPTH) * 18);

  const fade = interpolate(f, [FADE, S4_LEN - 4], [1, 0], { ...CL, easing: EIO });
  // the moment the music stops: everything sinks back, the line stands alone
  const hush = interpolate(f, [FREEZE - 2, FREEZE + 8, TENDER - 20, TENDER + 10], [1, 0.4, 0.4, 0.75], CL);
  // the grown-up push: a slow move in while the stack trembles
  const zoom = 1 + 0.06 * interpolate(f, [MODERN, FREEZE], [0, 1], { ...CL, easing: EIO }) * (f < FREEZE + 30 ? 1 : interpolate(f, [FREEZE + 30, TENDER + 60], [1, 0.4], CL));

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <AbsoluteFill style={{ opacity: fade * hush }}>
        <WaterScene
          f={f + 540}
          cam={cam}
          zoom={zoom}
          zoomX={OX}
          zoomY={SURFACE}
          deepTint={f < RISE_TO ? 0.5 : 0.88}
          orbs={[{ x: orbX, d: s.d, v: s.v }]}
          ripples={ripplesFrom(SIM.events, OX)}
          strain={[TREMBLE, FREEZE]}
          render={(under) => (
            <>
              {under &&
                Array.from({ length: 10 }, (_, i) => {
                  const yr = 2026 - i * 2;
                  const y = SURFACE + ((2026 - yr) / 18) * DEPTH;
                  return (
                    <div key={yr} style={{ position: "absolute", left: 70, top: y - 20, display: "flex", alignItems: "center", gap: 16, opacity: f < RISE_TO ? 0.75 : 0 }}>
                      <div style={{ width: 40, height: 2, background: "rgba(220,230,245,0.6)" }} />
                      <span style={{ fontFamily: FONT, fontWeight: 300, fontSize: 34, color: "#dfe8f5" }}>{yr}</span>
                    </div>
                  );
                })}
              {under &&
                f < RISE_TO + 40 &&
                PAST.map((p, i) => (
                  <Placed key={i} x={p.x} bottom={SURFACE + p.depth + Math.sin(f / 30 + i) * 8 + riseY(i)} rot={Math.sin(f / 40 + i * 2) * 3} o={1} c={p.c} flip={flip(i)} flipTo={p.to} />
                ))}
              {under &&
                f < RISE_FROM + 50 &&
                EXTRA.map((p, i) => (
                  <Placed key={i} x={p.x} bottom={SURFACE + p.depth + Math.sin(f / 26 + i) * 10} rot={Math.sin(f / 33 + i) * 5} o={interpolate(f, [RISE_FROM, RISE_FROM + 30], [0.8, 0], CL)} c={p.c} />
                ))}
              <StackCards fr={s} specs={STACK_SPECS} />
            </>
          )}
        />
        {f < RISE_TO && (
          <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.12 * (1 - Math.min(1, cam / DEPTH) * 0.7) * (cam > 300 ? 1 : cam / 300) }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ position: "absolute", left: 300 + i * 420 + Math.sin(f / 50 + i) * 40, top: -100, width: 140, height: 1400, background: "linear-gradient(180deg, rgba(190,215,240,0.9), rgba(190,215,240,0))", transform: `rotate(${12 - i * 4}deg)`, filter: "blur(30px)" }} />
            ))}
          </AbsoluteFill>
        )}
        {f > DIVE_FROM + 10 && f < RISE_TO && (
          <div style={{ position: "absolute", left: 70, bottom: 70, fontFamily: FONT, fontWeight: 300, fontSize: 72, color: K.fg, opacity: 0.9 * interpolate(f, [DIVE_FROM + 10, DIVE_FROM + 24, RISE_TO - 24, RISE_TO], [0, 1, 1, 0], CL) }}>{year}</div>
        )}
      </AbsoluteFill>

      <Say f={f} at={0} out={DIVE_FROM + 24} text="可是，那个怪你的声音，" top={150} size={64} weight={600} dim={0.85} />
      <Say f={f} at={14} out={DIVE_FROM + 30} text="是从哪来的？" top={250} size={96} />
      <Say f={f} at={frameAtCam(900)} out={frameAtCam(1450)} text="小时候，它是墙上的作息表，" top={130} size={72} />
      <Say f={f} at={frameAtCam(1650)} out={frameAtCam(2150)} text="是老师的红笔，" top={130} size={72} />
      <Say f={f} at={frameAtCam(2200)} out={RISE_FROM - 4} text="是爸妈的一句「为你好」。" top={130} size={72} />
      <Say f={f} at={RISE_FROM} out={RISE_TO + 10} text="这些话，听了几千遍，" top={130} left={130} size={72} />
      <Say f={f} at={RISE_TO - 30} out={MODERN - 6} text="就成了你自己的声音。" gold="你自己的声音" top={240} left={130} size={84} />
      <Say f={f} at={MODERN} out={TREMBLE - 4} text="长大以后，它换了样子。" top={330} left={130} size={72} />
      <Say f={f} at={TREMBLE} out={FREEZE - 4} text="于是，休息像在犯错。" top={240} left={130} size={72} />
      <Say f={f} at={TREMBLE + 44} out={FREEZE - 4} text="连夜里这几个小时，" top={350} left={130} size={72} />
      <Say f={f} at={TREMBLE + 84} out={FREEZE - 4} text="也是带着愧疚偷来的。" gold="带着愧疚" top={460} left={130} size={72} />
      <Say f={f} at={FREEZE + 6} out={TENDER - 8} text="它没有错。" top={440} size={110} />
      <Say f={f} at={TENDER} out={FADE} text="它陪你熬过了高考。" top={300} left={130} size={72} />
      <Say f={f} at={TENDER + 56} out={FADE} text="只是后来，没人把它关掉。" top={410} left={130} size={72} />

      <Dressing brand={fade} />
      <S4Sound />
    </AbsoluteFill>
  );
};

const sfx = (n: string) => staticFile(`sfx/${n}.wav`);

const S4Sound: React.FC = () => (
  <>
    {/* the water only while we are under it */}
    <Sequence from={DIVE_FROM} durationInFrames={RISE_TO - DIVE_FROM + 20}>
      <Audio src={sfx("under")} volume={(t) => interpolate(t, [0, 30, RISE_TO - DIVE_FROM - 20, RISE_TO - DIVE_FROM + 20], [0, 0.35, 0.35, 0], CL)} />
    </Sequence>
    <Sequence from={DIVE_FROM} durationInFrames={50}>
      <Audio src={sfx("plop")} volume={0.45} />
    </Sequence>
    {PAST.map((_, i) => (
      <Sequence key={`fl${i}`} from={FLIP_AT[i] + 2} durationInFrames={20}>
        <Audio src={sfx("paper")} volume={0.6} />
      </Sequence>
    ))}
    {SIM.events
      .filter((e) => e.kind === "land")
      .map((e) => (
        <Sequence key={e.f} from={e.f} durationInFrames={30}>
          <Audio src={sfx("soft")} volume={0.45} />
        </Sequence>
      ))}
  </>
);
