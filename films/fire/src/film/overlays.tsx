// The 2D layer: narrative lines (serif, set in the picture, no fixed caption slot), counters, tags pinned to the 3D
// world, the brand corner, the sources page and the end card.
import React from "react";
import { Img, staticFile } from "remotion";
import { Cam, project } from "../world/camera";
import { K, NUM, SANS, SERIF } from "../theme";
import { clamp01, EO, ramp } from "../timing";
import { Num, Tag, Text } from "./director";

const SHADOW = "0 2px 18px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.6)";

// "abc{gold}def" -> segments
const parse = (s: string) => {
  const out: { t: string; gold: boolean }[] = [];
  const re = /\{([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index), gold: false });
    out.push({ t: m[1], gold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last), gold: false });
  return out;
};

export const Line: React.FC<{ x: Text; t: number }> = ({ x, t }) => {
  const segs = parse(x.text);
  const out = ramp(t, x.t1, x.t1 + 0.4);
  const per = Math.min(0.028, 0.5 / Math.max(1, x.text.length));
  let idx = 0;
  const align = x.align ?? "center";
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  const goldAt = x.t0 + x.text.length * per + 0.15;
  return (
    <div
      style={{
        position: "absolute",
        left: x.x,
        top: x.y,
        transform: `translate(${tx}, -50%) translateY(${-10 * out}px)`,
        opacity: 1 - out,
        fontFamily: x.serif === false ? SANS : SERIF,
        fontWeight: x.weight ?? (x.serif === false ? 600 : 700),
        fontSize: x.size,
        lineHeight: 1.25,
        color: x.color ?? K.paper,
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
        textShadow: SHADOW,
      }}
    >
      {segs.map((sg, si) => {
        const chars = Array.from(sg.t);
        const gk = sg.gold ? ramp(t, goldAt, goldAt + 0.35, EO) : 0;
        return (
          <span key={si} style={{ position: "relative", color: sg.gold ? K.gold : undefined }}>
            {sg.gold && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: "0.08em",
                  height: "0.12em",
                  width: `${gk * 100}%`,
                  background: K.gold,
                  opacity: 0.55,
                  borderRadius: 2,
                }}
              />
            )}
            {chars.map((c, ci) => {
              const k = ramp(t, x.t0 + (idx++) * per, x.t0 + idx * per + 0.32, EO);
              return (
                <span key={ci} style={{ display: "inline-block", opacity: k, transform: `translateY(${(1 - k) * 0.28}em)`, filter: k < 0.98 ? `blur(${(1 - k) * 6}px)` : undefined }}>
                  {c === " " ? " " : c}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};

const fmt = (v: number, plain?: boolean) => (plain ? String(Math.round(v)) : Math.round(v).toLocaleString("en-US"));

export const Counter: React.FC<{ x: Num; t: number }> = ({ x, t }) => {
  const inK = ramp(t, x.t0, x.t0 + 0.35, EO);
  const out = ramp(t, x.t1, x.t1 + 0.4);
  const count = x.live ? 1 : ramp(t, x.t0, x.t0 + 0.7, EO);
  const v = x.value * Math.min(1, count);
  const align = x.align ?? "center";
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div style={{ position: "absolute", left: x.x, top: x.y, transform: `translate(${tx}, -50%) translateY(${(1 - inK) * 16 - out * 10}px)`, opacity: inK * (1 - out), textAlign: align, whiteSpace: "nowrap", textShadow: SHADOW }}>
      <div style={{ fontFamily: NUM, fontWeight: 700, fontSize: x.size, color: x.color ?? K.paper, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", lineHeight: 1 }}>
        {x.prefix && <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: x.size * (x.prefix.length > 2 ? 0.8 : 0.62), marginRight: "0.12em", verticalAlign: "0.18em" }}>{x.prefix}</span>}
        {fmt(v, x.plain)}
        {x.suffix && <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: x.size * 0.5, marginLeft: "0.1em" }}>{x.suffix}</span>}
      </div>
      {x.label && <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: x.labelSize ?? Math.max(26, x.size * 0.26), color: K.sub, marginTop: 10 }}>{x.label}</div>}
    </div>
  );
};

export const TagView: React.FC<{ g: Tag; t: number; cam: Cam }> = ({ g, t, cam }) => {
  const p = project(cam, g.at);
  if (!p.front) return null;
  const inK = ramp(t, g.t0, g.t0 + 0.3, EO);
  const out = ramp(t, g.t1, g.t1 + 0.35);
  const x = p.x + (g.dx ?? 0);
  const y = p.y + (g.dy ?? 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${0.92 + 0.08 * inK})`, opacity: inK * (1 - out), textAlign: "center", whiteSpace: "nowrap", textShadow: SHADOW }}>
      {g.small && <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: K.sub, marginBottom: 4 }}>{g.small}</div>}
      {g.chip ? (
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: g.size ?? 38, color: K.ink, background: K.paper, padding: "8px 20px", borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.45)", textShadow: "none" }}>{g.text}</div>
      ) : (
        <div style={{ fontFamily: /[0-9¥]/.test(g.text) && !/[一-龥]/.test(g.text.replace(/万|块/g, "")) ? NUM : SANS, fontWeight: 700, fontSize: g.size ?? 40, color: g.color ?? K.paper }}>{g.text}</div>
      )}
    </div>
  );
};

export const Brand: React.FC<{ vis: number }> = ({ vis }) => (
  <div style={{ position: "absolute", left: 48, top: 38, display: "flex", alignItems: "center", gap: 14, opacity: 0.8 * vis }}>
    <Img src={staticFile("mark-disc.png")} style={{ width: 46, height: 46 }} />
    <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 28, letterSpacing: "0.08em", color: K.paper }}>世界的形状</div>
  </div>
);

const SOURCES = [
  "存款利率：国有大行三年期定期，2.75%（2022年9月前）、1.25%（2025年5月起）",
  "收入、消费：国家统计局，2025年城镇居民人均可支配收入中位数、全国居民人均消费支出",
  "4%法则：William Bengen, Journal of Financial Planning, 1994",
  "历史重演：Damodaran 美国股票、十年期国债、通胀年度数据（1928—2025），股债各半，按年再平衡，本片自算",
  "17国：Wade Pfau, 2010；萨姆·多根：Fortune 2023、CNBC 2024",
  "人均预期寿命：国家卫健委 2025年统计公报；退休年龄：全国人大常委会 2024年决定",
];

export const Sources: React.FC<{ vis: number }> = ({ vis }) => (
  <div style={{ position: "absolute", inset: 0, background: K.bg, opacity: vis, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 220, paddingRight: 220 }}>
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: K.paper, marginBottom: 36 }}>信息来源</div>
    {SOURCES.map((s, i) => (
      <div key={i} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 26, color: K.sub, lineHeight: 1.5, marginBottom: 12 }}>
        {s}
      </div>
    ))}
    <div style={{ fontFamily: SANS, fontSize: 22, color: K.faint, marginTop: 28 }}>历史回测不代表未来，本片不构成投资建议。</div>
  </div>
);

export const EndCard: React.FC<{ vis: number; t: number }> = ({ vis, t }) => {
  const a = clamp01(vis);
  return (
    <div style={{ position: "absolute", inset: 0, background: K.bg, opacity: a, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `translateY(${(1 - a) * 12}px)` }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 96, height: 96 }} />
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 76, letterSpacing: "0.1em", color: K.paper }}>世界的形状</div>
      </div>
      <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 34, letterSpacing: "0.3em", color: K.sub, marginTop: 30 }}>看见世界如何运行</div>
      <div style={{ position: "absolute", bottom: 70, fontFamily: NUM, fontWeight: 600, fontSize: 28, letterSpacing: "0.2em", color: K.faint }}>MakerJackie</div>
    </div>
  );
};
