// The one world of the film: a spreadsheet glowing in a dark room. A Paper is a sheet in world units (column letters,
// row numbers, the grid); cells are placed on it with Cell. The camera is a CSS transform on the whole world (World),
// so type stays crisp. Screen-space chrome (title bar, formula bar, sheet tabs) is drawn by Chrome and Tabs.
import React from "react";
import { clamp01, EO, ramp, useT } from "./kit";
import { Cam } from "./cam";
import { FONT, HAN, K, MONO, NUM } from "./theme";

export const RH = 64; // row-number column width
export const CH = 40; // column-letter row height

export const World: React.FC<{ cam: Cam; children: React.ReactNode; o?: number; tilt?: number }> = ({ cam, children, o = 1, tilt = 0 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", inset: 0, opacity: o, perspective: 2400, perspectiveOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformOrigin: "0 0", transform: `translate(960px, 540px) rotateX(${tilt}deg) scale(${cam.z}) translate(${-cam.cx}px, ${-cam.cy}px)` }}>
        {children}
      </div>
    </div>
  );

const letters = (i: number) => {
  let s = "";
  i += 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};

// Cell rectangle (world units, relative to the paper's origin) for column c, row r (both 0-based, data area).
export const cellXY = (c: number, r: number, cw: number, ch: number, widths?: number[]) => {
  let x = RH;
  for (let i = 0; i < c; i++) x += widths ? widths[i] : cw;
  return { x, y: CH + r * ch, w: widths ? widths[c] : cw, h: ch };
};

export type PaperProps = {
  x: number;
  y: number;
  cols: number;
  rows: number;
  cw?: number;
  ch?: number;
  widths?: number[];
  row0?: number; // the number printed on the first row
  rowLabel?: (i: number) => string;
  glow?: number; // the light the sheet throws into the room (0..1)
  dim?: number; // 0..1 darkens the paper (lights going down)
  head?: boolean;
  selCol?: number;
  selRow?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export const paperSize = (p: { cols: number; rows: number; cw?: number; ch?: number; widths?: number[] }) => {
  const cw = p.cw ?? 200;
  const ch = p.ch ?? 52;
  const w = RH + (p.widths ? p.widths.reduce((a, b) => a + b, 0) : p.cols * cw);
  return { w, h: CH + p.rows * ch, cw, ch };
};

export const Paper: React.FC<PaperProps> = ({ x, y, cols, rows, cw = 200, ch = 52, widths, row0 = 1, rowLabel, glow = 1, dim = 0, head = true, selCol, selRow, children, style }) => {
  const { w, h } = paperSize({ cols, rows, cw, ch, widths });
  const colX: number[] = [];
  let acc = RH;
  for (let i = 0; i < cols; i++) {
    colX.push(acc);
    acc += widths ? widths[i] : cw;
  }
  const vlines = colX.map((cx) => `linear-gradient(90deg, transparent ${cx - 1}px, ${K.grid} ${cx - 1}px, ${K.grid} ${cx}px, transparent ${cx}px)`);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: K.paper,
        boxShadow: glow > 0 ? `0 0 ${160}px ${40}px rgba(214,236,222,${0.07 * glow}), 0 0 ${600}px ${200}px rgba(200,225,210,${0.05 * glow}), 0 30px 80px rgba(0,0,0,0.6)` : "0 30px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* grid */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: CH,
          width: w,
          height: h - CH,
          backgroundImage: [`repeating-linear-gradient(180deg, transparent 0, transparent ${ch - 1}px, ${K.grid} ${ch - 1}px, ${K.grid} ${ch}px)`, ...vlines].join(","),
        }}
      />
      {head ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: w, height: CH, background: K.head, borderBottom: `1px solid #cfd3cd` }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: RH, height: h, background: K.head, borderRight: `1px solid #cfd3cd` }} />
          {colX.map((cx, i) => {
            const cwi = widths ? widths[i] : cw;
            const on = selCol === i;
            return (
              <div key={i} style={{ position: "absolute", left: cx, top: 0, width: cwi, height: CH, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: NUM, fontWeight: on ? 700 : 500, fontSize: 19, color: on ? K.green : K.headText, background: on ? "#dbeee2" : undefined, borderRight: "1px solid #d6d9d3", borderBottom: on ? `3px solid ${K.green}` : undefined, boxSizing: "border-box" }}>
                {letters(i)}
              </div>
            );
          })}
          {Array.from({ length: rows }, (_, r) => {
            const on = selRow === r;
            return (
              <div key={r} style={{ position: "absolute", left: 0, top: CH + r * ch, width: RH, height: ch, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: NUM, fontWeight: on ? 700 : 500, fontSize: Math.min(19, ch * 0.4), color: on ? K.green : K.headText, background: on ? "#dbeee2" : undefined, borderBottom: "1px solid #d6d9d3", borderRight: on ? `3px solid ${K.green}` : undefined, boxSizing: "border-box", whiteSpace: "nowrap" }}>
                {rowLabel ? rowLabel(r) : row0 + r}
              </div>
            );
          })}
        </>
      ) : null}
      {children}
      {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(7,8,10,${dim})` }} /> : null}
    </div>
  );
};

// A cell's content. Position by column/row on the paper it sits in.
export const Cell: React.FC<{
  c: number;
  r: number;
  cw?: number;
  ch?: number;
  widths?: number[];
  text?: React.ReactNode;
  align?: "left" | "right" | "center";
  color?: string;
  bg?: string;
  size?: number;
  weight?: number;
  mono?: boolean;
  border?: string;
  o?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ c, r, cw = 200, ch = 52, widths, text, align = "left", color = K.ink, bg, size, weight = 500, mono, border, o = 1, style, children }) => {
  if (o <= 0) return null;
  const b = cellXY(c, r, cw, ch, widths);
  return (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w - 1,
        height: b.h - 1,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        padding: "0 12px",
        boxSizing: "border-box",
        fontFamily: mono ? MONO : FONT,
        fontSize: size ?? ch * 0.46,
        fontWeight: weight,
        color,
        whiteSpace: "nowrap",
        overflow: "visible",
        opacity: o,
        outline: border,
        ...style,
      }}
    >
      {text}
      {children}
    </div>
  );
};

// Excel's green selection rectangle with the fill handle.
export const Sel: React.FC<{ x: number; y: number; w: number; h: number; color?: string; o?: number; width?: number }> = ({ x, y, w, h, color = K.green, o = 1, width = 3 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x - width / 2, top: y - width / 2, width: w + width, height: h + width, border: `${width}px solid ${color}`, boxSizing: "border-box", opacity: o, pointerEvents: "none" }}>
      <div style={{ position: "absolute", right: -width * 2, bottom: -width * 2, width: width * 3, height: width * 3, background: color, border: `1px solid ${K.paper}` }} />
    </div>
  );

// A typing caret inside a cell.
export const Caret: React.FC<{ t: number; h: number; color?: string }> = ({ t, h, color = K.ink }) => (
  <span style={{ display: "inline-block", width: Math.max(2, h * 0.05), height: h * 0.6, background: color, marginLeft: 3, verticalAlign: "middle", opacity: Math.floor(t * 2.2) % 2 === 0 ? 1 : 0 }} />
);

// Type a string out from time a at cps characters a second.
export const typed = (s: string, t: number, a: number, cps = 14) => Array.from(s).slice(0, Math.max(0, Math.floor((t - a) * cps))).join("");

// A tiny sheet: a paper thumbnail for walls of tables. `red` marks some cells red (0..1 reveals them).
export const Tile: React.FC<{ x: number; y: number; w: number; h: number; red?: number; seed?: number; o?: number; lit?: number }> = ({ x, y, w, h, red = 0, seed = 0, o = 1, lit = 1 }) => {
  if (o <= 0) return null;
  const rnd = (k: number) => {
    const v = Math.sin((seed + 1) * 9301 + k * 49297) * 233280;
    return v - Math.floor(v);
  };
  const rows = 10;
  const cols = 4;
  const reds = red > 0 ? [0, 1, 2].map((k) => ({ c: Math.floor(rnd(k) * cols), r: 2 + Math.floor(rnd(k + 7) * (rows - 3)) })) : [];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: K.paper, opacity: o, overflow: "hidden", boxShadow: `0 0 ${w * 0.25}px rgba(214,236,222,${0.12 * lit})` }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h / rows, background: K.head }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: w / 12, height: h, background: K.head }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(180deg, transparent 0, transparent ${h / rows - 1}px, ${K.grid} ${h / rows - 1}px, ${K.grid} ${h / rows}px), repeating-linear-gradient(90deg, transparent 0, transparent ${w / cols - 1}px, ${K.grid} ${w / cols - 1}px, ${K.grid} ${w / cols}px)`,
        }}
      />
      {/* faux content: short grey bars in cells */}
      {Array.from({ length: rows - 2 }, (_, r) =>
        Array.from({ length: cols - 1 }, (_, c) => (
          <div key={`${r}-${c}`} style={{ position: "absolute", left: (c + 0.25) * (w / cols) + w / 12, top: (r + 1.35) * (h / rows), width: (w / cols) * (0.35 + 0.4 * rnd(r * 7 + c)), height: (h / rows) * 0.32, background: "#b9beb8", opacity: 0.55 }} />
        )),
      )}
      {reds.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: p.c * (w / cols) + w / 12, top: p.r * (h / rows), width: w / cols, height: h / rows, background: K.err, opacity: clamp01(red * 3 - i) }} />
      ))}
    </div>
  );
};

// Screen-space window chrome: title bar with the file name, the formula bar. o fades it all.
export const Chrome: React.FC<{ o: number; name: string; formula: React.ReactNode; file?: string }> = ({ o, name, formula, file = "社会真的是草台班子吗.xlsx" }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, opacity: o }}>
      <div style={{ height: 112, background: "#0b0c0e" }} />
      <div style={{ height: 44, background: "linear-gradient(180deg, #1d6b43, #185c39)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 2px 0 rgba(0,0,0,0.25)" }}>
        <div style={{ position: "absolute", left: 1720, display: "flex", gap: 30 }}>
          {["—", "▢", "✕"].map((g, i) => (
            <span key={i} style={{ fontFamily: NUM, fontSize: 18, color: "rgba(255,255,255,0.8)" }}>
              {g}
            </span>
          ))}
        </div>
        <span style={{ fontFamily: HAN, fontWeight: 700, fontSize: 27, color: "#fff", letterSpacing: 1 }}>{file}</span>
      </div>
      <div style={{ height: 46, background: "#f6f7f4", borderBottom: "1px solid #cfd3cd", display: "flex", alignItems: "center", fontFamily: NUM, fontSize: 21, color: K.ink }}>
        <div style={{ width: 120, height: 32, marginLeft: 12, border: "1px solid #c6cbc4", background: "#fff", display: "flex", alignItems: "center", paddingLeft: 10, boxSizing: "border-box", fontWeight: 600 }}>{name}</div>
        <span style={{ margin: "0 18px", fontStyle: "italic", fontFamily: "Georgia, serif", color: "#6b716c", fontSize: 22 }}>fx</span>
        <div style={{ flex: 1, height: 32, marginRight: 12, border: "1px solid #c6cbc4", background: "#fff", display: "flex", alignItems: "center", paddingLeft: 12, boxSizing: "border-box", fontFamily: FONT }}>{formula}</div>
      </div>
    </div>
  );

// The workbook's sheet tabs along the bottom: the film's chapters. `active` index; `extra` reveals a last tab.
export const TABS = ["基因", "病例", "台前", "xz", "护士的一个班", "飞行"];
export const Tabs: React.FC<{ o: number; active: number; reveal: number }> = ({ o, active, reveal }) => {
  const t = useT();
  if (o <= 0) return null;
  const n = Math.min(TABS.length, Math.max(1, Math.floor(reveal)));
  return (
    <div style={{ position: "absolute", left: 0, top: 1080 - 46, width: 1920, height: 46, background: "rgba(16,18,20,0.92)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "flex-start", paddingLeft: 120, opacity: o }}>
      <span style={{ position: "absolute", left: 30, top: 8, fontFamily: NUM, fontSize: 20, color: "rgba(255,255,255,0.4)" }}>◀ ▶</span>
      {TABS.slice(0, n).map((name, i) => {
        const on = i === active;
        const k = i === n - 1 ? ramp(reveal - (n - 1), 0, 0.6, EO) : 1;
        return (
          <div
            key={name}
            style={{
              height: 38,
              padding: "0 26px",
              display: "flex",
              alignItems: "center",
              fontFamily: HAN,
              fontSize: 20,
              fontWeight: on ? 800 : 500,
              color: on ? K.green : "rgba(244,240,232,0.55)",
              background: on ? K.paper : "transparent",
              borderBottom: on ? `4px solid ${K.green}` : "4px solid transparent",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              opacity: k,
              transform: `translateY(${(1 - k) * 12}px)`,
              boxSizing: "border-box",
            }}
          >
            {name}
          </div>
        );
      })}
      <span style={{ marginLeft: 18, marginTop: 4, fontFamily: NUM, fontSize: 26, color: "rgba(255,255,255,0.45)", opacity: 0.5 + 0.5 * (Math.floor(t * 2) % 2) * 0 }}>＋</span>
    </div>
  );
};

// An Excel note (批注): a pale yellow box in screen space. The film's type sits in these whenever it is over paper.
export const Note: React.FC<{ x: number; y: number; at: number; out: number; w?: number; children: React.ReactNode; tail?: [number, number] }> = ({ x, y, at, out, w, children, tail }) => {
  const t = useT();
  const o = Math.min(clamp01((t - at) / 0.2), clamp01((out - t) / 0.25));
  if (o <= 0) return null;
  const k = ramp(t, at, at + 0.35, EO);
  return (
    <>
      {tail ? (
        <svg style={{ position: "absolute", left: 0, top: 0, opacity: o }} width={1920} height={1080}>
          <line x1={x + 10} y1={y + 10} x2={tail[0]} y2={tail[1]} stroke="#8a7a2a" strokeWidth={2} />
        </svg>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          padding: "26px 36px 28px",
          background: "#fff7c2",
          border: "2px solid #c9b55a",
          boxShadow: "6px 10px 28px rgba(0,0,0,0.35)",
          opacity: o,
          transform: `translateY(${(1 - k) * 14}px) scale(${0.97 + 0.03 * k})`,
          transformOrigin: "0 0",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {children}
      </div>
    </>
  );
};
