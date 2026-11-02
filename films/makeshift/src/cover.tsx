// Covers: a brand bar on top; one cell, MARCH1 typed and turned red into 1-Mar; the question in plain words.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { HAN, K, NUM, SERIF } from "./theme";

const Cellshot: React.FC<{ w: number }> = ({ w }) => {
  const h = w * 0.2;
  return (
    <div style={{ position: "relative", width: w, height: h * 2.2 }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h * 2.2, background: K.paper, boxShadow: "0 0 200px 60px rgba(214,236,222,0.10), 0 40px 100px rgba(0,0,0,0.7)", backgroundImage: `repeating-linear-gradient(180deg, transparent 0, transparent ${h * 1.1 - 2}px, ${K.grid} ${h * 1.1 - 2}px, ${K.grid} ${h * 1.1}px)` }} />
      <div style={{ position: "absolute", left: w * 0.06, top: h * 0.12, fontFamily: NUM, fontWeight: 700, fontSize: h * 0.42, color: "#9aa09b", textDecoration: "line-through" }}>MARCH1</div>
      <div style={{ position: "absolute", left: w * 0.04, top: h * 1.1 + h * 0.05, width: w * 0.92, height: h, background: "rgba(255,77,77,0.22)", border: `${h * 0.05}px solid ${K.green}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: w * 0.05, fontFamily: NUM, fontWeight: 800, fontSize: h * 0.62, color: "#d22b2b" }}>
        1-Mar
      </div>
      <div style={{ position: "absolute", left: w * 0.06, top: h * 2.25, fontFamily: HAN, fontWeight: 700, fontSize: h * 0.22, color: "rgba(244,240,232,0.75)" }}>一个人类基因，被 Excel 改成了日期</div>
    </div>
  );
};

const Bar: React.FC<{ s: number }> = ({ s }) => (
  <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 96 * s, display: "flex", alignItems: "center", gap: 16 * s, paddingLeft: 48 * s, background: "rgba(0,0,0,0.35)" }}>
    <Img src={staticFile("mark-disc.png")} style={{ width: 52 * s, height: 52 * s }} />
    <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34 * s, color: K.fg, letterSpacing: 3 * s }}>世界的形状</span>
  </div>
);

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 55%, #171a1e 0%, #0a0b0d 60%, #050607 100%)" }}>
    <Bar s={tall ? 1.1 : 1} />
    {tall ? (
      <>
        <div style={{ position: "absolute", left: 70, top: 200, fontFamily: SERIF, fontWeight: 900, fontSize: 132, lineHeight: 1.18, color: K.fg }}>
          社会真是个
          <br />
          <span style={{ color: K.tape }}>草台班子</span>？
        </div>
        <div style={{ position: "absolute", left: 120, top: 760 }}>
          <Cellshot w={840} />
        </div>
      </>
    ) : (
      <>
        <div style={{ position: "absolute", left: 100, top: 300, fontFamily: SERIF, fontWeight: 900, fontSize: 132, lineHeight: 1.2, color: K.fg }}>
          社会真是个
          <br />
          <span style={{ color: K.tape }}>草台班子</span>？
        </div>
        <div style={{ position: "absolute", left: 1060, top: 330 }}>
          <Cellshot w={760} />
        </div>
      </>
    )}
  </AbsoluteFill>
);
