// v15 opening sample, about 40 s (SCRIPT.md v15.1, sections 一 to 三): who is smartest, who is cheapest, the
// question, the title on flaps, the formula on flaps, then the first two terms. The same five streams of light carry
// every number: they grow as an intelligence ranking, turn into list prices, then into the cost of one hard task.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { bf, sec } from "../v10/bars";
import { Id, M, money, PRICE, TASK } from "../v13/data";
import { cells, clamp01, EO, FLAP_POOL, FlapRow, FONT, GOLD, Grain, INK, lerp, MONO, ramp, rgba, Stream, useFonts, Vignette } from "./kit";

export const OPEN15_FRAMES = bf(18.2);

const IQ: Record<Id, number> = { claude: 58, kimi: 55, chatgpt: 53, glm: 45, deepseek: 45 };
const rankBy = (v: Record<Id, number>, desc = false) =>
  Object.fromEntries([...M].sort((a, b) => (desc ? v[b.id] - v[a.id] : v[a.id] - v[b.id])).map((m, i) => [m.id, i])) as Record<Id, number>;
const RI = rankBy(IQ, true);
const RP = rankBy(PRICE);
const RT = rankBy(TASK);

// timeline in film bars on the 千年之后 edit
const BARS = {
  q1: 0.15, grow0: 0.3, hiC: 1.6, q2: 3.0, m1a: 3.2, m1b: 4.1, s1a: 3.4, s1b: 4.2, hiD: 4.6,
  ask: 5.8, ask2: 6.25, chartOut: 7.7, title: 7.9, titleSub: 8.4, titleOut: 9.8, formula: 9.95,
  barsBack: 10.2, lit1: 10.6, cap17: 11.0, lit2: 12.8, why: 13.6, m2a: 13.4, m2b: 14.4, s2a: 14.0, s2b: 14.8,
  cap23: 15.6, end0: 17.6, end1: 18.2,
} as const;
const S = Object.fromEntries(Object.entries(BARS).map(([k, v]) => [k, sec(v)])) as Record<keyof typeof BARS, number>;

const X0 = 560;
const LEN = 1060;
const ROW0 = 410;
const PITCH = 100;
const FORMULA = [..."真实价格＝单价×用量÷包月倍数＋你的时间"];
const TITLE = cells("AI 的真实价格", 8);
const SUB = cells("第1集 · 文字AI", 10);

const TXT =
  FLAP_POOL + FORMULA.join("") + "AI 的真实价格第1集 · 文字AI谁最聪明？全球最聪明的 AI：Claude谁最便宜？最便宜的 AI 之一：DeepSeek最聪明的，能比最便宜的还便宜吗？" +
  "按标价，Claude 是 DeepSeek 的 17 倍可 AI 干活，按事算同一道难题，有的 AI 想得久、写得长，用掉的 token 多按量付钱，差距拉大到 23 倍" +
  "智能排名（Artificial Analysis 智能指数）每 100 万个 token 的价格（美元）做一道难题的花费（美元）智谱价格：各家官方 API 输出价花费：评测实测 · 2026 年 10 月" +
  "ChatGPTKimiOpus 5.5GPT-6 AstraK3.1 ProGLM-5.3V4.1 Flash0123456789$.";

/** on between a and b, with short fades */
const win = (t: number, a: number, b: number, fi = 0.4, fo = 0.3) => ramp(t, a, a + fi) * (1 - ramp(t, b - fo, b));

export const Open15: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  useFonts([`700 30px ${FONT}`, `900 66px ${FONT}`, `700 40px ${MONO}`, `900 100px ${FONT}`, `700 100px ${FONT}`, `500 18px ${FONT}`], TXT);

  const m1 = ramp(t, S.m1a, S.m1b);
  const m2 = ramp(t, S.m2a, S.m2b);
  const s1 = ramp(t, S.s1a, S.s1b);
  const s2 = ramp(t, S.s2a, S.s2b);
  const vis = clamp01(1 - ramp(t, S.chartOut, S.chartOut + 0.7) + ramp(t, S.barsBack, S.barsBack + 0.9)) * (1 - ramp(t, S.end0, S.end1));
  const hiC = win(t, S.hiC, S.q2);
  const hiD = win(t, S.hiD, S.ask + 0.2);
  const ask = win(t, S.ask, S.chartOut + 0.4);
  const pair = Math.max(win(t, S.cap17, S.lit2), ramp(t, S.cap23, S.cap23 + 0.5));
  const level = (id: Id) => {
    const star = id === "claude" || id === "deepseek";
    const dim = Math.max(hiC * (id === "claude" ? 0 : 0.62), hiD * (id === "deepseek" ? 0 : 0.62), ask * (star ? 0 : 0.88), pair * (star ? 0 : 0.62));
    return vis * (1 - dim);
  };
  const lenOf = (id: Id) => {
    const grow = ramp(t, S.grow0 + RI[id] * 0.12, S.grow0 + RI[id] * 0.12 + 1.3, EO);
    const L = lerp(lerp((IQ[id] / 60) * LEN, (PRICE[id] / 50) * LEN, m1), (TASK[id] / 5.98) * LEN, m2);
    return L * grow;
  };
  const rowY = (id: Id) => ROW0 + lerp(lerp(RI[id], RP[id], s1), RT[id], s2) * PITCH;
  // a slow push on the chart, a little closer while the question is asked
  const push = 1 + 0.02 * ramp(t, 0, S.chartOut, (v) => v) + 0.03 * ask;

  const unit = t < S.m1a ? 0 : t < S.m2a ? 1 : 2;
  const units = ["智能排名（Artificial Analysis 智能指数）", "每 100 万个 token 的价格（美元）", "做一道难题的花费（美元）"];
  const unitOp = (k: number) => [win(t, 0.2, S.m1a + 0.2), win(t, S.m1a + 0.1, S.m2a + 0.2), ramp(t, S.m2a + 0.1, S.m2a + 0.5)][k];

  const titleBoard = win(t, S.title - 0.2, S.titleOut + 0.5, 0.4, 0.4);
  const litTerm = (i: number) => (t >= S.lit1 && t < S.lit2 && (i === 5 || i === 6)) || (t >= S.lit2 && (i === 8 || i === 9));
  const isOp = (i: number) => [4, 7, 10, 15].includes(i);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 35% 50%, #10131b 0%, #07080b 72%)", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.7} />
      {(
        [
          ["sfx/data.wav", BARS.grow0, 0.18],
          ["sfx/data.wav", BARS.m1a, 0.16],
          ["sfx/thump.wav", BARS.ask2 + 0.2, 0.3],
          ["sfx/flaps.wav", BARS.title, 0.7],
          ["sfx/flaps.wav", BARS.titleSub, 0.4],
          ["sfx/flaps.wav", BARS.titleOut, 0.5],
          ["sfx/flaps.wav", BARS.formula, 0.55],
          ["sfx/data.wav", BARS.barsBack, 0.16],
          ["sfx/sub.wav", BARS.cap17, 0.32],
          ["sfx/data.wav", BARS.m2a, 0.16],
          ["sfx/sub.wav", BARS.cap23, 0.32],
        ] as [string, number, number][]
      ).map(([src, b, v], i) => (
        <Sequence key={i} from={bf(b)} layout="none">
          <Audio src={staticFile(src)} volume={v} />
        </Sequence>
      ))}

      {/* the chart */}
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 60%" }}>
        {Array.from({ length: 6 }, (_, k) => (
          <div key={k} style={{ position: "absolute", left: X0 + (k * LEN) / 5, top: ROW0 - 50, width: 1, height: 5 * PITCH, background: `rgba(255,255,255,${0.045 * vis})` }} />
        ))}
        {units.map((u, k) => (
          <div key={k} style={{ position: "absolute", left: X0, top: ROW0 - 92, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: "#9aa0aa", opacity: unitOp(k) * vis * (1 - ask), letterSpacing: "0.03em" }}>
            {u}
          </div>
        ))}
        {M.map((m, k) => {
          const y = rowY(m.id);
          const L = lenOf(m.id);
          const lv = level(m.id);
          const g = ramp(t, S.grow0 + RI[m.id] * 0.12, S.grow0 + RI[m.id] * 0.12 + 1.3, EO);
          const labels = [
            { v: `${Math.round(IQ[m.id] * g)}`, o: 1 - ramp(t, S.m1a - 0.1, S.m1a + 0.25) },
            { v: money(PRICE[m.id]), o: ramp(t, S.m1b - 0.4, S.m1b) * (1 - ramp(t, S.m2a - 0.1, S.m2a + 0.25)) },
            { v: money(TASK[m.id]), o: ramp(t, S.m2b - 0.4, S.m2b) },
          ];
          const star = m.id === "claude" || m.id === "deepseek";
          return (
            <React.Fragment key={m.id}>
              <div style={{ position: "absolute", right: 1920 - X0 + 28, top: y - 26, textAlign: "right", opacity: Math.min(1, lv * 1.4) * ramp(t, 0.1 + RI[m.id] * 0.08, 0.6 + RI[m.id] * 0.08) }}>
                <div style={{ fontFamily: m.name === "智谱" ? FONT : MONO, fontWeight: m.name === "智谱" ? 900 : 700, fontSize: 34, color: INK, lineHeight: "38px" }}>{m.name}</div>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: "#7d838d" }}>{m.model}</div>
              </div>
              <Stream t={t} x0={X0} y={y} len={L} color={m.color} level={lv} seed={k + 1} />
              {labels.map((l, i) =>
                l.o > 0.01 ? (
                  <div key={i} style={{ position: "absolute", left: X0 + L + 26, top: y - 30, fontFamily: MONO, fontWeight: 700, fontSize: 46, color: INK, opacity: l.o * Math.min(1, lv * 1.3) * ramp(g, 0, 0.12, (v) => v), textShadow: star && lv > 0.9 ? `0 0 18px ${rgba(m.color, 0.6)}` : undefined }}>
                    {l.v}
                  </div>
                ) : null,
              )}
            </React.Fragment>
          );
        })}
      </AbsoluteFill>

      {/* the captions */}
      <Cap t={t} on={S.q1} off={S.hiC - 0.1}>谁最聪明？</Cap>
      <Cap t={t} on={S.hiC} off={S.q2 - 0.1}>
        全球最聪明的 AI：<span style={{ color: "#ff8a57" }}>Claude</span>
      </Cap>
      <Cap t={t} on={S.q2} off={S.hiD - 0.1}>谁最便宜？</Cap>
      <Cap t={t} on={S.hiD} off={S.ask - 0.1}>
        最便宜的 AI 之一：<span style={{ color: "#5d9bff" }}>DeepSeek</span>
      </Cap>
      <Cap t={t} on={S.ask} off={S.chartOut} y={96} size={74}>最聪明的，</Cap>
      <Cap t={t} on={S.ask2} off={S.chartOut} y={190} size={74}>
        能比最便宜的<span style={{ color: GOLD }}>还便宜</span>吗？
      </Cap>
      <Cap t={t} on={S.cap17} off={S.lit2 - 0.1}>
        按标价，Claude 是 DeepSeek 的 <Num>17</Num> 倍
      </Cap>
      <Cap t={t} on={S.lit2} off={S.why - 0.1}>可 AI 干活，按事算</Cap>
      <Cap t={t} on={S.why} off={S.cap23 - 0.1} size={54}>同一道难题，有的 AI 想得久、写得长，用掉的 token 多</Cap>
      <Cap t={t} on={S.cap23} off={S.end1}>
        按量付钱，差距拉大到 <Num>23</Num> 倍
      </Cap>

      {/* the title on flaps */}
      {titleBoard > 0.001 && (
        <>
          <div style={{ position: "absolute", left: 400, top: 330, width: 1120, height: 380, borderRadius: 18, background: "linear-gradient(180deg, #141414, #0e0e0e)", border: "2px solid #232323", boxShadow: "0 40px 90px rgba(0,0,0,0.75)", opacity: titleBoard }} />
          <div style={{ opacity: titleBoard }}>
            <FlapRow t={t} x={460} y={370} n={8} s={{ w: 118, h: 168, fs: 118 }} gap={8} seed={7} stagger={0.045}
              states={[{ at: S.title, text: TITLE }, { at: S.titleOut, text: cells("", 8) }]} color={() => INK} />
            <FlapRow t={t} x={960 - (10 * 46 - 6) / 2} y={590} n={10} s={{ w: 40, h: 58, fs: 40 }} gap={6} seed={8}
              states={[{ at: S.titleSub, text: SUB }, { at: S.titleOut + 0.2, text: cells("", 10) }]} color={() => GOLD} />
          </div>
        </>
      )}

      {/* the formula, which stays */}
      <div style={{ opacity: ramp(t, S.formula - 0.25, S.formula) * (1 - ramp(t, S.end0, S.end1)) }}>
        <FlapRow t={t} x={960 - (20 * 48 - 4) / 2} y={38} n={20} s={{ w: 44, h: 62, fs: 42 }} gap={4} seed={9} stagger={0.025}
          states={[{ at: S.formula, text: FORMULA }]}
          color={(i) => (litTerm(i) ? GOLD : isOp(i) ? "#8a8a86" : i < 4 ? INK : "#bdb9b0")} />
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 18, color: "#5d5f66", opacity: vis }}>
        {unit === 0 ? "智能排名：Artificial Analysis 智能指数 · 2026 年 10 月" : unit === 1 ? "价格：各家官方 API 输出价 · 2026 年 10 月" : "花费：Artificial Analysis 评测实测 · 2026 年 10 月"}
      </div>
      <Vignette />
      <Grain frame={frame} amount={0.045} />
    </AbsoluteFill>
  );
};

const Cap: React.FC<{ t: number; on: number; off: number; y?: number; size?: number; children: React.ReactNode }> = ({ t, on, off, y = 172, size = 66, children }) => {
  const i = ramp(t, on, on + 0.45, EO);
  const o = 1 - ramp(t, off - 0.3, off);
  const a = i * o;
  if (a <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: a, transform: `translateY(${(1 - i) * 22 - (1 - o) * 12}px)`, fontFamily: FONT, fontWeight: 900, fontSize: size, color: INK, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
      {children}
    </div>
  );
};
const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: GOLD, fontSize: "1.3em", fontFamily: MONO, fontWeight: 700, textShadow: `0 0 24px ${rgba(GOLD, 0.45)}` }}>{children}</span>
);
