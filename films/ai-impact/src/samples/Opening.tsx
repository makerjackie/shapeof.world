import React from "react";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile } from "remotion";
import { Odometer } from "../fx";
import { FONT } from "../theme";
import { Face, Pointer } from "./art";
import { AiOrder, Cart, CartState, PRICE_SLOT } from "./cart";
import { Caption, captionEvents, CL, Corner, EBACK, EIO, EO, Ev, fr, lerp, MUSIC_START, P, pr, Source, useT } from "./common";

// The combined opening (user's pick: C opens, B follows). 0–4.08 s: the dark, kinetic price slam. 4.08 (bar 2
// downbeat): the big ¥3,800 shrinks and lands as the price in your cart while the warm scene opens out of that point.
// Then your cart: you can't check out, the music drops to room tone, you hesitate; on the bar-5 downbeat, after the
// quiet, an AI data centre's order slams in and takes the stock. Music: 《有序运动 · 40》 from 2.0 s (120 BPM, beats at
// 0.08 + n × 0.5 s). Pitched effects are tuned to A minor (public/lib/tuned, tools/tune_sfx.py).

export const OPENING_FRAMES = 438; // 14.6 s

const STEPS: [number, number][] = [
  [0.0, 900],
  [0.58, 1600],
  [1.08, 2400],
  [1.58, 3100],
  [2.08, 3800],
];
const valueAt = (t: number) => {
  let v = STEPS[0][1];
  for (let i = 1; i < STEPS.length; i++) v = lerp(v, STEPS[i][1], pr(t, STEPS[i][0] - 0.14, 0.2, EO));
  return v;
};

const CUT = 4.08; // the number starts flying, the warm scene opens
const LAND = 4.58; // it lands in the cart
const QUIET = [6.58, 10.08]; // music drops to room tone between these
const TAKE = 10.08; // the data centre's order slams in
const TU = (f: string) => `tuned/${f}`;

const EVENTS: Ev[] = [
  [0.08, TU("sfx-impact-08.wav"), 0.6],
  ...STEPS.slice(1, 4).map(([s]): Ev => [s - 0.14, "sfx-mechanical-13.wav", 0.8]),
  ...STEPS.slice(1, 4).map(([s]): Ev => [s, TU("sfx-impact-03.wav"), 0.35]),
  [2.08, TU("sfx-impact-08.wav"), 1],
  [2.08, TU("sfx-impact-06.wav"), 0.6],
  [2.58, TU("sfx-impact-11.wav"), 0.55],
  [3.08, "sfx-mechanical-13.wav", 0.6],
  [3.08, "sfx-ui-01.wav", 0.4],
  [4.0, "sfx-transition-02.wav", 0.75],
  [LAND, TU("sfx-impact-06.wav"), 0.55],
  [4.58, "sfx-mechanical-13.wav", 0.45],
  [5.08, "sfx-mechanical-13.wav", 0.5],
  [6.08, "sfx-mechanical-01.wav", 0.85],
  ...captionEvents(6.08),
  [6.58, TU("sfx-notification-02.wav"), 0.6],
  [7.58, "sfx-mechanical-01.wav", 0.6],
  [7.58, TU("sfx-impact-05.wav"), 0.3],
  [8.58, "sfx-mechanical-13.wav", 0.5],
  [10.0, "sfx-transition-02.wav", 0.55],
  [TAKE, TU("sfx-impact-08.wav"), 0.95],
  ...captionEvents(TAKE),
  ...Array.from({ length: 42 }, (_, i): Ev => [TAKE + i * 0.094, i % 2 ? "sfx-ui-01.wav" : "sfx-impact-01.wav", i < 16 ? 0.26 : 0.12]),
  [11.58, TU("sfx-notification-18.wav"), 0.45],
  [11.58, TU("sfx-impact-05.wav"), 0.45],
  [14.08, TU("sfx-impact-06.wav"), 0.35],
];

const Sfx: React.FC = () => (
  <>
    {EVENTS.map(([s, f, v], i) => (
      <Sequence key={i} from={Math.max(0, fr(s))} durationInFrames={90}>
        <Audio src={staticFile(`lib/${f}`)} volume={v} />
      </Sequence>
    ))}
  </>
);

// Music with a one-bar-plus dip to room tone after 余额不足; it comes back full on the take.
const Score: React.FC = () => (
  <>
    <Audio
      src={staticFile("lib/scene-minimalism-40.mp3")}
      trimBefore={fr(MUSIC_START)}
      volume={(f) => {
        const t = f / 30;
        const dip = pr(t, QUIET[0], 0.35, EIO) - pr(t, QUIET[1] - 0.25, 0.25, EIO);
        return 0.7 * (1 - 0.72 * dip) * interpolate(f, [OPENING_FRAMES - 12, OPENING_FRAMES - 1], [1, 0], CL);
      }}
    />
    <Sequence from={fr(QUIET[0])} durationInFrames={fr(QUIET[1] + 0.4 - QUIET[0])}>
      <Audio src={staticFile("lib/ambience-room-01.wav")} volume={(f) => 0.45 * interpolate(f, [0, 10, fr(QUIET[1] - QUIET[0]), fr(QUIET[1] + 0.4 - QUIET[0])], [0, 1, 1, 0], CL)} />
    </Sequence>
    <Sequence from={fr(9.58)} durationInFrames={OPENING_FRAMES - fr(9.58)}>
      <Audio src={staticFile("lib/ambience-machine-02.wav")} volume={(f) => 0.32 * interpolate(f, [0, 15, OPENING_FRAMES - fr(9.58) - 10, OPENING_FRAMES - fr(9.58)], [0, 1, 1, 0], CL)} />
    </Sequence>
  </>
);

export const Opening: React.FC = () => {
  const t = useT();
  // ── dark part ──
  const v = valueAt(t);
  const heat = Math.min(1, (v - 900) / 2900);
  const landed = t >= 2.08;
  const slam = landed ? Math.max(0, 1 - (t - 2.08) / 0.4) : 0;
  const pump = STEPS.slice(1).reduce((a, [s]) => a + Math.max(0, 1 - Math.abs(t - s) / 0.18) * 0.06, 0);
  const intro = pr(t, 0, 0.3, EO);
  const breathe = landed ? 0.02 * Math.sin((t - 2.08) * 4) : 0;
  const numScale = (lerp(0.86, 1.18, heat) + pump + 0.22 * slam + breathe) * lerp(1.3, 1, intro);
  const red = `rgb(${Math.round(lerp(244, 229, heat))},${Math.round(lerp(240, 72, heat))},${Math.round(lerp(232, 77, heat))})`;
  const stamp = pr(t, 2.58, 0.3, EBACK);
  const ghost = pr(t, 3.08, 0.4, EO);
  // ── the hand-off ──
  const fly = pr(t, CUT, LAND - CUT, EIO);
  const iris = pr(t, CUT, 0.5, EIO);
  const darkGone = t >= LAND + 0.2;
  // ── warm part ──
  const shock = pr(t, 6.08, 0.18, EBACK);
  const toast = pr(t, 6.58, 0.35, EBACK) - pr(t, 8.08, 0.3, EIO);
  const take = pr(t, TAKE, 0.45, EO);
  const s: CartState = {
    price: 3800,
    priceColor: P.red,
    priceSize: 104 * (1 + 0.05 * Math.max(0, 1 - Math.abs(t - LAND) / 0.25)),
    showPrice: t >= LAND,
    month: "2026 年 7 月",
    hot: true,
    bar900: pr(t, 4.58, 0.5),
    bar3800: pr(t, 5.08, 0.5, EO),
    stock: t < 8.58 ? "有货" : t < 11.58 ? "库存紧张" : "被抢光",
    bell: pr(t, 7.58, 0.3),
    press: Math.max(0, 1 - Math.abs(t - 6.1) / 0.1),
    unaffordable: t >= 6.58,
    toast: Math.max(0, toast),
    dim: pr(t, TAKE, 0.5) * 0.6,
  };
  // pointer: comes in, clicks 结算, then the alert, then hesitates
  const path: [number, number, number][] = [
    [4.58, 1960, 1100],
    [5.9, 1660, 905],
    [6.4, 1660, 905],
    [7.45, 1240, 565],
    [7.7, 1240, 565],
    [8.6, 1420, 760],
    [10.0, 1460, 820],
    [14.6, 1470, 900],
  ];
  let px = path[0][1];
  let py = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const p = pr(t, path[i - 1][0], path[i][0] - path[i - 1][0], EIO);
    if (t >= path[i - 1][0]) {
      px = lerp(path[i - 1][1], path[i][1], p);
      py = lerp(path[i - 1][2], path[i][2], p);
    }
  }
  const hesitate = t > 8.6 && t < 10 ? Math.sin(t * 5) * 10 : 0;
  const gaze = t < 6.5 ? 0.6 : t < 8.4 ? lerp(0.6, -0.2, pr(t, 7.2, 0.4)) : t < TAKE ? lerp(-0.2, 0.3, pr(t, 8.58, 0.3)) : 1;
  return (
    <AbsoluteFill style={{ background: "#07090b", overflow: "hidden" }}>
      {/* ───────── dark: the price slam ───────── */}
      {!darkGone ? (
        <AbsoluteFill style={{ opacity: 1 - pr(t, CUT, 0.4) * 0.6 }}>
          <div style={{ position: "absolute", inset: -100, backgroundImage: "linear-gradient(rgba(244,240,232,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244,240,232,0.05) 1px, transparent 1px)", backgroundSize: "80px 80px", backgroundPosition: `${-t * 18}px ${t * 10}px` }} />
          <div style={{ position: "absolute", left: 260, top: 60, width: 1400, height: 1000, background: `radial-gradient(ellipse at 50% 50%, rgba(229,72,77,${0.08 + 0.25 * heat}) 0%, transparent 60%)` }} />
          <div style={{ position: "absolute", left: 960, top: 300, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 46, fontWeight: 700, color: landed ? "#ff9b9e" : "#b8b8b3", whiteSpace: "nowrap", opacity: intro * (1 - pr(t, CUT, 0.25)) }}>
            {landed ? "今年 7 月 · 一套 32GB 内存条" : "去年 · 一套 32GB 内存条"}
          </div>
          {t < CUT ? (
            <div style={{ position: "absolute", left: 960, top: 560, transform: `translate(-50%, -50%) scale(${numScale})` }}>
              <Odometer value={v} size={300} prefix="¥" color={red} />
            </div>
          ) : null}
          {STEPS.slice(1).map(([s0], i) => {
            const p = pr(t, s0, 0.3, EO);
            if (p <= 0 || p >= 1) return null;
            return Array.from({ length: 6 }).map((_, k) => (
              <div key={`${i}-${k}`} style={{ position: "absolute", left: 960 + (k % 2 ? 1 : -1) * (520 + p * 200), top: 420 + k * 42, width: 120 * (1 - p), height: 6, borderRadius: 3, background: red, opacity: 1 - p }} />
            ));
          })}
          {landed && t < 3.1
            ? Array.from({ length: 22 }).map((_, k) => {
                const p = pr(t, 2.08, 0.9, EO);
                const a = random(`sh${k}`) * Math.PI * 2;
                const d = 260 + random(`sd${k}`) * 420;
                return <div key={k} style={{ position: "absolute", left: 960 + Math.cos(a) * d * p, top: 560 + Math.sin(a) * d * p * 0.6, width: 18, height: 6, borderRadius: 3, background: k % 3 ? P.red : P.gold, transform: `rotate(${a}rad)`, opacity: 1 - p }} />;
              })
            : null}
          {stamp > 0 ? (
            <div style={{ position: "absolute", left: 1400, top: 700, transform: `rotate(-10deg) scale(${1 + (1 - stamp) * 1.4})`, opacity: Math.min(1, stamp * 2) * (1 - pr(t, CUT, 0.25)), padding: "8px 26px", border: `7px solid ${P.red}`, borderRadius: 16, color: P.red, fontFamily: FONT, fontWeight: 900, fontSize: 84, whiteSpace: "nowrap" }}>
              4 倍多
            </div>
          ) : null}
          {ghost > 0 ? (
            <div style={{ position: "absolute", left: 300, top: 760, opacity: ghost * (1 - pr(t, CUT, 0.25)), fontFamily: FONT, fontSize: 56, fontWeight: 800, color: "#8a8a85", whiteSpace: "nowrap" }}>
              去年 ¥900
              <div style={{ position: "absolute", left: -6, top: "52%", height: 6, width: `calc(${ghost * 100}% + 12px)`, background: "#8a8a85", borderRadius: 3 }} />
            </div>
          ) : null}
          <Source dark>价格：央视财经 2026 年 7 月 · 深圳华强北 · 32GB DDR5 内存套装 · "4 倍多"为推算（3800 ÷ 900 ≈ 4.2）</Source>
        </AbsoluteFill>
      ) : null}
      {/* ───────── warm: your cart, opening out of the price ───────── */}
      {iris > 0 ? (
        <AbsoluteFill style={{ clipPath: `circle(${lerp(0, 2300, iris)}px at ${PRICE_SLOT.right - 140}px ${PRICE_SLOT.cy}px)`, background: "radial-gradient(ellipse 90% 80% at 30% 30%, #fbf5ea 0%, #f0e6d4 65%, #e7d9c0 100%)" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: "absolute", left: 200 + i * 520 + Math.sin(t * 0.7 + i) * 30, top: 80 + i * 160 + Math.cos(t * 0.6 + i) * 20, width: 520, height: 520, borderRadius: "50%", background: "rgba(212,82,28,0.05)" }} />
          ))}
          <div style={{ position: "absolute", left: 210, top: 520 + Math.sin(t * 2) * 3, transform: `scale(${1 + 0.06 * Math.max(0, 1 - Math.abs(t - 6.1) / 0.3)})`, transformOrigin: "50% 100%" }}>
            <Face size={360} shock={shock} sweat={pr(t, 7.08, 1.3, (x) => x)} gaze={gaze} />
            <div style={{ position: "absolute", left: 140, top: 300, fontFamily: FONT, fontSize: 30, fontWeight: 900, color: P.paper, background: P.ink, padding: "2px 18px", borderRadius: 10 }}>你</div>
          </div>
          <Cart s={s} t={t} />
          {take > 0 ? <AiOrder t={t} x={lerp(1960, 1180, take)} start={TAKE} /> : null}
          {t >= 4.58 ? (
            <div style={{ position: "absolute", left: px, top: py + hesitate * 0.5, opacity: t > TAKE ? lerp(1, 0.5, pr(t, TAKE, 1)) : 1 }}>
              <Pointer press={Math.max(s.press, Math.max(0, 1 - Math.abs(t - 7.6) / 0.1))} />
            </div>
          ) : null}
          <Caption text="你的购物车，结不了账了。" start={6.08} end={9.58} x={110} y={150} />
          <Caption text="AI 数据中心，在抢同一种内存。" kw="在抢同一种内存" kwAt={11.58} start={TAKE} x={110} y={150} />
          <Source>价格：央视财经 2026 年 7 月 · 深圳华强北 · 32GB DDR5 内存套装 · 购物车为示意</Source>
        </AbsoluteFill>
      ) : null}
      {/* ───────── the flying price ───────── */}
      {t >= CUT && t < LAND ? (
        <div
          style={{
            position: "absolute",
            left: lerp(960, PRICE_SLOT.right, fly),
            top: lerp(560, PRICE_SLOT.cy, fly),
            transform: `translate(${lerp(-50, -100, fly)}%, -50%)`,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: lerp(300 * 1.18, 104, fly),
            color: P.red,
            letterSpacing: lerp(-6, -2, fly),
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            textShadow: `0 ${lerp(0, 18, fly)}px ${lerp(0, 30, fly)}px rgba(60,40,10,${0.25 * fly})`,
          }}
        >
          ¥3,800
        </div>
      ) : null}
      <AbsoluteFill style={{ opacity: 1 - pr(t, CUT, 0.4) }}>
        <Corner dark />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: pr(t, CUT, 0.4) }}>
        <Corner />
      </AbsoluteFill>
      <Score />
      <Sfx />
    </AbsoluteFill>
  );
};
