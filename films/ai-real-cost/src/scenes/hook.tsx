import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Spark, Whale } from "../art";
import { useBeatFrame } from "../kit";
import { At, Badge, Chroma, EBACK, EIO, EO, In, Kinetic, lerp, Note, Odometer, progAt, Shockwave, Tag } from "../fx";
import { FONT, K, ModelKey } from "../theme3";

// ───────── 1. The claim, stated flat out ─────────

// Every word is already on the first frame: in a muted autoplay feed, and in the preview a link share shows,
// frame 0 has to carry the whole claim. Only the characters and the accent on "便宜" move, on the beat.
export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  const glow = progAt(frame, 0, 1.5) * (1 - 0.6 * progAt(frame, 2, 2));
  const hit = Math.max(0, 1 - Math.abs(frame) / 6);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <At x={960} y={170} center>
        <Tag color={K.claude} size={30}>
          Claude Opus 5.5 · 智能排行全球第 1
        </Tag>
      </At>
      <At x={960} y={360} center>
        <div style={{ fontSize: 150, fontWeight: 900, letterSpacing: -4, whiteSpace: "nowrap", color: K.fg }}>
          全球<span style={{ color: K.claudeHi }}>最聪明</span>的 AI
        </div>
      </At>
      <At x={960} y={580} center>
        <div style={{ fontSize: 176, fontWeight: 900, letterSpacing: -4, whiteSpace: "nowrap", color: K.fg }}>
          比 <span style={{ color: K.deepseekHi }}>DeepSeek</span> 还
          <span style={{ display: "inline-block", color: K.green, transform: `scale(${1 + 0.08 * hit})`, textShadow: `0 0 ${70 * glow}px ${K.green}aa` }}>便宜</span>
        </div>
      </At>
      <Shockwave at={0} x={1400} y={580} color={K.green} />
      <At x={150} y={820} center>
        <In at={0.5} from="left">
          <Spark size={170} mood="smug" />
        </In>
      </At>
      <At x={1770} y={820} center>
        <In at={1.5} from="right">
          <div style={{ position: "relative" }}>
            <Whale size={200} mood="shock" />
            <div style={{ position: "absolute", top: -50, left: 40, fontSize: 64, fontWeight: 900, color: K.gold, fontFamily: FONT }}>？！</div>
          </div>
        </In>
      </At>
    </AbsoluteFill>
  );
};

// ───────── 2. Price board: list price, then the subscription press ─────────

type Row = { label: string; m: ModelKey; v: number; text: string; approx?: boolean };
// Output price per million tokens in yuan. Claude and GPT are priced in dollars (× 6.7195, the 2026-10-22 central
// parity, so "约"); DeepSeek lists its own yuan prices.
const ROWS: Row[] = [
  { label: "Claude Opus 5.5", m: "opus", v: 134.4, text: "¥134", approx: true },
  { label: "GPT-6.1 Sol", m: "sol", v: 67.2, text: "¥67", approx: true },
  { label: "Claude Sonnet 5.5", m: "sonnet", v: 67.2, text: "¥67", approx: true },
  { label: "DeepSeek V4 Pro", m: "dspro", v: 27, text: "¥27" },
  { label: "DeepSeek V4.1 Flash", m: "dsflash", v: 8, text: "¥8" },
];
const OPUS = 134.4;
const SUB = 3.77; // ¥134.4 × $200 ÷ $7,121 (a full month of Max 20x is worth 35.6× its price)
const LAST = ROWS.length - 1;
const TOP = 300;
const RH = 112;
const BX = 820;
const BW = 740;

export const Board: React.FC = () => {
  const frame = useBeatFrame();
  const pv = progAt(frame, 8, 1.6, EIO); // Opus price squeezed
  const pr = progAt(frame, 10, 1.4, EBACK); // re-rank
  const opusV = pv <= 0 ? 134 : pv >= 1 ? 3.8 : Math.exp(lerp(Math.log(OPUS), Math.log(SUB), pv));
  const bracket = progAt(frame, 4, 0.8) * (1 - progAt(frame, 6.2, 0.5));
  const plateIn = progAt(frame, 6.8, 1.2, EO);
  const plateOut = progAt(frame, 10, 0.6, EIO);
  const opusW = (Math.exp(lerp(Math.log(OPUS), Math.log(SUB), pv)) / OPUS) * BW;
  const win = progAt(frame, 12, 0.8);
  return (
    <AbsoluteFill>
      <At x={960} y={118} center>
        <Kinetic at={0} out={6} size={76} parts={["按单价，它是 DeepSeek 的 ", { t: "17 倍", c: K.red }]} />
      </At>
      <At x={960} y={118} center>
        <Kinetic at={6.4} out={11.4} size={76} parts={["但很多人，是", { t: "包月", c: K.claudeHi, hl: `${K.claude}33` }, "用的"]} />
      </At>
      <At x={960} y={118} center>
        <Kinetic at={11.8} size={76} parts={["包月用满：", { t: "¥134 → ¥3.8", c: K.green }]} />
      </At>
      {ROWS.map((r, i) => {
        const isOpus = i === 0;
        const rank = isOpus ? lerp(0, LAST, pr) : lerp(i, i - 1, pr);
        const y = TOP + rank * RH;
        const enter = progAt(frame, 0.2 + i * 0.35, 1, EO);
        const w = isOpus ? opusW : (r.v / OPUS) * BW;
        const color = K[r.m === "opus" ? "claude" : r.m === "dsflash" ? "deepseek" : "dim"];
        const barW = Math.max(8, w * enter);
        const glowOpus = isOpus ? win : 0;
        return (
          <div key={r.label} style={{ position: "absolute", left: 0, top: y, width: 1920, height: RH, opacity: Math.min(1, enter * 2) }}>
            <div style={{ position: "absolute", left: BX - 520, width: 490, height: RH, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 18 }}>
              <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: isOpus || r.m === "dsflash" ? K.fg : K.muted, whiteSpace: "nowrap" }}>{r.label}</div>
              <Badge m={r.m} size={62} />
            </div>
            <div
              style={{
                position: "absolute",
                left: BX,
                top: RH * 0.18,
                height: RH * 0.64,
                width: barW,
                borderRadius: 12,
                background: isOpus
                  ? `linear-gradient(90deg, ${lerpColor(K.claude, K.green, glowOpus)}aa, ${lerpColor(K.claude, K.green, glowOpus)})`
                  : `linear-gradient(90deg, ${color}88, ${color})`,
                boxShadow: isOpus || r.m === "dsflash" ? `0 0 40px ${isOpus ? lerpColor(K.claude, K.green, glowOpus) : color}66` : "none",
              }}
            />
            <div style={{ position: "absolute", left: BX + barW + 22, height: RH, display: "flex", alignItems: "center" }}>
              {isOpus ? (
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: K.muted, opacity: 1 - win }}>约</span>
                  <Odometer value={opusV} decimals={opusV < 10 ? 1 : 0} prefix="¥" size={56} color={lerpColor(K.claudeHi, K.green, glowOpus)} />
                </span>
              ) : (
                <span style={{ fontFamily: FONT, fontSize: 50, fontWeight: 900, color: r.m === "dsflash" ? K.deepseekHi : K.muted, whiteSpace: "nowrap" }}>
                  {r.approx ? <span style={{ fontSize: 28, fontWeight: 700, marginRight: 8 }}>约</span> : null}
                  {r.text}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <At x={BX} y={TOP - 46}>
        <div style={{ opacity: progAt(frame, 0.4, 0.8) * 0.8, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>输出价 · 每百万 token</div>
      </At>
      {/* 17x bracket between Opus and DeepSeek */}
      {bracket > 0 ? (
        <div style={{ position: "absolute", left: 250, top: TOP + RH * 0.5, height: RH * LAST * bracket, width: 30, borderLeft: `5px solid ${K.red}`, borderTop: `5px solid ${K.red}`, borderBottom: `5px solid ${K.red}`, borderRadius: "12px 0 0 12px", opacity: bracket }}>
          <div style={{ position: "absolute", right: 46, top: "50%", transform: "translateY(-50%)", fontFamily: FONT, fontSize: 72, fontWeight: 900, color: K.red }}>17×</div>
        </div>
      ) : null}
      {/* The subscription "press" plate pushing Opus's bar down */}
      {plateIn > 0 && plateOut < 1 ? (
        <div
          style={{
            position: "absolute",
            left: lerp(1980, BX + opusW + 4, plateIn),
            top: TOP - 30,
            opacity: 1 - plateOut,
            transform: `translateY(${-plateOut * 60}px)`,
          }}
        >
          <div style={{ width: 30, height: RH + 60, borderRadius: 8, background: `linear-gradient(180deg, ${K.claudeHi}, ${K.claude})`, boxShadow: `0 0 50px ${K.claude}` }} />
          <div style={{ position: "absolute", left: -20, top: -86, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.claudeHi, whiteSpace: "nowrap" }}>
            包月 ÷ 36
          </div>
        </div>
      ) : null}
      {win > 0 ? (
        <div style={{ position: "absolute", left: 1220, top: TOP + RH * LAST + 4, transform: `rotate(-5deg) scale(${1 + (1 - win) * 1.6})`, opacity: Math.min(1, win * 3) }}>
          <div style={{ padding: "8px 26px", border: `6px solid ${K.green}`, borderRadius: 14, color: K.green, fontFamily: FONT, fontSize: 50, fontWeight: 900, whiteSpace: "nowrap", background: "#06060Acc" }}>
            最便宜
          </div>
        </div>
      ) : null}
      <Note>
        输出价 · 每百万 token · 官方标价（2026-10-23）· 美元按 2026-10-22 中间价 6.72 换算 · 包月用满按 Claude Max 20x 实测 36 倍折算
      </Note>
    </AbsoluteFill>
  );
};

// Linear blend between two #rrggbb colours.
export const lerpColor = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
};

// ───────── 3. Title with warp-speed streaks ─────────

export const Title: React.FC = () => {
  const frame = useBeatFrame();
  const streaks = Array.from({ length: 90 }).map((_, i) => {
    const a = random(`a${i}`) * Math.PI * 2;
    const sp = 0.6 + random(`s${i}`) * 1.4;
    const t = ((frame + random(`o${i}`) * 60) % 60) / 60;
    const r = 80 + Math.pow(t, 2.2) * 1300 * sp;
    const len = 20 + t * 160 * sp;
    const col = [K.claude, K.gold, K.deepseek, K.fg][i % 4];
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: 960 + Math.cos(a) * r,
          top: 540 + Math.sin(a) * r,
          width: len,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${col})`,
          transform: `rotate(${a}rad)`,
          transformOrigin: "0 50%",
          opacity: Math.min(1, t * 3) * 0.8,
        }}
      />
    );
  });
  const s = progAt(frame, 0, 0.7, EBACK);
  return (
    <AbsoluteFill>
      {streaks}
      <Shockwave at={0} color={K.claude} size={1800} />
      <At x={960} y={470} center>
        <Chroma at={0} amount={22}>
          <div style={{ transform: `scale(${2.2 - 1.2 * s})`, opacity: Math.min(1, s * 2), fontFamily: FONT, fontSize: 210, fontWeight: 900, letterSpacing: -8, whiteSpace: "nowrap" }}>
            AI 的<span style={{ color: K.claude }}>真实</span>价格
          </div>
        </Chroma>
      </At>
    </AbsoluteFill>
  );
};
