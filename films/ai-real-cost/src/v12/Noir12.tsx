// v12 sample: the opening, the title and the first two laps in the noir look (style library: noir, with keynote's
// thin lines and big numbers and editorial's stamp). One continuous dark space: the AI's streamed answer becomes the
// wall, the wall splits into Claude's warm half and DeepSeek's blue half, the question decodes over it, and the
// prices are drawn as glowing streams of tokens. Timed in film bars on the 千年之后 edit.
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { bf, sec } from "../v10/bars";
import {
  cellPos, CJK_POOL, Decode, EIO, EO, ES, FONT, Grain, Light, MONO, N, PROMPT_TEXT, TokenLine, Vignette, WALL_CELLS, WALL_TEXT,
  Wall, clamp01, glow, lerp, ramp, rgba, useFonts,
} from "./noir";

export const NOIR12_FRAMES = bf(21);

// ---------- data (2026-10, see SCRIPT.md) ----------

type Id = "claude" | "chatgpt" | "kimi" | "glm" | "deepseek";
const M: { id: Id; name: string; model: string; color: string }[] = [
  { id: "claude", name: "Claude", model: "Opus 5.5", color: N.claude },
  { id: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", color: N.chatgpt },
  { id: "kimi", name: "Kimi", model: "K3.1 Pro", color: N.kimi },
  { id: "glm", name: "智谱", model: "GLM-5.3", color: N.glm },
  { id: "deepseek", name: "DeepSeek", model: "V4.1 Flash", color: N.deepseek },
];
const PRICE: Record<Id, number> = { claude: 20, chatgpt: 50, kimi: 10, glm: 4.4, deepseek: 1.19 };
const TASK: Record<Id, number> = { claude: 5.98, chatgpt: 3.26, kimi: 2.11, glm: 2.01, deepseek: 0.26 };
const rankOf = (v: Record<Id, number>) =>
  Object.fromEntries([...M].sort((a, b) => v[a.id] - v[b.id]).map((m, i) => [m.id, i])) as Record<Id, number>;
const R1 = rankOf(PRICE);
const R2 = rankOf(TASK);
const money = (v: number) => (v >= 10 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`);

// ---------- timeline, in film bars ----------

const BARS = {
  type: 0.05, stream0: 0.5, stream1: 2.15, cam0: 0.4, cam1: 2.3,
  word: 2.0, wordSub: 2.45, wordOut: 3.55,
  whip: 3.75, cl: 4.0, clSub: 4.3, ds: 4.7, dsSub: 5.0, splitOut: 6.2,
  q1: 6.3, q2: 6.7, qOut: 8.35,
  title: 8.7, titleSub: 9.2, titleOut: 10.5,
  f0: 10.65, stamp: 11.6, up0: 12.0, up1: 12.6,
  unit1: 12.45, names: 12.5, draw0: 12.8, hi1: 14.2, ratio1: 14.35, cap1: 14.6, out1: 16.2,
  unit2: 16.4, why: 16.55, morph0: 17.15, morph1: 17.85, sort0: 17.55, sort1: 18.25, whyOut: 18.2,
  hi2: 18.4, ratio2: 18.55, cap2: 18.8, end0: 20.3, end1: 21,
} as const;
const S = Object.fromEntries(Object.entries(BARS).map(([k, v]) => [k, sec(v)])) as Record<keyof typeof BARS, number>;

const FORMULA = ["真实价格", "＝", "单价", "×", "用量", "÷", "包月倍数", "＋", "你的时间"];

const ALL_TEXT =
  WALL_TEXT + PROMPT_TEXT + CJK_POOL + FORMULA.join("") +
  "每个字，都要钱AI 按 token 收费 · 1 个 token ≈ 1 个汉字全球最聪明的 AI最便宜的 AI 之一最聪明的，能比最便宜的还便宜吗？" +
  "AI 的真实价格第 1 集 · 文字 AI每 100 万个 token 的价格 · 美元做一道难题的花费 · 美元按单价算按做一道难题的花费算" +
  "Claude 是 DeepSeek 的 17 倍Claude 是 DeepSeek 的 23 倍，差距更大了同一道题，有的 AI 想得久、写得长，用掉的 token 多" +
  "智谱智能排名：Artificial Analysis 智能指数 · 2026 年 10 月价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$#%&@.×";

// ---------- layout ----------

const X0 = 660; // line start
const LEN = 900; // the largest value of a lap
const ROW0 = 336;
const ROW_H = 96;
const LEFT = 300; // left edge of captions and the ratio

const cap = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: 900,
  fontSize: size,
  color: N.ink,
  letterSpacing: "0.02em",
  ...extra,
});

export const Noir12: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  useFonts([`500 23px ${FONT}`, `900 100px ${FONT}`, `700 30px ${FONT}`, `500 13px ${FONT}`, `700 40px ${MONO}`], ALL_TEXT);

  // ---------- wall ----------
  const typed = (t - sec(BARS.type)) * 15;
  const sp = clamp01((t - S.stream0) / (S.stream1 - S.stream0));
  const revealed = t < S.stream0 ? 0 : WALL_CELLS * Math.pow(sp, 2.1);
  const cp = ramp(t, S.cam0, S.cam1, ES);
  const drift = Math.max(0, t - S.cam1);
  const head = cellPos(Math.min(Math.max(0, revealed), WALL_CELLS - 1));
  const follow = { x: 203, y: Math.max(30, head.y - 20) };
  const cam = {
    x: lerp(follow.x, 960, cp) + drift * 5,
    y: lerp(follow.y, 540, cp) + drift * 2.2,
    s: lerp(2.3, 1, cp) * (1 + drift * 0.0035),
  };
  const split = ramp(t, S.whip, S.whip + 0.7, EO) * (1 - ramp(t, S.splitOut, S.splitOut + 0.8));
  const qLight = ramp(t, S.q2, S.q2 + 0.8, EO) * (1 - ramp(t, S.qOut, S.qOut + 0.5));
  const lights: Light[] = [
    { x: 480, y: 520, r: 900, color: N.claude, a: 0.7 * split },
    { x: 1440, y: 520, r: 900, color: N.deepseek, a: 0.7 * split },
    { x: 1180, y: 560, r: 520, color: N.gold, a: 0.32 * qLight },
  ];
  const level = interpolate(t, [0, S.word, S.word + 0.6, S.whip, S.whip + 0.5, S.q1, S.title, S.f0, S.unit1], [1, 1, 0.55, 0.55, 0.72, 0.72, 0.5, 0.45, 0.32], { extrapolateRight: "clamp" });
  const wallBlur = interpolate(t, [S.q1, S.q1 + 1, S.title, S.unit1], [0, 1.4, 1.4, 1.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const whipK = Math.max(0, 1 - Math.abs(t - (S.whip + 0.12)) / 0.22);
  const hblur = 70 * whipK;

  // ---------- lanes ----------
  const sort = ramp(t, S.sort0, S.sort1);
  const morph = ramp(t, S.morph0, S.morph1);
  const lanesOn = ramp(t, S.names - 0.1, S.names + 0.3, EO) * (1 - ramp(t, S.end0, S.end1));
  const hi1 = ramp(t, S.hi1, S.hi1 + 0.5) * (1 - ramp(t, S.out1, S.out1 + 0.4));
  const hi2 = ramp(t, S.hi2, S.hi2 + 0.5);
  const hi = Math.max(hi1, hi2);
  const rowY = (id: Id) => ROW0 + lerp(R1[id], R2[id], sort) * ROW_H;
  const lenOf = (id: Id) => lerp((PRICE[id] / 50) * LEN, (TASK[id] / 5.98) * LEN, morph);
  const star = (id: Id) => id === "claude" || id === "deepseek";
  if (lanesOn > 0) {
    for (const m of M) {
      const d0 = S.draw0 + R1[m.id] * 0.14;
      const dr = ramp(t, d0, d0 + 1.1, EO);
      const sweep = Math.sin(Math.PI * clamp01((t - d0) / 1.4));
      const a = (0.3 * sweep + 0.1 * dr) * (1 - hi * (star(m.id) ? 0 : 1)) + (star(m.id) ? 0.32 * hi : 0);
      if (a > 0.01) lights.push({ x: X0 + lenOf(m.id) * dr, y: rowY(m.id), r: 360, color: m.color, a: a * lanesOn });
    }
  }

  // ---------- formula: a tilted sheet, then the header ----------
  const fIn = t >= S.f0 - 0.05;
  const up = ramp(t, S.up0, S.up1, EIO);
  const active = t < S.unit2 ? 2 : 4;
  const stampK = ramp(t, S.stamp, S.stamp + 0.12, EO);
  const termActive = (i: number) => (t >= S.stamp && i === active) || (t >= S.unit2 && i === 4);

  // a camera breath on the foreground: never fully still
  const breathe = 1 + 0.012 * Math.sin(t * 0.5);
  const endFade = 1 - ramp(t, S.end0, S.end1);

  return (
    <AbsoluteFill style={{ background: N.bg, overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.8} />
      <Cues />

      <div style={{ position: "absolute", inset: 0, opacity: endFade }}>
        <Wall t={t} typed={typed} revealed={revealed} cam={cam} lights={lights} level={level} blur={wallBlur} hblur={hblur} />
        {/* darken behind the foreground so it reads */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 52% 30% at 50% 48%, rgba(8,9,11,0.82), rgba(8,9,11,0) 100%)", opacity: ramp(t, S.word - 0.3, S.word + 0.4) * (1 - ramp(t, S.whip, S.whip + 0.4)) + ramp(t, S.q1 - 0.2, S.q1 + 0.4) * (1 - ramp(t, S.titleOut, S.titleOut + 0.5)) }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,9,11,0.88) 0%, rgba(8,9,11,0.7) 62%, rgba(8,9,11,0.35) 100%)", opacity: lanesOn }} />

        {/* anamorphic streak on the whip */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 499, height: 3, background: "#fff", opacity: whipK * 0.9, boxShadow: `0 0 30px #fff, 0 0 80px ${rgba(N.gold, 0.8)}` }} />

        <div style={{ position: "absolute", inset: 0, transform: `scale(${breathe})` }}>
          {/* S1: every character costs money */}
          <Center y={470}>
            <Decode text="每个字，都要钱" t={t} start={S.word} cps={14} end={S.wordOut} style={cap(118, { textShadow: glow("#ffffff", 0.7) })} />
          </Center>
          <Center y={596}>
            <Decode text="AI 按 token 收费 · 1 个 token ≈ 1 个汉字" t={t} start={S.wordSub} cps={30} end={S.wordOut} style={cap(40, { fontWeight: 700, color: N.sub })} />
          </Center>

          {/* S2: the smartest and the cheapest */}
          {(() => {
            const back = ramp(t, S.splitOut - 0.2, S.splitOut + 0.6);
            const gone = ramp(t, S.qOut - 0.2, S.qOut + 0.5);
            const st: React.CSSProperties = { opacity: (1 - back * 0.8) * (1 - gone), filter: back > 0.01 ? `blur(${back * 10}px)` : undefined, transform: `scale(${1 - back * 0.08})` };
            return (
              <>
                <Block x={500} style={st}>
                  <Decode text="CLAUDE" t={t} start={S.cl} cps={12} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 132, color: N.claude, letterSpacing: "0.06em", textShadow: glow(N.claude, 1.2) }} />
                  <div style={{ height: 18 }} />
                  <Decode text="全球最聪明的 AI" t={t} start={S.clSub} cps={18} style={cap(52)} />
                </Block>
                <Block x={1420} style={st}>
                  <Decode text="DEEPSEEK" t={t} start={S.ds} cps={14} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 132, color: N.deepseek, letterSpacing: "0.06em", textShadow: glow(N.deepseek, 1.2) }} />
                  <div style={{ height: 18 }} />
                  <Decode text="最便宜的 AI 之一" t={t} start={S.dsSub} cps={18} style={cap(52)} />
                </Block>
                <Center y={1010}>
                  <Decode text="智能排名：Artificial Analysis 智能指数 · 2026 年 10 月" t={t} start={S.clSub + 0.3} cps={60} end={S.splitOut} ecps={90} style={cap(20, { fontWeight: 500, color: N.dim })} />
                </Center>
              </>
            );
          })()}

          {/* S3: the question */}
          <Center y={430}>
            <Decode text="最聪明的，" t={t} start={S.q1} cps={12} end={S.qOut} style={cap(104, { textShadow: glow("#ffffff", 0.5) })} />
          </Center>
          <Center y={566}>
            <Decode
              text="能比最便宜的还便宜吗？"
              t={t}
              start={S.q2}
              cps={12}
              end={S.qOut}
              style={cap(104, { textShadow: glow("#ffffff", 0.5) })}
              charStyle={(i) => (i >= 6 && i <= 8 ? { color: N.gold, textShadow: glow(N.gold, 0.9) } : undefined)}
            />
          </Center>

          {/* S4: title */}
          {(() => {
            const out = ramp(t, S.titleOut, S.titleOut + 0.5);
            return (
              <div style={{ opacity: 1 - out, transform: `translateY(${-out * 40}px)`, filter: out > 0.01 ? `blur(${out * 6}px)` : undefined }}>
                <Center y={470}>
                  <Decode text="AI 的真实价格" t={t} start={S.title} cps={9} style={cap(156, { textShadow: glow("#ffffff", 0.9), letterSpacing: "0.04em" })} />
                </Center>
                <Center y={612}>
                  <Decode text="第 1 集 · 文字 AI" t={t} start={S.titleSub} cps={20} style={cap(38, { fontWeight: 700, color: N.gold, letterSpacing: "0.18em", textShadow: glow(N.gold, 0.4) })} />
                </Center>
              </div>
            );
          })()}

          {/* S5–S7: the formula sheet, which becomes the header */}
          {fIn && (
            <div
              style={{
                position: "absolute",
                left: 960,
                top: lerp(530, 82, up),
                transform: `translate(-50%, -50%) perspective(1600px) rotateX(${lerp(26, 0, up)}deg) rotateZ(${lerp(-5, 0, up)}deg) scale(${lerp(1, 0.46, up)}) translateX(${lerp(lerp(70, -70, ramp(t, S.f0, S.up0, ES)), 0, up)}px)`,
                whiteSpace: "nowrap",
                opacity: 1 - ramp(t, S.end0, S.end1),
              }}
            >
              {FORMULA.map((term, i) => {
                const op = i % 2 === 1;
                const on = termActive(i);
                const isStamp = i === 2 && t >= S.stamp && t < S.unit2;
                return (
                  <span key={i} style={{ position: "relative", display: "inline-block", margin: op ? "0 22px" : "0 6px" }}>
                    <Decode
                      text={term}
                      t={t}
                      start={S.f0 + i * 0.13}
                      cps={16}
                      style={cap(68, {
                        color: on ? N.gold : op ? N.dim : i === 0 ? N.ink : lerp(0, 1, up) > 0.5 ? "#8d939c" : N.sub,
                        textShadow: on ? glow(N.gold, 0.8) : undefined,
                        fontWeight: op ? 500 : 900,
                      })}
                    />
                    {isStamp && (
                      <span
                        style={{
                          position: "absolute",
                          left: -16,
                          right: -16,
                          top: -10,
                          bottom: -10,
                          border: `5px solid ${N.gold}`,
                          borderRadius: 6,
                          transform: `rotate(-3deg) scale(${lerp(1.35, 1, stampK)})`,
                          opacity: stampK,
                          boxShadow: `0 0 24px ${rgba(N.gold, 0.6)}`,
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* lap captions */}
          <div style={{ position: "absolute", left: LEFT, top: 228 }}>
            <Decode text="每 100 万个 token 的价格 · 美元" t={t} start={S.unit1} cps={36} end={S.unit2 - 0.25} style={cap(30, { fontWeight: 700, color: N.sub })} />
          </div>
          <div style={{ position: "absolute", left: LEFT, top: 228 }}>
            <Decode text="做一道难题的花费 · 美元" t={t} start={S.unit2} cps={36} style={cap(30, { fontWeight: 700, color: N.sub })} />
          </div>

          {/* the lanes */}
          {lanesOn > 0 &&
            M.map((m, k) => {
              const y = rowY(m.id);
              const len = lenOf(m.id);
              const draw = ramp(t, S.draw0 + R1[m.id] * 0.14, S.draw0 + R1[m.id] * 0.14 + 1.1, EO);
              const lv = 1 - hi * (star(m.id) ? 0 : 0.72);
              const v1 = money(PRICE[m.id]);
              const v2 = money(TASK[m.id]);
              const vx = X0 + len * draw + 28;
              return (
                <div key={m.id} style={{ opacity: lanesOn }}>
                  <div style={{ position: "absolute", right: 1920 - X0 + 36, top: y - 30, textAlign: "right", opacity: lv }}>
                    <Decode text={m.name} t={t} start={S.names + R1[m.id] * 0.1} cps={20} style={{ fontFamily: m.name === "智谱" ? FONT : MONO, fontWeight: 700, fontSize: 36, color: N.ink, lineHeight: "40px" }} />
                    <div>
                      <Decode text={m.model} t={t} start={S.names + R1[m.id] * 0.1 + 0.2} cps={30} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 17, color: N.dim, letterSpacing: "0.04em" }} />
                    </div>
                  </div>
                  <TokenLine t={t} y={y} x0={X0} len={len} on={draw} color={m.color} level={lv} seed={k + 1} />
                  <div style={{ position: "absolute", left: vx, top: y - 26, opacity: lv }}>
                    <Decode text={v1} t={t} start={S.draw0 + R1[m.id] * 0.14 + 0.8} cps={14} end={S.morph0 - 0.1} ecps={30} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 44, color: N.ink, lineHeight: "52px", textShadow: star(m.id) && hi > 0.5 ? glow(m.color, 0.6) : undefined }} />
                  </div>
                  <div style={{ position: "absolute", left: vx, top: y - 26, opacity: lv }}>
                    <Decode text={v2} t={t} start={S.morph1 - 0.1 + R2[m.id] * 0.06} cps={14} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 44, color: N.ink, lineHeight: "52px", textShadow: star(m.id) && hi > 0.5 ? glow(m.color, 0.6) : undefined }} />
                  </div>
                </div>
              );
            })}

          {/* lap 1 ratio */}
          <Ratio t={t} n="17×" start={S.ratio1} capStart={S.cap1} end={S.out1} line1="按单价算" line2="Claude 是 DeepSeek 的 17 倍" />
          {/* lap 2: why, then the ratio */}
          <div style={{ position: "absolute", left: LEFT, top: 842 }}>
            <Decode text="同一道题，有的 AI 想得久、写得长，用掉的 token 多" t={t} start={S.why} cps={26} end={S.whyOut} ecps={60} style={cap(44, { fontWeight: 700, color: N.sub })} />
          </div>
          <Ratio t={t} n="23×" start={S.ratio2} capStart={S.cap2} line1="按做一道难题的花费算" line2="Claude 是 DeepSeek 的 23 倍，差距更大了" />

          <Center y={1030}>
            <Decode text="价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月" t={t} start={S.draw0 + 0.6} cps={80} style={cap(19, { fontWeight: 500, color: N.dim })} />
          </Center>
        </div>
      </div>

      <Vignette />
      <Grain frame={frame} amount={0.075} />
    </AbsoluteFill>
  );
};

const Center: React.FC<{ y: number; children: React.ReactNode }> = ({ y, children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: "translateY(-50%)", textAlign: "center" }}>{children}</div>
);

const Block: React.FC<{ x: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, style, children }) => (
  <div style={{ position: "absolute", left: x, top: 500, transform: `translate(-50%, -50%) ${style?.transform ?? ""}`, textAlign: "center", opacity: style?.opacity, filter: style?.filter }}>
    {children}
  </div>
);

const Ratio: React.FC<{ t: number; n: string; start: number; capStart: number; end?: number; line1: string; line2: string }> = ({ t, n, start, capStart, end, line1, line2 }) => {
  if (t < start - 0.05) return null;
  const pop = ramp(t, start, start + 0.35, EO);
  return (
    <>
      <div style={{ position: "absolute", left: LEFT - 6, top: 760, transform: `scale(${lerp(1.08, 1, pop)})`, transformOrigin: "left center" }}>
        <Decode
          text={n}
          t={t}
          start={start}
          cps={10}
          end={end}
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 176,
            lineHeight: "190px",
            color: N.ink,
            textShadow: glow("#ffffff", 0.8),
          }}
        />
      </div>
      <div style={{ position: "absolute", left: X0, top: 800 }}>
        <Decode text={line1} t={t} start={capStart} cps={24} end={end} style={cap(30, { fontWeight: 700, color: N.dim })} />
        <div style={{ height: 8 }} />
        <Decode text={line2} t={t} start={capStart + 0.25} cps={22} end={end} style={cap(50)} />
      </div>
    </>
  );
};

// ---------- sound: decode chatter, the whip, the hits ----------

const CUES: [string, number, number][] = [
  ["sfx/keypress.wav", BARS.type + 0.1, 0.25],
  ["sfx/data.wav", BARS.stream0, 0.35],
  ["sfx/scan.wav", BARS.word, 0.3],
  ["sfx/swipe.wav", BARS.whip - 0.05, 0.55],
  ["sfx/scan.wav", BARS.cl, 0.28],
  ["sfx/scan.wav", BARS.ds, 0.28],
  ["sfx/thump.wav", BARS.q2 + 0.35, 0.5],
  ["sfx/reveal.wav", BARS.title - 0.1, 0.45],
  ["sfx/scan.wav", BARS.f0, 0.25],
  ["sfx/punch.wav", BARS.stamp, 0.6],
  ["sfx/deep.wav", BARS.up0, 0.35],
  ["sfx/data.wav", BARS.draw0, 0.25],
  ["sfx/sub.wav", BARS.ratio1, 0.6],
  ["sfx/scan.wav", BARS.morph0, 0.28],
  ["sfx/sub.wav", BARS.ratio2, 0.6],
];

const Cues: React.FC = () => (
  <>
    {CUES.map(([src, bar, v], i) => (
      <Sequence key={i} from={bf(bar)} layout="none">
        <Audio src={staticFile(src)} volume={v} />
      </Sequence>
    ))}
  </>
);
