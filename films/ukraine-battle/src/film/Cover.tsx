import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { engine } from "../world/engine";
import { useWorldReady, World } from "../world/World";
import { FONT, K, SERIF } from "../theme";
import { stateAt } from "./state";

// Cover: one plain sentence + the thermal shot of the column stopped in the lane. Brand bar on top.
export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const ready = useWorldReady();
  const w = tall ? 1080 : 1920;
  const h = tall ? 1440 : 1080;
  if (!ready) return <AbsoluteFill style={{ background: "#05070a" }}><World s={null} /></AbsoluteFill>;
  const s = stateAt(138.6);
  const g = engine().heightAt(1000, 7360);
  s.cam = { x: 1000, y: 7360, h: g * s.exag + 2, dist: 240, yaw: 300, pitch: 54, fov: 34, oy: tall ? 470 : 380 };
  s.grain = 0.02;
  return (
    <AbsoluteFill style={{ background: "#05070a", width: w, height: h, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: tall ? `translate(${(w - 1920 * (h / 1080)) / 2}px, 0) scale(${h / 1080})` : undefined }}>
        <World s={s} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,7,10,0.92) 0%, rgba(5,7,10,0.2) 34%, rgba(5,7,10,0.1) 60%, rgba(5,7,10,0.85) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: tall ? 96 : 84, display: "flex", alignItems: "center", gap: 16, paddingLeft: 44, background: "rgba(5,7,10,0.6)" }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 48, height: 48 }} />
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 32, color: K.fg, letterSpacing: 3 }}>世界的形状</span>
      </div>
      <div style={{ position: "absolute", left: tall ? 64 : 110, right: tall ? 64 : 110, bottom: tall ? 110 : 96, fontFamily: FONT, color: K.fg, textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>
        <div style={{ fontSize: tall ? 92 : 112, fontWeight: 900, lineHeight: 1.15 }}>
          现代战争，
          {tall ? <br /> : null}
          到底是怎么打的？
        </div>
        <div style={{ marginTop: 22, fontSize: tall ? 40 : 44, fontWeight: 700, color: K.ruHi }}>计划 1 天穿过的一片田，打了 12 周</div>
      </div>
    </AbsoluteFill>
  );
};
