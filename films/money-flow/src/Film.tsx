// The full film: the town (three.js) under the type, receipts, labels, counters and the sound.
// Numbers and sources: private/videos/money-flow/LEDGER.md §8.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EndCard, EO, Part, ramp, Say, Sources, SHADOW, Tag, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { FPS, T, dayAt } from "./timing";
import { TownView } from "./TownView";
import { project } from "./world/camera";
import { nodePos, personPos, TECH_TOWERS, v3, PLACE, HILL_Y } from "./world/layout";
import { FLOWS, RIVER, SALES, TECH, WEALTH, yearAt, salesAt } from "./world/flows";

type Line = { p: Part[]; size?: number; color?: string; weight?: number };
type Cap = { at: number; out: number; lines: Line[]; x: number; y: number; align?: "left" | "center" | "right" };

const L = 110;
const R = 1810;
const big = (t: string, s = 1.45): Part => ({ t, num: true, c: K.gold, s });
const sub = (t: string): Line => ({ p: [t], size: 42, color: K.sub, weight: 700 });
const { c1, c2, c3, c4, c5, c6, c7, c8, c9 } = T;
const W0 = T.wave;

// ---------------------------------------------------------------- captions
const CAPS: Cap[] = [
  // hook
  { at: 0.4, out: 4.4, x: L, y: 250, lines: [{ p: ["你在街边小馆吃了顿饭"], size: 64 }, sub("付了 100 块")] },
  { at: 4.6, out: c1 - 0.2, x: 960, y: 230, align: "center", lines: [{ p: ["这 100 块，最后去了", { t: "谁的口袋", mark: true }, "？"], size: 80 }] },
  // 1 the bill
  { at: c1 + 0.3, out: c1 + 4.4, x: R, y: 230, align: "right", lines: [{ p: ["先看第一站：老板的钱箱"], size: 60 }] },
  { at: c1 + 22.4, out: c1 + 27.8, x: 960, y: 840, align: "center", lines: [{ p: ["老板，是", { t: "最后", mark: true }, "拿钱的人"], size: 64 }] },
  { at: c1 + 28.0, out: c1 + 34.0, x: 960, y: 800, align: "center", lines: [{ p: ["房东每个月先拿走一份"], size: 62 }, { p: ["生意好不好，房租都得付"], size: 52, color: K.sub }] },
  { at: c1 + 34.2, out: c2 - 0.2, x: 960, y: 840, align: "center", lines: [{ p: ["这 100 块，一下子分给了 ", big("7", 1.3), " 拨人"], size: 64 }] },
  // 2 every share keeps moving
  { at: c2 + 0.3, out: c2 + 4.4, x: 960, y: 840, align: "center", lines: [{ p: ["可这些钱，没有停下"], size: 64 }] },
  { at: c2 + 4.6, out: c2 + 9.6, x: L, y: 230, lines: [{ p: ["服务员：月薪约 ", big("4500", 1.25), " 元"], size: 60 }, sub("人工那份钱，跟着她回了家")] },
  { at: c2 + 9.8, out: c2 + 13.6, x: L, y: 230, lines: [{ p: ["房租、吃饭、寄回老家"], size: 60 }, { p: ["很快又", { t: "花了出去", mark: true }], size: 60 }] },
  { at: c2 + 14.4, out: c2 + 20.4, x: R, y: 230, align: "right", lines: [{ p: ["菜市场收到的钱，又拆一次"], size: 60 }, sub("菜农、司机、摊主……")] },
  { at: c2 + 21.2, out: c2 + 26.8, x: L, y: 230, lines: [{ p: ["房东如果还在还房贷"], size: 60 }, { p: ["房租又流进了", { t: "银行", mark: true }], size: 60 }] },
  { at: c2 + 27.6, out: c2 + 33.0, x: L, y: 230, lines: [{ p: ["外卖平台的钱：一部分付给骑手"], size: 58 }, { p: ["一部分是利润，归", { t: "股东", mark: true }], size: 58 }] },
  { at: c2 + 33.2, out: c2 + 36.6, x: 960, y: 830, align: "center", lines: [{ p: ["每到一站，钱都分成两种"], size: 64 }] },
  { at: c2 + 36.8, out: c3 - 0.2, x: 960, y: 760, align: "center", lines: [{ p: ["一种发给干活的人"], size: 62 }, { p: ["一种归", { t: "拥有东西的人", mark: true }], size: 62 }, sub("店、房子、地、公司、存款")] },
  // 3 the whole country
  { at: c3 + 0.4, out: c3 + 4.4, x: 960, y: 830, align: "center", lines: [{ p: ["放大到全国"], size: 66 }] },
  { at: c3 + 12.4, out: c3 + 16.4, x: R, y: 220, align: "right", lines: [{ p: ["你的工资，是别人花出来的钱"], size: 60 }] },
  { at: c3 + 16.6, out: c3 + 21.4, x: R, y: 220, align: "right", lines: [{ p: ["你花出去的钱，又成了别人的收入"], size: 60 }] },
  { at: c3 + 21.6, out: c4 - 0.2, x: R, y: 220, align: "right", lines: [{ p: ["钱就这样，", { t: "一圈一圈", mark: true }, "地转"], size: 64 }] },
  // 4 where it stops
  { at: c4 + 0.4, out: c4 + 3.8, x: 960, y: 170, align: "center", lines: [{ p: ["转了一圈又一圈，钱停在了哪？"], size: 64 }] },
  { at: c4 + 4.0, out: c4 + 10.6, x: L, y: 150, lines: [{ p: ["收入低的家庭，挣的几乎都要花掉"], size: 56 }, sub("2014 年，约 4 成家庭这一年花的比挣的多")] },
  { at: c4 + 10.8, out: c4 + 18.0, x: R, y: 150, align: "right", lines: [{ p: ["收入最高的 5% 家庭"], size: 56 }, { p: ["存下了全国家庭储蓄的", { t: "一半", mark: true }], size: 60 }] },
  { at: c4 + 18.4, out: c4 + 24.6, x: 960, y: 150, align: "center", lines: [{ p: ["一年年攒下来，就是财富"], size: 62 }, sub("房子、存款、股份……")] },
  { at: c4 + 24.8, out: c5 - 0.2, x: 960, y: 130, align: "center", lines: [{ p: ["城镇最富的 10% 家庭，拥有全部家庭资产的 ", big("47.5%", 1.3)], size: 54 }, { p: ["最穷的 20% 家庭，只有 ", { t: "2.6%", num: true }], size: 50, color: K.sub }] },
  // 5 the house
  { at: c5 + 0.4, out: c5 + 4.6, x: L, y: 230, lines: [{ p: ["对大多数家庭"], size: 56, color: K.sub }, { p: ["最大的一笔钱，流向", { t: "房子", mark: true }], size: 62 }] },
  { at: c5 + 4.8, out: c5 + 11.4, x: L, y: 230, lines: [{ p: ["今天贷 100 万买房，还 30 年"], size: 58 }, { p: ["光利息，约 ", big("54"), " 万"], size: 62 }] },
  { at: c5 + 11.6, out: c5 + 15.2, x: L, y: 230, lines: [{ p: ["这笔贷款，又是从哪来的？"], size: 60 }] },
  { at: c5 + 15.4, out: c5 + 20.4, x: L, y: 230, lines: [{ p: ["银行放一笔贷款"], size: 60 }, { p: ["世上就多出一笔", { t: "新钱", c: K.loan }], size: 60 }] },
  { at: c5 + 20.6, out: c5 + 26.2, x: L, y: 230, lines: [{ p: ["2018 年，银行新放出的贷款"], size: 56, color: K.sub }, { p: ["每 100 元，约 ", big("40"), " 元流向房地产"], size: 60 }] },
  { at: c5 + 26.4, out: c6 - 0.3, x: L, y: 230, lines: [{ p: ["你还的利息流进银行"], size: 58 }, { p: ["再付给存钱的人：", { t: "存得越多，拿得越多", mark: true }], size: 58 }] },
  // 6 the waves
  { at: c6 + 0.2, out: W0 - 0.1, x: 960, y: 420, align: "center", lines: [{ p: ["那些一下子变富的人呢？"], size: 76 }] },
  { at: W0 + 0.1, out: RIVER.a + 0.2, x: 960, y: 420, align: "center", lines: [{ p: ["很多人，是赶上了一波", { t: "浪潮", mark: true }], size: 72 }] },
  { at: RIVER.a + 0.4, out: RIVER.a + 5.4, x: L, y: 600, lines: [{ p: ["1998 年，全国一年买新房"], size: 54, color: K.sub }, { p: ["花约 ", big("2500"), " 亿"], size: 62 }] },
  { at: RIVER.a + 5.6, out: RIVER.peak - 0.1, x: L, y: 600, lines: [{ p: ["钱像河一样流进房子"], size: 60 }, sub("房子越盖越多，越卖越贵")] },
  { at: RIVER.peak + 0.1, out: RIVER.peak + 3.2, x: L, y: 600, lines: [{ p: ["2021 年：约 ", big("18.2"), " 万亿"], size: 62 }, sub("二十多年，涨了 70 多倍")] },
  { at: RIVER.peak + 3.4, out: RIVER.hold, x: L, y: 600, lines: [{ p: ["早买房的人、开发商、卖地的地方政府"], size: 54 }, { p: ["接住了这条河"], size: 62 }] },
  { at: RIVER.hold + 0.2, out: RIVER.hold + 3.0, x: L, y: 600, lines: [{ p: ["浪潮，也会", { t: "退", mark: true }], size: 66 }] },
  { at: RIVER.hold + 3.2, out: RIVER.b + 0.8, x: L, y: 600, lines: [{ p: ["2025 年，只剩约 ", big("8.4", 1.3), " 万亿"], size: 58 }, sub("房价从 2021 年的高点，跌了约两成")] },
  { at: RIVER.b + 1.0, out: TECH.a - 0.2, x: L, y: 600, lines: [{ p: ["胡润百富榜：1999 年，约一半上榜者做房地产"], size: 50 }, { p: ["2025 年的前 100 名，只剩 ", big("1", 1.3), " 位"], size: 58 }] },
  { at: TECH.a + 0.3, out: TECH.a + 5.4, x: L, y: 230, lines: [{ p: ["新的浪潮一波接一波"], size: 60 }, sub("手机、互联网、电池、芯片……")] },
  { at: TECH.a + 5.6, out: TECH.a + 11.2, x: L, y: 230, lines: [{ p: ["每一波里，赚得最多的"], size: 58 }, { p: ["是", { t: "最早拥有它", mark: true }, "的人"], size: 62 }, sub("创始人、早期股东")] },
  { at: TECH.a + 11.4, out: c7 - 0.3, x: L, y: 230, lines: [{ p: ["浪潮里的钱，也是千千万万人"], size: 58 }, { p: ["一笔一笔", { t: "花出来的", mark: true }], size: 62 }] },
  // 7 the world
  { at: c7 + 0.4, out: c7 + 3.4, x: 960, y: 140, align: "center", lines: [{ p: ["放大到全世界"], size: 66 }] },
  { at: c7 + 3.6, out: c7 + 9.8, x: 960, y: 140, align: "center", lines: [{ p: ["最富的 10% 的人，拥有约 ", big("75%", 1.35), " 的财富"], size: 60 }] },
  { at: c7 + 10.0, out: c8 - 0.3, x: 960, y: 140, align: "center", lines: [{ p: ["最穷的一半人，只有约 ", { t: "2%", num: true, c: K.loan, s: 1.35 }], size: 60 }] },
  // 8 but
  { at: c8 + 0.4, out: c8 + 4.4, x: L, y: 230, lines: [{ p: ["拥有东西，就稳赚吗？"], size: 64 }] },
  { at: c8 + 4.6, out: c8 + 10.8, x: L, y: 230, lines: [{ p: ["生意不好，房租照交"], size: 60 }, { p: ["老板最后拿钱，也", { t: "最先赔钱", c: K.red }], size: 60 }] },
  { at: c8 + 11.0, out: c8 + 17.4, x: L, y: 230, lines: [{ p: ["2021 年高点买房的人"], size: 60 }, { p: ["房价跌了约两成，", { t: "房贷一分没少", c: K.red }], size: 58 }] },
  { at: c8 + 17.6, out: c9 - 0.3, x: 960, y: 840, align: "center", lines: [{ p: ["拥有东西，也是在扛风险"], size: 64 }] },
  // 9 ending
  { at: c9 + 6.0, out: c9 + 11.8, x: 960, y: 840, align: "center", lines: [{ p: ["你挣的每一块钱，都是别人花出来的"], size: 62 }] },
  { at: c9 + 12.0, out: c9 + 17.9, x: 960, y: 840, align: "center", lines: [{ p: ["你花出去的，又成了别人的收入"], size: 62 }] },
  { at: T.last, out: T.sources - 0.2, x: 960, y: 470, align: "center", lines: [{ p: ["这 100 块，你只", { t: "握了一会儿", mark: true }], size: 84 }] },
];

const Captions: React.FC<{ t: number }> = ({ t }) => (
  <>
    {CAPS.map((c, i) => {
      if (t < c.at - 0.1 || t > c.out + 0.4) return null;
      let delay = 0;
      return (
        <div key={i} style={{ position: "absolute", left: c.align === "center" ? 0 : c.align === "right" ? 0 : c.x, width: c.align ? (c.align === "center" ? 1920 : c.x) : undefined, top: c.y, textAlign: c.align ?? "left", display: "flex", flexDirection: "column", alignItems: c.align === "center" ? "center" : c.align === "right" ? "flex-end" : "flex-start", gap: 10 }}>
          {c.lines.map((ln, j) => {
            const at = c.at + delay;
            delay += Math.min(0.9, 0.25 + Array.from(ln.p.map((p) => (typeof p === "string" ? p : p.t)).join("")).length * 0.03);
            return <Say key={j} at={at} out={c.out} parts={ln.p} size={ln.size ?? 60} color={ln.color} weight={ln.weight} />;
          })}
        </div>
      );
    })}
  </>
);

// ---------------------------------------------------------------- receipts: the split, printed line by line
type Row = { l: string; v: string; at: number; note?: string };
const Receipt: React.FC<{ t: number; at: number; out: number; x: number; y: number; title: string; sub?: string; rows: Row[]; foot?: string; w?: number }> = ({ t, at, out, x, y, title, sub: subt, rows, foot, w = 470 }) => {
  const o = win(t, at, out, 0.5, 0.6);
  if (o <= 0) return null;
  const shown = rows.filter((r) => t >= r.at - 0.05).length;
  const grow = ramp(t, at, at + 0.6, EO);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: o, transform: `translateY(${(1 - grow) * 30}px) rotate(-1.2deg) scale(0.86)`, transformOrigin: "top left" }}>
      <div style={{ background: "#f7f3ea", color: "#22201c", borderRadius: "6px 6px 0 0", padding: "26px 30px 18px", boxShadow: "0 22px 50px rgba(0,0,0,0.45)", fontFamily: FONT }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2, textAlign: "center" }}>{title}</div>
        {subt ? <div style={{ fontSize: 22, fontWeight: 600, color: "#6d675c", textAlign: "center", marginTop: 4 }}>{subt}</div> : null}
        <div style={{ borderTop: "3px dashed #b9b2a3", margin: "16px 0 10px" }} />
        {rows.slice(0, shown).map((r, i) => {
          const k = ramp(t, r.at, r.at + 0.35, EO);
          return (
            <div key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * -8}px)`, padding: "5px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 34, fontWeight: 800 }}>
                <span>{r.l}</span>
                <span style={{ fontFamily: NUM, fontWeight: 900, fontSize: 38, color: "#9a5b00" }}>{r.v}</span>
              </div>
              {r.note ? <div style={{ fontSize: 22, fontWeight: 600, color: "#7a7366", marginTop: 2 }}>{r.note}</div> : null}
            </div>
          );
        })}
        {foot && shown === rows.length ? (
          <>
            <div style={{ borderTop: "3px dashed #b9b2a3", margin: "10px 0 8px" }} />
            <div style={{ fontSize: 20, fontWeight: 600, color: "#7a7366", lineHeight: 1.45, opacity: ramp(t, rows[rows.length - 1].at + 0.3, rows[rows.length - 1].at + 0.8) }}>{foot}</div>
          </>
        ) : null}
      </div>
      {/* torn bottom edge */}
      <svg width={w} height={16} style={{ display: "block" }}>
        <path d={`M0 0 ${Array.from({ length: Math.ceil(w / 20) }, (_, i) => `L${i * 20 + 10} 14 L${i * 20 + 20} 0`).join(" ")} Z`} fill="#f7f3ea" />
      </svg>
    </div>
  );
};

const Receipts: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Receipt
      t={t}
      at={c1 + 4.4}
      out={c1 + 34}
      x={48}
      y={140}
      title="小馆 · 这 100 块"
      sub="餐饮企业平均成本占比（2024）"
      rows={[
        { l: "食材", v: "42.1", at: c1 + 5.0 },
        { l: "人工", v: "22.2", at: c1 + 8.4 },
        { l: "房租物业", v: "9.7", at: c1 + 11.6 },
        { l: "外卖平台", v: "4.5", at: c1 + 14.6 },
        { l: "水电燃气", v: "3.6", at: c1 + 17.0 },
        { l: "税费", v: "1.8", at: c1 + 19.2 },
        { l: "其余", v: "16.1", at: c1 + 21.4, note: "装修、营销、杂费……扣完才是利润" },
      ]}
    />
    <Receipt
      t={t}
      at={c3 + 4.4}
      out={c3 + 16.2}
      x={70}
      y={170}
      title="全国 · 每生产 100 元"
      sub="2023 年"
      rows={[
        { l: "工资（含社保）", v: "53", at: c3 + 5.0 },
        { l: "税", v: "8", at: c3 + 6.2 },
        { l: "企业和资本", v: "39", at: c3 + 7.2, note: "含折旧" },
      ]}
    />
    <Receipt
      t={t}
      at={c3 + 16.6}
      out={c4 - 0.3}
      x={70}
      y={150}
      title="全国居民 · 每花 100 元"
      sub="2024 年"
      rows={[
        { l: "吃", v: "29.8", at: c3 + 17.2 },
        { l: "住", v: "22.2", at: c3 + 17.9 },
        { l: "交通、通信", v: "14.1", at: c3 + 18.6 },
        { l: "教育、文化、娱乐", v: "11.3", at: c3 + 19.3 },
        { l: "看病", v: "9.0", at: c3 + 20.0 },
        { l: "穿、日用和其他", v: "13.6", at: c3 + 20.7 },
      ]}
      foot="每一笔，都成了别人的收入"
    />
  </>
);

// ---------------------------------------------------------------- labels
const NAME: Record<string, string> = {
  market: "菜市场",
  staff: "厨师和服务员",
  landlord: "房东",
  platform: "外卖平台",
  power: "电和燃气",
  gov: "政府",
  bank: "银行",
  farmer: "",
  driver: "",
  vendor: "",
  rider: "",
  owners: "",
  waiter: "",
  home: "",
  couple: "",
  dev: "开发商",
  devLand: "地方政府",
  hill: "存钱的人",
};
const FlowTags: React.FC<{ t: number }> = ({ t }) => (
  <>
    {FLOWS.map((f, i) => {
      if (!f.label) return null;
      const first = f.t0 + (f.dur ?? 2.2) * 0.85;
      const o = win(t, first, f.labelOut ?? first + 5, 0.4, 0.5);
      if (o <= 0) return null;
      const p = nodePos(f.to);
      const pr = project(t, v3(p, 2.6 * (f.size ?? 1)));
      if (!pr.vis) return null;
      const nm = NAME[f.to];
      return (
        <Tag key={i} x={pr.x} y={pr.y} o={o} line size={34} color={K.fg}>
          {nm ? <span style={{ fontSize: 26, color: K.sub, display: "block", textAlign: "center" }}>{nm}</span> : null}
          <span style={{ color: f.col === "loan" ? K.loan : K.goldHi }}>{f.label}</span>
        </Tag>
      );
    })}
  </>
);

type Lab = { text: string; at: [number, number, number]; a: number; b: number; color?: string; size?: number };
const pp = (id: string, dy = 2.6): [number, number, number] => {
  const p = personPos(id);
  return [p[0], p[1] + dy, p[2]];
};
const LABS: Lab[] = [
  { text: "你", at: pp("you", 1.9), a: 1.2, b: 7.4 },
  { text: "老板", at: pp("boss", 2.5), a: 7.8, b: c1 + 4.4 },
  { text: "小馆", at: [0, 3.9, 1.6], a: 1.2, b: 7.4, color: K.goldHi },
  { text: "服务员", at: pp("waiterHome", 2.7), a: c2 + 4.4, b: c2 + 13.4 },
  { text: "银行", at: [PLACE.bank[0], 12, PLACE.bank[2]], a: c2 + 21.6, b: c2 + 26.6 },
  { text: "骑手", at: pp("rider", 2.6), a: c2 + 27.6, b: c2 + 33 },
  // country
  { text: "住户", at: [0, 7, 30], a: c3 + 5.2, b: c3 + 12, color: K.goldHi },
  { text: "政府", at: [PLACE.gov[0], 11, PLACE.gov[2]], a: c3 + 6.6, b: c3 + 12 },
  { text: "企业和资本", at: [24, 12, -32], a: c3 + 7.6, b: c3 + 12 },
  // house
  { text: "买房的人", at: pp("coupleA", 2.7), a: c5 + 0.8, b: c5 + 7.2 },
  { text: "银行", at: [PLACE.bank[0], 12, PLACE.bank[2]], a: c5 + 7.8, b: c5 + 26 },
  { text: "新楼盘", at: [PLACE.dev[0] - 2, 14, PLACE.dev[2]], a: c5 + 16, b: c5 + 26 },
  { text: "存钱的人", at: [PLACE.hill[0] - 6, HILL_Y + 7, PLACE.hill[2]], a: c5 + 26.8, b: c6 - 0.3 },
  // waves
  { text: "新楼盘", at: [PLACE.dev[0] - 2, 26, PLACE.dev[2]], a: RIVER.a + 0.4, b: RIVER.end },
  ...TECH_TOWERS.map((tw, i) => ({ text: tw.name, at: [tw.x, 3.2 * 5.5 * tw.h * 0.98 + 1.5, tw.z] as [number, number, number], a: TECH.a + 1.2 + i * 0.6, b: TECH.b - 0.4, color: K.goldHi })),
  // but
  { text: "老板", at: pp("boss", 2.5), a: c8 + 1.6, b: c8 + 5.2 },
  { text: "房东", at: pp("landlord", 2.8), a: c8 + 6, b: c8 + 10.6 },
  { text: "2021 年买房的人", at: [PLACE.dev[0], 24, PLACE.dev[2] + 2], a: c8 + 12.8, b: c8 + 17.6 },
  // ending
  { text: "你", at: pp("you", 1.9), a: c9 + 1.0, b: c9 + 5.4 },
];
const Labels: React.FC<{ t: number }> = ({ t }) => (
  <>
    {LABS.map((l, i) => {
      const o = win(t, l.a, l.b, 0.45, 0.45);
      if (o <= 0) return null;
      const p = project(t, new THREE.Vector3(...l.at));
      if (!p.vis) return null;
      return (
        <Tag key={i} x={p.x} y={p.y} o={o} line size={l.size ?? 34} color={l.color}>
          {l.text}
        </Tag>
      );
    })}
  </>
);

// the ten households: who they are, and their share once the columns stand
const Deciles: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, c4 + 2.6, c8 + 0.4, 0.6, 0.6);
  if (o <= 0) return null;
  const at = (i: number, dy: number) => project(t, v3(nodePos(`d${i}`), dy));
  const china = win(t, WEALTH.grow + 3.4, WEALTH.world - 0.2, 0.5, 0.4);
  const world = ramp(t, WEALTH.world + 3.4, WEALTH.world + 4.0);
  const tag = (i: number, dy: number, text: React.ReactNode, k: number, color: string = K.goldHi, size = 40) => {
    const p = at(i, dy);
    return k > 0 && p.vis ? (
      <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%, -100%)", opacity: k, fontFamily: NUM, fontWeight: 900, fontSize: size, color, textShadow: SHADOW, whiteSpace: "nowrap" }}>{text}</div>
    ) : null;
  };
  const span = (i0: number, i1: number, text: string, k: number, color: string) => {
    const a = at(i0, -0.2);
    const b = at(i1, -0.2);
    if (k <= 0) return null;
    return (
      <div style={{ position: "absolute", left: a.x - 30, top: a.y + 74, width: b.x - a.x + 60, opacity: k, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT, fontWeight: 800, fontSize: 32, color, textShadow: SHADOW }}>
        <div style={{ width: "100%", height: 10, borderLeft: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderBottom: `3px solid ${color}` }} />
        <div style={{ marginTop: 6, whiteSpace: "nowrap" }}>{text}</div>
      </div>
    );
  };
  const p0 = at(0, -0.2);
  const p9 = at(9, -0.2);
  const h9c = 47.5 * 2 * 0.07 * 2.0 + 1.0;
  const h9w = 75 * 2 * 0.07 * 2.0 + 1.0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {p0.vis ? <div style={{ position: "absolute", left: p0.x, top: p0.y + 18, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 30, color: K.fg, textShadow: SHADOW, whiteSpace: "nowrap" }}>收入最低的 10%</div> : null}
      {p9.vis ? <div style={{ position: "absolute", left: p9.x, top: p9.y + 18, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 30, color: K.goldHi, textShadow: SHADOW, whiteSpace: "nowrap" }}>最高的 10%</div> : null}
      {tag(9, h9c, "47.5%", china)}
      {span(0, 1, "2.6%", china, K.loan)}
      {tag(9, h9w, "约 75%", world, K.goldHi, 46)}
      {span(5, 8, "中间 40%：约 23%", world, K.fg)}
      {span(0, 4, "最穷的一半：约 2%", world, K.loan)}
    </div>
  );
};

// chapter 5: thirty years of payments
const LoanClock: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, c5 + 5.0, c5 + 11.4, 0.5, 0.5);
  if (o <= 0) return null;
  const k = ramp(t, c5 + 5.4, c5 + 10.4);
  return (
    <div style={{ position: "absolute", right: 110, top: 220, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <div style={{ fontSize: 40, fontWeight: 800 }}>
        第 <span style={{ fontFamily: NUM, fontSize: 64, color: K.fg }}>{Math.max(1, Math.round(30 * k))}</span> 年
      </div>
      <div style={{ fontSize: 40, fontWeight: 800 }}>
        已付利息 <span style={{ fontFamily: NUM, fontSize: 76, color: K.gold }}>{(53.7 * (1 - Math.pow(1 - k, 1.6))).toFixed(1)}</span> 万
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: K.sub }}>利率 3.1%，等额本息</div>
    </div>
  );
};

// chapter 6: the money poured into new homes each year, 1998–2025
const WaveChart: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, RIVER.a - 0.4, TECH.a - 0.4, 0.6, 0.6);
  if (o <= 0) return null;
  const y = yearAt(t);
  const X0 = 1010;
  const Y0 = 330;
  const w = 800;
  const h = 210;
  const px = (yr: number) => X0 + ((yr - 1998) / 27) * w;
  const py = (v: number) => Y0 - (v / 190000) * h;
  const pts = SALES.filter(([yr]) => yr <= Math.floor(y)).map(([yr, v]) => [px(yr), py(v)] as [number, number]);
  if (y > 1998) pts.push([px(y), py(salesAt(y))]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)} ${Y0} L${X0} ${Y0} Z` : "";
  const head = pts[pts.length - 1] ?? [px(1998), py(2513)];
  const v = salesAt(y);
  const vs = v >= 10000 ? `${(v / 10000).toFixed(1)} 万亿` : `${Math.round(v / 100) * 100} 亿`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: X0 - 40, top: Y0 - h - 110, width: w + 90, height: h + 170, background: "rgba(8,12,22,0.5)", backdropFilter: "blur(10px)", borderRadius: 16, border: "1px solid rgba(255,190,77,0.22)" }} />
      <div style={{ position: "absolute", left: X0, top: Y0 - h - 90, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: K.sub, textShadow: SHADOW }}>全国一年买新房花的钱</div>
      <div style={{ position: "absolute", left: X0 + w, top: Y0 - h - 100, transform: "translateX(-100%)", fontFamily: NUM, fontWeight: 900, fontSize: 56, color: K.fg, textShadow: SHADOW }}>{Math.floor(y)}</div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={X0} y1={Y0} x2={X0 + w} y2={Y0} stroke="rgba(243,238,228,0.45)" strokeWidth={2} />
        {area ? <path d={area} fill="rgba(255,190,77,0.22)" /> : null}
        {pts.length > 1 ? <path d={line} fill="none" stroke={K.gold} strokeWidth={5} strokeLinejoin="round" /> : null}
        <circle cx={head[0]} cy={head[1]} r={9} fill={K.goldHi} />
      </svg>
      <div style={{ position: "absolute", left: head[0], top: head[1] - 16, transform: "translate(-50%, -100%)", fontFamily: NUM, fontWeight: 900, fontSize: 36, color: K.goldHi, textShadow: SHADOW, whiteSpace: "nowrap" }}>{vs}</div>
      {[1998, 2021, 2025].map((yr) => (
        <div key={yr} style={{ position: "absolute", left: px(yr), top: Y0 + 10, transform: "translateX(-50%)", fontFamily: NUM, fontWeight: 700, fontSize: 24, color: K.sub, textShadow: SHADOW }}>
          {yr}
        </div>
      ))}
    </div>
  );
};

// a source line, bottom left
const SRC: { a: number; b: number; s: string }[] = [
  { a: c1 + 4.4, b: c1 + 34, s: "来源：中国饭店协会对餐饮企业的调研（2024 年平均成本占营收比例，样本以连锁企业为主），经勤策消费研究转引" },
  { a: c2 + 4.6, b: c2 + 9.6, s: "来源：国家统计局，2024 年城镇私营单位住宿和餐饮业平均工资 54042 元" },
  { a: c2 + 9.8, b: c2 + 33, s: "示意：钱每一站怎么拆，各行各业不同，这里只画出方向" },
  { a: c3 + 4.4, b: c3 + 16.2, s: "来源：国家统计局《中国统计年鉴 2025》资金流量表（2023 年）" },
  { a: c3 + 16.6, b: c4 - 0.3, s: "来源：国家统计局《2024 年居民收入和消费支出情况》，全国居民人均消费支出 28227 元" },
  { a: c4 + 4.0, b: c4 + 18.0, s: "来源：西南财经大学中国家庭金融调查（2014 年数据）；画面中每户的进出为示意" },
  { a: c4 + 18.4, b: c5 - 0.2, s: "来源：人民银行《2019 年中国城镇居民家庭资产负债情况调查》；中间各组按总数分摊，示意" },
  { a: c5 + 4.8, b: c5 + 11.4, s: "按 2025 年 12 月新发放个人住房贷款利率约 3.1%（人民银行）、等额本息 30 年计算" },
  { a: c5 + 15.4, b: c5 + 20.4, s: "来源：英格兰银行季报 2014《Money creation in the modern economy》" },
  { a: c5 + 20.6, b: c5 + 26.2, s: "来源：人民银行《2018 年金融机构贷款投向统计报告》：房地产贷款增量占各项贷款增量 39.9%" },
  { a: RIVER.a, b: RIVER.b + 0.8, s: "来源：国家统计局，新建商品房销售额（1998–2025）；房价跌幅：标普全球（2026）" },
  { a: RIVER.b + 1.0, b: TECH.a - 0.2, s: "来源：胡润研究院；澎湃新闻《胡润：一张财富排行榜里的二十五年》" },
  { a: c7 + 3.6, b: c8 - 0.3, s: "来源：世界不平等报告 2026（2025 年个人净财富）" },
];
const SourceLine: React.FC<{ t: number }> = ({ t }) => (
  <>
    {SRC.map((r, i) => {
      const o = win(t, r.a, r.b, 0.5, 0.5);
      return o <= 0 ? null : (
        <div key={i} style={{ position: "absolute", left: 46, bottom: 30, fontFamily: FONT, fontWeight: 600, fontSize: 21, color: "rgba(243,238,228,0.82)", textShadow: SHADOW, opacity: o }}>
          {r.s}
        </div>
      );
    })}
  </>
);

// soft dark at the top and bottom so the type reads over a bright town; deeper by day
const Shade: React.FC<{ t: number }> = ({ t }) => {
  const d = dayAt(t);
  const a = 0.32 + 0.18 * d;
  return <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(6,9,16,${a}) 0%, rgba(6,9,16,0) 34%, rgba(6,9,16,0) 70%, rgba(6,9,16,${a}) 100%)` }} />;
};

// ---------------------------------------------------------------- sound
const HITS: { at: number; id: string; v: number; len?: number }[] = [
  { at: 7.7, id: "sfx-foley-01", v: 0.6 },
  { at: c1 + 3.4, id: "sfx-game-01", v: 0.5 },
  ...[5.0, 8.4, 11.6, 14.6, 17.0, 19.2, 21.4].map((d) => ({ at: c1 + d, id: "sfx-mechanical-13", v: 0.45 })),
  ...[7.3, 10.0, 14.0, 17.1, 19.3, 21.5].map((d) => ({ at: c1 + d, id: "sfx-impact-03", v: 0.22 })),
  ...[5.0, 6.2, 7.2].map((d) => ({ at: c3 + d, id: "sfx-mechanical-13", v: 0.4 })),
  ...[17.2, 17.9, 18.6, 19.3, 20.0, 20.7].map((d) => ({ at: c3 + d, id: "sfx-mechanical-13", v: 0.32 })),
  { at: c4 + 24.8, id: "sfx-impact-16", v: 0.55, len: 1.5 },
  { at: c5 + 13.0, id: "sfx-game-01", v: 0.45 },
  { at: RIVER.peak, id: "sfx-impact-14", v: 0.45 },
  { at: c7 + 3.6, id: "sfx-impact-16", v: 0.6, len: 1.5 },
  { at: c9 + 1.7, id: "sfx-foley-01", v: 0.5 },
  { at: c9 + 3.8, id: "sfx-game-01", v: 0.45 },
];

export const Film: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      {t < T.card ? <TownView t={t} /> : null}
      <Shade t={t} />
      <Labels t={t} />
      <FlowTags t={t} />
      <Deciles t={t} />
      <LoanClock t={t} />
      <WaveChart t={t} />
      <Receipts t={t} />
      <Captions t={t} />
      <SourceLine t={t} />
      <BrandMark o={1 - ramp(t, T.sources - 0.4, T.sources)} />
      <Sources at={T.sources} out={T.card + 0.2} />
      <EndCard at={T.card} />
      <Audio src={staticFile("score.wav")} />
      {HITS.map((h, i) => (
        <Sequence key={i} from={Math.round(h.at * FPS)} durationInFrames={Math.round((h.len ?? 1.2) * FPS)}>
          <Audio src={staticFile(`sfx/${h.id}.wav`)} volume={h.v} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
