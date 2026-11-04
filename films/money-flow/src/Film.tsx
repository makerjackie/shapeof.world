// The full film: the town (three.js) under the type, labels, counters and the few drawn overlays.
// Numbers and sources: private/videos/money-flow/LEDGER.md (v4: §9).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EndCard, EO, Part, ramp, Say, Sources, SHADOW, Tag, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { FPS, HIT, HOLD, MONTHS, RIVER, SALES, T, TECH, VISIT, WORLD, salesAt, yearAt } from "./timing";
import { TownView } from "./TownView";
import { ANCHORS, project } from "./town/camera";
import { CAST, ROLES, ROLE_NAME, Role, TECH_TOWERS, byRank, ptOf, tankBase, techTop, yardOf } from "./town/layout";
import { builtAt, scene, techStart } from "./town/state";
import { finalOf, monthAt, passedOf } from "./town/sim";

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
  { at: T.hook + 0.3, out: T.hook + 2.9, x: L, y: 400, lines: [{ p: ["新印出 ", big("1", 1.4), " 个亿"], size: 80 }] },
  { at: T.hook + 3.0, out: T.hook + 6.4, x: L, y: 380, lines: [{ p: ["假设全中国只有 ", { t: "100", num: true }, " 户人家"], size: 68 }, sub("钱，装在各家房顶的水箱里")] },
  { at: T.hook + 6.6, out: T.c1 - 0.1, x: 960, y: 400, align: "center", lines: [{ p: ["一年后，它会停在", { t: "谁家", mark: true }, "？"], size: 84 }] },
  // 1 where it comes from
  { at: T.c1 + 0.4, out: T.c1 + 3.6, x: L, y: 300, lines: [{ p: ["这 1 个亿，是怎么印出来的？"], size: 62 }] },
  { at: T.c1 + 3.8, out: T.c1 + 7.4, x: L, y: 300, lines: [{ p: ["央行很少直接把钱发给谁"], size: 62 }] },
  { at: T.c1 + 7.6, out: T.c1 + 13.6, x: L, y: 300, lines: [{ p: ["钱，大多是", { t: "借出来的", mark: true }], size: 62 }, sub("银行放一笔贷款，世上就多一笔新钱")] },
  { at: T.c1 + 13.8, out: T.c2 - 0.1, x: L, y: 300, lines: [{ p: ["2024 年，银行新放出的贷款约 ", big("18"), " 万亿"], size: 58 }, { p: ["大头，借给了", { t: "企业", mark: true }], size: 62 }] },
  // 2 the first stop: a factory
  { at: T.c2 + 0.2, out: T.c2 + 4.8, x: R, y: 250, align: "right", lines: [{ p: ["这 1 个亿，先借给了一家工厂"], size: 60 }] },
  { at: T.c2 + 5.0, out: T.c2 + 10.2, x: R, y: 250, align: "right", lines: [{ p: ["买材料、发工资、交税"], size: 60 }] },
  { at: T.c2 + 10.4, out: T.c2 + 16.4, x: 960, y: 860, align: "center", lines: [{ p: ["每生产 ", { t: "100", num: true }, " 元，这样分"], size: 62 }] },
  { at: T.c2 + 16.6, out: T.c2 + 22.6, x: 960, y: 800, align: "center", lines: [{ p: ["大头不是被老板拿走了吗？"], size: 60 }, { p: ["单看这一步，", { t: "工资拿得最多", mark: true }], size: 60 }] },
  { at: T.c2 + 22.8, out: T.c2 + 28.4, x: 960, y: 800, align: "center", lines: [{ p: ["你的工资，是别人花出来的"], size: 60 }, { p: ["你花的钱，又成了别人的工资"], size: 60 }] },
  { at: T.c2 + 28.6, out: T.c3 + 0.2, x: 960, y: 840, align: "center", lines: [{ p: ["差别，出在后面"], size: 66 }] },
  // 3 a year, six households
  { at: T.c3 + 0.3, out: VISIT.rider - 0.2, x: L, y: 250, lines: [{ p: ["钱在 100 户之间转起来"], size: 60 }, sub("跟着其中 6 户看一年")] },
  { at: VISIT.rider + 0.15, out: VISIT.rider + HOLD.rider + 0.35, x: L, y: 250, lines: [{ p: ["外卖骑手：月入约 ", big("7000–9000", 1.15), " 元"], size: 60 }] },
  { at: VISIT.worker + 0.15, out: VISIT.worker + HOLD.worker + 0.35, x: L, y: 250, lines: [{ p: ["工厂工人：月入约 ", big("5000", 1.15), " 元"], size: 60 }] },
  { at: VISIT.coder + 0.15, out: VISIT.coder + HOLD.coder + 0.35, x: L, y: 250, lines: [{ p: ["程序员：年薪约 ", big("24", 1.15), " 万"], size: 60 }] },
  { at: VISIT.landlord + 0.15, out: VISIT.landlord + HOLD.landlord + 0.35, x: L, y: 250, lines: [{ p: ["房东：收房租"], size: 60 }] },
  { at: VB + 0.15, out: VB + 7.2, x: 1100, y: 860, align: "center", lines: [{ p: ["小老板：开饭馆"], size: 60 }, sub("街坊的饭钱流进来，再一笔笔分出去")] },
  { at: VB + 7.4, out: VB + HOLD.boss + 0.35, x: 1100, y: 820, align: "center", lines: [{ p: ["房东每个月先拿走一份"], size: 58 }, { p: ["老板，是", { t: "最后", mark: true }, "拿钱的人"], size: 62 }] },
  { at: VISIT.holder + 0.15, out: VISIT.holder + HOLD.holder + 0.35, x: L, y: 250, lines: [{ p: ["大股东：拿分红"], size: 60 }] },
  // 4 reveal
  { at: T.c4 + 0.2, out: T.c4 + 2.9, x: 960, y: 260, align: "center", lines: [{ p: ["一年后，这 1 个亿在哪？"], size: 72 }] },
  { at: T.c4 + 3.0, out: T.c4 + 8.2, x: 960, y: 180, align: "center", lines: [{ p: ["收入最高的 5 户"], size: 56, color: K.sub }, { p: ["约 ", big("5000", 1.7), " 万"], size: 70 }] },
  { at: T.c4 + 8.33, out: T.c4 + 13.5, x: 960, y: 180, align: "center", lines: [{ p: ["接下来的 20 户"], size: 56, color: K.sub }, { p: ["约 ", big("2600", 1.7), " 万"], size: 70 }] },
  { at: T.c4 + 13.67, out: T.c4 + 18.8, x: 960, y: 140, align: "center", lines: [{ p: ["剩下的 75 户，加起来约 ", big("2300", 1.4), " 万"], size: 60 }, { p: ["其中约 ", { t: "40", num: true, c: K.red }, " 户，这一年", { t: "花的比挣的多", c: K.red }], size: 52 }] },
  { at: T.c4 + 19.0, out: T.c4 + 24.1, x: 960, y: 140, align: "center", lines: [{ p: ["一年年攒下来，就是财富"], size: 56, color: K.sub }, { p: ["城镇最富的 10% 家庭，拥有全部家庭资产的 ", big("47.5%", 1.3)], size: 54 }] },
  { at: T.c4 + 24.33, out: T.c4 + 30.0, x: 960, y: 120, align: "center", lines: [{ p: ["每一户，都摸到过这笔钱"], size: 62 }] },
  { at: T.c4 + 30.2, out: T.c5 - 0.1, x: 960, y: 420, align: "center", lines: [{ p: ["可它只停在", { t: "花不完", mark: true }, "的人家里"], size: 76 }] },
  // 5 where the rich get it
  { at: T.c5 + 0.4, out: T.c5 + 4, x: L, y: 300, lines: [{ p: ["大股东的钱，最初又是哪来的？"], size: 60 }] },
  { at: T.c5 + 4.2, out: T.c5 + 12, x: L, y: 280, lines: [{ p: ["中国没公开这类数据，看美国税单："], size: 48, color: K.sub }, { p: ["年收入千万美元以上的人"], size: 56 }, { p: ["工资只占约 ", big("17%", 1.3)], size: 64 }] },
  { at: T.c5 + 12.2, out: T.c5 + 17, x: L, y: 300, lines: [{ p: ["大部分，是", { t: "钱生的钱", mark: true }], size: 64 }] },
  { at: T.c5 + 17.2, out: T.c5 + 23, x: L, y: 300, lines: [{ p: ["没卖的股票和房子，还在", { t: "自己涨", mark: true }], size: 60 }] },
  { at: T.c5 + 23.2, out: T.c6 - 0.2, x: L, y: 250, lines: [{ p: ["普通人呢？收入大多是", { t: "工资", mark: true }], size: 60 }, sub("房租、利息、分红，只占全国居民收入的 8.3%")] },
  // 6 spending, savings lent back
  { at: T.c6 + 0.4, out: T.c6 + 5.4, x: L, y: 300, lines: [{ p: ["富人花得也多，可还是", { t: "花不完", mark: true }], size: 62 }] },
  { at: T.c6 + 5.6, out: T.c6 + 11.4, x: L, y: 300, lines: [{ p: ["中国收入最高 5% 的家庭"], size: 54, color: K.sub }, { p: ["挣 100 元，存下约 ", big("72", 1.3), " 元"], size: 64 }] },
  { at: T.c6 + 11.6, out: T.c6 + 16, x: L, y: 300, lines: [{ p: ["存下的钱进了银行"], size: 60 }, { p: ["又", { t: "借给了买房的人", c: K.loan }, "，比如程序员"], size: 60 }] },
  { at: T.c6 + 16.2, out: T.c6 + 21, x: L, y: 300, lines: [{ p: ["他每个月还的利息"], size: 60 }, { p: ["又", { t: "流回了大宅", mark: true }], size: 60 }] },
  { at: T.c6 + 21.2, out: T.c7 - 0.2, x: L, y: 300, lines: [{ p: ["今天贷 100 万买房，还 30 年"], size: 56 }, { p: ["光利息，约 ", big("54"), " 万"], size: 62 }] },
  // 7 the housing wave
  { at: T.c7 + 0.3, out: T.c7 + 3.4, x: 960, y: 420, align: "center", lines: [{ p: ["那些一下子变富的人呢？"], size: 76 }] },
  { at: T.c7 + 3.6, out: RIVER.a + 0.2, x: 960, y: 420, align: "center", lines: [{ p: ["很多人，是赶上了一波", { t: "浪潮", mark: true }], size: 72 }] },
  { at: RIVER.a + 0.4, out: RIVER.a + 5.2, x: L, y: 600, lines: [{ p: ["1998 年，全国一年买新房"], size: 54, color: K.sub }, { p: ["花约 ", big("2500"), " 亿"], size: 62 }] },
  { at: RIVER.a + 5.4, out: RIVER.peak - 0.1, x: L, y: 600, lines: [{ p: ["钱像河一样流进房子"], size: 60 }] },
  { at: RIVER.peak + 0.1, out: RIVER.peak + 3.2, x: L, y: 600, lines: [{ p: ["2021 年：约 ", big("18.2"), " 万亿"], size: 62 }, sub("二十多年，涨了 70 多倍")] },
  { at: RIVER.peak + 3.4, out: RIVER.hold, x: L, y: 600, lines: [{ p: ["早买房的人、开发商、卖地的地方政府"], size: 54 }, { p: ["接住了这条河"], size: 62 }] },
  { at: RIVER.hold + 0.2, out: RIVER.hold + 3.0, x: L, y: 600, lines: [{ p: ["浪潮，也会", { t: "退", mark: true }], size: 66 }] },
  { at: RIVER.hold + 3.2, out: T.c7 + 34.0, x: L, y: 600, lines: [{ p: ["2025 年，只剩约 ", big("8.4", 1.3), " 万亿"], size: 58 }, sub("房价从 2021 年的高点，跌了约两成")] },
  { at: T.c7 + 34.2, out: T.c9 - 0.2, x: L, y: 250, lines: [{ p: ["2021 年高点买房的人"], size: 60 }, { p: ["房子跌了，", { t: "房贷一分没少", c: K.red }], size: 60 }] },
  // 9 the next waves; the world
  { at: T.c9 + 0.4, out: TECH.a - 0.2, x: L, y: 250, lines: [{ p: ["胡润百富榜：1999 年，约一半上榜者做房地产"], size: 50 }, { p: ["2025 年的前 100 名，只剩 ", big("1", 1.3), " 位"], size: 58 }] },
  { at: TECH.a + 0.3, out: TECH.a + 5.6, x: L, y: 250, lines: [{ p: ["新的浪潮一波接一波"], size: 60 }] },
  { at: TECH.a + 5.8, out: TECH.a + 11.4, x: L, y: 250, lines: [{ p: ["每一波里，赚得最多的"], size: 58 }, { p: ["是", { t: "最早拥有它", mark: true }, "的人"], size: 62 }] },
  { at: TECH.a + 11.6, out: TECH.b - 0.2, x: L, y: 250, lines: [{ p: ["浪潮里的钱，也是千千万万人"], size: 58 }, { p: ["一笔一笔", { t: "花出来的", mark: true }], size: 62 }] },
  { at: WORLD.a, out: WORLD.a + 3.0, x: 960, y: 160, align: "center", lines: [{ p: ["放大到全世界"], size: 66 }] },
  { at: WORLD.a + 3.2, out: WORLD.a + 9.6, x: 960, y: 160, align: "center", lines: [{ p: ["最富的 10% 的人，拥有约 ", big("75%", 1.35), " 的财富"], size: 60 }] },
  { at: WORLD.a + 9.8, out: WORLD.a + 15.6, x: 960, y: 160, align: "center", lines: [{ p: ["最穷的一半人，只有约 ", { t: "2%", num: true, c: K.loan, s: 1.35 }], size: 60 }] },
  { at: WORLD.a + 15.8, out: WORLD.b, x: 960, y: 160, align: "center", lines: [{ p: ["钱流过所有人，", { t: "停在少数人那里", mark: true }], size: 62 }] },
  // 10 but
  { at: T.c10 + 0.4, out: T.c10 + 4.4, x: 960, y: 300, align: "center", lines: [{ p: ["那印钱，就是让富人更富吗？"], size: 66 }] },
  { at: T.c10 + 4.6, out: T.c10 + 12.2, x: 960, y: 280, align: "center", lines: [{ p: ["英格兰银行、欧央行的研究："], size: 54, color: K.sub }, { p: ["不印，失业会更多，", { t: "最伤穷人", mark: true }], size: 62 }] },
  { at: T.c10 + 12.4, out: T.c10 + 18.6, x: L, y: 250, lines: [{ p: ["拥有东西，也在扛风险"], size: 60 }, { p: ["生意不好，房租照交：小老板", { t: "最先赔钱", c: K.red }], size: 56 }] },
  { at: T.c10 + 18.8, out: T.c11 - 0.2, x: 960, y: 300, align: "center", lines: [{ p: ["印钱，救得了急"], size: 62 }, { p: ["钱最后停在哪，看", { t: "谁花不完", mark: true }], size: 62 }] },
  // 11 ending
  { at: T.c11 + 2, out: T.c11 + 7, x: 960, y: 230, align: "center", lines: [{ p: ["这 1 个亿，你也摸到过"], size: 72 }] },
  { at: T.c11 + 7.4, out: T.sources - 0.4, x: 960, y: 230, align: "center", lines: [{ p: ["它只是，从你手里", { t: "流过", mark: true }], size: 80 }] },
];

// ---------------------------------------------------------------- bottom-left source lines
const SIX = "六户只是举例：调查数据按收入分组，不按职业。每户放在它的职业通常所在的收入组";
const SRC: { a: number; b: number; text: string }[] = [
  { a: T.hook + 0.4, b: T.c1, text: "把全国约 4.9 亿户家庭缩成 100 户（第七次全国人口普查）" },
  { a: T.c1 + 7.6, b: T.c1 + 13.6, text: "来源：英格兰银行季报 2014《现代经济中的货币创造》" },
  { a: T.c1 + 13.8, b: T.c2, text: "来源：人民银行《2024 年金融机构贷款投向统计报告》：人民币贷款全年增加 18.09 万亿元，本外币企事业单位贷款增加 13.96 万亿元" },
  { a: T.c2 + 0.2, b: T.c2 + 10.2, text: "钱没有编号。这 1 个亿先借给谁、一年里怎么流，是按全国统计比例推算的模型" },
  { a: T.c2 + 10.4, b: T.c2 + 22.6, text: "来源：国家统计局《中国统计年鉴 2025》资金流量表（2023 年）；工资含单位缴的社保和公积金" },
  { a: VISIT.rider + 0.1, b: VISIT.worker, text: "来源：美团 2024 年披露，高频骑手月均收入 6650–9344 元（平台自报）" },
  { a: VISIT.worker + 0.1, b: VISIT.coder, text: "来源：国家统计局《2024 年农民工监测调查报告》，制造业农民工月均收入 4978 元" },
  { a: VISIT.coder + 0.1, b: VISIT.landlord, text: "来源：国家统计局，2024 年城镇非私营单位信息传输、软件和信息技术服务业平均工资 238966 元" },
  { a: VISIT.landlord + 0.1, b: VB, text: SIX },
  { a: VB + 0.1, b: VISIT.holder, text: "来源：中国饭店协会对餐饮企业的调研（2024 年平均成本占营收比例，样本以连锁企业为主），经勤策消费研究转引" },
  { a: VISIT.holder + 0.1, b: T.c4, text: SIX },
  { a: T.c4 + 3.0, b: T.c4 + 18.8, text: "按中国家庭金融调查 2015（2014 年数据）的储蓄分布推算：收入前 5% 的家庭存下全国家庭储蓄的 50.6%，前 25% 存下 77.1%" },
  { a: T.c4 + 19.0, b: T.c4 + 24.1, text: "来源：人民银行《2019 年中国城镇居民家庭资产负债情况调查》（总资产）" },
  { a: T.c4 + 24.33, b: T.c4 + 30.0, text: "模型里的 1 个亿：流过 = 一年里各轮收到的钱加起来；留下 = 年底还在手里的" },
  { a: T.c5 + 4.2, b: T.c5 + 17, text: "来源：美国国税局个人所得税统计，2023 税年，调整后总收入 1000 万美元以上（30382 份）" },
  { a: T.c5 + 23.2, b: T.c6, text: "来源：国家统计局《2024 年居民收入和消费支出情况》：工资性收入占 56.5%，财产净收入占 8.3%" },
  { a: T.c6 + 5.6, b: T.c6 + 11.4, text: "来源：中国家庭金融调查 2015（2014 年数据）；储蓄 = 收入 − 消费" },
  { a: T.c6 + 21.2, b: T.c7, text: "按 2025 年 12 月新发放个人住房贷款利率约 3.1%（人民银行）、等额本息 30 年计算" },
  { a: RIVER.a, b: T.c7 + 34.0, text: "来源：国家统计局，新建商品房销售额（1998–2025）；房价跌幅：标普全球（2026）" },
  { a: T.c9 + 0.4, b: TECH.a - 0.2, text: "来源：澎湃新闻《胡润：一张财富排行榜里的二十五年》（2025）" },
  { a: WORLD.a + 3.2, b: WORLD.b, text: "来源：世界不平等报告 2026（2025 年个人净财富）" },
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
  { k: "tower", text: "央行", a: T.c1 + 1, b: T.c1 + 13 },
  { k: "bank", text: "银行", a: T.c1 + 7, b: T.c2 + 6 },
  { k: "hub", text: "工厂", a: T.c1 + 15, b: T.c2 + 10 },
  { k: "bank", text: "银行", a: T.c6 + 11.4, b: T.c6 + 28.4 },
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
      const o = win(t, RIVER.a, T.c7 + 34, 0.5, 0.5);
      const p = project(t, new THREE.Vector3(ANCHORS.dev.x, 7 + 22 * builtAt(t), ANCHORS.dev.z));
      return o > 0 && p.vis ? (
        <Tag x={p.x} y={p.y} o={o} line size={36}>
          新楼盘
        </Tag>
      ) : null;
    })()}
    {TECH_TOWERS.map((tw, i) => {
      const o = win(t, techStart(i) + 0.8, WORLD.a, 0.5, 0.6);
      if (o <= 0) return null;
      const p = project(t, techTop(i).add(new THREE.Vector3(0, 1.5, 0)));
      return p.vis ? (
        <Tag key={tw.name} x={p.x} y={p.y} o={o} line size={36} color={K.goldHi}>
          {tw.name}
        </Tag>
      ) : null;
    })}
  </>
);

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
        r === "coder" || r === "holder" || r === "boss" ? win(t, T.c6 + 11.6, T.c6 + 21, 0.5, 0.5) : 0,
        r === "coder" ? win(t, T.c7 + 34.4, T.c9 - 0.2, 0.4, 0.4) : 0,
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
          {r === "boss" ? "小老板（饭馆）" : ROLE_NAME[r]}
        </Tag>
      );
    })}
  </>
);

// the reveal, person by person: how much of the 1 亿 passed through their hands, and how much stayed
const sig2 = (v: number) => {
  const w = v / 1e4;
  if (w < 1) return "0";
  const p = Math.pow(10, Math.floor(Math.log10(w)) - 1);
  return String(Math.round(w / p) * p);
};
const LINEUP: Role[] = ["rider", "worker", "coder", "landlord", "boss", "holder"];
const Lineup: React.FC<{ t: number }> = ({ t }) => {
  const at = T.c4 + 24.5;
  const o = win(t, at, T.c4 + 30.0, 0.5, 0.5);
  if (o <= 0) return null;
  const max = Math.max(...LINEUP.map((r) => passedOf(byRank(CAST[r]))));
  const H0 = 360;
  const colW = 230;
  const x0 = 960 - (LINEUP.length * colW) / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,0.7)" }} />
      {LINEUP.map((r, i) => {
        const h = byRank(CAST[r]);
        const pass = passedOf(h);
        const kept = finalOf(h);
        const k = ramp(t, at + 0.3 + i * 0.22, at + 1.4 + i * 0.22, EO);
        const k2 = ramp(t, at + 1.6 + i * 0.22, at + 2.6 + i * 0.22, EO);
        const hp = (pass / max) * H0 * k;
        const hk = (kept / max) * H0 * k2;
        const cx = x0 + colW * (i + 0.5);
        const base = 760;
        return (
          <div key={r}>
            <div style={{ position: "absolute", left: cx - 44, top: base - hp, width: 88, height: hp, border: "3px solid rgba(243,238,228,0.8)", borderBottom: "none", borderRadius: "6px 6px 0 0", background: "rgba(243,238,228,0.16)" }} />
            <div style={{ position: "absolute", left: cx - 44, top: base - hk, width: 88, height: hk, background: K.gold, borderRadius: hk > 6 ? "4px 4px 0 0" : 0, boxShadow: `0 0 24px ${K.gold}88` }} />
            <div style={{ position: "absolute", left: cx, top: base - hp - 58, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 700, fontSize: 30, color: K.sub, whiteSpace: "nowrap", textShadow: SHADOW, opacity: k }}>
              流过 <span style={{ fontFamily: NUM, fontSize: 38, color: K.fg }}>{sig2(pass)}</span> 万
            </div>
            <div style={{ position: "absolute", left: cx, top: base + 18, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 38, color: K.fg, whiteSpace: "nowrap", textShadow: SHADOW }}>{ROLE_NAME[r]}</div>
            <div style={{ position: "absolute", left: cx, top: base + 72, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 32, color: K.gold, whiteSpace: "nowrap", textShadow: SHADOW, opacity: k2 }}>
              留下 <span style={{ fontFamily: NUM, fontSize: 44 }}>{sig2(kept)}</span>{kept >= 1e4 ? " 万" : ""}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: x0 - 20, top: 760, width: LINEUP.length * colW + 40, height: 2, background: "rgba(243,238,228,0.35)" }} />
    </div>
  );
};

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

// the richest house's tank split by income source (chapter 5)
const Bands: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T.c5 + 4.6, T.c5 + 17, 0.6, 0.5);
  if (o <= 0) return null;
  const h = byRank(CAST.holder);
  const b = tankBase(h);
  const lvl = 0.92;
  const rows: [number, string, string][] = [
    [0.085, "工资 17%", "#9ccfff"],
    [0.375, "卖股票等的收益 41%", K.gold],
    [0.68, "合伙企业 20%", "#ff8a5c"],
    [0.865, "分红和利息 17%", "#f3dc9c"],
  ];
  return (
    <>
      {rows.map(([f, s, c], i) => {
        const p = project(t, new THREE.Vector3(b.x + h.tankR + 0.3, b.y + f * lvl * h.tankH, b.z));
        const k = ramp(t, T.c5 + 5 + (i === 0 ? 0 : 7.2 + i * 0.5), T.c5 + 5.6 + (i === 0 ? 0 : 7.2 + i * 0.5), EO) * o;
        return k <= 0 ? null : (
          <div key={i} style={{ position: "absolute", left: p.x + 18, top: p.y, transform: "translateY(-50%)", opacity: k, fontFamily: FONT, fontWeight: 800, fontSize: 40, color: c, textShadow: SHADOW, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 34, height: 2, background: c }} />
            {s}
          </div>
        );
      })}
    </>
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

// chapter 6: thirty years of payments
const LoanClock: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T.c6 + 21.6, T.c7 - 0.2, 0.5, 0.5);
  if (o <= 0) return null;
  const k = ramp(t, T.c6 + 22, T.c6 + 27);
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
  const o = win(t, RIVER.a - 0.4, T.c7 + 34.0, 0.6, 0.6);
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

// chapter 9: the world, as two bars
const World: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, WORLD.a + 3.4, WORLD.a + 15.6, 0.5, 0.5);
  if (o <= 0) return null;
  const rows = [
    { l: "最富的 10% 的人", v: 75, c: K.gold, d: 0.4 },
    { l: "最穷的一半人", v: 2, c: K.loan, d: 6.8 },
  ];
  return (
    <div style={{ position: "absolute", left: 0, top: 330, width: 1920, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      {rows.map((r, i) => {
        const k = ramp(t, WORLD.a + 3.2 + r.d, WORLD.a + 5.0 + r.d, EO);
        const a = ramp(t, WORLD.a + 3.0 + r.d, WORLD.a + 3.4 + r.d);
        return (
          <div key={i} style={{ position: "absolute", top: i * 86, left: 0, width: 1920, height: 64, opacity: a }}>
            <span style={{ position: "absolute", right: 1920 - 600, top: 6, fontSize: 42, fontWeight: 800 }}>{r.l}</span>
            <div style={{ position: "absolute", left: 640, top: 12, width: Math.max(8, r.v * 10 * k), height: 40, background: r.c, borderRadius: 4, boxShadow: `0 0 18px ${r.c}88` }} />
            <span style={{ position: "absolute", left: 660 + Math.max(8, r.v * 10 * k), top: 0, fontFamily: NUM, fontSize: 52, fontWeight: 900, color: r.c, whiteSpace: "nowrap" }}>约 {Math.max(1, Math.round(r.v * k))}%</span>
          </div>
        );
      })}
    </div>
  );
};

// dark gradient behind left / right captions so type stays readable over the bright town
const Shade: React.FC<{ t: number }> = ({ t }) => {
  const rc = win(t, VB + 0.4, VB + HOLD.boss + 0.2, 0.6, 0.6);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(3,4,9,0.55) 0%, rgba(3,4,9,0) 38%, rgba(3,4,9,0) 80%, rgba(3,4,9,0.55) 100%)" }} />
      {rc > 0 ? <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(3,4,9,${0.45 * rc}) 0%, rgba(3,4,9,0) 34%)` }} /> : null}
    </>
  );
};

// a few sounds on the moments that matter (own library, CC0)
const HITS: { at: number; id: string; v: number; len?: number }[] = [
  { at: T.hook + 0.1, id: "sfx-magic-20", v: 0.4, len: 2.4 },
  { at: T.hook + 1.6, id: "sfx-water-10", v: 0.55 },
  { at: T.hook + 6.6, id: "sfx-impact-16", v: 0.45 },
  ...Array.from({ length: 12 }, (_, i) => ({ at: MONTHS.start + ((MONTHS.end - MONTHS.start) / 12) * i, id: "sfx-water-01", v: 0.16 })),
  ...RROWS.map((d) => ({ at: VB + d, id: "sfx-mechanical-13", v: 0.4 })),
  { at: HIT, id: "sfx-impact-16", v: 0.85, len: 1.5 },
  { at: HIT + 0.05, id: "sfx-impact-08", v: 0.5 },
  { at: T.c4 + 19.0, id: "sfx-impact-14", v: 0.45 },
  { at: T.c6 + 16.2, id: "sfx-magic-14", v: 0.25, len: 2.6 },
  { at: RIVER.peak, id: "sfx-impact-14", v: 0.45 },
  { at: T.c7 + 34.2, id: "sfx-transition-15", v: 0.4 },
  { at: WORLD.a + 3.2, id: "sfx-impact-16", v: 0.6, len: 1.5 },
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
      <Bands t={t} />
      <Months t={t} />
      <CastTags t={t} />
      <Lineup t={t} />
      <LoanClock t={t} />
      <WaveChart t={t} />
      <World t={t} />
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
