// v16 opening (SCRIPT.md v15.2, section 一): what does it cost an AI to write a whole Three-Body trilogy? 8 yuan,
// or 336. Yet someone pays $200 a month and calls it the cheapest AI. Did he get it wrong? Then the title as a
// strikethrough price: "AI 的~~标价~~真实价格". The streams of light from v15 carry the prices.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { bf, sec } from "../v10/bars";
import { Id, M, money, PRICE } from "../v13/data";
import { EIO, EO, FONT, GOLD, Grain, INK, lerp, MONO, ramp, rgba, Stream, useFonts, Vignette } from "../v15/kit";

export const HOOK16_FRAMES = bf(10.9);

const BARS = {
  books: -0.22, q1: -0.14, shrink: 1.55, ds: 1.65, big: 2.8, gap: 4.0, plan: 5.2, said: 6.6, ask: 7.6,
  title: 8.6, strike: 9.0, swap: 9.3, sub: 9.7, end0: 10.5, end1: 10.9,
} as const;
const S = Object.fromEntries(Object.entries(BARS).map(([k, v]) => [k, sec(v)])) as Record<keyof typeof BARS, number>;

const RMB: Record<Id, string> = { deepseek: "约 ¥8", glm: "约 ¥30", kimi: "约 ¥68", claude: "约 ¥134", chatgpt: "约 ¥336" };
const ORDER = [...M].sort((a, b) => PRICE[a.id] - PRICE[b.id]);
const X0 = 560;
const LEN = 1020;
const ROW0 = 430;
const PITCH = 96;

const TXT =
  "让 AI 写一整套《三体》那么多字，要多少钱？DeepSeek：8 块钱Claude：134 块ChatGPT：336 块最便宜和最贵，差了 40 多倍" +
  "可就是这些贵的 AI，有人每个月花 200 美元包月还说：这是最便宜的 AI他算错了吗？AI 的标价真实价格第 1 集 · 文字 AI" +
  "三体Ⅱ黑暗森林Ⅲ死神永生约 88 万字写一整套《三体》的价格（约 100 万字）价格：各家官方 API 输出价人民币按 6.72 折算 · 2026 年 10 月智谱" +
  "约¥$0123456789./月 ,KimiOpus 5.5GPT-6 AstraK3.1 ProGLM-5.3V4.1 Flash一个 token 约等于一个字";

const win = (t: number, a: number, b: number, fi = 0.45, fo = 0.3) => ramp(t, a, a + fi, EO) * (1 - ramp(t, b - fo, b));

export const Hook16: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  useFonts([`900 64px ${FONT}`, `700 28px ${FONT}`, `700 44px ${MONO}`, `900 150px ${FONT}`, `500 18px ${FONT}`, `700 40px ${FONT}`], TXT);

  const chart = ramp(t, S.shrink, S.shrink + 0.6) * (1 - 0.85 * ramp(t, S.plan, S.plan + 0.6)) * (1 - ramp(t, S.ask - 0.2, S.ask + 0.4));
  const gap = win(t, S.gap, S.plan + 0.2);
  const level = (id: Id) => {
    const quiet = id === "glm" || id === "kimi";
    const g = id === "deepseek" ? 1 : ramp(t, S.big - 0.1, S.big + 0.3);
    const dim = Math.max(quiet ? 0.5 : 0, gap * (id === "deepseek" || id === "chatgpt" ? 0 : 0.7));
    return chart * g * (1 - dim);
  };
  const grow = (id: Id, k: number) =>
    id === "deepseek" ? ramp(t, S.ds, S.ds + 0.9, EO) : ramp(t, S.big + k * 0.06, S.big + k * 0.06 + 1.0, EO);

  // the books: centre stage, then they shrink into the chart's unit label
  const sh = ramp(t, S.shrink, S.shrink + 0.8, EIO);
  const booksOn = ramp(t, S.books, S.books + 0.6) * (1 - 0.85 * ramp(t, S.plan, S.plan + 0.6)) * (1 - ramp(t, S.ask - 0.2, S.ask + 0.4));
  const bx = lerp(960, X0 + 28, sh);
  const by = lerp(590, ROW0 - 104, sh);
  const bs = lerp(1, 0.13, sh);

  const plan = win(t, S.plan, S.ask, 0.5, 0.4);
  const blur = 8 * ramp(t, S.plan, S.plan + 0.6);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 45% 45%, #10131b 0%, #07080b 72%)", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.7} />
      {(
        [
          ["sfx/book.wav", 0, 0.5],
          ["sfx/data.wav", BARS.ds, 0.16],
          ["sfx/sub.wav", BARS.big, 0.28],
          ["sfx/thump.wav", BARS.plan, 0.45],
          ["sfx/swipe.wav", BARS.strike, 0.5],
          ["sfx/reveal.wav", BARS.swap, 0.3],
        ] as [string, number, number][]
      ).map(([src, b, v], i) => (
        <Sequence key={i} from={bf(b)} layout="none">
          <Audio src={staticFile(src)} volume={v} />
        </Sequence>
      ))}

      {/* the chart, which blurs back when the $200 arrives */}
      <AbsoluteFill style={{ filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
        <div style={{ position: "absolute", left: X0 + 70, top: ROW0 - 122, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: "#9aa0aa", opacity: chart, letterSpacing: "0.03em" }}>
          写一整套《三体》的价格（约 100 万字）
        </div>
        {ORDER.map((m, r) => {
          const y = ROW0 + r * PITCH;
          const lv = level(m.id);
          const L = grow(m.id, r) * (PRICE[m.id] / 50) * LEN;
          const star = m.id === "deepseek" || m.id === "chatgpt" || m.id === "claude";
          return (
            <React.Fragment key={m.id}>
              <div style={{ position: "absolute", right: 1920 - X0 + 28, top: y - 26, textAlign: "right", opacity: Math.min(1, chart * 1.2) * (m.id === "deepseek" ? 1 : 0.35 + 0.65 * ramp(t, S.big - 0.2, S.big + 0.3)) * (gap > 0 && !(m.id === "deepseek" || m.id === "chatgpt") ? 1 - 0.6 * gap : 1) }}>
                <div style={{ fontFamily: m.name === "智谱" ? FONT : MONO, fontWeight: m.name === "智谱" ? 900 : 700, fontSize: 34, color: INK, lineHeight: "38px" }}>{m.name}</div>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: "#7d838d" }}>{m.model}</div>
              </div>
              <Stream t={t} x0={X0} y={y} len={L} color={m.color} level={lv} seed={r + 1} />
              <div style={{ position: "absolute", left: X0 + L + 26, top: y - 30, whiteSpace: "nowrap", opacity: Math.min(1, lv * 1.4) * ramp(grow(m.id, r), 0.6, 1, (v) => v) }}>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: INK, textShadow: star && lv > 0.9 ? `0 0 18px ${rgba(m.color, 0.55)}` : undefined }}>{money(PRICE[m.id])}</span>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: "#9aa0aa", marginLeft: 14 }}>{RMB[m.id]}</span>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 18, color: "#5d5f66", opacity: chart }}>
          一整套《三体》约 88 万字，按一个 token 约等于一个字估算 · 价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月
        </div>
      </AbsoluteFill>

      {/* the books */}
      {booksOn > 0.001 && (
        <div style={{ position: "absolute", left: bx, top: by, transform: `translate(-50%, -50%) scale(${bs})`, opacity: booksOn, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
          <Books t={t} />
        </div>
      )}

      {/* $200 a month */}
      {plan > 0.001 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", opacity: plan, transform: `scale(${lerp(1.08, 1, ramp(t, S.plan, S.plan + 0.5, EO))})` }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 170, lineHeight: "180px", color: GOLD, textShadow: `0 0 40px ${rgba(GOLD, 0.45)}` }}>
            $200<span style={{ fontSize: 80, color: "#d9b46a" }}> / 月</span>
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, color: "#a59a84", marginTop: 6 }}>约 1,344 元</div>
        </div>
      )}

      {/* the captions */}
      <Cap t={t} on={S.q1} off={S.ds - 0.05}>让 AI 写一整套《三体》那么多字，要多少钱？</Cap>
      <Cap t={t} on={S.ds + 0.15} off={S.big - 0.05}>
        <span style={{ color: "#5d9bff" }}>DeepSeek</span>：<Num>8</Num> 块钱
      </Cap>
      <Cap t={t} on={S.big + 0.2} off={S.gap - 0.05}>
        <span style={{ color: "#ff8a57" }}>Claude</span>：<Num>134</Num> 块　<span style={{ color: "#53dcbc" }}>ChatGPT</span>：<Num>336</Num> 块
      </Cap>
      <Cap t={t} on={S.gap} off={S.plan - 0.05}>
        最便宜和最贵，差了 <Num>40</Num> 多倍
      </Cap>
      <Cap t={t} on={S.plan} off={S.said - 0.05}>可就是这些贵的 AI，有人每个月花 200 美元包月</Cap>
      <Cap t={t} on={S.said} off={S.ask - 0.05}>还说：这是最便宜的 AI</Cap>
      <Cap t={t} on={S.ask} off={S.title - 0.05} y={480} size={104}>他算错了吗？</Cap>

      <Title t={t} />
      <Vignette />
      <Grain frame={frame} amount={0.045} />
    </AbsoluteFill>
  );
};

const Books: React.FC<{ t: number }> = () => (
  <div style={{ position: "relative", width: 3 * 128 + 2 * 22, height: 520 }}>
    {/* a pool of light under the books */}
    <div style={{ position: "absolute", left: -180, right: -180, top: 360, height: 240, background: "radial-gradient(ellipse 50% 40% at 50% 40%, rgba(255,214,150,0.16), rgba(0,0,0,0) 70%)" }} />
    {[
      ["三体", ""],
      ["三体", "Ⅱ 黑暗森林"],
      ["三体", "Ⅲ 死神永生"],
    ].map(([a, b], i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: i * 150,
          top: 20 + (i === 1 ? -14 : i === 2 ? 6 : 0),
          width: 128,
          height: 440,
          borderRadius: 6,
          background: "linear-gradient(90deg, #120f0c 0%, #2a2219 22%, #3a2f22 50%, #241d15 80%, #100d0a 100%)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,220,160,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 48,
        }}
      >
        <div style={{ position: "absolute", left: 10, right: 10, top: 18, height: 3, background: "rgba(214,176,106,0.6)" }} />
        <div style={{ position: "absolute", left: 10, right: 10, bottom: 18, height: 3, background: "rgba(214,176,106,0.6)" }} />
        <div style={{ writingMode: "vertical-rl", fontFamily: FONT, fontWeight: 900, fontSize: 58, color: "#e2c07a", letterSpacing: "0.1em", textShadow: "0 0 18px rgba(226,192,122,0.35)" }}>{a}</div>
        {b && <div style={{ writingMode: "vertical-rl", fontFamily: FONT, fontWeight: 700, fontSize: 26, color: "#b99a5e", marginTop: 18, letterSpacing: "0.08em" }}>{b}</div>}
      </div>
    ))}
    <div style={{ position: "absolute", left: 0, right: 0, top: 486, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#a59a84" }}>约 88 万字</div>
  </div>
);

// the title as a strikethrough price: "AI 的标价" → 标价 struck in red → 真实价格 in gold takes its place
const Title: React.FC<{ t: number }> = ({ t }) => {
  const on = ramp(t, S.title, S.title + 0.5, EO) * (1 - ramp(t, S.end0, S.end1));
  if (on <= 0.001) return null;
  const strike = ramp(t, S.strike, S.strike + 0.32, EIO);
  const swap = ramp(t, S.swap, S.swap + 0.6, EIO);
  const FS = 150;
  const slotW = lerp(2 * FS, 4.95 * FS, swap);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 410, display: "flex", justifyContent: "center", opacity: on }}>
      <div style={{ display: "flex", alignItems: "flex-end", fontFamily: FONT, fontWeight: 900, fontSize: FS, lineHeight: `${FS * 1.2}px`, color: INK, whiteSpace: "nowrap" }}>
        <span>AI 的</span>
        <span style={{ position: "relative", display: "inline-block", width: slotW, height: FS * 1.2 }}>
          {/* 标价, struck, then set small beside the new price, like an "original price" in a shop */}
          <span
            style={{
              position: "absolute",
              left: lerp(0, FS * 4.15, swap),
              top: 0,
              transform: `scale(${lerp(1, 0.4, swap)})`,
              transformOrigin: "left bottom",
              color: swap > 0.05 ? "#8e8a82" : INK,
            }}
          >
            标价
            <span style={{ position: "absolute", left: -6, top: "52%", height: FS * 0.09, width: `calc((100% + 12px) * ${strike})`, background: "#e5322d", borderRadius: 4, boxShadow: "0 0 18px rgba(229,50,45,0.5)" }} />
          </span>
          {/* 真实价格 */}
          <span style={{ position: "absolute", left: 0, top: 0, color: GOLD, opacity: swap, transform: `translateY(${(1 - swap) * 40}px)`, textShadow: `0 0 34px ${rgba(GOLD, 0.4)}` }}>真实价格</span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: FS * 1.35, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#b8b2a6", letterSpacing: "0.2em", opacity: ramp(t, S.sub, S.sub + 0.5) }}>
        第 1 集 · 文字 AI
      </div>
    </div>
  );
};

const Cap: React.FC<{ t: number; on: number; off: number; y?: number; size?: number; children: React.ReactNode }> = ({ t, on, off, y = 150, size = 66, children }) => {
  const i = ramp(t, on, on + 0.45, EO);
  const o = 1 - ramp(t, off - 0.3, off);
  const a = i * o;
  if (a <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: a, transform: `translateY(${(1 - i) * 22 - (1 - o) * 12}px)`, fontFamily: FONT, fontWeight: 900, fontSize: size, color: INK, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};
const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: GOLD, fontSize: "1.3em", fontFamily: MONO, fontWeight: 700, textShadow: `0 0 24px ${rgba(GOLD, 0.45)}` }}>{children}</span>
);
