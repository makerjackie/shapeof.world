// 9 两样东西 (SB 61.5–72.5), 10 拿不走的是什么 (SB 72.5–79), 11 往上走也一样慢 (SB 79–84.5), 结尾 (SB 84.5–89.5), 信息来源.
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

const Ruler: React.FC<{ t: number; at: number; o: number }> = ({ t, at, o }) => {
  if (o <= 0) return null;
  const x0 = 220;
  const x1 = 1700;
  const n = 12;
  const gx = (g: number) => x0 + ((x1 - x0) * g) / n;
  const draw = ramp(t, at, at + 0.8, EO);
  const marks = [
    { g: 3, top: "俗话", lab: "三代", c: K.ashHi, at: at + 0.6 },
    { g: 5, top: "孟子", lab: "五世", c: K.ashHi, at: at + 1.2 },
    { g: 10, top: "研究估计", lab: "十代上下 · 约 300 年", c: K.goldHi, at: at + 2.0 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: x0, top: 520, width: (x1 - x0) * draw, height: 10, borderRadius: 5, background: "linear-gradient(90deg, #6d5a3c, #b8955a)" }} />
      {Array.from({ length: n + 1 }, (_, g) => (
        <React.Fragment key={g}>
          <div style={{ position: "absolute", left: gx(g) - 1.5, top: 500, width: 3, height: 50, background: "rgba(244,236,220,0.5)", opacity: draw > g / n ? 1 : 0 }} />
          <div style={{ position: "absolute", left: gx(g) - 30, width: 60, top: 560, textAlign: "center", fontFamily: NUM, fontWeight: 700, fontSize: 26, color: K.muted, opacity: draw > g / n ? 1 : 0 }}>{g}</div>
        </React.Fragment>
      ))}
      <div style={{ position: "absolute", left: x1 + 20, top: 552, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: K.muted, opacity: draw }}>代</div>
      {/* the research band: 8–12 generations */}
      <div style={{ position: "absolute", left: gx(8), top: 470, width: gx(12) - gx(8), height: 110, borderRadius: 10, background: "rgba(240,192,98,0.16)", border: "2px solid rgba(240,192,98,0.5)",
        opacity: ramp(t, at + 2.0, at + 2.5, EO) }} />
      {marks.map((m) => {
        const g = ramp(t, m.at, m.at + 0.45, EO);
        return (
          <div key={m.lab} style={{ position: "absolute", left: gx(m.g) - 260, width: 520, top: 300, textAlign: "center", opacity: g, transform: `translateY(${(1 - g) * 20}px)` }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: K.sub }}>{m.top}</div>
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: m.g === 10 ? 56 : 64, color: m.c, textShadow: SHADOW, whiteSpace: "nowrap" }}>{m.lab}</div>
            <div style={{ margin: "10px auto 0", width: 4, height: 70, background: m.c, opacity: 0.8 }} />
          </div>
        );
      })}
    </div>
  );
};

export const Mech: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.mech);
  const end = S(SB.keep);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tPos = a + S(2);
  const tRock = a + S(3.2);
  const tNow = a + S(4.5);
  const tNames = a + S(5.2);
  const tVand = a + S(7);
  const tRuler = a + S(8.5);
  const splitO = win(t, a, tRock, 0.4, 0.4);
  const rockO = win(t, tRock, tVand, 0.4, 0.4);
  const shrink = ramp(t, tNow, tNow + 0.9, EIO);
  const namesK = ramp(t, tNames, tNames + 0.5, EIO);
  const vandO = win(t, tVand, tRuler, 0.4, 0.4);
  // Rockefeller family: John D. → Jr. → five sons (Nelson, Winthrop, David among them) → Jay
  const rk = buildTree(1300, 260, 165, [1, 1, 5, 9], [0, 0, 840, 1000]);
  const roles: Record<string, { name: string; role: string; dx?: number; dy?: number }> = {
    "2-1": { name: "纳尔逊", role: "副总统、纽约州长", dy: -86 },
    "2-3": { name: "温斯罗普", role: "阿肯色州长", dy: -86 },
    "2-4": { name: "戴维", role: "大通银行董事长", dy: 74 },
    "3-2": { name: "杰伊", role: "西弗吉尼亚州长、参议员", dy: 74 },
  };
  // Vanderbilt: gold all gone, two nodes still lit
  const vd = buildTree(960, 250, 110, [1, 2, 5, 8, 11], [0, 220, 520, 820, 1100]);
  const vdLit = new Set(["3-4", "4-6"]);
  return (
    <>
      <Split t={t} at={a + 0.1} fadeAt={a + S(1.2)} o={splitO} />
      <Cap at={a + 0.1} out={tPos - 0.05} lines={["钱每一代都要分家，三代就摊成几十份，", "再被花掉、被时代冲走。"]} />
      <Cap at={tPos + 0.1} out={tRock - 0.05} lines={["家里的位置，", [{ t: "不会这样按人头分掉。", c: K.warm }]]} />

      {rockO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: rockO }}>
          {/* 2.3% of America in 1913 vs the whole family today: circle areas to scale */}
          <div style={{ position: "absolute", left: 520 - 230, top: 450 - 230, width: 460, height: 460, borderRadius: "50%", opacity: 1 - namesK,
            background: `radial-gradient(circle at 38% 35%, ${K.goldHi}, ${K.gold} 55%, ${K.goldLo})`, boxShadow: "0 0 80px rgba(240,192,98,0.4)",
            transform: `scale(${1 - 0.0 * shrink})` }} />
          <Num x={520} y={450} o={1 - namesK} size={110} color="#3b2a10">2.3%</Num>
          <Label x={520} y={730} o={1 - namesK} size={36} color={K.fg}>1913 年，老洛克菲勒一个人</Label>
          <div style={{ position: "absolute", left: 1240 - 30, top: 450 - 30, width: 60, height: 60, borderRadius: "50%", opacity: shrink * (1 - namesK),
            background: `radial-gradient(circle at 38% 35%, ${K.goldHi}, ${K.gold} 55%, ${K.goldLo})`, boxShadow: "0 0 30px rgba(240,192,98,0.5)" }} />
          <Num x={1240} y={340} o={shrink * (1 - namesK)} size={90}>0.04%</Num>
          <Label x={1240} y={560} o={shrink * (1 - namesK)} size={36} color={K.fg}>今天，全家族加起来</Label>
          <Label x={960} y={150} o={1 - namesK} size={34} color={K.sub} weight={700}>占美国 GDP 的比例（面积按比例画）</Label>
          {/* the family tree and the offices */}
          {namesK > 0 ? (
            <div style={{ position: "absolute", inset: 0, opacity: namesK }}>
              <Tree id="rk2" t={t} nodes={rk} grow={(n) => (t - (tNames + n.row * 0.15 + n.i * 0.03)) / 0.35}
                gold={(n) => 0.35 - n.row * 0.08} light={(n) => (roles[`${n.row}-${n.i}`] ? 1 : 0.35)} r={(n) => (n.row < 2 ? 22 : 16)} />
              <Portrait src="img/rock.jpg" x={1300} y={170} r={62} o={1} />
              {rk.map((n) => {
                const r = roles[`${n.row}-${n.i}`];
                if (!r) return null;
                const g = ramp(t, tNames + 0.5 + n.row * 0.2 + n.i * 0.1, tNames + 0.9 + n.row * 0.2 + n.i * 0.1, EO);
                return (
                  <div key={`${n.row}-${n.i}`} style={{ position: "absolute", left: n.x - 140, width: 280, top: n.y + (r.dy ?? 0) - 30, textAlign: "center", opacity: g }}>
                    <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 36, color: K.warm, textShadow: SHADOW }}>{r.name}</div>
                    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, color: K.fg, textShadow: SHADOW, whiteSpace: "nowrap" }}>{r.role}</div>
                  </div>
                );
              })}
              <Photo src="img/nelson.jpg" x={160} y={180} w={300} h={350} o={ramp(t, tNames + 0.4, tNames + 0.9, EO)} py={20} />
              <Photo src="img/jay.jpg" x={500} y={300} w={260} h={300} o={ramp(t, tNames + 0.8, tNames + 1.3, EO)} py={20} />
              <Label x={310} y={560} o={ramp(t, tNames + 0.4, tNames + 0.9, EO)} size={26} color={K.sub} weight={700}>纳尔逊，1975</Label>
              <Label x={630} y={630} o={ramp(t, tNames + 0.8, tNames + 1.3, EO)} size={26} color={K.sub} weight={700}>杰伊，1993</Label>
            </div>
          ) : null}
        </div>
      ) : null}
      <Cap at={tRock + 0.1} out={tNow - 0.05} lines={["洛克菲勒的钱，也在变薄：1913 年，", ["老洛克菲勒一人约占美国 GDP 的 ", { t: "2.3%", num: true, c: K.gold }, "。"]]} />
      <Cap at={tNow + 0.1} out={tNames - 0.05} lines={[["今天全家族加起来，约 ", { t: "0.04%", num: true, c: K.gold }, "。"]]} />
      <Cap at={tNames + 0.1} out={tVand - 0.05} lines={["可这个姓，出了一位副总统、三位州长、", "一位参议员、一位大银行董事长。"]} />

      {vandO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: vandO }}>
          <Tree id="vd2" t={t} nodes={vd} grow={(n) => (t - (tVand + n.row * 0.1 + n.i * 0.01)) / 0.3} gold={() => 0}
            light={(n) => (vdLit.has(`${n.row}-${n.i}`) ? ramp(t, tVand + 0.7, tVand + 1.1, EO) : 0)} r={(n) => (n.row === 0 ? 24 : 14)} />
          <Portrait src="img/vand.jpg" x={960} y={170} r={62} o={1} ash={1} />
          {vd.filter((n) => vdLit.has(`${n.row}-${n.i}`)).map((n, k) => (
            <div key={k} style={{ position: "absolute", left: k === 0 ? n.x - 440 : n.x + 30, width: 410, top: n.y - 24, textAlign: k === 0 ? "right" : "left", opacity: ramp(t, tVand + 0.9, tVand + 1.3, EO) }}>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: K.warm, textShadow: SHADOW }}>{k === 0 ? "格洛丽亚 · 设计师" : "安德森 · CNN 主播"}</div>
            </div>
          ))}
        </div>
      ) : null}
      <Cap at={tVand + 0.1} out={tRuler - 0.05} lines={["范德比尔特家的钱早散了，", "后人里还有知名设计师、CNN 主播。"]} />

      <Ruler t={t} at={tRuler + 0.1} o={win(t, tRuler, end, 0.4, 0.4)} />
      <Cap at={tRuler + 0.2} out={end - 0.05} lines={["一个家的位置要散完：俗话说三代，孟子说五世；", ["研究估计，要", { t: "十代上下，约 300 年", c: K.gold }, "。"]]} />
    </>
  );
};

// ---------- 10 拿不走的是什么 ----------
export const Keep: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.keep);
  const end = S(SB.climb);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tWork = a + S(1);
  const tMarry = a + S(2.8);
  const tFour = a + S(4.6);
  const paintO = win(t, a, end, 0.6, 0.4);
  const marryK = win(t, tWork, tMarry, 0.4, 0.3);
  // two family trees joined by a marriage
  const fa = buildTree(640, 340, 150, [1, 3], [0, 300]);
  const fb = buildTree(1280, 340, 150, [1, 3], [0, 300]);
  const words = ["读书的习惯", "做事的样子", "和谁结婚", "认识谁"];
  return (
    <>
      <Photo src="img/school.jpg" x={0} y={0} w={1920} h={1080} o={paintO} frame={false} zoom={1.08 + 0.1 * ramp(t, a, tFour, (x) => x)} px={42} py={48}
        dim={0.35 + 0.35 * ramp(t, a + 0.8, a + 1.4, EIO) + 0.2 * Math.max(marryK, ramp(t, tFour - 0.2, tFour + 0.3, EIO))} />
      <Label x={960} y={60} o={paintO * (1 - ramp(t, a + S(0.8), a + S(1.2), EIO))} size={30} color={K.sub} weight={700}>徐扬画的村塾，18 世纪</Label>
      <Big at={a + 0.1} out={tWork - 0.05} y={420} size={100} lines={["拿不走的是什么？"]} />
      <Cap at={tMarry + 0.1} out={tFour - 0.05} lines={["地主的孙辈也更相信“努力有用”，", ["每个工作日多干约 ", { t: "0.6 小时", num: true, c: K.gold }, "。"]]} />
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
      <Cap at={tWork + 0.1} out={tMarry - 0.05} lines={["地主的孙辈里，和父母同住的，差距更大；", "美国南方那些儿子，常娶同样人家的女儿。"]} />
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
  const tStep = a + S(1.8);
  const tStele = a + S(3.4);
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
