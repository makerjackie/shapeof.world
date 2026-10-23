import React from "react";
import { EBACK, progOf, Sfx, useBeat } from "../kit";
import { K, SANS, SERIF } from "../theme";
import { Who } from "./paper";

// The main prop folded into one strip: who sets the question, who answers, who grades, for this example.
export const Triad: React.FC<{ at: number; x: number; y: number; q: string; a: string; g: string; scale?: number }> = ({ at, x, y, q, a, g, scale = 1 }) => {
  const b = useBeat();
  const cells: [string, "人" | "AI", string][] = [
    ["题", "人", q],
    ["答", "AI", a],
    ["阅", "人", g],
  ];
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", gap: 12, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
      {cells.map(([k, who, label], i) => {
        const p = progOf(b, at + i * 0.5, 0.5, EBACK);
        const ai = who === "AI";
        return (
          <div
            key={k}
            style={{
              opacity: Math.min(1, p * 2),
              transform: `translateY(${(1 - p) * 30}px) rotate(${(i - 1) * 1.2}deg)`,
              background: ai ? "#efeafd" : K.paper,
              border: `2px solid ${ai ? K.ai : K.ink}`,
              borderRadius: 8,
              padding: "10px 18px 12px",
              minWidth: 150,
              boxShadow: "0 8px 20px rgba(70,45,15,0.16)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 34, color: ai ? K.ai : K.ink }}>{k}</span>
              <Who who={who} size={18} />
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: K.ink, marginTop: 4, whiteSpace: "nowrap" }}>{label}</div>
          </div>
        );
      })}
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={at + i * 0.5} id="sfx-foley-02" vol={0.22} rate={1 + i * 0.08} />
      ))}
    </div>
  );
};
