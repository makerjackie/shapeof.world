// The full film: the town (three.js) under the type, labels, counters and the few drawn overlays.
// Numbers and sources: private/videos/money-flow/LEDGER.md.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EndCard, EO, Part, ramp, Say, Sources, SHADOW, Tag, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { FPS, HIT, T, MONTHS } from "./timing";
import { TownView } from "./TownView";
import { ANCHORS, project } from "./town/camera";
import { HOUSES, HUB, tankBase } from "./town/layout";
import { monthAt } from "./town/sim";

type Line = { p: Part[]; size?: number; color?: string; weight?: number };
type Cap = { at: number; out: number; lines: Line[]; x: number; y: number; align?: "left" | "center" | "right" };

const L = 110;
const R = 1810;
const big = (t: string, s = 1.5): Part => ({ t, num: true, c: K.gold, s });

// ---------------------------------------------------------------- captions (screen text)
const CAPS: Cap[] = [
  // hook
  { at: T.hook + 0.3, out: T.hook + 2.9, x: L, y: 400, lines: [{ p: ["新印出 ", big("1", 1.4), " 个亿"], size: 80 }] },
  { at: T.hook + 3.0, out: T.hook + 6.4, x: L, y: 380, lines: [{ p: ["假设全中国只有 ", { t: "100", num: true }, " 户人家"], size: 68 }, { p: ["钱，装在各家房顶的水箱里"], size: 44, color: K.sub }] },
  { at: T.hook + 6.6, out: T.c1 - 0.1, x: 960, y: 400, align: "center", lines: [{ p: ["一年后，它会停在", { t: "谁家", mark: true }, "？"], size: 84 }] },
  // 1 where it comes from
  { at: T.c1 + 0.4, out: T.c1 + 3.6, x: L, y: 300, lines: [{ p: ["这 1 个亿，是怎么印出来的？"], size: 62 }] },
  { at: T.c1 + 3.8, out: T.c1 + 7.4, x: L, y: 300, lines: [{ p: ["央行很少直接把钱发给谁"], size: 62 }] },
  { at: T.c1 + 7.6, out: T.c1 + 13.6, x: L, y: 300, lines: [{ p: ["钱，大多是", { t: "借出来的", mark: true }], size: 62 }, { p: ["银行放一笔贷款，世上就多一笔存款"], size: 44, color: K.sub }] },
  { at: T.c1 + 13.8, out: T.c1 + 19, x: R, y: 300, align: "right", lines: [{ p: ["2015 到 2018 年，全国棚户区改造"], size: 52, color: K.sub }, { p: ["开工约 ", big("2400"), " 万套"], size: 62 }] },
  { at: T.c1 + 19.2, out: T.c1 + 23.2, x: R, y: 300, align: "right", lines: [{ p: ["2016 年，近一半拆迁户拿的是", { t: "现金", mark: true }], size: 58 }] },
  { at: T.c1 + 23.4, out: T.c2 - 0.1, x: R, y: 300, align: "right", lines: [{ p: ["钱从哪来？央行借给国开行"], size: 52, color: K.sub }, { p: ["到 2018 年底，借出约 ", big("3.4"), " 万亿"], size: 62 }] },
  // 2 first split
  { at: T.c2 + 0.2, out: T.c2 + 4.6, x: 960, y: 260, align: "center", lines: [{ p: ["把它缩小成 1 个亿，跟着走一年"], size: 62 }] },
  { at: T.c2 + 4.8, out: T.c2 + 8.6, x: R, y: 280, align: "right", lines: [{ p: ["拿到钱，很多人转身买了新房"], size: 60 }] },
  { at: T.c2 + 8.8, out: T.c2 + 14.2, x: R, y: 280, align: "right", lines: [{ p: ["买房的钱，约", { t: "四成", mark: true }], size: 62 }, { p: ["成了地方政府的卖地钱"], size: 62 }] },
  { at: T.c2 + 14.4, out: T.c2 + 19.6, x: R, y: 280, align: "right", lines: [{ p: ["政府和开发商再把钱花出去"], size: 60 }, { p: ["工地、工厂、商店……"], size: 44, color: K.sub }] },
  { at: T.c2 + 19.8, out: T.c2 + 26.6, x: 960, y: 150, align: "center", lines: [{ p: ["每生产 ", { t: "100", num: true }, " 元，这样分"], size: 62 }] },
  { at: T.c2 + 26.8, out: T.c2 + 32.6, x: L, y: 250, lines: [{ p: ["大头不是被老板拿走了吗？"], size: 60 }, { p: ["单看这一步，", { t: "工资拿得最多", mark: true }], size: 60 }] },
  { at: T.c2 + 32.8, out: T.c3 + 0.2, x: L, y: 250, lines: [{ p: ["差别，出在后面"], size: 66 }] },
  // 3 a year
  { at: T.c3 + 0.4, out: T.c3 + 4.4, x: L, y: 260, lines: [{ p: ["然后，钱在 100 户之间转起来"], size: 60 }] },
  { at: T.c3 + 4.6, out: T.c3 + 9.6, x: L, y: 260, lines: [{ p: ["拿到钱，就得花"], size: 62 }, { p: ["房租、吃饭、学费、看病"], size: 46, color: K.sub }] },
  { at: T.c3 + 9.8, out: T.c3 + 13.4, x: L, y: 260, lines: [{ p: ["挣得越少，越要", { t: "花光", mark: true }], size: 66 }] },
  { at: T.c3 + 13.6, out: T.c3 + 17.2, x: L, y: 260, lines: [{ p: ["挣得越多，越", { t: "花不完", mark: true }], size: 66 }] },
  { at: T.c3 + 17.4, out: T.c3 + 22, x: L, y: 260, lines: [{ p: ["每转一圈，就有一些钱停下来"], size: 60 }] },
  // 4 reveal
  { at: T.c4 + 0.2, out: T.c4 + 2.9, x: 960, y: 260, align: "center", lines: [{ p: ["一年后，这 1 个亿在哪？"], size: 72 }] },
  { at: T.c4 + 3.0, out: T.c4 + 8.2, x: 960, y: 180, align: "center", lines: [{ p: ["收入最高的 5 户"], size: 56, color: K.sub }, { p: ["约 ", big("5000", 1.7), " 万"], size: 70 }] },
  { at: T.c4 + 8.33, out: T.c4 + 13.5, x: 960, y: 180, align: "center", lines: [{ p: ["接下来的 20 户"], size: 56, color: K.sub }, { p: ["约 ", big("2600", 1.7), " 万"], size: 70 }] },
  { at: T.c4 + 13.67, out: T.c4 + 18.8, x: 960, y: 140, align: "center", lines: [{ p: ["剩下的 75 户，加起来"], size: 56, color: K.sub }, { p: ["约 ", big("2300", 1.7), " 万"], size: 70 }] },
  { at: T.c4 + 19.0, out: T.c4 + 24.1, x: 960, y: 140, align: "center", lines: [{ p: ["其中约 ", { t: "40", num: true, c: K.red }, " 户，这一年", { t: "花的比挣的多", c: K.red }], size: 60 }] },
  { at: T.c4 + 24.33, out: T.c4 + 26.8, x: 960, y: 420, align: "center", lines: [{ p: ["每一户，都摸到过这笔钱"], size: 66 }] },
  { at: T.c4 + 27.0, out: T.c5 - 0.1, x: 960, y: 420, align: "center", lines: [{ p: ["可它只停在", { t: "花不完", mark: true }, "的人家里"], size: 76 }] },
  // 5 where the rich get it
  { at: T.c5 + 0.4, out: T.c5 + 4, x: L, y: 300, lines: [{ p: ["大宅里的钱，最初又是哪来的？"], size: 60 }] },
  { at: T.c5 + 4.2, out: T.c5 + 12, x: L, y: 280, lines: [{ p: ["中国没有公开的数据，看看美国的税单："], size: 48, color: K.sub }, { p: ["年收入千万美元以上的人"], size: 56 }, { p: ["工资只占约 ", big("17%", 1.3)], size: 64 }] },
  { at: T.c5 + 12.2, out: T.c5 + 17, x: L, y: 300, lines: [{ p: ["大部分，是", { t: "钱生的钱", mark: true }], size: 64 }] },
  { at: T.c5 + 17.2, out: T.c5 + 23, x: L, y: 300, lines: [{ p: ["还有一大块，根本不算收入："], size: 54, color: K.sub }, { p: ["没卖的股票和房子，自己在涨"], size: 60 }] },
  { at: T.c5 + 23.2, out: T.c6 - 0.2, x: L, y: 280, lines: [{ p: ["2009 到 2026 年，平均每户身家"], size: 50, color: K.sub }, { p: ["美国最富 0.1%：多了约 ", big("1.5", 1.3), " 亿美元"], size: 58 }, { p: ["最穷的一半：多了约 ", { t: "5.6", num: true }, " 万美元"], size: 58 }] },
  // 6 spending, savings lent back
  { at: T.c6 + 0.4, out: T.c6 + 5.4, x: L, y: 300, lines: [{ p: ["他们花得也多：豪宅、游艇、酒店"], size: 56 }, { p: ["可还是", { t: "花不完", mark: true }], size: 62 }] },
  { at: T.c6 + 5.6, out: T.c6 + 11.4, x: L, y: 300, lines: [{ p: ["中国收入最高 5% 的家庭"], size: 54, color: K.sub }, { p: ["挣 100 元，存下约 ", big("72", 1.3), " 元"], size: 64 }] },
  { at: T.c6 + 11.6, out: T.c6 + 16, x: L, y: 300, lines: [{ p: ["存下的钱进了银行"], size: 60 }, { p: ["又", { t: "借给了买房的人", c: K.loan }], size: 60 }] },
  { at: T.c6 + 16.2, out: T.c6 + 21, x: L, y: 300, lines: [{ p: ["每个月的房贷利息"], size: 60 }, { p: ["又", { t: "流回了大宅", mark: true }], size: 60 }] },
  { at: T.c6 + 21.2, out: T.c7 - 0.2, x: L, y: 300, lines: [{ p: ["美国的研究：富人多存下的钱"], size: 54, color: K.sub }, { p: ["大多变成了别人和政府的债"], size: 60 }] },
  // 7 assets
  { at: T.c7 + 0.4, out: T.c7 + 4.6, x: R, y: 300, align: "right", lines: [{ p: ["停下来的钱，还会去买房、买股票"], size: 58 }] },
  { at: T.c7 + 4.8, out: T.c7 + 11, x: R, y: 300, align: "right", lines: [{ p: ["2015 到 2018 年，全国新房均价"], size: 52, color: K.sub }] },
  { at: T.c7 + 11.2, out: T.c8 - 0.2, x: R, y: 300, align: "right", lines: [{ p: ["同一时期，物价只涨了约 ", big("6%", 1.2)], size: 58 }] },
  // 8 your 500k
  { at: T.c8 + 0.4, out: T.c8 + 3.6, x: L, y: 260, lines: [{ p: ["这对普通人意味着什么？"], size: 62 }] },
  { at: T.c8 + 3.8, out: T.c8 + 9, x: L, y: 260, lines: [{ p: ["2015 年，你存了 50 万准备买房"], size: 56 }, { p: ["能买约 ", big("74", 1.3), " ㎡"], size: 62 }] },
  { at: T.c8 + 9.2, out: T.c8 + 14.4, x: L, y: 260, lines: [{ p: ["三年后，连本带息约 52 万"], size: 56 }, { p: ["只够买约 ", big("60", 1.3), " ㎡"], size: 62 }] },
  { at: T.c8 + 14.6, out: T.c8 + 19, x: L, y: 260, lines: [{ p: ["存款一分没少"], size: 62 }, { p: ["房子少了", { t: "一间卧室", mark: true }], size: 62 }] },
  { at: T.c8 + 19.2, out: T.c9 - 0.2, x: L, y: 260, lines: [{ p: ["按物价算，钱几乎没贬值"], size: 58 }, { p: ["按房子算，", { t: "少买约两成", mark: true }], size: 58 }] },
  // 9 the US
  { at: T.c9 + 0.4, out: T.c9 + 5, x: 960, y: 260, align: "center", lines: [{ p: ["如果新钱换个入口呢？"], size: 66 }, { p: ["看美国的两次放水"], size: 50, color: K.sub }] },
  { at: T.c9 + 5.2, out: T.c9 + 9, x: R, y: 280, align: "right", lines: [{ p: ["2008 年，入口在", { t: "华尔街", mark: true }], size: 62 }] },
  { at: T.c9 + 9.2, out: T.c9 + 14.8, x: R, y: 280, align: "right", lines: [{ p: ["美联储买进银行和投资者的债券"], size: 52, color: K.sub }, { p: ["资产从 0.9 万亿涨到 ", big("4.5", 1.2), " 万亿美元"], size: 58 }] },
  { at: T.c9 + 15, out: T.c9 + 22.4, x: R, y: 280, align: "right", lines: [{ p: ["2009 年 3 月到 2019 年底"], size: 52, color: K.sub }] },
  { at: T.c9 + 22.6, out: T.c9 + 29, x: R, y: 280, align: "right", lines: [{ p: ["那几年美国家庭多出来的财富"], size: 52, color: K.sub }] },
  { at: T.c9 + 29.2, out: T.c9 + 35.2, x: L, y: 260, lines: [{ p: ["2020 年，入口换到了", { t: "每家门口", mark: true }], size: 62 }, { p: ["三轮支票，超过 8000 亿美元"], size: 48, color: K.sub }] },
  { at: T.c9 + 35.4, out: T.c9 + 41.8, x: L, y: 260, lines: [{ p: ["大家拿着钱去买东西"], size: 56, color: K.sub }, { p: ["2022 年 6 月，物价比一年前涨了 ", big("9.1%", 1.2)], size: 58 }] },
  { at: T.c9 + 42, out: T.c10 - 0.2, x: 960, y: 420, align: "center", lines: [{ p: ["钱先流到哪里，哪里就", { t: "先涨价", mark: true }], size: 76 }] },
  // 10 but
  { at: T.c10 + 0.4, out: T.c10 + 4.4, x: 960, y: 300, align: "center", lines: [{ p: ["那放水，就是让富人更富吗？"], size: 66 }] },
  { at: T.c10 + 4.6, out: T.c10 + 12.4, x: 960, y: 230, align: "center", lines: [{ p: ["2020 到 2023 年，美国工资最低的人"], size: 54, color: K.sub }, { p: ["扣掉物价，工资", { t: "没缩水", mark: true }], size: 62 }, { p: ["中间的人，反而缩水约 6%"], size: 54, color: K.sub }] },
  { at: T.c10 + 12.6, out: T.c10 + 18.8, x: 960, y: 280, align: "center", lines: [{ p: ["英格兰银行、欧央行的研究："], size: 54, color: K.sub }, { p: ["不放水，失业会更多，最伤穷人"], size: 62 }] },
  { at: T.c10 + 19, out: T.c11 - 0.2, x: 960, y: 300, align: "center", lines: [{ p: ["放水，救得了急"], size: 62 }, { p: ["钱最后停在哪，看", { t: "谁花不完", mark: true }], size: 62 }] },
  // 11 ending
  { at: T.c11 + 2, out: T.c11 + 7, x: 960, y: 230, align: "center", lines: [{ p: ["这 1 个亿，你也摸到过"], size: 72 }] },
  { at: T.c11 + 7.4, out: T.sources - 0.4, x: 960, y: 230, align: "center", lines: [{ p: ["它只是，从你手里", { t: "流过", mark: true }], size: 80 }] },
];

// ---------------------------------------------------------------- bottom-left source lines
const SRC: { a: number; b: number; text: string }[] = [
  { a: T.hook + 0.4, b: T.c1, text: "把全国约 4.9 亿户家庭缩成 100 户（第七次全国人口普查）" },
  { a: T.c1 + 7.6, b: T.c1 + 13.6, text: "来源：英格兰银行季报 2014《现代经济中的货币创造》" },
  { a: T.c1 + 13.8, b: T.c1 + 23.2, text: "来源：住房和城乡建设部；货币化安置比例按套数算（2016 年 48.5%）" },
  { a: T.c1 + 23.4, b: T.c2, text: "来源：人民银行，2018 年末抵押补充贷款（PSL）余额 33795 亿元" },
  { a: T.c2 + 0.2, b: T.c4 + 4, text: "钱没有编号。这一年的流动，是按全国统计比例推算的模型" },
  { a: T.c4 + 3.0, b: T.c4 + 24.1, text: "按中国家庭金融调查 2015（2014 年数据）的储蓄分布推算：收入前 5% 的家庭存下全国家庭储蓄的 50.6%，前 25% 存下 77.1%" },
  { a: T.c5 + 4.2, b: T.c5 + 17, text: "来源：美国国税局个人所得税统计，2023 税年，调整后总收入 1000 万美元以上（30382 份）" },
  { a: T.c5 + 23.2, b: T.c6, text: "来源：美联储家庭财富分布（DFA），2009 年一季度到 2026 年二季度，按财富分组" },
  { a: T.c6 + 5.6, b: T.c6 + 11.4, text: "来源：中国家庭金融调查 2015（2014 年数据）；储蓄 = 收入 − 消费" },
  { a: T.c6 + 21.2, b: T.c7, text: "来源：Mian, Straub & Sufi《The Saving Glut of the Rich》（2020）" },
  { a: T.c7 + 4.8, b: T.c8, text: "来源：国家统计局，商品房销售额 ÷ 销售面积；居民消费价格 2016–2018 年累计" },
  { a: T.c8 + 3.8, b: T.c9, text: "按全国商品房均价和一年期存款基准利率（1.5%）计算，示意" },
  { a: T.c9 + 9.2, b: T.c9 + 22.4, text: "来源：美联储 H.4.1；标普 500 收盘价；美国劳工统计局 CPI；凯斯-席勒全国房价指数" },
  { a: T.c9 + 22.6, b: T.c9 + 29, text: "来源：美联储 DFA，2008 年底到 2014 年底家庭净资产变化，按财富分组；不全是放水的作用" },
  { a: T.c9 + 29.2, b: T.c10, text: "来源：美国国税局纾困支票统计（经 CRFB 汇总）；美国劳工统计局 CPI（2022 年 6 月同比）" },
  { a: T.c10 + 4.6, b: T.c10 + 12.4, text: "来源：Autor, Dube & McGrew, NBER 31010（2023）：时薪第 10、50 百分位，按 CPI 扣除物价" },
  { a: T.c10 + 12.6, b: T.c10 + 18.8, text: "来源：英格兰银行季报 2012《资产购买的分配效应》；Lenza & Slacalek, 欧央行工作论文 2190（2018）" },
];

const SourceLine: React.FC<{ t: number }> = ({ t }) => (
  <>
    {SRC.map((r) => {
      const o = win(t, r.a, r.b, 0.3, 0.3);
      return o <= 0 ? null : (
        <div key={r.a} style={{ position: "absolute", left: 46, bottom: 26, fontFamily: FONT, fontSize: 26, fontWeight: 500, color: "rgba(243,238,228,0.62)", opacity: o, whiteSpace: "nowrap", textShadow: SHADOW }}>
          {r.text}
        </div>
      );
    })}
  </>
);

const Captions: React.FC<{ t: number }> = ({ t }) => (
  <>
    {CAPS.map((c, i) => {
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
  { k: "bank", text: "银行", a: T.c1 + 7, b: T.c1 + 13.6 },
  { k: "bank", text: "国开行", a: T.c1 + 13.8, b: T.c2 + 3 },
  { k: "shanty", text: "棚户区", a: T.c1 + 14, b: T.c2 + 6 },
  { k: "dev", text: "新楼盘", a: T.c2 + 4.6, b: T.c2 + 16 },
  { k: "gov", text: "地方政府", a: T.c2 + 8.8, b: T.c2 + 19.8 },
  { k: "hub", text: "工厂和商店", a: T.c2 + 14.4, b: T.c2 + 20.2 },
  { k: "bank", text: "银行", a: T.c6 + 11.4, b: T.c6 + 22 },
  { k: "dev", text: "房子", a: T.c7 + 1, b: T.c7 + 15 },
  { k: "tower", text: "美联储", a: T.c9 + 4, b: T.c9 + 14 },
  { k: "dev", text: "华尔街", a: T.c9 + 5.2, b: T.c9 + 22.4 },
  { k: "hub", text: "商店", a: T.c9 + 35.4, b: T.c10 },
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
  </>
);

// the split at the market: three labels riding the three pipes out of it
const Split: React.FC<{ t: number }> = ({ t }) => {
  const a = T.c2 + 20.4;
  const o = win(t, a, T.c2 + 32.6, 0.5, 0.5);
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
  const h = HOUSES.find((x) => x.rank === 2)!;
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

// counters: a number rolling from a to b
const Roll: React.FC<{ t: number; a: number; b: number; t0: number; t1: number; fmt?: (v: number) => string }> = ({ t, a, b, t0, t1, fmt = (v) => Math.round(v).toString() }) => <>{fmt(a + (b - a) * ramp(t, t0, t1))}</>;

// two bars: what money bought (houses / stocks) against what it bought at the shop (CPI)
const Bars: React.FC<{ t: number; at: number; out: number; x: number; y: number; rows: { label: string; v: number; color: string; d: number }[]; scale: number }> = ({ t, at, out, x, y, rows, scale }) => {
  const o = win(t, at, out, 0.5, 0.5);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 1920 - x, top: y, opacity: o, display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-end", fontFamily: FONT }}>
      {rows.map((r, i) => {
        const k = ramp(t, at + r.d, at + r.d + 1.6);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, opacity: ramp(t, at + r.d - 0.2, at + r.d + 0.2) }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: K.fg, textShadow: SHADOW }}>{r.label}</span>
            <div style={{ width: Math.max(6, r.v * scale * k), height: 30, background: r.color, borderRadius: 4, boxShadow: `0 0 18px ${r.color}88` }} />
            <span style={{ fontFamily: NUM, fontSize: 48, fontWeight: 900, color: r.color, width: 170, whiteSpace: "nowrap", textShadow: SHADOW }}>+{Math.round(r.v * 100 * k)}%</span>
          </div>
        );
      })}
    </div>
  );
};

// chapter 7: price counter and bars; chapter 9: stock counter and the wealth split
const Numbers: React.FC<{ t: number }> = ({ t }) => {
  const priceO = win(t, T.c7 + 5.2, T.c8 - 0.2, 0.5, 0.5);
  const spO = win(t, T.c9 + 15.4, T.c9 + 22.4, 0.5, 0.5);
  const wO = win(t, T.c9 + 23, T.c9 + 29, 0.5, 0.5);
  return (
    <>
      {priceO > 0 ? (
        <div style={{ position: "absolute", right: 110, top: 372, opacity: priceO, fontFamily: FONT, fontWeight: 800, fontSize: 58, color: K.fg, textShadow: SHADOW }}>
          约 <span style={{ fontFamily: NUM, color: K.gold, fontSize: 92 }}><Roll t={t} a={6800} b={8700} t0={T.c7 + 5.6} t1={T.c7 + 9} /></span> 元/㎡
        </div>
      ) : null}
      <Bars t={t} at={T.c7 + 11.4} out={T.c8 - 0.2} x={1810} y={520} scale={1500} rows={[{ label: "房价", v: 0.29, color: K.gold, d: 0 }, { label: "物价", v: 0.06, color: "#9ccfff", d: 0.6 }]} />
      {spO > 0 ? (
        <div style={{ position: "absolute", right: 110, top: 360, opacity: spO, fontFamily: FONT, fontWeight: 800, color: K.fg, textShadow: SHADOW, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ fontSize: 50 }}>
            股市 <span style={{ fontFamily: NUM, color: K.gold, fontSize: 88 }}><Roll t={t} a={680} b={3230} t0={T.c9 + 15.8} t1={T.c9 + 19.5} /></span> 点
          </div>
          <div style={{ fontSize: 50, opacity: ramp(t, T.c9 + 19.6, T.c9 + 20.2) }}>
            物价只涨了约 <span style={{ fontFamily: NUM, color: "#9ccfff", fontSize: 70 }}>22%</span>
          </div>
        </div>
      ) : null}
      {wO > 0 ? (
        <div style={{ position: "absolute", right: 110, top: 370, opacity: wO, fontFamily: FONT, fontWeight: 800, color: K.fg, textShadow: SHADOW, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 18 }}>
          {[
            { l: "最富 1%", v: 37, c: K.gold },
            { l: "最穷的一半人", v: 1, c: "#9ccfff" },
          ].map((r, i) => {
            const k = ramp(t, T.c9 + 23.4 + i * 1.4, T.c9 + 25 + i * 1.4);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, opacity: ramp(t, T.c9 + 23.2 + i * 1.4, T.c9 + 23.6 + i * 1.4) }}>
                <span style={{ fontSize: 46 }}>{r.l}</span>
                <div style={{ width: Math.max(8, r.v * 18 * k), height: 32, background: r.c, borderRadius: 4, boxShadow: `0 0 18px ${r.c}88` }} />
                <span style={{ fontFamily: NUM, fontSize: 60, color: r.c, width: 230, whiteSpace: "nowrap" }}>约 {Math.max(r.v > 0 ? 1 : 0, Math.round(r.v * k))}%</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
};

// chapter 8: a floor plan that loses a bedroom
const Plan: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T.c8 + 3.8, T.c8 + 19, 0.6, 0.6);
  if (o <= 0) return null;
  const cut = ramp(t, T.c8 + 9.6, T.c8 + 11.4);
  const w = 760;
  const h = 540;
  const bed = w * 0.27; // the room that goes (≈ 14 m² of 74)
  const x0 = 1000;
  const y0 = 250;
  const line = "rgba(243,238,228,0.9)";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: o }}>
      <div style={{ position: "absolute", left: x0 - 50, top: y0 - 50, width: w + 100, height: h + 170, background: "rgba(7,10,18,0.9)", border: "1px solid rgba(243,238,228,0.14)", borderRadius: 18 }} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <rect x={x0} y={y0} width={w} height={h} fill="rgba(255,190,77,0.10)" stroke={line} strokeWidth={5} />
        <line x1={x0 + w * 0.42} y1={y0} x2={x0 + w * 0.42} y2={y0 + h * 0.55} stroke={line} strokeWidth={3} />
        <line x1={x0} y1={y0 + h * 0.55} x2={x0 + w - bed} y2={y0 + h * 0.55} stroke={line} strokeWidth={3} />
        <line x1={x0 + w * 0.22} y1={y0 + h * 0.55} x2={x0 + w * 0.22} y2={y0 + h} stroke={line} strokeWidth={3} />
        <line x1={x0 + w - bed} y1={y0} x2={x0 + w - bed} y2={y0 + h} stroke={line} strokeWidth={4} />
        <rect x={x0 + w - bed} y={y0} width={bed} height={h} fill={`rgba(5,7,13,${0.85 * cut})`} stroke={cut > 0.05 ? K.red : "none"} strokeDasharray="14 10" strokeWidth={4} opacity={1} />
      </svg>
      {[
        ["客厅", 0.21, 0.27],
        ["卧室", 0.57, 0.27],
        ["厨房", 0.11, 0.78],
        ["卫生间", 0.4, 0.78],
        ["卧室", (w - bed / 2) / w, 0.5],
      ].map(([s, fx, fy], i) => (
        <div key={i} style={{ position: "absolute", left: x0 + w * (fx as number), top: y0 + h * (fy as number), transform: "translate(-50%,-50%)", fontFamily: FONT, fontSize: 40, fontWeight: 700, color: i === 4 ? `rgba(243,238,228,${1 - 0.7 * cut})` : K.sub, textShadow: SHADOW, textDecoration: i === 4 && cut > 0.5 ? "line-through" : undefined }}>
          {s}
        </div>
      ))}
      <div style={{ position: "absolute", left: x0 + w / 2, top: y0 + h + 40, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 48, color: K.fg, textShadow: SHADOW }}>
        <span style={{ fontFamily: NUM, color: K.gold, fontSize: 70 }}>{Math.round(74 - 14 * cut)}</span> ㎡
      </div>
    </div>
  );
};

// chapter 10: real hourly wages by percentile, Jan 2020 → mid 2023 (Autor, Dube & McGrew 2023)
const Wages: React.FC<{ t: number }> = ({ t }) => {
  const at = T.c10 + 5.4;
  const o = win(t, at, T.c10 + 12.4, 0.5, 0.5);
  if (o <= 0) return null;
  const rows = [
    { l: "工资最低的一成", v: 0, c: "#9ccfff" },
    { l: "中间的人", v: -6, c: K.gold },
    { l: "工资最高的一成", v: -8, c: K.gold },
  ];
  const x0 = 1100;
  return (
    <div style={{ position: "absolute", left: 0, top: 560, width: 1920, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      {rows.map((r, i) => {
        const k = ramp(t, at + 0.4 + i * 0.5, at + 1.6 + i * 0.5);
        return (
          <div key={i} style={{ position: "absolute", top: i * 74, left: 0, width: 1920, height: 60, display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", right: 1920 - x0 + 360, fontSize: 40, fontWeight: 800 }}>{r.l}</span>
            <div style={{ position: "absolute", left: x0 + r.v * 40 * k, width: Math.max(4, -r.v * 40 * k), height: 34, background: r.c, borderRadius: 4, boxShadow: `0 0 16px ${r.c}88` }} />
            <span style={{ position: "absolute", left: x0 + 30, fontFamily: NUM, fontSize: 46, fontWeight: 900, color: r.c }}>{r.v === 0 ? "没缩水" : `${Math.round(r.v * k)}%`}</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: x0, top: -20, width: 2, height: 230, background: "rgba(243,238,228,0.5)" }} />
    </div>
  );
};

// dark gradient behind left / right captions so type stays readable over the bright town
const Shade: React.FC<{ t: number }> = ({ t }) => {
  const plan = win(t, T.c8 + 0.5, T.c9 - 0.2, 0.8, 0.8);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(3,4,9,0.55) 0%, rgba(3,4,9,0) 38%, rgba(3,4,9,0) 80%, rgba(3,4,9,0.55) 100%)" }} />
      {plan > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(3,4,9,${0.45 * plan})` }} /> : null}
    </>
  );
};


// a few sounds on the moments that matter (own library, CC0)
const HITS: { at: number; id: string; v: number; len?: number }[] = [
  { at: T.hook + 0.1, id: "sfx-magic-20", v: 0.4, len: 2.4 },
  { at: T.hook + 1.6, id: "sfx-water-10", v: 0.55 },
  { at: T.hook + 6.6, id: "sfx-impact-16", v: 0.45 },
  ...Array.from({ length: 12 }, (_, i) => ({ at: MONTHS.start + ((MONTHS.end - MONTHS.start) / 12) * i, id: "sfx-water-01", v: 0.18 })),
  { at: HIT, id: "sfx-impact-16", v: 0.85, len: 1.5 },
  { at: HIT + 0.05, id: "sfx-impact-08", v: 0.5 },
  { at: T.c4 + 19.0, id: "sfx-impact-14", v: 0.5 },
  { at: T.c6 + 16.2, id: "sfx-magic-14", v: 0.25, len: 2.6 },
  { at: T.c8 + 9.6, id: "sfx-transition-15", v: 0.5 },
  { at: T.c9 + 29.5, id: "sfx-foley-02", v: 0.6 },
  { at: T.c9 + 35.6, id: "sfx-impact-20", v: 0.5 },
  { at: T.c9 + 42, id: "sfx-impact-16", v: 0.6, len: 1.5 },
];

export const Film: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      {t < T.card ? <TownView t={t} /> : null}
      <Shade t={t} />
      <Labels t={t} />
      <Split t={t} />
      <Bands t={t} />
      <Months t={t} />
      <Numbers t={t} />
      <Plan t={t} />
      <Wages t={t} />
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

export { HUB };
