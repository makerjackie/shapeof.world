// 9 两样东西：分家 + 近看与远看, 10 拿不走的：家教, 11 往上走也一样慢, 结尾, 信息来源 (story bars in timing.ts).
import React from "react";
import { EIO, EO, SHADOW, clamp01, lerp, ramp, useT, win } from "./kit";
import { FONT, K, NUM, SERIF } from "./theme";
import { S, SB } from "./timing";
import { Big, Cap, Fine, Label, Num, Photo, Portrait, Tree, buildTree, rnd } from "./world";
import type { Node } from "./world";

// ---------- 9 两样东西 ----------
// One node: a gold ring (money) around a warm core (standing). Each generation the estate is divided:
// the ring thins with every split, the core does not.
const Split: React.FC<{ t: number; at: number; fadeAt: number; o: number }> = ({ t, at, fadeAt, o }) => {
  if (o <= 0) return null;
  const rows = [1, 3, 9, 27];
  const ys = [250, 400, 540, 670];
  const spans = [0, 520, 1100, 1500];
  const nodes: { x: number; y: number; row: number; p: number }[] = [];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 960 : 960 - spans[r] / 2 + (spans[r] * i) / (n - 1);
      nodes.push({ x, y: ys[r], row: r, p: r === 0 ? -1 : Math.floor(i / 3) + rows.slice(0, r - 1).reduce((s, v) => s + v, 0) });
    }
  });
  const spent = ramp(t, fadeAt, fadeAt + 1.2, EIO);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <defs>
        <radialGradient id="sp-warm">
          <stop offset="0%" stopColor="#fff1d6" />
          <stop offset="45%" stopColor={K.warm} />
          <stop offset="100%" stopColor={K.warm} stopOpacity={0} />
        </radialGradient>
      </defs>
      {nodes.map((n, k) => {
        const g = ramp(t, at + n.row * 0.55 + (k % 9) * 0.02, at + n.row * 0.55 + 0.4 + (k % 9) * 0.02, EO);
        if (g <= 0) return null;
        const p = n.p >= 0 ? nodes[n.p] : null;
        const ring = (24 / Math.pow(3, n.row)) * (n.row === 3 ? 1 - 0.85 * spent : 1);
        const core = [34, 22, 14, 9][n.row];
        return (
          <g key={k} opacity={g}>
            {p ? <line x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={K.warm} strokeOpacity={0.3} strokeWidth={1.6} /> : null}
            <circle cx={n.x} cy={n.y} r={core * 2.6} fill="url(#sp-warm)" opacity={0.7} />
            <circle cx={n.x} cy={n.y} r={core + ring / 2 + 2} fill="none" stroke={K.gold} strokeWidth={Math.max(0.3, ring)} strokeOpacity={0.95} />
            <circle cx={n.x} cy={n.y} r={core * 0.7} fill="#ffe2b8" />
          </g>
        );
      })}
    </svg>
  );
};

// ---------- the centre shot: near, one family's money; far, a family's place ----------
// World coordinates at scale 1. The camera starts zoomed in on the small box (Rockefeller money, 1913 → today) and
// pulls back to the long line (江南大族, 1645–1989): two measures, two time scales, each with its own label.
const YX = (y: number) => 220 + ((y - 1640) * (1700 - 220)) / (2030 - 1640);
const JN = [
  { y: 1667, v: 10.6, lab: "11 倍" },
  { y: 1795, v: 4.2, lab: "4.2 倍" },
  { y: 1885, v: 3.7, lab: "3.7 倍" },
  { y: 1981, v: 1.03, lab: "约 1 倍" },
];
const VY = (v: number) => 700 - 38 * v;
const BOX = { x: YX(1913), y: 760, w: YX(2026) - YX(1913), h: 150 };
const Zoom: React.FC<{ t: number; at: number; outAt: number; sumAt: number; end: number }> = ({ t, at, outAt, sumAt, end }) => {
  const o = win(t, at, end, 0.4, 0.4);
  if (o <= 0) return null;
  const k = ramp(t, outAt, outAt + 1.9, EIO);
  const s0 = 3.4;
  const sc = Math.exp(lerp(Math.log(s0), 0, k));
  const px = lerp(BOX.x + BOX.w / 2, 960, k);
  const py = lerp(BOX.y + BOX.h / 2 - 20, 580, k);
  const far = ramp(t, outAt + 0.6, outAt + 1.4, EO);
  const draw = ramp(t, outAt + 1.0, outAt + 2.6, (x) => x);
  const rk1 = { x: BOX.x + 26, y: BOX.y + 42 };
  const rk2 = { x: BOX.x + BOX.w - 26, y: BOX.y + BOX.h - 18 };
  const line = ramp(t, at + 1.0, at + 2.2, EIO);
  const pts = JN.map((p) => ({ x: YX(p.y), y: VY(p.v) }));
  const path = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const sum = ramp(t, sumAt, sumAt + 0.5, EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${960 - px * sc}px, ${540 - py * sc}px) scale(${sc})` }}>
        {/* the long line: 江南大族, three hundred years */}
        <div style={{ position: "absolute", inset: 0, opacity: far }}>
          <div style={{ position: "absolute", left: 220, top: 700, width: 1480, height: 3, background: "rgba(244,236,220,0.45)" }} />
          {[1650, 1700, 1750, 1800, 1850, 1900, 1950, 2000].map((y) => (
            <React.Fragment key={y}>
              <div style={{ position: "absolute", left: YX(y) - 1, top: 692, width: 2, height: 16, background: "rgba(244,236,220,0.45)" }} />
              <div style={{ position: "absolute", left: YX(y) - 50, width: 100, top: 712, textAlign: "center", fontFamily: NUM, fontWeight: 700, fontSize: 22, color: K.muted }}>{y}</div>
            </React.Fragment>
          ))}
          <div style={{ position: "absolute", left: 220, right: 220, top: VY(1), height: 0, borderTop: "2px dashed rgba(201,189,166,0.5)" }} />
          <div style={{ position: "absolute", left: 1712, top: VY(1) - 16, fontFamily: FONT, fontWeight: 700, fontSize: 24, color: K.sub }}>平均</div>
          <div style={{ position: "absolute", left: 220, top: 170, fontFamily: SERIF, fontWeight: 900, fontSize: 36, color: K.gold, textShadow: SHADOW, whiteSpace: "nowrap" }}>
            江南大族的位置<span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: K.sub, marginLeft: 14 }}>考中举人的比例，是平均的几倍</span>
          </div>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <path d={path} fill="none" stroke={K.gold} strokeWidth={5} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
            <path d={path} fill="none" stroke={K.gold} strokeWidth={22} opacity={0.12} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={10} fill={i === 3 ? K.ashHi : K.goldHi} opacity={ramp(draw, i / 3 - 0.05, i / 3 + 0.02, (x) => x)} />
            ))}
          </svg>
          {pts.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: p.x - 100, width: 200, top: p.y - 62, textAlign: "center", fontFamily: NUM, fontWeight: 900, fontSize: 36,
              color: i === 3 ? K.ashHi : K.goldHi, textShadow: SHADOW, opacity: ramp(draw, i / 3 - 0.02, i / 3 + 0.06, (x) => x) }}>{JN[i].lab}</div>
          ))}
          {/* at the summary: how long the line took */}
          <div style={{ position: "absolute", left: 880, width: 300, top: 572, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 44, color: K.goldHi, textShadow: SHADOW, opacity: sum }}>三百多年</div>
          {/* the box hangs from its years on the axis */}
          <div style={{ position: "absolute", left: BOX.x, width: BOX.w, top: 703, height: BOX.y - 703, borderLeft: "2px dashed rgba(244,236,220,0.35)", borderRight: "2px dashed rgba(244,236,220,0.35)" }} />
        </div>
        {/* the box: one family's money */}
        <div style={{ position: "absolute", left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, borderRadius: 4, background: "rgba(20,16,11,0.92)", border: "1.5px solid rgba(240,192,98,0.6)" }}>
          <div style={{ position: "absolute", left: 10, top: 6, fontFamily: SERIF, fontWeight: 900, fontSize: 13, color: K.fg, whiteSpace: "nowrap" }}>洛克菲勒家的钱<span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, color: K.sub, marginLeft: 6 }}>占美国 GDP</span></div>
          <div style={{ position: "absolute", right: 10, top: 6, fontFamily: SERIF, fontWeight: 900, fontSize: 13 + 17 * sum, color: sum > 0.5 ? K.goldHi : K.sub, whiteSpace: "nowrap" }}>{sum > 0.5 ? "一百年" : ""}</div>
          <div style={{ position: "absolute", left: 10, right: 10, top: BOX.h - 18, height: 0, borderTop: "1px solid rgba(244,236,220,0.3)" }} />
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <line x1={rk1.x} y1={rk1.y} x2={lerp(rk1.x, rk2.x, line)} y2={lerp(rk1.y, rk2.y, line)} stroke={K.gold} strokeWidth={2} strokeDasharray="5 4" />
          <circle cx={rk1.x} cy={rk1.y} r={6} fill={K.goldHi} opacity={ramp(t, at + 0.3, at + 0.6, EO)} />
          <circle cx={rk2.x} cy={rk2.y} r={4} fill={K.goldHi} opacity={ramp(t, at + 2.1, at + 2.3, EO)} />
        </svg>
        <div style={{ position: "absolute", left: rk1.x + 16, top: rk1.y - 16, fontFamily: NUM, fontWeight: 900, fontSize: 26, color: K.goldHi, opacity: ramp(t, at + 0.4, at + 0.7, EO) }}>
          2.3%<span style={{ fontSize: 11, color: K.sub, marginLeft: 6, fontWeight: 700 }}>1913 年，老洛克菲勒一人</span>
        </div>
        <div style={{ position: "absolute", left: rk2.x - 200, width: 190, textAlign: "right", top: rk2.y - 40, fontFamily: NUM, fontWeight: 900, fontSize: 22, color: K.goldHi, opacity: ramp(t, at + 2.1, at + 2.4, EO) }}>
          <span style={{ fontSize: 11, color: K.sub, marginRight: 6, fontWeight: 700 }}>今天，全家族</span>0.04%
        </div>
      </div>
    </div>
  );
};

export const Mech: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.mech);
  const end = S(SB.keep);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tPos = a + S(1.3);
  const tZoom = a + S(2.4);
  const tOut = a + S(4.2);
  const tFar = a + S(4.8);
  const tSum = a + S(6.4);
  return (
    <>
      <Split t={t} at={a + 0.1} fadeAt={a + S(0.9)} o={win(t, a, tZoom, 0.4, 0.4)} />
      <Cap at={a + 0.1} out={tPos - 0.05} lines={["钱每一代都要分家，三代就摊成几十份，", "再被花掉、被时代冲走。"]} />
      <Cap at={tPos + 0.1} out={tZoom - 0.05} lines={["家里的位置，", [{ t: "不会这样按人头分掉。", c: K.warm }]]} />
      <Zoom t={t} at={tZoom} outAt={tOut} sumAt={tSum} end={end} />
      <Cap at={tZoom + 0.1} out={tOut + 0.3} lines={[["近看洛克菲勒家：1913 年，一人约占美国 GDP ", { t: "2.3%", num: true, c: K.gold }, "；"], ["今天全家族加起来，约 ", { t: "0.04%", num: true, c: K.gold }, "。"]]} />
      <Cap at={tFar + 0.1} out={tSum - 0.05} lines={[["拉远看江南大族：中举的比例从清初的 ", { t: "11 倍", num: true, c: K.gold }, "，"], "花了三百多年，才回到平均。"]} />
      <Cap at={tSum + 0.1} out={end - 0.05} lines={["俗话看的，是一家人几十年的钱；", ["一个家的位置，要", { t: "十代上下、约 300 年", c: K.gold }, "才散完。"]]} />
    </>
  );
};

// ---------- 10 拿不走的：家教 ----------
export const Keep: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.keep);
  const end = S(SB.climb);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tHome = a + S(1.3);
  const tKey = a + S(3.5);
  const tWork = a + S(5);
  const tFour = a + S(7.2);
  const paintO = win(t, a, end, 0.6, 0.4);
  const homeK = win(t, tHome, tKey, 0.4, 0.3);
  const marryK = win(t, tWork, tFour, 0.4, 0.3);
  const chainL = buildTree(640, 300, 150, [1, 1, 1], [0, 0, 0]);
  const chainR = buildTree(1280, 300, 150, [1, 1, 1], [0, 0, 0]);
  const fa = buildTree(640, 340, 150, [1, 3], [0, 300]);
  const fb = buildTree(1280, 340, 150, [1, 3], [0, 300]);
  const words = ["读书的习惯", "做事的样子", "和谁结婚", "认识谁"];
  const growH = (n: Node) => (t - (tHome + n.row * 0.3)) / 0.3;
  const kidL = ramp(t, tHome + 1.2, tHome + 1.7, EO);
  return (
    <>
      <Photo src="img/school.jpg" x={0} y={0} w={1920} h={1080} o={paintO} frame={false} zoom={1.08 + 0.1 * ramp(t, a, end, (x) => x)} px={42} py={48}
        dim={0.35 + 0.35 * ramp(t, a + 0.8, a + 1.4, EIO) + 0.2 * Math.max(homeK, marryK, ramp(t, tFour - 0.2, tFour + 0.3, EIO))} />
      <Label x={960} y={60} o={paintO * (1 - ramp(t, a + S(0.8), a + S(1.2), EIO))} size={30} color={K.sub} weight={700}>徐扬画的村塾，18 世纪</Label>
      <Big at={a + 0.1} out={tHome - 0.05} y={380} size={96} lines={["地都被分走了，", "孙辈靠什么翻回来？"]} />

      {homeK > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: homeK }}>
          <Tree id="homeL" t={t} nodes={chainL} grow={growH} gold={() => 0} light={(n) => (n.row === 2 ? 0.35 + 0.65 * kidL : 0.85)} r={(n) => (n.row === 2 ? 22 : 18)} />
          <Tree id="homeR" t={t} nodes={chainR} grow={growH} gold={() => 0} light={(n) => (n.row === 1 ? 0 : n.row === 2 ? 0.35 : 0.85)} r={(n) => (n.row === 2 ? 22 : 18)} />
          {/* the house around the parents and child who live together */}
          <div style={{ position: "absolute", left: 640 - 150, top: 390, width: 300, height: 380, borderRadius: 18, border: `3px solid rgba(255,179,107,${0.7 * ramp(t, tHome + 0.7, tHome + 1.1, EO)})` }} />
          {[
            { x: 640, lab: "和父母同住", c: K.warm },
            { x: 1280, lab: "父母早逝", c: K.ashHi },
          ].map((h) => (
            <div key={h.lab} style={{ position: "absolute", left: h.x - 250, width: 500, top: 200, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 48, color: h.c, textShadow: SHADOW,
              opacity: ramp(t, tHome + 0.2, tHome + 0.6, EO) }}>{h.lab}</div>
          ))}
          {["祖辈", "父母", "孙辈"].map((l, i) => (
            <div key={l} style={{ position: "absolute", left: 960 - 80, width: 160, top: 300 + i * 150 - 24, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 34, color: K.sub,
              opacity: ramp(t, tHome + i * 0.3, tHome + 0.4 + i * 0.3, EO) }}>{l}</div>
          ))}
        </div>
      ) : null}
      <Cap at={tHome + 0.1} out={tKey - 0.05} lines={["跟父母同住的孙辈，差距更大；", "父母早逝的，看不出这个差距。"]} />
      <Fine t={t} at={tHome + 0.5} out={tKey} y={846 - 40}>同一项土改研究（Alesina 等，2021）</Fine>
      <Big at={tKey + 0.05} out={tWork - 0.05} y={360} size={110} gap={14} lines={["田地能分走，", [{ t: "家教分不走。", mark: true }]]} />

      {marryK > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: marryK }}>
          <Tree id="ma" t={t} nodes={fa} grow={(n) => (t - (tWork + n.row * 0.3)) / 0.3} gold={() => 0} light={() => 0.8} r={(n) => (n.row ? 16 : 22)} />
          <Tree id="mb" t={t} nodes={fb} grow={(n) => (t - (tWork + n.row * 0.3)) / 0.3} gold={() => 0} light={() => 0.8} r={(n) => (n.row ? 16 : 22)} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <path d={`M ${fa[3].x} 490 C ${fa[3].x + 120} 610, ${fb[1].x - 120} 610, ${fb[1].x} 490`} fill="none" stroke={K.gold} strokeWidth={4}
              strokeDasharray={900} strokeDashoffset={900 * (1 - ramp(t, tWork + 0.8, tWork + 1.6, EO))} />
          </svg>
          <Label x={960} y={640} o={ramp(t, tWork + 1.4, tWork + 1.8, EO)} size={40} color={K.gold}>门当户对</Label>
        </div>
      ) : null}
      <Cap at={tWork + 0.1} out={tFour - 0.05} lines={[["他们更信“努力有用”，每个工作日多干约 ", { t: "0.6 小时", num: true, c: K.gold }, "；"], "这些人家也更常互相结亲。"]} />
      {/* four things, lit like the inner light of a node */}
      {t > tFour - 0.2 ? (
        <div style={{ position: "absolute", inset: 0, opacity: win(t, tFour, end, 0.3, 0.4) }}>
          {words.map((w, i) => {
            const g = ramp(t, tFour + 0.1 + i * 0.35, tFour + 0.6 + i * 0.35, EO);
            const x = 960 - 1.5 * 420 + i * 420;
            return (
              <div key={w} style={{ position: "absolute", left: x - 200, width: 400, top: 330, height: 300, opacity: g, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 120, height: 120, borderRadius: 60, background: "radial-gradient(circle, #fff1d6 0%, #ffb36b 40%, rgba(255,179,107,0) 72%)" }} />
                <div style={{ marginTop: 26, fontFamily: SERIF, fontWeight: 900, fontSize: 60, color: K.fg, textShadow: SHADOW, whiteSpace: "nowrap" }}>{w}</div>
              </div>
            );
          })}
          <Fine t={t} at={tFour + 1.2} out={end} y={900}>基因起多大作用，学者还在争。</Fine>
        </div>
      ) : null}
    </>
  );
};

// ---------- 11 往上走，也一样慢 ----------
export const Climb: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.climb);
  const end = S(SB.end);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tStep = a + S(2);
  const tStele = a + S(3.7);
  const bandsO = win(t, a, tStep, 0.4, 0.4);
  const stepO = win(t, tStep, tStele, 0.4, 0.4);
  const steleO = win(t, tStele, end, 0.5, 0.4);
  const bands = ["最富的五分之一", "", "", "", "最穷的五分之一"];
  const rise = ramp(t, a + 0.6, a + 1.6, EIO);
  return (
    <>
      {bandsO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: bandsO }}>
          {bands.map((b, i) => (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: 360, right: 360, top: 150 + i * 130, height: 112, borderRadius: 8, background: i === 0 ? "rgba(240,192,98,0.18)" : i === 4 ? "rgba(93,86,76,0.35)" : "rgba(233,220,192,0.06)" }} />
              <div style={{ position: "absolute", left: 390, top: 150 + i * 130 + 34, fontFamily: SERIF, fontWeight: 900, fontSize: 36, color: i === 0 ? K.gold : K.ashHi }}>{b}</div>
            </React.Fragment>
          ))}
          {[
            { x: 1080, lab: "美国", v: "7.5%" },
            { x: 1380, lab: "中国 80 后", v: "7.3%" },
          ].map((c, i) => {
            const h = (680 - 170) * rise;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: c.x - 3, top: 690 - h, width: 6, height: h, background: `linear-gradient(0deg, ${K.ashHi}, ${K.gold})`, borderRadius: 3 }} />
                <div style={{ position: "absolute", left: c.x - 14, top: 690 - h - 14, width: 28, height: 28, borderRadius: 14, background: K.gold, boxShadow: "0 0 24px rgba(240,192,98,0.8)", opacity: rise }} />
                <div style={{ position: "absolute", left: c.x - 150, width: 300, top: 160, textAlign: "center", fontFamily: NUM, fontWeight: 900, fontSize: 64, color: K.goldHi, opacity: ramp(t, a + 1.4, a + 1.8, EO), textShadow: SHADOW }}>{c.v}</div>
                <div style={{ position: "absolute", left: c.x - 150, width: 300, top: 790, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 34, color: K.fg }}>{c.lab}</div>
              </React.Fragment>
            );
          })}
        </div>
      ) : null}
      <Cap at={a + 0.1} out={tStep - 0.05} lines={["从最穷的五分之一，走到最富的五分之一：", [{ t: "美国 7.5%", c: K.gold }, "，", { t: "中国 80 后 7.3%", c: K.gold }, "。"]]} />
      <Fine t={t} at={a + 0.5} out={tStep} y={850}>Chetty 等 2014（1980–82 年出生）；Fan、Yi、Zhang 2021（1981–88 年出生）；两国口径不完全相同</Fine>

      {stepO > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: stepO }}>
          <defs>
            <radialGradient id="cl-warm">
              <stop offset="0%" stopColor="#fff1d6" />
              <stop offset="45%" stopColor={K.warm} />
              <stop offset="100%" stopColor={K.warm} stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* one node climbs a row; below it, ten generations light up one by one */}
          {(() => {
            const up = ramp(t, tStep + 0.2, tStep + 0.8, EIO);
            const nx = 960;
            const ny = lerp(330, 220, up);
            return (
              <>
                <line x1={760} y1={270} x2={1160} y2={270} stroke="rgba(244,236,220,0.25)" strokeWidth={2} strokeDasharray="10 8" />
                {Array.from({ length: 10 }, (_, g) => {
                  const y = 300 + g * 52;
                  const k = ramp(t, tStep + 0.9 + g * 0.12, tStep + 1.2 + g * 0.12, EO);
                  return (
                    <g key={g} opacity={k * (1 - g * 0.06)}>
                      <line x1={nx} y1={y - 52 + 16} x2={nx} y2={y - 12} stroke={K.warm} strokeOpacity={0.4} strokeWidth={2} />
                      <circle cx={nx} cy={y} r={30} fill="url(#cl-warm)" opacity={0.6} />
                      <circle cx={nx} cy={y} r={9} fill="#ffe2b8" />
                    </g>
                  );
                })}
                <circle cx={nx} cy={ny} r={60} fill="url(#cl-warm)" />
                <circle cx={nx} cy={ny} r={18} fill="#ffe2b8" stroke={K.gold} strokeWidth={4} />
              </>
            );
          })()}
        </svg>
      ) : null}
      <Cap at={tStep + 0.1} out={tStele - 0.05} lines={["位置传得慢，也意味着：", [{ t: "今天往上走的一步，也会传很久。", c: K.warm }]]} />

      <Photo src="img/stele.jpg" x={160} y={70} w={1600} h={760} o={steleO} zoom={1.05 + 0.08 * ramp(t, tStele, end, (x) => x)} px={50} py={55} />
      <Label x={960} y={110} o={steleO} size={30} color={K.sub} weight={700}>北京孔庙的进士题名碑</Label>
      <Cap at={tStele + 0.1} out={end - 0.05} lines={["明朝将近一半的进士，祖上三代没有功名。", [{ t: "他们是自己家家谱的第一行。", c: K.gold }]]} />
      <Fine t={t} at={tStele + 0.5} out={end} y={846}>何炳棣《明清社会史论》（1962）：明代进士 47.5% 祖上三代无功名</Fine>
    </>
  );
};

// ---------- 结尾 ----------
export const Ending: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.end);
  const end = S(SB.src);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const o = win(t, a, end, 0.5, 0.5);
  const tree = buildTree(960, 470, 54, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [0, 120, 220, 320, 420, 520, 620, 720, 820, 920]);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {/* the two old trees, faint, far away */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
        <Portrait src="img/vand.jpg" x={220} y={560} r={56} o={1} ash={1} />
        <Portrait src="img/rock.jpg" x={1700} y={560} r={56} o={1} />
      </div>
      <Tree id="you" t={t} nodes={tree}
        grow={(n) => (t - (a + 0.2 + n.row * 0.22 + n.i * 0.01)) / 0.4}
        gold={() => 0} light={(n) => (n.row === 0 ? 1 : 0)} r={(n) => (n.row === 0 ? 26 : 9)} />
      <div style={{ position: "absolute", left: 960 - 60, width: 120, top: 470 - 92, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 56, color: K.warm,
        opacity: ramp(t, a + 0.3, a + 0.7, EO), textShadow: SHADOW }}>你</div>
      {/* gold leaf drifting down from above */}
      {Array.from({ length: 40 }, (_, i) => {
        const at = a + rnd(i, 51) * 4;
        const d = t - at;
        if (d < 0 || d > 3.5) return null;
        const x = 200 + rnd(i, 52) * 1520 + Math.sin(d * 2 + i) * 30;
        const y = -20 + d * 220;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 8, height: 5, background: K.gold, opacity: clamp01(1 - d / 3.5) * 0.8, transform: `rotate(${d * 200 + i * 40}deg)` }} />;
      })}
      <Big at={a + 0.15} y={90} size={92} gap={10} lines={["拿得走的，富不过三代；", [{ t: "拿不走的，要走三百年。", mark: true }]]} stagger={1.5} />
    </div>
  );
};

export const Sources: React.FC = () => {
  const t = useT();
  const a = S(SB.src);
  const o = win(t, a, S(SB.card), 0.4, 0.3);
  if (o <= 0) return null;
  const rows = [
    "土改与地主后代：Alesina, Seror, Yang, You, Zeng, NBER 工作论文 27053（2021 修订）",
    "清代进士姓氏、江南大族：Hao & Clark, Social Mobility in China 1645–2012（工作论文，2012）",
    "姓氏与地位、英格兰、日本：Clark, The Son Also Rises（2014）；Clark & Ishii（日本武士）",
    "佛罗伦萨：Barone & Mocetti, Review of Economic Studies（2021）",
    "福布斯 400：Arnott, Bernstein & Wu, Cato Journal（2015）；美国三代财富：Kalsi & Ward, NBER 33355（2025）",
    "美国废奴后：Ager, Boustan & Eriksson, AER（2021）；佐治亚抽签：Bleakley & Ferrie, QJE（2016）",
    "代际流动：Chetty 等, QJE（2014）；Fan, Yi & Zhang, AEJ: Economic Policy（2021）；明代进士：何炳棣（1962）",
    "范德比尔特：A. T. Vanderbilt II, Fortune's Children（1989）；洛克菲勒：Chernow（1998）、Forbes（2026）；GDP：MeasuringWorth",
    "图片：Wikimedia Commons 公有领域（美国国会图书馆、Felice Beato、徐扬等）；进士题名碑照片 CC0；家谱树、金榜、名单卡、田地、账本为示意",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(8,7,5,${0.92 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 120, top: 110, right: 120, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 46, fontWeight: 800, marginBottom: 30, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 27, fontWeight: 500, color: "rgba(244,236,220,0.82)", lineHeight: 1.85 }}>{r}</div>
        ))}
      </div>
    </div>
  );
};
