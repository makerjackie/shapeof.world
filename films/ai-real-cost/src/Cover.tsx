import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Spark, Whale } from "./art";
import { FONT, K, SERIF } from "./theme";

// Release covers (films/DIRECTOR.md 三, template: CoverMock.tsx G): paper brand bar, one plain sentence (no numbers),
// and a main picture drawn for the cover: the same job, two bills. Claude holds a stub; DeepSeek is buried in a receipt
// that runs off the printer, down the frame and across the floor.

type Props = { tall: boolean };

const BrandBar: React.FC<{ h: number }> = ({ h }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: h,
      background: K.paper,
      borderBottom: `3px solid ${K.gold}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `0 ${h * 0.6}px`,
      fontFamily: SERIF,
      color: K.ink,
      zIndex: 5,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.74, height: h * 0.74 }} />
      <span style={{ fontSize: h * 0.48, fontWeight: 700, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontSize: h * 0.32, fontWeight: 700, letterSpacing: "0.4em", opacity: 0.7 }}>看见世界如何运行</span>
  </div>
);

const Big: React.FC<{ size: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ size, children, style }) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 900, color: K.fg, lineHeight: 1.06, letterSpacing: -size * 0.03, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.7)", ...style }}>
    {children}
  </div>
);

// A long receipt as a ribbon along an SVG path: paper, then rows of print across it, then a purple block ("your time").
const Ribbon: React.FC<{ d: string; w: number; id: string }> = ({ d, w, id }) => (
  <g>
    <path d={d} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={w + 10} strokeLinecap="butt" transform="translate(10 18)" />
    <path d={d} fill="none" stroke={K.receipt} strokeWidth={w} strokeLinecap="butt" />
    <path d={d} fill="none" stroke="#2a2f2b" strokeOpacity={0.55} strokeWidth={w * 0.62} strokeDasharray="3 15" />
    <path id={id} d={d} fill="none" stroke={K.time} strokeOpacity={0.85} strokeWidth={w * 0.62} strokeDasharray="0 520 900 99999" />
  </g>
);

const Stub: React.FC<{ w: number }> = ({ w }) => (
  <div style={{ width: w, padding: `${w * 0.08}px ${w * 0.09}px`, background: K.receipt, boxShadow: "0 30px 60px rgba(0,0,0,0.6)", transform: "rotate(-8deg)" }}>
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: w * 0.11, color: K.ink, borderBottom: "3px dashed #a59f92", paddingBottom: w * 0.03 }}>CLAUDE</div>
    {[0.8, 0.6, 0.7].map((x, i) => (
      <div key={i} style={{ height: w * 0.035, width: `${x * 100}%`, background: "#2a2f2b", opacity: 0.5, marginTop: w * 0.05, borderRadius: 2 }} />
    ))}
    <div style={{ height: w * 0.12, width: "100%", background: K.time, opacity: 0.85, marginTop: w * 0.06 }} />
  </div>
);

const Printer: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: w * 0.32, borderRadius: w * 0.07, background: "linear-gradient(180deg, #2a2e34, #121417)", boxShadow: "0 20px 50px rgba(0,0,0,0.7)" }}>
    <div style={{ position: "absolute", left: w * 0.08, right: w * 0.08, bottom: w * 0.06, height: w * 0.04, borderRadius: 4, background: "#050607" }} />
    <div style={{ position: "absolute", right: w * 0.08, top: w * 0.08, width: w * 0.05, height: w * 0.05, borderRadius: "50%", background: K.deepseek, boxShadow: `0 0 14px ${K.deepseek}` }} />
  </div>
);

export const Cover: React.FC<Props> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = tall ? 92 : 70;
  // The DeepSeek receipt: from a printer at the top right, down the frame, coiling across the floor to the left.
  const d = tall
    ? `M 860 ${bar + 120} C 860 520, 980 640, 900 820 S 640 1000, 760 1120 S 1020 1260, 760 1330 S 280 1300, 120 1400`
    : `M 1640 ${bar + 120} C 1640 420, 1760 520, 1680 700 S 1400 820, 1500 930 S 1820 1040, 1440 1060 S 760 1000, 520 1090`;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at ${tall ? "55% 70%" : "70% 60%"}, rgba(64,52,40,0.75) 0%, ${K.bg} 70%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.06 }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <Ribbon d={d} w={tall ? 120 : 130} id="rib" />
      </svg>
      <Printer x={tall ? 760 : 1530} y={bar + 40} w={tall ? 220 : 230} />
      <BrandBar h={bar} />
      <div style={{ position: "absolute", left: tall ? 64 : 100, top: tall ? bar + 60 : bar + 70 }}>
        {tall ? (
          <>
            <Big size={168}>最聪明的</Big>
            <Big size={168}>AI，反而</Big>
            <Big size={250} style={{ color: K.green, marginTop: 6 }}>
              最便宜
            </Big>
          </>
        ) : (
          <>
            <Big size={150}>最聪明的 AI，</Big>
            <Big size={210} style={{ marginTop: 12 }}>
              反而<span style={{ color: K.green }}>最便宜</span>
            </Big>
          </>
        )}
      </div>
      {/* Claude: small, smug, holding a stub */}
      <div style={{ position: "absolute", left: tall ? 50 : 120, top: tall ? 860 : 640 }}>
        <Spark t={0.3} size={tall ? 300 : 330} mood="smug" />
      </div>
      <div style={{ position: "absolute", left: tall ? 300 : 430, top: tall ? 980 : 760 }}>
        <Stub w={tall ? 170 : 190} />
      </div>
      {/* DeepSeek: buried under its own bill */}
      <div style={{ position: "absolute", left: tall ? 600 : 1480, top: tall ? 1040 : 730 }}>
        <Whale t={0.3} size={tall ? 400 : 420} mood="shock" />
      </div>
    </AbsoluteFill>
  );
};
