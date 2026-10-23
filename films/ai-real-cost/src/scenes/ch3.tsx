import React from "react";
import { AbsoluteFill } from "remotion";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { At, Chroma, EBACK, EIO, EO, In, Kinetic, lerp, progAt, Shockwave } from "../fx";
import { FONT, K } from "../theme3";

// ───────── Formula: the whole first half in one line, then the line it leaves out ─────────

const TERMS = [
  { t: "单价", note: "Claude 贵 17 倍", c: K.red },
  { t: "用量", note: "聪明的只用 1/8", c: K.gold },
  { t: "包月倍数", note: "用满多给 36 倍", c: K.green },
];

const SWAP = 7.8; // the headline turns to the missing line
const ASK = 8.6; // "+ ？" joins the formula
const HUSH = 10; // film bar 17: the music stops, only the clock
const NAME = 14; // film bar 18: the breakdown comes in and the "？" is named

export const Formula: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const shrink = progAt(frame, SWAP, 1, EIO);
  const ask = progAt(frame, ASK, 0.7, EBACK);
  const hush = progAt(frame, HUSH, 0.6, EIO) * (1 - progAt(frame, NAME, 0.3, EO));
  const named = progAt(frame, NAME, 0.5, EBACK);
  // During the silence the "？" box breathes on every beat.
  const breathe = b >= HUSH && b < NAME ? Math.exp(-((b - HUSH) % 1) * 5) : 0;
  return (
    <AbsoluteFill>
      <At x={960} y={210} center>
        <Kinetic at={0} out={SWAP - 0.4} size={80} parts={["所以，AI 的", { t: "真实价格", c: K.claudeHi }, " ="]} />
      </At>
      <At x={960} y={210} center style={{ opacity: 1 - 0.55 * hush }}>
        <Kinetic at={SWAP} size={80} parts={["可公式里，还漏了", { t: "最贵的一项", c: K.time }]} />
      </At>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 380,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 30,
          fontFamily: FONT,
          transform: `scale(${lerp(1, 0.72, shrink)})`,
          transformOrigin: "960px 85px",
        }}
      >
        {TERMS.map((x, i) => {
          const p = progAt(frame, 1 + i * 0.7, 0.8, EBACK);
          const n = progAt(frame, 3.1 + i * 0.6, 0.8, EO) * (1 - shrink);
          return (
            <React.Fragment key={x.t}>
              {i > 0 ? <div style={{ fontSize: 110, fontWeight: 900, color: K.muted, opacity: p, lineHeight: "170px" }}>{i === 1 ? "×" : "÷"}</div> : null}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, p * 2) * (1 - 0.7 * hush), transform: `scale(${0.6 + 0.4 * Math.min(1, p)})` }}>
                <div style={{ padding: "26px 48px", borderRadius: 26, border: `4px solid ${x.c}`, background: `${x.c}1c`, fontSize: 96, fontWeight: 900, color: x.c, whiteSpace: "nowrap", boxShadow: `0 0 50px ${x.c}33` }}>
                  {x.t}
                </div>
                <div style={{ position: "absolute", top: 200, left: "50%", fontSize: 36, fontWeight: 700, color: K.fg, opacity: n, transform: `translate(-50%, ${(1 - n) * 20}px)`, whiteSpace: "nowrap" }}>{x.note}</div>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ width: lerp(0, 90, shrink), overflow: "hidden", fontSize: 110, fontWeight: 900, color: K.time, lineHeight: "170px", textAlign: "center", opacity: ask }}>+</div>
        <div style={{ width: lerp(0, 540, shrink), height: 174, position: "relative", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 26,
              border: `5px ${named > 0 ? "solid" : "dashed"} ${K.time}`,
              background: `${K.time}${named > 0 ? "33" : "10"}`,
              boxShadow: `0 0 ${40 + 60 * named + 50 * breathe}px ${K.time}${named > 0 ? "88" : "44"}`,
              opacity: Math.min(1, ask * 2),
              transform: `scale(${(0.5 + 0.5 * Math.min(1, ask)) * (1 + 0.05 * breathe)})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: 110, fontWeight: 900, color: K.time, opacity: 1 - named, transform: `translateY(${-named * 120}px)`, position: "absolute" }}>？</div>
            <Chroma at={NAME} amount={18}>
              <div style={{ fontSize: 100, fontWeight: 900, color: K.timeHi, whiteSpace: "nowrap", opacity: Math.min(1, named * 2), transform: `translateY(${(1 - Math.min(1, named)) * 120}px)` }}>
                你的时间
              </div>
            </Chroma>
          </div>
        </div>
      </div>
      <Shockwave at={NAME} x={1490} y={465} color={K.time} size={1600} />
      <At x={960} y={860} center>
        <In at={5.4} out={SWAP - 0.4}>
          <div style={{ fontSize: 52, fontWeight: 900, color: K.gold, whiteSpace: "nowrap" }}>只看单价，只看到了冰山一角</div>
        </In>
      </At>
      <At x={960} y={760} center>
        <In at={9.4} out={NAME - 0.2}>
          <div style={{ fontSize: 48, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>这一项，不在任何一张 AI 账单上</div>
        </In>
      </At>
    </AbsoluteFill>
  );
};
