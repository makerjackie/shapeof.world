// 台前 (sb 18–27, with sb 21–25 cut): a glossy "official" card flips to show its back, a messy spreadsheet; flips back
// and glows: 总有人懂. Then it lifts away to show what is underneath (the xz tower).
import React from "react";
import { Box, clamp01, EIO, EO, ramp, Say, useT, win } from "./kit";
import { FONT, HAN, K, MONO, NUM } from "./theme";
import { S } from "./time";

export const FRONT_IN = S(18);
export const FRONT_OUT = S(27);

const CardFront: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "linear-gradient(145deg, #1d4f8f 0%, #133a6e 55%, #0d2a52 100%)", boxShadow: "0 40px 120px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)", overflow: "hidden", backfaceVisibility: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 260, background: "radial-gradient(ellipse 70% 100% at 30% 0%, rgba(255,255,255,0.22), transparent 70%)" }} />
    <div style={{ position: "absolute", left: 56, top: 50, fontFamily: HAN, fontWeight: 900, fontSize: 46, color: "#fff" }}>官方数据</div>
    <div style={{ position: "absolute", left: 56, top: 116, display: "flex", alignItems: "center", gap: 12, fontFamily: HAN, fontWeight: 600, fontSize: 24, color: "#bfe0ff" }}>
      <span style={{ width: 14, height: 14, borderRadius: 7, background: K.ok, boxShadow: `0 0 12px ${K.ok}` }} />
      实时更新 · 已核验 ✓
    </div>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ position: "absolute", left: 56 + i * 250, top: 196, width: 220, height: 130, borderRadius: 16, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <div style={{ margin: "18px 20px 0", fontFamily: HAN, fontSize: 20, color: "#a9c8ea" }}>{["今日新增", "累计", "治愈率"][i]}</div>
        <div style={{ margin: "6px 20px 0", fontFamily: NUM, fontWeight: 800, fontSize: 46, color: "#fff" }}>{["12,872", "512,331", "97.2%"][i]}</div>
      </div>
    ))}
    <svg style={{ position: "absolute", left: 56, top: 356 }} width={720} height={150}>
      <defs>
        <linearGradient id="fc-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6fb7ff" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#6fb7ff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d="M0 120 C 80 110, 120 90, 180 92 S 300 60, 360 64 S 480 30, 540 40 S 660 14, 720 10 L 720 150 L 0 150 Z" fill="url(#fc-g)" />
      <path d="M0 120 C 80 110, 120 90, 180 92 S 300 60, 360 64 S 480 30, 540 40 S 660 14, 720 10" fill="none" stroke="#9fd0ff" strokeWidth={4} />
    </svg>
  </div>
);

// The back: what it really is. A spreadsheet with a hand-made look: highlights, a #REF!, a sticky note, versions.
const CardBack: React.FC = () => {
  const rows = ["日期", "9/28", "9/29", "9/30", "10/1", "10/2", "10/3", "合计"];
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: K.paper, boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 160px 30px rgba(214,236,222,0.08)", overflow: "hidden", transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
      <div style={{ height: 44, background: "#1d6b43", display: "flex", alignItems: "center", paddingLeft: 24, fontFamily: HAN, fontWeight: 700, fontSize: 22, color: "#fff" }}>数据汇总_最终版(2)(改)_勿删.xlsx</div>
      {rows.map((r, i) => (
        <div key={i} style={{ position: "absolute", left: 0, top: 44 + i * 56, width: 840, height: 56, borderBottom: `1px solid ${K.grid}`, display: "flex", fontFamily: FONT, fontSize: 24, color: K.ink }}>
          {[r, i === 0 ? "新增" : ["1,820", "2,104", "手动补录", "2,513", "#REF!", "（待核）"][i - 1] ?? "=SUM(B2:B6)", i === 0 ? "备注" : ["", "老王的表", "", "用旧模板", "公式断了", "明天再说"][i - 1] ?? ""].map((v, j) => (
            <div
              key={j}
              style={{
                width: [180, 260, 400][j],
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                boxSizing: "border-box",
                borderRight: `1px solid ${K.grid}`,
                fontWeight: i === 0 ? 800 : 500,
                fontFamily: v.startsWith("=") || v.startsWith("#") ? MONO : FONT,
                color: v === "#REF!" ? "#d22b2b" : K.ink,
                background: v === "手动补录" || v === "（待核）" ? "#ffe97a" : v === "#REF!" ? K.errLo : i === 0 ? K.head : undefined,
              }}
            >
              {v}
            </div>
          ))}
        </div>
      ))}
      <div style={{ position: "absolute", left: 560, top: 300, width: 230, padding: "18px 20px", background: "#ffe066", transform: "rotate(4deg)", boxShadow: "4px 8px 18px rgba(0,0,0,0.25)", fontFamily: HAN, fontWeight: 700, fontSize: 24, color: "#5a4a10", lineHeight: 1.35 }}>
        别动 C 列！
        <br />
        动了就对不上了
      </div>
    </div>
  );
};

export const Front: React.FC = () => {
  const t = useT();
  if (t < FRONT_IN - 0.4 || t > FRONT_OUT + 0.4) return null;
  // the card: in, flip to the back, flip back to the front, away
  const cardO = Math.min(clamp01((t - FRONT_IN + 0.3) / 0.35), 1);
  const away = ramp(t, S(26.6), S(27.15), EIO);
  const flip = ramp(t, S(18.9), S(19.5), EIO) * (1 - ramp(t, S(20.4), S(20.95), EIO));
  const k = ramp(t, FRONT_IN - 0.3, FRONT_IN + 0.3, EO);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {cardO > 0 ? (
        <div style={{ position: "absolute", inset: 0, perspective: 1800, opacity: cardO }}>
          <div
            style={{
              position: "absolute",
              left: 1000,
              top: 260,
              width: 840,
              height: 540,
              transformStyle: "preserve-3d",
              transform: `translateY(${(1 - k) * 60 - away * 900}px) rotateY(${flip * 180 - 8 + 8 * flip}deg) rotateX(${4 + away * 30}deg)`,
              opacity: 1 - away,
            }}
          >
            <CardFront />
            <CardBack />
          </div>
        </div>
      ) : null}
      <Box x={110} y={400}>
        <Say at={S(18.1)} out={S(20.3)} parts={["我们看到的，是", { t: "台前", c: K.front }, "。"]} size={64} />
        <Say at={S(19.2)} out={S(20.3)} parts={["台后，常常就是这样一张表。"]} size={52} />
      </Box>
      <Box x={110} y={400}>
        <Say at={S(20.4)} out={S(25.75)} parts={["可为什么，我们总觉得"]} size={60} />
        <Say at={S(20.75)} out={S(25.75)} parts={["别人很专业？"]} size={60} />
      </Box>
      <Box x={110} y={400}>
        <Say at={S(25.85)} out={S(26.9)} parts={["因为我们默认："]} size={56} />
        <Say at={S(26.05)} out={S(26.9)} parts={[{ t: "总有人懂。", c: K.tape }]} size={120} serif weight={900} stagger={1.6} />
      </Box>
    </div>
  );
};
