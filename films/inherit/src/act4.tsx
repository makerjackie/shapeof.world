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
const Split: React.FC<{ t: number; at: number; litAt: number; o: number }> = ({ t, at, litAt, o }) => {
  if (o <= 0) return null;
  const rows = [1, 3, 9];
  const ys = [250, 430, 610];
  const spans = [0, 560, 1160];
  const nodes: { x: number; y: number; row: number; p: number }[] = [];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 1060 : 1060 - spans[r] / 2 + (spans[r] * i) / (n - 1);
      nodes.push({ x, y: ys[r], row: r, p: r === 0 ? -1 : r === 1 ? 0 : 1 + Math.floor(i / 3) });
    }
  });
  const lit = ramp(t, litAt, litAt + 0.8, EIO);
  const labs = [
    { who: "爷爷", share: "一整份" },
    { who: "3 个儿子", share: "每人 1/3" },
    { who: "9 个孙子", share: "每人 1/9" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="sp-warm">
            <stop offset="0%" stopColor="#fff1d6" />
            <stop offset="45%" stopColor={K.warm} />
            <stop offset="100%" stopColor={K.warm} stopOpacity={0} />
          </radialGradient>
        </defs>
        {nodes.map((n, k) => {
          const g = ramp(t, at + n.row * 0.9 + (k % 9) * 0.03, at + n.row * 0.9 + 0.45 + (k % 9) * 0.03, EO);
          if (g <= 0) return null;
          const p = n.p >= 0 ? nodes[n.p] : null;
          const ring = 30 / Math.pow(3, n.row);
          const core = 26;
          return (
            <g key={k} opacity={g}>
              {p ? <line x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={K.warm} strokeOpacity={0.3} strokeWidth={1.6} /> : null}
              <circle cx={n.x} cy={n.y} r={core * (2.4 + 0.8 * lit)} fill="url(#sp-warm)" opacity={0.55 + 0.35 * lit} />
              <circle cx={n.x} cy={n.y} r={core + ring / 2 + 3} fill="none" stroke={K.gold} strokeWidth={Math.max(0.6, ring)} strokeOpacity={0.95} />
              <circle cx={n.x} cy={n.y} r={core * 0.6} fill="#ffe2b8" />
            </g>
          );
        })}
      </svg>
      {labs.map((l, r) => (
        <div key={r} style={{ position: "absolute", left: 90, width: 300, top: ys[r] - 44, opacity: ramp(t, at + r * 0.9, at + r * 0.9 + 0.4, EO) }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: K.fg, textShadow: SHADOW }}>{l.who}</div>
          <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 36, color: K.gold, textShadow: SHADOW }}>{l.share}</div>
        </div>
      ))}
      {/* the key, once the light is the point */}
      <div style={{ position: "absolute", right: 90, top: 150, display: "flex", flexDirection: "column", gap: 18, opacity: lit, fontFamily: FONT, fontWeight: 800, fontSize: 34, color: K.fg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><span style={{ width: 34, height: 34, borderRadius: 17, border: `5px solid ${K.gold}` }} />金圈：钱</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><span style={{ width: 34, height: 34, borderRadius: 17, background: "radial-gradient(circle, #fff1d6, #ffb36b 55%, rgba(255,179,107,0) 75%)" }} />光：社会地位</div>
      </div>
    </div>
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
  const k = ramp(t, outAt, outAt + 1.5, EIO);
  const s0 = 3.4;
  const sc = Math.exp(lerp(Math.log(s0), 0, k));
  const px = lerp(BOX.x + BOX.w / 2, 960, k);
  const py = lerp(BOX.y + BOX.h / 2 - 20, 580, k);
  const far = ramp(t, outAt + 0.4, outAt + 1.1, EO);
  const draw = ramp(t, outAt + 0.8, outAt + 2.4, (x) => x);
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
            江南大族的社会地位<span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: K.sub, marginLeft: 14 }}>考中举人的比例，是平均的几倍</span>
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
  const a = S(SB.split);
  const z = S(SB.zoom);
  const end = S(SB.keep);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tSplit = a + S(1.2);
  const tPos = a + S(3.2);
  const tOut = z + S(2.8);
  const tFar = z + S(3.0);
  const tSum = z + S(4.4);
  return (
    <>
      <Big at={a + 0.1} out={tSplit - 0.05} y={400} size={100} lines={["那钱为什么留不住？"]} />
      <Split t={t} at={tSplit} litAt={tPos} o={win(t, tSplit, z, 0.4, 0.4)} />
      <Cap at={tSplit + 0.1} out={tPos - 0.05} lines={["爷爷的钱，一代代分下去："]} />
      <Cap at={tPos + 0.1} out={z - 0.05} lines={["孙子没爷爷有钱了，", [{ t: "可这家人的社会地位还在。", c: K.warm }]]} />
      <Zoom t={t} at={z} outAt={tOut} sumAt={tSum} end={end} />
      <Cap at={z + 0.1} out={tOut + 0.3} lines={["洛克菲勒家的钱，一百年里", ["从占美国 GDP 的 ", { t: "2.3%", num: true, c: K.gold }, " 降到 ", { t: "0.04%", num: true, c: K.gold }, "。"]]} />
      <Cap at={tFar + 0.1} out={end - 0.05} lines={["江南大族的社会地位，", ["过了", { t: "三百多年", c: K.gold }, "，才回到平均。"]]} />
    </>
  );
};

// ---------- 10 拿不走的：家教 ----------
export const Keep: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.keep);
  const end = S(SB.climb);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tHome = a + S(1.8);
  const tKey = a + S(4.4);
  const tWork = a + S(6);
  const tFour = a + S(8.5);
  const paintO = win(t, a, end, 0.6, 0.4);
  const homeK = win(t, tHome, tKey, 0.4, 0.3);
  const marryK = 0;
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
      <Big at={a + 0.1} out={tHome - 0.05} y={380} size={96} lines={["钱和地都没了，", [{ t: "孙辈靠什么追回来？", mark: true }]]} />

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
      <Cap at={tHome + 0.1} out={tKey - 0.05} lines={["跟父母住一起的，追得更多；", "父母早逝的，没追回来。"]} />
      <Fine t={t} at={tHome + 0.5} out={tKey} y={846 - 40}>同一项土改研究（Alesina 等，2021）</Fine>
      <Big at={tKey + 0.05} out={tWork - 0.05} y={360} size={110} gap={14} lines={["钱和地能分走，", [{ t: "家教分不走。", mark: true }]]} />

      {marryK > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: marryK }}>
          <Tree id="ma" t={t} nodes={fa} grow={(n) => (t - (tWork + n.row * 0.3)) / 0.3} gold={() => 0} light={() => 0.8} r={(n) => (n.row ? 16 : 22)} />
          <Tree id="mb" t={t} nodes={fb} grow={(n) => (t - (tWork + n.row * 0.3)) / 0.3} gold={() => 0} light={() => 0.8} r={(n) => (n.row ? 16 : 22)} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <path d={`M ${fa[3].x} 490 C ${fa[3].x + 120} 610, ${fb[1].x - 120} 610, ${fb[1].x} 490`} fill="none" stroke={K.gold} strokeWidth={4}
              strokeDasharray={900} strokeDashoffset={900 * (1 - ramp(t, tWork + 0.8, tWork + 1.6, EO))} />
          </svg>
          <Label x={960} y={640} o={0} size={40} color={K.gold}>门当户对</Label>
        </div>
      ) : null}
      <Cap at={tWork + 0.1} out={tFour - 0.05} lines={["他们更相信努力有用，", ["每个工作日多干", { t: "半个多小时", c: K.gold }, "。"]]} />
      {/* four things, lit like the inner light of a node */}
      {t > tFour - 0.2 ? (
        <div style={{ position: "absolute", inset: 0, opacity: win(t, tFour, end, 0.3, 0.4) }}>
          <Label x={960} y={240} o={ramp(t, tFour, tFour + 0.4, EO)} size={48} color={K.gold}>家里传下来的：</Label>
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

// ---------- 11 往上走，也一样慢：进士题名碑 ----------
export const Climb: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.climb);
  const end = S(SB.end);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tFirst = a + S(2.3);
  const steleO = win(t, a, end, 0.5, 0.4);
  return (
    <>
      <Photo src="img/stele.jpg" x={160} y={70} w={1600} h={760} o={steleO} zoom={1.05 + 0.08 * ramp(t, a, end, (x) => x)} px={50} py={55} />
      <Label x={960} y={110} o={steleO} size={30} color={K.sub} weight={700}>北京孔庙的进士题名碑</Label>
      <Cap at={a + 0.1} out={tFirst - 0.05} lines={["明朝将近一半的进士，", "祖上三代都没有功名。"]} />
      <Cap at={tFirst + 0.1} out={end - 0.05} lines={[[{ t: "他们是自己家家谱的第一行。", c: K.gold }]]} />
      <Fine t={t} at={a + 0.5} out={end} y={846}>何炳棣《明清社会史论》（1962）：明代进士 47.5% 祖上三代无功名</Fine>
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
      <Big at={a + 0.15} y={70} size={92} gap={10} lines={["钱，富不过三代；", [{ t: "社会地位，三百年才散。", mark: true }]]} stagger={1.5} />
      <Big at={a + S(2.2)} y={955} size={52} lines={[[{ t: "传下去的，是家教。", c: K.warm }]]} />
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
    "美国废奴后：Ager, Boustan & Eriksson, AER（2021）；明代进士：何炳棣《明清社会史论》（1962）",
    "范德比尔特：A. T. Vanderbilt II, Fortune's Children（1989）；洛克菲勒：Chernow（1998）、Forbes（2026）；GDP：MeasuringWorth",
    "图片：Wikimedia Commons 公有领域（美国国会图书馆、Felice Beato、徐扬等）；进士题名碑照片 CC0；家谱树、金榜、名单卡、田地、账本、圆点为示意",
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
