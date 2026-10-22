import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { Tile } from "../art";
import { At, CL, EO, In, Kinetic, lerp, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, MONO } from "../theme";
import { FPB } from "../timing";
import { Src } from "../ui";

// ───────── 12. To be fair: shovels go out of fashion too (ShipFast on the price elevator) ─────────

const SHAFT_X = 1300;
const SHAFT_W = 300;
const CAB_H = 200;
const TOP_Y = 270;
const BOT_Y = 690;
const DROP = 4.6;
const FALL = 1.4;

export const Elevator: React.FC = () => {
  const frame = useBeatFrame();
  const beat = frame / FPB;
  const p = interpolate(beat, [DROP, DROP + FALL], [0, 1], { ...CL, easing: Easing.in(Easing.cubic) });
  const landed = beat - (DROP + FALL);
  const bounce = landed > 0 ? Math.exp(-landed * 5) * Math.sin(landed * 18) * 26 : 0;
  const y = lerp(TOP_Y, BOT_Y, p) - Math.abs(bounce);
  const shown = interpolate(beat, [DROP, DROP + FALL], [126000, 1694], { ...CL, easing: Easing.in(Easing.cubic) });
  const falling = p > 0 && p < 1;
  const mood = p <= 0 ? "happy" : p < 1 ? "shock" : "sad";
  return (
    <AbsoluteFill>
      <At x={960} y={150} center>
        <Kinetic at={0} size={76} parts={["说句公道话：", { t: "铲子也会过气", c: K.red }]} />
      </At>
      <At x={620} y={300} center>
        <In at={0.8}>
          <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            最出名的网站模板 <span style={{ color: K.fg }}>ShipFast</span>
          </div>
        </In>
      </At>
      <At x={620} y={470} center>
        <In at={1.6}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub }}>最高的一个月</div>
            <div style={{ fontFamily: FONT, fontSize: 120, fontWeight: 900, color: K.fg, letterSpacing: -3 }}>$126,000</div>
          </div>
        </In>
      </At>
      <At x={620} y={720} center>
        <In at={6.2} from="scale">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub }}>最近 30 天</div>
            <div style={{ fontFamily: FONT, fontSize: 120, fontWeight: 900, color: K.red, letterSpacing: -3 }}>$1,694</div>
          </div>
        </In>
      </At>
      {/* The shaft */}
      <In at={0.4} from="fade" style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: SHAFT_X, top: 240, width: SHAFT_W, height: 680, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.10)" }} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ position: "absolute", left: SHAFT_X - 26, top: 260 + i * 105, width: 16, height: 3, background: K.dim }} />
        ))}
        <div style={{ position: "absolute", left: SHAFT_X + SHAFT_W / 2 - 1, top: 160, width: 2, height: Math.max(0, y - 160), background: "rgba(255,255,255,0.18)" }} />
      </In>
      {/* Floor display above the shaft */}
      <At x={SHAFT_X + SHAFT_W / 2} y={190} center>
        <In at={0.6} from="fade">
          <div style={{ padding: "6px 18px", borderRadius: 10, background: "#000", border: `2px solid ${p >= 1 ? K.red : K.dim}`, fontFamily: MONO, fontSize: 34, color: p >= 1 ? K.red : K.green, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            ${Math.round(shown).toLocaleString("en-US")}/月
          </div>
        </In>
      </At>
      {/* The cabin carries the ShipFast tile */}
      <div style={{ position: "absolute", left: SHAFT_X + 20, top: y, width: SHAFT_W - 40, height: CAB_H, borderRadius: 16, background: "linear-gradient(180deg, #2a313c, #1b2028)", border: "2px solid #3a4250", display: "flex", alignItems: "center", justifyContent: "center", opacity: progAt(frame, 0.6, 0.6) }}>
        <Tile size={130} tone={p >= 1 ? "sleep" : "green"} mood={mood} />
      </div>
      {falling
        ? [0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: "absolute", left: SHAFT_X + 40 + i * 60, top: y - 90 - (i % 2) * 30, width: 4, height: 70 * p + 20, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
          ))
        : null}
      <Src>Marc Lou 推文（单月最高）；TrustMRR（最近 30 天，2026-10-21）</Src>
    </AbsoluteFill>
  );
};

// ───────── 13. Exceptions exist: Chatbase, 16 followers to $1M a year in 117 days ─────────

export const Exception: React.FC = () => {
  const frame = useBeatFrame();
  const fill = progAt(frame, 3, 3, Easing.bezier(0.45, 0, 0.2, 1));
  const year = 1000000 * fill;
  const done = progAt(frame, 6, 0.6);
  const cx = 500;
  const cy = 470;
  return (
    <AbsoluteFill>
      <At x={960} y={150} center>
        <Kinetic at={0} size={76} parts={["也有人，", { t: "没有观众", c: K.themeHi }, "就做成了"]} />
      </At>
      {Array.from({ length: 16 }, (_, k) => {
        const a = (k / 16) * Math.PI * 2 + 0.2;
        const pk = progAt(frame, 0.6 + k * 0.1, 0.6, EO);
        return <div key={k} style={{ position: "absolute", left: cx + Math.cos(a) * 140 * pk - 8, top: cy + Math.sin(a) * 140 * pk - 8, width: 16, height: 16, borderRadius: "50%", background: K.themeHi, opacity: pk }} />;
      })}
      <At x={cx} y={cy} center>
        <In at={0.3} from="scale">
          <Tile size={150} tone={done > 0.5 ? "green" : "blue"} mood={done > 0.5 ? "happy" : "idle"} glow={done} />
        </In>
      </At>
      <At x={cx} y={660} center>
        <In at={1.8}>
          <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            <span style={{ color: K.fg }}>Chatbase</span> 起步时：<span style={{ color: K.themeHi }}>16</span> 个关注者
          </div>
        </In>
      </At>
      {/* 117 days on a track */}
      <In at={2.6} from="fade" style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 900, top: 520, width: 800, height: 16, borderRadius: 8, background: "#252a32" }} />
        <div style={{ position: "absolute", left: 900, top: 520, width: 800 * fill, height: 16, borderRadius: 8, background: `linear-gradient(90deg, ${K.theme}, ${K.green})` }} />
        <div style={{ position: "absolute", left: 900, top: 556, fontFamily: FONT, fontSize: 32, fontWeight: 700, color: K.muted }}>第 1 天</div>
        <div style={{ position: "absolute", left: 900 + 800 * fill - 70, top: 556, width: 140, textAlign: "center", fontFamily: FONT, fontSize: 32, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>
          第 {Math.max(1, Math.round(117 * fill))} 天
        </div>
      </In>
      <At x={1300} y={420} center>
        <In at={3}>
          <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap", transform: `scale(${1 + 0.08 * done * (1 - done) * 4})` }}>
            <span style={{ fontFamily: FONT, fontSize: 50, fontWeight: 900, color: K.sub }}>年收入 </span>
            <Odometer value={year} size={110} prefix="$" color={done > 0.5 ? K.green : K.fg} />
          </div>
        </In>
      </At>
      <At x={1300} y={680} center>
        <In at={7.6} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 500, color: K.sub, whiteSpace: "nowrap" }}>后来：每月 $86 万（TrustMRR 核验，2026-07）</div>
        </In>
      </At>
      <Src>Superframeworks · Chatbase 案例（创始人自述）· 2026；TrustMRR</Src>
    </AbsoluteFill>
  );
};
