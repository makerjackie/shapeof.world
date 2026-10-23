import React from "react";
import { FONT } from "../theme";
import { Builder, Coin, COIN_T, MiniRam, RamKit, ServerRack } from "./art";
import { Ambience, Caption, captionEvents, Corner, EIO, EO, Ev, Frame, lerp, Music, P, pr, Sounds, Source, useT } from "./common";

// Sample A · 硬币堆: the price as a pile of coins (one coin = ¥100, every 10th brass). Last year's ¥900 is nine coins;
// 29 more fall, faster and faster, from the first beat to the bar-1 downbeat, where the band comes in, the tag flips and
// the builder jumps back. Then an AI data centre slides in and yanks the kit away.

const START = 9; // coins already on the desk (¥900)
const END = 38; // ¥3,800
const N = END - START;
const land = (k: number) => 0.08 + 2.0 * Math.pow(k / (N - 1), 0.62); // k = 0 … 28; first on a beat, last on the downbeat
const FALL = 0.2;

const STACK_X = 1300;
const BASE_Y = 862;

const EVENTS: Ev[] = [
  ...Array.from({ length: N }, (_, k): Ev => [land(k) - 0.01, "sfx-impact-03.wav", lerp(0.55, 0.22, k / N)]),
  ...[0, 10, 20].map((k): Ev => [land(k), "sfx-impact-06.wav", 0.32]),
  [2.08, "sfx-impact-08.wav", 0.95],
  [2.08, "sfx-impact-06.wav", 0.6],
  [2.58, "sfx-ui-01.wav", 0.45],
  ...captionEvents(2.08),
  [3.08, "sfx-impact-05.wav", 0.45],
  [5.5, "sfx-transition-02.wav", 0.7],
  [6.08, "sfx-impact-08.wav", 0.8],
  ...captionEvents(6.08),
  ...Array.from({ length: 8 }, (_, i): Ev => [6.33 + i * 0.1, "sfx-impact-01.wav", 0.3]),
  [6.62, "sfx-impact-01.wav", 0.35],
  [7.08, "sfx-impact-05.wav", 0.5],
];

export const SampleA: React.FC = () => {
  const t = useT();
  const landed = Array.from({ length: N }, (_, k) => k).filter((k) => t >= land(k)).length;
  const count = START + landed;
  const flip = pr(t, 2.08, 0.32, EIO);
  const hit = Math.max(0, 1 - Math.max(0, t - 2.08) / 0.5) * (t >= 2.08 ? 1 : 0);
  const pan = pr(t, 5.58, 0.5, EIO);
  const panX = -380 * pan;
  const rackIn = pr(t, 5.58, 0.5, EO);
  const grab = pr(t, 6.08, 0.5, EIO);
  const rackGlow = Math.max(pr(t, 6.08, 0.3), 0) * (0.7 + 0.3 * Math.sin(t * 12));
  const push = 1 + 0.03 * pr(t, 0, 2.08, (x) => x) - 0.03 * pr(t, 2.08, 0.5, EO) + 0.015 * Math.sin(t * 0.9);
  const look = Math.min(1, landed / N);
  const jump = pr(t, 2.08, 0.22, EO) - 0.6 * pr(t, 2.4, 0.5, EIO);
  // RAM kit: sits at the left; at 6.08 it is pulled along an arc into the rack's intake.
  const kitX0 = 120;
  const kitY0 = 470;
  // The rack's intake slot is in screen space; the kit lives in the panned world, so convert.
  const slot = { x: 1440 + 170 - panX, y: 250 + 110 + 3.5 * ((600 - 150) / 7) };
  const kx = lerp(kitX0, slot.x - 60, grab);
  const ky = lerp(kitY0, slot.y - 40, grab) - Math.sin(grab * Math.PI) * 160;
  const ks = lerp(1, 0.12, grab);
  const tagFall = pr(t, 6.25, 0.4, EIO);
  return (
    <Frame bg="radial-gradient(ellipse 80% 70% at 45% 35%, #fbf4e6 0%, #f1e4cc 60%, #e6d4b4 100%)">
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${panX}px) scale(${push})`, transformOrigin: "960px 700px" }}>
        {/* desk */}
        <div style={{ position: "absolute", left: -600, right: -600, top: 820, bottom: -200, background: "linear-gradient(180deg, #d8b98d 0%, #c7a275 40%, #b48c60 100%)" }} />
        <div style={{ position: "absolute", left: -600, right: -600, top: 820, height: 6, background: "#ead2ad" }} />
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: -600, right: -600, top: 850 + i * 26, height: 2, background: "#a77f55", opacity: 0.18 }} />
        ))}
        {/* unit legend */}
        <div style={{ position: "absolute", left: STACK_X - 90, top: 902, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: P.ink, opacity: 0.72, whiteSpace: "nowrap" }}>1 枚 = 100 元</div>
        {/* shadows */}
        <div style={{ position: "absolute", left: STACK_X - 95, top: BASE_Y - 10, width: 190, height: 40, borderRadius: "50%", background: "rgba(60,35,10,0.25)" }} />
        {/* the kit and its price tag */}
        {grab < 1 ? (
          <div style={{ position: "absolute", left: kx, top: ky, transform: `rotate(${-7 + grab * 30}deg) scale(${ks})`, transformOrigin: "0 0" }}>
            <div style={{ position: "absolute", left: 30, top: 300, width: 760, height: 40, borderRadius: "50%", background: "rgba(60,35,10,0.22)", opacity: 1 - grab }} />
            <RamKit w={760} id="a" />
          </div>
        ) : null}
        <Tag t={t} flip={flip} fall={tagFall} x={kitX0 + 500} y={kitY0 + 196} />
        {/* last year's height */}
        {t >= 2.58 ? (
          <div style={{ position: "absolute", left: STACK_X - 92, top: BASE_Y - START * COIN_T - 26, opacity: pr(t, 2.58, 0.3) }}>
            <div style={{ width: 184, height: 52, borderRadius: "50%", border: `4px dashed ${P.walnut}` }} />
            <div style={{ position: "absolute", left: -190, top: 6, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: P.walnut, whiteSpace: "nowrap" }}>去年 ¥900</div>
          </div>
        ) : null}
        {/* the coin stack */}
        <div style={{ position: "absolute", left: STACK_X, top: BASE_Y }}>
          {Array.from({ length: END }).map((_, i) => {
            const k = i - START;
            const y = -i * COIN_T;
            if (k >= 0) {
              const lt = land(k);
              if (t < lt - FALL) return null;
              const f = Math.min(1, (t - (lt - FALL)) / FALL);
              const yy = t < lt ? lerp(-BASE_Y - 120, y, f * f) : y - Math.max(0, Math.sin((t - lt) * 30)) * 6 * Math.exp(-(t - lt) * 12);
              return (
                <div key={i} style={{ position: "absolute", left: 0, top: yy, zIndex: i }}>
                  <Coin brass={(i + 1) % 10 === 0} shade={((i * 37) % 7) / 7} />
                </div>
              );
            }
            return (
              <div key={i} style={{ position: "absolute", left: 0, top: y, zIndex: i }}>
                <Coin brass={(i + 1) % 10 === 0} shade={((i * 37) % 7) / 7} />
              </div>
            );
          })}
        </div>
        {/* counter riding the top of the stack */}
        <div style={{ position: "absolute", left: STACK_X + 95, top: BASE_Y - count * COIN_T - 40, transform: `scale(${1 + 0.18 * hit})`, transformOrigin: "left center" }}>
          <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: t >= 2.08 ? P.orange : P.walnut, whiteSpace: "nowrap" }}>{t >= 2.08 ? "2026 年 7 月" : "2025 年"}</div>
          <div style={{ fontFamily: FONT, fontSize: 96, fontWeight: 900, color: t >= 2.08 ? P.orange : P.ink, letterSpacing: -3, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>¥{(count * 100).toLocaleString("en-US")}</div>
        </div>
        {/* the builder */}
        <div style={{ position: "absolute", left: 1105, top: BASE_Y + 2 }}>
          <Builder s={0.95} look={look} jump={Math.max(0, jump)} />
        </div>
      </div>
      {/* the AI data centre (screen space) */}
      {rackIn > 0 ? (
        <div style={{ position: "absolute", left: 1920 - 480 * rackIn, top: 250 }}>
          <ServerRack w={340} h={600} t={t} glow={rackGlow} />
        </div>
      ) : null}
      {/* more sticks streaming in */}
      {Array.from({ length: 8 }).map((_, i) => {
        const s = 6.13 + i * 0.1;
        const p = pr(t, s, 0.32, EIO);
        if (p <= 0 || p >= 1) return null;
        const x = lerp(-120, 1440 + 40, p);
        const y = lerp(560 + (i % 3) * 90, 410, p) - Math.sin(p * Math.PI) * (120 + i * 12);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: `rotate(${(1 - p) * -25}deg) scale(${lerp(1.3, 0.6, p)})` }}>
            <MiniRam w={150} color="#1f2329" fill="#3c424c" />
          </div>
        );
      })}
      <Caption text="内存条，一年涨到 4 倍多。" kw="4 倍多" kwAt={3.08} start={2.08} end={5.58} x={110} y={150} />
      <Caption text="AI 在抢内存。" kw="抢内存" kwAt={7.08} start={6.08} x={110} y={150} />
      <Corner />
      <Source>价格：央视财经 2026 年 7 月 · 深圳华强北 · 32GB DDR5 内存套装 · "4 倍多"为推算（3800 ÷ 900）</Source>
      <Music gain={0.7} />
      <Ambience file="ambience-machine-02.wav" from={5.08} level={0.35} />
      <Sounds ev={EVENTS} />
    </Frame>
  );
};

// Paper price tag on a string; flips at the downbeat; falls when the kit is taken.
const Tag: React.FC<{ t: number; flip: number; fall: number; x: number; y: number }> = ({ t, flip, fall, x, y }) => {
  const swing = Math.sin(t * 3.2) * 6 * (1 - fall) + (t >= 2.08 && t < 2.8 ? Math.sin((t - 2.08) * 18) * 14 * Math.exp(-(t - 2.08) * 5) : 0);
  const front = flip < 0.5;
  const ang = front ? flip * 180 : (flip - 1) * 180;
  return (
    <div style={{ position: "absolute", left: x, top: y + fall * 260, transform: `rotate(${swing + fall * 40}deg)`, transformOrigin: "20px 0", opacity: 1 - Math.max(0, fall - 0.7) * 2 }}>
      <svg width="40" height="40" style={{ position: "absolute", left: 0, top: 0 }}>
        <path d="M20,0 C12,14 28,26 20,38" stroke="#7a5a3a" strokeWidth="3" fill="none" />
      </svg>
      <div style={{ position: "absolute", left: -60, top: 36, perspective: 900 }}>
        <div
          style={{
            width: 250,
            height: 140,
            transform: `rotateY(${ang}deg)`,
            background: front ? "#fffaf0" : "#fff3ea",
            borderRadius: "10px 10px 10px 10px",
            clipPath: "polygon(16% 0, 100% 0, 100% 100%, 16% 100%, 0 50%)",
            boxShadow: "0 12px 26px rgba(60,35,10,0.25)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 58,
            boxSizing: "border-box",
            fontFamily: FONT,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: front ? P.walnut : P.orange }}>{front ? "2025 年" : "2026 年 7 月"}</div>
          <div style={{ fontSize: 54, fontWeight: 900, color: front ? P.ink : P.orange, letterSpacing: -2, fontVariantNumeric: "tabular-nums" }}>{front ? "¥900" : "¥3,800"}</div>
        </div>
      </div>
    </div>
  );
};

