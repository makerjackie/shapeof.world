import React from "react";
import { AbsoluteFill, random } from "remotion";
import { gridPos, Tile } from "../art";
import { At, EBACK, EIO, EO, In, Kinetic, lerp, progAt, Shockwave } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { FPB } from "../timing";
import { Src } from "../ui";

// ───────── 1. The claim, on screen from frame 0 ─────────

// What the feed shows: the monthly revenue of the 15 well-known indie developers who publish one (research/02, §10).
const FEED = [863632, 424368, 297123, 266043, 245906, 225000, 145000, 108333, 93500, 83374, 83333, 55948, 49343, 22060];
const CARD_H = 92;
const CARD_GAP = 14;

const FeedCard: React.FC<{ v: number }> = ({ v }) => (
  <div style={{ height: CARD_H, display: "flex", alignItems: "center", gap: 20, padding: "0 24px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
    <Tile size={58} tone="green" mood="happy" />
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: K.fg, fontVariantNumeric: "tabular-nums" }}>
      ${v.toLocaleString("en-US")}
      <span style={{ fontSize: 26, fontWeight: 700, color: K.sub }}> / 月</span>
    </div>
  </div>
);

export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  // The feed scrolls one card every two beats, from the first beat on.
  const step = Math.max(0, frame) / (FPB * 2);
  const scroll = (Math.floor(step) + EO(Math.min(1, (step % 1) * 2.2))) * (CARD_H + CARD_GAP);
  const hit = Math.max(0, 1 - Math.abs(frame) / 7);
  const z = (frame / FPB) % 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: K.fg }}>
      {/* Left: what you scroll past */}
      <At x={500} y={170} center>
        <div style={{ fontSize: 42, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>你刷到的独立开发者</div>
      </At>
      <At x={500} y={278} center>
        <div style={{ fontSize: 128, fontWeight: 900, letterSpacing: -4, whiteSpace: "nowrap", color: K.green }}>
          <span style={{ fontSize: 56, color: K.sub, fontWeight: 700, letterSpacing: 0 }}>月入 </span>$145,000
        </div>
      </At>
      <div
        style={{
          position: "absolute",
          left: 280,
          top: 368,
          width: 440,
          height: 300,
          overflow: "hidden",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: CARD_GAP, transform: `translateY(${-scroll % (FEED.length * (CARD_H + CARD_GAP))}px)` }}>
          {[...FEED, ...FEED].map((v, i) => (
            <FeedCard key={i} v={v} />
          ))}
        </div>
      </div>
      {/* Right: all the verified projects */}
      <At x={1420} y={170} center>
        <div style={{ fontSize: 42, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>全部 5,079 个核验过的项目</div>
      </At>
      <At x={1420} y={278} center>
        <div style={{ fontSize: 128, fontWeight: 900, letterSpacing: -4, whiteSpace: "nowrap", color: K.fg }}>
          <span style={{ fontSize: 56, color: K.sub, fontWeight: 700, letterSpacing: 0 }}>月入 </span>$169
        </div>
      </At>
      <At x={1420} y={520} center>
        <div style={{ position: "relative" }}>
          <Tile size={170} tone="sleep" mood="sleep" />
          {[0, 1, 2].map((i) => {
            const t = (z + i * 0.66) % 2;
            return (
              <div key={i} style={{ position: "absolute", left: 150 + t * 30, top: -10 - t * 50, fontSize: 34 + i * 8, fontWeight: 900, color: K.muted, opacity: Math.sin((t / 2) * Math.PI) * 0.9 }}>
                z
              </div>
            );
          })}
        </div>
      </At>
      <div style={{ position: "absolute", left: 959, top: 140, width: 2, height: 540, background: K.line }} />
      {/* The claim */}
      <At x={960} y={840} center>
        <div style={{ fontSize: 112, fontWeight: 900, letterSpacing: -3, whiteSpace: "nowrap" }}>
          你看到的，是
          <span style={{ display: "inline-block", color: K.gold, transform: `scale(${1 + 0.1 * hit})`, textShadow: `0 0 ${60 * hit}px ${K.gold}aa` }}>幸存者</span>
        </div>
      </At>
      <Shockwave at={0} x={1180} y={840} color={K.gold} />
      <Src at={-2}>左：15 位知名海外独立开发者公开月收入的中位数（推算）　右：Indie Hackers 对 TrustMRR 上 5,079 个 Stripe 核验项目的分析，中位数，2026-03</Src>
    </AbsoluteFill>
  );
};

// ───────── 2. 100 new apps, two years later ─────────

const G_SIZE = 66;
const G_GAP = 14;
const G_TOP = 250;
const order = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => random(`g${a}`) - random(`g${b}`));
// RevenueCat 2026: 17.3% reach $1K a month within two years, 4.6% reach $10K -> 83 / 12 / 5 of 100.
const WIN = new Set(order.slice(0, 5));
const MID = new Set(order.slice(5, 17));
const greyRank = new Map(order.slice(17).map((idx, k) => [idx, k] as const));

export const Grid: React.FC = () => {
  const frame = useBeatFrame();
  const pos = gridPos(100, 20, G_SIZE, G_GAP, 960, G_TOP);
  const winList = order.slice(0, 5);
  const pulse = progAt(frame, 14.8, 0.6) * (0.5 + 0.5 * Math.sin((frame / FPB) * Math.PI));
  return (
    <AbsoluteFill>
      <At x={960} y={140} center>
        <Kinetic at={0} size={72} parts={["100 个新上线的 App，", { t: "两年后", c: K.themeHi }]} />
      </At>
      {pos.map((p, i) => {
        const enter = progAt(frame, 0.3 + p.r * 0.3 + p.c * 0.025, 0.8, EBACK);
        const g = greyRank.get(i);
        const greyed = g !== undefined && frame >= (4 + g * 0.02) * FPB;
        const wi = winList.indexOf(i);
        const won = wi >= 0 && frame >= (9 + wi * 0.25) * FPB;
        const winP = wi >= 0 ? progAt(frame, 9 + wi * 0.25, 0.6, EBACK) : 0;
        const tone = won ? "green" : greyed ? "sleep" : "blue";
        const mood = won ? "happy" : greyed ? "sleep" : MID.has(i) && frame >= 9 * FPB ? "look" : "idle";
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, opacity: Math.min(1, enter * 2), transform: `scale(${(0.4 + 0.6 * enter) * (1 + 0.25 * winP * (1 - winP) * 4 + (won ? 0.06 * pulse : 0))})` }}>
            <Tile size={G_SIZE} tone={tone} mood={mood} glow={won ? 0.6 + 0.4 * pulse : 0} />
          </div>
        );
      })}
      <At x={960} y={730} center>
        <In at={4.4} out={14.3}>
          <div style={{ fontFamily: FONT, fontSize: 60, fontWeight: 900, whiteSpace: "nowrap", color: K.fg }}>
            <span style={{ color: K.sub, fontSize: 84 }}>83</span> 个，月收入从没到过 $1,000
          </div>
        </In>
      </At>
      <At x={960} y={830} center>
        <In at={9.2} out={14.3}>
          <div style={{ fontFamily: FONT, fontSize: 60, fontWeight: 900, whiteSpace: "nowrap", color: K.fg }}>
            只有 <span style={{ color: K.green, fontSize: 84 }}>5</span> 个，到过 $10,000
          </div>
        </In>
      </At>
      <At x={960} y={790} center>
        <Kinetic at={14.8} size={84} parts={["AI 来了，这 ", { t: "5", c: K.green }, " 个会变多吗？"]} />
      </At>
      <Src>RevenueCat《订阅 App 报告》2026 · 11.5 万个订阅制 App · 上线两年内的月收入</Src>
    </AbsoluteFill>
  );
};

// ───────── 3. Title: the tiles fly in and settle into a long tail under the name ─────────

// Column heights of the little long tail under the title (tiles per column).
const TAIL = [9, 5, 3, 2, 2, ...Array(37).fill(1)];
const T_SIZE = 30;
const T_GAP = 6;

export const Title: React.FC = () => {
  const frame = useBeatFrame();
  const s = progAt(frame, 0, 0.7, EBACK);
  const sub = progAt(frame, 1, 0.8);
  const left = 960 - (TAIL.length * (T_SIZE + T_GAP)) / 2;
  let k = 0;
  const tiles: React.ReactNode[] = [];
  TAIL.forEach((h, c) => {
    for (let r = 0; r < h; r++) {
      const id = k++;
      const tx = left + c * (T_SIZE + T_GAP);
      const ty = 990 - (r + 1) * (T_SIZE + T_GAP);
      const sx = random(`tx${id}`) * 2400 - 240;
      const sy = random(`ty${id}`) < 0.5 ? -200 : 1300;
      const p = progAt(frame, -0.4 + random(`td${id}`) * 1.6, 1.2, EIO);
      tiles.push(
        <div key={id} style={{ position: "absolute", left: lerp(sx, tx, p), top: lerp(sy, ty, p), opacity: Math.min(1, p * 3) }}>
          <Tile size={T_SIZE} tone={c === 0 ? "gold" : c < 3 ? "green" : "sleep"} face={false} />
        </div>,
      );
    }
  });
  return (
    <AbsoluteFill>
      {tiles}
      <Shockwave at={0} color={K.theme} size={1800} />
      <At x={960} y={430} center>
        <div style={{ transform: `scale(${2 - s})`, opacity: Math.min(1, s * 2), fontFamily: FONT, fontSize: 176, fontWeight: 900, letterSpacing: -6, whiteSpace: "nowrap" }}>
          独立开发者的<span style={{ color: K.theme }}>形状</span>
        </div>
      </At>
      <At x={960} y={590} center>
        <div style={{ opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`, fontFamily: SERIF, fontSize: 44, fontWeight: 700, color: K.sub, letterSpacing: 12, whiteSpace: "nowrap" }}>世界的形状</div>
      </At>
    </AbsoluteFill>
  );
};
