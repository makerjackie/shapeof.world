import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { World, useWorldReady } from "../engine/World";
import { Overlay } from "./Overlay";
import { PRE } from "./cut";

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30 - PRE;
  const ok = useWorldReady();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World t={t} ready={ok} />
      {ok && <Overlay t={t} />}
    </AbsoluteFill>
  );
};
