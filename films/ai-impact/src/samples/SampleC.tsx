import React from "react";
import { random } from "remotion";
import { Odometer } from "../fx";
import { FONT } from "../theme";
import { RamKit, ServerRack } from "./art";
import { Ambience, Corner, EBACK, EIO, EO, Ev, Frame, lerp, Music, P, pr, Sounds, Source, useT } from "./common";

// Sample C · 大字: kinetic type on the dark, polished look of v1. The price is the picture: a huge odometer that steps
// up on every beat and slams into ¥3,800 on the downbeat; then the money turns into things you could have bought
// (four kits); then an AI data centre sucks all four in. The type is the narration here, so no paper strip.

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
const KITS = [3.58, 4.08, 4.58, 5.08];

const EVENTS: Ev[] = [
  [0.08, "sfx-impact-08.wav", 0.6],
  ...STEPS.slice(1, 4).map(([s]): Ev => [s - 0.14, "sfx-mechanical-13.wav", 0.8]),
  ...STEPS.slice(1, 4).map(([s]): Ev => [s, "sfx-impact-03.wav", 0.35]),
  [2.08, "sfx-impact-08.wav", 1],
  [2.08, "sfx-impact-06.wav", 0.6],
  [2.58, "sfx-impact-11.wav", 0.55],
  [3.08, "sfx-transition-02.wav", 0.5],
  [3.58, "sfx-ui-01.wav", 0.5],
  ...KITS.map((s): Ev => [s, "sfx-impact-01.wav", 0.55]),
  [5.5, "sfx-transition-02.wav", 0.7],
  [6.08, "sfx-impact-08.wav", 0.75],
  [6.08, "sfx-ui-01.wav", 0.5],
  [7.08, "sfx-impact-05.wav", 0.5],
];

// Characters rise out of a mask one after another from second `at`, 14 a second.
const Rise: React.FC<{ t: number; at: number; text: string; size: number; color?: string; kw?: string; kwAt?: number; out?: number }> = ({ t, at, text, size, color = P.paper, kw, kwAt, out }) => {
  const chars = Array.from(text);
  const k0 = kw ? text.indexOf(kw) : -1;
  const k1 = k0 >= 0 ? k0 + Array.from(kw!).length : -1;
  const hl = kwAt === undefined ? 0 : pr(t, kwAt, 0.3, EO);
  const x = out === undefined ? 0 : pr(t, out, 0.3, EIO);
  return (
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, color, whiteSpace: "nowrap", lineHeight: 1.15, letterSpacing: -1, opacity: 1 - x, transform: `translateY(${-x * 14}px)` }}>
      {chars.map((c, i) => {
        const p = pr(t, at + i / 14, 0.22, EO);
        const inKw = i >= k0 && i < k1;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", whiteSpace: "pre" }}>
            {inKw && hl > 0 ? <span style={{ position: "absolute", left: 0, top: size * 0.1, bottom: size * 0.04, width: `${Math.min(1, Math.max(0, hl * (k1 - k0) - (i - k0))) * 100}%`, background: P.gold, zIndex: 0 }} /> : null}
            <span style={{ position: "relative", zIndex: 1, display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: inKw && hl > 0.5 ? P.ink : undefined }}>{c}</span>
          </span>
        );
      })}
    </div>
  );
};

export const SampleC: React.FC = () => {
  const t = useT();
  const v = valueAt(t);
  const heat = Math.min(1, (v - 900) / 2900);
  const landed = t >= 2.08;
  const slam = landed ? Math.max(0, 1 - (t - 2.08) / 0.4) : 0;
  const stepPump = STEPS.slice(1).reduce((a, [s]) => a + Math.max(0, 1 - Math.abs(t - s) / 0.18) * 0.06, 0);
  const intro = pr(t, 0, 0.3, EO);
  const move = pr(t, 3.08, 0.5, EIO); // the number moves up and shrinks to make room
  const numScale = lerp(1, 0.42, move) * (lerp(0.86, 1.18, heat) + stepPump + 0.22 * slam) * lerp(1.3, 1, intro);
  const numX = lerp(960, 330, move);
  const numY = lerp(560, 300, move);
  const color = `rgb(${Math.round(lerp(244, 255, heat))},${Math.round(lerp(240, 90, heat))},${Math.round(lerp(232, 95, heat))})`;
  const stamp = pr(t, 2.58, 0.3, EBACK);
  const suck = pr(t, 6.08, 0.6, EIO);
  const rackIn = pr(t, 5.58, 0.5, EO);
  const glow = pr(t, 6.08, 0.3) * (0.7 + 0.3 * Math.sin(t * 12));
  const shards = landed && t < 3.1 ? Array.from({ length: 22 }) : [];
  return (
    <Frame bg="#07090b">
      {/* moving grid and warm glow behind the number */}
      <div style={{ position: "absolute", inset: -100, backgroundImage: "linear-gradient(rgba(244,240,232,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244,240,232,0.05) 1px, transparent 1px)", backgroundSize: "80px 80px", backgroundPosition: `${-t * 18}px ${t * 10}px` }} />
      <div style={{ position: "absolute", left: numX - 700, top: numY - 500, width: 1400, height: 1000, background: `radial-gradient(ellipse at 50% 50%, rgba(229,72,77,${0.08 + 0.25 * heat}) 0%, transparent 60%)` }} />
      {/* label above the number */}
      <div style={{ position: "absolute", left: numX, top: numY - 230 * lerp(1, 0.42, move) - 40, transform: "translateX(-50%)", fontFamily: FONT, fontSize: lerp(46, 30, move), fontWeight: 700, color: landed ? "#ff9b9e" : "#b8b8b3", whiteSpace: "nowrap", opacity: intro }}>
        {landed ? "今年 7 月 · 一套 32GB 内存条" : "去年 · 一套 32GB 内存条"}
      </div>
      {/* the number */}
      <div style={{ position: "absolute", left: numX, top: numY, transform: `translate(-50%, -50%) scale(${numScale})` }}>
        <Odometer value={v} size={300} prefix="¥" color={color} />
      </div>
      {/* speed lines on each step, shards on the slam */}
      {STEPS.slice(1).map(([s], i) => {
        const p = pr(t, s, 0.3, EO);
        if (p <= 0 || p >= 1 || move > 0) return null;
        return Array.from({ length: 6 }).map((_, k) => (
          <div key={`${i}-${k}`} style={{ position: "absolute", left: 960 + (k % 2 ? 1 : -1) * (520 + p * 200), top: 420 + k * 42, width: 120 * (1 - p), height: 6, borderRadius: 3, background: color, opacity: 1 - p }} />
        ));
      })}
      {shards.map((_, k) => {
        const p = pr(t, 2.08, 0.9, EO);
        const a = random(`sh${k}`) * Math.PI * 2;
        const d = 260 + random(`sd${k}`) * 420;
        return <div key={k} style={{ position: "absolute", left: 960 + Math.cos(a) * d * p, top: 560 + Math.sin(a) * d * p * 0.6, width: 18, height: 6, borderRadius: 3, background: k % 3 ? P.red : P.gold, transform: `rotate(${a}rad)`, opacity: 1 - p }} />;
      })}
      {/* the stamp */}
      {stamp > 0 ? (
        <div style={{ position: "absolute", left: lerp(1430, 640, move), top: lerp(700, 360, move), transform: `rotate(-10deg) scale(${(1 + (1 - stamp) * 1.4) * lerp(1, 0.6, move)})`, opacity: Math.min(1, stamp * 2), padding: "8px 26px", border: `7px solid ${P.red}`, borderRadius: 16, color: P.red, fontFamily: FONT, fontWeight: 900, fontSize: 84, whiteSpace: "nowrap" }}>
          4 倍多
        </div>
      ) : null}
      {/* what the same money bought last year */}
      {t >= 3.3 && t < 8.4 ? (
        <>
          <div style={{ position: "absolute", left: 160, top: 560 }}>
            <Rise t={t} at={3.58} text="去年能买 4 套。" size={110} out={5.78} />
          </div>
          {KITS.map((s, i) => {
            const p = pr(t, s, 0.35, EBACK);
            if (p <= 0) return null;
            const x0 = 180 + i * 400;
            const y0 = 790;
            const tx = lerp(x0, 1580, suck);
            const ty = lerp(y0, 540, suck) - Math.sin(suck * Math.PI) * (140 + i * 30);
            const sc = lerp(1, 0.08, suck) * lerp(0.6, 1, p);
            return suck < 1 ? (
              <div key={i} style={{ position: "absolute", left: tx, top: ty, transform: `scale(${sc}) rotate(${(1 - p) * 12 - suck * 20}deg)`, transformOrigin: "0 0", opacity: Math.min(1, p * 2) }}>
                <RamKit w={330} id={`c${i}`} />
              </div>
            ) : null;
          })}
        </>
      ) : null}
      {rackIn > 0 ? (
        <div style={{ position: "absolute", left: lerp(1960, 1480, rackIn), top: 260 }}>
          <ServerRack w={320} h={560} t={t} glow={glow} dark />
        </div>
      ) : null}
      {t >= 5.8 ? (
        <div style={{ position: "absolute", left: 160, top: 560 }}>
          <Rise t={t} at={6.08} text="AI 在抢内存。" size={120} kw="抢内存" kwAt={7.08} />
        </div>
      ) : null}
      <Corner dark />
      <Source dark>价格：央视财经 2026 年 7 月 · 深圳华强北 · 32GB DDR5 内存套装 · "4 倍多""4 套"为推算（3800 ÷ 900 ≈ 4.2）</Source>
      <Music gain={0.7} />
      <Ambience file="ambience-machine-02.wav" from={5.08} level={0.3} />
      <Sounds ev={EVENTS} />
    </Frame>
  );
};

