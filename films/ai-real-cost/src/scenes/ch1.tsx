import React from "react";
import { AbsoluteFill, random } from "remotion";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { RangeBars } from "../charts";
import { PLAN } from "../data";
import { At, Badge, Chroma, EBACK, EIO, EO, fmtMoney, Glass, In, Kinetic, lerp, Note, Odometer, progAt, Tag } from "../fx";
import { FONT, K } from "../theme3";

// ───────── Plans: most people pay a flat monthly fee ─────────

export const Plans: React.FC = () => {
  const frame = useBeatFrame();
  const plans = [
    { name: "Pro", price: 20, sub: "", color: K.claudeHi },
    { name: "Max 5x", price: 100, sub: "每 5 小时额度 ×5", color: K.claude },
    { name: "Max 20x", price: 200, sub: "每 5 小时额度 ×20", color: K.gold },
  ];
  return (
    <AbsoluteFill>
      <At x={960} y={200} center>
        <Kinetic at={0} size={84} parts={["大多数人用 Claude，是", { t: "包月", c: K.claudeHi }, "的"]} />
      </At>
      <div style={{ position: "absolute", top: 340, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 50, perspective: 1800 }}>
        {plans.map((p, i) => {
          const e = progAt(frame, 1.6 + i * 0.8, 1.1, EBACK);
          const hero = i === 2;
          return (
            <div key={p.name} style={{ transform: `translateY(${hero ? -16 : 0}px) rotateX(${(1 - e) * 85}deg)`, transformOrigin: "50% 100%", opacity: e > 0 ? Math.min(1, e * 2) : 0 }}>
              <Glass glow={hero ? p.color : undefined} style={{ width: 400, height: 300, padding: "34px 40px", boxSizing: "border-box", border: hero ? `2px solid ${p.color}` : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 46, fontWeight: 900, color: p.color }}>{p.name}</span>
                  <Badge m="opus" size={50} />
                </div>
                <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 110, fontWeight: 900, letterSpacing: -4 }}>${p.price}</span>
                  <span style={{ fontSize: 32, color: K.muted, fontWeight: 700 }}>/ 月</span>
                </div>
                <div style={{ fontSize: 26, color: K.muted, fontWeight: 700, marginTop: 6 }}>{p.sub}</div>
              </Glass>
            </div>
          );
        })}
      </div>
      <Note>5x / 20x 指每 5 小时的额度；另有每周上限，三档每 1 美元换到的额度差不多（周额度约 1 : 5 : 10）· 来源：Anthropic 官方、wokey.ai、SemiAnalysis</Note>
    </AbsoluteFill>
  );
};

// ───────── Tower: what $200 buys at API prices ─────────

const PX_PER_USD = 0.255;
const BASE_Y = 930;

export const Tower: React.FC = () => {
  const frame = useBeatFrame();
  const grow = progAt(frame, 2, 8, (t) => 1 - Math.pow(1 - t, 2.6));
  const ghostP = progAt(frame, 11, 2.4, EIO);
  const zoom = progAt(frame, 14, 1.8, EIO);
  const v = PLAN.max20.lo * grow;
  const ghostV = (PLAN.max20.hi - PLAN.max20.lo) * ghostP;
  const towerH = v * PX_PER_USD;
  const ghostH = ghostV * PX_PER_USD;
  const camY = Math.max(0, towerH + ghostH - 600) * (1 - zoom);
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
          <div style={{ fontSize: 24, color: K.muted, fontWeight: 700 }}>你付的</div>
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
        {ghostH > 1 ? (
          <div
            style={{
              position: "absolute",
              left: 560,
              top: BASE_Y - towerH - ghostH,
              width: 300,
              height: ghostH,
              border: `4px dashed ${K.gold}`,
              borderBottom: "none",
              borderRadius: "14px 14px 0 0",
              background: `repeating-linear-gradient(-45deg, ${K.gold}33 0 12px, transparent 12px 24px)`,
              boxSizing: "border-box",
            }}
          />
        ) : null}
        <div style={{ position: "absolute", left: 560, top: BASE_Y + 14, width: 300, textAlign: "center", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.claudeHi }}>
          API 等值
          <div style={{ fontSize: 24, color: K.muted, fontWeight: 700 }}>你用掉的</div>
        </div>
        <div style={{ position: "absolute", left: 530, top: BASE_Y - towerH - 30, transform: "translateX(-100%)", opacity: progAt(frame, 9.6, 0.6) * (1 - zoom), whiteSpace: "nowrap" }}>
          <Tag color={K.claude} size={34}>
            实测中位数
          </Tag>
        </div>
        <div style={{ position: "absolute", left: 530, top: BASE_Y - towerH - ghostH - 30, transform: "translateX(-100%)", opacity: progAt(frame, 12.6, 0.6) * (1 - zoom), whiteSpace: "nowrap" }}>
          <Tag color={K.gold} size={34}>
            理论上限
          </Tag>
        </div>
      </div>
      <At x={960} y={130} center style={{ opacity: 1 - zoom }}>
        <Kinetic at={0} size={72} parts={["$200 包月，能用掉多少", { t: " API 钱", c: K.gold }, "？"]} />
      </At>
      <At x={1500} y={330} center style={{ opacity: 1 - zoom }}>
        <In at={1.6}>
          <Odometer value={v + ghostV} prefix="$" size={130} color={ghostP > 0 ? K.gold : K.claudeHi} />
        </In>
      </At>
      {zoom > 0 ? (
        <>
          <At x={1340} y={440} center>
            <Chroma at={15.2}>
              <div style={{ opacity: progAt(frame, 15, 0.6), fontFamily: FONT, fontSize: 220, fontWeight: 900, color: K.gold, letterSpacing: -6, whiteSpace: "nowrap" }}>36 倍</div>
            </Chroma>
          </At>
          <At x={1340} y={610} center>
            <In at={15.8}>
              <div style={{ fontSize: 46, fontWeight: 900, whiteSpace: "nowrap" }}>付 $200，用掉 $7,121</div>
            </In>
          </At>
        </>
      ) : null}
      <Note>实测：wokey.ai 17 个用满的 Max 20x 账号中位数（2026-10）· 理论上限 $11,726（59 倍，SemiAnalysis）· 按 API 原价折算</Note>
    </AbsoluteFill>
  );
};

// ───────── VsGPT: same $200, very different quota ─────────

export const VsGPT: React.FC = () => (
  <AbsoluteFill>
    <At x={960} y={200} center>
      <Kinetic at={0} size={80} parts={["同样 $200，Claude ", { t: "多给 3–5 倍", c: K.gold }]} />
    </At>
    <div style={{ position: "absolute", left: 90, top: 400 }}>
      <RangeBars
        at={1}
        step={0.8}
        max={12000}
        width={720}
        rowH={140}
        labelW={480}
        rows={[
          { label: "Claude Max 20x", m: "opus", color: K.claude, lo: PLAN.max20.lo, hi: PLAN.max20.hi, text: "$7,121 – 11,726" },
          { label: "ChatGPT Pro", m: "sol", color: K.gpt, lo: PLAN.gptPro200.lo, hi: PLAN.gptPro200.hi, text: "$2,084 – 2,897" },
        ]}
      />
    </div>
    <Note>每月 API 等值 · 实心 = 实测，虚线 = 理论上限（SemiAnalysis 2026-10）· ChatGPT Pro 9 月 29 日起降为 10× Plus · 顶配模型（Fable 5.1 vs GPT-6 Astra）两家相当</Note>
  </AbsoluteFill>
);

// ───────── Elevator: the effective per-token price ─────────

const FLOORS = [
  { v: 20, label: "Opus 5.5 · API 原价", color: K.claude },
  { v: 10, label: "GPT-6.1 · Gemini 4 · Sonnet 5.5", color: K.gpt },
  { v: 6, label: "Qwen3.8 Max", color: K.qwen },
  { v: 1.2, label: "DeepSeek V4.1 Flash", color: K.deepseek },
  { v: 0.6, label: "DeepSeek 闲时五折", color: K.deepseekHi },
];
const yOf = (v: number) => 260 + ((Math.log(20) - Math.log(v)) / (Math.log(20) - Math.log(0.45))) * 660;

const DESCENT_AT = 3;
const DESCENT_LEN = 9;

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
