// Covers for ep1 v22, printed on the film's dark sheet: the hook (贵 17 倍，为什么反而最便宜？) and the film's own
// correction, the per-task price struck in red and the plan price stamped in gold. tall = 3:4, otherwise 4:3 / 16:9.
import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { useFonts } from "../v15/kit";
import { FAINT, FONT, GOLD, INK, MONO, MUTE, RED, rgba } from "../v20/kit";

const TXT = "世界的形状AI 智力榜刚换了新考卷贵 17 倍的，为什么反而最便宜？做一道难题按量付钱包月用满¥67.41.14的真实价格第 1 集标价";

export const Cover22: React.FC = () => {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  useFonts([`900 200px ${FONT}`, `700 60px ${MONO}`, `700 40px ${FONT}`], TXT);
  const u = Math.min(width, height) / 1200; // 1 at 1200 px on the short side
  const pad = 90 * u;
  return (
    <AbsoluteFill style={{ background: "#05070c" }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("paper19.png")})`, backgroundSize: `${1024 * u}px ${1024 * u}px` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 65% at 40% 42%, rgba(255,226,180,0.10), rgba(0,0,0,0) 70%)", mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 95% 90% at 50% 50%, rgba(0,0,0,0) 45%, rgba(2,3,6,0.7) 100%)" }} />

      <div style={{ position: "absolute", left: pad, top: pad * 0.8, display: "flex", alignItems: "center", gap: 16 * u }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 60 * u, height: 60 * u }} />
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36 * u, color: INK, letterSpacing: "0.06em" }}>世界的形状</span>
      </div>

      <div style={{ position: "absolute", left: pad, top: tall ? 250 * u : 210 * u, right: pad }}>
        <div style={{ display: "inline-block", fontFamily: FONT, fontWeight: 900, fontSize: 46 * u, color: RED, border: `${5 * u}px solid ${RED}`, borderRadius: 8 * u, padding: `${4 * u}px ${20 * u}px`, transform: "rotate(-3deg)", boxShadow: `0 0 ${24 * u}px ${rgba(RED, 0.2)}` }}>
          AI 智力榜刚换了新考卷
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: (tall ? 150 : 124) * u, lineHeight: 1.15, color: INK, marginTop: 40 * u }}>
          贵 <span style={{ color: GOLD }}>17 倍</span>的 AI，
          <br />
          为什么反而
          <br />
          <span style={{ color: GOLD, fontSize: (tall ? 210 : 164) * u, textShadow: `0 0 ${50 * u}px ${rgba(GOLD, 0.3)}` }}>最便宜？</span>
        </div>
      </div>

      {/* the film's correction: per-task price struck, plan price in gold */}
      <div style={{ position: "absolute", ...(tall ? { left: pad, bottom: 250 * u } : { right: pad, bottom: 200 * u }), textAlign: tall ? "left" : "right" }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30 * u, color: MUTE, letterSpacing: "0.04em" }}>做一道难题</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 40 * u, justifyContent: tall ? "flex-start" : "flex-end", marginTop: 10 * u }}>
          <span style={{ position: "relative", fontFamily: MONO, fontWeight: 700, fontSize: (tall ? 96 : 84) * u, color: MUTE }}>
            ¥67.4
            <span style={{ position: "absolute", left: "-6%", width: "112%", top: "48%", height: 16 * u, borderRadius: 8 * u, background: RED, transform: "rotate(-4deg)", boxShadow: `0 0 ${16 * u}px ${rgba(RED, 0.35)}` }} />
          </span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: (tall ? 150 : 132) * u, color: GOLD, textShadow: `0 0 ${40 * u}px ${rgba(GOLD, 0.3)}` }}>¥1.14</span>
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26 * u, color: FAINT, marginTop: 6 * u }}>按量付钱 → 包月用满</div>
      </div>

      <div style={{ position: "absolute", left: pad, right: pad, bottom: pad * 0.9, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 52 * u, color: INK }}>
          AI 的<span style={{ color: MUTE, textDecoration: "line-through", textDecorationColor: RED, textDecorationThickness: 6 * u }}>标价</span>
          <span style={{ color: GOLD }}>真实价格</span>
        </span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32 * u, color: MUTE }}>第 1 集</span>
      </div>
    </AbsoluteFill>
  );
};
