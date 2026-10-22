import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { gridPos, Tile } from "../art";
import { At, CL, EIO, EO, Glass, In, Kinetic, lerp, Odometer, progAt } from "../fx";
import { Stamp, useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Src } from "../ui";

// ───────── 4. Supply: 2,000 → 14,700 new subscription apps a month ─────────

// Rain of tiles whose density follows the counter: rate 1 until beat 4, rising to 7 by beat 9, then 7.
const rateArea = (b: number) => (b < 4 ? b : b < 9 ? 4 + (b - 4) + (3 * (b - 4) ** 2) / 5 : 24 + 7 * (b - 9));
const DROPS = 300;
const PER_UNIT = DROPS / rateArea(16);
const spawnBeat = (k: number) => {
  let lo = 0, hi = 16;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (rateArea(mid) * PER_UNIT < k) lo = mid;
    else hi = mid;
  }
  return lo - 1.6;
};
const RAIN = Array.from({ length: DROPS }, (_, k) => ({
  b: spawnBeat(k),
  x: 60 + random(`rx${k}`) * 1800,
  s: 26 + random(`rs${k}`) * 26,
  rot: (random(`rr${k}`) - 0.5) * 40,
}));

export const Supply: React.FC = () => {
  const frame = useBeatFrame();
  const beat = frame / FPB;
  const v = interpolate(beat, [4, 9], [2000, 14700], { ...CL, easing: EIO });
  const late = progAt(frame, 4, 0.6);
  return (
    <AbsoluteFill>
      {RAIN.map((d, k) => {
        const t = (beat - d.b) / 1.8;
        if (t < 0 || t > 1) return null;
        return (
          <div key={k} style={{ position: "absolute", left: d.x, top: lerp(-80, 1160, t), opacity: 0.5, transform: `rotate(${d.rot + t * 30}deg)` }}>
            <Tile size={d.s} tone="blue" face={d.s > 34} mood="idle" />
          </div>
        );
      })}
      <At x={960} y={150} center>
        <Kinetic at={0} size={72} parts={["每个月新上线的订阅 App"]} />
      </At>
      <At x={960} y={480} center>
        <In at={0.8} from="scale">
          <Glass style={{ padding: "34px 80px 40px", display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(7,9,11,0.82)" }}>
            <div style={{ position: "relative", height: 56, width: 360 }}>
              <div style={{ position: "absolute", inset: 0, textAlign: "center", fontSize: 44, fontWeight: 700, color: K.sub, opacity: 1 - late }}>2022 年 1 月</div>
              <div style={{ position: "absolute", inset: 0, textAlign: "center", fontSize: 44, fontWeight: 700, color: K.themeHi, opacity: late }}>2026 年 1 月</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <Odometer value={v} size={200} color={K.fg} />
              <span style={{ fontSize: 60, fontWeight: 900, color: K.sub }}>个</span>
            </div>
          </Glass>
        </In>
      </At>
      <At x={1560} y={470} center>
        <Stamp at={9.4} color={K.theme} size={110} rotate={-8}>
          ×7
        </Stamp>
      </At>
      <At x={960} y={820} center>
        <Kinetic at={11} size={84} parts={["做出东西，", { t: "不再稀缺", c: K.themeHi }]} />
      </At>
      <Src>RevenueCat《订阅 App 报告》2026（数据来自 Appfigures）· 每月新上线的订阅制 App</Src>
    </AbsoluteFill>
  );
};

// ───────── 5. Product Hunt: of every 100 launches, how many reach the front page ─────────

const S_SIZE = 62;
const S_GAP = 14;
const S_TOP = 300;
const SPOT = gridPos(100, 20, S_SIZE, S_GAP, 960, S_TOP);
// 2023: 37 of 100 featured (cols 6–13 of the 5 rows, minus three corners); 2026: 4 (the middle 2 × 2).
const LIT37 = new Set(SPOT.map((p, i) => ({ p, i })).filter(({ p }) => p.c >= 6 && p.c <= 13).map(({ i }) => i).filter((i) => ![6, 13, 86].includes(i)));
const LIT4 = new Set([29, 30, 49, 50]);
const centre = { x: 960, y: S_TOP + (5 * (S_SIZE + S_GAP) - S_GAP) / 2 };

export const Spotlight: React.FC = () => {
  const frame = useBeatFrame();
  const on = progAt(frame, 2, 0.8);
  const narrow = progAt(frame, 8, 1.6, EIO);
  const beamW = lerp(8 * (S_SIZE + S_GAP) + 40, 2 * (S_SIZE + S_GAP) + 40, narrow);
  const n = Math.round(lerp(37, 4, narrow));
  return (
    <AbsoluteFill>
      <At x={960} y={140} center>
        <Kinetic at={0} size={72} parts={["每 100 个发到 ", { t: "Product Hunt", c: K.themeHi }, " 的新产品"]} />
      </At>
      <At x={960} y={226} center>
        <In at={2.2}>
          <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>被推上首页的：</div>
        </In>
      </At>
      {/* The beam: a soft cone from above onto the lit cluster */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 760,
          opacity: on * 0.9,
          clipPath: `polygon(${960 - 70}px 0px, ${960 + 70}px 0px, ${centre.x + beamW / 2}px ${centre.y + 210}px, ${centre.x - beamW / 2}px ${centre.y + 210}px)`,
          background: "linear-gradient(to bottom, rgba(255,240,200,0.0), rgba(255,240,200,0.16) 55%, rgba(255,240,200,0.0))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: centre.x - beamW / 2 - 30,
          top: centre.y - 200,
          width: beamW + 60,
          height: 400,
          borderRadius: "50%",
          opacity: on,
          background: "radial-gradient(ellipse at center, rgba(255,240,200,0.22) 0%, rgba(255,240,200,0.06) 55%, transparent 72%)",
        }}
      />
      {SPOT.map((p, i) => {
        const enter = progAt(frame, 0.3 + p.c * 0.04, 0.8);
        const lit37 = LIT37.has(i) && on > 0.5;
        // Lit tiles that lose the light go dark in order of distance from the centre.
        const dist = Math.hypot(p.x + S_SIZE / 2 - centre.x, p.y + S_SIZE / 2 - centre.y);
        const off = !LIT4.has(i) && progAt(frame, 8 + (1 - dist / 420) * 1.2, 0.3) > 0.5;
        const lit = lit37 && !off;
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, opacity: Math.min(1, enter * 2) }}>
            <Tile size={S_SIZE} tone={lit ? "blue" : "dark"} mood={lit ? "happy" : "idle"} glow={lit ? 0.5 : 0} />
          </div>
        );
      })}
      <At x={960} y={790} center>
        <In at={2.6}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 26, fontFamily: FONT, fontWeight: 900, whiteSpace: "nowrap" }}>
            <div style={{ position: "relative", width: 230, height: 70, fontSize: 56, color: K.sub }}>
              <span style={{ position: "absolute", right: 0, opacity: 1 - narrow }}>2023 年</span>
              <span style={{ position: "absolute", right: 0, opacity: narrow, color: K.fg }}>2026 年</span>
            </div>
            <Odometer value={n} size={150} color={narrow > 0.5 ? K.red : K.themeHi} />
            <span style={{ fontSize: 56, color: K.sub }}>个</span>
          </div>
        </In>
      </At>
      <Src>hunted.space 统计的 Product Hunt 数据 · 推上首页的比例：2023 年 37%，2026 年 4%（截至 10 月 21 日）</Src>
    </AbsoluteFill>
  );
};

// ───────── 6. Search: of every 100 Google visits, how many click through to a site ─────────

const DOT = 24;
const DOT_GAP = 10;

const DotGrid: React.FC<{ x: number; lit: number; at: number; color: string }> = ({ x, lit, at, color }) => {
  const frame = useBeatFrame();
  return (
    <div style={{ position: "absolute", left: x - (10 * (DOT + DOT_GAP) - DOT_GAP) / 2, top: 330 }}>
      {Array.from({ length: 100 }, (_, i) => {
        const on = i < lit && frame >= (at + i * 0.12) * FPB;
        const p = progAt(frame, 0.2 + Math.floor(i / 10) * 0.08, 0.6);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (i % 10) * (DOT + DOT_GAP),
              top: Math.floor(i / 10) * (DOT + DOT_GAP),
              width: DOT,
              height: DOT,
              borderRadius: "50%",
              background: on ? color : "#252a32",
              boxShadow: on ? `0 0 14px ${color}` : undefined,
              opacity: p,
            }}
          />
        );
      })}
    </div>
  );
};

export const Search: React.FC = () => {
  const frame = useBeatFrame();
  const left = 600;
  const right = 1320;
  const card = progAt(frame, 3.6, 0.8, EO);
  return (
    <AbsoluteFill>
      <At x={960} y={140} center>
        <Kinetic at={0} size={72} parts={["每 100 次 Google 搜索，", { t: "点进网页的", c: K.themeHi }]} />
      </At>
      <At x={left} y={272} center>
        <In at={0.8}>
          <div style={{ fontFamily: FONT, fontSize: 42, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>没有 AI 摘要</div>
        </In>
      </At>
      <At x={right} y={272} center>
        <In at={3.4}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT, fontSize: 42, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            有
            <span style={{ display: "inline-block", padding: "4px 16px", borderRadius: 12, background: "#9b7bff2a", border: "2px solid #9b7bff", color: "#cbb8ff", transform: `translateY(${(1 - card) * -40}px)` }}>AI 摘要</span>
          </div>
        </In>
      </At>
      <DotGrid x={left} lit={15} at={1.2} color={K.theme} />
      <DotGrid x={right} lit={8} at={4} color={K.red} />
      <At x={left} y={760} center>
        <In at={2.6} from="scale">
          <span style={{ fontFamily: FONT, fontSize: 150, fontWeight: 900, color: K.themeHi }}>15</span>
          <span style={{ fontFamily: FONT, fontSize: 52, fontWeight: 900, color: K.sub }}> 次</span>
        </In>
      </At>
      <At x={right} y={760} center>
        <In at={5.2} from="scale">
          <span style={{ fontFamily: FONT, fontSize: 150, fontWeight: 900, color: K.red }}>8</span>
          <span style={{ fontFamily: FONT, fontSize: 52, fontWeight: 900, color: K.sub }}> 次</span>
        </In>
      </At>
      <At x={960} y={920} center>
        <Kinetic at={7.6} size={84} parts={["被看见，", { t: "越来越难", c: K.red }]} />
      </At>
      <Src>皮尤研究中心 2025 · 900 名美国成年人、6.9 万次搜索 · 点了普通搜索结果的访问占比</Src>
    </AbsoluteFill>
  );
};
