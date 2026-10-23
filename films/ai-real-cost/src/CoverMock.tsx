import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Spark, Whale } from "./art";
import { FONT, K } from "./theme3";

// Series cover template (STYLE.md): paper brand bar, one plain sentence that says what the film is about,
// set huge so it reads as a feed thumbnail (B站 card ≈ 180 pt wide, 抖音 grid ≈ 130 pt), and the characters.

const serif = loadSerif("normal", { weights: ["700"], ignoreTooManyRequestsWarning: true });

const S = {
  night: "#07090b",
  paper: "#f1ecdf",
  ink: "#19231f",
  text: "#f4f0e8",
  gold: "#ffd166",
};

type Props = { tall: boolean };

const Bg: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 22% 40%, ${K.claude}40 0%, transparent 42%), radial-gradient(circle at 82% 72%, ${K.deepseek}40 0%, transparent 45%), ${S.night}`,
    }}
  >
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.06 }} />
  </AbsoluteFill>
);

// Full-width paper bar: orb + 世界的形状 on the left, the motto on the right.
const BrandBar: React.FC<{ h: number }> = ({ h }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: h,
      background: S.paper,
      borderBottom: `3px solid ${S.gold}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `0 ${h * 0.6}px`,
      fontFamily: serif.fontFamily,
      color: S.ink,
      zIndex: 5,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-512.png")} style={{ width: h * 0.74, height: h * 0.74, borderRadius: "50%" }} />
      <span style={{ fontSize: h * 0.48, fontWeight: 700, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontSize: h * 0.32, fontWeight: 700, letterSpacing: "0.4em", opacity: 0.7 }}>看见世界如何运行</span>
  </div>
);

const Big: React.FC<{ size: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ size, color = S.text, children, style }) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 900, color, lineHeight: 1.04, letterSpacing: -size * 0.03, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.7)", ...style }}>
    {children}
  </div>
);

export const CoverMockG: React.FC<Props> = ({ tall }) => (
  <AbsoluteFill>
    <Bg />
    <BrandBar h={tall ? 100 : 76} />
    <div style={{ position: "absolute", left: tall ? 56 : 100, top: tall ? 190 : 170 }}>
      <Big size={tall ? 116 : 160}>
        全球<span style={{ color: K.claudeHi }}>最聪明</span>的 AI
      </Big>
      {tall ? (
        <>
          <Big size={156} style={{ marginTop: 14 }}>
            比 <span style={{ color: K.deepseekHi }}>DeepSeek</span>
          </Big>
          <Big size={230}>
            还<span style={{ color: K.green }}>便宜</span>
          </Big>
        </>
      ) : (
        <Big size={196} style={{ marginTop: 10 }}>
          比 <span style={{ color: K.deepseekHi }}>DeepSeek</span> 还<span style={{ color: K.green }}>便宜</span>
        </Big>
      )}
    </div>
    <div style={{ position: "absolute", left: tall ? 50 : 120, bottom: tall ? 60 : 50 }}>
      <Spark size={tall ? 300 : 300} mood="smug" />
    </div>
    <div style={{ position: "absolute", right: tall ? 30 : 110, bottom: tall ? 40 : 30 }}>
      <div style={{ position: "relative" }}>
        <Whale size={tall ? 400 : 420} mood="shock" />
        <div style={{ position: "absolute", top: tall ? -90 : -100, left: tall ? 90 : 100, fontFamily: FONT, fontSize: tall ? 120 : 130, fontWeight: 900, color: S.gold }}>？！</div>
      </div>
    </div>
  </AbsoluteFill>
);
