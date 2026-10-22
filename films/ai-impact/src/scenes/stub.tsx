import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, K } from "../theme";

// Placeholder for scenes not built yet (style-frame stage only).
export const stub = (title: string): React.FC => {
  const S: React.FC = () => (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.dim }}>{title}（待做）</div>
    </AbsoluteFill>
  );
  return S;
};
