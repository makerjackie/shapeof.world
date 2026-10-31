// 3 金榜上的 13 个姓 (SB 19.5–27), 4 不只中国 (SB 27–32), 5 江南三百年 (SB 32–40).
import React from "react";
import { Img, staticFile } from "remotion";
import { EIO, EO, SHADOW, clamp01, lerp, ramp, win } from "./kit";
import { FONT, K, NUM, SERIF } from "./theme";
import { S, SB } from "./timing";
import { Big, Cap, Fine, Label, Num, Photo, rnd } from "./world";

// ---------- 3 金榜 ----------
const ELITE = ["诸", "竺", "茅", "濮", "裘", "巢", "恽", "端木", "钮", "忻", "萨", "笪", "宓"];
const BIG4 = new Set(["茅", "裘", "萨", "端木"]);
const ELITE_POS = [2, 7, 11, 16, 21, 25, 29, 34, 38, 43, 47, 52, 56];
const COMMON = "王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤".split("");
// 60 columns on the list; the 13 elite surnames sit at fixed, scattered columns
const SLOTS: string[] = (() => {
  const cols: string[] = [];
  let c = 0;
  for (let i = 0; i < 60; i++) cols.push(COMMON[(i * 7 + 3) % COMMON.length]);
  ELITE_POS.forEach((p, k) => (cols[p] = ELITE[k]));
  void c;
  return cols;
})();

const Jinbang: React.FC<{ t: number; at: number; litAt: number; x: number; y: number; w: number; h: number; s: number; o: number }> = ({ t, at, litAt, x, y, w, h, s, o }) => {
  const unroll = ramp(t, at, at + 0.9, EO);
  if (o <= 0 || unroll <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `scale(${s})`, transformOrigin: "50% 0%", opacity: o }}>
      {/* the paper unrolls from right to left, as the list is read */}
      <div style={{ position: "absolute", right: 0, top: 0, width: w * unroll, height: h, overflow: "hidden", borderRadius: 4,
        background: "linear-gradient(180deg, #d9b54a 0%, #e8c860 40%, #d2a940 100%)", boxShadow: "0 30px 80px rgba(0,0,0,0.6), inset 0 0 80px rgba(120,70,10,0.45)" }}>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, rgba(120,80,10,0.08) 0 2px, transparent 2px 9px)" }} />
        <div style={{ position: "absolute", right: 0, top: 0, width: w, height: h }}>
          {SLOTS.map((ch, i) => {
            const elite = ELITE_POS.includes(i);
            const lit = elite ? ramp(t, litAt + (ELITE_POS.indexOf(i) % 13) * 0.05, litAt + 0.4 + (ELITE_POS.indexOf(i) % 13) * 0.05, EO) : 0;
            const big = elite && BIG4.has(ch) ? lit : 0;
            const tier = Math.floor(i / 30);
            const col = i % 30;
            const cw2 = (w - 120) / 30;
            const xx = w - 60 - (col + 0.5) * cw2;
            const top = 40 + tier * ((h - 80) / 2);
            const dim = elite ? 1 : 1 - 0.55 * ramp(t, litAt, litAt + 0.4, EIO);
            return (
              <div key={i} style={{ position: "absolute", left: xx - cw2 / 2, width: cw2, top, height: (h - 80) / 2 - 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: dim }}>
                <div style={{ writingMode: "vertical-rl", fontFamily: SERIF, fontWeight: 900, fontSize: 38 + 30 * big, lineHeight: 1,
                  color: lit > 0.05 ? "#7a1f12" : "rgba(40,24,6,0.85)", zIndex: 2,
                  textShadow: lit > 0.05 ? `0 0 ${18 * lit}px rgba(255,236,170,${0.95 * lit})` : undefined }}>
                  {ch}
                </div>
                {ch.length === 1
                  ? [0, 1].map((k) => (
                      <div key={k} style={{ width: 24 + rnd(i * 3 + k, 61) * 8, height: 30 + rnd(i * 3 + k, 62) * 6, borderRadius: 6,
                        background: "radial-gradient(ellipse, rgba(40,24,6,0.55) 30%, rgba(40,24,6,0.15) 70%, transparent 75%)" }} />
                    ))
                  : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LISTS = [
  { years: "1912–1949", what: "民国官员", x: "2.3" },
  { years: "1949–1988", what: "人大代表、政协委员", x: "1.8" },
  { years: "2006", what: "富豪榜", x: "1.6" },
  { years: "2003–2011", what: "清华新生", x: "1.6" },
];

export const Bang: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.bang);
  const end = S(SB.abroad);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tList = a + S(1);
  const tLit = a + S(1.5);
  const tRatio = a + S(2.6);
  const tCards = a + S(3.9);
  const tClose = a + S(6.3);
  const lift = ramp(t, tCards - 0.3, tCards + 0.4, EIO);
  const ratioO = win(t, tRatio, tCards, 0.35, 0.3);
  const out = 1 - ramp(t, end - 0.35, end + 0.1, EIO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <Big at={a + 0.05} out={tList - 0.05} y={420} size={92} lines={["钱散了，", "那家里的位置呢？"]} />
      <Label x={960} y={lerp(96, 50, lift)} o={ramp(t, tList + 0.3, tList + 0.7, EO) * (1 - lift)} size={36} color={K.sub} weight={700}>清代晚期 · 进士（1820–1905）</Label>
      <Jinbang t={t} at={tList} litAt={tLit} x={210} y={lerp(130, 40, lift)} w={1500} h={lerp(560, 560, lift)} s={lerp(1, 0.32, lift)} o={1} />
      <Cap at={tList + 0.3} out={tRatio - 0.05} lines={["清朝晚期，有 13 个罕见的姓，", "考中进士的人特别多。"]} />

      {/* ratio against three common local surnames */}
      {ratioO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: ratioO }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 130, height: 560, background: "rgba(11,9,7,0.82)" }} />
          {[
            { lab: "顾 沈 钱", sub: "同一地区的常见姓", v: 1, c: K.ashHi },
            { lab: "这 13 个姓", sub: "", v: 3.4, c: K.gold },
          ].map((r, i) => {
            const g = ramp(t, tRatio + 0.2 + i * 0.35, tRatio + 0.9 + i * 0.35, EO);
            const y = 330 + i * 170;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: 300, top: y - 34, width: 300, textAlign: "right", fontFamily: SERIF, fontWeight: 900, fontSize: 52, color: r.c, textShadow: SHADOW }}>{r.lab}</div>
                <div style={{ position: "absolute", left: 640, top: y - 26, height: 52, width: 290 * r.v * g, borderRadius: 4, background: i ? `linear-gradient(90deg, ${K.goldLo}, ${K.gold}, ${K.goldHi})` : K.ash, boxShadow: i ? "0 0 30px rgba(240,192,98,0.35)" : undefined }} />
                <div style={{ position: "absolute", left: 660 + 290 * r.v * g, top: y - 40, fontFamily: NUM, fontWeight: 900, fontSize: i ? 76 : 48, color: r.c, opacity: g, textShadow: SHADOW, whiteSpace: "nowrap" }}>{i ? "3.4 倍" : "1"}</div>
              </React.Fragment>
            );
          })}
          <Cap at={tRatio + 0.1} out={tCards - 0.05} lines={["和同一地区的常见姓比，", ["是 ", { t: "3.4 倍", num: true, c: K.gold }, "。"]]} />
        </div>
      ) : null}

      {/* the golden thread through a century of lists */}
      {t > tCards - 0.2 ? (
        <>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <path d={`M 400 220 L 400 ${220 + 560 * ramp(t, tCards, tCards + S(2.4), (x) => x)}`} stroke={K.gold} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
            <path d={`M 400 220 L 400 ${220 + 560 * ramp(t, tCards, tCards + S(2.4), (x) => x)}`} stroke={K.gold} strokeWidth={18} opacity={0.12} />
          </svg>
          {LISTS.map((l, i) => {
            const at = tCards + 0.15 + i * S(0.6);
            const g = ramp(t, at, at + 0.45, EO);
            if (g <= 0) return null;
            const y = 270 + i * 140;
            return (
              <div key={i} style={{ position: "absolute", left: 400, top: y, width: 1180, height: 112, opacity: g, transform: `translateX(${(1 - g) * 40}px)` }}>
                <div style={{ position: "absolute", left: -16, top: 40, width: 32, height: 32, borderRadius: 16, background: K.gold, boxShadow: "0 0 26px rgba(240,192,98,0.8)" }} />
                <div style={{ position: "absolute", left: 50, top: 0, width: 1130, height: 112, borderRadius: 6, background: "linear-gradient(90deg, rgba(233,220,192,0.14), rgba(233,220,192,0.05))", border: "1px solid rgba(240,192,98,0.3)" }} />
                <div style={{ position: "absolute", left: 90, top: 18, fontFamily: NUM, fontWeight: 700, fontSize: 30, color: K.sub }}>{l.years}</div>
                <div style={{ position: "absolute", left: 90, top: 52, fontFamily: SERIF, fontWeight: 900, fontSize: 46, color: K.fg, textShadow: SHADOW }}>{l.what}</div>
                {/* a row of surnames on the list, two of them lit */}
                <div style={{ position: "absolute", left: 560, top: 34, display: "flex", gap: 16, fontFamily: SERIF, fontWeight: 900, fontSize: 40 }}>
                  {Array.from({ length: 8 }, (_, j) => {
                    const lit = j === (i * 3 + 1) % 8 || j === (i * 5 + 4) % 8;
                    const ch = lit ? ELITE[(i * 4 + j) % 13].slice(0, 1) : COMMON[(i * 11 + j * 5) % COMMON.length];
                    return <span key={j} style={{ color: lit ? K.goldHi : "rgba(201,189,166,0.35)", textShadow: lit ? "0 0 16px rgba(240,192,98,0.8)" : undefined }}>{ch}</span>;
                  })}
                </div>
                <div style={{ position: "absolute", right: 30, top: 6, fontFamily: NUM, fontWeight: 900, fontSize: 84, color: K.goldHi, textShadow: "0 0 40px rgba(240,192,98,0.4)" }}>
                  {l.x}<span style={{ fontFamily: FONT, fontSize: 40, marginLeft: 6 }}>倍</span>
                </div>
              </div>
            );
          })}
          <Fine t={t} at={tCards + 0.6} out={tClose} y={836}>倍数：相对同一地区的常见姓（顾、沈、钱）</Fine>
          <Cap at={tClose + 0.05} out={end - 0.05} lines={["一百多年，换了几个时代，", [{ t: "这些姓还在前面。", c: K.gold }]]} />
        </>
      ) : null}
    </div>
  );
};

// ---------- 4 不只中国 ----------
export const Abroad: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.abroad);
  const end = S(SB.jn);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tPaper = a + S(1.1);
  const tFlo = a + S(2.5);
  const tTop = a + S(3.6);
  const samO = win(t, a, tFlo, 0.35, 0.4);
  const slide = ramp(t, tPaper - 0.2, tPaper + 0.4, EIO);
  const floO = win(t, tFlo, end, 0.45, 0.35);
  const topK = ramp(t, tTop, tTop + 0.5, EO);
  return (
    <>
      <Photo src="img/samurai.jpg" x={lerp(960 - 290, 300, slide)} y={90} w={580} h={728} o={samO} zoom={1.02 + 0.05 * ramp(t, a, tFlo, (x) => x)} py={30} />
      <Label x={lerp(960, 590, slide)} y={70} o={samO * (1 - slide)} size={34} color={K.sub} weight={700}>日本，约 1860 年代</Label>
      {/* academic papers with samurai surnames */}
      {slide > 0 ? (
        <div style={{ position: "absolute", left: 1000, top: 170, width: 640, height: 560, opacity: samO * slide }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ position: "absolute", left: k * 26, top: k * 22, width: 520, height: 470, background: "#e7ddc6", borderRadius: 3, boxShadow: "0 20px 50px rgba(0,0,0,0.55)", transform: `rotate(${(k - 1) * 2}deg)` }}>
              {k === 2
                ? Array.from({ length: 11 }, (_, j) => (
                    <div key={j} style={{ position: "absolute", left: 40, right: 40, top: 60 + j * 34, height: j === 0 ? 14 : 7, background: j === 0 ? "#3b2d1e" : "rgba(60,45,30,0.35)", borderRadius: 3, width: j === 0 ? 300 : undefined }} />
                  ))
                : null}
            </div>
          ))}
          <Num x={330} y={300} o={ramp(t, tPaper + 0.5, tPaper + 0.9, EO)} size={150}>4 倍多</Num>
        </div>
      ) : null}
      <Cap at={a + 0.15} out={tPaper - 0.05} lines={["1871 年，日本武士交出佩刀。"]} />
      <Cap at={tPaper + 0.1} out={tFlo - 0.05} lines={["一百多年后的论文作者里，", ["罕见的武士姓仍是平均的 ", { t: "4 倍多", c: K.gold }, "。"]]} />

      {/* Florence, about 1470 */}
      <Photo src="img/florence.jpg" x={110} y={90} w={1700} h={735} o={floO} zoom={1.04 + 0.06 * ramp(t, tFlo, end, (x) => x)} px={lerp(40, 60, ramp(t, tFlo, end, (x) => x))} dim={0.45 * topK} />
      {topK > 0
        ? [0, 1, 2, 3, 4].map((i) => {
            const old = [0, 2, 3].includes(i);
            const g = ramp(t, tTop + 0.1 + i * 0.1, tTop + 0.5 + i * 0.1, EO);
            const x = 960 - 2 * 300 + i * 300;
            return (
              <div key={i} style={{ position: "absolute", left: x - 125, top: 360, width: 250, height: 170, borderRadius: 8, opacity: g * floO,
                background: old ? `linear-gradient(180deg, ${K.goldHi}, ${K.gold} 60%, ${K.goldLo})` : "rgba(233,220,192,0.16)", border: `2px solid ${old ? K.goldHi : "rgba(233,220,192,0.4)"}`,
                boxShadow: old ? "0 0 40px rgba(240,192,98,0.45)" : undefined, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 30, color: old ? "#3b2a10" : K.sub }}>第 {i + 1} 名</div>
                <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, marginTop: 10, color: old ? "#3b2a10" : "rgba(201,189,166,0.6)" }}>{old ? "1427 · 前 6%" : "—"}</div>
              </div>
            );
          })
        : null}
      <Label x={960} y={290} o={topK * floO} size={40} color={K.fg}>2011 年，佛罗伦萨收入最高的 5 个姓</Label>
      <Label x={960} y={60} o={floO * (1 - topK)} size={32} color={K.sub} weight={700}>佛罗伦萨，约 1470 年</Label>
      <Cap at={tFlo + 0.1} out={tTop - 0.05} lines={["意大利佛罗伦萨，", "把 600 年前的税册对上今天。"]} />
      <Cap at={tTop + 0.2} out={end - 0.05} lines={["今天收入最高的 5 个姓里，", ["有 3 个在 1427 年就排", { t: "全城前 6%", c: K.gold }, "。"]]} />
    </>
  );
};

// ---------- 5 江南三百年 ----------
const COLS5 = [
  { yr: "1645–1690", v: 10.6, lab: "11 倍", ash: false },
  { yr: "1781–1810", v: 4.2, lab: "4.2 倍", ash: false },
  { yr: "1871–1900", v: 3.7, lab: "3.7 倍", ash: false },
  { yr: "1973–1989", v: 1.03, lab: "约 1 倍", ash: true },
];

export const Jiangnan: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.jn);
  const end = S(SB.reform);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tCols = a + S(2.3);
  const tRev = a + S(4.6);
  const tQ = a + S(6.9);
  const scrollO = win(t, a, tQ + 0.2, 0.6, 0.5);
  const pan = ramp(t, a, tQ, (x) => x);
  const ashK = ramp(t, tRev, tRev + 1.2, EIO);
  const scaleH = 1080 / 1010;
  const wImg = 8900 * scaleH;
  const x0 = -lerp(400, 3400, pan);
  const H = 620;
  const base = 790;
  const unit = (H - 120) / 10.6;
  return (
    <>
      {scrollO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: scrollO }}>
          <Img src={staticFile("img/suzhou.jpg")} style={{ position: "absolute", left: x0, top: 0, width: wImg, height: 1080 }} />
          <div style={{ position: "absolute", inset: 0, background: `rgba(11,9,7,${0.2 + 0.5 * ramp(t, a + S(0.8), a + S(1.6), EIO) + 0.15 * ashK})` }} />
          <div style={{ position: "absolute", inset: 0, background: "#3a352e", opacity: 0.55 * ashK, mixBlendMode: "saturation" }} />
          <Label x={960} y={60} o={1 - ramp(t, a + S(0.8), a + S(1.4), EIO)} size={32} color={K.sub} weight={700}>徐扬《姑苏繁华图》，1759 年</Label>
        </div>
      ) : null}
      {/* population vs juren */}
      {t < tCols + 0.4 ? (
        <div style={{ position: "absolute", inset: 0, opacity: win(t, a + S(0.8), tCols + 0.2, 0.4, 0.4) }}>
          {[
            { lab: "人口", v: 2, c: K.ashHi },
            { lab: "举人", v: 22, c: K.gold },
          ].map((r, i) => {
            const g = ramp(t, a + S(0.9) + i * 0.4, a + S(0.9) + 0.8 + i * 0.4, EO);
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: 360, top: 330 + i * 170, width: 200, textAlign: "right", fontFamily: SERIF, fontWeight: 900, fontSize: 56, color: r.c, textShadow: SHADOW }}>{r.lab}</div>
                <div style={{ position: "absolute", left: 600, top: 340 + i * 170, height: 56, width: 44 * r.v * g, background: i ? `linear-gradient(90deg, ${K.goldLo}, ${K.gold}, ${K.goldHi})` : K.ashHi, borderRadius: 4 }} />
                <div style={{ position: "absolute", left: 620 + 44 * r.v * g, top: 318 + i * 170, fontFamily: NUM, fontWeight: 900, fontSize: 84, color: r.c, opacity: g, textShadow: SHADOW }}>{r.v}%</div>
              </React.Fragment>
            );
          })}
          <Label x={960} y={220} o={1} size={40} color={K.fg}>清初江南几十个大族</Label>
        </div>
      ) : null}
      <Cap at={a + S(0.85)} out={tCols - 0.05} lines={["清朝初年，江南几十个大族，", ["人口只占 ", { t: "2%", num: true, c: K.ashHi }, "，举人却占了 ", { t: "22%", num: true, c: K.gold }, "。"]]} />
      {/* three hundred years of columns */}
      {t > tCols - 0.2 && t < tQ + 0.4 ? (
        <div style={{ position: "absolute", inset: 0, opacity: win(t, tCols, tQ + 0.2, 0.4, 0.4) }}>
          <div style={{ position: "absolute", left: 300, right: 300, top: base, height: 2, background: "rgba(244,236,220,0.35)" }} />
          <div style={{ position: "absolute", left: 300, right: 300, top: base - unit, height: 0, borderTop: "2px dashed rgba(201,189,166,0.5)" }} />
          <div style={{ position: "absolute", left: 1640, top: base - unit - 22, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: K.sub }}>平均</div>
          {COLS5.map((c, i) => {
            const at = i === 0 ? tCols : i === 3 ? tRev + 0.8 : tCols + 0.5 + (i - 1) * S(0.9);
            const g = ramp(t, at, at + 0.7, EO);
            const x = 470 + i * 330;
            const h = unit * c.v * g;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: x - 60, top: base - h, width: 120, height: h, borderRadius: "6px 6px 0 0",
                  background: c.ash ? K.ash : `linear-gradient(180deg, ${K.goldHi}, ${K.gold} 30%, ${K.goldLo})`, boxShadow: c.ash ? undefined : "0 0 40px rgba(240,192,98,0.35)", opacity: g > 0 ? 1 : 0 }} />
                <div style={{ position: "absolute", left: x - 150, width: 300, top: base - h - 82, textAlign: "center", fontFamily: NUM, fontWeight: 900, fontSize: 58, color: c.ash ? K.ashHi : K.goldHi, opacity: g, textShadow: SHADOW }}>{c.lab}</div>
                <div style={{ position: "absolute", left: x - 150, width: 300, top: base + 16, textAlign: "center", fontFamily: NUM, fontWeight: 700, fontSize: 30, color: K.sub, opacity: g }}>{c.yr}</div>
              </React.Fragment>
            );
          })}
          {/* what lay between 1900 and the 1970s */}
          {["清亡", "战乱", "革命"].map((w, i) => {
            const g = ramp(t, tRev + i * 0.25, tRev + 0.4 + i * 0.25, EO);
            return <div key={w} style={{ position: "absolute", left: 1185 + i * 95, top: base - 330, width: 90, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 32, color: K.fg, opacity: g, textShadow: SHADOW }}>{w}</div>;
          })}
          <Fine t={t} at={tCols + 0.3} out={tQ} y={base + 60}>倍数：考中举人的比例，相对这些姓在人口里的份额（苏南）</Fine>
        </div>
      ) : null}
      <Cap at={tCols + 0.4} out={tRev - 0.05} lines={[["一百年后，还是平均的 ", { t: "4.2 倍", num: true, c: K.gold }, "。"], ["两百年后，", { t: "3.7 倍", num: true, c: K.gold }, "，几乎没动。"]]} />
      <Cap at={tRev + 0.1} out={tQ - 0.05} lines={["又经过清朝灭亡、战乱和革命，", "到 1970–80 年代，才回到平均。"]} />
      <Big at={tQ + 0.05} out={end - 0.05} y={380} size={92} lines={["那如果，", "把一个家的钱一下子拿光呢？"]} />
    </>
  );
};

export const _unused = { clamp01, rnd };
