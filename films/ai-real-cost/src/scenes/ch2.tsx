import React from "react";
import { AbsoluteFill } from "remotion";
import { Receipt, Spark, Whale } from "../art";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { At, Badge, Chroma, EBACK, EIO, Glass, In, Kinetic, lerp, Note, progAt, Shockwave, Tag } from "../fx";
import { FONT, K, M, ModelKey } from "../theme3";

const Stamp: React.FC<{ at: number; color: string; size?: number; children: React.ReactNode }> = ({ at, color, size = 56, children }) => {
  const frame = useBeatFrame();
  const p = progAt(frame, at, 0.5, EBACK);
  if (p <= 0) return null;
  return (
    <div
      style={{
        display: "inline-block",
        padding: "8px 28px",
        border: `6px solid ${color}`,
        borderRadius: 14,
        color,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 900,
        whiteSpace: "nowrap",
        background: "#06060Add",
        transform: `rotate(-3deg) scale(${1 + (1 - p) * 1.4})`,
        opacity: Math.min(1, p * 3),
        boxShadow: `0 0 50px ${color}44`,
      }}
    >
      {children}
    </div>
  );
};

// ───────── Receipts: same exam, one receipt each ─────────

const OPUS_LINES = Array.from({ length: 4 }, () => ({ l: "思考 + 作答", r: "5M" }));
const DS_LINES = Array.from({ length: 33 }, (_, i) => ({ l: i % 3 === 2 ? "再想想……" : i % 3 === 1 ? "换个思路" : "思考 + 作答", r: "5M" }));

const Total: React.FC<{ at: number; tokens: string; cost: string; score: string; color: string }> = ({ at, tokens, cost, score, color }) => (
  <In at={at} from="up">
    <Glass glow={color} style={{ width: 460, padding: "22px 30px", background: "linear-gradient(160deg, #1d1c26, #121118)" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>共 {tokens} token</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 88, fontWeight: 900, color, letterSpacing: -3 }}>{cost}</span>
        <span style={{ fontSize: 40, fontWeight: 900, whiteSpace: "nowrap" }}>{score}</span>
      </div>
    </Glass>
  </In>
);

export const Receipts: React.FC = () => {
  const b = useBeatFrame() / FPB;
  const dsMood = b < 6 ? "happy" : b < 10 ? "sweat" : "shock";
  return (
    <AbsoluteFill>
      <At x={960} y={120} center>
        <Kinetic at={0} out={15.6} size={68} parts={["原因二：同一套考试，", { t: "各打一张小票", c: K.gold }]} />
      </At>
      <At x={960} y={120} center>
        <Stamp at={16} color={K.gold} size={62}>
          单价贵 5 倍，总价反而更低
        </Stamp>
      </At>
      <At x={150} y={200}>
        <In at={1} from="left">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Spark size={110} mood={b < 14 ? "happy" : "smug"} />
            <div>
              <div style={{ fontSize: 40, fontWeight: 900 }}>Claude Opus 5.5</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>单价 $20 / 百万 · 低推理档</div>
            </div>
          </div>
        </In>
      </At>
      <At x={150} y={350}>
        <Receipt title="CLAUDE · 小票" color={K.claude} lines={OPUS_LINES} start={3} per={1} width={400} />
      </At>
      <At x={150} y={700}>
        <Total at={8} tokens="2,000 万" cost="$860" score="42 分" color={K.claudeHi} />
      </At>
      <At x={800} y={200}>
        <In at={1.5} from="right">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Whale size={130} mood={dsMood} />
            <div>
              <div style={{ fontSize: 40, fontWeight: 900 }}>DeepSeek V4 Pro</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>单价 $3.96 / 百万 · 最高推理档</div>
            </div>
          </div>
        </In>
      </At>
      <At x={800} y={350}>
        <Receipt title="DEEPSEEK · 小票" color={K.deepseek} lines={DS_LINES} start={3} per={0.3} width={400} />
      </At>
      <At x={1360} y={520}>
        <Total at={13.4} tokens="1.6 亿" cost="$1,122" score="36 分" color={K.deepseekHi} />
      </At>
      <Note>Artificial Analysis 智能指数 v4.3 · 每行 = 500 万 token</Note>
    </AbsoluteFill>
  );
};

// ───────── Honest: the newest DeepSeek really is cheap ─────────

const StatRow: React.FC<{ m: ModelKey; cost: string; score: string; color: string; at: number }> = ({ m, cost, score, color, at }) => (
  <In at={at} from="right">
    <div style={{ display: "flex", alignItems: "center", gap: 26, width: 1000, padding: "18px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <Badge m={m} size={64} />
      <span style={{ fontSize: 42, fontWeight: 900, width: 460, whiteSpace: "nowrap" }}>{M[m].name}</span>
      <span style={{ fontSize: 76, fontWeight: 900, color, width: 300, letterSpacing: -2 }}>{cost}</span>
      <span style={{ fontSize: 34, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>{score}</span>
    </div>
  </In>
);

export const Honest: React.FC = () => {
  const frame = useBeatFrame();
  const crown = progAt(frame, 1.2, 0.6, EBACK);
  return (
    <AbsoluteFill>
      <At x={960} y={130} center>
        <In at={0} from="down">
          <Tag color={K.deepseekHi} size={32}>
            说句公道话
          </Tag>
        </In>
      </At>
      <At x={960} y={230} center>
        <Kinetic at={0.4} size={76} parts={["最新的 ", { t: "DeepSeek V4.1 Flash", c: K.deepseekHi }, "，是真便宜"]} />
      </At>
      <At x={360} y={620} center>
        <div style={{ position: "relative" }}>
          <Whale size={300} mood="happy" />
          <svg width={140} height={90} viewBox="0 0 140 90" style={{ position: "absolute", left: 60, top: -70 + (1 - crown) * -200, opacity: crown }}>
            <path d="M10 80 L20 20 L50 55 L70 10 L90 55 L120 20 L130 80 Z" fill={K.gold} stroke="#000" strokeWidth={4} />
          </svg>
        </div>
      </At>
      <div style={{ position: "absolute", left: 700, top: 420, fontFamily: FONT, color: K.fg }}>
        <In at={1.6}>
          <div style={{ fontSize: 28, fontWeight: 700, color: K.muted, marginBottom: 6 }}>平均每道题的 API 花费</div>
        </In>
        <StatRow m="dsflash" cost="$0.26" score="45 分" color={K.deepseekHi} at={2} />
        <StatRow m="opus" cost="$1.34" score="51 分" color={K.claudeHi} at={2.8} />
      </div>
      <At x={1200} y={860} center>
        <In at={6}>
          <div style={{ fontSize: 46, fontWeight: 900, whiteSpace: "nowrap" }}>
            只按 API 算，DeepSeek <span style={{ color: K.deepseekHi }}>便宜 5 倍</span>
          </div>
        </In>
      </At>
      <Note>Artificial Analysis 智能指数 v4.3 平均每题花费 · Opus 5.5 为默认（medium）档 · DeepSeek 为高峰价，闲时再打五折</Note>
    </AbsoluteFill>
  );
};

// ───────── Combine: both reasons together (the reveal lands on the drop) ─────────

const REVEAL = 16;

export const Combine: React.FC = () => {
  const frame = useBeatFrame();
  const drain = progAt(frame, 8, REVEAL - 8, EIO);
  const opusV = Math.exp(lerp(Math.log(1.34), Math.log(0.037), drain));
  const done = frame >= REVEAL * FPB;
  const reveal = progAt(frame, REVEAL, 0.5, EBACK);
  const dimDs = progAt(frame, REVEAL + 0.5, 1);
  const chip = progAt(frame, 7, 0.8, EBACK);
  const pulse = Math.sin(((frame / FPB) % 1) * Math.PI);
  return (
    <AbsoluteFill>
      <At x={960} y={170} center>
        <Kinetic at={0} out={REVEAL - 0.4} size={76} parts={["可如果，把", { t: "两个原因", c: K.gold }, "叠在一起——"]} />
      </At>
      <At x={960} y={170} center>
        <Chroma at={REVEAL}>
          <In at={REVEAL} from="slam" dur={0.5}>
            <div style={{ fontFamily: FONT, fontSize: 104, fontWeight: 900, color: K.green, whiteSpace: "nowrap", letterSpacing: -3 }}>最聪明的，反而最便宜</div>
          </In>
        </Chroma>
      </At>
      <Shockwave at={REVEAL} x={600} y={560} color={K.green} />
      <At x={600} y={560} center>
        <In at={2.5} from="up">
          <Glass glow={done ? K.green : K.claude} style={{ width: 620, padding: "34px 40px", border: done ? `2px solid ${K.green}` : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Badge m="opus" size={60} />
              <span style={{ fontSize: 42, fontWeight: 900 }}>Claude Opus 5.5</span>
              <span style={{ fontSize: 34, fontWeight: 700, color: K.muted, marginLeft: "auto" }}>51 分</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 18 }}>
              <span style={{ fontSize: 150, fontWeight: 900, color: done ? K.green : K.claudeHi, letterSpacing: -5, textShadow: `0 0 ${50 * reveal}px ${K.green}88` }}>
                ${opusV.toFixed(2)}
              </span>
              <span style={{ fontSize: 36, fontWeight: 700, color: K.muted }}>/ 题</span>
            </div>
          </Glass>
        </In>
      </At>
      {chip > 0 ? (
        <At x={600} y={330} center>
          <div
            style={{
              transform: `scale(${chip})`,
              padding: "10px 30px",
              borderRadius: 999,
              background: K.claude,
              color: K.bg,
              fontFamily: FONT,
              fontSize: 44,
              fontWeight: 900,
              whiteSpace: "nowrap",
              boxShadow: `0 0 ${24 + (done ? 0 : 26 * pulse)}px ${K.claude}`,
            }}
          >
            ÷ 36 包月用满
          </div>
        </At>
      ) : null}
      <At x={1360} y={560} center>
        <In at={4} from="up">
          <div style={{ opacity: 1 - dimDs * 0.45 }}>
            <Glass glow={K.deepseek} style={{ width: 640, padding: "34px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Badge m="dsflash" size={60} />
                <span style={{ fontSize: 40, fontWeight: 900, whiteSpace: "nowrap" }}>DeepSeek V4.1 Flash</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 18 }}>
                <span style={{ fontSize: 120, fontWeight: 900, color: K.deepseekHi, letterSpacing: -4 }}>$0.26</span>
                <span style={{ fontSize: 36, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>/ 题 · 45 分</span>
              </div>
            </Glass>
          </div>
        </In>
      </At>
      <At x={960} y={860} center>
        <In at={REVEAL + 2}>
          <div style={{ fontSize: 40, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>
            分更高，每道题还更便宜 —— 就算 DeepSeek 闲时价 <span style={{ color: K.fg }}>$0.13</span>，也比不过
          </div>
        </In>
      </At>
      <Note>$1.34 ÷ 36 ≈ $0.04 · 36 = Max 20x 用满时的实测倍数 · 每题花费来自 Artificial Analysis 智能指数 v4.3</Note>
    </AbsoluteFill>
  );
};
