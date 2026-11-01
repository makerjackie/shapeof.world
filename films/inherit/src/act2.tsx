// 3 金榜上的 13 个姓, 4 不只中国, 5 江南三百年 (story bars in timing.ts).
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

const CLOSE_Y = 400;
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
  const tList = a + S(0.15);
  const tLit = a + S(0.8);
  const tRatio = a + S(3);
  const tCards = a + S(4.7);
  const tTsing = tCards + S(2);
  const tClose = a + S(9.1);
  const lift = ramp(t, tCards - 0.3, tCards + 0.4, EIO);
  const ratioO = win(t, tRatio, tCards, 0.35, 0.3);
  const out = 1 - ramp(t, end - 0.35, end + 0.1, EIO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
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
          <Cap at={tRatio + 0.1} out={tCards - 0.05} lines={["是同一地区常见姓的", [{ t: "3.4 倍", num: true, c: K.gold }, "。"]]} />
        </div>
      ) : null}

      {/* the golden thread through a century of lists */}
      {t > tCards - 0.2 ? (
        <>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - 0.82 * ramp(t, tClose - 0.2, tClose + 0.3, EIO) }}>
            <path d={`M 400 220 L 400 ${220 + 560 * ramp(t, tCards, tCards + S(2.2), (x) => x)}`} stroke={K.gold} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
            <path d={`M 400 220 L 400 ${220 + 560 * ramp(t, tCards, tCards + S(2.2), (x) => x)}`} stroke={K.gold} strokeWidth={18} opacity={0.12} />
          </svg>
          {LISTS.map((l, i) => {
            const at = i === 3 ? tTsing : tCards + 0.15 + i * S(0.6);
            const g = ramp(t, at, at + 0.45, EO);
            if (g <= 0) return null;
            const y = 270 + i * 140;
            return (
              <div key={i} style={{ position: "absolute", left: 400, top: y, width: 1180, height: 112, opacity: g * (1 - 0.82 * ramp(t, tClose - 0.2, tClose + 0.3, EIO)), transform: `translateX(${(1 - g) * 40}px)` }}>
                <div style={{ position: "absolute", left: -16, top: 40, width: 32, height: 32, borderRadius: 16, background: K.gold, boxShadow: "0 0 26px rgba(240,192,98,0.8)" }} />
                <div style={{ position: "absolute", left: 50, top: 0, width: 1130, height: 112, borderRadius: 6, background: "linear-gradient(90deg, rgba(233,220,192,0.14), rgba(233,220,192,0.05))", border: "1px solid rgba(240,192,98,0.3)" }} />
                <div style={{ position: "absolute", left: 90, top: 18, fontFamily: NUM, fontWeight: 700, fontSize: 30, color: K.sub }}>{l.years}</div>
                <div style={{ position: "absolute", left: 90, top: 46, fontFamily: SERIF, fontWeight: 900, fontSize: 54, color: K.fg, textShadow: SHADOW }}>{l.what}</div>
                {/* (no surname row: one thing to read per card) */}
                                <div style={{ position: "absolute", right: 30, top: 6, fontFamily: NUM, fontWeight: 900, fontSize: 84, color: K.goldHi, textShadow: "0 0 40px rgba(240,192,98,0.4)" }}>
                  {l.x}<span style={{ fontFamily: FONT, fontSize: 40, marginLeft: 6 }}>倍</span>
                </div>
              </div>
            );
          })}
          <Cap at={tCards + 0.1} out={tTsing - 0.05} lines={["之后一百多年，", "时代换了好几次。"]} />
          <Cap at={tTsing + 0.1} out={tClose - 0.05} lines={["到 2003–2011 年的清华新生里，", ["这 13 个姓还是常见姓的 ", { t: "1.6 倍", num: true, c: K.gold }, "。"]]} />
          <Big at={tClose + 0.05} out={end - 0.05} y={CLOSE_Y} size={96} lines={["一百多年过去，", [{ t: "社会地位还在。", mark: true }]]} />
        </>
      ) : null}
    </div>
  );
};

// ---------- 4 不只中国：一个镜头，左日本、右佛罗伦萨，只说结论 ----------
export const Abroad: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.abroad);
  const end = S(SB.jn);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tR = a + 0.6;
  const tBig = a + S(1.4);
  const o = win(t, a, end, 0.3, 0.35);
  const oR = ramp(t, tR, tR + 0.4, EO) * o;
  const dim = 0.62 * ramp(t, tBig - 0.3, tBig + 0.3, EIO);
  return (
    <>
      <Photo src="img/samurai.jpg" x={120} y={80} w={810} h={700} o={o} zoom={1.04 + 0.05 * ramp(t, a, end, (x) => x)} py={26} dim={dim} />
      <Label x={525} y={140} o={o} size={44} color={K.fg} weight={900}>日本 · 武士家族</Label>
      <Label x={525} y={196} o={o} size={30} color={K.sub} weight={700}>1871 年废除武士 → 今天</Label>
      <Photo src="img/florence.jpg" x={990} y={80} w={810} h={700} o={oR} zoom={1.06 + 0.05 * ramp(t, tR, end, (x) => x)} px={55} dim={dim} />
      <Label x={1395} y={140} o={oR} size={44} color={K.fg} weight={900}>意大利 · 佛罗伦萨的富商</Label>
      <Label x={1395} y={196} o={oR} size={30} color={K.sub} weight={700}>1427 → 2011</Label>
      <Big at={tBig + 0.1} out={end - 0.05} y={360} size={92} lines={["过了一百多年、六百年，", [{ t: "他们的姓还在社会上层。", mark: true }]]} />
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
  const tCols = a + S(1.7);
  const tRev = a + S(3.8);
  const tQ = a + S(6.6);
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
          <div style={{ position: "absolute", inset: 0, background: `rgba(11,9,7,${0.2 + 0.5 * ramp(t, a + S(0.45), a + S(0.9), EIO) + 0.15 * ashK})` }} />
          <div style={{ position: "absolute", inset: 0, background: "#3a352e", opacity: 0.55 * ashK, mixBlendMode: "saturation" }} />
          <Label x={960} y={60} o={1 - ramp(t, a + S(0.45), a + S(0.8), EIO)} size={32} color={K.sub} weight={700}>徐扬《姑苏繁华图》，1759 年</Label>
        </div>
      ) : null}
      {/* population vs juren */}
      {t < tCols + 0.4 ? (
        <div style={{ position: "absolute", inset: 0, opacity: win(t, a + S(0.2), tCols + 0.2, 0.4, 0.4) }}>
          {[
            { lab: "人口", v: 2, c: K.ashHi },
            { lab: "举人", v: 22, c: K.gold },
          ].map((r, i) => {
            const g = ramp(t, a + S(0.3) + i * 0.4, a + S(0.3) + 0.8 + i * 0.4, EO);
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
      <Cap at={a + S(0.3)} out={tCols - 0.05} lines={["清初，江南几十个大族："]} />
      {/* three hundred years of columns */}
      {t > tCols - 0.2 && t < tQ + 0.4 ? (
        <div style={{ position: "absolute", inset: 0, opacity: win(t, tCols, tQ + 0.2, 0.4, 0.4) }}>
          <div style={{ position: "absolute", left: 300, right: 300, top: base, height: 2, background: "rgba(244,236,220,0.35)" }} />
          <div style={{ position: "absolute", left: 300, right: 300, top: base - unit, height: 0, borderTop: "2px dashed rgba(201,189,166,0.5)" }} />
          <div style={{ position: "absolute", left: 1640, top: base - unit - 22, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: K.sub }}>平均</div>
          {COLS5.map((c, i) => {
            const at = i === 0 ? tCols : i === 3 ? tRev + 0.8 : tCols + 0.4 + (i - 1) * S(0.6);
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
        </div>
      ) : null}
      <Cap at={tCols + 0.4} out={tRev - 0.05} lines={[["一两百年后，还是 ", { t: "4 倍", num: true, c: K.gold }, "左右。"]]} />
      <Cap at={tRev + 0.1} out={tQ - 0.05} lines={["经过清亡、战乱、革命，", "1970–80 年代才回到平均。"]} />
      <Big at={tQ + 0.05} out={end - 0.05} y={380} size={92} lines={["如果把一个家的钱，", [{ t: "一下子全拿走呢？", mark: true }]]} />
    </>
  );
};

export const _unused = { clamp01, rnd };
