import React from "react";
import { FONT, K } from "../theme";

// A dark wash on the left so text reads over the map.
export const Scrim: React.FC<{ w?: number }> = ({ w = 900 }) => (
  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w, background: "linear-gradient(90deg, rgba(7,9,11,0.92) 0%, rgba(7,9,11,0.75) 55%, rgba(7,9,11,0) 100%)" }} />
);

export const Txt: React.FC<{ size?: number; color?: string; w?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ size = 40, color = K.fg, w = 700, children, style }) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: w, color, whiteSpace: "nowrap", lineHeight: 1.3, ...style }}>{children}</div>
);

