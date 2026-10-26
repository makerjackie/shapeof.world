import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, SANS, SERIF } from "../theme";
import { CL, EO } from "./kit";

// 189–199 s. Sources, then the end card (no sting, no URL).

export const S8_LEN = 300;
const CARD = 130;

const ROWS = [
  "《2025 年中国睡眠健康调查报告》，中国睡眠研究会等，2025",
  "Sirois & Pychyl (2013), Procrastination and the Priority of Short-Term Mood Regulation",
  "Wohl, Pychyl & Bennett (2010), I forgive myself, now I can study",
  "Breines & Chen (2012), Self-compassion increases self-improvement motivation",
  "Kroese et al. (2014), Bedtime procrastination, Frontiers in Psychology",
  "失眠认知行为疗法（CBT-I）· 刺激控制法",
  "研究多为相关性或小样本结论，不构成医疗建议",
];

export const S8End: React.FC = () => {
  const f = useCurrentFrame();
  const src = interpolate(f, [0, 14, CARD - 12, CARD], [0, 1, 1, 0], CL);
  const t = f - CARD;
  const k = interpolate(t, [0, 24], [0, 1], { ...CL, easing: EO });
  const k2 = interpolate(t, [14, 40], [0, 1], { ...CL, easing: EO });
  return (
    <AbsoluteFill style={{ background: "#050608" }}>
      {src > 0 && (
        <div style={{ position: "absolute", left: 220, top: 210, opacity: src, color: K.sub, fontFamily: SANS }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: K.fg, marginBottom: 36, letterSpacing: 6 }}>信息来源</div>
          {ROWS.map((r, i) => (
            <div key={i} style={{ fontSize: 28, lineHeight: 1.9, fontFamily: /[a-z]/.test(r) ? FONT : SANS, opacity: i === ROWS.length - 1 ? 0.6 : 1 }}>
              {r}
            </div>
          ))}
        </div>
      )}
      {t >= 0 && (
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: Math.min(1, t / 10) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
            <Img src={staticFile("mark-disc.png")} style={{ width: 132, height: 132 }} />
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 112, color: K.fg, letterSpacing: 10 }}>世界的形状</span>
          </div>
          <div style={{ marginTop: 34, fontFamily: SERIF, fontWeight: 600, fontSize: 40, letterSpacing: 18, color: "rgba(244,240,232,0.78)", opacity: k2 }}>看见世界如何运行</div>
          <div style={{ position: "absolute", bottom: 120, fontFamily: FONT, fontSize: 30, fontWeight: 600, letterSpacing: 6, color: "rgba(244,240,232,0.7)", opacity: k2 }}>MakerJackie</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
