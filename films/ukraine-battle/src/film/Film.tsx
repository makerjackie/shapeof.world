import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, FPS } from "../kit";
import { FONT, K } from "../theme";
import { useWorldReady, World } from "../world/World";
import { engine } from "../world/engine";
import { Captions, Graphics, MapLabels, Notes, OSD } from "./overlay";
import { stateAt } from "./state";
import { CARD_AT, SOURCES_AT } from "./text";

const SOURCES = [
  "战场与打法：RUSI《Preliminary Lessons from Ukraine's Offensive Operations, 2022–23》（2024-07）、《Stormbreak》（2023-09）、《Meatgrinder》（2023-05）；Kofman & Lee，War on the Rocks（2023-09）",
  "计划与经过：《华盛顿邮报》（2023-12-04）；ISW 每日评估（2023-06-08、08-28；2024-07-28；2026-10-16）；扎卢日内，《经济学人》（2023-11-01）",
  "控制面积：DeepState（2022-11、2026-01-01）；ISW；哈尔科夫反攻：《金融时报》（2022-09）",
  "无人机时代：RUSI（2025-02）；俄国防部《军事医学杂志》（2025-03，经 iStories）；NPR（2026-10-05）；FPRI（2026-06）；Current Time（2026-02-08）",
  "士兵的话：CNN（2023-09）、RTVI（2024-04-13）、《基辅独立报》（2025-12-10）、俄新社（2026-05-13）、The Moscow Times（2026-05-21）",
  "地形 Copernicus DEM（© DLR / Airbus）· 影像 Copernicus Sentinel-2（2021、2023）· OpenStreetMap 贡献者 · Natural Earth",
  "控制区、战线和防线位置为示意；车辆、人和交战过程为三维复原示意，不是实拍",
];

const Sources: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.min(1, Math.max(0, (t - SOURCES_AT) / 0.4), Math.max(0, (CARD_AT + 0.3 - t) / 0.3));
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ background: "#05070a", opacity: o }}>
      <div style={{ position: "absolute", left: 130, top: 120, right: 130, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 30, letterSpacing: 2 }}>信息来源</div>
        {SOURCES.map((r, i) => (
          <div key={i} style={{ fontSize: 25, fontWeight: 500, color: "rgba(242,239,232,0.82)", lineHeight: 1.65, marginBottom: 10 }}>
            {r}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useWorldReady();
  if (!ready) return <AbsoluteFill style={{ background: "#05070a" }}><World s={null} /></AbsoluteFill>;
  const s = stateAt(t);
  // keep field-scale cameras looking at the real ground (terrain × exaggeration)
  if (s.field > 0.5 && s.cam.dist < 80000) {
    const g = engine().heightAt(s.cam.x, s.cam.y);
    if (g > 0) s.cam = { ...s.cam, h: g * s.exag + 2 };
  }
  return (
    <AbsoluteFill style={{ background: "#05070a" }}>
      <World s={s} />
      <MapLabels t={t} s={s} />
      <Graphics t={t} s={s} />
      <OSD t={t} s={s} />
      <Captions t={t} />
      <Notes t={t} />
      <BrandMark o={t < CARD_AT ? 1 : 0} />
      <Sources t={t} />
      <EndCard at={CARD_AT} />
      {process.env.NO_AUDIO ? null : <Audio src={staticFile("mix.wav")} />}
    </AbsoluteFill>
  );
};
