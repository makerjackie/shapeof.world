import React from "react";
import { AbsoluteFill } from "remotion";
import { useBeatFrame } from "../kit";
import { PLAN } from "../data";
import { At, Chroma, EIO, In, Kinetic, lerp, Note, Odometer, progAt, Tag } from "../fx";
import { FONT, K } from "../theme3";

// ───────── Tower: what one month of the plan is worth at API prices ─────────

const PX_PER_YUAN = 0.038;
const BASE_Y = 930;
const fmtYuan = (v: number) => "¥" + Math.round(v).toLocaleString("en-US");

export const Tower: React.FC = () => {
  const frame = useBeatFrame();
  const grow = progAt(frame, 1.2, 5.4, (t) => 1 - Math.pow(1 - t, 2.6));
  const zoom = progAt(frame, 6.8, 1.4, EIO);
  const v = PLAN.worth * grow;
  const towerH = v * PX_PER_YUAN;
  const camY = Math.max(0, towerH - 600) * (1 - zoom);
  const scale = lerp(1, 0.24, zoom);
  const gridLines = Array.from({ length: 10 }).map((_, k) => (k + 1) * 5000);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `960px ${BASE_Y}px`, transform: `translateY(${camY - zoom * 20}px) scale(${scale})` }}>
        {gridLines.map((g) => (
          <div key={g} style={{ position: "absolute", left: -2000, right: -2000, top: BASE_Y - g * PX_PER_YUAN, borderTop: "2px dashed rgba(255,255,255,0.08)" }}>
            <span style={{ position: "absolute", left: 2000 + 880, top: -40, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.dim }}>{fmtYuan(g)}</span>
          </div>
        ))}
        <div style={{ position: "absolute", left: 1060, top: BASE_Y - PLAN.price * PX_PER_YUAN, width: 200, height: PLAN.price * PX_PER_YUAN, background: K.fg, borderRadius: 6, boxShadow: `0 0 30px ${K.fg}66` }} />
        <div style={{ position: "absolute", left: 1010, top: BASE_Y + 14, width: 300, textAlign: "center", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.fg }}>
          约 ¥1,344
          <div style={{ fontSize: 24, color: K.muted, fontWeight: 700, whiteSpace: "nowrap" }}>你付的 · 一个月</div>
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
        <div style={{ position: "absolute", left: 510, top: BASE_Y + 14, width: 400, textAlign: "center", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: K.claudeHi }}>
          按原价算
          <div style={{ fontSize: 24, color: K.muted, fontWeight: 700 }}>你用掉的</div>
        </div>
        <div style={{ position: "absolute", left: 530, top: BASE_Y - towerH - 30, transform: "translateX(-100%)", opacity: progAt(frame, 5.8, 0.6) * (1 - zoom), whiteSpace: "nowrap" }}>
          <Tag color={K.claude} size={34}>
            实测中位数
          </Tag>
        </div>
      </div>
      <At x={960} y={70} center style={{ opacity: 1 - zoom }}>
        <In at={0} from="down">
          <Tag color={K.claudeHi} size={28}>
            原因一 · 包月
          </Tag>
        </In>
      </At>
      <At x={960} y={150} center style={{ opacity: 1 - zoom }}>
        <Kinetic at={0} size={72} parts={["Claude 包月约 ¥1,344，", { t: "用满", c: K.gold }, "值多少？"]} />
      </At>
      <At x={1500} y={340} center style={{ opacity: 1 - zoom }}>
        <In at={1.2}>
          <Odometer value={v} prefix="¥" size={124} color={K.claudeHi} />
        </In>
      </At>
      {zoom > 0 ? (
        <>
          <At x={1340} y={400} center>
            <Chroma at={7.6}>
              <div style={{ opacity: progAt(frame, 7.4, 0.6), fontFamily: FONT, fontSize: 220, fontWeight: 900, color: K.gold, letterSpacing: -6, whiteSpace: "nowrap" }}>36 倍</div>
            </Chroma>
          </At>
          <At x={1340} y={570} center>
            <In at={8.2}>
              <div style={{ fontSize: 46, fontWeight: 900, whiteSpace: "nowrap" }}>付 1 份钱，用掉 36 份</div>
            </In>
          </At>
          <At x={1340} y={660} center>
            <In at={9.2}>
              <div style={{ fontSize: 40, fontWeight: 700, whiteSpace: "nowrap" }}>
                平摊到单价，只要约 <span style={{ color: K.green, fontWeight: 900, fontSize: 52 }}>¥3.8</span>
              </div>
            </In>
          </At>
          <At x={1340} y={780} center>
            <In at={10.4}>
              <div style={{ fontSize: 30, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>前提：真用得满。偶尔用一下，还是按量付费省</div>
            </In>
          </At>
        </>
      ) : null}
      <Note>Claude Max 20x 每月 $200 · 用满一个月按 API 原价值 $7,121：wokey.ai 17 个用满账号的中位数（2026-10）· 美元按 6.72 换算</Note>
    </AbsoluteFill>
  );
};

