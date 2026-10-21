import React from "react";
import { useBeatFrame } from "./kit";
import { Badge, EO, progAt } from "./fx";
import { FONT, K, ModelKey } from "./theme3";

// ---------- Range bars: solid = measured, hatched = theoretical ceiling ----------

export type RangeRow = {
  label: string;
  sub?: string;
  m?: ModelKey;
  color: string;
  lo: number;
  hi?: number;
  text: string;
  note?: string;
  dim?: boolean;
};

export const RangeBars: React.FC<{
  rows: RangeRow[];
  max: number;
  at: number;
  step?: number;
  width?: number;
  rowH?: number;
  labelW?: number;
}> = ({ rows, max, at, step = 0.5, width = 900, rowH = 92, labelW = 420 }) => {
  const frame = useBeatFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: rowH * 0.2, fontFamily: FONT }}>
      {rows.map((r, i) => {
        const t0 = at + i * step;
        const p = progAt(frame, t0, 1.1, EO);
        const ph = progAt(frame, t0 + 0.6, 1, EO);
        const wLo = (r.lo / max) * width * p;
        const wHi = r.hi ? ((r.hi - r.lo) / max) * width * ph : 0;
        const op = Math.min(1, p * 2) * (r.dim ? 0.55 : 1);
        return (
          <div key={r.label} style={{ display: "flex", alignItems: "center", height: rowH, opacity: op, transform: `translateX(${(1 - p) * -40}px)` }}>
            <div style={{ width: labelW, display: "flex", alignItems: "center", gap: 16, justifyContent: "flex-end", paddingRight: 26 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: rowH * 0.36, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>{r.label}</div>
                {r.sub ? <div style={{ fontSize: rowH * 0.24, fontWeight: 500, color: K.muted, whiteSpace: "nowrap" }}>{r.sub}</div> : null}
              </div>
              {r.m ? <Badge m={r.m} size={rowH * 0.62} /> : null}
            </div>
            <div style={{ position: "relative", height: rowH * 0.62, width: Math.max(4, wLo + wHi) }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: Math.max(4, wLo),
                  borderRadius: 10,
                  background: `linear-gradient(90deg, ${r.color}99, ${r.color})`,
                  boxShadow: `0 0 34px ${r.color}55, inset 0 1px 0 rgba(255,255,255,0.35)`,
                }}
              />
              {wHi > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: wLo - 6,
                    top: 0,
                    bottom: 0,
                    width: wHi + 6,
                    borderRadius: "0 10px 10px 0",
                    border: `2px dashed ${r.color}`,
                    borderLeft: "none",
                    background: `repeating-linear-gradient(-45deg, ${r.color}55 0 8px, transparent 8px 16px)`,
                  }}
                />
              ) : null}
            </div>
            <div style={{ paddingLeft: 22, opacity: ph > 0 ? Math.min(1, ph * 2) : Math.min(1, p * 1.5) }}>
              <div style={{ fontSize: rowH * 0.42, fontWeight: 900, color: r.color, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.text}</div>
              {r.note ? <div style={{ fontSize: rowH * 0.22, color: K.muted, fontWeight: 500, whiteSpace: "nowrap" }}>{r.note}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
