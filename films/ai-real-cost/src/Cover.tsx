import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Spark, Whale } from "./art";
import { FONT, K } from "./theme3";

// Release covers for press.shapeof.world: A = the opening claim, B = the price drop.
// 4:3 (1440×1080) for B站 / 抖音 / 视频号, 16:9 (1920×1080) for YouTube.

const Bg: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 25% 30%, ${K.claude}55 0%, transparent 45%), radial-gradient(circle at 80% 70%, ${K.deepseek}50 0%, transparent 45%), radial-gradient(circle at 50% 100%, ${K.green}30 0%, transparent 50%), ${K.bg}`,
    }}
  >
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.06 }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
  </AbsoluteFill>
);

export const CoverA: React.FC<{ wide: boolean }> = ({ wide }) => (
  <AbsoluteFill style={{ fontFamily: FONT, color: K.fg, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
    <Bg />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginTop: -60 }}>
      <div style={{ fontSize: wide ? 150 : 136, fontWeight: 900, letterSpacing: -3, lineHeight: 1.1, whiteSpace: "nowrap" }}>
        全球<span style={{ color: K.claudeHi }}>最聪明</span>的 AI
      </div>
      <div style={{ fontSize: wide ? 176 : 150, fontWeight: 900, letterSpacing: -4, lineHeight: 1.1, whiteSpace: "nowrap", textShadow: `0 0 60px ${K.green}55` }}>
        比 <span style={{ color: K.deepseekHi }}>DeepSeek</span>
        {wide ? " " : <br />}还<span style={{ color: K.green }}>便宜</span>
      </div>
    </div>
    <div style={{ position: "absolute", left: wide ? 70 : 50, bottom: 50 }}>
      <Spark size={wide ? 190 : 170} mood="smug" />
    </div>
    <div style={{ position: "absolute", right: wide ? 70 : 50, bottom: 50 }}>
      <Whale size={wide ? 220 : 200} mood="shock" />
    </div>
  </AbsoluteFill>
);

export const CoverB: React.FC<{ wide: boolean }> = ({ wide }) => (
  <AbsoluteFill style={{ fontFamily: FONT, color: K.fg, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
    <Bg />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: wide ? 84 : 76, fontWeight: 900, whiteSpace: "nowrap" }}>最贵的 AI，包月用满后</div>
      <div style={{ fontSize: wide ? 260 : 220, fontWeight: 900, letterSpacing: -8, lineHeight: 1.05, whiteSpace: "nowrap" }}>
        <span style={{ color: K.red, textDecoration: "line-through", textDecorationThickness: 14 }}>$20</span>
        <span style={{ color: K.muted }}> → </span>
        <span style={{ color: K.green }}>$0.56</span>
      </div>
      <div style={{ fontSize: wide ? 64 : 58, fontWeight: 900, whiteSpace: "nowrap" }}>
        比 <span style={{ color: K.deepseekHi }}>DeepSeek</span> 还便宜
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: K.muted, marginTop: 14 }}>每百万 token 输出价</div>
    </div>
  </AbsoluteFill>
);
