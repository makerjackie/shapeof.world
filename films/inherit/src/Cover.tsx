// Covers: the question in plain words beside the film's own picture — Rockefeller at the top of a seven-generation
// family tree whose gold leaf thins row by row while the warm inner light (standing) stays on. Brand bar on top.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONT, K, SERIF } from "./theme";
import { Paper, Portrait, Tree, buildTree } from "./world";
import type { Node } from "./world";

// two candidate cover lines: A answers (三代 vs 三百年), B asks (the film's title)
type Seg = { t: string; gold?: boolean };
const TEXTS: Record<"A" | "B", Seg[][]> = {
  A: [[{ t: "钱" }, { t: "三代", gold: true }, { t: "就散，" }], [{ t: "地位" }, { t: "三百年", gold: true }, { t: "才散" }]],
  B: [[{ t: "富不过三代，" }], [{ t: "是" }, { t: "真的", gold: true }, { t: "吗？" }]],
};

const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: "#efe6d2", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: "#1d160e", letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: "#1d160e", letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

// seven generations; gold on the first three rows, then it thins to nothing; the inner light stays on every row
const COUNTS = [1, 3, 5, 8, 11, 14, 17];
const SPREAD = [0, 220, 380, 560, 720, 860, 980];
const gold = (n: Node) => [1, 1, 0.85, 0.35, 0.1, 0, 0][n.row];
const light = (n: Node) => (n.row < 3 ? 0.25 : 0.42);

const Picture: React.FC<{ cx: number; top: number; s: number; labelsLeft?: boolean }> = ({ cx, top, s, labelsLeft = false }) => {
  const nodes = buildTree(960, 0, 92, COUNTS, SPREAD);
  return (
    <div style={{ position: "absolute", left: cx - 960 * s, top, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: "0 0" }}>
      <div style={{ position: "absolute", left: 0, top: 150 }}>
        <Tree id="cover" t={0} nodes={nodes} grow={() => 1} gold={gold} light={light} r={(n) => (n.row === 0 ? 24 : 15 - n.row)} />
      </div>
      <Portrait src="img/rock.jpg" x={960} y={60} r={118} o={1} />
      {/* generation labels */}
      {[
        { row: 0, lab: "第一代" },
        { row: 3, lab: "第四代" },
        { row: 6, lab: "第七代" },
      ].map((g) => (
        <div key={g.row} style={{ position: "absolute", left: labelsLeft && g.row ? 960 - SPREAD[g.row] / 2 - 34 - 130 : 960 + SPREAD[g.row] / 2 + (g.row ? 34 : 150), top: 150 + g.row * 92 - 26, fontFamily: SERIF, fontWeight: 900, fontSize: 40,
          color: g.row < 3 ? K.gold : K.ashHi, whiteSpace: "nowrap", textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}>{g.lab}</div>
      ))}
    </div>
  );
};

export const Cover: React.FC<{ w: number; h: number; v: "A" | "B" }> = ({ w, h, v }) => {
  const bar = Math.round(h * 0.06);
  const tall = h > w;
  const wide = w / h > 1.5;
  // 16:9: words left, picture right. 4:3 and 3:4: words centred (platforms centre-crop these to 3:4 or 16:9),
  // Rockefeller and the tree below them.
  const text = tall ? { top: 470, size: 150 } : wide ? { top: bar + 250, size: 150 } : { top: 190, size: 120 };
  const pic = tall ? { cx: w / 2, top: 939, s: 0.68 } : wide ? { cx: 1300, top: bar + 150, s: 0.92 } : { cx: w / 2, top: 567, s: 0.55 };
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <Paper />
      <Picture {...pic} />
      {wide ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(11,9,7,0.9) 0%, rgba(11,9,7,0.6) 38%, rgba(11,9,7,0) 55%)" }} /> : null}
      <div style={{ position: "absolute", left: wide ? 110 : 0, right: wide ? undefined : 0, top: text.top, textAlign: wide ? "left" : "center", fontFamily: SERIF, fontWeight: 900, color: K.fg,
        lineHeight: 1.12, letterSpacing: 2, textShadow: "0 6px 34px rgba(0,0,0,0.85)" }}>
        {TEXTS[v].map((line, i) => (
          <div key={i} style={{ fontSize: v === "A" ? text.size * 0.86 : text.size, whiteSpace: "nowrap" }}>
            {line.map((sg, j) => (
              <span key={j} style={{ color: sg.gold ? K.gold : undefined }}>{sg.t}</span>
            ))}
          </div>
        ))}
      </div>
      <Bar h={bar} w={w} />
      <span style={{ display: "none", fontFamily: FONT }} />
    </AbsoluteFill>
  );
};
