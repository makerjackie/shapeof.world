import React from "react";
import { AbsoluteFill } from "remotion";
import { Odometer } from "../fx";
import { MiniRam } from "../samples/art";
import { SERIF } from "../theme";
import { ChatBox, Crowd, DcBuilding, GpuHall, hallSlot, Skyline } from "../v3/art";
import { CARD, CartCard } from "../v3/opening";
import { bar, beat, BEAT } from "../v3/timing";
import { At, bump, clamp01, E, Key, lerp, Plane, pr, rnd, Stage, useT } from "./engine";
import { Fine, Stamp, Words } from "./type";

// 开场 0–8 + 片名 8–10 (PLAN-v4 S1–S5). One camera move, the signature shot: your cart → everyone's carts and the
// data hall their memory flows into → the whole city at dawn; then the rewind rushes back to where we started, the
// world goes dark, years fly past, and only a chat box from 2022 is left.

const B = (n: number) => bar(n);
export const Q = {
  q1: ["一根电脑内存条，", "怎么涨到了 3,800？"],
  q2: ["做显卡的公司，", "怎么成了全球最值钱？"],
  q3: ["都说 AI 要抢饭碗，", "它到底抢了谁的？"],
  q4: ["这一切，", "都从四年前的一个聊天框开始。"],
};

// price steps of the opening hook (the user's chosen opening: the number jumps, then lands in the cart)
export const STEPS: [number, number][] = [
  [0.0, 900],
  [beat(1), 1600],
  [beat(2), 2400],
  [beat(3), 3100],
  [B(1), 3800],
];
const valueAt = (t: number) => {
  let v = STEPS[0][1];
  for (let i = 1; i < STEPS.length; i++) v = lerp(v, STEPS[i][1], pr(t, STEPS[i][0] - 0.1, 0.16));
  return v;
};

// world layout
const CX = -CARD.w / 2; // our cart, top-left
const CY = -150;
const SLOT = { x: CX + CARD.w - 50, y: CY + 352 };
const HALL = { x: -1980, y: -1900, s: 3, w: 1320, h: 300 };
const KDC = (HALL.w * HALL.s) / 560; // building scale: its glass front (560 wide) matches the hall
const DC = { x: HALL.x - 20 * KDC, y: HALL.y - 50 * KDC + (HALL.h * HALL.s - 158 * KDC) / 2, w: 600, h: 250 };
const GROUND = DC.y + DC.h * KDC; // world y of the street
const CITY = { x: -9600, y: GROUND - 880 * 10, s: 10 };
const carts = (() => {
  const out: { c: number; r: number; x: number; y: number; d: number }[] = [];
  for (let r = -1; r <= 1; r++) for (let c = -3; c <= 3; c++) if (r || c) out.push({ c, r, x: CX + c * 1150, y: CY + r * 700, d: Math.hypot(c, r * 1.4) });
  return out;
})();

export const REWIND = B(6);
export const USER_AT = B(7);
export const REPLY_AT = B(7) + 0.82;
const BOX = { w: 860, h: 330 };

const KEYS: Key[] = [
  [0, { x: 0, y: -30, z: 1.0 }],
  [B(1) - 0.03, { z: 0.95 }, E.inOut],
  [B(1) + 0.06, { z: 0.99 }, E.out],
  [B(1) + 0.7, { z: 0.95 }, E.out],
  [B(2), { x: 40, y: 30, z: 1.0 }, E.inOut],
  [B(2) + 1.0, { x: 0, y: -1350, z: 0.42 }, E.inOut],
  [B(4), { x: 60, y: -1520, z: 0.33 }, E.lin],
  [B(4) + 1.35, { x: 0, y: -4300, z: 0.1 }, E.inOut],
  [B(6), { x: -300, y: -4500, z: 0.088 }, E.lin],
  [B(6) + 0.85, { x: 0, y: 0, z: 1.0 }, E.in],
  [B(8), { z: 1.1 }, E.out],
];

const Spark: React.FC<{ at: number; x: number; y: number; color: string; n?: number; r?: number }> = ({ at, x, y, color, n = 14, r = 260 }) => {
  const t = useT();
  const p = pr(t, at, 0.5);
  if (p <= 0 || p >= 1) return null;
  return (
    <>
      {Array.from({ length: n }).map((_, k) => {
        const a = rnd(`sp${at}${k}`) * Math.PI * 2;
        const d = r * (0.5 + rnd(`sd${at}${k}`) * 0.7);
        return <div key={k} style={{ position: "absolute", left: x + Math.cos(a) * d * p, top: y + Math.sin(a) * d * p * 0.7, width: 22, height: 6, borderRadius: 3, background: color, transform: `rotate(${a}rad)`, opacity: 1 - p }} />;
      })}
    </>
  );
};

export const OpenWorld: React.FC = () => {
  const t = useT();
  const v = valueAt(t);
  const heat = clamp01((v - 900) / 2900);
  const red = `rgb(${Math.round(lerp(244, 255, heat))},${Math.round(lerp(240, 90, heat))},${Math.round(lerp(232, 95, heat))})`;
  const pump = STEPS.slice(1).reduce((a, [s]) => a + bump(t, s, 0.03, 0.2) * 0.07, 0);
  const fly = pr(t, beat(2) - 0.05, 0.45, E.inOut);
  const cardIn = pr(t, beat(2) - 0.08, 0.5);
  const numSize = lerp(300, 132, fly) * (1 + pump);
  const nx = lerp(0, SLOT.x, fly);
  const ny = lerp(40, SLOT.y, fly);
  const ax = lerp(-50, -100, fly);
  const world = 1 - pr(t, REWIND + 0.12, 0.55, E.in);
  const cartsOut = pr(t, B(4), 0.6, E.inOut);
  const hallIn = pr(t, B(2) + 0.45, 0.6, E.back);
  const toDc = pr(t, B(4) + 0.25, 0.6, E.inOut);
  const city = pr(t, B(4) + 0.1, 1.2);
  const leave = (i: number) => B(2) + 0.55 + rnd(`lv${i}`) * 0.9;
  const lit = Array.from({ length: 10 }, (_, i) => pr(t, B(2) + 0.8 + ((i * 7) % 10) * 0.3, 0.4));
  const card = (price: number, color: string, scale: number, show: boolean, gone: number, stock: string, id: string) => (
    <CartCard price={price} priceColor={color} priceScale={scale} showPrice={show} month={t >= B(1) ? "2026 年 7 月" : "2025 年"} stock={stock} ramGone={gone} struck={pr(t, B(1), 0.3)} id={id} />
  );
  return (
    <Stage keys={KEYS}>
      <Plane>
        <div style={{ opacity: world }}>
          {/* city behind everything */}
          {city > 0 ? (
            <At x={CITY.x} y={CITY.y} s={CITY.s}>
              <Skyline t={t} open={city} ground={880} dawn={pr(t, B(4) + 0.4, 2.6)} />
            </At>
          ) : null}
          {toDc > 0 ? (
            <At x={DC.x} y={DC.y} s={KDC}>
              <DcBuilding w={DC.w} h={DC.h} t={t} o={toDc} />
            </At>
          ) : null}
          {/* the data hall */}
          {hallIn > 0 && toDc < 1 ? (
            <At x={HALL.x} y={HALL.y + (1 - hallIn) * -300} s={HALL.s} o={clamp01(hallIn * 2) * (1 - toDc)}>
              <div style={{ position: "absolute", left: -400, top: -200, width: HALL.w + 800, height: HALL.h + 500, background: "radial-gradient(ellipse at 50% 55%, rgba(77,212,255,0.22), transparent 65%)" }} />
              <GpuHall w={HALL.w} h={HALL.h} t={t} lit={lit} />
            </At>
          ) : null}
          {/* everyone's carts */}
          {carts.map((k, i) => {
            const p = pr(t, B(2) + 0.25 + k.d * 0.12, 0.5);
            if (p <= 0 || cartsOut >= 1) return null;
            const gone = pr(t, leave(i), 0.3);
            return (
              <At key={i} x={k.x} y={k.y + (1 - p) * 60} o={p * (1 - cartsOut)}>
                {card(3800, "#ff5a5f", 1, true, gone, gone > 0 ? "缺货" : "库存紧张", `o4c${i}`)}
              </At>
            );
          })}
          {/* RAM flowing up into the hall: a river of sticks */}
          {carts.concat([{ c: 0, r: 0, x: CX, y: CY, d: 0 }]).map((k, i) =>
            [0, 1, 2, 3, 4, 5].map((j) => {
              const s0 = (i === carts.length ? B(2) + 0.6 : leave(i)) + j * 0.38 + (j % 2) * 0.07;
              const p = pr(t, s0, 0.95, E.inOut);
              if (p <= 0 || p >= 1) return null;
              const slot = hallSlot((i * 3 + j * 7) % 10, HALL.w, HALL.h);
              const x0 = k.x + 160 + j * 30;
              const y0 = k.y + 200;
              const x1 = HALL.x + slot.x * HALL.s;
              const y1 = HALL.y + slot.y * HALL.s;
              const bend = (rnd(`bd${i}${j}`) - 0.5) * 900;
              return (
                <At key={`${i}-${j}`} x={lerp(x0, x1, p) + Math.sin(p * Math.PI) * bend} y={lerp(y0, y1, p)} r={(1 - p) * -30 + j * 10} o={Math.min(1, (1 - p) * 4)}>
                  <div style={{ filter: "drop-shadow(0 0 18px rgba(77,212,255,0.9))" }}>
                    <MiniRam w={lerp(180, 120, p)} color="#4dd4ff" fill="#12202c" />
                  </div>
                </At>
              );
            }),
          )}
          {/* our cart */}
          {cardIn > 0 && cartsOut < 1 ? (
            <At x={CX + (1 - cardIn) * 420} y={CY} o={cardIn * (1 - cartsOut)}>
              {card(v, red, 1 + pump + 0.16 * bump(t, B(1), 0.03, 0.45), fly >= 1, pr(t, B(2) + 0.6, 0.3), t < B(1) + 0.6 ? "有货" : t < B(2) + 0.6 ? "库存紧张" : "缺货", "o4mine")}
            </At>
          ) : null}
          {fly < 1 ? (
            <At x={nx} y={ny}>
              <div style={{ transform: `translate(${ax}%, -50%)`, textShadow: heat > 0.4 ? `0 0 60px rgba(255,90,95,${0.5 * heat})` : undefined }}>
                <Odometer value={v} size={numSize} prefix="¥" color={red} />
              </div>
            </At>
          ) : null}
          {STEPS.slice(1).map(([s], i) => (
            <Spark key={i} at={s} x={i < 2 ? 0 : SLOT.x - 200} y={i < 2 ? 40 : SLOT.y} color={i === 3 ? "#ffd166" : "#ff5a5f"} n={i === 3 ? 22 : 12} r={i === 3 ? 340 : 240} />
          ))}
          {cartsOut < 1 ? (
            <At x={CX + 40} y={CY + 300} o={1 - cartsOut}>
              <Stamp at={B(1) + BEAT} text="涨到 4 倍多" color="#ff5a5f" size={52} />
            </At>
          ) : null}
          {/* crowd in front, the third question in the sky */}
          {city > 0 ? (
            <At x={CITY.x} y={CITY.y} s={CITY.s}>
              <Crowd t={t} ground={880} open={pr(t, B(4) + 0.7, 0.6)} asks={[B(4) + 1.2, B(4) + 1.2 + BEAT, B(5), B(5) + 2 * BEAT]} />
            </At>
          ) : null}
          <Words at={0.1} lines={Q.q1} x={0} y={-470} size={80} align="center" kw={["3,800"]} kwColor="#ff5a5f" kwAt={B(1)} out={B(2) + 0.55} outStyle="fade" />
          <Words at={B(2) + 0.55} lines={Q.q2} x={0} y={-2380} size={196} align="center" kw={["全球最值钱"]} kwAt={B(3) + 0.2} out={B(4) + 0.1} outStyle="fade" cps={24} />
          <Words at={B(4) + 0.95} lines={Q.q3} x={0} y={-8350} size={760} align="center" kw={["谁的"]} kwAt={B(5) + BEAT} out={B(6) - 0.35} outStyle="fade" cps={24} />
        </div>
        {/* 2022: the chat box alone in the dark */}
        <ChatAlone />
      </Plane>
    </Stage>
  );
};

// The chat box at the origin, with the fourth question above and the date under it (B6+0.8 → B8).
const ChatAlone: React.FC = () => {
  const t = useT();
  const inn = pr(t, REWIND + 0.78, 0.5, E.back);
  if (inn <= 0 || t >= B(8)) return null;
  return (
    <>
      <At x={0} y={80} anchor="c" s={lerp(0.86, 1, inn)} o={clamp01(inn * 1.5)}>
        <div style={{ position: "absolute", left: -300, top: -260, width: BOX.w + 600, height: BOX.h + 520, background: "radial-gradient(ellipse at 50% 50%, rgba(77,212,255,0.16), transparent 60%)" }} />
        <ChatBox t={t} w={BOX.w} h={BOX.h} userAt={USER_AT} replyAt={REPLY_AT} />
      </At>
      <Words at={REWIND + 1.0} lines={Q.q4} x={0} y={-330} size={62} align="center" reveal="blur" cps={22} out={B(8) - 0.3} outStyle="blur" />
    </>
  );
};

// Years flying past during the rewind, screen space.
export const Rewind: React.FC = () => {
  const t = useT();
  if (t < REWIND || t > B(8)) return null;
  const years = ["2026", "2025", "2024", "2023"];
  const d = pr(t, REWIND + 0.82, 0.5);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {years.map((y, k) => {
        const s0 = REWIND + 0.08 + k * 0.17;
        const p = pr(t, s0, 0.42, E.in);
        if (p <= 0 || p >= 1) return null;
        return (
          <div key={y} style={{ position: "absolute", left: 960, top: 540, transform: `translate(-50%, -50%) scale(${lerp(0.25, 5, p)})`, opacity: Math.sin(p * Math.PI) * 0.85, filter: `blur(${p * 6}px)`, fontFamily: SERIF, fontWeight: 700, fontSize: 220, color: "#f4f0e8", letterSpacing: 8 }}>
            {y}
          </div>
        );
      })}
      {d > 0 ? (
        <div style={{ position: "absolute", left: 960, top: 820, transform: `translate(-50%, 0) scale(${lerp(1.6, 1, d)})`, opacity: d, fontFamily: SERIF, fontWeight: 700, fontSize: 44, letterSpacing: 8, color: "#b8b8b3", filter: d < 1 ? `blur(${(1 - d) * 6}px)` : undefined }}>
          2022.11.30
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// 片名 8–10: the music comes in, the chat box opens out to the edges of the frame and the name rises out of it; then
// the name breaks into the swarm of chat boxes (S6).
export const Title4: React.FC = () => {
  const t = useT();
  if (t < B(8) || t > B(10) + 0.4) return null;
  const open = pr(t, B(8), 0.7, E.inOut);
  const rule = pr(t, B(8) + 0.55, 0.8);
  const sub = pr(t, B(8) + 0.9, 0.6);
  const leave = pr(t, B(10) - 0.35, 0.5, E.in);
  const push = lerp(1, 1.09, pr(t, B(8), B(10) - B(8), E.lin));
  const sweep = pr(t, B(8) + 1.0, 1.1, E.inOut);
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      {open < 1 ? (
        <div style={{ position: "absolute", left: 960 - BOX.w / 2, top: 620 - BOX.h / 2, transform: `scale(${lerp(1.04, 2.6, open)})`, opacity: 1 - open, filter: open > 0.1 ? `blur(${open * 10}px)` : undefined }}>
          <ChatBox t={t} w={BOX.w} h={BOX.h} userAt={USER_AT} replyAt={REPLY_AT} />
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${lerp(1, 0.6, leave)})`, opacity: 1 - leave, filter: leave > 0 ? `blur(${leave * 12}px)` : undefined }}>
        <Words at={B(8) + 0.1} lines={["AI 到底改变了什么"]} x={960} y={370} size={156} align="center" cps={16} glow="rgba(77,212,255,0.35)" />
        {sweep > 0 && sweep < 1 ? (
          <div style={{ position: "absolute", left: lerp(260, 1660, sweep) - 120, top: 340, width: 240, height: 260, background: "linear-gradient(90deg, transparent, rgba(166,236,255,0.22), transparent)", transform: "skewX(-18deg)", mixBlendMode: "screen" }} />
        ) : null}
        <div style={{ position: "absolute", left: 960 - 400 * rule, top: 590, width: 800 * rule, height: 4, borderRadius: 2, background: "linear-gradient(90deg, transparent, #4dd4ff, transparent)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 628, textAlign: "center", fontFamily: SERIF, fontSize: 38, fontWeight: 600, color: "#b8b8b3", opacity: sub, letterSpacing: 4 }}>ChatGPT 四年 · 2022.11.30 – 2026.11.30</div>
      </div>
    </AbsoluteFill>
  );
};

export const OpenFine: React.FC = () => (
  <Fine at={0.4} out={B(2) + 0.2}>
    价格：央视财经 2026 年 7 月，深圳华强北，32GB DDR5 内存套装；10 月中旬报价仍在 3,300–3,900 元（什么值得买）· "4 倍多"为推算
  </Fine>
);
