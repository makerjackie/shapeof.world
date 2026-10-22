import React from "react";
import { AbsoluteFill } from "remotion";
import { Curve, lin, linePath, stepPath, toXY } from "../charts";
import { DRAM_REV, NVDA, PJM_PLOT, Pt, T0, T1, UNRATE } from "../data";
import { EBACK, EIO, EO, Glass, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { Lanes, LANE_BOX } from "../lanes";
import { FONT, K, LANES, SERIF } from "../theme";
import { Head, Src } from "../ui";

// 0 s: the whole conclusion is on screen from the first frame, over the full four-lane timeline; it slams on beat 0.
export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  const hit = frame >= 0 ? Math.max(0, 1 - frame / 16) : 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: 0.34 + hit * 0.3, transform: `scale(${1 + 0.035 * hit})`, transformOrigin: "960px 540px" }}>
        <Lanes stations={1} flash={hit} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 62% 34% at 50% 50%, rgba(7,9,11,0.94) 0%, rgba(7,9,11,0.7) 55%, rgba(7,9,11,0) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 46% 22% at 50% 50%, rgba(255,226,160,0.30) 0%, rgba(255,209,102,0.10) 45%, rgba(255,209,102,0) 75%)", opacity: hit }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 404, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: `scale(${1 + 0.05 * hit})` }}>
        <div style={{ fontFamily: FONT, fontSize: 84, fontWeight: 900, color: K.fg, letterSpacing: -1, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.9)" }}>
          AI 来了四年：<span style={{ color: K.money }}>钱</span>、<span style={{ color: K.chip }}>芯片</span>、<span style={{ color: K.power }}>电</span>都变了天，
        </div>
        <div style={{ fontFamily: FONT, fontSize: 84, fontWeight: 900, color: K.fg, letterSpacing: -1, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.9)" }}>
          你的<span style={{ color: K.work }}>工作</span>还没有——<span style={{ color: K.gold }}>除了第一份</span>。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 5 s: the shape. Three lines shoot up, one barely moves; at the very end a thin red line in the work lane sinks.
const SHAPE_BOX = { x: 360, y: 268, w: 1440, h: 590 };

export const Shape: React.FC = () => {
  const frame = useBeatFrame();
  const draws = [0, 1, 2, 3].map((i) => progAt(frame, 0.4 + i * 0.6, 4.4, EIO));
  const young = progAt(frame, 7, 1.6, EO);
  return (
    <AbsoluteFill>
      <Lanes box={SHAPE_BOX} draw={draws} young={young} />
      <div style={{ position: "absolute", left: 120, top: 112 }}>
        <Head at={0} size={66} parts={["三条线", { t: "冲上了天", c: K.fg }, "，一条", { t: "几乎没动", c: K.work }, "。"]} />
      </div>
      <div style={{ position: "absolute", left: 1220, top: 930 }}>
        <In at={7.4} from="left">
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.red, whiteSpace: "nowrap" }}>……只有一个角落，在往下掉。</div>
        </In>
      </div>
      <Src>各泳道纵轴从 0 起 · 英伟达：收盘价 × SEC 股数 · 内存：TrendForce · 电网：PJM 拍卖 · 失业率：美国劳工统计局</Src>
    </AbsoluteFill>
  );
};

// 9 s: four questions, one per lane, each card flipping in on a beat with its lane's real curve.
const MINI: { pts: Pt[]; max: number; step?: boolean }[] = [
  { pts: NVDA, max: 6.2 },
  { pts: DRAM_REV, max: 165 },
  { pts: PJM_PLOT, max: 360, step: true },
  { pts: UNRATE, max: 10 },
];
const QUESTIONS = ["谁在花这么多钱？", "为什么突然变贵？", "为什么电不够了？", "哪个角落在往下掉？"];

export const Why: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 150 }}>
        <Head at={0} size={76} parts={["四年，", { t: "1,422 天", c: K.theme }, "。到底变了什么？"]} />
      </div>
      {LANES.map((lane, i) => {
        const x = 120 + i * 430;
        const y = 380;
        const w = 400;
        const h = 470;
        const q = progAt(frame, 1.5 + i, 1, EBACK);
        const box = { x: x + 28, y: y + 230, w: w - 56, h: 190 };
        const m = MINI[i];
        const sx = lin(T0, T1, box.x, box.x + box.w);
        const sy = lin(0, m.max, box.y + box.h, box.y);
        const pts = toXY(m.pts, sx, sy);
        const d = m.step ? stepPath(pts, sx(T1)) : linePath(pts);
        return (
          <div key={lane.key} style={{ position: "absolute", inset: 0, perspective: 1600 }}>
            <div style={{ position: "absolute", inset: 0, transformOrigin: `${x + w / 2}px ${y + h / 2}px`, transform: `rotateY(${(1 - q) * -90}deg)`, opacity: q > 0.02 ? 1 : 0 }}>
              <Glass glow={lane.color} style={{ position: "absolute", left: x, top: y, width: w, height: h, borderColor: `${lane.color}55` }}>
                <div style={{ position: "absolute", left: 28, top: 26, fontSize: 64, fontWeight: 900, color: lane.color }}>{lane.name}</div>
                <div style={{ position: "absolute", left: 30, top: 116, fontSize: 38, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>{QUESTIONS[i]}</div>
                <div style={{ position: "absolute", left: 30, top: 172, fontSize: 21, fontWeight: 600, color: K.muted }}>{lane.series} · 2022-11 → 今天</div>
              </Glass>
              <Curve id={`why-${lane.key}`} box={box} d={d} color={lane.color} draw={progAt(frame, 1.8 + i, 1.6, EIO)} width={4} area={`${d}L${box.x + box.w},${box.y + box.h}L${box.x},${box.y + box.h}Z`} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 13 s: the title card, on the music's first main section: the four lines bundle behind the title.
export const TitleCard: React.FC = () => {
  const frame = useBeatFrame();
  const p = progAt(frame, 0, 1.2, EBACK);
  const sub = progAt(frame, 1.5, 1, EO);
  const rule = progAt(frame, 0.6, 1.4, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
        <Lanes box={{ ...LANE_BOX, y: 160, h: 760 }} labels={false} today={false} dot={0} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(7,9,11,0.92) 0%, rgba(7,9,11,0.55) 50%, transparent 80%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div style={{ fontFamily: FONT, fontSize: 156, fontWeight: 900, letterSpacing: -5, color: K.fg, opacity: Math.min(1, p * 1.5), transform: `scale(${0.86 + 0.14 * p})`, whiteSpace: "nowrap" }}>AI 到底改变了什么</div>
        <div style={{ display: "flex", gap: 0, width: 900 * rule, height: 6, borderRadius: 3, overflow: "hidden" }}>
          {LANES.map((l) => (
            <div key={l.key} style={{ flex: 1, background: l.color }} />
          ))}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: K.sub, opacity: sub, letterSpacing: 8, whiteSpace: "nowrap" }}>· 世界的形状 ·</div>
      </div>
    </AbsoluteFill>
  );
};
