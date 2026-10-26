import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { K } from "../theme";
import { Orb } from "../Press";
import { CL, Dressing, EIO, Say, Src, WaterScene } from "./kit";
import { D0, rnd } from "./stack";

// 158–189 s. Pull back from your orb: a bay at night, a city on the far shore, and hundreds of other
// small lights on the water — everyone still awake. Then the lights go out one by one, back to yours,
// and the last line.

export const S7_LEN = 600;
const HZ = 470; // horizon
const ME = { x: 960, y: 890 }; // your orb in the bay framing
const ME_S = 0.45; // your orb is drawn smaller in the bay, so the pull-back starts at 1 / ME_S
const PULL_TO = 150;
const OUT_FROM = 330;
const PUSH_FROM = 410;
const PUSH_TO = 490;
const DIM_FROM = 540;

const BUILDINGS = (() => {
  const out: { x: number; w: number; h: number; seed: number }[] = [];
  let x = -40;
  let i = 0;
  while (x < 1960) {
    const w = 50 + rnd(i * 3.7) * 110;
    const tall = rnd(i * 5.1) > 0.82;
    out.push({ x, w, h: 50 + rnd(i * 2.3) * 140 + (tall ? 120 : 0), seed: i });
    x += w + 2 + rnd(i * 9.2) * 10;
    i++;
  }
  return out;
})();

const WINDOWS = BUILDINGS.flatMap((b) => {
  const cols = Math.max(2, Math.floor(b.w / 16));
  const rows = Math.max(2, Math.floor(b.h / 18));
  const out: { x: number; y: number; cool: boolean; off: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const h = rnd(b.seed * 100 + r * 13 + c * 7);
      if (h > 0.3) continue;
      out.push({ x: b.x + 6 + c * 16, y: HZ - b.h + 8 + r * 18, cool: h < 0.09, off: OUT_FROM + rnd(h * 999) * 90 });
    }
  return out;
});

const OTHERS = Array.from({ length: 140 }, (_, i) => {
  const z = 1.6 + Math.pow(rnd(i * 4.3), 0.7) * 14;
  const x = 960 + (rnd(i * 6.1) - 0.5) * 2600 * (z / 6);
  return { x, z, y: HZ + 420 / z, r: 58 / z, ph: rnd(i * 2.2) * 6, off: OUT_FROM + rnd(i * 8.8) * 80 };
}).filter((o) => o.x > -100 && o.x < 2020 && Math.abs(o.x - ME.x) + Math.abs(o.y - ME.y) > 160);

export const S7City: React.FC = () => {
  const f = useCurrentFrame();
  const pull = interpolate(f, [0, PULL_TO], [0, 1], { ...CL, easing: Easing.inOut(Easing.quad) });
  const push = interpolate(f, [PUSH_FROM, PUSH_TO], [0, 1], { ...CL, easing: EIO });
  const zoom = (1 / ME_S) * (1 - pull) + pull + 1.6 * push;
  const intro = interpolate(f, [0, 22], [1, 0], CL); // the close water scene fading away
  const meDim = interpolate(f, [DIM_FROM, S7_LEN - 6], [1, 0], { ...CL, easing: EIO });
  const cityDim = interpolate(f, [PUSH_FROM, PUSH_TO + 40], [1, 0.25], CL);

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <AbsoluteFill style={{ transform: `translate(0px, ${(616 - ME.y) * (1 - pull) - 150 * push}px) scale(${zoom})`, transformOrigin: `${ME.x}px ${ME.y}px` }}>
        {/* sky and far shore */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #030508 0%, #060b12 55%, #0d1622 100%)" }} />
        <div style={{ position: "absolute", left: 0, top: HZ - 60, width: 1920, height: 120, background: "radial-gradient(ellipse at 50% 60%, rgba(255,190,120,0.10), rgba(0,0,0,0) 70%)", opacity: cityDim }} />
        {BUILDINGS.map((b, i) => (
          <div key={i} style={{ position: "absolute", left: b.x, top: HZ - b.h, width: b.w, height: b.h, background: "#070a10", borderTop: "1px solid rgba(255,255,255,0.04)" }} />
        ))}
        {WINDOWS.map((w, i) => {
          const on = interpolate(f, [w.off, w.off + 12], [1, 0], CL) * cityDim;
          return on > 0.02 ? <div key={i} style={{ position: "absolute", left: w.x, top: w.y, width: 7, height: 9, background: w.cool ? "#9cc6ff" : "#ffd18c", opacity: (w.cool ? 0.75 : 0.55) * on, boxShadow: w.cool ? "0 0 6px rgba(140,190,255,0.8)" : undefined }} /> : null;
        })}
        {/* water of the bay */}
        <div style={{ position: "absolute", left: 0, top: HZ, width: 1920, height: 1080 - HZ, background: "linear-gradient(180deg, #0b1622 0%, #07101a 40%, #03070c 100%)" }} />
        {/* the city's reflection, broken */}
        {WINDOWS.filter((_, i) => i % 3 === 0).map((w, i) => {
          const on = interpolate(f, [w.off, w.off + 12], [1, 0], CL) * cityDim;
          return on > 0.02 ? <div key={i} style={{ position: "absolute", left: w.x - 2 + Math.sin(f / 9 + i) * 2, top: HZ + (HZ - w.y) * 0.8, width: 11, height: 3, background: w.cool ? "#9cc6ff" : "#ffd18c", opacity: 0.18 * on }} /> : null;
        })}
        <div style={{ position: "absolute", left: 0, top: HZ, width: 1920, height: 1.5, background: "rgba(200,220,245,0.35)" }} />
        {/* everyone else's light on the water, far to near */}
        {[...OTHERS].sort((a, b) => b.z - a.z).map((o, i) => {
          const on = interpolate(f, [o.off, o.off + 20], [1, 0], CL);
          if (on <= 0.01) return null;
          const bob = Math.sin(f / 16 + o.ph) * (3 / o.z);
          return (
            <div key={i} style={{ position: "absolute", left: o.x, top: o.y + bob, width: 0, height: 0, opacity: on }}>
              <div style={{ position: "absolute", left: -o.r * 4, top: -o.r * 4, width: o.r * 8, height: o.r * 8, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,190,110,0.28), rgba(255,170,90,0) 65%)" }} />
              <div style={{ position: "absolute", left: -o.r, top: -o.r, width: o.r * 2, height: o.r * 2, borderRadius: "50%", background: "radial-gradient(circle at 42% 38%, #fff, #ffd9a0 55%, #f0a055)", boxShadow: `0 0 ${o.r * 1.5}px rgba(255,200,130,0.7)` }} />
              <div style={{ position: "absolute", left: -o.r * 3, top: o.r * 0.6, width: o.r * 6, height: Math.max(1, o.r * 0.3), borderRadius: "50%", background: "rgba(255,200,130,0.25)" }} />
            </div>
          );
        })}
        {/* yours */}
        <div style={{ opacity: meDim, transform: `scale(${ME_S})`, transformOrigin: `${ME.x}px ${ME.y}px` }}>
          <Orb s={{ d: ME.y - 600 + Math.sin(f / 16) * 1.5, v: 0, ox: ME.x }} f={f} under={false} flareAt={-999}  strainFrom={-2} strainTo={-1} />
        </div>
      </AbsoluteFill>

      {intro > 0 && (
        <AbsoluteFill style={{ opacity: intro }}>
          <WaterScene f={f + 2460} orbs={[{ x: 960, d: D0, v: 0 }]} />
        </AbsoluteFill>
      )}

      <Say f={f} at={60} out={180} text="今晚，有很多人和你一样醒着。" top={110} size={80} />
      <Say f={f} at={186} out={300} text="一半以上的 00 后，零点以后才睡。" gold="零点以后" top={110} size={80} />
      <Src f={f} at={190} out={300} text="《2025 年中国睡眠健康调查报告》" />
      <Say f={f} at={306} out={PUSH_FROM - 4} text="他们心里，大概也有那个声音。" top={110} size={80} />
      <Say f={f} at={PUSH_TO - 30} out={S7_LEN - 14} text="今晚要是又熬了，" top={170} size={76} weight={600} dim={0.9} />
      <Say f={f} at={PUSH_TO + 6} out={S7_LEN - 14} text="别怪自己。" gold="别怪自己" top={290} size={116} />

      <Dressing />
    </AbsoluteFill>
  );
};
