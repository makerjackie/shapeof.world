import React from "react";
import { AbsoluteFill } from "remotion";
import { Spark } from "../art";
import { useBeatFrame } from "../kit";
import { At, EBACK, EO, In, Kinetic, Note, Odometer, progAt } from "../fx";
import { FONT, K } from "../theme3";

// ───────── Relay stations ─────────

const RELAY = [
  { label: "官方 API", pct: 100, c: K.muted },
  { label: "中转站「¥1 = $1 · 1.5 倍率」", pct: 21, c: K.gold },
  { label: "自己包月 · 用满", pct: 2.8, c: K.green },
];

export const Relay: React.FC = () => {
  const frame = useBeatFrame();
  const W = 900;
  return (
    <AbsoluteFill>
      <At x={960} y={200} center>
        <Kinetic at={0} size={80} parts={["想更省？", { t: "中转站反而更贵", c: K.gold }]} />
      </At>
      <div style={{ position: "absolute", left: 120, top: 380 }}>
        {RELAY.map((r, i) => {
          const p = progAt(frame, 1.2 + i * 0.7, 1.1, EO);
          const w = Math.max(12, (r.pct / 100) * W * p);
          return (
            <div key={r.label} style={{ display: "flex", alignItems: "center", height: 140, opacity: Math.min(1, p * 2) }}>
              <div style={{ width: 620, textAlign: "right", paddingRight: 30, fontFamily: FONT, fontSize: 42, fontWeight: 900, whiteSpace: "nowrap", color: K.fg }}>{r.label}</div>
              <div style={{ width: w, height: 76, borderRadius: 12, background: `linear-gradient(90deg, ${r.c}88, ${r.c})`, boxShadow: `0 0 30px ${r.c}55` }} />
              <div style={{ paddingLeft: 24 }}>
                <Odometer value={r.pct * p} decimals={r.pct < 10 ? 1 : 0} suffix="%" size={64} color={r.c} />
              </div>
            </div>
          );
        })}
      </div>
      <At x={1060} y={720} center>
        <In at={3} from="scale">
          <Spark size={130} mood="smug" />
        </In>
      </At>
      <At x={1430} y={610} center>
        <Stamp at={4.6} color={K.red} size={58}>
          比自己包月贵 7.5 倍
        </Stamp>
      </At>
      <Note>相对官方价 · 计费公式见开源 new-api：官方价 × 倍率 × 充值汇率 ÷ 7.2 · ¥7.3 = $1 的中转实际是官方价的 152% · 另有偷换模型、封号、跑路风险</Note>
    </AbsoluteFill>
  );
};

const Stamp: React.FC<{ at: number; color: string; size?: number; children: React.ReactNode }> = ({ at, color, size = 52, children }) => {
  const frame = useBeatFrame();
  const p = progAt(frame, at, 0.5, EBACK);
  if (p <= 0) return null;
  return (
    <div
      style={{
        display: "inline-block",
        padding: "8px 26px",
        border: `6px solid ${color}`,
        borderRadius: 14,
        color,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 900,
        whiteSpace: "nowrap",
        background: "#06060Acc",
        transform: `rotate(-4deg) scale(${1 + (1 - p) * 1.4})`,
        opacity: Math.min(1, p * 3),
      }}
    >
      {children}
    </div>
  );
};

// ───────── Formula: the whole video in one line ─────────

const TERMS = [
  { t: "单价", note: "只看它，Claude 最贵", c: K.red },
  { t: "用量", note: "聪明的模型少绕路", c: K.gold },
  { t: "包月倍数", note: "Claude 给到 36 倍", c: K.green },
];

export const Formula: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <At x={960} y={230} center>
        <Kinetic at={0} size={80} parts={["所以，AI 的", { t: "真实价格", c: K.claudeHi }, " ="]} />
      </At>
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 30, fontFamily: FONT }}>
        {TERMS.map((x, i) => {
          const p = progAt(frame, 1.6 + i * 1.2, 0.8, EBACK);
          const n = progAt(frame, 5.2 + i * 1.3, 0.8, EO);
          return (
            <React.Fragment key={x.t}>
              {i > 0 ? (
                <div style={{ fontSize: 110, fontWeight: 900, color: K.muted, opacity: p, lineHeight: "170px" }}>{i === 1 ? "×" : "÷"}</div>
              ) : null}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, opacity: Math.min(1, p * 2), transform: `scale(${0.6 + 0.4 * Math.min(1, p)})` }}>
                <div style={{ padding: "26px 48px", borderRadius: 26, border: `4px solid ${x.c}`, background: `${x.c}1c`, fontSize: 96, fontWeight: 900, color: x.c, whiteSpace: "nowrap", boxShadow: `0 0 50px ${x.c}33` }}>
                  {x.t}
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: K.fg, opacity: n, transform: `translateY(${(1 - n) * 20}px)`, whiteSpace: "nowrap" }}>{x.note}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <At x={960} y={860} center>
        <In at={10}>
          <div style={{ fontSize: 52, fontWeight: 900, color: K.gold, whiteSpace: "nowrap" }}>只看单价，只看到了冰山一角</div>
        </In>
      </At>
    </AbsoluteFill>
  );
};
