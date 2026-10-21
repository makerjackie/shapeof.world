import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Spark, Whale } from "../art";
import { useBeatFrame } from "../kit";
import { At, Badge, Chroma, EBACK, EIO, EO, Glass, In, Kinetic, lerp, Note, Odometer, progAt, Shockwave, Tag } from "../fx";
import { FONT, K, ModelKey } from "../theme3";

// ───────── 1. The claim, stated flat out ─────────

export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  const glow = progAt(frame, 2, 1.5);
  return (
    <AbsoluteFill>
      <At x={960} y={170} center>
        <In at={0.5} from="down">
          <Tag color={K.claude} size={30}>
            Claude Opus 5.5 · 智能指数全球第 1
          </Tag>
        </In>
      </At>
      <At x={960} y={360} center>
        <Kinetic at={-1.4} stagger={0.9} size={150} parts={["全球", { t: "最聪明", c: K.claudeHi }, "的 AI"]} />
      </At>
      <At x={960} y={580} center>
        <Chroma at={2}>
          <In at={2} from="slam" dur={0.6}>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 176,
                fontWeight: 900,
                letterSpacing: -4,
                whiteSpace: "nowrap",
                color: K.fg,
                textShadow: `0 0 ${60 * glow}px ${K.green}66`,
              }}
            >
              比 <span style={{ color: K.deepseekHi }}>DeepSeek</span> 还<span style={{ color: K.green }}>便宜</span>
            </div>
          </In>
        </Chroma>
      </At>
      <Shockwave at={2} y={580} color={K.green} />
      <At x={150} y={820} center>
        <In at={1} from="left">
          <Spark size={170} mood="smug" />
        </In>
      </At>
      <At x={1770} y={820} center>
        <In at={2.4} from="right">
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

type Row = { label: string; m: ModelKey; v: number; text: string };
const ROWS: Row[] = [
  { label: "Claude Opus 5.5", m: "opus", v: 20, text: "$20" },
  { label: "Kimi K3", m: "kimi", v: 15, text: "$15" },
  { label: "GPT-6.1 Sol", m: "sol", v: 10, text: "$10" },
  { label: "Gemini 4 Argon", m: "argon", v: 10, text: "$10" },
  { label: "Qwen3.8 Max", m: "qwen", v: 6, text: "$6" },
  { label: "GLM-5.3", m: "glm", v: 4.4, text: "$4.40" },
  { label: "DeepSeek V4.1 Flash", m: "dsflash", v: 1.2, text: "$1.20" },
];
const TOP = 290;
const RH = 92;
const BX = 800;
const BW = 900;

export const Board: React.FC = () => {
  const frame = useBeatFrame();
  const pv = progAt(frame, 8, 1.6, EIO); // Opus price squeezed
  const pr = progAt(frame, 10, 1.4, EBACK); // re-rank
  const opusV = Math.exp(lerp(Math.log(20), Math.log(0.56), pv));
  const bracket = progAt(frame, 4, 0.8) * (1 - progAt(frame, 6.2, 0.5));
  const plateIn = progAt(frame, 6.8, 1.2, EO);
  const plateOut = progAt(frame, 10, 0.6, EIO);
  const opusW = (opusV / 20) * BW;
  const win = progAt(frame, 12, 0.8);
  return (
    <AbsoluteFill>
      <At x={960} y={118} center>
        <Kinetic at={0} out={6} size={72} parts={["按单价，它是 DeepSeek 的 ", { t: "17 倍", c: K.red }]} />
      </At>
      <At x={960} y={118} center>
        <Kinetic at={6.4} out={11.4} size={72} parts={["但大多数人，是", { t: "包月", c: K.claudeHi, hl: `${K.claude}33` }, "用的"]} />
      </At>
      <At x={960} y={118} center>
        <Kinetic at={11.8} size={72} parts={["包月用满：", { t: "$20 → $0.56", c: K.green }]} />
      </At>
      {ROWS.map((r, i) => {
        const isOpus = i === 0;
        const rank = isOpus ? lerp(0, 6, pr) : lerp(i, i - 1, pr);
        const y = TOP + rank * RH;
        const enter = progAt(frame, 0.2 + i * 0.35, 1, EO);
        const w = isOpus ? opusW : (r.v / 20) * BW;
        const color = K[r.m === "opus" ? "claude" : r.m === "dsflash" ? "deepseek" : "dim"];
        const barW = Math.max(8, w * enter);
        const glowOpus = isOpus ? win : 0;
        return (
          <div key={r.label} style={{ position: "absolute", left: 0, top: y, width: 1920, height: RH, opacity: Math.min(1, enter * 2) }}>
            <div style={{ position: "absolute", left: BX - 470, width: 440, height: RH, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 18 }}>
              <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 900, color: isOpus || r.m === "dsflash" ? K.fg : K.muted, whiteSpace: "nowrap" }}>{r.label}</div>
              <Badge m={r.m} size={56} />
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
                <Odometer value={opusV} decimals={2} prefix="$" size={50} color={lerpColor(K.claudeHi, K.green, glowOpus)} />
              ) : (
                <span style={{ fontFamily: FONT, fontSize: 46, fontWeight: 900, color: r.m === "dsflash" ? K.deepseekHi : K.muted }}>{r.text}</span>
              )}
            </div>
          </div>
        );
      })}
      {/* 17x bracket between Opus and DeepSeek */}
      {bracket > 0 ? (
        <div style={{ position: "absolute", left: 300, top: TOP + RH * 0.5, height: RH * 6 * bracket, width: 30, borderLeft: `5px solid ${K.red}`, borderTop: `5px solid ${K.red}`, borderBottom: `5px solid ${K.red}`, borderRadius: "12px 0 0 12px", opacity: bracket }}>
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
        <div style={{ position: "absolute", left: 1290, top: TOP + RH * 6 - 8, transform: `rotate(-5deg) scale(${1 + (1 - win) * 1.6})`, opacity: Math.min(1, win * 3) }}>
          <div style={{ padding: "8px 26px", border: `6px solid ${K.green}`, borderRadius: 14, color: K.green, fontFamily: FONT, fontSize: 50, fontWeight: 900, whiteSpace: "nowrap", background: "#06060Acc" }}>
            最便宜
          </div>
        </div>
      ) : null}
      <Note>
        输出价 · 美元 / 百万 token · 官方标价（2026-10-21）· 包月用满按 Max 20x 实测 36 倍折算
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

// ───────── 3. Two reasons ─────────

const REASONS = [
  { n: "1", t: "包月", sub: "订阅 = 批发价", c: K.claude },
  { n: "2", t: "省 token", sub: "少绕路，少返工", c: K.gold },
];

export const Reasons: React.FC = () => {
  const frame = useBeatFrame();
  const zoom = progAt(frame, 6.6, 1.4, EIO);
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + zoom * 0.5})`, opacity: 1 - zoom * 0.9 }}>
      <At x={960} y={260} center>
        <Kinetic at={0} size={120} parts={["凭什么？"]} />
      </At>
      <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", justifyContent: "center", gap: 80, perspective: 1600 }}>
        {REASONS.map((r, i) => {
          const p = progAt(frame, 1.8 + i * 1.4, 1.1, EBACK);
          return (
            <div key={r.n} style={{ transform: `rotateY(${(1 - p) * -90}deg)`, opacity: p > 0 ? 1 : 0, transformOrigin: "left center" }}>
              <Glass glow={r.c} style={{ width: 520, height: 300, padding: "36px 48px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 36 }}>
                <span style={{ fontSize: 180, fontWeight: 900, color: r.c, lineHeight: 1 }}>{r.n}</span>
                <div>
                  <div style={{ fontSize: 84, fontWeight: 900, whiteSpace: "nowrap" }}>{r.t}</div>
                  <div style={{ fontSize: 34, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>{r.sub}</div>
                </div>
              </Glass>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ───────── 4. Title with warp-speed streaks ─────────

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
      <At x={960} y={680} center>
        <In at={2}>
          <div style={{ fontSize: 30, color: K.muted, fontWeight: 500, whiteSpace: "nowrap" }}>数据截至 2026 年 10 月 21 日</div>
        </In>
      </At>
    </AbsoluteFill>
  );
};
