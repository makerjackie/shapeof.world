// 6 把钱全拿走, 7 揭晓 + 中美对照, 8 美国废奴 (story bars in timing.ts).
import React from "react";
import { EIO, EO, SHADOW, clamp01, lerp, ramp, win } from "./kit";
import { FONT, K, NUM, SERIF } from "./theme";
import { S, SB } from "./timing";
import { Big, Cap, Fine, Label, Num, Tree, buildTree, rnd } from "./world";
import type { Node } from "./world";

// ---------- fields seen from above ----------
// A strip of small paddies; one landlord holding six times the size, gold-edged, later surveyed into six.
const PLOT_W = 150;
const PLOT_H = 110;
const FX = 960 - 5.5 * (PLOT_W + 14);
const FY = 170;
const Fields: React.FC<{ t: number; cutAt: number; o: number }> = ({ t, cutAt, o }) => {
  if (o <= 0) return null;
  const cut = ramp(t, cutAt, cutAt + 1.4, (x) => x);
  const goldOff = ramp(t, cutAt + 0.8, cutAt + 1.6, EIO);
  const cells: React.ReactNode[] = [];
  // 4 rows × 11 columns; the landlord holding spans columns 3–5 of rows 1–2 (six cells)
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 11; c++) {
      const inBig = r >= 1 && r <= 2 && c >= 3 && c <= 5;
      const x = FX + c * (PLOT_W + 14);
      const y = FY + r * (PLOT_H + 14);
      const hue = rnd(r * 11 + c, 31);
      const water = rnd(r * 11 + c, 32) > 0.6;
      cells.push(
        <div key={`${r}-${c}`} style={{ position: "absolute", left: x, top: y, width: PLOT_W, height: PLOT_H, borderRadius: 6,
          background: water
            ? `linear-gradient(${120 + hue * 60}deg, rgba(120,140,120,0.55), rgba(70,90,80,0.55))`
            : `linear-gradient(${hue * 180}deg, rgba(${110 + hue * 40},${110 + hue * 30},${60 + hue * 20},0.75), rgba(80,74,40,0.75))`,
          boxShadow: "inset 0 0 18px rgba(0,0,0,0.45)", opacity: inBig ? 0 : 1 }}>
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 10px)", borderRadius: 6 }} />
        </div>,
      );
    }
  const bx = FX + 3 * (PLOT_W + 14) - 7;
  const by = FY + 1 * (PLOT_H + 14) - 7;
  const bw = 3 * (PLOT_W + 14);
  const bh = 2 * (PLOT_H + 14);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {cells}
      {/* the big holding */}
      <div style={{ position: "absolute", left: bx, top: by, width: bw, height: bh, borderRadius: 8,
        background: "linear-gradient(135deg, rgba(160,140,70,0.85), rgba(110,96,44,0.85))", boxShadow: `0 0 ${40 * (1 - goldOff)}px rgba(240,192,98,0.55), inset 0 0 22px rgba(0,0,0,0.4)`,
        border: `4px solid rgba(240,192,98,${1 - goldOff})` }}>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 10px)" }} />
      </div>
      {/* survey lines cut it into six */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[1, 2].map((k) => {
          const x = bx + (bw * k) / 3;
          const p = clamp01(cut * 3 - (k - 1) * 0.6);
          return <line key={`v${k}`} x1={x} y1={by} x2={x} y2={by + bh * p} stroke="#f4ecdc" strokeWidth={4} strokeDasharray="14 10" />;
        })}
        {(() => {
          const p = clamp01(cut * 3 - 1.6);
          return <line x1={bx} y1={by + bh / 2} x2={bx + bw * p} y2={by + bh / 2} stroke="#f4ecdc" strokeWidth={4} strokeDasharray="14 10" />;
        })()}
      </svg>
      <Num x={bx + bw / 2} y={by + bh / 2} o={win(t, cutAt - S(1.1), cutAt + 0.2, 0.3, 0.3)} size={110}>6 倍</Num>
    </div>
  );
};

// two families side by side: a landlord family (left) and an ordinary family (right), three generations
const famNodes = (cx: number) => buildTree(cx, 0, 150, [1, 3, 7], [0, 300, 520]);
const ROWLAB = ["祖辈", "儿子", "孙辈"];

// China and the US side by side. Left first: landlords' grandchildren, 14.5% back in the top 10%. Then the US: 14.1%.
const Mirror: React.FC<{ t: number; at: number; end: number }> = ({ t, at, end }) => {
  const o = win(t, at, end, 0.4, 0.35);
  if (o <= 0) return null;
  const at2 = at + S(2.6);
  const sides = [
    { cx: 540, at, lines: ["他们的孙辈里，又有", "回到了收入最高的那 10%"], v: "14.5%", head: "中国 · 地主富农家" },
    { cx: 1380, at: at2, lines: ["美国没搞过土改，", "两边几乎一样"], v: "14.1%", head: "美国" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {sides.map((sd, k) => {
        const so = ramp(t, sd.at, sd.at + 0.4, EO);
        const lit = new Set(Array.from({ length: 14 }, (_, j) => Math.floor(rnd(j * 7 + k, 61) * 100)));
        while (lit.size < 14) lit.add((lit.size * 37 + k * 11) % 100);
        return (
          <div key={k} style={{ position: "absolute", inset: 0, opacity: so }}>
            <div style={{ position: "absolute", left: sd.cx - 300, width: 600, top: 120, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 48, color: K.sub, textShadow: SHADOW }}>{sd.head}</div>
            {Array.from({ length: 100 }, (_, j) => {
              const x = sd.cx - 4.5 * 42 + (j % 10) * 42;
              const y = 220 + Math.floor(j / 10) * 42;
              const g = lit.has(j) ? ramp(t, sd.at + 0.5 + (j % 7) * 0.06, sd.at + 0.9 + (j % 7) * 0.06, EO) : 0;
              return (
                <div key={j} style={{ position: "absolute", left: x - 10, top: y - 10, width: 20, height: 20, borderRadius: 10,
                  background: g > 0 ? `rgba(255,${200 + 26 * g},${150 + 40 * g},${0.25 + 0.75 * g})` : "rgba(201,189,166,0.22)",
                  boxShadow: g > 0 ? `0 0 ${18 * g}px rgba(255,179,107,0.9)` : undefined }} />
              );
            })}
            <div style={{ position: "absolute", left: sd.cx - 400, width: 800, top: 660, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 52, color: K.fg, textShadow: SHADOW, lineHeight: 1.35 }}>
              {sd.lines[0]}
              <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 120, color: K.goldHi, textShadow: "0 0 40px rgba(240,192,98,0.4)", lineHeight: 1.1, opacity: ramp(t, sd.at + 0.6, sd.at + 1.0, EO) }}>{sd.v}</div>
              <div style={{ opacity: ramp(t, sd.at + 1.0, sd.at + 1.4, EO) }}>{sd.lines[1]}</div>
            </div>
          </div>
        );
      })}
      <Fine t={t} at={at2 + 0.5} out={end} y={1010}>Alesina 等 2021 表 3：祖辈在收入前 10%，孙辈仍在前 10% 的概率。中国由土改前精英的孙辈换算；美国由两代流动数据推算</Fine>
    </div>
  );
};

export const Reform: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.reform);
  const end = S(SB.usa);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tCut = a + S(2.8);
  const tTree = a + S(4.9);
  const tGrand = a + S(7.8);
  const tRev = S(SB.reveal);
  const tBig = tRev + S(2.1);
  const tUS = tRev + S(4);
  const fieldO = win(t, a, tTree + 0.2, 0.5, 0.5);
  const treeO = win(t, tTree, tUS, 0.5, 0.4) * (1 - 0.75 * ramp(t, tBig, tBig + 0.5, EIO));
  const L = famNodes(600);
  const R = famNodes(1400);
  const grow = (n: Node) => (t - (tTree + n.row * 0.35 + n.i * 0.04)) / 0.4;
  // landlord grandparents start gold and lose it (the land is gone); grandchildren light up at the reveal
  const lGold = (n: Node) => (n.row === 0 ? 1 - ramp(t, tTree + 0.3, tTree + 0.9, EIO) : 0);
  const lLight = (n: Node) => (n.row === 2 ? 0.25 + 0.75 * ramp(t, tRev + n.i * 0.07, tRev + 0.4 + n.i * 0.07, EO) : n.row === 1 ? 0.2 : 0);
  const rLight = (n: Node) => (n.row === 2 ? 0.25 + 0.4 * ramp(t, tRev + n.i * 0.07, tRev + 0.4 + n.i * 0.07, EO) : n.row === 1 ? 0.2 : 0);
  const flake = (n: Node) => (n.row === 0 ? tTree + 0.3 : null);
  return (
    <>
      <Fields t={t} cutAt={tCut + S(0.6)} o={fieldO} />
      <Label x={960} y={100} o={fieldO} size={34} color={K.sub} weight={700}>中国农村（示意）</Label>
      <Cap at={a + 0.1} out={tCut - 0.05} lines={["1950 年代初，中国土改。", ["地主富农家的地，是别人的 ", { t: "6 倍", c: K.gold }, "。"]]} />
      <Cap at={tCut + 0.1} out={tTree - 0.05} lines={["分完地以后，", "他们的地和贫农一样多。"]} />

      {treeO > 0 ? (
        <div style={{ position: "absolute", left: 0, top: 230, width: 1920, height: 700, opacity: treeO }}>
          <Tree id="lord" t={t} nodes={L} grow={grow} gold={lGold} light={lLight} flakeAt={flake} r={(n) => (n.row === 0 ? 24 : 16)} />
          <Tree id="poor" t={t} nodes={R} grow={grow} gold={() => 0} light={rLight} r={(n) => (n.row === 0 ? 24 : 16)} />
          {ROWLAB.map((l, i) => (
            <div key={l} style={{ position: "absolute", left: 960 - 80, width: 160, top: i * 150 - 24, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 38, color: K.sub,
              opacity: ramp(t, tTree + i * 0.35, tTree + 0.4 + i * 0.35, EO) }}>{l}</div>
          ))}
          <div style={{ position: "absolute", left: 600 - 250, width: 500, top: -100, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 44, color: K.gold, textShadow: SHADOW,
            opacity: ramp(t, tTree, tTree + 0.4, EO) }}>地主、富农家</div>
          <div style={{ position: "absolute", left: 1400 - 250, width: 500, top: -100, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 44, color: K.ashHi, textShadow: SHADOW,
            opacity: ramp(t, tTree, tTree + 0.4, EO) }}>别的人家</div>
        </div>
      ) : null}
      <Cap at={tTree + 0.4} out={tGrand - 0.05} lines={["儿子这一代，", "过得不比别人好。"]} />
      <Cap at={tGrand + 0.1} out={tRev + 0.1} lines={["到了孙子这一代……"]} stagger={2} />

      {/* the reveal */}
      <Num x={150} y={600} o={win(t, tRev + 0.2, tBig, 0.35, 0.4)} size={96}>+16%</Num>
      <Cap at={tRev + 0.15} out={tBig - 0.05} lines={["2010 年，他们的孙辈，", ["收入比别人高 ", { t: "16%", num: true, c: K.gold }, "。"]]} />
      <Fine t={t} at={tRev + 0.3} out={tBig} y={850 - 40}>Alesina 等（NBER 工作论文，2021）：中国家庭追踪调查 2010 年，农村县</Fine>
      <Big at={tBig + 0.05} out={tUS - 0.05} y={360} size={96} lines={["田地早就分没了，", [{ t: "孙辈又追了回来。", mark: true }]]} />
      <Mirror t={t} at={tUS} end={end} />
    </>
  );
};

// ---------- 8 美国废奴：钱被拿走，儿子追回来 ----------
const Ledger: React.FC<{ t: number; at: number; o: number }> = ({ t, at, o }) => {
  if (o <= 0) return null;
  const rows = 9;
  return (
    <div style={{ position: "absolute", left: 260, top: 130, width: 860, height: 620, background: "#e6dbc2", borderRadius: 4, opacity: o,
      boxShadow: "0 30px 80px rgba(0,0,0,0.6), inset 0 0 80px rgba(120,80,30,0.35)", transform: "rotate(-1.5deg)" }}>
      <div style={{ position: "absolute", left: 40, right: 40, top: 30, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 30, color: "#2b241c", letterSpacing: 2 }}>VALUE OF ESTATE · 1860 → 1870</div>
      {Array.from({ length: rows }, (_, i) => {
        const y = 100 + i * 56;
        const v = 4000 + Math.round(rnd(i, 41) * 30) * 1000;
        const strike = ramp(t, at + 0.3 + i * 0.12, at + 0.55 + i * 0.12, EO);
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: 40, right: 40, top: y + 40, height: 1, background: "rgba(60,45,30,0.35)" }} />
            <div style={{ position: "absolute", left: 50, top: y, width: 280, height: 8, marginTop: 18, background: "rgba(40,30,20,0.35)", borderRadius: 3 }} />
            <div style={{ position: "absolute", left: 400, top: y, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 32, color: "#2b1f14" }}>
              ${v.toLocaleString("en-US")}
              <div style={{ position: "absolute", left: -6, top: 20, height: 3, width: `${strike * 140}px`, background: "#8c2a1c" }} />
            </div>
            <div style={{ position: "absolute", left: 640, top: y, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 32, color: "#2b1f14", opacity: strike }}>
              ${Math.round((v * (0.18 + rnd(i, 42) * 0.2)) / 100) * 100}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const USA: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.usa);
  const end = S(SB.split);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tSons = a + S(2.5);
  const tBig = a + S(4.6);
  const ledO = win(t, a, tSons, 0.4, 0.4);
  const fall = ramp(t, a + 0.8, a + 2.2, EIO);
  // 1860 vs 1870: wealth of rich Southern households (90th percentile)
  const barH = 460;
  // sons: two rows, slaveholder (left) and equally rich non-slaveholder (right)
  const sonO = win(t, tSons, tBig, 0.4, 0.4);
  const famL = buildTree(560, 0, 180, [1, 3], [0, 280]);
  const famR = buildTree(1360, 0, 180, [1, 3], [0, 280]);
  const growS = (n: Node) => (t - (tSons + n.row * 0.4 + n.i * 0.05)) / 0.4;
  return (
    <>
      <Ledger t={t} at={a + 0.4} o={ledO} />
      {ledO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: ledO }}>
          {[
            { lab: "1860", h: barH, c: K.gold },
            { lab: "1870", h: barH * lerp(1, 0.25, fall), c: K.ashHi },
          ].map((b, i) => (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: 1290 + i * 220, top: 760 - (i ? b.h : barH), width: 140, height: i ? b.h : barH, borderRadius: "6px 6px 0 0",
                background: i ? K.ash : `linear-gradient(180deg, ${K.goldHi}, ${K.gold} 30%, ${K.goldLo})`, opacity: i ? ramp(t, a + 0.6, a + 0.9, EO) : 1 }} />
              <div style={{ position: "absolute", left: 1290 + i * 220 - 30, width: 200, top: 776, textAlign: "center", fontFamily: NUM, fontWeight: 900, fontSize: 40, color: b.c }}>{b.lab}</div>
            </React.Fragment>
          ))}
          <Num x={1580} y={760 - barH * 0.25 - 80} o={ramp(t, a + 1.8, a + 2.2, EO)} size={84} color={K.ashHi}>−75%</Num>
          <Label x={1500} y={200} o={1} size={34} color={K.sub} weight={700}>南方富裕白人家庭的财富</Label>
        </div>
      ) : null}
      <Cap at={a + 0.1} out={tSons - 0.05} lines={["1865 年，美国废奴。", ["南方富人家产没了", { t: "四分之三", c: K.gold }, "。"]]} />
      <Fine t={t} at={a + 0.6} out={tSons} y={836}>第 90 百分位的白人家庭，1860–1870 年（Ager、Boustan、Eriksson，2021）</Fine>

      {sonO > 0 ? (
        <div style={{ position: "absolute", left: 0, top: 330, width: 1920, height: 500, opacity: sonO }}>
          <Tree id="slv" t={t} nodes={famL} grow={growS} gold={(n) => (n.row === 0 ? 0 : 0)} light={(n) => (n.row === 1 ? ramp(t, tSons + 1.2, tSons + 1.8, EO) * 0.85 : 0.15)} r={(n) => (n.row ? 18 : 26)} />
          <Tree id="non" t={t} nodes={famR} grow={growS} gold={(n) => (n.row === 0 ? 1 : 0)} light={(n) => (n.row === 1 ? ramp(t, tSons + 1.2, tSons + 1.8, EO) * 0.85 : 0)} r={(n) => (n.row ? 18 : 26)} />
          <div style={{ position: "absolute", left: 560 - 300, width: 600, top: -150, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: K.ashHi, textShadow: SHADOW }}>奴隶主家</div>
          <div style={{ position: "absolute", left: 1360 - 340, width: 680, top: -150, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: K.gold, textShadow: SHADOW }}>一样有钱、没有奴隶的南方人家</div>
          {["1870 年的父亲", "1900 年的儿子"].map((l, i) => (
            <div key={l} style={{ position: "absolute", left: 960 - 130, width: 260, top: i * 180 - 22, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 32, color: K.sub }}>{l}</div>
          ))}
        </div>
      ) : null}
      <Cap at={tSons + 0.1} out={tBig - 0.05} lines={["可到 1900 年，", "奴隶主的儿子几乎追了回来。"]} />

      <Big at={tBig + 0.05} out={end - 0.05} y={380} size={100} lines={["家产都没了，", [{ t: "社会地位还在。", mark: true }]]} />
    </>
  );
};

export const _u = { FONT };
