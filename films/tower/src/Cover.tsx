import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Cam } from "./geo/cam";
import { poi } from "./geo/data";
import { MapView } from "./geo/MapView";
import { FONT, K, SERIF } from "./theme";

// Covers (STYLE.md 二): paper brand bar on top, the first frame's sentence as the title, one main picture drawn for
// the cover: 深圳能源大厦 big, at night, in its real street block (OSM), its outline in the film's orange.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const HERO = poi("深圳能源大厦");

const Picture: React.FC<{ ox: number; oy: number; z: number }> = ({ ox, oy, z }) => {
  const cam: Cam = { x: HERO.x - 20, y: HERO.y + 10, z, bearing: -38, tilt: 70, ox, oy };
  return (
    <MapView
      cam={cam}
      layers={{ roads: 0.5, metro: 0.5, bldg: 0.7, bldgH: 1, night: 1, hero: 1, heroLook: "night", lit: (_b, i) => ((i * 7919) % 100 < 55 ? 0.8 : 0.15) }}
      labels={[]}
    />
  );
};

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      {tall ? (
        <div style={{ position: "absolute", left: -420, top: H - 1080, width: 1920, height: 1080 }}>
          <Picture ox={980} oy={1040} z={2.7} />
        </div>
      ) : (
        <Picture ox={1320} oy={990} z={2.45} />
      )}
      <AbsoluteFill
        style={{
          background: tall
            ? "linear-gradient(180deg, #07090b 0%, #07090b 40%, rgba(7,9,11,0.55) 60%, rgba(7,9,11,0) 75%)"
            : "linear-gradient(90deg, #07090b 0%, rgba(7,9,11,0.92) 38%, rgba(7,9,11,0.2) 62%, rgba(7,9,11,0) 75%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: tall ? 70 : 100,
          top: tall ? bar + 90 : bar + 190,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: tall ? 132 : 140,
          lineHeight: 1.16,
          color: K.fg,
          letterSpacing: -3,
        }}
      >
        深圳的高楼，
        <br />
        <span style={{ color: K.theme }}>不是盖来</span>
        <br />
        <span style={{ color: K.theme }}>收租的</span>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
