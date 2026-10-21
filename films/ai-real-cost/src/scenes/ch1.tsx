import React from "react";
import { AbsoluteFill, random } from "remotion";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { PLAN } from "../data";
import { At, Badge, Chroma, EIO, EO, fmtMoney, Glass, In, Kinetic, lerp, Note, Odometer, progAt, Tag } from "../fx";
import { FONT, K } from "../theme3";

// ───────── Tower: what $200 buys at API prices ─────────

const PX_PER_USD = 0.255;
const BASE_Y = 930;

export const Tower: React.FC = () => {
  const frame = useBeatFrame();
  const grow = progAt(frame, 1.2, 5.4, (t) => 1 - Math.pow(1 - t, 2.6));
  const zoom = progAt(frame, 7, 1.6, EIO);
  const v = PLAN.max20.lo * grow;
  const towerH = v * PX_PER_USD;
  const camY = Math.max(0, towerH - 600) * (1 - zoom);
  const scale = lerp(1, 0.24, zoom);
  const gridLines = Array.from({ length: 12 }).map((_, k) => (k + 1) * 1000);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `960px ${BASE_Y}px`, transform: `translateY(${camY - zoom * 20}px) scale(${scale})` }}>
        {gridLines.map((g) => (
          <div key={g} style={{ position: "absolute", left: -2000, right: -2000, top: BASE_Y - g * PX_PER_USD, borderTop: "2px dashed rgba(255,255,255,0.08)" }}>
            <span style={{ position: "absolute", left: 2000 + 880, top: -40, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.dim }}>{fmtMoney(g)}</span>
          </div>
        ))}
        <div style={{ position: "absolute", left: 1060, top: BASE_Y - 200 * PX_PER_USD, width: 200, height: 200 * PX_PER_USD, background: K.fg, borderRadius: 6, boxShadow: `0 0 30px ${K.fg}66` }} />
        <div style={{ position: "absolute", left: 1060, top: BASE_Y + 14, width: 200, textAlign: "center", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.fg }}>
          $200
          <div style={{ fontSize: 24, color: K.muted, fontWeight: 700, whiteSpace: "nowrap" }}>你付的 · Max 20x</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 560,
            top: BASE_Y - towerH,
            width: 300,
            height: towerH,
            borderRadius: "14px 14px 0 0",
            background: `linear-gradient(180deg, ${K.gold}, ${K.claude} 40%, ${K.claude}aa)`,
            boxShadow: `0 0 80px ${K.claude}66`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 51px)" }} />
        </div>
        <div style={{ position: "absolute", left: 560, top: BASE_Y + 14, width: 300, textAlign: "center", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.claudeHi }}>
          API 等值
          <div style={{ fontSize: 24, color: K.muted, fontWeight: 700 }}>你用掉的</div>
        </div>
        <div style={{ position: "absolute", left: 530, top: BASE_Y - towerH - 30, transform: "translateX(-100%)", opacity: progAt(frame, 5.8, 0.6) * (1 - zoom), whiteSpace: "nowrap" }}>
          <Tag color={K.claude} size={34}>
            实测中位数
          </Tag>
        </div>
      </div>
      <At x={960} y={130} center style={{ opacity: 1 - zoom }}>
        <Kinetic at={0} size={72} parts={["$200 包月，能用掉多少", { t: " API 钱", c: K.gold }, "？"]} />
      </At>
      <At x={1500} y={330} center style={{ opacity: 1 - zoom }}>
        <In at={1.2}>
          <Odometer value={v} prefix="$" size={130} color={K.claudeHi} />
        </In>
      </At>
      {zoom > 0 ? (
        <>
          <At x={1340} y={440} center>
            <Chroma at={8}>
              <div style={{ opacity: progAt(frame, 7.8, 0.6), fontFamily: FONT, fontSize: 220, fontWeight: 900, color: K.gold, letterSpacing: -6, whiteSpace: "nowrap" }}>36 倍</div>
            </Chroma>
          </At>
          <At x={1340} y={610} center>
            <In at={8.4}>
              <div style={{ fontSize: 46, fontWeight: 900, whiteSpace: "nowrap" }}>付 $200，用掉 $7,121</div>
            </In>
          </At>
          <At x={1340} y={690} center>
            <In at={9.4}>
              <div style={{ fontSize: 34, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>
                同样 $200，比 <span style={{ color: K.gpt }}>ChatGPT Pro</span> 多给 <span style={{ color: K.fg }}>3–5 倍</span>
              </div>
            </In>
          </At>
        </>
      ) : null}
      <Note>实测：wokey.ai 17 个用满的 Max 20x 账号中位数（2026-10）· 理论上限 $11,726 · ChatGPT Pro $200 理论上限 $2,084–2,897 · 上限均为 SemiAnalysis · 按 API 原价折算</Note>
    </AbsoluteFill>
  );
};

// ───────── Elevator: the effective per-token price ─────────

const FLOORS = [
  { v: 20, label: "Opus 5.5 · API 原价", color: K.claude },
  { v: 10, label: "GPT-6.1 · Gemini 4 · Sonnet 5.5", color: K.gpt },
  { v: 6, label: "Qwen3.8 Max", color: K.qwen },
  { v: 1.2, label: "DeepSeek V4.1 Flash", color: K.deepseek },
  { v: 0.6, label: "DeepSeek 闲时五折", color: K.deepseekHi },
];
const yOf = (v: number) => 260 + ((Math.log(20) - Math.log(v)) / (Math.log(20) - Math.log(0.45))) * 660;

const DESCENT_AT = 2;
const DESCENT_LEN = 4.6;

// Beat at which the car passes price v during the descent.
const passBeat = (v: number) => {
  const target = (Math.log(20) - Math.log(v)) / (Math.log(20) - Math.log(0.56));
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (EIO(mid) < target) lo = mid;
    else hi = mid;
  }
  return DESCENT_AT + DESCENT_LEN * lo;
};

export const Elevator: React.FC = () => {
  const frame = useBeatFrame();
  const p = progAt(frame, DESCENT_AT, DESCENT_LEN, EIO);
  const v = Math.exp(lerp(Math.log(20), Math.log(0.56), p));
  const landF = (DESCENT_AT + DESCENT_LEN) * FPB;
  const bounce = frame > landF ? -Math.sin((frame - landF) / 2.6) * 16 * Math.exp(-(frame - landF) / 7) : 0;
  const carY = yOf(v) + bounce;
  const appear = progAt(frame, 0.8, 1);
  return (
    <AbsoluteFill>
      <At x={960} y={130} center>
        <Kinetic at={0} size={72} parts={["换算成单价，", { t: "Opus 多少钱", c: K.claudeHi }, "？"]} />
      </At>
      <div style={{ position: "absolute", left: 560, top: 230, width: 170, height: 720, borderLeft: "2px solid rgba(255,255,255,0.12)", borderRight: "2px solid rgba(255,255,255,0.12)", opacity: appear }} />
      <div style={{ position: "absolute", left: 644, top: 230, width: 2, height: Math.max(0, carY - 230), background: "rgba(255,255,255,0.35)", opacity: appear }} />
      {FLOORS.map((f, i) => {
        const y = yOf(f.v);
        const e = progAt(frame, 0.8 + i * 0.25, 0.8);
        const passed = carY >= y - 4;
        const since = frame - passBeat(f.v) * FPB;
        const flash = passed && since >= 0 ? Math.max(0, 1 - since / 12) : 0;
        return (
          <div key={f.label} style={{ position: "absolute", left: 0, top: y, width: 1920, opacity: e }}>
            <div style={{ position: "absolute", left: 200, width: 330, top: -26, textAlign: "right", fontFamily: FONT, fontSize: 44, fontWeight: 900, color: passed ? f.color : K.muted }}>
              ${f.v % 1 === 0 ? f.v : f.v.toFixed(2)}
            </div>
            <div style={{ position: "absolute", left: 550, width: 640, borderTop: `2px solid ${passed ? f.color : "rgba(255,255,255,0.18)"}`, boxShadow: flash > 0 ? `0 0 ${30 * flash}px ${f.color}` : undefined }} />
            <div style={{ position: "absolute", left: 760, top: -42, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: passed ? K.fg : K.muted, whiteSpace: "nowrap" }}>{f.label}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 570, top: carY - 120, width: 150, height: 120, opacity: appear }}>
        <Glass radius={14} glow={K.claude} style={{ width: 150, height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "linear-gradient(160deg, #3a2318, #1a120e)" }}>
          <Badge m="opus" size={40} />
          <Odometer value={v} decimals={2} prefix="$" size={34} color={K.claudeHi} />
        </Glass>
      </div>
      {frame > landF ? <Dust at={DESCENT_AT + DESCENT_LEN} x={645} y={yOf(0.56)} /> : null}
      <At x={1500} y={560} center>
        <In at={DESCENT_AT + DESCENT_LEN + 0.4} from="slam" dur={0.5}>
          <div style={{ textAlign: "center", fontFamily: FONT }}>
            <div style={{ fontSize: 150, fontWeight: 900, color: K.green, letterSpacing: -4 }}>$0.56</div>
            <div style={{ fontSize: 40, fontWeight: 900, whiteSpace: "nowrap" }}>≈ DeepSeek 闲时价</div>
          </div>
        </In>
      </At>
      <Note>输出价 · 美元 / 百万 token · Max 20x 用满 = API 价 ÷ 36（实测）</Note>
    </AbsoluteFill>
  );
};

const Dust: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const frame = useBeatFrame();
  const t = (frame - at * FPB) / 24;
  if (t < 0 || t > 1) return null;
  return (
    <>
      {Array.from({ length: 16 }).map((_, i) => {
        const dir = i % 2 ? 1 : -1;
        const sp = 60 + random(`d${i}`) * 160;
        const up = 20 + random(`u${i}`) * 50;
        const s = 10 + random(`s${i}`) * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + dir * EO(t) * sp,
              top: y - EO(t) * up,
              width: s,
              height: s,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.4)",
              opacity: 1 - t,
            }}
          />
        );
      })}
    </>
  );
};
