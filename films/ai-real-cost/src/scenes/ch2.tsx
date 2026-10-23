import React from "react";
import { AbsoluteFill } from "remotion";
import { Receipt, Spark, Whale } from "../art";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { At, EBACK, Glass, In, Kinetic, Note, progAt, Tag } from "../fx";
import { FONT, K } from "../theme3";

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
    <Glass glow={color} style={{ width: 500, padding: "22px 30px", background: "linear-gradient(160deg, #1d1c26, #121118)" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>共 {tokens} token</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 76, fontWeight: 900, color, letterSpacing: -3, whiteSpace: "nowrap" }}>{cost}</span>
        <span style={{ fontSize: 40, fontWeight: 900, whiteSpace: "nowrap" }}>{score}</span>
      </div>
    </Glass>
  </In>
);

export const Receipts: React.FC = () => {
  const b = useBeatFrame() / FPB;
  const dsMood = b < 4.5 ? "happy" : b < 7.5 ? "sweat" : "shock";
  return (
    <AbsoluteFill>
      <At x={960} y={52} center>
        <In at={0} from="down" out={11.2}>
          <Tag color={K.gold} size={28}>
            原因二 · 省 token
          </Tag>
        </In>
      </At>
      <At x={960} y={130} center>
        <Kinetic at={0} out={11.2} size={70} parts={["同一套考试，", { t: "各打一张小票", c: K.gold }]} />
      </At>
      <At x={960} y={120} center>
        <Stamp at={11.6} color={K.gold} size={62}>
          单价贵 5 倍，总价反而更低
        </Stamp>
      </At>
      <At x={1600} y={330} center>
        <In at={12.8}>
          <div style={{ textAlign: "center", fontFamily: FONT }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>聪明的少绕路</div>
            <div style={{ fontSize: 40, fontWeight: 900, whiteSpace: "nowrap" }}>
              token 只用了 <span style={{ color: K.gold, fontSize: 64 }}>1/8</span>
            </div>
          </div>
        </In>
      </At>
      <At x={150} y={200}>
        <In at={1} from="left">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Spark size={110} mood={b < 9.9 ? "happy" : "smug"} />
            <div>
              <div style={{ fontSize: 40, fontWeight: 900 }}>Claude Opus 5.5</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>单价约 ¥134 / 百万 · 低推理档</div>
            </div>
          </div>
        </In>
      </At>
      <At x={150} y={350}>
        <Receipt title="CLAUDE · 小票" color={K.claude} lines={OPUS_LINES} start={2.2} per={0.7} width={400} />
      </At>
      <At x={150} y={700}>
        <Total at={5.2} tokens="2,000 万" cost="约 ¥5,800" score="42 分" color={K.claudeHi} />
      </At>
      <At x={800} y={200}>
        <In at={1.5} from="right">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Whale size={130} mood={dsMood} />
            <div>
              <div style={{ fontSize: 40, fontWeight: 900 }}>DeepSeek V4 Pro</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>单价 ¥27 / 百万 · 最高推理档</div>
            </div>
          </div>
        </In>
      </At>
      <At x={800} y={350}>
        <Receipt title="DEEPSEEK · 小票" color={K.deepseek} lines={DS_LINES} start={2.2} per={0.22} width={400} />
      </At>
      <At x={1360} y={520}>
        <Total at={9.9} tokens="1.6 亿" cost="约 ¥7,500" score="36 分" color={K.deepseekHi} />
      </At>
      <Note>Artificial Analysis 智能指数 v4.3（2026-10）跑完整套考题的实测花费：Opus 5.5 低推理档 $860、DeepSeek V4 Pro 最高档 $1,122 · 每行 = 500 万 token</Note>
    </AbsoluteFill>
  );
};

