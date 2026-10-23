import React from "react";
import { random } from "remotion";
import { FONT, SERIF } from "../theme";
import { C, clamp01, EBACK, EIO, EO, lerp, pr } from "./kit";

// The film's one prop: growth marks on a door frame (SCRIPT.md, 主道具). A family pencils a child's height on the door
// frame each year; here the frame records how long a task AI can do on its own (METR, 50 % success, in the time a
// human expert needs). Heights are on a doubling scale: each doubling of the task length lifts the mark by STEP px, so
// steady doubling reads as steady growth. 4 minutes sits at knee height, 17 hours near the head, a month above the top.

export const STEP = 66;
export const BASE = 120;
export const markY = (minutes: number) => BASE + STEP * Math.log2(minutes / 4); // height above the floor

export type Mark = { min: number; label: string; at: number; sub?: string; dashed?: boolean };

// The frame: two jambs and a head, warm painted wood on the dark ground, a dark doorway between.
export const Frame: React.FC<{ x: number; floor: number; w: number; h: number; grow: number; jamb?: number; tone?: "warm" | "cool"; light?: number }> = ({
  x,
  floor,
  w,
  h,
  grow,
  jamb = 58,
  tone = "warm",
  light = 0,
}) => {
  const hh = h * pr(grow, 0, 1, EO);
  const head = pr(grow, 0.55, 0.45, EO);
  const wood = tone === "warm" ? ["#c9bda4", "#a89c84"] : ["#9fb0c0", "#7c8b9a"];
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: floor - h, width: w, height: h }}>
      {light > 0 ? (
        <div
          style={{
            position: "absolute",
            left: jamb,
            right: jamb,
            top: jamb,
            bottom: 0,
            background: `linear-gradient(180deg, rgba(255,209,102,${0.55 * light}), rgba(255,209,102,${0.9 * light}))`,
            boxShadow: `0 0 ${120 * light}px rgba(255,209,102,${0.45 * light})`,
          }}
        />
      ) : null}
      {[0, 1].map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: k === 0 ? 0 : w - jamb,
            bottom: 0,
            width: jamb,
            height: hh,
            background: `linear-gradient(90deg, ${wood[1]} 0%, ${wood[0]} 22%, ${wood[0]} 60%, ${wood[1]} 78%, #6f6656 100%)`,
            boxShadow: `inset ${k === 0 ? -6 : 6}px 0 10px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(0,0,0,0.3), 0 30px 60px rgba(0,0,0,0.45)`,
            opacity: 0.92,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: jamb,
          transformOrigin: "50% 50%",
          transform: `scaleX(${head})`,
          background: `linear-gradient(180deg, ${wood[0]}, ${wood[1]})`,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
          opacity: 0.92,
        }}
      />
      <div style={{ position: "absolute", left: -120, right: -120, top: h, height: 2, background: "rgba(244,240,232,0.18)", transform: `scaleX(${pr(grow, 0, 0.6, EO)})` }} />
    </div>
  );
};

// Pencil marks on the jamb on `labelSide`, each drawn in with a stroke at its `at`, and a label just outside the frame.
// The newest label is large and bright; earlier ones are small and dim. Labels never overlap: when two marks sit close
// together, older labels are pushed down and a thin leader joins each label to its mark.
export const Marks: React.FC<{
  t: number;
  x: number;
  floor: number;
  w: number;
  marks: Mark[];
  color?: string;
  jamb?: number;
  labelSide?: "left" | "right";
  labelSize?: number;
  hand?: boolean;
  yOf?: (m: Mark) => number;
}> = ({ t, x, floor, w, marks, color = C.cyan, jamb = 58, labelSide = "right", labelSize = 30, hand = false, yOf = (m) => markY(m.min) }) => {
  const left = x - w / 2;
  const right = labelSide === "right";
  const shown = marks.filter((m) => t >= m.at);
  const newest = shown.length ? shown[shown.length - 1] : undefined;
  const small = Math.round(labelSize * 0.68);
  // label layout, top to bottom
  const rows = shown
    .map((m) => {
      const isNew = m === newest;
      const h = isNew ? labelSize * 1.3 + (m.sub ? labelSize * 0.8 : 0) : small * 1.35;
      return { m, isNew, h, y: floor - yOf(m), ly: floor - yOf(m) - (isNew ? labelSize * 0.65 : small * 0.68) };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < rows.length; i++) rows[i].ly = Math.max(rows[i].ly, rows[i - 1].ly + rows[i - 1].h + 4);
  const markX0 = right ? left + w - jamb - 6 : left - 28;
  const len = jamb + 34;
  const lx = right ? left + w + 44 : left - 44;
  return (
    <>
      {marks.map((m, i) => {
        const p = pr(t, m.at, 0.32, EIO);
        if (p <= 0) return null;
        const y = floor - yOf(m);
        const tilt = hand ? (random(`tilt${i}`) - 0.5) * 3 : 0;
        const x0 = right ? markX0 : markX0 + len;
        const dir = right ? 1 : -1;
        return (
          <React.Fragment key={i}>
            <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
              <line
                x1={x0}
                y1={y}
                x2={x0 + dir * len * p}
                y2={y + Math.tan((tilt * Math.PI) / 180) * len * p}
                stroke={color}
                strokeWidth={m.dashed ? 4 : 5}
                strokeDasharray={m.dashed ? "10 8" : undefined}
                strokeLinecap="round"
                opacity={0.95 * (m.dashed ? 0.85 : 1)}
              />
            </svg>
            {p < 1 ? (
              <div style={{ position: "absolute", left: x0 + dir * len * p - 4, top: y - 50, transform: `rotate(${right ? 28 : -28}deg)`, transformOrigin: "50% 100%" }}>
                <Pencil color={color} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {rows.map(({ m, isNew, ly, y }, i) => {
        const o = pr(t, m.at + 0.15, 0.3);
        const fs = isNew ? labelSize : small;
        const cy = ly + fs * 0.65;
        const lead = Math.abs(cy - y) > 6;
        return (
          <React.Fragment key={`l${i}`}>
            {lead ? (
              <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: o * 0.5 }} width={1} height={1}>
                <path d={`M${right ? markX0 + len : markX0} ${y} L${right ? lx - 10 : lx + 10} ${cy}`} stroke={C.muted} strokeWidth={1.5} fill="none" />
              </svg>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: lx,
                top: ly,
                transform: right ? undefined : "translateX(-100%)",
                opacity: o * (isNew ? 1 : 0.55),
                fontFamily: hand ? SERIF : FONT,
                fontWeight: isNew ? 900 : 700,
                fontSize: fs,
                color: isNew ? C.fg : C.sub,
                whiteSpace: "nowrap",
                textAlign: right ? "left" : "right",
                lineHeight: 1.3,
              }}
            >
              {m.label}
              {m.sub && isNew ? <div style={{ fontSize: labelSize * 0.62, fontWeight: 700, color: C.muted, marginTop: 2 }}>{m.sub}</div> : null}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

export const Pencil: React.FC<{ color: string }> = ({ color }) => (
  <svg width="16" height="58" viewBox="0 0 16 58" style={{ display: "block", overflow: "visible" }}>
    <rect x="2" y="0" width="12" height="40" rx="2" fill="#e8d9b5" />
    <rect x="2" y="0" width="12" height="7" rx="2" fill="#d87a7a" />
    <path d="M2,40 L14,40 L8,56 Z" fill="#f1e6cc" />
    <path d="M6,51 L10,51 L8,56 Z" fill={color} />
  </svg>
);

// The AI marks used across the film (minutes; METR 50 % time horizon, first measured model at each step).
export const AI_MARKS = {
  m4: 4, // GPT-4, 2023-03
  m39: 39, // o1, 2024-09
  h1: 60, // Claude 3.7 Sonnet, 2025-02
  h3: 204, // GPT-5, 2025-08
  h12: 720, // Claude Opus 4.6, 2026-02
  h17: 1044, // Claude Mythos Preview, 2026-04 (point estimate 17.4 h)
  month: 10020, // one working month, 167 h (METR extrapolation, 2028–2031)
};

export const growthLerp = (a: number, b: number, k: number) => lerp(a, b, clamp01(k));
export const popIn = (t: number, at: number) => pr(t, at, 0.4, EBACK);
