// The full film: the town (three.js) under the type, labels, counters and the few drawn overlays.
// Numbers and sources: private/videos/money-flow/LEDGER.md (v6: §10).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EndCard, EO, Part, ramp, Say, Sources, SHADOW, Tag, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BUYER21, FPS, HIT, HOLD, MONTHS, RIVER, SALES, T, VISIT, Y09, salesAt, yearAt } from "./timing";
import { TownView } from "./TownView";
import { ANCHORS, project } from "./town/camera";
import { CAST, ROLES, ROLE_NAME, byRank, ptOf, yardOf } from "./town/layout";
import { builtAt, scene } from "./town/state";
import { monthAt } from "./town/sim";

type Line = { p: Part[]; size?: number; color?: string; weight?: number };
type Cap = { at: number; out: number; lines: Line[]; x: number; y: number; align?: "left" | "center" | "right" };

const L = 110;
const R = 1810;
const big = (t: string, s = 1.5): Part => ({ t, num: true, c: K.gold, s });

// ---------------------------------------------------------------- captions (screen text)
const sub = (t: string): Line => ({ p: [t], size: 44, color: K.sub });
const VB = VISIT.boss;
const CAPS: Cap[] = [
  // hook
  { at: T.hook + 0.3, out: T.hook + 3.0, x: L, y: 360, lines: [{ p: ["2024 年，中国的银行新放出贷款"], size: 56, color: K.sub }, { p: [big("18", 1.9), " 万亿"], size: 84 }] },
  { at: T.hook + 3.1, out: T.hook + 5.8, x: L, y: 380, lines: [{ p: ["银行每放出一笔贷款"], size: 64 }, { p: ["世上就多出一笔", { t: "新钱", mark: true }], size: 64 }] },
  { at: T.hook + 5.9, out: T.hook + 8.2, x: L, y: 380, lines: [{ p: ["可这一年，物价只涨了 ", big("0.2%", 1.5)], size: 68 }] },
  { at: T.hook + 8.3, out: T.c1 + 0.1, x: 960, y: 420, align: "center", lines: [{ p: ["这么多新钱，去了", { t: "谁的口袋", mark: true }, "？"], size: 84 }] },
  // 1 a loan: a deposit and a debt
  { at: T.c1 + 0.3, out: T.c1 + 5.6, x: 960, y: 170, align: "center", lines: [{ p: ["把 18 万亿缩成 ", big("1", 1.4), " 个亿"], size: 64 }, sub("全国 4.9 亿户人家，缩成 100 户；钱装在房顶的水箱里")] },
  { at: T.c1 + 5.8, out: T.c1 + 10.6, x: L, y: 250, lines: [{ p: ["银行把它借给了一家工厂"], size: 62 }, sub("2024 年，近八成新贷款借给了企业")] },
  { at: T.c1 + 10.8, out: T.c1 + 16.4, x: L, y: 250, lines: [{ p: ["工厂账上，多了 1 亿", { t: "存款", mark: true }], size: 62 }, { p: ["也多了 1 亿", { t: "欠银行的债", c: K.red }], size: 62 }] },
  { at: T.c1 + 16.6, out: T.c2 - 0.1, x: L, y: 250, lines: [{ p: ["存款会到处跑"], size: 62 }, { p: ["债，留在", { t: "借钱的人", c: K.red }, "身上"], size: 62 }] },
  // 2 the factory pays it out; a year on, where are the deposits?
  { at: T.c2 + 0.2, out: T.c2 + 5.4, x: R, y: 250, align: "right", lines: [{ p: ["工厂拿它买材料、发工资、交税"], size: 58 }] },
  { at: T.c2 + 5.6, out: T.c2 + 10.2, x: R, y: 250, align: "right", lines: [{ p: ["存款就这样，从工厂", { t: "跑了出去", mark: true }], size: 58 }] },
  { at: T.c2 + 10.4, out: T.c2 + 16.4, x: 960, y: 860, align: "center", lines: [{ p: ["每生产 ", { t: "100", num: true }, " 元，这样分"], size: 62 }] },
  { at: T.c2 + 16.6, out: T.c2 + 22.2, x: 960, y: 800, align: "center", lines: [{ p: ["你的工资，是别人花出来的"], size: 60 }, { p: ["你花的钱，又成了别人的工资"], size: 60 }] },
  { at: T.c2 + 22.4, out: T.c2 + 28.0, x: 960, y: 150, align: "center", lines: [{ p: ["一年后，查全国的账"], size: 52, color: K.sub }, { p: ["借钱的企业，存款反而", { t: "少了", mark: true }], size: 66 }] },
  { at: T.c2 + 28.2, out: T.c3 + 2.6, x: 960, y: 150, align: "center", lines: [{ p: ["这一年多出来的存款"], size: 52, color: K.sub }, { p: [big("八成", 1.3), "，在老百姓家里"], size: 70 }] },
  // 3 a year, six households
  { at: T.c3 + 2.8, out: VISIT.rider - 0.2, x: L, y: 250, lines: [{ p: ["钱花出去，不会消失"], size: 60 }, sub("只是从一户的账上，搬到另一户")] },
  { at: VISIT.rider + 0.15, out: VISIT.rider + HOLD.rider + 0.35, x: L, y: 250, lines: [{ p: ["外卖骑手：月入约 ", big("7000–9000", 1.15), " 元"], size: 60 }, sub("房租、吃饭，月底就搬走了")] },
  { at: VISIT.worker + 0.15, out: VISIT.worker + HOLD.worker + 0.35, x: L, y: 250, lines: [{ p: ["工厂工人：月入约 ", big("5000", 1.15), " 元"], size: 60 }] },
  { at: VISIT.coder + 0.15, out: VISIT.coder + HOLD.coder + 0.35, x: L, y: 250, lines: [{ p: ["程序员：年薪约 ", big("24", 1.15), " 万"], size: 60 }, sub("一大块，交了房贷")] },
  { at: VISIT.landlord + 0.15, out: VISIT.landlord + HOLD.landlord + 0.35, x: L, y: 250, lines: [{ p: ["房东：好几户的房租，汇到他这里"], size: 58 }] },
  { at: VB + 0.15, out: VB + 7.2, x: 1100, y: 860, align: "center", lines: [{ p: ["小老板：开饭馆"], size: 60 }, sub("街坊的饭钱流进来，再一笔笔分出去")] },
  { at: VB + 7.4, out: VB + HOLD.boss + 0.35, x: 1100, y: 820, align: "center", lines: [{ p: ["房东每个月先拿走一份"], size: 58 }, { p: ["老板，是", { t: "最后", mark: true }, "拿钱的人"], size: 62 }] },
  { at: VISIT.holder + 0.15, out: VISIT.holder + HOLD.holder + 0.35, x: L, y: 250, lines: [{ p: ["大股东：工厂和饭馆赚的，", { t: "分红", mark: true }, "给他"], size: 58 }] },
  // 4 reveal: who saved it (real survey shares; the tanks are drawn to them)
  { at: T.c4 + 0.2, out: T.c4 + 2.9, x: 960, y: 260, align: "center", lines: [{ p: ["一年后，钱停在了哪？"], size: 72 }] },
  { at: T.c4 + 3.0, out: T.c4 + 8.2, x: 960, y: 150, align: "center", lines: [{ p: ["全国家庭一年存下的钱"], size: 52, color: K.sub }, { p: [big("一半", 1.5), "，是收入最高的 5% 家庭存的"], size: 62 }] },
  { at: T.c4 + 8.33, out: T.c4 + 13.5, x: 960, y: 150, align: "center", lines: [{ p: ["再加上接下来的 20%"], size: 52, color: K.sub }, { p: ["前四分之一的家庭，存下了 ", big("77%", 1.5)], size: 62 }] },
  { at: T.c4 + 13.67, out: T.c4 + 18.8, x: 960, y: 150, align: "center", lines: [{ p: ["剩下四分之三的人家里"], size: 52, color: K.sub }, { p: ["约 ", { t: "4 成", num: true, c: K.red }, " 家庭，这一年", { t: "花的比挣的多", c: K.red }], size: 60 }] },
  { at: T.c4 + 19.0, out: T.c4 + 24.1, x: 960, y: 150, align: "center", lines: [{ p: ["一年年攒下来"], size: 52, color: K.sub }, { p: ["金融资产最多的 10% 家庭，拥有全部的 ", big("58%", 1.4)], size: 58 }] },
  { at: T.c4 + 24.33, out: T.c4 + 30.0, x: 960, y: 260, align: "center", lines: [{ p: ["每一户，都摸到过这笔钱"], size: 66 }] },
  { at: T.c4 + 30.2, out: T.c5 - 0.1, x: 960, y: 420, align: "center", lines: [{ p: ["可它只停在", { t: "花不完", mark: true }, "的人家里"], size: 76 }] },
  // 5 the savers' money is lent to the young; interest flows back
  { at: T.c5 + 0.4, out: T.c5 + 4.6, x: L, y: 300, lines: [{ p: ["存下来的钱，就躺在那里吗？"], size: 62 }] },
  { at: T.c5 + 4.8, out: T.c5 + 10.6, x: L, y: 300, lines: [{ p: ["收入最高的 5% 家庭"], size: 54, color: K.sub }, { p: ["挣 100 元，存下约 ", big("72", 1.3), " 元"], size: 64 }] },
  { at: T.c5 + 10.8, out: T.c5 + 15.8, x: L, y: 300, lines: [{ p: ["这些钱进了银行"], size: 60 }, { p: ["又借给了", { t: "买房的年轻人", c: K.loan }], size: 62 }] },
  { at: T.c5 + 16.0, out: T.c5 + 20.6, x: L, y: 300, lines: [{ p: ["他每个月还的利息"], size: 60 }, { p: ["流回了", { t: "存钱的人", mark: true }], size: 62 }] },
  { at: T.c5 + 20.8, out: T.c5 + 26.4, x: L, y: 300, lines: [{ p: ["今天贷 100 万买房，还 30 年"], size: 56 }, { p: ["光利息，约 ", big("54"), " 万"], size: 62 }] },
  { at: T.c5 + 26.6, out: T.c7 - 0.2, x: L, y: 300, lines: [{ p: ["你的房贷"], size: 64 }, { p: ["就是别人的", { t: "存款", mark: true }], size: 72 }] },
  // 7 new money lifts what it reaches first
  { at: T.c7 + 0.3, out: Y09.a - 0.2, x: 960, y: 420, align: "center", lines: [{ p: ["那新钱", { t: "最先", mark: true }, "流到的地方呢？"], size: 76 }] },
  { at: Y09.b - 2.6, out: Y09.b + 0.2, x: 960, y: 820, align: "center", lines: [{ p: ["新钱先到哪，", { t: "哪儿先涨", mark: true }], size: 66 }] },
  { at: Y09.b + 0.4, out: RIVER.a + 0.2, x: 960, y: 420, align: "center", lines: [{ p: ["这条路，后来走了二十多年"], size: 68 }] },
  { at: RIVER.a + 0.4, out: RIVER.a + 4.6, x: L, y: 600, lines: [{ p: ["1998 年，全国一年买新房"], size: 54, color: K.sub }, { p: ["花约 ", big("2500"), " 亿"], size: 62 }] },
  { at: RIVER.a + 4.8, out: RIVER.peak - 0.1, x: L, y: 600, lines: [{ p: ["钱像河一样流进房子"], size: 60 }, sub("早买的人、开发商、卖地的地方政府，接住了涨价")] },
  { at: RIVER.peak + 0.1, out: RIVER.hold, x: L, y: 600, lines: [{ p: ["2021 年：约 ", big("18.2"), " 万亿"], size: 62 }, sub("二十多年，涨了 70 多倍")] },
  { at: RIVER.hold + 0.2, out: RIVER.hold + 2.8, x: L, y: 600, lines: [{ p: ["浪潮，也会", { t: "退", mark: true }], size: 66 }] },
  { at: RIVER.hold + 3.0, out: BUYER21 - 0.2, x: L, y: 600, lines: [{ p: ["2025 年，只剩约 ", big("8.4", 1.3), " 万亿"], size: 58 }, sub("房价从 2021 年的高点，跌了约两成")] },
  { at: BUYER21, out: BUYER21 + 5.4, x: L, y: 250, lines: [{ p: ["2021 年高点买房的人"], size: 60 }, { p: ["房子跌了，", { t: "房贷一分没少", c: K.red }], size: 60 }] },
  { at: BUYER21 + 5.6, out: T.c10 - 0.2, x: L, y: 250, lines: [{ p: ["钱跑掉了"], size: 62 }, { p: ["债，还留在", { t: "原地", c: K.red }], size: 66 }] },
  // 10 but
  { at: T.c10 + 0.4, out: T.c10 + 4.4, x: 960, y: 300, align: "center", lines: [{ p: ["那不放这么多贷款，会更好吗？"], size: 64 }] },
  { at: T.c10 + 4.6, out: T.c10 + 12.2, x: 960, y: 280, align: "center", lines: [{ p: ["英格兰银行、欧央行的研究："], size: 54, color: K.sub }, { p: ["不放，失业会更多，", { t: "最伤穷人", mark: true }], size: 62 }] },
  { at: T.c10 + 12.4, out: T.c10 + 18.6, x: L, y: 250, lines: [{ p: ["拥有东西，也在扛风险"], size: 60 }, { p: ["生意不好，房租照交：小老板", { t: "最先赔钱", c: K.red }], size: 56 }] },
  { at: T.c10 + 18.8, out: T.c11 - 0.2, x: 960, y: 300, align: "center", lines: [{ p: ["新钱救得了急"], size: 62 }, { p: ["它最后停在哪，看", { t: "谁花不完", mark: true }], size: 62 }] },
  // 11 ending
  { at: T.c11 + 2, out: T.c11 + 7, x: 960, y: 230, align: "center", lines: [{ p: ["这 1 个亿，你也摸到过"], size: 72 }] },
  { at: T.c11 + 7.4, out: T.sources - 0.4, x: 960, y: 230, align: "center", lines: [{ p: ["它只是，从你手里", { t: "流过", mark: true }], size: 80 }] },
];

// ---------------------------------------------------------------- bottom-left source lines
const SIX = "六户只是举例：调查数据按收入分组，不按职业。每户放在它的职业通常所在的收入组";
const SRC: { a: number; b: number; text: string }[] = [
  { a: T.hook + 0.4, b: T.hook + 3.0, text: "来源：人民银行《2024 年金融统计数据报告》，人民币贷款全年增加 18.09 万亿元" },
  { a: T.hook + 3.1, b: T.hook + 5.8, text: "来源：英格兰银行季报 2014《现代经济中的货币创造》：银行放贷款的同时，就创造了一笔存款" },
  { a: T.hook + 5.9, b: T.hook + 8.2, text: "来源：国家统计局，2024 年全国居民消费价格（CPI）比上年上涨 0.2%" },
  { a: T.c1 + 0.3, b: T.c1 + 5.6, text: "把全国约 4.9 亿户家庭缩成 100 户（第七次全国人口普查）" },
  { a: T.c1 + 5.8, b: T.c1 + 10.6, text: "来源：新华社（人民银行数据）：2024 年企（事）业单位贷款增加 14.33 万亿元，近八成新增贷款投向企业" },
  { a: T.c1 + 10.8, b: T.c2, text: "钱没有编号。这 1 个亿先借给谁、一年里怎么流，是按全国统计比例画的示意" },
  { a: T.c2 + 10.4, b: T.c2 + 22.2, text: "来源：国家统计局《中国统计年鉴 2025》资金流量表（2023 年）；工资含单位缴的社保和公积金" },
  { a: T.c2 + 22.4, b: T.c3 + 2.6, text: "来源：人民银行 2024 年金融统计：人民币存款增加 17.99 万亿元，其中住户 14.26 万亿元，非金融企业减少 2943 亿元" },
  { a: VISIT.rider + 0.1, b: VISIT.worker, text: "来源：美团 2024 年披露，高频骑手月均收入 6650–9344 元（平台自报）" },
  { a: VISIT.worker + 0.1, b: VISIT.coder, text: "来源：国家统计局《2024 年农民工监测调查报告》，制造业农民工月均收入 4978 元" },
  { a: VISIT.coder + 0.1, b: VISIT.landlord, text: "来源：国家统计局，2024 年城镇非私营单位信息传输、软件和信息技术服务业平均工资 238966 元" },
  { a: VISIT.landlord + 0.1, b: VB, text: SIX },
  { a: VB + 0.1, b: VISIT.holder, text: "来源：中国饭店协会对餐饮企业的调研（2024 年平均成本占营收比例，样本以连锁企业为主），经勤策消费研究转引" },
  { a: VISIT.holder + 0.1, b: T.c4, text: SIX },
  { a: T.c4 + 3.0, b: T.c4 + 18.8, text: "来源：西南财经大学中国家庭金融调查 2015（2014 年数据）：收入前 5% 的家庭存下全国家庭储蓄的 50.6%，前 25% 存下 77.1%" },
  { a: T.c4 + 19.0, b: T.c4 + 24.1, text: "来源：人民银行《2019 年中国城镇居民家庭资产负债情况调查》：金融资产最高 10% 家庭占 58.3%（城镇）" },
  { a: T.c5 + 4.8, b: T.c5 + 10.6, text: "来源：中国家庭金融调查 2015（2014 年数据）；储蓄 = 收入 − 消费" },
  { a: T.c5 + 10.8, b: T.c5 + 20.6, text: "来源：人民银行 2019 年城镇家庭调查：户主 26–35 岁的家庭 73.1% 有负债，房贷占家庭负债的 75.9%" },
  { a: T.c5 + 20.8, b: T.c5 + 26.4, text: "按 2025 年 12 月新发放个人住房贷款利率约 3.1%（人民银行）、等额本息 30 年计算" },
  { a: Y09.a, b: Y09.b, text: "来源：人民银行 2009 年四季度货币政策执行报告；国家统计局 2009 年统计公报；Deng, Morck, Wu & Yeung, NBER 工作论文 16871（2011）" },
  { a: RIVER.a, b: BUYER21, text: "来源：国家统计局，新建商品房销售额（1998–2025）；房价跌幅：标普全球（2026）" },
  { a: T.c10 + 4.6, b: T.c10 + 12.2, text: "来源：英格兰银行季报 2012《资产购买的分配效应》；Lenza & Slacalek, 欧央行工作论文 2190（2018）" },
];

const SourceLine: React.FC<{ t: number }> = ({ t }) => (
  <>
    {SRC.map((r) => {
      const o = win(t, r.a, r.b, 0.3, 0.3);
      return o <= 0 ? null : (
        <div key={r.a} style={{ position: "absolute", left: 46, bottom: 26, fontFamily: FONT, fontSize: 24, fontWeight: 500, color: "rgba(243,238,228,0.66)", opacity: o, whiteSpace: "nowrap", textShadow: SHADOW }}>
          {r.text}
        </div>
      );
    })}
  </>
);

const Captions: React.FC<{ t: number }> = ({ t }) => (
  <>
    {CAPS.map((c0, i) => {
      const next = CAPS.filter((x) => x.at > c0.at).reduce((m, x) => Math.min(m, x.at), Infinity);
      const c = { ...c0, out: Math.min(c0.out, next - 0.3) };
      if (t < c.at - 0.1 || t > c.out + 0.3) return null;
      let delay = 0;
      return (
        <div key={i} style={{ position: "absolute", top: c.y, left: c.align === "right" ? undefined : c.align === "center" ? 0 : c.x, right: c.align === "right" ? 1920 - c.x : undefined, width: c.align === "center" ? 1920 : undefined, display: "flex", flexDirection: "column", alignItems: c.align === "right" ? "flex-end" : c.align === "center" ? "center" : "flex-start", gap: 10 }}>
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

// ---------------------------------------------------------------- labels on buildings
const LABELS: { k: keyof typeof ANCHORS; text: string; a: number; b: number; color?: string }[] = [
  { k: "bank", text: "银行", a: T.hook + 0.6, b: T.c1 - 0.2 },
  { k: "bank", text: "银行", a: T.c1 + 5.6, b: T.c1 + 11 },
  { k: "hub", text: "工厂", a: T.c1 + 5.8, b: T.c2 + 10 },
  { k: "bank", text: "银行", a: T.c5 + 11.4, b: T.c5 + 26 },
  { k: "land", text: "开发商买地", a: Y09.a + 1.0, b: Y09.b + 0.4, color: K.goldHi },
  { k: "gov", text: "地方政府", a: Y09.a + 4.4, b: Y09.b + 0.4 },
  { k: "gov", text: "地方政府", a: RIVER.peak - 5, b: RIVER.hold + 1 },
];
const Labels: React.FC<{ t: number }> = ({ t }) => (
  <>
    {LABELS.map((l, i) => {
      const o = win(t, l.a, l.b, 0.5, 0.5);
      if (o <= 0) return null;
      const p = project(t, ANCHORS[l.k]);
      if (!p.vis) return null;
      return (
        <Tag key={i} x={p.x} y={p.y} o={o} line size={36} color={l.color}>
          {l.text}
        </Tag>
      );
    })}
    {(() => {
      const o = win(t, RIVER.a, BUYER21, 0.5, 0.5);
      const p = project(t, new THREE.Vector3(ANCHORS.dev.x, 7 + 22 * builtAt(t), ANCHORS.dev.z));
      return o > 0 && p.vis ? (
        <Tag x={p.x} y={p.y} o={o} line size={36}>
          新楼盘
        </Tag>
      ) : null;
    })()}
  </>
);

// the debt each new loan leaves behind: a red plate that stays where the money was borrowed
const DebtTags: React.FC<{ t: number }> = ({ t }) => {
  const rows: { at: THREE.Vector3; text: string; a: number; b: number }[] = [
    { at: new THREE.Vector3(ANCHORS.hub.x + 1.5, ANCHORS.hub.y + 3.4, ANCHORS.hub.z), text: "欠银行 1 亿", a: T.c1 + 12.2, b: T.c3 + 2 },
  ];
  const h = byRank(CAST.coder);
  const y = yardOf(h);
  rows.push({ at: new THREE.Vector3(y.x, y.y + 4.4, y.z), text: "欠银行 100 万", a: T.c5 + 13.2, b: T.c7 - 0.3 });
  rows.push({ at: new THREE.Vector3(y.x, y.y + 4.4, y.z), text: "房贷，一分没少", a: BUYER21 + 1.2, b: T.c10 - 0.3 });
  return (
    <>
      {rows.map((r, i) => {
        const o = win(t, r.a, r.b, 0.5, 0.5);
        if (o <= 0) return null;
        const p = project(t, r.at);
        if (!p.vis) return null;
        const k = ramp(t, r.a, r.a + 0.45, EO);
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%, -100%) scale(${0.85 + 0.15 * k})`, opacity: o, padding: "8px 18px", borderRadius: 8, background: "rgba(120,16,12,0.82)", border: `2px solid ${K.red}`, boxShadow: `0 0 26px ${K.red}66`, fontFamily: FONT, fontWeight: 800, fontSize: 34, color: "#ffe9e4", whiteSpace: "nowrap", textShadow: SHADOW }}>
            {r.text}
          </div>
        );
      })}
    </>
  );
};

// what each flow through the air is: a word at the top of the arc
const ArcTags: React.FC<{ t: number }> = ({ t }) => {
  const st = scene(t);
  return (
    <>
      {st.arcs.map((a, i) => {
        if (!a.label || a.k < 0.05) return null;
        const p0 = ptOf(a.from);
        const p1 = ptOf(a.to);
        const c = p0.clone().lerp(p1, 0.5);
        c.y = Math.max(p0.y, p1.y) + (a.lift ?? 6);
        const m = p0.clone().multiplyScalar(0.25).addScaledVector(c, 0.5).addScaledVector(p1, 0.25);
        const p = project(t, m);
        if (!p.vis) return null;
        const loan = a.col && a.col.b > a.col.r;
        return (
          <Tag key={i} x={p.x} y={p.y - 6} o={Math.min(1, a.k * 1.4)} size={34} color={loan ? K.loan : K.goldHi}>
            {a.label}
          </Tag>
        );
      })}
    </>
  );
};

// the split at the market: three labels riding the three pipes out of it
const Split: React.FC<{ t: number }> = ({ t }) => {
  const a = T.c2 + 11;
  const o = win(t, a, T.c2 + 22.6, 0.5, 0.5);
  if (o <= 0) return null;
  const wage = project(t, new THREE.Vector3(34, 1, 2));
  const tax = project(t, new THREE.Vector3(-17, 8, -8));
  const cap = project(t, new THREE.Vector3(30, 7, -31));
  const k = (d: number) => ramp(t, a + d, a + d + 0.5, EO) * o;
  return (
    <>
      <Tag x={wage.x} y={wage.y} o={k(0)} size={44} color={K.goldHi}>
        约 <span style={{ fontFamily: NUM, fontSize: 64 }}>53</span> 元：工资（含社保）
      </Tag>
      <Tag x={tax.x} y={tax.y} o={k(1.2)} size={40}>
        约 <span style={{ fontFamily: NUM, fontSize: 56 }}>8</span> 元：税
      </Tag>
      <Tag x={cap.x} y={cap.y} o={k(2.4)} size={44} color={K.gold}>
        约 <span style={{ fontFamily: NUM, fontSize: 64 }}>39</span> 元：企业和老板
      </Tag>
    </>
  );
};

// names over the six households, when the film is with them
const CastTags: React.FC<{ t: number }> = ({ t }) => (
  <>
    {ROLES.map((r) => {
      const v = VISIT[r];
      const o = Math.max(
        win(t, v - 0.3, v + HOLD[r] + 0.3, 0.4, 0.4),
        r === "coder" ? win(t, T.c5 + 11.6, T.c7 - 0.3, 0.5, 0.5) : 0,
        r === "coder" ? win(t, BUYER21 + 0.2, T.c10 - 0.2, 0.4, 0.4) : 0,
        r === "boss" ? win(t, T.c10 + 12.6, T.c10 + 18.6, 0.4, 0.4) : 0,
        r === "rider" ? win(t, T.c11 + 1.5, T.c11 + 7, 0.6, 0.6) : 0,
      );
      if (o <= 0) return null;
      const h = byRank(CAST[r]);
      const y = yardOf(h);
      const p = project(t, new THREE.Vector3(y.x, y.y + (h.kind === "mansion" ? 3.2 : 2.6) * 0.75 + 0.4, y.z));
      if (!p.vis) return null;
      return (
        <Tag key={r} x={p.x} y={p.y} o={o} line size={34} color={K.goldHi}>
          {r === "boss" ? "小老板（饭馆）" : r === "coder" && t > T.c5 ? "程序员（买房的年轻人）" : ROLE_NAME[r]}
        </Tag>
      );
    })}
  </>
);

// month clock during the year
const Months: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, MONTHS.start - 0.5, T.c4 + 0.2, 0.5, 0.6);
  if (o <= 0) return null;
  const m = monthAt(t);
  const n = Math.min(12, Math.floor(m) + 1);
  return (
    <div style={{ position: "absolute", right: 70, top: 56, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      <div style={{ fontSize: 46, fontWeight: 800 }}>
        第 <span style={{ fontFamily: NUM, fontSize: 64, color: K.gold }}>{n}</span> 个月
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: i < m ? K.gold : "rgba(243,238,228,0.18)", boxShadow: i < m ? `0 0 10px ${K.gold}` : undefined }} />
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- the restaurant's receipt
type Row = { l: string; v: string; at: number; note?: string };
const Receipt: React.FC<{ t: number; at: number; out: number; x: number; y: number; title: string; sub?: string; rows: Row[]; w?: number }> = ({ t, at, out, x, y, title, sub: subt, rows, w = 470 }) => {
  const o = win(t, at, out, 0.5, 0.6);
  if (o <= 0) return null;
  const shown = rows.filter((r) => t >= r.at - 0.05).length;
  const grow = ramp(t, at, at + 0.6, EO);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: o, transform: `translateY(${(1 - grow) * 30}px) rotate(-1.2deg) scale(0.84)`, transformOrigin: "top left" }}>
      <div style={{ background: "#f7f3ea", color: "#22201c", borderRadius: "6px 6px 0 0", padding: "26px 30px 18px", boxShadow: "0 22px 50px rgba(0,0,0,0.55)", fontFamily: FONT }}>
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
      </div>
      <svg width={w} height={16} style={{ display: "block" }}>
        <path d={`M0 0 ${Array.from({ length: Math.ceil(w / 20) }, (_, i) => `L${i * 20 + 10} 14 L${i * 20 + 20} 0`).join(" ")} Z`} fill="#f7f3ea" />
      </svg>
    </div>
  );
};
const RROWS = [1.2, 2.4, 3.6, 4.6, 5.4, 6.2, 7.0];
const BossReceipt: React.FC<{ t: number }> = ({ t }) => (
  <Receipt
    t={t}
    at={VB + 0.6}
    out={VB + HOLD.boss + 0.2}
    x={60}
    y={150}
    title="饭馆 · 每收 100 元"
    sub="餐饮企业平均成本占比（2024）"
    rows={[
      { l: "食材", v: "42.1", at: VB + RROWS[0] },
      { l: "人工", v: "22.2", at: VB + RROWS[1] },
      { l: "房租物业", v: "9.7", at: VB + RROWS[2] },
      { l: "外卖平台", v: "4.5", at: VB + RROWS[3] },
      { l: "水电燃气", v: "3.6", at: VB + RROWS[4] },
      { l: "税费", v: "1.8", at: VB + RROWS[5] },
      { l: "其余", v: "16.1", at: VB + RROWS[6], note: "装修、营销、杂费……扣完才是利润" },
    ]}
  />
);

// chapter 5: thirty years of payments
const LoanClock: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T.c5 + 21.0, T.c5 + 26.4, 0.5, 0.5);
  if (o <= 0) return null;
  const k = ramp(t, T.c5 + 21.4, T.c5 + 25.6);
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

// chapter 7: the money poured into new homes each year, 1998–2025
const WaveChart: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, RIVER.a - 0.4, BUYER21 - 0.2, 0.6, 0.6);
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
      <div style={{ position: "absolute", left: X0 - 40, top: Y0 - h - 110, width: w + 90, height: h + 170, background: "rgba(8,12,22,0.55)", backdropFilter: "blur(10px)", borderRadius: 16, border: "1px solid rgba(255,190,77,0.22)" }} />
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

// chapter 7: 2009, three numbers that do not fit together until you see where the new money went first
const Year09: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, Y09.a, Y09.b - 2.8, 0.5, 0.5);
  if (o <= 0) return null;
  const rows: { l: string; v: string; d: number; c: string; note: string }[] = [
    { l: "新放出的贷款", v: "9.6 万亿", d: 0.5, c: K.loan, note: "前一年 4.9 万亿，差不多翻倍" },
    { l: "物价", v: "−0.7%", d: 2.6, c: K.fg, note: "不涨反跌" },
    { l: "8 个大城市的住宅地价", v: "约翻一倍", d: 4.8, c: K.gold, note: "新贷款先到了买地的开发商手里" },
  ];
  return (
    <div style={{ position: "absolute", left: 110, top: 200, width: 900, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 96, color: K.fg, lineHeight: 1 }}>2009</div>
      {rows.map((r, i) => {
        const k = ramp(t, Y09.a + r.d, Y09.a + r.d + 0.5, EO);
        return (
          <div key={i} style={{ marginTop: 34, opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: K.sub }}>{r.l}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
              <span style={{ fontFamily: NUM, fontWeight: 900, fontSize: 84, color: r.c }}>{r.v}</span>
              <span style={{ fontSize: 32, fontWeight: 600, color: K.sub }}>{r.note}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// dark gradient behind left / right captions so type stays readable over the bright town
const Shade: React.FC<{ t: number }> = ({ t }) => {
  const rc = Math.max(win(t, VB + 0.4, VB + HOLD.boss + 0.2, 0.6, 0.6), win(t, Y09.a, Y09.b - 2.8, 0.5, 0.5));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(3,4,9,0.55) 0%, rgba(3,4,9,0) 38%, rgba(3,4,9,0) 80%, rgba(3,4,9,0.55) 100%)" }} />
      {rc > 0 ? <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(3,4,9,${0.5 * rc}) 0%, rgba(3,4,9,0) 48%)` }} /> : null}
    </>
  );
};

// a few sounds on the moments that matter (own library, CC0)
const HITS: { at: number; id: string; v: number; len?: number }[] = [
  { at: T.hook + 0.1, id: "sfx-magic-20", v: 0.4, len: 2.4 },
  { at: T.hook + 1.2, id: "sfx-water-10", v: 0.5 },
  { at: T.hook + 8.3, id: "sfx-impact-16", v: 0.45 },
  { at: T.c1 + 12.2, id: "sfx-impact-20", v: 0.35 },
  { at: T.c2 + 28.2, id: "sfx-impact-14", v: 0.4 },
  ...Array.from({ length: 12 }, (_, i) => ({ at: MONTHS.start + ((MONTHS.end - MONTHS.start) / 12) * i, id: "sfx-water-01", v: 0.16 })),
  ...RROWS.map((d) => ({ at: VB + d, id: "sfx-mechanical-13", v: 0.4 })),
  { at: HIT, id: "sfx-impact-16", v: 0.85, len: 1.5 },
  { at: HIT + 0.05, id: "sfx-impact-08", v: 0.5 },
  { at: T.c4 + 19.0, id: "sfx-impact-14", v: 0.45 },
  { at: T.c5 + 16.2, id: "sfx-magic-14", v: 0.25, len: 2.6 },
  { at: T.c5 + 26.6, id: "sfx-impact-14", v: 0.4 },
  { at: Y09.a + 4.8, id: "sfx-impact-16", v: 0.55, len: 1.5 },
  { at: RIVER.peak, id: "sfx-impact-14", v: 0.45 },
  { at: BUYER21, id: "sfx-transition-15", v: 0.4 },
  { at: T.c10 + 12.4, id: "sfx-impact-20", v: 0.4 },
];

export const Film: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      {t < T.card ? <TownView t={t} /> : null}
      <Shade t={t} />
      <Labels t={t} />
      <ArcTags t={t} />
      <Split t={t} />
      <Months t={t} />
      <CastTags t={t} />
      <DebtTags t={t} />
      <LoanClock t={t} />
      <WaveChart t={t} />
      <Year09 t={t} />
      <BossReceipt t={t} />
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
